'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useBookmarks } from '@/hooks/use-bookmarks';
import type { BookmarkedResource } from '@/types/resources';

export function BookmarkButton({
  resource,
  className,
}: {
  resource: BookmarkedResource;
  className?: string;
}) {
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(resource.id);

  return (
    <button
      type="button"
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      onClick={() => {
        toggle(resource);
      }}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-soft transition',
        bookmarked
          ? 'border-amber/70 bg-amber/25 text-pine hover:border-amber hover:bg-amber/35'
          : 'border-line/80 bg-white/85 text-slate hover:border-pine/30 hover:text-pine',
        className,
      )}
    >
      {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
    </button>
  );
}
