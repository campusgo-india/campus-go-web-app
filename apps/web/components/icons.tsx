// Minimal hand-authored outline icons (20x20, 1.8px stroke) used to give the
// placement funnel / stat tiles a formal visual anchor without pulling in an
// icon library. Keep new additions to this same weight/style.

type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Total applications submitted. */
export function IconBriefcase({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

/** Applied, interview rounds still in progress. */
export function IconClockProgress({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

/** Interviews scheduled / upcoming. */
export function IconCalendarCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

/** Selected for a role. */
export function IconCheckCircle({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

/** Application did not proceed. */
export function IconXCircle({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </svg>
  );
}

/** Application withdrawn by the student. */
export function IconUndo({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M9 14l-5-4 5-4" />
      <path d="M4 10h10a6 6 0 0 1 0 12h-2" />
    </svg>
  );
}
