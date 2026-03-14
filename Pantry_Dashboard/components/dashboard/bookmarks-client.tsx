'use client';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ResourceCard } from '@/components/resources/resource-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBookmarks } from '@/hooks/use-bookmarks';

export function BookmarksClient() {
  const { bookmarks } = useBookmarks();

  return (
    <DashboardShell
      title="Saved resources"
      description="Bookmarks are stored in localStorage for this browser session and can be reopened from here at any time."
    >
      {bookmarks.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {bookmarks.map((bookmark) => (
            <ResourceCard
              key={bookmark.id}
              resource={bookmark}
              detailHref={`/resources/${bookmark.id}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No bookmarks yet"
          description="Save resources from the dashboard cards or the expanded detail drawer to build a quick-access shortlist."
        />
      )}
    </DashboardShell>
  );
}
