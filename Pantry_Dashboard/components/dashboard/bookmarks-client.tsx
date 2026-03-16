'use client';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { BookmarksView } from '@/components/dashboard/bookmarks-view';
import { useBookmarks } from '@/hooks/use-bookmarks';

export function BookmarksClient() {
  const { bookmarks } = useBookmarks();

  return (
    <DashboardShell
      title="Saved resources"
      description="Bookmarks are stored in localStorage for this browser session and can be reopened from here at any time."
    >
      <BookmarksView resources={bookmarks} />
    </DashboardShell>
  );
}
