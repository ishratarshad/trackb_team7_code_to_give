import { format, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';

import { aggregateReviews } from '@/lib/mock-review-generator';
import { titleCase } from '@/lib/formatters';
import type {
  DashboardInsights,
  Resource,
  ResourceAlert,
  ReviewPayload,
  ReviewRecord,
  ReviewSummary,
  StructuredSignal,
  TimeframeOption,
  TrendPoint,
} from '@/types/resources';

const EMPTY_SUMMARY: ReviewSummary = {
  totalReviews: 0,
  averageRating: null,
  averageWaitMinutes: null,
  waitTimeTrend: 'unknown',
  waitBuckets: [
    { label: '0-15 min', count: 0 },
    { label: '15-30 min', count: 0 },
    { label: '30-60 min', count: 0 },
    { label: '60+ min', count: 0 },
  ],
  attendedPercentage: null,
  didNotReceiveHelpPercentage: null,
  didNotAttendReasons: [],
  inaccuratePercentage: null,
};

function getTimeframeStart(timeframe: TimeframeOption) {
  const now = new Date();

  if (timeframe === '7d') {
    return subDays(now, 7);
  }

  if (timeframe === '30d') {
    return subDays(now, 30);
  }

  if (timeframe === '90d') {
    return subDays(now, 90);
  }

  if (timeframe === '12m') {
    return subMonths(now, 12);
  }

  return null;
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toSafeDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeSignalLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return titleCase(value.replace(/[_-]+/g, ' '));
}

export function getTimeframeLabel(timeframe: TimeframeOption) {
  if (timeframe === '7d') {
    return 'Last 7 days';
  }

  if (timeframe === '30d') {
    return 'Last 30 days';
  }

  if (timeframe === '90d') {
    return 'Last 90 days';
  }

  if (timeframe === '12m') {
    return 'Last 12 months';
  }

  return 'All time';
}

export function filterReviewsByTimeframe(reviews: ReviewRecord[], timeframe: TimeframeOption) {
  const start = getTimeframeStart(timeframe);

  if (!start) {
    return [...reviews].sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1));
  }

  return reviews
    .filter((review) => {
      const createdAt = toSafeDate(review.createdAt);
      return createdAt ? createdAt >= start : false;
    })
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1));
}

export function applyTimeframeToPayload(
  payload: ReviewPayload | undefined,
  timeframe: TimeframeOption,
): ReviewPayload | null {
  if (!payload) {
    return null;
  }

  const reviews = filterReviewsByTimeframe(payload.reviews, timeframe);

  return {
    reviews,
    summary: reviews.length ? aggregateReviews(reviews) : EMPTY_SUMMARY,
  };
}

export function createTimeframedSummaryMap(
  payloadById: Map<string, ReviewPayload>,
  timeframe: TimeframeOption,
) {
  const next = new Map<string, ReviewPayload>();

  payloadById.forEach((payload, resourceId) => {
    const filtered = applyTimeframeToPayload(payload, timeframe);

    if (filtered) {
      next.set(resourceId, filtered);
    }
  });

  return next;
}

function buildTimelineBucketKey(date: Date, timeframe: TimeframeOption) {
  if (timeframe === '7d') {
    return {
      key: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE'),
    };
  }

  if (timeframe === '30d' || timeframe === '90d') {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return {
      key: format(weekStart, 'yyyy-MM-dd'),
      label: format(weekStart, 'MMM d'),
    };
  }

  const monthStart = startOfMonth(date);

  return {
    key: format(monthStart, 'yyyy-MM-dd'),
    label: format(monthStart, 'MMM'),
  };
}

export function buildTimeline(
  resources: Resource[],
  payloadById: Map<string, ReviewPayload>,
  timeframe: TimeframeOption,
) {
  const reviews = resources.flatMap((resource) => {
    const payload = payloadById.get(resource.id);
    return payload?.reviews ?? [];
  });
  const buckets = new Map<string, ReviewRecord[]>();
  const labels = new Map<string, string>();

  reviews.forEach((review) => {
    const createdAt = toSafeDate(review.createdAt);

    if (!createdAt) {
      return;
    }

    const bucket = buildTimelineBucketKey(createdAt, timeframe);
    labels.set(bucket.key, bucket.label);
    buckets.set(bucket.key, [...(buckets.get(bucket.key) ?? []), review]);
  });

  return Array.from(buckets.entries())
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([key, bucketReviews]) => {
      const waitValues = bucketReviews.flatMap((review) =>
        typeof review.waitTimeMinutes === 'number' && review.waitTimeMinutes > 0
          ? [review.waitTimeMinutes]
          : [],
      );
      const ratingValues = bucketReviews.flatMap((review) =>
        typeof review.rating === 'number' ? [review.rating] : [],
      );
      const answeredHelp = bucketReviews.filter(
        (review) => review.attended === true || review.attended === false,
      );
      const helpSuccessCount = answeredHelp.filter((review) => review.attended === true).length;

      return {
        key,
        label: labels.get(key) ?? key,
        reviewCount: bucketReviews.length,
        averageWaitMinutes: average(waitValues),
        averageRating: average(ratingValues),
        helpSuccessRate: answeredHelp.length
          ? (helpSuccessCount / answeredHelp.length) * 100
          : null,
      } satisfies TrendPoint;
    });
}

