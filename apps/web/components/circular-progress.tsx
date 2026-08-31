'use client';

import { useId } from 'react';

/** SVG ring meter — the reference app's "98% Success" progress-ring pattern.
 * Center content (usually a big number) is passed as children, absolutely
 * centered over the ring. */
export function CircularProgress({
  value,
  size = 104,
  strokeWidth = 10,
  trackClassName = 'text-app',
  gradientFrom = '#5B8DEF',
  gradientTo = '#1F3F94',
  children,
}: {
  /** 0–100. Clamped. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Tailwind text-color class for the unfilled track. */
  trackClassName?: string;
  /** Stroke gradient stops — defaults to the brand blue. */
  gradientFrom?: string;
  gradientTo?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  // Unique per instance — a shared id would make every ring on the page
  // paint the first instance's gradient once more than one is mounted.
  const gradientId = `circular-progress-${useId()}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
