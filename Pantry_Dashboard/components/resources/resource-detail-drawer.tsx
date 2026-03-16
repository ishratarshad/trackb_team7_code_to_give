'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

import { ResourceDetailContent } from '@/components/resources/resource-detail-content';
import { LoadingCard } from '@/components/ui/loading-card';
import { useResource, useReviewSummary } from '@/hooks/use-resources';
import { cn } from '@/lib/cn';
import type { TimeframeOption } from '@/types/resources';
import { getTimeframeLabel } from '@/lib/analytics';

export function ResourceDetailDrawer({
  resourceId,
  open,
  timeframe,
  onClose,
}: {
  resourceId: string | null;
  open: boolean;
  timeframe: TimeframeOption;
  onClose: () => void;
}) {
  const resourceQuery = useResource(open ? resourceId : null);
  const reviewSummaryQuery = useReviewSummary(open ? resourceId : null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-50 flex justify-end bg-ink/20 backdrop-blur-sm transition',
        open ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="hidden flex-1 cursor-default lg:block"
        aria-label="Close resource details"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'pointer-events-auto h-full w-full max-w-[820px] transform overflow-y-auto border-l border-line/70 bg-canvas p-3.5 shadow-card transition duration-300 lg:p-5',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Expanded card</p>
            <h2 className="mt-1 text-[1.9rem] text-ink">Location details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line/80 bg-white/80 text-slate shadow-soft transition hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {resourceQuery.isLoading ? (
          <div className="space-y-4">
            <LoadingCard className="h-[260px]" />
            <LoadingCard />
          </div>
        ) : null}

        {resourceQuery.data ? (
          <ResourceDetailContent
            resource={resourceQuery.data}
            reviewPayload={reviewSummaryQuery.data ?? null}
            timeframeLabel={getTimeframeLabel(timeframe)}
          />
        ) : null}

        {resourceQuery.isError ? (
          <div className="rounded-[28px] border border-dashed border-line bg-white/70 p-6 text-sm text-slate">
            Unable to load this resource right now.
          </div>
        ) : null}
      </aside>
    </div>
  );
}
