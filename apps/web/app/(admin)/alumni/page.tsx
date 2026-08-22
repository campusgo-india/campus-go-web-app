'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@campusgo/ui';
import { isValidEmail, isValidPhone, toTitleCase } from '@campusgo/shared';
import { useSession } from '../../../lib/session';
import { Breadcrumbs } from '../../../components/breadcrumbs';
import { CopyButton } from '../../../components/copy-button';
import { BatchCards } from '../../../components/batch-cards';
import { InlineSkeleton, ListSkeleton } from '../../../components/page-skeleton';
import {
  approveAlumni,
  createAlumni,
  getAlumniStats,
  listAlumni,
  type Alumni,
  type AlumniFilters,
  type AlumniStats,
} from '../../../lib/alumni';
import { listMySchools, type CollegeSchool } from '../../../lib/courses';

type ViewMode = 'years' | 'schools' | 'table';

interface ViewState {
  mode: ViewMode;
  year?: number;
  school?: string;
}

export default function AlumniPage() {
  const { user } = useSession();
  const [items, setItems] = useState<Alumni[]>([]);
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [filters, setFilters] = useState<AlumniFilters>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<ViewState>({ mode: 'years' });

  async function load(next: AlumniFilters = filters, nextView: ViewState = view) {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listAlumni(next);
      setItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alumni');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      setStats(await getAlumniStats());
    } catch {
      /* stats are best-effort; ignore */
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function apply(patch: Partial<AlumniFilters>) {
    const next = { ...filters, ...patch };
    (Object.keys(next) as (keyof AlumniFilters)[]).forEach((k) => {
      const v = next[k];
      if (v === undefined || v === '' || v === null) delete next[k];
    });
    setFilters(next);
  }

  function toggle<K extends keyof AlumniFilters>(key: K, value: AlumniFilters[K]) {
    apply({ [key]: filters[key] === value ? undefined : value } as Partial<AlumniFilters>);
  }

  const hasFilters = Object.keys(filters).some((k) => k !== 'page' && k !== 'limit');

  async function approve(a: Alumni) {
    try {
      await approveAlumni(a.id);
      load();
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve');
    }
  }

  const slug = user?.college?.slug;
  const registerUrl =
    slug && typeof window !== 'undefined'
      ? `${window.location.origin}/alumni-register/${slug}`
      : null;

  const years = useMemo(
    () => (stats?.byGraduationYear ?? []).sort((a, b) => b.graduationYear - a.graduationYear),
    [stats],
  );

  const schoolsForYear = useMemo(() => {
    if (view.mode === 'years' || view.year == null) return [];
    return (stats?.byYearSchool ?? [])
      .filter((yc) => yc.graduationYear === view.year)
      .sort((a, b) => a.school.localeCompare(b.school));
  }, [stats, view]);

  function selectYear(year: number) {
    const nextFilters: AlumniFilters = { graduationYear: year };
    setSearch('');
    setFilters(nextFilters);
    setView({ mode: 'schools', year });
  }

  function selectSchool(year: number, school: string) {
    const nextFilters: AlumniFilters = { graduationYear: year, school };
    setSearch('');
    setFilters(nextFilters);
    setView({ mode: 'table', year, school });
  }

  function backToYears() {
    setSearch('');
    setFilters({});
    setView({ mode: 'years' });
  }

  function backToSchools() {
    if (view.year == null) return;
    setSearch('');
    setFilters({ graduationYear: view.year });
    setView({ mode: 'schools', year: view.year });
  }

  const title = useMemo(() => {
    if (view.mode === 'years') return 'Alumni';
    if (view.mode === 'schools') return `Alumni · ${view.year}`;
    return `Alumni · ${view.year} · ${view.school}`;
  }, [view]);

  const subtitle = useMemo(() => {
    if (view.mode === 'years') {
      return stats ? (
        `${stats.total} graduates · ${years.length} ${years.length === 1 ? 'year' : 'years'}`
      ) : (
        <InlineSkeleton width="w-24" height="h-4" />
      );
    }
    if (view.mode === 'schools') {
      return `${schoolsForYear.length} ${schoolsForYear.length === 1 ? 'school' : 'schools'} in ${view.year}`;
    }
    return `${items.length} ${items.length === 1 ? 'alumnus' : 'alumni'} in ${view.school} ${view.year}`;
  }, [view, stats, years, schoolsForYear, items.length]);

  const breadcrumbCrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: 'Alumni', onClick: backToYears },
    ];
    if (view.mode === 'schools') {
      crumbs.push({ label: String(view.year) });
    } else if (view.mode === 'table') {
      crumbs.push({ label: String(view.year), onClick: backToSchools });
      crumbs.push({ label: view.school ?? '' });
    }
    return crumbs;
  }, [view]);

  const showDirectory = view.mode === 'table' || (view.mode === 'years' && hasFilters);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Breadcrumbs crumbs={breadcrumbCrumbs} />
          <h1 className="text-2xl font-semibold text-strong">{title}</h1>
          <p className="text-sm text-subtle">{subtitle}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>Add alumnus</Button>
      </header>

      {/* Self-registration link to share with graduating batches */}
      {view.mode === 'years' && registerUrl && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-strong p-4 text-white">
          <div>
            <p className="text-sm font-medium">Alumni self-registration link</p>
            <p className="text-xs text-white/70">{registerUrl}</p>
          </div>
          <CopyButton
            value={registerUrl}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          />
        </Card>
      )}

      {/* Year picker */}
      {view.mode === 'years' && (
        <>
          {years.length === 0 ? (
            <Card className="p-8 text-center text-sm text-subtle">
              No alumni yet. Add one or share the self-registration link.
            </Card>
          ) : (
            <BatchCards
              items={years.map((y) => ({
                key: String(y.graduationYear),
                title: String(y.graduationYear),
                category: 'Graduation Year',
                stats: [{ label: y.count === 1 ? 'alumnus' : 'alumni', value: y.count }],
              }))}
              onSelect={(k) => selectYear(Number(k))}
            />
          )}
        </>
      )}

      {/* School picker */}
      {view.mode === 'schools' && (
        <BatchCards
          items={schoolsForYear.map((c) => ({
            key: `${c.graduationYear}|${c.school}`,
            title: c.school,
            category: `${c.graduationYear} · School`,
            stats: [{ label: c.count === 1 ? 'alumnus' : 'alumni', value: c.count }],
          }))}
          onSelect={(k) => {
            const school =
              schoolsForYear.find((c) => `${c.graduationYear}|${c.school}` === k)?.school ?? '';
            selectSchool(view.year!, school);
          }}
        />
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowForm(false)}
        >
          <div className="my-8 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <NewAlumniForm
              onCancel={() => setShowForm(false)}
              onCreated={() => {
                setShowForm(false);
                load();
                loadStats();
              }}
            />
          </div>
        </div>
      )}

      {/* Search + filters */}
      {showDirectory && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {view.mode === 'table' ? (
              <button
                onClick={backToSchools}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                ← All schools in {view.year}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && apply({ search: search || undefined })}
                placeholder="Search by name, email or company…"
                className="h-10 w-full max-w-md rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400"
              />
              <Button variant="ghost" onClick={() => apply({ search: search || undefined })}>
                Search
              </Button>
            </div>
          </div>

          {/* Segmentation filters */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip active={filters.isMentor === true} onClick={() => toggle('isMentor', true)}>
                Mentors
              </Chip>
              <Chip active={filters.isHiring === true} onClick={() => toggle('isHiring', true)}>
                Hiring
              </Chip>
              <Chip active={filters.pending === true} onClick={() => toggle('pending', true)}>
                Pending approval{stats?.pending ? ` (${stats.pending})` : ''}
              </Chip>
              {hasFilters && (
                <button
                  onClick={() => {
                    setSearch('');
                    if (view.mode === 'table' && view.year != null && view.school != null) {
                      setFilters({ graduationYear: view.year, school: view.school });
                    } else if (view.mode === 'schools' && view.year != null) {
                      setFilters({ graduationYear: view.year });
                    } else {
                      setFilters({});
                    }
                  }}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {stats && stats.facets.programmes.length > 0 && (
              <FacetRow label="Programme">
                {stats.facets.programmes.map((b) => (
                  <Chip key={b} active={filters.programme === b} onClick={() => toggle('programme', b)}>
                    {b}
                  </Chip>
                ))}
              </FacetRow>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {/* Directory */}
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">School/Department</th>
                  <th className="px-4 py-3 font-medium">Programme</th>
                  <th className="px-4 py-3 font-medium">Now at</th>
                  <th className="px-4 py-3 font-medium">LinkedIn</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8">
                      <InlineSkeleton width="w-full" height="h-32" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-subtle">
                      No alumni match these filters.
                    </td>
                  </tr>
                ) : (
                  items.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-app/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/alumni/${a.id}`}
                          className="font-medium text-strong hover:underline"
                        >
                          {a.fullName}
                        </Link>
                        {!a.isActive && (
                          <span className="ml-2 text-xs text-subtle">(inactive)</span>
                        )}
                        <p className="text-xs text-subtle">{a.email}</p>
                      </td>
                      <td className="px-4 py-3">{a.graduationYear}</td>
                      <td className="px-4 py-3">{a.school || '—'}</td>
                      <td className="px-4 py-3">{a.programme}</td>
                      <td className="px-4 py-3">
                        {a.currentCompany ? (
                          <>
                            <span className="text-strong">{a.currentCompany}</span>
                            {a.currentDesignation && (
                              <p className="text-xs text-subtle">{a.currentDesignation}</p>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.linkedinUrl ? (
                          <a
                            href={a.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {!a.isApproved && (
                            <>
                              <Badge tint="cream">Pending</Badge>
                              <button
                                onClick={() => approve(a)}
                                className="rounded-pill bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700"
                              >
                                Approve
                              </button>
                            </>
                          )}
                          {a.isMentor && <Badge tint="lavender">Mentor</Badge>}
                          {a.isHiring && <Badge tint="mint">Hiring</Badge>}
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-pill px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-primary-500 text-white'
          : 'border border-border bg-white text-subtle hover:border-primary-400'
      }`}
    >
      {children}
    </button>
  );
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase text-subtle">{label}</span>
      {children}
    </div>
  );
}

function NewAlumniForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    graduationYear: String(new Date().getFullYear()),
    programme: '',
    phone: '',
    registerNumber: '',
    joiningYear: '',
    school: '',
    currentCompany: '',
    currentDesignation: '',
    currentLocation: '',
    linkedinUrl: '',
    tags: '',
    notes: '',
    isMentor: false,
    isHiring: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<CollegeSchool[]>([]);

  useEffect(() => {
    listMySchools()
      .then(setSchools)
      .catch(() => {
        /* non-fatal: school field just falls back to free entry if this fails */
      });
  }, []);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  // Programme options are scoped to the selected school, mirroring students/new —
  // programme used to be a free-text field completely decoupled from school.
  const setSchool = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, school: e.target.value, programme: '' }));
  const programmesFor = schools.find((c) => c.name === form.school)?.programmes ?? [];

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await createAlumni({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        graduationYear: Number(form.graduationYear),
        programme: form.programme.trim(),
        phone: form.phone.trim(),
        registerNumber: form.registerNumber.trim() || undefined,
        joiningYear: form.joiningYear ? Number(form.joiningYear) : undefined,
        school: form.school || undefined,
        currentCompany: form.currentCompany || undefined,
        currentDesignation: form.currentDesignation || undefined,
        currentLocation: form.currentLocation.trim()
          ? toTitleCase(form.currentLocation)
          : undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        tags: form.tags
          ? form.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        notes: form.notes || undefined,
        isMentor: form.isMentor,
        isHiring: form.isHiring,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add alumnus');
    } finally {
      setSaving(false);
    }
  }

  const emailOk = !form.email.trim() || isValidEmail(form.email);
  const phoneOk = !form.phone.trim() || isValidPhone(form.phone);
  const ready =
    form.fullName.trim() &&
    form.email.trim() &&
    isValidEmail(form.email) &&
    form.programme.trim() &&
    form.graduationYear &&
    form.phone.trim() &&
    phoneOk;

  return (
    <Card className="animate-pop space-y-3 p-5 shadow-nav">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-strong">Add alumnus</h2>
          <p className="text-sm text-subtle">Only name, email, batch and programme are required.</p>
        </div>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="rounded-md px-2 py-1 text-subtle transition hover:bg-app hover:text-strong"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name *">
          <input className={inputCls} value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email *">
          <input className={inputCls} value={form.email} onChange={set('email')} />
          {!emailOk && <span className="text-xs text-danger">Enter a valid email address.</span>}
        </Field>
        <Field label="Year of Admission">
          <input
            type="number"
            className={inputCls}
            value={form.joiningYear}
            onChange={set('joiningYear')}
            placeholder="Year they joined the school"
            min="0"
          />
        </Field>
        <Field label="Year of Graduation *">
          <input
            type="number"
            className={inputCls}
            value={form.graduationYear}
            onChange={set('graduationYear')}
            min="0"
          />
        </Field>
        <Field label="School/Department">
          {schools.length > 0 ? (
            <select className={inputCls} value={form.school} onChange={setSchool}>
              <option value="">Select school/department</option>
              {schools.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input className={inputCls} value={form.school} onChange={setSchool} />
          )}
        </Field>
        <Field label="Programme *">
          {programmesFor.length > 0 ? (
            <select className={inputCls} value={form.programme} onChange={set('programme')}>
              <option value="">Select programme</option>
              {programmesFor.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputCls}
              value={form.programme}
              onChange={set('programme')}
              placeholder={form.school ? 'No sub-programmes for this school' : 'e.g. Computer Science'}
            />
          )}
        </Field>
        <Field label="Register number">
          <input
            className={inputCls}
            value={form.registerNumber}
            onChange={set('registerNumber')}
          />
        </Field>
        <Field label="Phone *">
          <input
            className={inputCls}
            value={form.phone}
            onChange={set('phone')}
            placeholder="10-digit mobile"
          />
          {!phoneOk && (
            <span className="text-xs text-danger">Enter a valid 10-digit mobile number.</span>
          )}
        </Field>
        <Field label="Current company">
          <input
            className={inputCls}
            value={form.currentCompany}
            onChange={set('currentCompany')}
          />
        </Field>
        <Field label="Designation">
          <input
            className={inputCls}
            value={form.currentDesignation}
            onChange={set('currentDesignation')}
          />
        </Field>
        <Field label="Location">
          <input
            className={inputCls}
            value={form.currentLocation}
            onChange={set('currentLocation')}
          />
        </Field>
        <Field label="LinkedIn URL">
          <input
            className={inputCls}
            value={form.linkedinUrl}
            onChange={set('linkedinUrl')}
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            className={inputCls}
            value={form.tags}
            onChange={set('tags')}
            placeholder="ml, founder"
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input
            type="checkbox"
            checked={form.isMentor}
            onChange={(e) => setForm((f) => ({ ...f, isMentor: e.target.checked }))}
          />
          Available as mentor
        </label>
        <label className="flex items-center gap-2 text-xs text-subtle">
          <input
            type="checkbox"
            checked={form.isHiring}
            onChange={(e) => setForm((f) => ({ ...f, isHiring: e.target.checked }))}
          />
          Currently hiring
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} loading={saving} disabled={!ready}>
          {saving ? 'Saving…' : 'Add alumnus'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
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
