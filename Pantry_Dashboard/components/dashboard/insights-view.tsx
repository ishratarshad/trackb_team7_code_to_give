import { AlertTriangle, Clock3, ShieldAlert, Target } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { buildDashboardInsights, getTimeframeLabel } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { formatPercentage, formatWaitTime } from '@/lib/formatters';
import type { Resource, ReviewPayload, TimeframeOption, TrendPoint } from '@/types/resources';

export function InsightsView({
  resources,
  reviewPayloadById,
  timeframe,
  isLoading,
  onOpenResource,
}: {
  resources: Resource[];
  reviewPayloadById: Map<string, ReviewPayload>;
  timeframe: TimeframeOption;
  isLoading?: boolean;
  onOpenResource: (resourceId: string) => void;
}) {
  const insights = useMemo(
    () => buildDashboardInsights(resources, reviewPayloadById, timeframe),
    [resources, reviewPayloadById, timeframe],
  );
  const timeframeLabel = getTimeframeLabel(timeframe);

  if (isLoading && !resources.length) {
    return (
      <div className="grid gap-4">
        <LoadingCard className="h-32" />
        <LoadingCard className="h-[320px]" />
        <LoadingCard className="h-[320px]" />
      </div>
    );
  }

  if (!resources.length) {
    return (
      <EmptyState
        title="No resources in scope for insights"
        description="Adjust the current filters or page through more resources to populate the structured dashboard."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <section className="panel-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
              Structured insights
            </p>
            <h2 className="mt-2 text-3xl text-ink">Resource operations snapshot</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">
              These summaries are based on structured visit records only for {timeframeLabel.toLowerCase()} across {resources.length} loaded resources.
            </p>
          </div>

          <div className="rounded-full bg-mist px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
            No raw review text shown
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Clock3 className="h-4 w-4 text-pine" />}
            label="Average wait"
            value={formatWaitTime(insights.kpis.averageWaitMinutes)}
          />
          <KpiCard
            icon={<Target className="h-4 w-4 text-pine" />}
            label="Help success"
            value={formatPercentage(insights.kpis.helpSuccessRate)}
          />
          <KpiCard
            icon={<AlertTriangle className="h-4 w-4 text-pine" />}
            label="Unmet demand"
            value={formatPercentage(insights.kpis.unmetDemand)}
          />
          <KpiCard
            icon={<ShieldAlert className="h-4 w-4 text-pine" />}
            label="Inaccurate listings"
            value={formatPercentage(insights.kpis.inaccuratePercentage)}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <TrendCard
          title="Average wait over time"
          metric="Minutes"
          data={insights.timeline}
          valueSelector={(point) => point.averageWaitMinutes}
          valueFormatter={(value) => formatWaitTime(value)}
        />
        <TrendCard
          title="Average rating over time"
          metric="Rating"
          data={insights.timeline}
          valueSelector={(point) => point.averageRating}
          valueFormatter={(value) => (typeof value === 'number' ? value.toFixed(1) : 'Unavailable')}
        />
        <TrendCard
          title="Received help over time"
          metric="Success rate"
          data={insights.timeline}
          valueSelector={(point) => point.helpSuccessRate}
          valueFormatter={(value) => formatPercentage(value)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.92fr,1.08fr]">
        <div className="panel-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                Structured signals
              </p>
              <h3 className="mt-2 text-2xl text-ink">Reported barriers and accuracy flags</h3>
            </div>
          </div>

          {insights.structuredSignals.length ? (
            <div className="mt-5 space-y-3">
              {insights.structuredSignals.map((signal, index) => (
                <div key={signal.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm text-slate">
                    <span>{signal.label}</span>
                    <span>{signal.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/70">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        index % 3 === 0
                          ? 'bg-pine'
                          : index % 3 === 1
                            ? 'bg-amber'
                            : 'bg-coral',
                      )}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            8,
                            (signal.count / Math.max(insights.structuredSignals[0]?.count ?? 1, 1)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate">
              No structured barrier reasons or listing accuracy flags were reported in this timeframe.
            </p>
          )}
        </div>

        <div className="panel-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                Priority view
              </p>
              <h3 className="mt-2 text-2xl text-ink">Locations needing attention</h3>
              <p className="mt-2 text-sm leading-6 text-slate">
                Ranked from structured unmet-demand, accuracy, and wait-time signals.
              </p>
            </div>
          </div>

          {insights.serviceDisruptions.length ? (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-line/80">
              <div className="hidden grid-cols-[minmax(0,1.3fr),90px,100px,110px,110px,minmax(0,0.9fr),96px] gap-3 bg-mist/70 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate lg:grid">
                <span>Location</span>
                <span>Score</span>
                <span>Unmet</span>
                <span>Accuracy</span>
                <span>Avg wait</span>
                <span>Signals</span>
                <span />
              </div>
              <div className="divide-y divide-line/70 bg-white/85">
                {insights.serviceDisruptions.map((alert) => (
                  <div
                    key={alert.resourceId}
                    className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.3fr),90px,100px,110px,110px,minmax(0,0.9fr),96px] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{alert.resourceName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate">
                        {alert.zipCode ? `ZIP ${alert.zipCode}` : 'ZIP unavailable'}
                      </p>
                    </div>
                    <MetricChip value={alert.disruptionScore.toFixed(1)} />
                    <MetricChip value={formatPercentage(alert.unmetDemand)} />
                    <MetricChip value={formatPercentage(alert.inaccuratePercentage)} />
                    <MetricChip value={formatWaitTime(alert.averageWaitMinutes)} />
                    <div className="flex flex-wrap gap-1.5">
                      {alert.topSignals.length ? (
                        alert.topSignals.map((signal) => (
                          <span
                            key={signal}
                            className="rounded-full border border-line/70 bg-mist/80 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-slate"
                          >
                            {signal}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate">No dominant signals</span>
                      )}
                    </div>
                    <div className="flex lg:justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenResource(alert.resourceId)}
                        className="rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-pine"
                      >
                        More Info
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate">
              No locations had enough structured signals to rank in this timeframe.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-tile">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">{label}</p>
      </div>
      <p className="mt-3 text-3xl text-ink">{value}</p>
    </div>
  );
}

function MetricChip({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
      {value}
    </span>
  );
}

function TrendCard({
  title,
  metric,
  data,
  valueSelector,
  valueFormatter,
}: {
  title: string;
  metric: string;
  data: TrendPoint[];
  valueSelector: (point: TrendPoint) => number | null;
  valueFormatter: (value: number | null) => string;
}) {
  const values = data.map(valueSelector);
  const latestValue = values.filter((value): value is number => typeof value === 'number').at(-1) ?? null;

  return (
    <div className="panel-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">{metric}</p>
      <h3 className="mt-2 text-2xl text-ink">{title}</h3>
      <p className="mt-3 text-2xl text-ink">{valueFormatter(latestValue)}</p>
      <div className="mt-4">
        <SparklineChart data={values} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.length ? (
          data.map((point) => (
            <span
              key={point.key}
              className="rounded-full bg-mist px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate"
            >
              {point.label}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate">No structured history available.</span>
        )}
      </div>
    </div>
  );
}

function SparklineChart({ data }: { data: Array<number | null> }) {
  const numericValues = data.filter((value): value is number => typeof value === 'number');

  if (!numericValues.length) {
    return (
      <div className="flex h-28 items-center justify-center rounded-[22px] bg-mist/60 text-sm text-slate">
        No chart data
      </div>
    );
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = Math.max(max - min, 1);
  const width = 360;
  const height = 112;

  const points = data
    .map((value, index) => {
      if (typeof value !== 'number') {
        return null;
      }

      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const normalized = (value - min) / range;
      const y = height - normalized * (height - 18) - 9;

      return `${x},${y}`;
    })
    .filter((point): point is string => Boolean(point));

  return (
    <div className="overflow-hidden rounded-[22px] bg-mist/60 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
        <polyline
          fill="none"
          stroke="#9b6813"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points.join(' ')}
        />
      </svg>
    </div>
  );
}
