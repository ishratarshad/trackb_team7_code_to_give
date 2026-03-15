import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

import { BookmarkButton } from '@/components/resources/bookmark-button';
import { ResourceImage } from '@/components/resources/resource-image';
import { cn } from '@/lib/cn';
import { compactNumber, formatRating, formatWaitTime } from '@/lib/formatters';
import type { BookmarkedResource, ReviewPayload } from '@/types/resources';

type ResourceCardProps = {
  resource: BookmarkedResource;
  selected?: boolean;
  nearby?: boolean;
  onMoreInfo?: () => void;
  detailHref?: string;
  reviewPayload?: ReviewPayload | null;
};

type FoodTag = {
  key: string;
  label: string;
  bgColor: string;
  textColor: string;
};

const FOOD_TAG_CONFIG: Record<string, Omit<FoodTag, 'key'>> = {
  hasFreshProduce: { label: 'Fresh Produce', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  hasDairy: { label: 'Dairy', bgColor: 'bg-sky-100', textColor: 'text-sky-700' },
  hasMeat: { label: 'Meat', bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
  hasGrains: { label: 'Grains', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  hasCanned: { label: 'Canned', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  hasHalal: { label: 'Halal', bgColor: 'bg-teal-100', textColor: 'text-teal-700' },
  hasKosher: { label: 'Kosher', bgColor: 'bg-violet-100', textColor: 'text-violet-700' },
};

function getFoodTags(resource: BookmarkedResource): FoodTag[] {
  const tags: FoodTag[] = [];

  for (const [key, config] of Object.entries(FOOD_TAG_CONFIG)) {
    if (resource[key as keyof BookmarkedResource]) {
      tags.push({ key, ...config });
    }
  }

  return tags;
}

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
  const foodTags = getFoodTags(resource);
  const showStatus = resource.status.source === 'occurrences' && Boolean(statusLabel);
  const showRating = typeof resource.ratingAverage === 'number';
  const showReviewCount = resource.reviewCount > 0;
  const averageWaitMinutes = reviewPayload?.summary.averageWaitMinutes ?? null;
  const showAverageWait = typeof averageWaitMinutes === 'number' && averageWaitMinutes > 0;

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[24px] border bg-white/88 shadow-soft transition',
        selected ? 'border-pine/40 ring-2 ring-pine/20' : 'border-line/80 hover:border-pine/25',
      )}
    >
      <div className="grid gap-3 p-3 md:grid-cols-[118px,1fr] md:p-3.5">
        <ResourceImage
          resource={resource}
          alt={resourceName}
          className="h-24 md:h-full"
          overlay={
            <div className="flex items-end justify-between gap-2">
              {resourceTypeLabel ? (
                <div className="max-w-full truncate whitespace-nowrap rounded-full border border-pine/30 bg-pine px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white shadow-soft">
                  {resourceTypeLabel}
                </div>
              ) : null}
              {nearby ? (
                <div className="rounded-full bg-amber/95 px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-ink shadow-soft">
                  Nearby
                </div>
              ) : null}
            </div>
          }
        />

        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[1.02rem] leading-tight text-ink lg:text-[1.1rem]">
                {resourceName}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate">{resourceAddress}</p>
            </div>
            <BookmarkButton resource={resource} />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
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
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-line/70 bg-mist/80 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-slate"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}

          {foodTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {foodTags.slice(0, 4).map((tag) => (
                <span
                  key={tag.key}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[0.65rem] font-semibold',
                    tag.bgColor,
                    tag.textColor
                  )}
                >
                  {tag.label}
                </span>
              ))}
              {foodTags.length > 4 ? (
                <span className="rounded-full bg-slate/10 px-2 py-0.5 text-[0.65rem] font-semibold text-slate">
                  +{foodTags.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {onMoreInfo ? (
              <button
                type="button"
                onClick={onMoreInfo}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-pine"
              >
                More Info
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
            {!onMoreInfo && detailHref ? (
              <Link
                href={detailHref}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-pine"
              >
                View Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {showStatus && statusDetail ? (
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate/80">
                {statusDetail}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
