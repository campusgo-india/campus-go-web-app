'use client';

import { useEffect, useState } from 'react';
import { Button, Card, SectionCard } from '@campusgo/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import {
  createMySchool,
  deleteMySchool,
  listMySchools,
  updateMySchool,
  type CollegeSchool,
} from '../../../../lib/courses';

const parseProgrammes = (raw: string): string[] =>
  raw
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);

export default function SchoolsSettingsPage() {
  const confirm = useConfirm();
  const [schools, setSchools] = useState<CollegeSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setSchools(await listMySchools());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(c: CollegeSchool) {
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      message:
        'Students and forms that already reference this school/programme keep their existing values — only the dropdown option is removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(c.id);
    setError(null);
    try {
      await deleteMySchool(c.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Schools &amp; programmes</h1>
          <p className="text-sm text-subtle">
            {schools.length} school{schools.length === 1 ? '' : 's'} · populates the School/Programme
            dropdowns on Students, Alumni and Team forms
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? 'outline' : 'primary'}>
          {showForm ? 'Cancel' : 'Add school'}
        </Button>
      </header>

      {showForm && (
        <NewSchoolForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <SectionCard flush>
        {loading ? (
          <p className="p-5 text-sm text-subtle">Loading…</p>
        ) : schools.length === 0 ? (
          <p className="p-5 text-sm text-subtle">
            No schools yet. Add one so it appears in School/Programme dropdowns.
          </p>
        ) : (
          <ul>
            {schools.map((c) =>
              editingId === c.id ? (
                <li key={c.id} className="border-b border-border p-5 last:border-0">
                  <EditSchoolForm
                    school={c}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      load();
                    }}
                  />
                </li>
              ) : (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-4 border-b border-border p-5 last:border-0"
                >
                  <div>
                    <p className="font-medium text-strong">{c.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.programmes.length === 0 ? (
                        <span className="text-xs text-subtle">
                          No sub-programmes — the school name itself is used as the programme.
                        </span>
                      ) : (
                        c.programmes.map((b) => (
                          <span
                            key={b}
                            className="rounded-pill bg-app px-2.5 py-0.5 text-xs font-medium text-body"
                          >
                            {b}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => setEditingId(c.id)}
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      disabled={busyId === c.id}
                      className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                    >
                      {busyId === c.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function NewSchoolForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [programmes, setProgrammes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError('School name is required.');
      return;
    }
    setSaving(true);
    try {
      await createMySchool({ name: name.trim(), programmes: parseProgrammes(programmes) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add school');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <p className="text-sm font-semibold text-strong">Add a school</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="School name *">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MBA" />
        </Field>
        <Field label="Programmes (comma-separated)">
          <input
            className={inputCls}
            value={programmes}
            onChange={(e) => setProgrammes(e.target.value)}
            placeholder="e.g. CSE, ECE, Mechanical — leave blank if the school has none"
          />
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} disabled={saving}>
        {saving ? 'Adding…' : 'Add school'}
      </Button>
    </Card>
  );
}

function EditSchoolForm({
  school,
  onCancel,
  onSaved,
}: {
  school: CollegeSchool;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(school.name);
  const [programmes, setProgrammes] = useState(school.programmes.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError('School name is required.');
      return;
    }
    setSaving(true);
    try {
      await updateMySchool(school.id, { name: name.trim(), programmes: parseProgrammes(programmes) });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="School name *">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Programmes (comma-separated)">
          <input
            className={inputCls}
            value={programmes}
            onChange={(e) => setProgrammes(e.target.value)}
            placeholder="Leave blank if the school has none"
          />
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}
