'use client';

import { useMemo, useSyncExternalStore } from 'react';

import {
  addBookmark,
  getBookmarkSnapshot,
  getBookmarkServerSnapshot,
  removeBookmark,
  subscribeToBookmarks,
  toggleBookmark,
} from '@/lib/bookmarks-store';
import type { BookmarkedResource } from '@/types/resources';

export function useBookmarks() {
  const bookmarks = useSyncExternalStore<BookmarkedResource[]>(
    subscribeToBookmarks,
    getBookmarkSnapshot,
    getBookmarkServerSnapshot,
  );

  const bookmarkIds = useMemo(() => new Set(bookmarks.map((bookmark) => bookmark.id)), [bookmarks]);

  return {
    bookmarks,
    bookmarkIds,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked(resourceId: string) {
      return bookmarkIds.has(resourceId);
    },
    toggle(resource: BookmarkedResource) {
      return toggleBookmark(resource);
    },
  };
}
