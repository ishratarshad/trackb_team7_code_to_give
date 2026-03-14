'use client';

import { useMemo } from 'react';

export interface PieDataItem {
  label: string;
  value: number;
  color: string;
}

interface DemographicsPieChartProps {
  data: PieDataItem[];
  size?: number;
  showLegend?: boolean;
  title?: string | null;
}

export function DemographicsPieChart({
  data = [],
  size = 120,
  showLegend = true,
  title = null,
}: DemographicsPieChartProps) {
  const segments = useMemo(() => {
    if (!data.length) return [];

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return [];

    let currentAngle = -90; // Start at top
    const radius = size / 2;
    const center = radius;

    return data.map((d) => {
      const percentage = d.value / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path =
        angle >= 360
          ? `M ${center},0 A ${radius},${radius} 0 1,1 ${center - 0.01},0 A ${radius},${radius} 0 1,1 ${center},0`
          : `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

      currentAngle = endAngle;

      return {
        ...d,
        percentage: Math.round(percentage * 100),
        path,
      };
    });
  }, [data, size]);

  if (!segments.length) {
    return (
      <div className="text-center text-slate/60 py-4 text-sm">
        No demographic data available
      </div>
    );
  }

  return (
    <div className="inline-block">
      {title && (
        <div className="text-sm font-semibold mb-2 text-center text-ink">
          {title}
        </div>
      )}

      <svg
        width={size}
        height={size}
        className="block mx-auto"
      >
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            stroke="#fff"
            strokeWidth="1"
          >
            <title>
              {seg.label}: {seg.value}%
            </title>
          </path>
        ))}
      </svg>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-slate">
                {seg.label} ({seg.percentage}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
