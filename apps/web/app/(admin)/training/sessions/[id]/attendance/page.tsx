'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../../components/page-skeleton';
import {
  getSession,
  importAttendance,
  listAttendance,
  markAttendance,
  PILLAR_LABEL,
  type AttendanceRow,
  type ImportResult,
  type TrainingSession,
} from '../../../../../../lib/training';

const fmt = (d: string) =>
  new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function SessionAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, a] = await Promise.all([getSession(id), listAttendance(id)]);
      setSession(s);
      setRows(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function effectivePresent(r: AttendanceRow) {
    return pending[r.studentId] ?? r.present ?? false;
  }

  // Mark everyone present in one click, then flip the odd absentee off
  // individually — faster than toggling every row by hand. Once everyone is
  // present, the same button flips to "mark all absent" so it can undo itself
  // instead of being a dead end.
  const allPresent = rows.length > 0 && rows.every((r) => effectivePresent(r));
  function toggleAll() {
    setPending(Object.fromEntries(rows.map((r) => [r.studentId, !allPresent])));
  }

  async function saveAll() {
    if (Object.keys(pending).length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const updates = Object.entries(pending).map(([studentId, present]) => ({ studentId, present }));
      await markAttendance(id, updates);
      setPending({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save attendance');
    } finally {
      setSaving(false);
    }
  }

  async function onFile(file: File) {
    setError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const res = await importAttendance(id, file);
      setImportResult(res);
      setPending({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  if (loading || !session) return <ListSkeleton />;

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-strong">{session.title}</h1>
          <p className="text-sm text-subtle">
            {fmt(session.startsAt)} – {fmt(session.endsAt)}
            {session.trainerName ? ` · ${session.trainerName}` : ''}
            {session.pillar ? ` · ${PILLAR_LABEL[session.pillar]}` : ''}
          </p>
        </div>
        <Link href="/training/sessions" className="shrink-0 text-sm text-primary-600 hover:underline">
          Back to sessions
        </Link>
      </div>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium text-strong">Bulk import</p>
        <p className="text-xs text-subtle">
          Columns: <b>Student Roll No / ID</b>, <b>Present</b> (yes/no, true/false, or 1/0). CSV or
          Excel (.xlsx).
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

        {importResult && (
          <div className="space-y-1 rounded-md bg-app p-3 text-sm">
            <p className="text-success">{importResult.updatedCount} marked</p>
            {importResult.errorCount > 0 && (
              <div className="space-y-1">
                <p className="text-danger">{importResult.errorCount} rows failed</p>
                <ul className="space-y-0.5 text-xs text-subtle">
                  {importResult.errors.map((e) => (
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

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-strong">Or mark manually</p>
        <button onClick={toggleAll} className="text-sm font-medium text-primary-600 hover:underline">
          {allPresent ? 'Mark all absent' : 'Mark all present'}
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Roll No</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                // Tri-state: unlike allPresent/toggleAll (which coalesce to a
                // boolean for the bulk action), an individual row that's never
                // been marked shows neither pill active rather than defaulting
                // to "Absent".
                const raw = pending[r.studentId] ?? r.present;
                const isDirty = pending[r.studentId] !== undefined;
                return (
                  <tr
                    key={r.studentId}
                    className={`border-b border-border last:border-0 ${isDirty ? 'bg-primary-50/40' : ''}`}
                  >
                    <td className="px-4 py-3 text-body">{r.rollNumber}</td>
                    <td className="px-4 py-3 text-body">{r.fullName}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPending((p) => ({ ...p, [r.studentId]: true }))}
                          className={`rounded-pill px-2.5 py-1 text-xs font-medium transition ${
                            raw === true
                              ? 'bg-success/15 text-success'
                              : 'bg-app text-subtle hover:bg-success/10 hover:text-success'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => setPending((p) => ({ ...p, [r.studentId]: false }))}
                          className={`rounded-pill px-2.5 py-1 text-xs font-medium transition ${
                            raw === false
                              ? 'bg-danger/15 text-danger'
                              : 'bg-app text-subtle hover:bg-danger/10 hover:text-danger'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {pendingCount > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-pill border border-border bg-white/95 p-2 pl-4 shadow-nav backdrop-blur">
          <span className="text-sm text-body">
            <span className="font-semibold text-strong">{pendingCount}</span> to save
          </span>
          <Button onClick={saveAll} loading={saving}>
            Save attendance
          </Button>
        </div>
      )}
    </div>
  );
}
