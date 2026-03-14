/**
 * Demographics Pie Chart Component
 *
 * Displays ethnicity breakdown as a simple SVG pie chart.
 * No external dependencies required.
 */

import { useMemo } from 'react';

/**
 * @param {Object} props
 * @param {Array} props.data - Array of { label, value, color }
 * @param {number} props.size - Chart diameter in pixels (default 120)
 * @param {boolean} props.showLegend - Show legend below chart (default true)
 * @param {string} props.title - Optional title above chart
 */
export default function DemographicsPieChart({
  data = [],
  size = 120,
  showLegend = true,
  title = null,
}) {
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

      // Calculate arc path
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
      <div style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
        No demographic data available
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-block' }}>
      {title && (
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            textAlign: 'center',
            color: '#2D3748',
          }}
        >
          {title}
        </div>
      )}

      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} stroke="#fff" strokeWidth="1">
            <title>
              {seg.label}: {seg.value}%
            </title>
          </path>
        ))}
      </svg>

      {showLegend && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px',
            fontSize: '11px',
          }}
        >
          {segments.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: seg.color,
                  borderRadius: '2px',
                }}
              />
              <span style={{ color: '#4A5568' }}>
                {seg.label} ({seg.percentage}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Create pie data from ethnicity_pct object
 */
export function createEthnicityPieData(ethnicity_pct) {
  if (!ethnicity_pct) return [];

  const colors = {
    white: '#4299E1',
    black: '#48BB78',
    asian: '#ED8936',
    hispanic: '#9F7AEA',
    other: '#A0AEC0',
  };

  const data = [];
  const eth = ethnicity_pct;

  if (eth.white > 0) data.push({ label: 'White', value: eth.white, color: colors.white });
  if (eth.black > 0) data.push({ label: 'Black', value: eth.black, color: colors.black });
  if (eth.asian > 0) data.push({ label: 'Asian', value: eth.asian, color: colors.asian });
  if (eth.hispanic > 0) data.push({ label: 'Hispanic', value: eth.hispanic, color: colors.hispanic });

  const sum = (eth.white || 0) + (eth.black || 0) + (eth.asian || 0) + (eth.hispanic || 0);
  if (sum < 100) {
    data.push({ label: 'Other', value: Math.round((100 - sum) * 10) / 10, color: colors.other });
  }

  return data;
}
