import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badgeVariants = cva('inline-flex items-center rounded-full font-medium', {
  variants: {
    tint: {
      lavender: 'bg-tint-lavender text-tint-lavender-fg',
      mint: 'bg-tint-mint text-tint-mint-fg',
      cream: 'bg-tint-cream text-tint-cream-fg',
      rose: 'bg-tint-rose text-tint-rose-fg',
      accent: 'bg-tint-accent text-tint-accent-fg',
      primary: 'bg-primary-50 text-primary-700',
      // Literal status semantics (not brand pastels) — for a "done/pending/
      // failed" reading at a glance: green/amber/red, e.g. an application's
      // outcome bucket rather than its exact stage.
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      danger: 'bg-danger/15 text-danger',
    },
    size: {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-3 py-1 text-xs',
    },
  },
  defaultVariants: { tint: 'primary', size: 'md' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, tint, size, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ tint, size }), className)} {...props} />
);
