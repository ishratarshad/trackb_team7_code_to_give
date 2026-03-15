'use client';

import { useState, useEffect } from 'react';
import { submitReview, getSummary } from '@/lib/feedback-api';
import { formatOneDecimal } from '@/lib/formatters';
import type { Resource } from '@/types/resources';

type FeedbackResource = { id: string; name: string };

const STRUCTURED_REASONS = [
  'Pantry closed',
  'Long wait',
  'Not eligible',
  'No food left',
  'Capacity reached',
  'Hours changed',
  'Other',
] as const;

export function FeedbackView({ resources = [] }: { resources: Resource[] }) {
  const feedbackResources: FeedbackResource[] = resources.map((r) => ({
    id: r.id,
    name: r.name,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(320px,400px)]">
      <section className="panel-surface overflow-hidden rounded-[22px] border border-line/70 p-6">
        <FeedbackForm resources={feedbackResources} />
      </section>
      <section className="panel-surface overflow-hidden rounded-[22px] border border-line/70 p-6">
        <FeedbackSummaryCard />
      </section>
    </div>
  );
}

function FeedbackForm({
  resources,
}: {
  resources: FeedbackResource[];
}) {
  const [resourceId, setResourceId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [attended, setAttended] = useState(true);
  const [selectedStructuredReason, setSelectedStructuredReason] = useState('');
  const [otherReasonText, setOtherReasonText] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [waitTimeMinutes, setWaitTimeMinutes] = useState('');
  const [informationAccurate, setInformationAccurate] = useState<boolean | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPublic, setPhotoPublic] = useState(false);
  const [shareTextWithResource, setShareTextWithResource] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdReview, setCreatedReview] = useState<{ issueLabels?: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreatedReview(null);
    if (!resourceId.trim()) {
      setError('Please select or enter a resource.');
      return;
    }
    if (rating == null || rating < 1 || rating > 5) {
      setError('Please select a rating (1–5 stars).');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        resourceId: resourceId.trim(),
        rating: Number(rating),
        attended: attended,
        shareTextWithResource: !!shareTextWithResource,
      };
      if (authorId.trim()) payload.authorId = authorId.trim();
      if (!attended) {
        if (selectedStructuredReason && selectedStructuredReason !== 'Other') {
          payload.didNotAttendReason = selectedStructuredReason;
        } else if (selectedStructuredReason === 'Other' && otherReasonText.trim()) {
          payload.didNotAttendReason = otherReasonText.trim();
        }
      }
      if (text.trim()) payload.text = text.trim();
      if (waitTimeMinutes !== '' && waitTimeMinutes != null) {
        const w = parseInt(waitTimeMinutes, 10);
        if (!isNaN(w) && w >= 0) payload.waitTimeMinutes = w;
      }
      if (informationAccurate !== null) payload.informationAccurate = informationAccurate;
      if (photoUrl.trim()) {
        payload.photoUrl = photoUrl.trim();
        payload.photoPublic = !!photoPublic;
      }

      const review = await submitReview(payload as Parameters<typeof submitReview>[0]);
      setSuccess('Thank you! Your feedback was submitted.');
      setCreatedReview(review);
      setRating(null);
      setText('');
      setWaitTimeMinutes('');
      setInformationAccurate(null);
      setSelectedStructuredReason('');
      setOtherReasonText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const showDidNotAttendReason = !attended;
  const showPhotoPublic = !!photoUrl.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-bold text-ink">Submit Resource Feedback</h3>

      {error && (
        <div
          className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-xl border border-pine/30 bg-pine/10 px-4 py-3 text-sm text-moss"
          role="status"
        >
          {success}
          {createdReview?.issueLabels?.length ? (
            <div className="mt-2 text-xs">
              <strong>Detected issues:</strong> {createdReview.issueLabels.join(', ')}
            </div>
          ) : null}
        </div>
      )}

      <div>
        <label htmlFor="feedback-resource" className="mb-1 block text-sm font-semibold text-slate">
          Resource *
        </label>
        {resources.length > 0 ? (
          <select
            id="feedback-resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            required
            className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
          >
            <option value="">Select a resource…</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.id}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="feedback-resource"
            type="text"
            placeholder="Resource ID"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            required
            className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
          />
        )}
      </div>

      <div>
        <label htmlFor="feedback-author" className="mb-1 block text-sm font-semibold text-slate">
          Author ID (optional)
        </label>
        <input
          id="feedback-author"
          type="text"
          placeholder="e.g. client_123"
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-semibold text-slate">Attended?</span>
        <div className="flex gap-2">
          {[
            [true, 'Yes'],
            [false, 'No'],
          ].map(([val, label]) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => {
                setAttended(val as boolean);
                if (val) {
                  setSelectedStructuredReason('');
                  setOtherReasonText('');
                }
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                attended === val ? 'bg-pine text-white' : 'border border-line/80 bg-white/80 text-slate'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showDidNotAttendReason && (
        <div>
          <label
            htmlFor="feedback-reason"
            className="mb-1 block text-sm font-semibold text-slate"
          >
            Why didn&apos;t you receive help?
          </label>
          <select
            id="feedback-reason"
            value={selectedStructuredReason}
            onChange={(e) => setSelectedStructuredReason(e.target.value)}
            className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
          >
            <option value="">Select a reason…</option>
            {STRUCTURED_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {selectedStructuredReason === 'Other' && (
            <input
              type="text"
              placeholder="Please describe…"
              value={otherReasonText}
              onChange={(e) => setOtherReasonText(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
              aria-label="Other reason (optional)"
            />
          )}
        </div>
      )}

      <div>
        <span className="mb-1 block text-sm font-semibold text-slate">Rating (1–5) *</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`rounded-full px-3 py-1.5 text-lg transition ${
                rating === n ? 'bg-amber text-ink' : 'border border-line/80 bg-white/80 text-slate/60'
              }`}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="feedback-text" className="mb-1 block text-sm font-semibold text-slate">
          Comments (optional)
        </label>
        <textarea
          id="feedback-text"
          rows={3}
          placeholder="Share your experience…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
        />
      </div>

      <div>
        <label htmlFor="feedback-wait" className="mb-1 block text-sm font-semibold text-slate">
          Wait time (minutes, optional)
        </label>
        <input
          id="feedback-wait"
          type="number"
          min={0}
          placeholder="0"
          value={waitTimeMinutes}
          onChange={(e) => setWaitTimeMinutes(e.target.value)}
          className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-semibold text-slate">
          Was information accurate?
        </span>
        <div className="flex gap-2">
          {([
            [true, 'Yes'],
            [false, 'No'],
            [null, '—'],
          ] as const).map(([val, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setInformationAccurate(val)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                informationAccurate === val ? 'bg-pine text-white' : 'border border-line/80 bg-white/80 text-slate'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="feedback-photo" className="mb-1 block text-sm font-semibold text-slate">
          Photo URL (optional)
        </label>
        <input
          id="feedback-photo"
          type="url"
          placeholder="https://..."
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-2.5 text-sm text-ink"
        />
      </div>

      {showPhotoPublic && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="feedback-photo-public"
            checked={photoPublic}
            onChange={(e) => setPhotoPublic(e.target.checked)}
          />
          <label htmlFor="feedback-photo-public" className="text-sm font-semibold text-slate">
            Make photo public
          </label>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="feedback-share"
          checked={shareTextWithResource}
          onChange={(e) => setShareTextWithResource(e.target.checked)}
        />
        <label htmlFor="feedback-share" className="text-sm font-semibold text-slate">
          Share comments with resource
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-moss disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </form>
  );
}

function FeedbackSummaryCard() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load summary');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading)
    return (
      <div className="py-8 text-center text-sm text-slate">Loading feedback summary…</div>
    );
  if (error)
    return (
      <div className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral" role="alert">
        {error}
      </div>
    );
  if (!summary) return null;

  const {
    total_reviews,
    average_rating,
    average_wait_time,
    attended_rate,
    inaccurate_information_rate,
    issue_counts,
  } = summary;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-ink">Resource Feedback Summary</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-mist/50 p-3 text-center">
          <p className="text-2xl font-bold text-pine">{total_reviews}</p>
          <p className="text-xs font-semibold text-slate/70">Total reviews</p>
        </div>
        <div className="rounded-xl bg-mist/50 p-3 text-center">
          <p className="text-2xl font-bold text-pine">
            {average_rating != null ? average_rating.toFixed(1) : '—'}
          </p>
          <p className="text-xs font-semibold text-slate/70">Avg rating</p>
        </div>
        <div className="rounded-xl bg-mist/50 p-3 text-center">
          <p className="text-2xl font-bold text-pine">
            {average_wait_time != null ? formatOneDecimal(average_wait_time) : '—'}
          </p>
          <p className="text-xs font-semibold text-slate/70">Avg wait (min)</p>
        </div>
        <div className="rounded-xl bg-mist/50 p-3 text-center">
          <p className="text-2xl font-bold text-pine">
            {attended_rate != null ? `${formatOneDecimal(attended_rate * 100)}%` : '—'}
          </p>
          <p className="text-xs font-semibold text-slate/70">Attended rate</p>
        </div>
        <div className="col-span-2 rounded-xl bg-mist/50 p-3 text-center">
          <p className="text-2xl font-bold text-pine">
            {inaccurate_information_rate != null
              ? `${formatOneDecimal(inaccurate_information_rate * 100)}%`
              : '—'}
          </p>
          <p className="text-xs font-semibold text-slate/70">Inaccurate info rate</p>
        </div>
      </div>
      {issue_counts && Object.keys(issue_counts).length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold text-slate">Issue labels</p>
          <ul className="space-y-1 text-sm text-slate">
            {Object.entries(issue_counts).map(([label, count]) => (
              <li key={label}>
                {label.replace(/_/g, ' ')}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
