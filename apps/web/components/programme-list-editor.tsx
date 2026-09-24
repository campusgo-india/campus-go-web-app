'use client';

import { useState } from 'react';

export interface ProgrammeRow {
  id: string;
  /** The programme's existing name in the catalog, or null for a newly added row. */
  original: string | null;
  value: string;
}

let seq = 0;
const newId = () => `prog_${Date.now()}_${seq++}`;

/** Seeds one row per existing programme, so edits can be told apart from adds/removes. */
export function initProgrammeRows(programmes: string[]): ProgrammeRow[] {
  return programmes.map((p) => ({ id: newId(), original: p, value: p }));
}

/**
 * From the current rows: the final programme list (trimmed, deduped, blanks
 * and removed rows dropped) plus a { old: new } rename map for rows that
 * still exist but whose text changed — everything a school-catalog PATCH
 * needs to cascade a rename instead of orphaning students/job eligibility
 * that reference the old name.
 */
export function diffProgrammeRows(rows: ProgrammeRow[]): {
  programmes: string[];
  renames: Record<string, string>;
} {
  const programmes: string[] = [];
  const renames: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row.value.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    programmes.push(value);
    if (row.original && row.original !== value) renames[row.original] = value;
  }
  return { programmes, renames };
}

/**
 * One row per programme, each independently editable/removable, plus an
 * "add" field — replaces a single comma-separated text box so a rename of
 * one entry is unambiguous (see diffProgrammeRows) instead of looking like a
 * remove-and-add the server can't safely reconcile.
 */
export function ProgrammeListEditor({
  rows,
  onChange,
  inputClassName,
}: {
  rows: ProgrammeRow[];
  onChange: (rows: ProgrammeRow[]) => void;
  inputClassName?: string;
}) {
  const [draft, setDraft] = useState('');
  const cls =
    inputClassName ??
    'h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

  function addProgramme() {
    const value = draft.trim();
    if (!value) return;
    onChange([...rows, { id: newId(), original: null, value }]);
    setDraft('');
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-subtle">
        Edit a name to rename it — students already using it move with it automatically. Remove
        only takes it out of this list; students who already have it keep it unchanged.
      </p>
      {rows.length === 0 && (
        <p className="text-xs text-subtle">
          No sub-programmes — the school name itself is used as the programme.
        </p>
      )}
      {rows.map((row) => {
        const trimmed = row.value.trim();
        const renamed = !!row.original && trimmed !== '' && row.original !== trimmed;
        return (
          <div key={row.id} className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <input
                className={cls}
                value={row.value}
                onChange={(e) =>
                  onChange(rows.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)))
                }
                placeholder="e.g. CSE"
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                className="shrink-0 text-xs font-medium text-danger hover:underline"
                aria-label={`Remove ${row.value || 'programme'}`}
              >
                Remove
              </button>
            </div>
            {renamed && (
              <p className="pl-0.5 text-xs text-primary-600">
                Will rename &ldquo;{row.original}&rdquo; → &ldquo;{trimmed}&rdquo; for every student who has it.
              </p>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-1.5 border-t border-dashed border-border pt-1.5">
        <input
          className={cls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addProgramme();
            }
          }}
          placeholder="Add a new programme…"
        />
        <button
          type="button"
          onClick={addProgramme}
          disabled={!draft.trim()}
          className="shrink-0 text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
