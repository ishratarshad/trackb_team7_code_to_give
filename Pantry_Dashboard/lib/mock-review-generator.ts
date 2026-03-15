import type { ReviewPayload, ReviewRecord, ReviewSummary } from '@/types/resources';
import { roundToOneDecimal } from '@/lib/formatters';

const STRUCTURED_REASONS = [
  'Pantry closed',
  'Long wait',
  'Not eligible',
  'No food left',
  'Capacity reached',
  'Hours changed',
];

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundNullable(value: number | null) {
  return typeof value === 'number' ? roundToOneDecimal(value) : null;
}

function toPercentage(numerator: number, denominator: number) {
  return denominator ? roundToOneDecimal((numerator / denominator) * 100) : null;
}

function seedFromString(value: string) {
  return value.split('').reduce((seed, char) => seed + char.charCodeAt(0), 0);
}

export function aggregateReviews(reviews: ReviewRecord[]): ReviewSummary {
  const sortedReviews = [...reviews].sort((left, right) =>
    left.createdAt < right.createdAt ? 1 : -1,
  );
  const ratings = sortedReviews.flatMap((review) =>
    typeof review.rating === 'number' ? [review.rating] : [],
  );
  const waitTimes = sortedReviews.flatMap((review) =>
    typeof review.waitTimeMinutes === 'number' ? [review.waitTimeMinutes] : [],
  );
  const attendedCount = sortedReviews.filter((review) => review.attended === true).length;
  const notAttendedCount = sortedReviews.filter((review) => review.attended === false).length;
  const answeredAccuracy = sortedReviews.filter(
    (review) =>
      review.informationAccurate === true || review.informationAccurate === false,
  );
  const inaccurateCount = sortedReviews.filter(
    (review) => review.informationAccurate === false,
  ).length;
  const reasonMap = new Map<string, number>();

  sortedReviews.forEach((review) => {
    if (review.didNotAttendReason) {
      reasonMap.set(
        review.didNotAttendReason,
        (reasonMap.get(review.didNotAttendReason) ?? 0) + 1,
      );
    }
  });

  const newestAverage = average(waitTimes.slice(0, 3));
  const olderAverage = average(waitTimes.slice(3, 6));
  let waitTimeTrend: ReviewSummary['waitTimeTrend'] = 'unknown';

  if (typeof newestAverage === 'number' && typeof olderAverage === 'number') {
    if (newestAverage - olderAverage >= 10) {
      waitTimeTrend = 'rising';
    } else if (olderAverage - newestAverage >= 10) {
      waitTimeTrend = 'falling';
    } else {
      waitTimeTrend = 'steady';
    }
  }

  return {
    totalReviews: sortedReviews.length,
    averageRating: roundNullable(average(ratings)),
    averageWaitMinutes: roundNullable(average(waitTimes)),
    waitTimeTrend,
    waitBuckets: [
      { label: '0-15 min', count: waitTimes.filter((time) => time <= 15).length },
      { label: '15-30 min', count: waitTimes.filter((time) => time > 15 && time <= 30).length },
      { label: '30-60 min', count: waitTimes.filter((time) => time > 30 && time <= 60).length },
      { label: '60+ min', count: waitTimes.filter((time) => time > 60).length },
    ],
    attendedPercentage: toPercentage(attendedCount, sortedReviews.length),
    didNotReceiveHelpPercentage: toPercentage(notAttendedCount, sortedReviews.length),
    didNotAttendReasons: Array.from(reasonMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count),
    inaccuratePercentage: toPercentage(inaccurateCount, answeredAccuracy.length),
  };
}

export function createGeneratedReviews(resourceId: string): ReviewPayload {
  const seed = seedFromString(resourceId);
  const reviews: ReviewRecord[] = Array.from({ length: 6 }, (_, index) => {
    const daysAgo = (seed + index * 5) % 90;
    const attended = ((seed + index * 7) % 10) > 2;
    const waitTimeMinutes = attended ? 10 + ((seed + index * 13) % 70) : 0;
    const informationAccurate = ((seed + index * 11) % 10) > 2;
    const rating = attended ? 2.5 + ((seed + index * 3) % 25) / 10 : 2 + ((seed + index) % 15) / 10;
    const didNotAttendReason = attended
      ? null
      : STRUCTURED_REASONS[(seed + index) % STRUCTURED_REASONS.length];

    return {
      id: `${resourceId}-${index}`,
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      attended,
      didNotAttendReason,
      informationAccurate,
      photoPublic: false,
      photoUrl: null,
      rating,
      waitTimeMinutes,
      resourceId,
    };
  });

  return {
    isMockData: true,
    reviews,
    summary: aggregateReviews(reviews),
  };
}
