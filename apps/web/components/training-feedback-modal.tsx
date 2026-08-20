'use client';

import { useEffect, useState } from 'react';
import { Button } from '@campusgo/ui';
import { useSession } from '../lib/session';
import { getPendingFeedback, submitFeedback, type PendingFeedback } from '../lib/training';

const QUESTIONS: Array<{ key: 'contentQuality' | 'trainerDelivery' | 'relevanceToPlacement'; label: string }> = [
  { key: 'contentQuality', label: 'Content Quality' },
  { key: 'trainerDelivery', label: 'Trainer Delivery' },
  { key: 'relevanceToPlacement', label: 'Relevance to Placement' },
];

/**
 * Post-training rating pop-up. Checks once per mount for the earliest
 * COMPLETED session the student attended but hasn't rated yet, and blocks
 * the shell with a 3-question 1–5 star card until submitted or dismissed.
 */
export function TrainingFeedbackModal() {
  const { user, loading } = useSession();
  const [pending, setPending] = useState<PendingFeedback | null>(null);
  const [ratings, setRatings] = useState({ contentQuality: 0, trainerDelivery: 0, relevanceToPlacement: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    getPendingFeedback()
      .then(setPending)
      .catch(() => {
        /* best-effort; a failed check just skips the pop-up this load */
      });
  }, [loading, user]);

  if (!pending || dismissed) return null;

  const allRated = QUESTIONS.every((q) => ratings[q.key] > 0);

  async function onSubmit() {
    if (!pending || !allRated) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        sessionId: pending.sessionId,
        contentQuality: ratings.contentQuality,
        trainerDelivery: ratings.trainerDelivery,
        relevanceToPlacement: ratings.relevanceToPlacement,
      });
      setPending(null);
    } catch {
      setDismissed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-6 shadow-nav sm:rounded-2xl">
        <div>
          <p className="text-xs text-subtle">How was</p>
          <h2 className="text-lg font-semibold text-strong">{pending.title}?</h2>
          {pending.trainerName && <p className="text-xs text-subtle">Trainer: {pending.trainerName}</p>}
        </div>

        <div className="space-y-4">
          {QUESTIONS.map((q) => (
            <div key={q.key} className="space-y-1.5">
              <p className="text-sm font-medium text-body">{q.label}</p>
              <StarRow value={ratings[q.key] ?? 0} onChange={(v) => setRatings((r) => ({ ...r, [q.key]: v }))} />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            Later
          </Button>
          <Button className="flex-1" onClick={onSubmit} disabled={!allRated || submitting}>
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="p-0.5"
        >
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      strokeLinejoin="round"
      className={filled ? 'h-7 w-7 fill-primary-500 stroke-primary-500' : 'h-7 w-7 fill-none stroke-subtle'}
    >
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
    </svg>
  );
}
