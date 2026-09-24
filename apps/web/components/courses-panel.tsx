'use client';

import { useEffect, useState } from 'react';
import { Button } from '@campusgo/ui';
import {
  createCollegeSchool,
  deleteCollegeSchool,
  listCollegeSchools,
  updateCollegeSchool,
  type CollegeSchool,
  type DegreeLevel,
} from '../lib/courses';
import {
  ProgrammeListEditor,
  diffProgrammeRows,
  initProgrammeRows,
  type ProgrammeRow,
} from './programme-list-editor';

const parseList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const inputCls =
  'h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

/** Platform Admin: manage a single college's school catalog (API-backed). */
export function SchoolsPanel({ collegeId }: { collegeId: string }) {
  const [schools, setSchools] = useState<CollegeSchool[]>([]);
  const [name, setName] = useState('');
  const [programmes, setProgrammes] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>('UG');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setSchools(await listCollegeSchools(collegeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schools');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId]);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCollegeSchool(collegeId, {
        name: name.trim(),
        programmes: parseList(programmes),
        degreeLevel,
      });
      setName('');
      setProgrammes('');
      setDegreeLevel('UG');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add school');
    } finally {
      setBusy(false);
    }
  }

  async function save(
    id: string,
    input: {
      name: string;
      degreeLevel: DegreeLevel;
      programmes: string[];
      programmeRenames: Record<string, string>;
    },
  ) {
    await updateCollegeSchool(collegeId, id, input);
    await load();
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deleteCollegeSchool(collegeId, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-app/40 p-4">
      <p className="text-sm font-semibold text-strong">School catalog</p>
      <p className="text-xs text-subtle">
        Edit a school or programme any time — renames and Level changes carry over to every
        student already enrolled, automatically. Nothing to re-import.
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}

      {schools.length === 0 ? (
        <p className="text-xs text-subtle">No schools yet. Add the college's schools below.</p>
      ) : (
        <div className="space-y-2">
          {schools.map((c) => (
            <SchoolRow key={c.id} school={c} onSave={save} onRemove={remove} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-subtle">School/Department</span>
          <input
            className={`${inputCls} w-40`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="B.Tech"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-subtle">Level</span>
          <select
            className={`${inputCls} w-36`}
            value={degreeLevel}
            onChange={(e) => setDegreeLevel(e.target.value as DegreeLevel)}
          >
            <option value="UG">Undergraduate</option>
            <option value="PG">Postgraduate</option>
          </select>
        </label>
        <label className="flex-1 space-y-1">
          <span className="text-xs font-medium text-subtle">Programmes (comma-separated)</span>
          <input
            className={inputCls}
            value={programmes}
            onChange={(e) => setProgrammes(e.target.value)}
            placeholder="CSE, ECE, Mechanical (leave blank if none)"
          />
        </label>
        <Button size="sm" onClick={add} loading={busy} disabled={!name.trim()}>
          Add school
        </Button>
      </div>
    </div>
  );
}

function SchoolRow({
  school,
  onSave,
  onRemove,
}: {
  school: CollegeSchool;
  onSave: (
    id: string,
    input: {
      name: string;
      degreeLevel: DegreeLevel;
      programmes: string[];
      programmeRenames: Record<string, string>;
    },
  ) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(school.name);
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>(school.degreeLevel);
  const [programmeRows, setProgrammeRows] = useState<ProgrammeRow[]>(() =>
    initProgrammeRows(school.programmes),
  );
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  function startEdit() {
    setName(school.name);
    setDegreeLevel(school.degreeLevel);
    setProgrammeRows(initProgrammeRows(school.programmes));
    setRowError(null);
    setEditing(true);
  }

  async function submit() {
    if (!name.trim()) {
      setRowError('School name is required.');
      return;
    }
    setSaving(true);
    setRowError(null);
    try {
      const { programmes, renames } = diffProgrammeRows(programmeRows);
      await onSave(school.id, {
        name: name.trim(),
        degreeLevel,
        programmes,
        programmeRenames: renames,
      });
      setEditing(false);
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 text-sm">
        <span className="font-medium text-strong">{school.name}</span>
        <span className="rounded-pill bg-app px-2 py-0.5 text-[10px] font-medium text-subtle">
          {school.degreeLevel === 'PG' ? 'PG' : 'UG'}
        </span>
        <span className="flex-1 text-xs text-subtle">
          {school.programmes.length ? school.programmes.join(' · ') : 'no programmes'}
        </span>
        <button onClick={startEdit} className="text-xs font-medium text-primary-600 hover:underline">
          Edit
        </button>
        <button
          onClick={() => onRemove(school.id)}
          className="text-xs font-medium text-danger hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== '' && trimmedName !== school.name;
  const levelChanged = degreeLevel !== school.degreeLevel;

  return (
    <div className="space-y-2 rounded-md border border-primary-400/40 bg-white px-3 py-2 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-subtle">School/Department</span>
          <input className={`${inputCls} w-40`} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-subtle">Level</span>
          <select
            className={`${inputCls} w-36`}
            value={degreeLevel}
            onChange={(e) => setDegreeLevel(e.target.value as DegreeLevel)}
          >
            <option value="UG">Undergraduate</option>
            <option value="PG">Postgraduate</option>
          </select>
        </label>
      </div>
      {(nameChanged || levelChanged) && (
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-primary-600">
          {nameChanged && (
            <li>
              Will rename &ldquo;{school.name}&rdquo; → &ldquo;{trimmedName}&rdquo; for every enrolled student.
            </li>
          )}
          {levelChanged && (
            <li>
              Will change Level to {degreeLevel === 'PG' ? 'Postgraduate' : 'Undergraduate'} for
              every enrolled student.
            </li>
          )}
        </ul>
      )}
      <div className="max-w-sm space-y-1">
        <span className="text-xs font-medium text-subtle">Programmes</span>
        <ProgrammeListEditor rows={programmeRows} onChange={setProgrammeRows} />
      </div>
      {rowError && <p className="text-xs text-danger">{rowError}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} loading={saving}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
