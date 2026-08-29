import * as React from 'react';
import { cn } from './cn';

export type StatGradient = 'primary' | 'sunset' | 'ocean' | 'violet' | 'none';
export type StatTint = 'lavender' | 'mint' | 'cream' | 'rose';
export type StatSize = 'md' | 'sm';

const GRADIENT: Record<StatGradient, string> = {
  primary: 'bg-gradient-primary text-white',
  sunset: 'bg-gradient-sunset text-white',
  ocean: 'bg-gradient-ocean text-white',
  violet: 'bg-gradient-violet text-white',
  none: 'bg-card text-strong shadow-card',
};

const TINT_BG: Record<StatTint, string> = {
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  cream: 'bg-tint-cream',
  rose: 'bg-tint-rose',
};

const TINT_FG: Record<StatTint, string> = {
  lavender: 'text-tint-lavender-fg',
  mint: 'text-tint-mint-fg',
  cream: 'text-tint-cream-fg',
  rose: 'text-tint-rose-fg',
};

const SIZE: Record<StatSize, { pad: string; value: string; label: string; icon: string }> = {
  md: { pad: 'p-5', value: 'mt-3 text-3xl', label: 'text-sm', icon: 'h-8 w-8' },
  sm: { pad: 'p-3.5', value: 'mt-1 text-xl', label: 'text-xs', icon: 'h-6 w-6' },
};

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  /** Small caption under the value, e.g. "Avg. Completed". */
  hint?: string;
  /** Optional leading icon / glyph node. */
  icon?: React.ReactNode;
  gradient?: StatGradient;
  /**
   * Soft pastel background with a matching coloured value — a quieter
   * alternative to `gradient` for a secondary row of smaller metric tiles.
   * Ignored when `gradient` is also set.
   */
  tint?: StatTint;
  /** Compact padding/type for a dense row of secondary metrics. Defaults to `md`. */
  size?: StatSize;
}

/**
 * Headline metric tile. Gradient variants render white text on a coloured
 * gradient (the reference's "83% / 56%" cards); `tint` renders a soft pastel
 * card with a coloured value for a lighter-weight secondary stat; `none`
 * (the default, with no `tint`) is a plain white card.
 */
export const StatTile = ({
  label,
  value,
  hint,
  icon,
  gradient = 'none',
  tint,
  size = 'md',
  className,
  ...props
}: StatTileProps) => {
  const onColor = gradient !== 'none';
  const s = SIZE[size];
  const bg = onColor ? GRADIENT[gradient] : tint ? TINT_BG[tint] : GRADIENT.none;
  const valueColor = onColor ? 'text-white' : tint ? TINT_FG[tint] : 'text-strong';
  return (
    <div className={cn('rounded-card', s.pad, bg, className)} {...props}>
      <div className="flex items-start justify-between">
        <p className={cn(s.label, 'font-medium', onColor ? 'text-white/85' : 'text-subtle')}>
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              'flex items-center justify-center rounded-pill',
              s.icon,
              onColor ? 'bg-white/20 text-white' : tint ? cn('bg-white/60', TINT_FG[tint]) : 'bg-primary-50 text-primary-600',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cn(s.value, 'font-bold tracking-tight', valueColor)}>{value}</p>
      {hint && (
        <p className={cn('mt-1 text-xs', onColor ? 'text-white/80' : 'text-subtle')}>{hint}</p>
      )}
    </div>
  );
};
