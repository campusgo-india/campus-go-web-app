'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../components/page-skeleton';
import {
  bulkEnterScores,
  importScores,
  listScores,
  type ImportResult,
  type ScoreRow,
} from '../../../../../lib/training';

export default function AssessmentScoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      setRows(await listScores(id));
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

  // Batches every edited row into one submit, mirroring the attendance page —
  // students are only emailed once, when the whole page is submitted.
  async function submitScores() {
    const updates = Object.entries(drafts)
      .map(([studentId, raw]) => ({ studentId, marksObtained: Number(raw) }))
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

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Enter scores</h1>
        <Link href="/training" className="text-sm text-primary-600 hover:underline">
          Back to assessments
        </Link>
      </div>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium text-strong">Bulk import</p>
        <p className="text-xs text-subtle">
          Columns: <b>Student Roll No / ID</b>, <b>Marks Obtained</b>. CSV or Excel (.xlsx).
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

        {error && <p className="text-sm text-danger">{error}</p>}
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase text-subtle">
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Marks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-body">{r.rollNumber}</td>
                  <td className="px-4 py-3 text-body">{r.fullName}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="h-9 w-24 rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-primary-400"
                      value={drafts[r.studentId] ?? r.marksObtained ?? ''}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [r.studentId]: e.target.value }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Button size="lg" onClick={submitScores} disabled={saving || Object.keys(drafts).length === 0}>
        {saving
          ? 'Submitting…'
          : `Submit scores${Object.keys(drafts).length ? ` (${Object.keys(drafts).length})` : ''}`}
      </Button>
    </div>
  );
}
