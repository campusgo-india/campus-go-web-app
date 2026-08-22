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

  async function saveProgrammes(id: string, value: string) {
    setError(null);
    try {
      await updateCollegeSchool(collegeId, id, { programmes: parseList(value) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    }
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
      {error && <p className="text-xs text-danger">{error}</p>}

      {schools.length === 0 ? (
        <p className="text-xs text-subtle">No schools yet. Add the college's schools below.</p>
      ) : (
        <div className="space-y-2">
          {schools.map((c) => (
            <SchoolRow key={c.id} school={c} onSave={saveProgrammes} onRemove={remove} />
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
  onSave: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(school.programmes.join(', '));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 text-sm">
      <span className="font-medium text-strong">{school.name}</span>
      <span className="rounded-pill bg-app px-2 py-0.5 text-[10px] font-medium text-subtle">
        {school.degreeLevel === 'PG' ? 'PG' : 'UG'}
      </span>
      {!editing ? (
        <>
          <span className="flex-1 text-xs text-subtle">
            {school.programmes.length ? school.programmes.join(' · ') : 'no programmes'}
          </span>
          <button
            onClick={() => {
              setValue(school.programmes.join(', '));
              setEditing(true);
            }}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            Edit programmes
          </button>
          <button
            onClick={() => onRemove(school.id)}
            className="text-xs font-medium text-danger hover:underline"
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <input
            className={`${inputCls} flex-1`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="CSE, ECE…"
          />
          <button
            onClick={() => {
              onSave(school.id, value);
              setEditing(false);
            }}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-subtle hover:underline">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
