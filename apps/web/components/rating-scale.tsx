'use client';

const SCALE = [
  { value: 5, label: 'Excellent' },
  { value: 4, label: 'Very Good' },
  { value: 3, label: 'Good' },
  { value: 2, label: 'Fair' },
  { value: 1, label: 'Poor' },
];

/** Legend for the 5–1 rating scale, shown once above a list of RatingRows. */
export function RatingScaleLegend() {
  return (
    <p className="text-xs text-subtle">
      Scale:{' '}
      {SCALE.map((s, i) => (
        <span key={s.value}>
          <span className="font-medium text-body">{s.value}</span> – {s.label}
          {i < SCALE.length - 1 ? ' | ' : ''}
        </span>
      ))}
    </p>
  );
}

/** One rated parameter: a label plus five numbered buttons, 5 down to 1. */
export function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-body">{label}</span>
      <div className="flex gap-1.5">
        {SCALE.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            title={s.label}
            aria-label={`${s.label} (${s.value})`}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
              value === s.value
                ? 'bg-primary-600 text-white'
                : 'bg-app text-subtle hover:bg-primary-50 hover:text-primary-600'
            }`}
          >
            {s.value}
          </button>
        ))}
      </div>
    </div>
  );
}
