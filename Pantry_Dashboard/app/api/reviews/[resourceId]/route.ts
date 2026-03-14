import { NextResponse } from 'next/server';

import mockReviews from '@/data/mock-reviews.json';
import { aggregateReviews, createGeneratedReviews } from '@/lib/mock-review-generator';
import type { ReviewRecord } from '@/types/resources';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  const { resourceId } = await params;
  const matchingReviews = (mockReviews as ReviewRecord[]).filter(
    (review) => review.resourceId === resourceId,
  );

  if (!matchingReviews.length) {
    return NextResponse.json(createGeneratedReviews(resourceId));
  }

  return NextResponse.json({
    reviews: matchingReviews.sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1)),
    summary: aggregateReviews(matchingReviews),
  });
}
