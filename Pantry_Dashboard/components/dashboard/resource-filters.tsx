'use client';

import { ChevronDown, Filter, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BOROUGH_FILTER_OPTIONS } from '@/lib/boroughs';
import { cn } from '@/lib/cn';
import type { DashboardFilterState } from '@/types/resources';

type Option = {
  id: string;
  label: string;
};

export function ResourceFilters({
  filters,
  onChange,
  resourceTypes,
  tags,
  resultCount,
  selectedName,
  pageLabel,
}: {
  filters: DashboardFilterState;
  onChange: (patch: Partial<DashboardFilterState>) => void;
  resourceTypes: Option[];
  tags: Option[];
  resultCount: number;
  selectedName?: string | null;
  pageLabel?: string | null;
}) {
  const sortOptions = useMemo(
    () => [
      { id: 'alpha-asc', label: 'Alphabetical' },
      { id: 'open-now', label: 'Open now first' },
      { id: 'open-soon', label: 'Open soonest' },
      { id: 'wait-desc', label: 'Highest wait time' },
      { id: 'rating-desc', label: 'Highest rating' },
      { id: 'rating-asc', label: 'Lowest rating' },
      { id: 'reviews-desc', label: 'Most reviewed' },
    ],
    [],
  );

  const timeframeOptions = useMemo(
    () => [
      { id: 'all', label: 'All time' },
      { id: '7d', label: 'Last 7 days' },
      { id: '30d', label: 'Last 30 days' },
      { id: '90d', label: 'Last 90 days' },
      { id: '12m', label: 'Last 12 months' },
    ],
    [],
  );

  const activeAdvancedCount = useMemo(
    () =>
      [
        Boolean(filters.borough),
        Boolean(filters.resourceTypeId),
        Boolean(filters.tagId),
        filters.openSoonOnly,
        !filters.syncListToMap,
        filters.hasHalal,
        filters.hasKosher,
        filters.hasFreshProduce,
        filters.hasMeat,
      ].filter(Boolean).length,
    [filters],
  );

  const [showAdvanced, setShowAdvanced] = useState(activeAdvancedCount > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Filters</p>
          <h2 className="mt-1 text-[1.85rem] leading-tight text-ink">Explore resources</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
            {resultCount} shown
          </div>
          {pageLabel ? (
            <div className="rounded-full border border-line/70 bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate">
              {pageLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr),minmax(0,1fr),210px,210px]">
        <label className="flex items-center gap-3 rounded-[22px] border border-line/80 bg-white/85 px-4 py-2.5">
          <Search className="h-4 w-4 text-moss" />
          <input
            value={filters.searchText}
            onChange={(event) => onChange({ searchText: event.target.value })}
            placeholder="Search pantry, meals, or tags"
            className="w-full bg-transparent text-sm text-ink placeholder:text-slate/70"
          />
        </label>

        <label className="flex items-center gap-3 rounded-[22px] border border-line/80 bg-white/85 px-4 py-2.5">
          <Filter className="h-4 w-4 text-moss" />
          <input
            value={filters.location}
            onChange={(event) => onChange({ location: event.target.value })}
            placeholder="Location"
            className="w-full bg-transparent text-sm text-ink placeholder:text-slate/70"
          />
        </label>

        <FilterSelect
          label="Timeframe"
          value={filters.timeframe}
          options={timeframeOptions}
          includeAllOption={false}
          onChange={(value: string) => onChange({ timeframe: value as DashboardFilterState['timeframe'] })}
        />

        <FilterSelect
          label="Sort"
          value={filters.sort}
          options={sortOptions}
          includeAllOption={false}
          onChange={(value: string) => onChange({ sort: value as DashboardFilterState['sort'] })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleRow
            label="Open now"
            description="Only show locations confirmed open"
            checked={filters.openNowOnly}
            compact
            onToggle={() =>
              onChange({
                openNowOnly: !filters.openNowOnly,
                openSoonOnly: filters.openNowOnly ? filters.openSoonOnly : false,
              })
            }
          />

          <div className="h-6 w-px bg-line/60 mx-1 hidden sm:block" />

          <QuickFilterChip
            label="Fresh Produce"
            active={filters.hasFreshProduce}
            onClick={() => onChange({ hasFreshProduce: !filters.hasFreshProduce })}
          />
          <QuickFilterChip
            label="Halal"
            active={filters.hasHalal}
            onClick={() => onChange({ hasHalal: !filters.hasHalal })}
          />
          <QuickFilterChip
            label="Kosher"
            active={filters.hasKosher}
            onClick={() => onChange({ hasKosher: !filters.hasKosher })}
          />
          <QuickFilterChip
            label="Protein"
            active={filters.hasMeat}
            onClick={() => onChange({ hasMeat: !filters.hasMeat })}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate transition hover:border-pine/30 hover:text-pine"
        >
          <SlidersHorizontal className="h-4 w-4" />
          More filters
          {activeAdvancedCount ? (
            <span className="rounded-full bg-mist px-2 py-0.5 text-[0.68rem] uppercase tracking-[0.12em] text-ink">
              {activeAdvancedCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn('h-4 w-4 transition', showAdvanced ? 'rotate-180' : 'rotate-0')}
          />
        </button>
      </div>

      {showAdvanced ? (
        <div className="rounded-[24px] border border-line/80 bg-white/75 p-4 shadow-sm">
          <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Borough"
              value={filters.borough}
              options={BOROUGH_FILTER_OPTIONS}
              includeAllOption={false}
              onChange={(value: string) => onChange({ borough: value as DashboardFilterState['borough'] })}
            />
            <FilterSelect
              label="Service type"
              value={filters.resourceTypeId}
              options={resourceTypes}
              onChange={(value: string) => onChange({ resourceTypeId: value })}
            />
            <FilterSelect
              label="Tag"
              value={filters.tagId}
              options={tags}
              onChange={(value: string) => onChange({ tagId: value })}
            />
            <ToggleRow
              label="Open soon"
              description="Confirmed upcoming occurrence"
              checked={filters.openSoonOnly}
              onToggle={() =>
                onChange({
                  openSoonOnly: !filters.openSoonOnly,
                  openNowOnly: filters.openSoonOnly ? filters.openNowOnly : false,
                })
              }
            />
          </div>

          <div className="mt-3 grid gap-2.5 lg:grid-cols-2 xl:grid-cols-4">
            <ToggleRow
              label="Sync to map"
              description="Limit list to viewport"
              checked={filters.syncListToMap}
              onToggle={() => onChange({ syncListToMap: !filters.syncListToMap })}
            />
            <QuickFilterChip
              label="High wait times"
              active={filters.highestWait}
              onClick={() => onChange({ highestWait: !filters.highestWait })}
            />
            <QuickFilterChip
              label="High failure rates"
              active={filters.highFailureRate}
              onClick={() => onChange({ highFailureRate: !filters.highFailureRate })}
            />
            <QuickFilterChip
              label="Inaccurate listings"
              active={filters.inaccurateListings}
              onClick={() => onChange({ inaccurateListings: !filters.inaccurateListings })}
            />
          </div>
        </div>
      ) : null}

      {selectedName ? (
        <div className="rounded-[22px] border border-line/80 bg-white/80 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Nearby highlight radius</p>
              <p className="text-xs text-slate">
                Emphasizing resources close to {selectedName}
              </p>
            </div>
            <p className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-pine">
              {filters.nearbyRadiusMiles.toFixed(1)} mi
            </p>
          </div>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={filters.nearbyRadiusMiles}
            onChange={(event) => onChange({ nearbyRadiusMiles: Number(event.target.value) })}
            className="mt-4 h-2 w-full accent-pine"
          />
        </div>
      ) : null}
    </div>
  );
}

// --- HELPER COMPONENTS (THE ONES THAT WERE MISSING) ---

function FilterSelect({
  label,
  value,
  options,
  onChange,
  includeAllOption = true,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  includeAllOption?: boolean;
}) {
  return (
    <label className="rounded-[22px] border border-line/80 bg-white/85 px-4 py-3">
      <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm font-medium text-ink outline-none"
      >
        {includeAllOption ? <option value="">All</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  compact = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-[22px] border border-line/80 bg-white/85 px-4 text-sm',
        compact ? 'py-2.5' : 'py-3',
      )}
    >
      <div>
        <p className="font-semibold text-ink">{label}</p>
        {!compact ? <p className="text-xs text-slate">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-pine' : 'bg-line'}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function QuickFilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-2 text-sm font-semibold transition whitespace-nowrap',
        active
          ? 'border-pine/30 bg-pine text-white'
          : 'border-line/80 bg-white/85 text-slate hover:border-pine/30 hover:text-pine',
      )}
    >
      {label}
    </button>
  );
}