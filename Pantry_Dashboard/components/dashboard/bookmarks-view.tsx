'use client';

import { Bookmark } from 'lucide-react';

import { ResourceCard } from '@/components/resources/resource-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { BookmarkedResource, ReviewPayload } from '@/types/resources';

export function BookmarksView({
  resources,
  reviewPayloadById,
  onOpenResource,
}: {
  resources: BookmarkedResource[];
  reviewPayloadById?: Map<string, ReviewPayload>;
  onOpenResource?: (resourceId: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <section className="panel-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Saved Resources</p>
            <h2 className="mt-1 text-[1.6rem] text-ink">Bookmarks</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate">
              Your saved shortlist stays inside this dashboard and is stored locally in this browser.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
            <Bookmark className="h-3.5 w-3.5" />
            {resources.length} saved
          </div>
        </div>
      </section>

      {resources.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              reviewPayload={reviewPayloadById?.get(resource.id) ?? null}
              onMoreInfo={onOpenResource ? () => onOpenResource(resource.id) : undefined}
              detailHref={onOpenResource ? undefined : `/resources/${resource.id}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No bookmarks yet"
          description="Save resources from the explore cards or detail drawer to build a quick-access shortlist."
        />
      )}
    </div>
  );
}