export function buildStructuredSignals(payloadById: Map<string, ReviewPayload>) {
  const counts = new Map<string, number>();

  payloadById.forEach((payload) => {
    payload.reviews.forEach((review) => {
      const normalizedReason = normalizeSignalLabel(review.didNotAttendReason);

      if (normalizedReason) {
        counts.set(normalizedReason, (counts.get(normalizedReason) ?? 0) + 1);
      }

      if (review.informationAccurate === false) {
        counts.set(
          'Inaccurate listing reports',
          (counts.get('Inaccurate listing reports') ?? 0) + 1,
        );
      }
    });
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count } satisfies StructuredSignal))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
}

function computeDisruptionScore(
  summary: ReviewSummary,
  averageRating: number | null,
  reasonCount: number,
) {
  const unmetDemandScore = (summary.didNotReceiveHelpPercentage ?? 0) * 0.42;
  const inaccurateScore = (summary.inaccuratePercentage ?? 0) * 0.28;
  const waitScore = Math.min(summary.averageWaitMinutes ?? 0, 90) * 0.32;
  const ratingPenalty =
    typeof averageRating === 'number' ? Math.max(0, 5 - averageRating) * 10 : 0;
  const trendPenalty =
    summary.waitTimeTrend === 'rising' ? 8 : summary.waitTimeTrend === 'steady' ? 3 : 0;

  return Number(
    (unmetDemandScore + inaccurateScore + waitScore + ratingPenalty + trendPenalty + reasonCount)
      .toFixed(1),
  );
}

export function buildResourceAlerts(
  resources: Resource[],
  payloadById: Map<string, ReviewPayload>,
) {
  const alerts = resources.flatMap((resource) => {
    const payload = payloadById.get(resource.id);

    if (!payload || payload.summary.totalReviews === 0) {
      return [];
    }

    const topSignals = [
      ...payload.summary.didNotAttendReasons.slice(0, 2).map((reason) => reason.label),
      payload.summary.inaccuratePercentage && payload.summary.inaccuratePercentage >= 10
        ? 'Listing accuracy'
        : null,
      payload.summary.waitTimeTrend === 'rising' ? 'Wait times rising' : null,
    ].filter((signal): signal is string => Boolean(signal));

    return [
      {
        resourceId: resource.id,
        resourceName: resource.name,
        zipCode: resource.zipCode,
        unmetDemand: payload.summary.didNotReceiveHelpPercentage,
        inaccuratePercentage: payload.summary.inaccuratePercentage,
        averageWaitMinutes: payload.summary.averageWaitMinutes,
        disruptionScore: computeDisruptionScore(
          payload.summary,
          payload.summary.averageRating ?? resource.ratingAverage,
          payload.summary.didNotAttendReasons.reduce((sum, reason) => sum + reason.count, 0),
        ),
        topSignals: topSignals.slice(0, 3),
      } satisfies ResourceAlert,
    ];
  });

  return alerts.sort((left, right) => right.disruptionScore - left.disruptionScore).slice(0, 8);
}

export function buildDashboardInsights(
  resources: Resource[],
  payloadById: Map<string, ReviewPayload>,
  timeframe: TimeframeOption,
): DashboardInsights {
  const filteredPayloadById = createTimeframedSummaryMap(payloadById, timeframe);
  const allReviews = resources.flatMap((resource) => filteredPayloadById.get(resource.id)?.reviews ?? []);
  const aggregate = allReviews.length
    ? aggregateReviews(allReviews)
    : EMPTY_SUMMARY;

  return {
    kpis: {
      averageWaitMinutes: aggregate.averageWaitMinutes,
      helpSuccessRate: aggregate.attendedPercentage,
      unmetDemand: aggregate.didNotReceiveHelpPercentage,
      inaccuratePercentage: aggregate.inaccuratePercentage,
    },
    timeline: buildTimeline(resources, filteredPayloadById, timeframe),
    structuredSignals: buildStructuredSignals(filteredPayloadById),
    serviceDisruptions: buildResourceAlerts(resources, filteredPayloadById),
  };
}
