import { CalendarDays, Clock3 } from 'lucide-react';

import type { Resource } from '@/types/resources';

export function ScheduleSection({ resource }: { resource: Resource }) {
  return (
    <section className="subtle-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">
            Schedule
          </p>
          <h3 className="mt-1 text-2xl text-ink">Hours and upcoming visits</h3>
        </div>
        <span className="status-pill bg-pine/10 text-pine">{resource.status.label}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="metric-tile">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate">
            <Clock3 className="h-4 w-4 text-moss" />
            Status
          </div>
          <p className="mt-3 text-lg font-semibold text-ink">{resource.status.detail}</p>
          <p className="mt-2 text-sm text-slate">
            {resource.openByAppointment
              ? 'Open by appointment availability may apply.'
              : 'Occurrences are used when available, with shift-based fallback otherwise.'}
          </p>
        </div>

        <div className="metric-tile">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate">
            <CalendarDays className="h-4 w-4 text-moss" />
            Weekly schedule
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate">
            {resource.weeklySchedule.length ? (
              resource.weeklySchedule.map((entry, index) => (
                <div key={`${entry}-${index}`} className="rounded-2xl bg-white/70 px-3 py-2">
                  {entry}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white/70 px-3 py-2">Unknown hours</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
