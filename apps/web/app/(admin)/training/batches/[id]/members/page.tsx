'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../../components/page-skeleton';
import { listBatchMembers, setBatchMembers, type BatchMemberRow } from '../../../../../../lib/training';

export default function BatchMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rows, setRows] = useState<BatchMemberRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listBatchMembers(id);
      setRows(data);
      setSelected(new Set(data.filter((r) => r.isMember).map((r) => r.studentId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q) ||
        r.programme.toLowerCase().includes(q),
    );
  }, [rows, search]);

  function toggle(studentId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await setBatchMembers(id, [...selected]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Manage students</h1>
          <p className="text-sm text-subtle">{selected.size} selected</p>
        </div>
        <Link href="/training/batches" className="text-sm text-primary-600 hover:underline">
          Back to batches
        </Link>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, roll no, or programme…"
        className="h-10 w-full max-w-sm rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase text-subtle">
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">School / Programme</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.studentId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.studentId)}
                      onChange={() => toggle(r.studentId)}
                      className="h-4 w-4 cursor-pointer accent-primary-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-body">{r.rollNumber}</td>
                  <td className="px-4 py-3 text-body">{r.fullName}</td>
                  <td className="px-4 py-3 text-body">
                    {r.school} / {r.programme}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Button size="lg" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : `Save membership (${selected.size})`}
      </Button>
    </div>
  );
}
