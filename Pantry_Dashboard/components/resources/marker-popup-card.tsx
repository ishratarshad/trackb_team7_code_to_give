import { ArrowRight, MapPin, Star } from 'lucide-react';

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
    <div className="pointer-events-auto w-[252px] rounded-[18px] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(250,247,239,0.96))] p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex max-w-full items-center rounded-full bg-mist px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-moss">
          {resource.resourceTypeLabel}
        </span>
        {resource.status.source === 'occurrences' ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-pine/10 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-pine">
            {resource.status.label}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 line-clamp-2 text-[1.05rem] leading-tight text-ink">{resource.name}</h3>
      <div className="mt-1.5 flex items-start gap-2 text-[0.8rem] leading-5 text-slate">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss/80" />
        <p className="line-clamp-2">{resource.address}</p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {typeof resource.ratingAverage === 'number' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-slate">
            <Star className="h-3.5 w-3.5" />
            {formatRating(resource.ratingAverage)}
          </span>
        ) : null}
        {typeof averageWait === 'number' && averageWait > 0 ? (
          <span className="inline-flex items-center rounded-full bg-amber/20 px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-ink">
            {formatWaitTime(averageWait)}
          </span>
        ) : null}
        {resource.reviewCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-slate">
            {resource.reviewCount} reviews
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-line/60 pt-2.5">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-pine"
        >
          More Info
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
