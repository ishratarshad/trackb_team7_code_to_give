'use client';

import { MapPinned } from 'lucide-react';
import { useMemo, useState } from 'react';

import { buildStreetViewImageUrl } from '@/lib/mapbox';
import { cn } from '@/lib/cn';
import type { BookmarkedResource } from '@/types/resources';

type ResourceImageProps = {
  resource: BookmarkedResource;
  alt: string;
  className?: string;
  overlay?: React.ReactNode;
};

export function ResourceImage({
  resource,
  alt,
  className,
  overlay,
}: ResourceImageProps) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const sources = useMemo(() => {
    const streetViewUrl = buildStreetViewImageUrl(
      resource.coordinates?.latitude,
      resource.coordinates?.longitude,
    );
    return [streetViewUrl, resource.primaryImageUrl, ...resource.images].filter(
      (value): value is string => Boolean(value),
    );
  }, [resource.coordinates?.latitude, resource.coordinates?.longitude, resource.images, resource.primaryImageUrl]);

  const activeSource = sources.find((source) => !failedSources.includes(source));

  if (!activeSource) {
    return (
      <div
        className={cn(
          'relative flex h-full min-h-32 items-end overflow-hidden rounded-[24px] bg-gradient-to-br from-mist via-card to-amber/25 p-4',
          className,
        )}
      >
        <div className="absolute inset-0 bg-dashboard-grid bg-[size:36px_36px] opacity-40" />
        <div className="relative flex items-center gap-3 rounded-full bg-white/85 px-4 py-2 text-sm font-medium text-ink shadow-soft">
          <MapPinned className="h-4 w-4 text-pine" />
          <span>Image unavailable</span>
        </div>
        {overlay ? <div className="absolute inset-x-0 bottom-0 p-4">{overlay}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-[24px]', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeSource}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailedSources((current) => [...current, activeSource])}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/65 to-transparent" />
      {overlay ? <div className="absolute inset-x-0 bottom-0 p-4">{overlay}</div> : null}
    </div>
  );
}
