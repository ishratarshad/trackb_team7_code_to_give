import { aggregateReviews } from '@/lib/mock-review-generator';
import type { ReviewRecord } from '@/types/resources';

const STORAGE_KEY = 'lemontree-feedback-reviews-v1';

type StoredFeedbackReview = {
  id: string;
  createdAt: string;
  resourceId: string;
  rating: number;
  attended: boolean;
  authorId: string | null;
  didNotAttendReason: string | null;
  text: string | null;
  waitTimeMinutes: number | null;
  informationAccurate: boolean | null;
  photoUrl: string | null;
  photoPublic: boolean;
  shareTextWithResource: boolean;
  issueLabels: string[];
};

type FeedbackSummaryResponse = {
  total_reviews: number;
  average_rating: number | null;
  average_wait_time: number | null;
  attended_rate: number | null;
  inaccurate_information_rate: number | null;
  issue_counts: Record<string, number>;
};

let reviewCache: StoredFeedbackReview[] = [];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readReviews() {
  if (!canUseStorage()) {
    return reviewCache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredFeedbackReview[]) : [];
  } catch {
    return [];
  }
}

function writeReviews(reviews: StoredFeedbackReview[]) {
  reviewCache = reviews;

  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function createReviewId() {
  return `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildIssueLabels(review: {
  attended: boolean;
  rating: number;
  waitTimeMinutes: number | null;
  informationAccurate: boolean | null;
}) {
  const issueLabels: string[] = [];

  if (!review.attended) {
    issueLabels.push('service_access');
  }

  if (typeof review.waitTimeMinutes === 'number' && review.waitTimeMinutes >= 45) {
    issueLabels.push('long_wait');
  }

  if (review.informationAccurate === false) {
    issueLabels.push('inaccurate_information');
  }

  if (review.rating <= 2) {
    issueLabels.push('low_rating');
  }

  return issueLabels;
}

function toReviewRecord(review: StoredFeedbackReview): ReviewRecord {
  return {
    id: review.id,
    createdAt: review.createdAt,
    attended: review.attended,
    didNotAttendReason: review.didNotAttendReason,
    informationAccurate: review.informationAccurate,
    photoPublic: review.photoPublic,
    photoUrl: review.photoUrl,
    rating: review.rating,
    waitTimeMinutes: review.waitTimeMinutes,
    resourceId: review.resourceId,
  };
}

function buildSummaryResponse(reviews: StoredFeedbackReview[]) {
  const summary = aggregateReviews(reviews.map(toReviewRecord));
  const issueCounts: Record<string, number> = {};

  reviews.forEach((review) => {
    review.issueLabels.forEach((label) => {
      issueCounts[label] = (issueCounts[label] ?? 0) + 1;
    });
  });

  return {
    total_reviews: summary.totalReviews,
    average_rating: summary.averageRating,
    average_wait_time: summary.averageWaitMinutes,
    attended_rate:
      summary.attendedPercentage === null ? null : summary.attendedPercentage / 100,
    inaccurate_information_rate:
      summary.inaccuratePercentage === null ? null : summary.inaccuratePercentage / 100,
    issue_counts: issueCounts,
  };
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
  const review: StoredFeedbackReview = {
    id: createReviewId(),
    createdAt: new Date().toISOString(),
    resourceId: payload.resourceId,
    rating: payload.rating,
    attended: payload.attended ?? true,
    authorId: payload.authorId ?? null,
    didNotAttendReason: payload.didNotAttendReason ?? null,
    text: payload.text ?? null,
    waitTimeMinutes: payload.waitTimeMinutes ?? null,
    informationAccurate: payload.informationAccurate ?? null,
    photoUrl: payload.photoUrl ?? null,
    photoPublic: payload.photoPublic ?? false,
    shareTextWithResource: payload.shareTextWithResource ?? false,
    issueLabels: buildIssueLabels({
      attended: payload.attended ?? true,
      rating: payload.rating,
      waitTimeMinutes: payload.waitTimeMinutes ?? null,
      informationAccurate: payload.informationAccurate ?? null,
    }),
  };

  const reviews = [review, ...readReviews()];
  writeReviews(reviews);

  return {
    id: review.id,
    issueLabels: review.issueLabels,
  };
}

export async function getSummary(params: Record<string, string | undefined> = {}) {
  const resourceId = params.resourceId;
  const reviews = readReviews().filter((review) =>
    resourceId ? review.resourceId === resourceId : true,
  );

  return buildSummaryResponse(reviews) as FeedbackSummaryResponse;
}
