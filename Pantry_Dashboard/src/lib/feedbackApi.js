/**
 * Feedback API client for resource reviews (Lemontree ResourceReview).
 * Talks to the backend FastAPI resource-reviews endpoints.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchFeedback(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {
      // use raw text
    }
    throw new Error(detail);
  }
  return text ? JSON.parse(text) : null;
}

/**
 * Submit a feedback review
 * @param {Object} payload - CreateFeedbackReviewRequest fields
 * @returns {Promise<Object>} Created FeedbackReview with issueLabels
 */
export async function submitReview(payload) {
  return fetchFeedback('/resource-reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * List reviews with optional filters
 * @param {Object} params - resourceId, startDate, endDate, issueCategory, attended, informationAccurate, minRating, maxRating, limit, offset
 * @returns {Promise<Array>} List of FeedbackReview
 */
export async function listReviews(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  return fetchFeedback(`/resource-reviews${qs ? `?${qs}` : ''}`);
}

/**
 * Get a single review by ID
 * @param {string} reviewId
 * @returns {Promise<Object>} FeedbackReview
 */
export async function getReview(reviewId) {
  return fetchFeedback(`/resource-reviews/${reviewId}`);
}

/**
 * Get aggregated summary
 * @param {Object} params - resourceId, startDate, endDate, issueCategory, attended, informationAccurate, minRating, maxRating
 * @returns {Promise<Object>} FeedbackSummary
 */
export async function getSummary(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  return fetchFeedback(`/resource-reviews/summary${qs ? `?${qs}` : ''}`);
}

/**
 * Soft delete a review
 * @param {string} reviewId
 * @returns {Promise<{deleted: boolean, id: string}>}
 */
export async function deleteReview(reviewId) {
  return fetchFeedback(`/resource-reviews/${reviewId}`, { method: 'DELETE' });
}

/**
 * Health check
 * @returns {Promise<{status: string, service: string}>}
 */
export async function healthCheck() {
  return fetchFeedback('/resource-reviews/health');
}
