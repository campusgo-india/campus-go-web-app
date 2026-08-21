'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@campusgo/ui';
import { isValidPhone, normalizePhoneDigits } from '@campusgo/shared';
import { Breadcrumbs } from '../../../components/breadcrumbs';
import { BatchCards } from '../../../components/batch-cards';
import { ListSkeleton } from '../../../components/page-skeleton';
import { useConfirm } from '../../../components/confirm-provider';
import {
  createInternship,
  deleteInternship,
  employmentTypeLabel,
  EMPLOYMENT_TYPES,
  listInternships,
  updateInternship,
  type Internship,
  type InternshipInput,
} from '../../../lib/internships';
import { listStudents, type Student } from '../../../lib/students';

interface Year {
  key: string;
  year: number;
  items: Internship[];
}

interface School {
  key: string;
  year: number;
  school: string;
  items: Internship[];
}

type ViewState =
  | { mode: 'years' }
  | { mode: 'schools'; year: number }
  | { mode: 'table'; year: number; school: string };

/** Officer view: student-reported internships.
 * Drill-down: Years → Schools → Table. Officers can add one on a student's
 * behalf, edit any record to fine-tune it, or remove one — students still
 * self-report and manage their own from their side. */
export default function InternshipsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ mode: 'years' });
  const [editing, setEditing] = useState<Internship | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listInternships());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load internships');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(i: Internship) {
    const ok = await confirm({
      title: `Remove this internship record?`,
      message: `${i.role} at ${i.companyName}${i.studentName ? ` (${i.studentName})` : ''} will be permanently removed.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(i.id);
    setError(null);
    try {
      await deleteInternship(i.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove');
    } finally {
      setDeletingId(null);
    }
  }

  const years = useMemo<Year[]>(() => {
    const map = new Map<string, Year>();
    for (const i of items) {
      const year = i.graduationYear ?? 0;
      const key = String(year);
      if (!map.has(key)) map.set(key, { key, year, items: [] });
      map.get(key)!.items.push(i);
    }
    return [...map.values()].sort((a, b) => b.year - a.year);
  }, [items]);

  const schoolsForYear = useMemo<School[]>(() => {
    if (view.mode !== 'schools' && view.mode !== 'table') return [];
    const map = new Map<string, School>();
    for (const i of items) {
      if ((i.graduationYear ?? 0) !== view.year) continue;
      const school = i.studentSchool ?? 'Unknown';
      const key = `${view.year}|${school}`;
      if (!map.has(key)) map.set(key, { key, year: view.year, school, items: [] });
      map.get(key)!.items.push(i);
    }
    return [...map.values()].sort((a, b) => a.school.localeCompare(b.school));
  }, [items, view]);

  const tableItems = useMemo<Internship[]>(() => {
    if (view.mode !== 'table') return [];
    return items
      .filter(
        (i) =>
          (i.graduationYear ?? 0) === view.year && (i.studentSchool ?? 'Unknown') === view.school,
      )
      .sort((a, b) => (a.studentName ?? '').localeCompare(b.studentName ?? ''));
  }, [items, view]);

  const title = useMemo(() => {
    if (view.mode === 'years') return 'Internships';
    if (view.mode === 'schools') return `Internships · ${view.year}`;
    return `Internships · ${view.year} · ${view.school}`;
  }, [view]);

  const subtitle = useMemo(() => {
    if (view.mode === 'years') {
      return `Internships students found on their own · ${items.length} total across ${years.length} ${years.length === 1 ? 'year' : 'years'}`;
    }
    if (view.mode === 'schools') {
      return `${schoolsForYear.length} ${schoolsForYear.length === 1 ? 'school' : 'schools'} in ${view.year}`;
    }
    return `${tableItems.length} ${tableItems.length === 1 ? 'student' : 'students'} in ${view.school} ${view.year}`;
  }, [items.length, years.length, schoolsForYear.length, tableItems.length, view]);

  const breadcrumbCrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: 'Internships', onClick: () => setView({ mode: 'years' }) },
    ];
    if (view.mode === 'schools') {
      crumbs.push({ label: String(view.year) });
    } else if (view.mode === 'table') {
      crumbs.push({
        label: String(view.year),
        onClick: () => setView({ mode: 'schools', year: view.year }),
      });
      crumbs.push({ label: view.school });
    }
    return crumbs;
  }, [view]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <Breadcrumbs crumbs={breadcrumbCrumbs} />
          <h1 className="text-2xl font-semibold text-strong">{title}</h1>
          <p className="text-sm text-subtle">{subtitle}</p>
        </div>
        {editing === null && <Button onClick={() => setEditing('new')}>Add internship</Button>}
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {editing !== null && (
        <InternshipForm
          internship={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No internships submitted yet.</Card>
      ) : view.mode === 'years' ? (
        <BatchCards
          items={years.map((y) => ({
            key: y.key,
            title: String(y.year || '—'),
            category: 'Graduation Year',
            stats: [
              { label: y.items.length === 1 ? 'internship' : 'internships', value: y.items.length },
              {
                label: 'schools',
                value: new Set(y.items.map((i) => i.studentSchool)).size,
              },
            ],
          }))}
          onSelect={(key) => {
            const year = years.find((y) => y.key === key)?.year ?? 0;
            setView({ mode: 'schools', year });
          }}
        />
      ) : view.mode === 'schools' ? (
        <>
          <button
            onClick={() => setView({ mode: 'years' })}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            ← All years
          </button>
          <BatchCards
            items={schoolsForYear.map((c) => ({
              key: c.key,
              title: c.school,
              category: `${c.year} · School`,
              stats: [
                {
                  label: c.items.length === 1 ? 'internship' : 'internships',
                  value: c.items.length,
                },
                {
                  label: 'students',
                  value: new Set(c.items.map((i) => i.studentId)).size,
                },
              ],
            }))}
            onSelect={(key) => {
              const school = schoolsForYear.find((c) => c.key === key)?.school ?? '';
              setView({ mode: 'table', year: view.year, school });
            }}
          />
        </>
      ) : (
        <>
          <button
            onClick={() => setView({ mode: 'schools', year: view.year })}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            ← All schools in {view.year}
          </button>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[980px] text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Roll No.</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Stipend</th>
                  <th className="px-4 py-3 font-medium">Point of Contact</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tableItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-subtle">
                      No internships found for this batch.
                    </td>
                  </tr>
                ) : (
                  tableItems.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0 hover:bg-app/60">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-strong">{i.studentName ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-strong">{i.rollNumber ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-strong">{i.companyName}</p>
                        {i.isPpo && (
                          <span className="text-[10px] font-medium text-success">PPO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">{i.role}</td>
                      <td className="px-4 py-3 align-top">{i.location || '—'}</td>
                      <td className="px-4 py-3 align-top">
                        {employmentTypeLabel(i.employmentType) ?? '—'}
                      </td>
                      <td className="px-4 py-3 align-top">{i.domain ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        {i.startDate ? fmt(i.startDate) : '—'}
                        {i.endDate ? ` → ${fmt(i.endDate)}` : i.startDate ? ' → Present' : ''}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {i.isPaid
                          ? i.stipend
                            ? `₹${i.stipend.toLocaleString()}`
                            : 'Paid'
                          : 'Unpaid'}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 align-top">
                        <div className="whitespace-normal text-xs leading-relaxed">
                          <p className="font-medium text-strong">{i.pocName}</p>
                          <p className="text-subtle">{i.pocEmail}</p>
                          <p className="text-subtle">{i.pocPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(i)}
                            className="text-xs font-medium text-primary-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(i)}
                            disabled={deletingId === i.id}
                            className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                          >
                            {deletingId === i.id ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function fmt(d: string): string {
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

/** Search-and-pick a student — required when an officer adds a new internship
 * (there's no "own" session to derive it from, unlike the student's own form). */
function StudentPicker({
  selected,
  onSelect,
}: {
  selected: Student | null;
  onSelect: (s: Student) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (selected || !query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await listStudents({ search: query.trim(), limit: 8 });
        setResults(items);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-app px-3 py-2 text-sm">
        <span className="font-medium text-strong">{selected.user.fullName}</span>
        <span className="text-xs text-subtle">
          {selected.rollNumber} · {selected.school}
        </span>
        <button
          onClick={() => onSelect(null as unknown as Student)}
          className="ml-auto text-xs font-medium text-primary-600 hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or roll number…"
      />
      {(results.length > 0 || searching) && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white shadow-card">
          {searching ? (
            <p className="px-3 py-2 text-xs text-subtle">Searching…</p>
          ) : (
            results.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelect(s);
                  setQuery('');
                  setResults([]);
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-app"
              >
                <span className="font-medium text-strong">{s.user.fullName}</span>
                <span className="text-xs text-subtle">
                  {s.rollNumber} · {s.school} · {s.programme}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function InternshipForm({
  internship,
  onClose,
  onSaved,
}: {
  internship: Internship | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({
    role: internship?.role ?? '',
    companyName: internship?.companyName ?? '',
    employmentType: internship?.employmentType ?? '',
    domain: internship?.domain ?? '',
    skills: internship?.skills ?? '',
    location: internship?.location ?? '',
    isPaid: internship?.isPaid ?? false,
    stipend: internship?.stipend != null ? String(internship.stipend) : '',
    startDate: internship?.startDate ? toDateInput(internship.startDate) : '',
    endDate: internship?.endDate ? toDateInput(internship.endDate) : '',
    isPpo: internship?.isPpo ?? false,
    description: internship?.description ?? '',
    pocName: internship?.pocName ?? '',
    pocEmail: internship?.pocEmail ?? '',
    pocPhone: internship?.pocPhone ?? '',
    certificateUrl: internship?.certificateUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k: 'isPaid' | 'isPpo') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  async function submit() {
    setSaving(true);
    setFormError(null);
    try {
      const phone = normalizePhoneDigits(form.pocPhone);
      if (!isValidPhone(phone)) {
        throw new Error('Enter a valid 10-digit mobile number');
      }
      const input: InternshipInput = {
        role: form.role.trim(),
        companyName: form.companyName.trim(),
        employmentType: (form.employmentType as InternshipInput['employmentType']) || undefined,
        domain: form.domain.trim() || undefined,
        skills: form.skills.trim() || undefined,
        location: form.location.trim(),
        isPaid: form.isPaid,
        stipend: form.stipend.trim() ? Number(form.stipend) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        isPpo: form.isPpo,
        description: form.description.trim() || undefined,
        pocName: form.pocName.trim(),
        pocEmail: form.pocEmail.trim(),
        pocPhone: phone,
        certificateUrl: form.certificateUrl.trim() || undefined,
      };
      if (internship) {
        await updateInternship(internship.id, input);
      } else {
        if (!student) throw new Error('Pick which student this internship is for');
        await createInternship({ ...input, studentId: student.id });
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save internship');
    } finally {
      setSaving(false);
    }
  }

  const ready =
    (internship || student) &&
    form.companyName.trim().length >= 2 &&
    form.role.trim().length >= 2 &&
    form.location.trim().length >= 1 &&
    form.pocName.trim().length >= 1 &&
    form.pocEmail.trim().length >= 1 &&
    form.pocPhone.trim().length >= 1;

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-strong">
        {internship ? `Edit internship — ${internship.studentName ?? 'student'}` : 'Add internship'}
      </p>

      {!internship && (
        <Labeled label="Student *">
          <StudentPicker selected={student} onSelect={setStudent} />
        </Labeled>
      )}

      <Labeled label="Position / title *">
        <input
          className={inputCls}
          value={form.role}
          onChange={set('role')}
          placeholder="Software Engineering Intern"
        />
      </Labeled>
      <Labeled label="Company *">
        <input className={inputCls} value={form.companyName} onChange={set('companyName')} />
      </Labeled>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Employment type">
          <select
            className={inputCls}
            value={form.employmentType}
            onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
          >
            <option value="">Select</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {employmentTypeLabel(t)}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Location *">
          <input
            className={inputCls}
            value={form.location}
            onChange={set('location')}
            placeholder="Bangalore / Remote"
          />
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Domain">
          <input
            className={inputCls}
            value={form.domain}
            onChange={set('domain')}
            placeholder="e.g. Data Science"
          />
        </Labeled>
        <Labeled label="Skills / technologies">
          <input
            className={inputCls}
            value={form.skills}
            onChange={set('skills')}
            placeholder="e.g. Python, React"
          />
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Start date">
          <input
            type="date"
            className={inputCls}
            value={form.startDate}
            onChange={set('startDate')}
          />
        </Labeled>
        <Labeled label="End date">
          <input type="date" className={inputCls} value={form.endDate} onChange={set('endDate')} />
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Paid?">
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={form.isPaid} onChange={setBool('isPaid')} />
            This internship is paid
          </label>
        </Labeled>
        <Labeled label="Stipend (₹/month)">
          <input
            type="number"
            className={inputCls}
            value={form.stipend}
            onChange={set('stipend')}
            placeholder="15000"
            disabled={!form.isPaid}
            min="0"
          />
        </Labeled>
      </div>
      <label className="flex items-center gap-2 text-sm text-body">
        <input type="checkbox" checked={form.isPpo} onChange={setBool('isPpo')} />
        Converted into a PPO
      </label>
      <Labeled label="Short description">
        <textarea
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
          rows={3}
          value={form.description}
          onChange={set('description')}
          placeholder="What the student worked on…"
        />
      </Labeled>
      <Labeled label="Certificate / offer letter URL">
        <input
          className={inputCls}
          value={form.certificateUrl}
          onChange={set('certificateUrl')}
          placeholder="https://…"
        />
      </Labeled>

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold text-strong">Point of contact *</p>
        <div className="space-y-3">
          <Labeled label="Contact person *">
            <input
              className={inputCls}
              value={form.pocName}
              onChange={set('pocName')}
              placeholder="Name / designation"
            />
          </Labeled>
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Email *">
              <input
                className={inputCls}
                type="email"
                value={form.pocEmail}
                onChange={set('pocEmail')}
                placeholder="hr@company.com"
              />
            </Labeled>
            <Labeled label="Phone *">
              <input
                className={inputCls}
                type="tel"
                value={form.pocPhone}
                onChange={set('pocPhone')}
                placeholder="9876543210"
              />
            </Labeled>
          </div>
        </div>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} loading={saving} disabled={!ready}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}
