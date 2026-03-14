import { AlertCircle } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed border-line/80 bg-white/60 px-6 py-10 text-center shadow-soft">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pine/10 text-pine">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-2xl text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
