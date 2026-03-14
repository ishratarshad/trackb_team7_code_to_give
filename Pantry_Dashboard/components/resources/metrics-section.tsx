import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatPercentage, formatWaitTime } from '@/lib/formatters';
import type { ReviewPayload } from '@/types/resources';

function getTrendLabel(trend: ReviewPayload['summary']['waitTimeTrend']) {
  if (trend === 'rising') {
    return 'Wait times are rising';
  }

  if (trend === 'falling') {
    return 'Wait times are improving';
  }

  if (trend === 'steady') {
    return 'Wait times are steady';
  }

  return 'Trend unavailable';
}

export function MetricsSection({
  reviewPayload,
  timeframeLabel,
}: {
  reviewPayload: ReviewPayload;
  timeframeLabel: string;
}) {
  const { summary } = reviewPayload;

  if (!summary.totalReviews) {
    return (
      <section className="panel-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
              Structured metrics
            </p>
            <h2 className="mt-2 text-2xl text-ink">No recent structured visit data</h2>
            <p className="mt-2 text-sm leading-6 text-slate">
              No structured feedback records were available for {timeframeLabel.toLowerCase()}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
            Structured metrics
          </p>
          <h2 className="mt-2 text-2xl text-ink">Visit outcomes and listing signals</h2>
          <p className="mt-2 text-sm leading-6 text-slate">
            Based on structured visit fields only for {timeframeLabel.toLowerCase()}.
          </p>
        </div>

        <div className="rounded-full bg-mist px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
          {summary.totalReviews} records
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={<Clock3 className="h-4 w-4 text-pine" />}
          label="Average wait"
          value={formatWaitTime(summary.averageWaitMinutes)}
          detail={getTrendLabel(summary.waitTimeTrend)}
        />
        <MetricTile
          icon={<CheckCircle2 className="h-4 w-4 text-pine" />}
          label="Help success"
          value={formatPercentage(summary.attendedPercentage)}
          detail="Structured attended field"
        />
        <MetricTile
          icon={<AlertTriangle className="h-4 w-4 text-pine" />}
          label="Unmet demand"
          value={formatPercentage(summary.didNotReceiveHelpPercentage)}
          detail="Did not receive help"
        />
        <MetricTile
          icon={<ShieldAlert className="h-4 w-4 text-pine" />}
          label="Inaccurate listing"
          value={formatPercentage(summary.inaccuratePercentage)}
          detail="Structured accuracy field"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="subtle-panel p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-pine" />
            <h3 className="text-lg text-ink">Wait distribution</h3>
          </div>
          <div className="mt-4 space-y-3">
            {summary.waitBuckets.map((bucket) => {
              const width = summary.totalReviews
                ? Math.max(8, (bucket.count / summary.totalReviews) * 100)
                : 8;

              return (
                <div key={bucket.label}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate">
                    <span>{bucket.label}</span>
                    <span>{bucket.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/70">
                    <div
                      className="h-full rounded-full bg-amber"
                      style={{ width: `${Math.min(width, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="subtle-panel p-4">
          <h3 className="text-lg text-ink">Reported barriers</h3>
          {summary.didNotAttendReasons.length ? (
            <div className="mt-4 space-y-2.5">
              {summary.didNotAttendReasons.map((reason) => (
                <div
                  key={reason.label}
                  className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2.5"
                >
                  <span className="text-sm text-slate">{reason.label}</span>
                  <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
                    {reason.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate">
              No structured barrier reasons were reported for this timeframe.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-tile">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{label}</p>
      </div>
      <p className="mt-3 text-2xl text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate">{detail}</p>
    </div>
  );
}
