import Link from 'next/link';
import { Globe, MapPin, Phone, Star } from 'lucide-react';
import type { ReactNode } from 'react';

import { BookmarkButton } from '@/components/resources/bookmark-button';
import { MetricsSection } from '@/components/resources/metrics-section';
import { ResourceImage } from '@/components/resources/resource-image';
import { ScheduleSection } from '@/components/resources/schedule-section';
import {
  compactNumber,
  formatDistanceMiles,
  formatPhoneNumber,
  formatRating,
} from '@/lib/formatters';
import type { Resource, ReviewPayload } from '@/types/resources';

export function ResourceDetailContent({
  resource,
  reviewPayload,
  timeframeLabel = 'All time',
}: {
  resource: Resource;
  reviewPayload?: ReviewPayload | null;
  timeframeLabel?: string;
}) {
  const showStatus = resource.status.source === 'occurrences';
  const showRating = typeof resource.ratingAverage === 'number';
  const showReviewCount = resource.reviewCount > 0;
  const showDistance = typeof resource.travelDistanceMiles === 'number';

  return (
    <div className="space-y-5">
      <section className="panel-surface overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.08fr,1fr]">
          <ResourceImage
            resource={resource}
            alt={resource.name}
            className="h-72 lg:h-full"
            overlay={
              <div className="flex flex-wrap items-center gap-2">
                {showStatus ? (
                  <span className="status-pill bg-white/90 text-pine">{resource.status.label}</span>
                ) : null}
                <span className="status-pill bg-white/90 text-slate">{resource.resourceTypeLabel}</span>
              </div>
            }
          />

          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                  Resource Detail
                </p>
                <h1 className="mt-2 text-4xl leading-tight text-ink">{resource.name}</h1>
              </div>
              <BookmarkButton resource={resource} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {showStatus ? (
                <span className="status-pill bg-pine/10 text-pine">{resource.status.label}</span>
              ) : null}
              {showRating ? (
                <span className="status-pill bg-slate/10 text-slate">
                  <Star className="h-3.5 w-3.5" />
                  {formatRating(resource.ratingAverage)}
                </span>
              ) : null}
              {showReviewCount ? (
                <span className="status-pill bg-amber/10 text-amber">
                  {compactNumber(resource.reviewCount)} reviews
                </span>
              ) : null}
              {resource.openByAppointment ? (
                <span className="status-pill bg-mist text-slate">Appointment available</span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate">{resource.description}</p>

            <div className="mt-5 grid gap-3 text-sm text-slate sm:grid-cols-2">
              <InfoTile
                icon={<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-moss" />}
                label="Address"
                value={resource.address}
              />
              <InfoTile
                icon={<Phone className="mt-0.5 h-4 w-4 shrink-0 text-moss" />}
                label="Phone"
                value={formatPhoneNumber(resource.phone) ?? 'No phone listed'}
              />
              <div className="rounded-3xl bg-mist/70 p-4">
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                  <div>
                    <p className="font-semibold text-ink">Website</p>
                    {resource.website ? (
                      <Link
                        href={resource.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-pine underline decoration-pine/30 underline-offset-4"
                      >
                        Visit site
                      </Link>
                    ) : (
                      <p className="mt-1">No website listed</p>
                    )}
                  </div>
                </div>
              </div>
              <InfoTile
                label={showDistance ? 'Distance' : 'Usage limits'}
                value={
                  showDistance
                    ? formatDistanceMiles(resource.travelDistanceMiles) ?? 'Distance unavailable'
                    : resource.usageLimitSummary ?? 'No usage limits listed'
                }
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {resource.tags.length ? (
                resource.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-line/70 bg-white px-3 py-1 text-xs font-medium text-slate"
                  >
                    {tag.label}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-dashed border-line/80 px-3 py-1 text-xs font-medium text-slate">
                  No tags listed
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <ScheduleSection resource={resource} />

      {reviewPayload ? (
        <MetricsSection reviewPayload={reviewPayload} timeframeLabel={timeframeLabel} />
      ) : null}
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-mist/70 p-4">
      <div className="flex items-start gap-3">
        {icon ?? null}
        <div>
          <p className="font-semibold text-ink">{label}</p>
          <p className="mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}
