import { NextResponse } from 'next/server';

import { createGeneratedReviews } from '@/lib/mock-review-generator';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  const { resourceId } = await params;

  // Generate realistic mock reviews for demo purposes
  return NextResponse.json(createGeneratedReviews(resourceId));
}
