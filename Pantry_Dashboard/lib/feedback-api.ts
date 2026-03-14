/**
 * Feedback API client for resource reviews (Lemontree ResourceReview).
 * Talks to the backend FastAPI resource-reviews endpoints.
 * Next.js: uses process.env.NEXT_PUBLIC_API_URL
 */

const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8000';

async function fetchFeedback(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail ?? text;
    } catch {
      /* use raw text */
    }
    throw new Error(detail);
  }
  return text ? (JSON.parse(text) as unknown) : null;
}

export type CreateFeedbackPayload = {
  resourceId: string;
  rating: number;
  attended?: boolean;
  authorId?: string;
  didNotAttendReason?: string;
  text?: string;
  waitTimeMinutes?: number;
  informationAccurate?: boolean;
  photoUrl?: string;
  photoPublic?: boolean;
  shareTextWithResource?: boolean;
};

export async function submitReview(payload: CreateFeedbackPayload) {
  return fetchFeedback('/resource-reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  }) as Promise<{ id: string; issueLabels: string[]; [key: string]: unknown }>;
}

export async function getSummary(params: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  return fetchFeedback(`/resource-reviews/summary${qs ? `?${qs}` : ''}`) as Promise<{
    total_reviews: number;
    average_rating: number | null;
    average_wait_time: number | null;
    attended_rate: number | null;
    inaccurate_information_rate: number | null;
    issue_counts: Record<string, number>;
  }>;
}
