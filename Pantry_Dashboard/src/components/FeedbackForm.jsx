import { useState } from 'react';
import { submitReview } from '../lib/feedbackApi';

/**
 * Feedback form for resource reviews (Lemontree ResourceReview schema).
 * Submits to POST /resource-reviews.
 */
export default function FeedbackForm({ resources = [], onSuccess, onError }) {
  const [resourceId, setResourceId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [attended, setAttended] = useState(true);
  const [didNotAttendReason, setDidNotAttendReason] = useState('');
  const [rating, setRating] = useState(null);
  const [text, setText] = useState('');
  const [waitTimeMinutes, setWaitTimeMinutes] = useState('');
  const [informationAccurate, setInformationAccurate] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPublic, setPhotoPublic] = useState(false);
  const [shareTextWithResource, setShareTextWithResource] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [createdReview, setCreatedReview] = useState(null);

  const handleSubmit = async (e) => {
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
      const payload = {
        resourceId: resourceId.trim(),
        rating: Number(rating),
        attended: attended ? true : false,
        shareTextWithResource: !!shareTextWithResource,
      };
      if (authorId.trim()) payload.authorId = authorId.trim();
      if (!attended && didNotAttendReason.trim()) payload.didNotAttendReason = didNotAttendReason.trim();
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

      const review = await submitReview(payload);
      setSuccess('Thank you! Your feedback was submitted.');
      setCreatedReview(review);
      onSuccess?.(review);

      // Reset form
      setRating(null);
      setText('');
      setWaitTimeMinutes('');
      setInformationAccurate(null);
      setDidNotAttendReason('');
    } catch (err) {
      const msg = err?.message || 'Failed to submit feedback.';
      setError(msg);
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  };

  const showDidNotAttendReason = !attended;
  const showPhotoPublic = !!photoUrl.trim();

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <h3>Submit Resource Feedback</h3>

      {error && (
        <div className="feedback-form-error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="feedback-form-success" role="status">
          {success}
          {createdReview?.issueLabels?.length > 0 && (
            <div className="feedback-form-issue-labels">
              <strong>Detected issues:</strong>{' '}
              {createdReview.issueLabels.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="feedback-form-row">
        <label htmlFor="feedback-resource">Resource *</label>
        {resources.length > 0 ? (
          <select
            id="feedback-resource"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            required
          >
            <option value="">Select a resource…</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.title || r.id}
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
          />
        )}
      </div>

      <div className="feedback-form-row">
        <label htmlFor="feedback-author">Author ID (optional)</label>
        <input
          id="feedback-author"
          type="text"
          placeholder="e.g. client_123"
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
        />
      </div>

      <div className="feedback-form-row">
        <label>Attended?</label>
        <div className="feedback-form-toggle">
          <button
            type="button"
            className={attended ? 'active' : ''}
            onClick={() => setAttended(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={!attended ? 'active' : ''}
            onClick={() => setAttended(false)}
          >
            No
          </button>
        </div>
      </div>

      {showDidNotAttendReason && (
        <div className="feedback-form-row">
          <label htmlFor="feedback-did-not-attend">Reason for not attending</label>
          <textarea
            id="feedback-did-not-attend"
            rows={2}
            placeholder="e.g. Location was closed when I arrived"
            value={didNotAttendReason}
            onChange={(e) => setDidNotAttendReason(e.target.value)}
          />
        </div>
      )}

      <div className="feedback-form-row">
        <label>Rating (1–5) *</label>
        <div className="feedback-form-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`star ${rating === n ? 'selected' : ''}`}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="feedback-form-row">
        <label htmlFor="feedback-text">Comments (optional)</label>
        <textarea
          id="feedback-text"
          rows={3}
          placeholder="Share your experience…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="feedback-form-row">
        <label htmlFor="feedback-wait">Wait time (minutes, optional)</label>
        <input
          id="feedback-wait"
          type="number"
          min={0}
          placeholder="0"
          value={waitTimeMinutes}
          onChange={(e) => setWaitTimeMinutes(e.target.value)}
        />
      </div>

      <div className="feedback-form-row">
        <label>Was information accurate?</label>
        <div className="feedback-form-toggle">
          <button
            type="button"
            className={informationAccurate === true ? 'active' : ''}
            onClick={() => setInformationAccurate(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={informationAccurate === false ? 'active' : ''}
            onClick={() => setInformationAccurate(false)}
          >
            No
          </button>
          <button
            type="button"
            className={informationAccurate === null ? 'active' : ''}
            onClick={() => setInformationAccurate(null)}
          >
            —
          </button>
        </div>
      </div>

      <div className="feedback-form-row">
        <label htmlFor="feedback-photo">Photo URL (optional)</label>
        <input
          id="feedback-photo"
          type="url"
          placeholder="https://..."
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
        />
      </div>

      {showPhotoPublic && (
        <div className="feedback-form-row">
          <label>
            <input
              type="checkbox"
              checked={photoPublic}
              onChange={(e) => setPhotoPublic(e.target.checked)}
            />
            {' '}
            Make photo public
          </label>
        </div>
      )}

      <div className="feedback-form-row">
        <label>
          <input
            type="checkbox"
            checked={shareTextWithResource}
            onChange={(e) => setShareTextWithResource(e.target.checked)}
          />
          {' '}
          Share comments with resource
        </label>
      </div>

      <div className="feedback-form-row">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </form>
  );
}
