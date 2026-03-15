import { Star } from 'lucide-react';

import { formatRating, formatWaitTime } from '@/lib/formatters';
import type { Resource, ReviewPayload } from '@/types/resources';

export function MarkerPopupCard({
  resource,
  reviewPayload,
  onOpen,
}: {
  resource: Resource;
  reviewPayload?: ReviewPayload | null;
  onOpen: () => void;
}) {
  const averageWait = reviewPayload?.summary.averageWaitMinutes ?? null;

  return (
    <div className="pointer-events-auto w-[280px] rounded-[24px] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
        {resource.resourceTypeLabel}
      </p>
      <h3 className="mt-2 text-xl leading-tight text-ink">{resource.name}</h3>
      <p className="mt-2 text-sm text-slate">{resource.address}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {resource.status.source === 'occurrences' ? (
          <span className="status-pill bg-pine/10 text-pine">{resource.status.label}</span>
        ) : null}
        {typeof resource.ratingAverage === 'number' ? (
          <span className="status-pill bg-slate/10 text-slate">
            <Star className="h-3.5 w-3.5" />
            {formatRating(resource.ratingAverage)}
          </span>
        ) : null}
        {typeof averageWait === 'number' && averageWait > 0 ? (
          <span className="status-pill bg-amber/20 text-ink">{formatWaitTime(averageWait)}</span>
        ) : null}
        {resource.reviewCount > 0 ? (
          <span className="status-pill bg-white text-slate">{resource.reviewCount} reviews</span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine"
      >
        More Info
      </button>
    </div>
  );
}
