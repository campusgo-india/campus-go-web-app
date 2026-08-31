'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, cn } from '@campusgo/ui';
import { listJobs, publishManyJobs, formatCtc, type Job } from '../../../lib/jobs';
import { JobCard } from '../../../components/job-card';
import { ListSkeleton } from '../../../components/page-skeleton';
import { useSession } from '../../../lib/session';

const STATUS_TINT: Record<string, 'lavender' | 'mint' | 'cream' | 'primary'> = {
  DRAFT: 'cream',
  PUBLISHED: 'mint',
  CLOSED: 'lavender',
};

type ViewMode = 'tile' | 'list';

const VIEW_STORAGE_KEY = 'campusgo:jobs-view';

// Lazy initializer so the very first render already reflects the saved
// preference — avoids a tile→list flash on mount.
function initialView(): ViewMode {
  if (typeof window === 'undefined') return 'tile';
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === 'list' ? 'list' : 'tile';
  } catch {
    return 'tile';
  }
}

export default function JobsPage() {
  const router = useRouter();
  const { user } = useSession();
  const readOnly = user?.role === 'PLACEMENT_COORDINATOR';
  const [items, setItems] = useState<Job[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [view, setViewState] = useState<ViewMode>(initialView);
  // Remember the chosen view across navigation/reload.
  const setView = (v: ViewMode) => {
    setViewState(v);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {
      /* best-effort; view just won't persist this time */
    }
  };
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setItems(await listJobs(status, debouncedSearch));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, [status, debouncedSearch]);

  // Clear selection when switching tabs so stale ids don't persist.
  useEffect(() => {
    setSelected(new Set());
  }, [status]);

  const draftIds = useMemo(
    () => items.filter((j) => j.status === 'DRAFT' && !j.isPlatform).map((j) => j.id),
    [items],
  );
  const allDraftsSelected = draftIds.length > 0 && draftIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllDrafts() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allDraftsSelected) {
        for (const id of draftIds) next.delete(id);
      } else {
        for (const id of draftIds) next.add(id);
      }
      return next;
    });
  }

  async function handlePublishSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setPublishing(true);
    setError(null);
    try {
      const { count } = await publishManyJobs(ids);
      setSelected(new Set());
      setItems(await listJobs(status));
      // eslint-disable-next-line no-alert
      alert(`${count} job${count === 1 ? '' : 's'} published successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish selected jobs');
    } finally {
      setPublishing(false);
    }
  }

  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Jobs</h1>
          <p className="text-sm text-subtle">{items.length} postings</p>
        </div>
        {!readOnly && (
          <Link href="/jobs/quick">
            <Button>Post a job</Button>
          </Link>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title or company…"
          className="h-10 w-full max-w-sm rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
        />
        <div className="flex rounded-md border border-border bg-white p-0.5">
          {(['tile', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-label={`${v} view`}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium capitalize transition',
                view === v ? 'bg-primary-50 text-primary-700' : 'text-subtle hover:text-body',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {['', 'DRAFT', 'PUBLISHED', 'CLOSED'].map((s) => (
            <button
              key={s || 'ALL'}
              onClick={() => setStatus(s)}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
                status === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-body hover:bg-primary-50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 shadow-card">
            <span className="text-sm font-medium text-strong">{selectedCount} selected</span>
            <Button size="sm" onClick={handlePublishSelected} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish all'}
            </Button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={publishing}
              className="text-xs font-medium text-subtle hover:text-body disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Tip for officers */}
      {!loading && !readOnly && draftIds.length > 0 && (
        <div className="rounded-xl bg-app p-3 text-xs text-body">
          <span className="font-medium text-strong">Tip:</span> Draft jobs are not visible to
          students. Select drafts and tap{' '}
          <span className="font-medium text-strong">Publish all</span> to make them live.
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">
          {search ? 'No jobs match your search.' : 'No jobs yet. Post one to get started.'}
        </Card>
      ) : view === 'list' ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-app text-xs uppercase text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">CTC</th>
                <th className="px-4 py-3 font-medium">Posted</th>
                <th className="px-4 py-3 font-medium">Applicants</th>
                <th className="px-4 py-3 font-medium">Selected</th>
                <th className="px-4 py-3 font-medium">Posted by</th>
              </tr>
            </thead>
            <tbody>
              {items.map((j) => {
                const company = j.companyName ?? j.company?.name ?? 'Company';
                return (
                  <tr
                    key={j.id}
                    onClick={() => router.push(`/jobs/${j.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-app/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-strong">{j.title}</p>
                      <p className="text-xs text-subtle">{company}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {j.isPlatform && <Badge tint="lavender">Platform</Badge>}
                        <Badge tint={STATUS_TINT[j.status] ?? 'primary'}>{j.status}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body">{formatCtc(j.ctcMin, j.ctcMax)}</td>
                    <td className="px-4 py-3 text-subtle">
                      {new Date(j.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-body">{j.applicationCount ?? 0}</td>
                    <td className="px-4 py-3 text-body">
                      {(j.selectedCount ?? 0) > 0 ? (
                        <span className="font-medium text-success">{j.selectedCount}</span>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="px-4 py-3 text-subtle">{j.createdBy?.fullName ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((j, i) => {
            const applicants = j.applicationCount ?? 0;
            const isDraft = j.status === 'DRAFT' && !j.isPlatform;
            return (
              <JobCard
                key={j.id}
                job={j}
                delay={i * 60}
                hideCtc
                onOpen={() => router.push(`/jobs/${j.id}`)}
                selection={
                  isDraft && !readOnly ? (
                    <label
                      className="flex cursor-pointer items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        checked={selected.has(j.id)}
                        onChange={() => toggleOne(j.id)}
                      />
                    </label>
                  ) : undefined
                }
                topRight={
                  <div className="flex items-center gap-1.5">
                    {j.isPlatform && <Badge tint="lavender">Platform</Badge>}
                    <Badge tint={STATUS_TINT[j.status] ?? 'primary'}>{j.status}</Badge>
                  </div>
                }
                footer={
                  <Link href={`/jobs/${j.id}`}>
                    <span className="inline-block rounded-full bg-strong px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90">
                      Details
                    </span>
                  </Link>
                }
              >
                <p className="text-xs text-subtle">
                  {applicants} applicant{applicants === 1 ? '' : 's'}
                  {j.graduationYears?.length ? ` · batch ${j.graduationYears.join(', ')}` : ''}
                  {j.createdBy?.fullName ? ` · Posted by ${j.createdBy.fullName}` : ''}
                </p>
              </JobCard>
            );
          })}
        </div>
      )}

      {/* Floating select-all bar for drafts */}
      {!readOnly && status !== 'PUBLISHED' && status !== 'CLOSED' && draftIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-card">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-body">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
              checked={allDraftsSelected}
              onChange={toggleAllDrafts}
            />
            Select all draft jobs
          </label>
          <span className="text-xs text-subtle">({draftIds.length} drafts)</span>
        </div>
      )}
    </div>
  );
}
