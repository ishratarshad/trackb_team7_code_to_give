import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

import { BookmarkButton } from '@/components/resources/bookmark-button';
import { ResourceImage } from '@/components/resources/resource-image';
import { cn } from '@/lib/cn';
import { compactNumber, formatRating, formatWaitTime } from '@/lib/formatters';
import { getResourceFoodTags } from '@/lib/resource-food-tags';
import type { BookmarkedResource, ReviewPayload } from '@/types/resources';

type ResourceCardProps = {
  resource: BookmarkedResource;
  selected?: boolean;
  nearby?: boolean;
  onMoreInfo?: () => void;
  detailHref?: string;
  reviewPayload?: ReviewPayload | null;
};

function stripParentheticalText(value: string) {
  return value.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function ResourceCard({
  resource,
  selected,
  nearby,
  onMoreInfo,
  detailHref,
  reviewPayload,
}: ResourceCardProps) {
  const resourceTypeLabel = stripParentheticalText(resource.resourceTypeLabel);
  const resourceName = stripParentheticalText(resource.name);
  const resourceAddress = stripParentheticalText(resource.address);
  const statusLabel = stripParentheticalText(resource.status.label);
  const statusDetail = stripParentheticalText(resource.status.detail);
  const visibleTags = resource.tags
    .map((tag) => ({
      ...tag,
      label: stripParentheticalText(tag.label),
    }))
    .filter((tag) => tag.label)
    .slice(0, 2);
  const foodTags = getResourceFoodTags(resource);
  const showStatus = resource.status.source === 'occurrences' && Boolean(statusLabel);
  const showRating = typeof resource.ratingAverage === 'number';
  const showReviewCount = resource.reviewCount > 0;
  const averageWaitMinutes = reviewPayload?.summary.averageWaitMinutes ?? null;
  const showAverageWait = typeof averageWaitMinutes === 'number' && averageWaitMinutes > 0;

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[22px] border bg-white/88 shadow-soft transition',
        selected ? 'border-pine/40 ring-2 ring-pine/20' : 'border-line/80 hover:border-pine/25',
      )}
    >
      <div className="grid gap-2.5 p-2.5 md:grid-cols-[108px,1fr] md:p-3">
        <ResourceImage
          resource={resource}
          alt={resourceName}
          className="h-[5.5rem] md:h-full"
          overlay={
            <div className="flex items-end justify-between gap-2">
              {resourceTypeLabel ? (
                <div className="max-w-full truncate whitespace-nowrap rounded-full border border-pine/30 bg-pine px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-white shadow-soft">
                  {resourceTypeLabel}
                </div>
              ) : null}
              {nearby ? (
                <div className="rounded-full bg-amber/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-ink shadow-soft">
                  Nearby
                </div>
              ) : null}
            </div>
          }
        />

        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[0.96rem] leading-tight text-ink lg:text-[1.02rem]">
                {resourceName}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[0.82rem] text-slate">{resourceAddress}</p>
            </div>
            <BookmarkButton resource={resource} />
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {showStatus ? (
              <span className="status-pill bg-pine/10 text-pine">{statusLabel}</span>
            ) : null}
            {showRating ? (
              <span className="status-pill bg-slate/10 text-slate">
                <Star className="h-3.5 w-3.5" />
                {formatRating(resource.ratingAverage)}
              </span>
            ) : null}
            {showAverageWait ? (
              <span className="status-pill bg-amber/20 text-ink">
                {formatWaitTime(averageWaitMinutes)}
              </span>
            ) : null}
            {showReviewCount ? (
              <span className="status-pill bg-white text-slate">
                {compactNumber(resource.reviewCount)} reviews
              </span>
            ) : null}
          </div>

          {visibleTags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-line/70 bg-mist/80 px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.1em] text-slate"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}

          {foodTags.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {foodTags.slice(0, 4).map((tag) => (
                <span
                  key={tag.key}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[0.6rem] font-semibold',
                    tag.bgColor,
                    tag.textColor
                  )}
                >
                  {tag.label}
                </span>
              ))}
              {foodTags.length > 4 ? (
                <span className="rounded-full bg-slate/10 px-2 py-0.5 text-[0.6rem] font-semibold text-slate">
                  +{foodTags.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {onMoreInfo ? (
              <button
                type="button"
                onClick={onMoreInfo}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[0.84rem] font-semibold text-white transition hover:bg-pine"
              >
                More Info
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
            {!onMoreInfo && detailHref ? (
              <Link
                href={detailHref}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[0.84rem] font-semibold text-white transition hover:bg-pine"
              >
                View Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {showStatus && statusDetail ? (
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-slate/80">
                {statusDetail}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
