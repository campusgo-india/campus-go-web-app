'use client';

import { useState } from 'react';
import { roundTypeLabel } from '../lib/rounds';
import type { Application } from '../lib/applications';

type StepState = 'done' | 'current' | 'rejected' | 'upcoming';

interface Step {
  label: string;
  sub?: string;
  detail?: string | null;
  typeLabel?: string | null;
  when?: string | null;
  state: StepState;
}

function buildSteps(app: Application): Step[] {
  const steps: Step[] = [
    { label: 'Applied', sub: 'Application submitted', when: app.appliedAt, state: 'done' },
  ];

  for (const r of app.rounds) {
    let state: StepState;
    let sub: string;
    if (r.outcome === 'ADVANCED') {
      state = 'done';
      sub = 'Cleared this round';
    } else if (r.outcome === 'REJECTED') {
      state = 'rejected';
      sub = 'Not selected';
    } else {
      state = 'current';
      sub = r.roundStatus === 'OPEN' ? 'In progress' : 'Awaiting result';
    }
    steps.push({
      label: r.title,
      sub,
      detail: r.description,
      typeLabel: r.roundType ? roundTypeLabel(r.roundType) : null,
      when: r.scheduledAt,
      state,
    });
  }

  const someRejected = app.rounds.some((r) => r.outcome === 'REJECTED');
  if (app.status === 'SELECTED')
    steps.push({ label: 'Selected', sub: 'You got the offer 🎉', state: 'done' });
  else if (app.status === 'WITHDRAWN')
    steps.push({ label: 'Withdrawn', sub: 'You withdrew', state: 'rejected' });
  else if (app.status === 'REJECTED') {
    if (!someRejected)
      steps.push({ label: 'Not selected', sub: 'Better luck next time', state: 'rejected' });
  } else steps.push({ label: 'Result', sub: 'Pending decision', state: 'upcoming' });

  return steps;
}

/** Delivery-tracking style vertical timeline for an application. */
export function ApplicationTimeline({ app }: { app: Application }) {
  const steps = buildSteps(app);
  return (
    <ol>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={i} className="animate-rise flex gap-3" style={{ animationDelay: `${i * 60}ms` }}>
            {/* date */}
            <div className="w-16 shrink-0 pt-0.5 text-right">
              <p className="text-xs font-semibold text-strong">{s.when ? fmtDate(s.when) : ''}</p>
            </div>

            {/* dot + connector */}
            <div className="flex flex-col items-center">
              <Dot state={s.state} />
              {!last && (
                <span
                  className={`w-0.5 flex-1 ${s.state === 'done' ? 'bg-success/40' : 'bg-border'}`}
                />
              )}
            </div>

            {/* content */}
            <div className={`min-w-0 flex-1 pb-6 ${last ? 'pb-0' : ''}`}>
              <p className={`text-sm font-semibold ${labelColor(s.state)}`}>{s.label}</p>
              {s.typeLabel && (
                <span className="inline-block rounded bg-app px-1.5 py-0.5 text-[10px] font-medium text-subtle">
                  {s.typeLabel}
                </span>
              )}
              {s.sub && <p className="text-xs text-subtle">{s.sub}</p>}
              {s.detail && <RoundNote text={s.detail} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** A round's free-text note (venue/time/instructions the officer typed) —
 * collapsed to 2 lines by default with a toggle, instead of dumping the
 * whole raw paragraph into the timeline. */
function RoundNote({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 90;
  return (
    <div className="mt-1.5 rounded-lg bg-app p-2.5">
      <p className={`text-xs leading-relaxed text-body ${expanded || !long ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      {long && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-[11px] font-semibold text-primary-600"
        >
          {expanded ? 'Show less' : 'View full message'}
        </button>
      )}
    </div>
  );
}

function Dot({ state }: { state: StepState }) {
  const base = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full';
  if (state === 'done')
    return (
      <span className={`${base} bg-success text-white`}>
        <CheckGlyph />
      </span>
    );
  // Muted, not alarm-red — a rejection is a normal outcome to show, not a
  // punitive one. Soft rose fill + red glyph reads as "closed", not "error".
  if (state === 'rejected')
    return (
      <span className={`${base} bg-tint-rose text-tint-rose-fg`}>
        <CrossGlyph />
      </span>
    );
  if (state === 'current')
    return <span className={`${base} animate-pop bg-primary-500 ring-4 ring-primary-500/20`} />;
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border bg-white" />;
}

// Proper stroke-icon glyphs, matching the app's icon style everywhere else —
// a plain "✓"/"✕" text character renders in the OS's default glyph weight,
// which visibly clashes with the rest of the UI's custom iconography.
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-2.5 w-2.5">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CrossGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-2.5 w-2.5">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function labelColor(state: StepState): string {
  if (state === 'rejected') return 'text-tint-rose-fg';
  if (state === 'current') return 'text-primary-700';
  if (state === 'upcoming') return 'text-subtle';
  return 'text-strong';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}
