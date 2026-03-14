export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-line/70 bg-white/80 shadow-soft ${className}`}
    >
      <div className="h-44 animate-pulse bg-mist/80" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-20 animate-pulse rounded-full bg-mist" />
        <div className="h-6 w-3/4 animate-pulse rounded-full bg-mist" />
        <div className="h-4 w-full animate-pulse rounded-full bg-mist" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-mist" />
        <div className="flex gap-3 pt-3">
          <div className="h-10 flex-1 animate-pulse rounded-full bg-mist" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-mist" />
        </div>
      </div>
    </div>
  );
}
