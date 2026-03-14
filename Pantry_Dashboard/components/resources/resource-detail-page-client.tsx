'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ResourceDetailContent } from '@/components/resources/resource-detail-content';
import { LoadingCard } from '@/components/ui/loading-card';
import { useResource, useReviewSummary } from '@/hooks/use-resources';

export function ResourceDetailPageClient({ resourceId }: { resourceId: string }) {
  const resourceQuery = useResource(resourceId);
  const reviewSummaryQuery = useReviewSummary(resourceId);

  return (
    <DashboardShell
      title="Resource detail"
      description="Deep-link view for a single pantry or soup kitchen. The same detail content is used by the expanded dashboard drawer."
      aside={
        <Link
          href={`/?resourceId=${resourceId}`}
          className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate transition hover:border-pine/30 hover:text-pine"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      }
    >
      {resourceQuery.isLoading ? (
        <div className="space-y-4">
          <LoadingCard className="h-[280px]" />
          <LoadingCard />
        </div>
      ) : null}

      {resourceQuery.data ? (
        <ResourceDetailContent
          resource={resourceQuery.data}
          reviewPayload={reviewSummaryQuery.data ?? null}
        />
      ) : null}

      {resourceQuery.isError ? (
        <div className="rounded-[28px] border border-dashed border-line bg-white/70 p-6 text-sm text-slate">
          Unable to load this resource right now.
        </div>
      ) : null}
    </DashboardShell>
  );
}
