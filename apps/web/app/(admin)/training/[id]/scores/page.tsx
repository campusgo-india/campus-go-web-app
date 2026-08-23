'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../components/page-skeleton';
import {
  bulkEnterScores,
  getAssessment,
  importScores,
  listScores,
  PILLAR_LABEL,
  type Assessment,
  type ImportResult,
  type ScoreRow,
} from '../../../../../lib/training';

const PHASE_TINT: Record<string, 'lavender' | 'mint'> = { PRE: 'lavender', POST: 'mint' };

// A plain text field (not <input type="number">) so there's no native spin
// buttons or scroll-wheel-increments-the-value surprise — both are common
// sources of "how did this score change" confusion. inputMode="decimal"
// still brings up a numeric keyboard on mobile. Only digits and one decimal
// point are allowed; anything else (including "-") is dropped as typed.
function sanitizeMarksInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

// Clamps a finished entry into [0, maxMarks] once the officer leaves the
// field — clamping mid-keystroke corrupts multi-digit typing (a controlled
// number input rewritten on every change loses characters), so this only
// runs on blur.
function clampMarks(raw: string, maxMarks: number): string {
  if (raw === '') return '';
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  return String(Math.min(Math.max(n, 0), maxMarks));
}

export default function AssessmentScoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, s] = await Promise.all([getAssessment(id), listScores(id)]);
      setAssessment(a);
      setRows(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setImporting(true);
    try {
      const res = await importScores(id, file);
      setResult(res);
      setDrafts({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  // Batches every edited row into one submit, mirroring the Jobs pipeline's
  // "advance & close" bar — students are only emailed once, on submit.
  async function submitScores() {
    const updates = Object.entries(drafts)
      .map(([studentId, raw]) => ({
        studentId,
        marksObtained: Number(clampMarks(raw, assessment?.maxMarks ?? Infinity)),
      }))
      .filter((r) => !Number.isNaN(r.marksObtained));
    if (updates.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await bulkEnterScores(id, updates);
      setDrafts({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save scores');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !assessment) return <ListSkeleton />;

  const draftCount = Object.keys(drafts).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-strong">{assessment.name}</h1>
            <Badge tint={PHASE_TINT[assessment.phase]}>{assessment.phase}</Badge>
          </div>
          <p className="text-sm text-subtle">
            {PILLAR_LABEL[assessment.pillar]} · out of {assessment.maxMarks} marks
          </p>
        </div>
        <Link href="/training" className="shrink-0 text-sm text-primary-600 hover:underline">
          Back to assessments
        </Link>
      </div>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium text-strong">Bulk import</p>
        <p className="text-xs text-subtle">
          Columns: <b>Student Roll No / ID</b>, <b>Marks Obtained</b> (0–{assessment.maxMarks}). CSV
          or Excel (.xlsx).
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition ${
            dragOver ? 'border-primary-400 bg-primary-50' : 'border-border'
          }`}
        >
          <p className="text-sm text-subtle">Drag &amp; drop a CSV or Excel file here</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Choose file…'}
          </Button>
        </div>

        {result && (
          <div className="space-y-1 rounded-md bg-app p-3 text-sm">
            <p className="text-success">{result.updatedCount} scores updated</p>
            {result.errorCount > 0 && (
              <div className="space-y-1">
                <p className="text-danger">{result.errorCount} rows failed</p>
                <ul className="space-y-0.5 text-xs text-subtle">
                  {result.errors.map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <p className="mb-2 text-sm font-medium text-strong">Or enter manually</p>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Roll No</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Marks (0–{assessment.maxMarks})</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const draft = drafts[r.studentId];
                  const isDirty = draft !== undefined && draft !== String(r.marksObtained ?? '');
                  return (
                    <tr
                      key={r.studentId}
                      className={`border-b border-border last:border-0 ${isDirty ? 'bg-primary-50/40' : ''}`}
                    >
                      <td className="px-4 py-3 text-body">{r.rollNumber}</td>
                      <td className="px-4 py-3 text-body">{r.fullName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`h-9 w-24 rounded-md border bg-white px-2 text-sm outline-none focus:border-primary-400 ${
                              isDirty ? 'border-primary-400' : 'border-border'
                            }`}
                            value={draft ?? r.marksObtained ?? ''}
                            onChange={(e) =>
                              setDrafts((d) => ({
                                ...d,
                                [r.studentId]: sanitizeMarksInput(e.target.value),
                              }))
                            }
                            onBlur={(e) =>
                              setDrafts((d) => ({
                                ...d,
                                [r.studentId]: clampMarks(e.target.value, assessment.maxMarks),
                              }))
                            }
                          />
                          {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {draftCount > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-pill border border-border bg-white/95 p-2 pl-4 shadow-nav backdrop-blur">
          <span className="text-sm text-body">
            <span className="font-semibold text-strong">{draftCount}</span>{' '}
            {draftCount === 1 ? 'score' : 'scores'} to submit
          </span>
          <Button onClick={submitScores} loading={saving}>
            Submit scores
          </Button>
        </div>
      )}
    </div>
  );
}
