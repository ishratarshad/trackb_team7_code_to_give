import type { ReviewPayload } from '@/types/resources';

export const reviewService = {
  async getReviews(resourceId: string, signal?: AbortSignal) {
    const response = await fetch(`/api/reviews/${resourceId}`, {
      cache: 'no-store',
      signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return (await response.json()) as ReviewPayload;
  },
};
