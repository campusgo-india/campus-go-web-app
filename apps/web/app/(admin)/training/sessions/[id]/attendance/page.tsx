'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Switch } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../../components/page-skeleton';
import { listAttendance, markAttendance, type AttendanceRow } from '../../../../../../lib/training';

export default function SessionAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-strong">Mark attendance</h1>
        <Link href="/training/sessions" className="text-sm text-primary-600 hover:underline">
          Back to sessions
        </Link>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

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
