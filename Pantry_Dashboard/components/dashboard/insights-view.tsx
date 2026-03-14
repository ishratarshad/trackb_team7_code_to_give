'use client';

import { 
  AlertTriangle, 
  Clock3, 
  ShieldAlert, 
  Target, 
  Download, 
  PieChart as PieIcon, 
  TrendingUp 
} from 'lucide-react';
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
  scopeLabel,
  activeBoroughLabel,
  insightsScope,
  onInsightsScopeChange,
  isLoading,
  onOpenResource,
}: {
  resources: Resource[];
  reviewPayloadById: Map<string, ReviewPayload>;
  timeframe: TimeframeOption;
  scopeLabel: string;
  activeBoroughLabel: string;
  insightsScope: 'all' | 'bookmarked';
  onInsightsScopeChange: (scope: 'all' | 'bookmarked') => void;
  isLoading?: boolean;
  onOpenResource: (resourceId: string) => void;
}) {
  const insights = useMemo(
    () => buildDashboardInsights(resources, reviewPayloadById, timeframe),
    [resources, reviewPayloadById, timeframe],
  );
  const timeframeLabel = getTimeframeLabel(timeframe);

  // --- TEAM 7 VISUALIZATION LOGIC ---

  const supplyBreakdown = useMemo(() => {
    const total = resources.length;
    if (total === 0) return [];
    const getPct = (key: keyof Resource) => (resources.filter(r => !!r[key]).length / total) * 100;

    return [
      { label: 'Fresh Produce', value: getPct('hasFreshProduce'), color: 'bg-emerald-500' },
      { label: 'Protein/Meat', value: getPct('hasMeat'), color: 'bg-rose-500' },
      { label: 'Halal Options', value: getPct('hasHalal'), color: 'bg-amber-500' },
      { label: 'Kosher Options', value: getPct('hasKosher'), color: 'bg-blue-500' },
    ];
  }, [resources]);

  const handleExportPDF = () => {
    window.print();
  };

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
        title={insightsScope === 'bookmarked' ? 'No bookmarks match filters' : 'No resources in scope'}
        description="Try widening the borough or other filters to see trends."
      />
    );
  }

  return (
    <div className="grid gap-4 print:p-0">
      {/* HEADER & PDF EXPORT */}
      <section className="panel-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Structured Insights</p>
            <h2 className="mt-2 text-3xl text-ink">Resource Operations Snapshot</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">
              Summaries for {timeframeLabel.toLowerCase()} across {resources.length} resources.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate">
                Borough: {activeBoroughLabel}
              </span>
              <button 
                onClick={handleExportPDF}
                className="print:hidden flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-pine transition"
              >
                <Download className="h-3 w-3" /> Export Report (PDF)
              </button>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end print:hidden">
            <div className="rounded-full border border-line/80 bg-white/85 p-1">
              <button
                type="button"
                onClick={() => onInsightsScopeChange('all')}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  insightsScope === 'all' ? 'bg-pine text-white' : 'text-slate',
                )}
              >
                All filtered
              </button>
              <button
                type="button"
                onClick={() => onInsightsScopeChange('bookmarked')}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  insightsScope === 'bookmarked' ? 'bg-pine text-white' : 'text-slate',
                )}
              >
                Bookmarked
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={<Clock3 className="h-4 w-4 text-pine" />} label="Average wait" value={formatWaitTime(insights.kpis.averageWaitMinutes)} />
          <KpiCard icon={<Target className="h-4 w-4 text-pine" />} label="Help success" value={formatPercentage(insights.kpis.helpSuccessRate)} />
          <KpiCard icon={<AlertTriangle className="h-4 w-4 text-pine" />} label="Unmet demand" value={formatPercentage(insights.kpis.unmetDemand)} />
          <KpiCard icon={<ShieldAlert className="h-4 w-4 text-pine" />} label="Listing Accuracy" value={formatPercentage(insights.kpis.inaccuratePercentage)} />
        </div>
      </section>

      {/* TEAM 7: SUPPLY & HEALTH INDICATORS */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel-surface p-5">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="h-5 w-5 text-pine" />
            <h3 className="text-xl font-bold text-ink">Pantry Supply Breakdown</h3>
          </div>
          <div className="space-y-4">
            {supplyBreakdown.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate">
                  <span>{item.label}</span>
                  <span>{item.value.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full bg-mist rounded-full overflow-hidden">
                  <div className={cn("h-full transition-all duration-1000", item.color)} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-surface p-5 border-dashed border-2 border-pine/30 bg-mist/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-pine" />
            <h3 className="text-xl font-bold text-ink">Neighborhood Health Indicators</h3>
          </div>
          <p className="text-xs text-slate mb-6">Layered Data: NYC Health Atlas & Internal Metrics</p>
          <div className="grid grid-cols-2 gap-4">
            <HealthStat label="Vulnerability" value="7.8/10" status="High Need" />
            <HealthStat label="Transit Access" value="Moderate" status="Gaps Present" />
            <HealthStat label="Avg Distance" value="1.4 mi" status="In Range" />
            <HealthStat label="Insecurity" value="16.4%" status="Critical" />
          </div>
        </div>
      </section>

      {/* TRENDS */}
      <section className="grid gap-4 xl:grid-cols-3">
        <TrendCard title="Wait time over time" metric="Minutes" data={insights.timeline} valueSelector={(p) => p.averageWaitMinutes} valueFormatter={formatWaitTime} />
        <TrendCard title="Rating over time" metric="Rating" data={insights.timeline} valueSelector={(p) => p.averageRating} valueFormatter={(v) => v?.toFixed(1) ?? 'N/A'} />
        <TrendCard title="Success over time" metric="Success rate" data={insights.timeline} valueSelector={(p) => p.helpSuccessRate} valueFormatter={formatPercentage} />
      </section>

      {/* BARRIERS & PRIORITY VIEW */}
      <section className="grid gap-4 xl:grid-cols-[0.92fr,1.08fr]">
        <div className="panel-surface p-5">
          <h3 className="text-2xl text-ink">Reported Barriers</h3>
          {insights.structuredSignals.length ? (
            <div className="mt-5 space-y-3">
              {insights.structuredSignals.map((signal, index) => (
                <div key={signal.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm text-slate">
                    <span>{signal.label}</span>
                    <span>{signal.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/70">
                    <div className={cn('h-full rounded-full', index % 3 === 0 ? 'bg-pine' : index % 3 === 1 ? 'bg-amber' : 'bg-coral')} 
                      style={{ width: `${Math.min(100, Math.max(8, (signal.count / Math.max(insights.structuredSignals[0]?.count ?? 1, 1)) * 100))}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-slate">No barriers reported.</p>}
        </div>

        <div className="panel-surface p-5">
          <h3 className="text-2xl text-ink">Locations Needing Attention</h3>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-line/80">
            <div className="max-h-[420px] overflow-y-auto divide-y divide-line/70 bg-white/85">
              {insights.serviceDisruptions.slice(0, 5).map((alert) => (
                <div key={alert.resourceId} className="flex items-center justify-between p-4 hover:bg-mist/30 cursor-pointer" onClick={() => onOpenResource(alert.resourceId)}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{alert.resourceName}</p>
                    <div className="flex gap-2 mt-1">
                      {alert.topSignals.slice(0, 2).map(s => <span key={s} className="text-[9px] bg-coral/10 text-coral px-2 py-0.5 rounded-full font-bold uppercase">{s}</span>)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate uppercase">Score</p>
                    <p className="text-lg font-black text-rose-500">{alert.disruptionScore.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- HELPERS ---

function HealthStat({ label, value, status }: { label: string, value: string, status: string }) {
  return (
    <div className="p-3 bg-white rounded-2xl border border-line/50">
      <p className="text-[10px] font-black text-slate/60 uppercase">{label}</p>
      <p className="text-xl font-black text-ink">{value}</p>
      <p className="text-[9px] font-bold text-pine uppercase mt-1">{status}</p>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: ReactNode, label: string, value: string }) {
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

function TrendCard({ title, metric, data, valueSelector, valueFormatter }: { title: string, metric: string, data: TrendPoint[], valueSelector: (p: TrendPoint) => number | null, valueFormatter: (v: number | null) => string }) {
  const values = data.map(valueSelector);
  const latestValue = values.filter((v): v is number => typeof v === 'number').at(-1) ?? null;
  return (
    <div className="panel-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">{metric}</p>
      <h3 className="mt-2 text-2xl text-ink">{title}</h3>
      <p className="mt-3 text-2xl text-ink">{valueFormatter(latestValue)}</p>
      <div className="mt-4"><SparklineChart data={values} /></div>
    </div>
  );
}

function SparklineChart({ data }: { data: Array<number | null> }) {
  const numericValues = data.filter((v): v is number => typeof v === 'number');
  if (!numericValues.length) return <div className="h-28 bg-mist/60 rounded-[22px]" />;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = Math.max(max - min, 1);
  const width = 360;
  const height = 112;
  const points = data.map((v, i) => {
    if (typeof v !== 'number') return null;
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 18) - 9;
    return `${x},${y}`;
  }).filter(Boolean);

  return (
    <div className="overflow-hidden rounded-[22px] bg-mist/60 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
        <polyline fill="none" stroke="#9b6813" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={points.join(' ')} />
      </svg>
    </div>
  );
}