'use client';

import { useState } from 'react';
import { Button } from '@campusgo/ui';

/**
 * Pick students in bulk by pasting their register numbers (one per line, or
 * separated by commas / spaces) instead of ticking rows one at a time — for
 * drives with hundreds of applicants. Matching is case-insensitive; numbers
 * that don't match anyone in the list are reported back so typos are visible.
 */
export function PasteRegNumbers({
  candidates,
  picked,
  setPicked,
  actionLabel = 'Select these students',
}: {
  candidates: Array<{ id: string; rollNumber: string }>;
  picked: Set<string>;
  setPicked: (s: Set<string>) => void;
  actionLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ matched: number; missing: string[] } | null>(null);

  function apply() {
    const tokens = Array.from(
      new Set(
        text
          .split(/[\s,;]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );
    const byRoll = new Map(candidates.map((c) => [c.rollNumber.trim().toLowerCase(), c.id]));
    const next = new Set(picked);
    const missing: string[] = [];
    let matched = 0;
    for (const t of tokens) {
      const id = byRoll.get(t.toLowerCase());
      if (id) {
        next.add(id);
        matched++;
      } else {
        missing.push(t);
      }
    }
    setPicked(next);
    setResult({ matched, missing });
    if (missing.length === 0) setText('');
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Paste register numbers
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-strong">Paste register numbers</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-subtle hover:text-body"
        >
          Close
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={'21CS001\n21CS014\n21CS027'}
        className="w-full rounded-md border border-border bg-white px-3 py-2 font-mono text-sm outline-none focus:border-primary-400"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={apply} disabled={!text.trim()}>
          {actionLabel}
        </Button>
        {result && (
          <span className="text-xs text-body">
            <span className="font-semibold text-success">{result.matched} matched</span>
            {result.missing.length > 0 && (
              <span className="text-danger">
                {' '}
                · {result.missing.length} not found: {result.missing.slice(0, 8).join(', ')}
                {result.missing.length > 8 ? '…' : ''}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
