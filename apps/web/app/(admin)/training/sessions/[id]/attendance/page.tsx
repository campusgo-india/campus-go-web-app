'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Switch } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../../components/page-skeleton';
import {
  importAttendance,
  listAttendance,
  markAttendance,
  type AttendanceRow,
  type ImportResult,
} from '../../../../../../lib/training';

export default function SessionAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      setRows(await listAttendance(id));
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
  // individually — faster than toggling every row by hand.
  function markAllPresent() {
    setPending(Object.fromEntries(rows.map((r) => [r.studentId, true])));
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

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Mark attendance</h1>
        <Link href="/training/sessions" className="text-sm text-primary-600 hover:underline">
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
        <button onClick={markAllPresent} className="text-sm font-medium text-primary-600 hover:underline">
          Mark all present
        </button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase text-subtle">
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Present</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-body">{r.rollNumber}</td>
                  <td className="px-4 py-3 text-body">{r.fullName}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={effectivePresent(r)}
                      onCheckedChange={(checked) =>
                        setPending((p) => ({ ...p, [r.studentId]: checked }))
                      }
                      aria-label={`Mark ${r.fullName} present`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Button size="lg" onClick={saveAll} disabled={saving || Object.keys(pending).length === 0}>
        {saving ? 'Saving…' : `Save attendance${Object.keys(pending).length ? ` (${Object.keys(pending).length})` : ''}`}
      </Button>
    </div>
  );
}
