import { useState, useEffect } from 'react';
import { getSummary } from '../lib/feedbackApi';

/**
 * Displays aggregated feedback summary from GET /resource-reviews/summary.
 */
export default function FeedbackSummaryCard({ resourceId, onError }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSummary(resourceId ? { resourceId } : {})
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load summary');
          onError?.(err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [resourceId, onError]);

  if (loading) return <div className="feedback-summary-loading">Loading feedback summary…</div>;
  if (error) return <div className="feedback-summary-error" role="alert">{error}</div>;
  if (!summary) return null;

  const { total_reviews, average_rating, average_wait_time, attended_rate, inaccurate_information_rate, issue_counts } = summary;

  return (
    <div className="feedback-summary-card pantry-card">
      <h3>Resource Feedback Summary</h3>
      <div className="feedback-summary-grid">
        <div className="feedback-summary-item">
          <span className="label">Total reviews</span>
          <span className="value">{total_reviews}</span>
        </div>
        <div className="feedback-summary-item">
          <span className="label">Avg rating</span>
          <span className="value">{average_rating != null ? average_rating.toFixed(1) : '—'}</span>
        </div>
        <div className="feedback-summary-item">
          <span className="label">Avg wait (min)</span>
          <span className="value">{average_wait_time != null ? average_wait_time.toFixed(0) : '—'}</span>
        </div>
        <div className="feedback-summary-item">
          <span className="label">Attended rate</span>
          <span className="value">{attended_rate != null ? `${(attended_rate * 100).toFixed(0)}%` : '—'}</span>
        </div>
        <div className="feedback-summary-item">
          <span className="label">Inaccurate info rate</span>
          <span className="value">{inaccurate_information_rate != null ? `${(inaccurate_information_rate * 100).toFixed(0)}%` : '—'}</span>
        </div>
      </div>
      {issue_counts && Object.keys(issue_counts).length > 0 && (
        <div className="feedback-summary-issues">
          <strong>Issue labels</strong>
          <ul>
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
