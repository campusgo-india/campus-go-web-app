'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card } from '@campusgo/ui';
import { Breadcrumbs } from '../../../components/breadcrumbs';
import { useSession } from '../../../lib/session';
import { BatchCards } from '../../../components/batch-cards';
import { InlineSkeleton, ListSkeleton } from '../../../components/page-skeleton';
import {
  downloadStudentsByProgramme,
  graduateBatch,
  listStudentBatches,
  listStudents,
  setStudentActive,
  type GraduateResult,
  type ListMeta,
  type Student,
  type StudentBatch,
} from '../../../lib/students';

export default function StudentsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <StudentsList />
    </Suspense>
  );
}

type ViewState =
  | { mode: 'years' }
  | { mode: 'schools'; year: number }
  | { mode: 'table'; year: number; school: string };

interface Year {
  key: string;
  year: number;
  count: number;
  loggedIn: number;
  detailsComplete: number;
  schools: number;
}

interface School {
  key: string;
  year: number;
  school: string;
  count: number;
  loggedIn: number;
  detailsComplete: number;
}

function StudentsList() {
  const { user } = useSession();
  const readOnly = user?.role === 'PLACEMENT_COORDINATOR';
  const router = useRouter();
  const searchParams = useSearchParams();
  const importedCount = searchParams.get('imported');
  const [showImported, setShowImported] = useState(false);
  const [showGraduate, setShowGraduate] = useState(false);

  const [batches, setBatches] = useState<StudentBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [view, setView] = useState<ViewState>({ mode: 'years' });

  const [items, setItems] = useState<Student[]>([]);
  const [meta, setMeta] = useState<ListMeta | undefined>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailsFilter, setDetailsFilter] = useState<'' | 'complete' | 'incomplete'>('');
  const [resumeFilter, setResumeFilter] = useState<'' | 'uploaded' | 'missing'>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function onExportByProgramme() {
    setExporting(true);
    setError(null);
    try {
      await downloadStudentsByProgramme();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }
  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    setError(null);
    try {
      setBatches(await listStudentBatches());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batches');
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Debounce the search box within a batch.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (view.mode !== 'table') return;
    setLoading(true);
    setError(null);
    try {
      const res = await listStudents({
        search: debouncedSearch || undefined,
        school: view.school,
        graduationYear: view.year,
        detailsComplete: detailsFilter === '' ? undefined : detailsFilter === 'complete',
        resumeComplete: resumeFilter === '' ? undefined : resumeFilter === 'uploaded',
        page,
        limit: 10,
      });
      setItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [view, debouncedSearch, detailsFilter, resumeFilter, page]);

  useEffect(() => {
    if (view.mode === 'table') load();
  }, [view, load]);

  useEffect(() => {
    if (importedCount) setShowImported(true);
  }, [importedCount]);

  const years = useMemo<Year[]>(() => {
    const map = new Map<number, Year>();
    for (const b of batches) {
      const existing = map.get(b.graduationYear);
      if (existing) {
        existing.count += b.count;
        existing.loggedIn += b.loggedIn;
        existing.detailsComplete += b.detailsComplete;
        existing.schools += 1;
      } else {
        map.set(b.graduationYear, {
          key: String(b.graduationYear),
          year: b.graduationYear,
          count: b.count,
          loggedIn: b.loggedIn,
          detailsComplete: b.detailsComplete,
          schools: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.year - a.year);
  }, [batches]);

  const schoolsForYear = useMemo<School[]>(() => {
    if (view.mode === 'years') return [];
    return batches
      .filter((b) => b.graduationYear === view.year)
      .map((b) => ({
        key: `${b.graduationYear}|${b.school}`,
        year: b.graduationYear,
        school: b.school,
        count: b.count,
        loggedIn: b.loggedIn,
        detailsComplete: b.detailsComplete,
      }))
      .sort((a, b) => a.school.localeCompare(b.school));
  }, [batches, view]);

  function selectYear(year: number) {
    setView({ mode: 'schools', year });
    setSearch('');
    setDebouncedSearch('');
    setDetailsFilter('');
    setResumeFilter('');
    setPage(1);
    setItems([]);
    setMeta(undefined);
  }

  function selectSchool(year: number, school: string) {
    setView({ mode: 'table', year, school });
    setSearch('');
    setDebouncedSearch('');
    setDetailsFilter('');
    setResumeFilter('');
    setPage(1);
    setItems([]);
    setMeta(undefined);
  }

  function backToYears() {
    setView({ mode: 'years' });
    loadBatches();
  }

  function backToSchools() {
    if (view.mode !== 'table') return;
    setView({ mode: 'schools', year: view.year });
  }

  function dismissImported() {
    setShowImported(false);
    router.replace('/students');
  }

  async function toggleActive(s: Student) {
    setError(null);
    try {
      await setStudentActive(s.id, !s.isActive);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  const totalStudents = batches.reduce((n, b) => n + b.count, 0);

  const title = useMemo(() => {
    if (view.mode === 'years') return 'Students';
    if (view.mode === 'schools') return `Students · ${view.year}`;
    return `Students · ${view.year} · ${view.school}`;
  }, [view]);

  const subtitle = useMemo(() => {
    if (view.mode === 'years') {
      return `${totalStudents} registered · ${years.length} ${years.length === 1 ? 'year' : 'years'}`;
    }
    if (view.mode === 'schools') {
      const yearTotal = schoolsForYear.reduce((n, c) => n + c.count, 0);
      return `${yearTotal} students · ${schoolsForYear.length} ${schoolsForYear.length === 1 ? 'school' : 'schools'} in ${view.year}`;
    }
    return meta
      ? `${meta.total} students · ${meta.detailsCompleteCount ?? 0} details complete`
      : `${view.year} ${view.school}`;
  }, [view, years, schoolsForYear, totalStudents, meta]);

  const breadcrumbCrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: 'Students', onClick: backToYears },
    ];
    if (view.mode === 'schools') {
      crumbs.push({ label: String(view.year) });
    } else if (view.mode === 'table') {
      crumbs.push({ label: String(view.year), onClick: backToSchools });
      crumbs.push({ label: view.school });
    }
    return crumbs;
  }, [view]);

  return (
    <div className="space-y-6">
      {showImported && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-sm space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-semibold text-strong">
                {importedCount} student{importedCount === '1' ? '' : 's'} added
              </h2>
              <p className="mt-1 text-sm text-subtle">
                They can sign in with their email and the password{' '}
                <span className="font-mono">password123</span>.
              </p>
            </div>
            <Button className="w-full" onClick={dismissImported}>
              Done
            </Button>
          </Card>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Breadcrumbs crumbs={breadcrumbCrumbs} />
          <h1 className="text-2xl font-semibold text-strong">{title}</h1>
          <p className="text-sm text-subtle">{subtitle}</p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={onExportByProgramme} loading={exporting}>
              Export by programme
            </Button>
            <Link href="/students/import">
              <Button variant="ghost">Import CSV</Button>
            </Link>
            <Link href="/students/new">
              <Button>Add student</Button>
            </Link>
          </div>
        )}
      </header>

      {showGraduate && (
        <GraduateBatchModal
          onClose={() => setShowGraduate(false)}
          onDone={() => {
            setShowGraduate(false);
            backToYears();
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* ── Year picker ── */}
      {view.mode === 'years' && (
        <>
          {batchesLoading ? (
            <p className="text-subtle">Loading years…</p>
          ) : years.length === 0 ? (
            <Card className="p-8 text-center text-sm text-subtle">
              No students yet. Add one or import a CSV to activate student logins.
            </Card>
          ) : (
            <BatchCards
              items={years.map((y) => ({
                key: y.key,
                title: String(y.year),
                category: 'Graduation Year',
                stats: [
                  { label: y.count === 1 ? 'student' : 'students', value: y.count },
                  {
                    label: 'logged in',
                    value: `${y.loggedIn}/${y.count}`,
                    tint: (y.loggedIn === y.count ? 'success' : 'default') as 'success' | 'default',
                  },
                  {
                    label: 'details done',
                    value: `${y.detailsComplete}/${y.count}`,
                    tint: (y.detailsComplete === y.count ? 'success' : 'warn') as
                      | 'success'
                      | 'warn',
                  },
                  { label: y.schools === 1 ? 'school' : 'schools', value: y.schools },
                ],
              }))}
              onSelect={(key) => {
                const year = years.find((y) => y.key === key)?.year ?? 0;
                selectYear(year);
              }}
            />
          )}
        </>
      )}

      {/* ── School picker ── */}
      {view.mode === 'schools' && (
        <>
          <BatchCards
            items={schoolsForYear.map((c) => ({
              key: c.key,
              title: c.school,
              category: `${c.year} · School`,
              stats: [
                { label: c.count === 1 ? 'student' : 'students', value: c.count },
                {
                  label: 'logged in',
                  value: `${c.loggedIn}/${c.count}`,
                  tint: (c.loggedIn === c.count ? 'success' : 'default') as 'success' | 'default',
                },
                {
                  label: 'details done',
                  value: `${c.detailsComplete}/${c.count}`,
                  tint: (c.detailsComplete === c.count ? 'success' : 'warn') as 'success' | 'warn',
                },
              ],
            }))}
            onSelect={(key) => {
              const school = schoolsForYear.find((c) => c.key === key)?.school ?? '';
              selectSchool(view.year, school);
            }}
          />
        </>
      )}

      {/* ── Student table ── */}
      {view.mode === 'table' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={backToSchools}
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              ← All schools in {view.year}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={detailsFilter}
                onChange={(e) => {
                  setPage(1);
                  setDetailsFilter(e.target.value as typeof detailsFilter);
                }}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
              >
                <option value="">All details</option>
                <option value="complete">Details complete</option>
                <option value="incomplete">Details incomplete</option>
              </select>
              <select
                value={resumeFilter}
                onChange={(e) => {
                  setPage(1);
                  setResumeFilter(e.target.value as typeof resumeFilter);
                }}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
              >
                <option value="">All Students</option>
                <option value="uploaded">Resume uploaded</option>
                <option value="missing">Resume missing</option>
              </select>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this batch by name, email, or roll…"
                className="h-10 w-full max-w-sm rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400"
              />
              <Button variant="ghost" onClick={() => setShowGraduate(true)}>
                Graduate batch
              </Button>
            </div>
          </div>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[680px] text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Reg No.</th>
                  <th className="px-4 py-3 font-medium">Resume</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Login</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8">
                      <InlineSkeleton width="w-full" height="h-32" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-subtle">
                      No students match your search.
                    </td>
                  </tr>
                ) : (
                  items.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-app/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/students/${s.id}`}
                          className="font-medium text-strong hover:underline"
                        >
                          {s.user.fullName}
                        </Link>
                        <p className="text-xs text-subtle">{s.user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-strong">{s.rollNumber}</td>
                      <td className="px-4 py-3">
                        {s.resumeComplete ? (
                          <span className="text-xs text-success">Uploaded</span>
                        ) : (
                          <span className="text-xs text-warning">Not uploaded</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DetailsStatus
                          steps={s.profileSteps}
                          complete={s.detailsComplete ?? false}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <LoginCell student={s} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <RowMenu student={s} onToggle={() => toggleActive(s)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {meta && meta.total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-subtle">
                Showing {(meta.page - 1) * meta.limit + 1}–
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} · page {meta.page} of{' '}
                {meta.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= meta.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Whether the student has ever signed in (plus login-disabled state). */
function LoginCell({ student }: { student: Student }) {
  if (!student.isActive) return <span className="text-xs text-subtle">Disabled</span>;
  if (student.user.lastLoginAt) {
    return (
      <span
        className="text-xs text-success"
        title={new Date(student.user.lastLoginAt).toLocaleString()}
      >
        Logged in
      </span>
    );
  }
  return <span className="text-xs text-warning">Never</span>;
}

/** Graduate a batch → copy to Alumni + disable their logins. */
function GraduateBatchModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GraduateResult | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(await graduateBatch(Number(year)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not graduate the batch');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md space-y-4 p-6">
        {result ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
              ✓
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-strong">
                Batch {result.graduationYear} graduated
              </h2>
              <p className="mt-1 text-sm text-subtle">
                {result.alumniCreated} added to Alumni
                {result.alreadyAlumni > 0 ? ` (${result.alreadyAlumni} already there)` : ''} ·{' '}
                {result.studentsGraduated} logins disabled.
              </p>
            </div>
            <Button className="w-full" onClick={onDone}>
              Done
            </Button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-strong">Graduate a batch</h2>
              <p className="mt-1 text-sm text-subtle">
                Copies every student of this passout year into the Alumni directory and disables
                their student logins. Their records are kept.
              </p>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-subtle">Passout year</span>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
                min="0"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-body">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5"
              />
              I understand the {year} students&apos; logins will be disabled.
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={run} loading={busy} disabled={!ack || !year}>
                {busy ? 'Graduating…' : 'Graduate batch'}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/** Details badge + fixed tooltip showing the 5 profile sections and which are done. */
function DetailsStatus({ steps, complete }: { steps: Student['profileSteps']; complete: boolean }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.left });
  }

  return (
    <span ref={ref} className="inline-block" onMouseEnter={show} onMouseLeave={() => setPos(null)}>
      <Badge tint={complete ? 'mint' : 'cream'} className="cursor-help">
        {complete ? 'Complete' : 'Incomplete'}
      </Badge>
      {pos && steps && steps.length > 0 && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-64 rounded-md border border-border bg-white p-3 text-left shadow-card"
        >
          <p className="mb-2 text-xs font-semibold text-strong">Profile completion</p>
          <ul className="space-y-1.5">
            {steps.map((step) => {
              const done = step.completed === step.total;
              return (
                <li key={step.key} className="flex items-start gap-2 text-xs">
                  <span className={done ? 'text-success' : 'text-warning'}>{done ? '✓' : '○'}</span>
                  <span className="flex-1 text-body">{step.label}</span>
                  <span className="text-subtle">
                    {step.completed}/{step.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </span>
  );
}

/**
 * Per-row "⋮" actions menu. The dropdown is fixed-positioned (computed from the
 * button) so it isn't clipped by the table card's overflow-hidden.
 */
function RowMenu({
  student,
  onToggle,
}: {
  student: Student;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function toggle() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.right - 160 });
    setOpen((o) => !o);
  }

  const item = 'block w-full px-3 py-2 text-left text-xs hover:bg-app';

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Row actions"
        aria-haspopup="menu"
        className="rounded-md p-1.5 text-subtle transition hover:bg-app hover:text-strong"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-40 overflow-hidden rounded-md border border-border bg-white py-1 shadow-card"
        >
          <Link href={`/students/${student.id}`} className={`${item} text-body`} role="menuitem">
            Edit
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onToggle();
            }}
            className={`${item} text-body`}
            role="menuitem"
          >
            {student.isActive ? 'Disable login' : 'Enable login'}
          </button>
        </div>
      )}
    </>
  );
}
