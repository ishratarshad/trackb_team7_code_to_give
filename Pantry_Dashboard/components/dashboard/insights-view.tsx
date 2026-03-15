'use client';

import {
  AlertTriangle,
  Clock3,
  ShieldAlert,
  Target,
  Download,
  PieChart as PieIcon,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { buildDashboardInsights, getTimeframeLabel } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { formatPercentage, formatWaitTime } from '@/lib/formatters';
import { exportAnalyticsReport, type AnalyticsReportData } from '@/lib/pdf-export';
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
    const getPct = (key: keyof Resource) => (resources.filter((resource) => !!resource[key]).length / total) * 100;

    return [
      { label: 'Fresh Produce', value: getPct('hasFreshProduce'), color: '#ffcc10' },
      { label: 'Protein/Meat', value: getPct('hasMeat'), color: '#704DBD' },
      { label: 'Halal Options', value: getPct('hasHalal'), color: '#8f76d0' },
      { label: 'Kosher Options', value: getPct('hasKosher'), color: '#ffd95a' },
      { label: 'Dairy Products', value: getPct('hasDairy'), color: '#5b458f' },
      { label: 'Grains/Staples', value: getPct('hasGrains'), color: '#b59ae8' },
    ];
  }, [resources]);

  // Build top disruptions for export
  const topDisruptions = useMemo(() => {
    return insights.serviceDisruptions.slice(0, 10).map((alert) => ({
      name: alert.resourceName,
      score: alert.disruptionScore,
      wait: alert.averageWaitMinutes ?? 0,
      unmet: alert.unmetDemand ?? 0,
    }));
  }, [insights.serviceDisruptions]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = useCallback(() => {
    setIsExporting(true);

    // Small delay to show loading state
    setTimeout(() => {
      const reportData: AnalyticsReportData = {
        title: 'Lemontree Operations Report',
        borough: activeBoroughLabel,
        timeframe: timeframeLabel,
        generatedAt: new Date().toLocaleString(),
        resourceCount: resources.length,
        kpis: {
          averageWaitMinutes: insights.kpis.averageWaitMinutes,
          helpSuccessRate: insights.kpis.helpSuccessRate,
          unmetDemand: insights.kpis.unmetDemand,
          inaccuratePercentage: insights.kpis.inaccuratePercentage,
        },
        supplyBreakdown: supplyBreakdown.map((item) => ({
          label: item.label,
          value: item.value,
        })),
        topDisruptions,
        barriers: insights.structuredSignals.map((signal) => ({
          label: signal.label,
          count: signal.count,
        })),
      };

      try {
        exportAnalyticsReport(reportData);
      } catch (error) {
        console.error('PDF export failed:', error);
        alert('Failed to generate PDF. Please try again.');
      } finally {
        setIsExporting(false);
      }
    }, 100);
  }, [activeBoroughLabel, timeframeLabel, resources.length, insights, supplyBreakdown, topDisruptions]);

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
      <div className="grid gap-4">
        <div className="flex justify-end">
          <div className="rounded-full border border-line/80 bg-white/85 p-1">
            <button
              type="button"
              onClick={() => onInsightsScopeChange('all')}
              className={getScopeButtonClass(insightsScope === 'all')}
            >
              All filtered
            </button>
            <button
              type="button"
              onClick={() => onInsightsScopeChange('bookmarked')}
              className={getScopeButtonClass(insightsScope === 'bookmarked')}
            >
              Bookmarked
            </button>
          </div>
        </div>
        <EmptyState
          title={insightsScope === 'bookmarked' ? 'No bookmarks match filters' : 'No resources in scope'}
          description="Try widening the borough or other filters to see trends."
        />
      </div>
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
              <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
                Borough: {activeBoroughLabel}
              </span>
              <span className="rounded-full bg-pine/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-pine">
                {scopeLabel}
              </span>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="print:hidden flex items-center gap-2 rounded-full bg-pine px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3" /> Export Report (PDF)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end print:hidden">
            <div className="rounded-full border border-line/80 bg-white/85 p-1">
              <button
                type="button"
                onClick={() => onInsightsScopeChange('all')}
                className={getScopeButtonClass(insightsScope === 'all')}
              >
                All filtered
              </button>
              <button
                type="button"
                onClick={() => onInsightsScopeChange('bookmarked')}
                className={getScopeButtonClass(insightsScope === 'bookmarked')}
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
                <div className="h-3 w-full overflow-hidden rounded-full bg-line/45">
                  <div
                    className="h-full transition-all duration-1000"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-surface border-2 border-dashed border-amber/50 bg-gradient-to-br from-mist/40 via-white/90 to-pine/5 p-5">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pine" />
            <h3 className="text-xl font-bold text-ink">Neighborhood Health Indicators</h3>
          </div>
          <p className="mb-6 text-xs text-slate">Layered Data: NYC Health Atlas & Internal Metrics</p>
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
                    <div
                      className={cn(
                        'h-full rounded-full',
                        index % 3 === 0 ? 'bg-pine' : index % 3 === 1 ? 'bg-amber' : 'bg-moss',
                      )}
                      style={{ width: `${Math.min(100, Math.max(8, (signal.count / Math.max(insights.structuredSignals[0]?.count ?? 1, 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate">No barriers reported.</p>
          )}
        </div>

        <div className="panel-surface p-5">
          <h3 className="text-2xl text-ink">Locations Needing Attention</h3>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-line/80">
            <div className="max-h-[420px] overflow-y-auto divide-y divide-line/70 bg-white/85">
              {insights.serviceDisruptions.slice(0, 5).map((alert) => (
                <div
                  key={alert.resourceId}
                  className="flex cursor-pointer items-center justify-between p-4 transition hover:bg-mist/30"
                  onClick={() => onOpenResource(alert.resourceId)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{alert.resourceName}</p>
                    <div className="mt-1 flex gap-2">
                      {alert.topSignals.slice(0, 2).map((signal) => (
                        <span
                          key={signal}
                          className="rounded-full bg-amber/25 px-2 py-0.5 text-[9px] font-bold uppercase text-ink"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate uppercase">Score</p>
                    <p className="text-lg font-black text-pine">{alert.disruptionScore.toFixed(1)}</p>
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
    <div className="rounded-2xl border border-line/50 bg-white/95 p-3 shadow-soft">
      <p className="text-[10px] font-black text-slate/60 uppercase">{label}</p>
      <p className="text-xl font-black text-ink">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase text-pine">{status}</p>
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
      <div className="mt-4"><SparklineChart data={values} valueFormatter={valueFormatter} /></div>
    </div>
  );
}

function SparklineChart({ data, valueFormatter }: { data: Array<number | null>; valueFormatter?: (v: number | null) => string }) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const numericValues = data.filter((v): v is number => typeof v === 'number');
  if (!numericValues.length) return <div className="h-28 bg-mist/60 rounded-[22px] flex items-center justify-center text-slate text-sm">No data available</div>;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = Math.max(max - min, 1);
  const width = 360;
  const height = 112;
  const padding = 12;

  const pointData = data.map((v, i) => {
    if (typeof v !== 'number') return null;
    const x = data.length === 1 ? width / 2 : padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - ((v - min) / range) * (height - 30) - 15;
    return { x, y, value: v, index: i };
  }).filter((p): p is { x: number; y: number; value: number; index: number } => p !== null);

  const polylinePoints = pointData.map(p => `${p.x},${p.y}`).join(' ');
  const hoveredPoint = hoveredIndex !== null ? pointData.find(p => p.index === hoveredIndex) : null;
  const formatter = valueFormatter ?? ((v: number | null) => v?.toFixed(1) ?? 'N/A');

  return (
    <div className="overflow-hidden rounded-[22px] bg-mist/60 p-3 relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full cursor-crosshair"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Area fill under line */}
        <path
          d={`M ${pointData[0]?.x ?? 0},${height} ${polylinePoints} L ${pointData[pointData.length - 1]?.x ?? width},${height} Z`}
          fill={`url(#${gradientId})`}
          opacity="0.3"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#704DBD" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ffcc10" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Main line */}
        <polyline
          fill="none"
          stroke="#704DBD"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polylinePoints}
        />

        {/* Interactive hit areas and points */}
        {pointData.map((point) => (
          <g key={point.index}>
            {/* Larger invisible hit area */}
            <circle
              cx={point.x}
              cy={point.y}
              r={16}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(point.index)}
              className="cursor-pointer"
            />
            {/* Visible point */}
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === point.index ? 6 : 4}
              fill={hoveredIndex === point.index ? '#ffcc10' : '#704DBD'}
              stroke="white"
              strokeWidth={hoveredIndex === point.index ? 3 : 2}
              className="transition-all duration-150"
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute bg-ink text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg pointer-events-none transform -translate-x-1/2"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 15}%`,
          }}
        >
          {formatter(hoveredPoint.value)}
        </div>
      )}
    </div>
  );
}

function getScopeButtonClass(active: boolean) {
  return cn(
    'rounded-full px-4 py-2 text-sm font-semibold transition',
    active ? 'bg-pine text-white shadow-soft' : 'text-slate hover:text-pine',
  );
}
