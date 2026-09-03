'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Badge } from '@campusgo/ui';
import { getEligibleStudents, type EligibleStudent } from '../lib/jobs';
import { useApi } from '../lib/use-api';
import { InlineSkeleton } from './page-skeleton';

/**
 * Popup listing a job's eligible students — verified students whose profile
 * matches the job's criteria. Defaults to those who haven't applied yet so
 * the officer can reach out and nudge them. Reused from the Jobs list and the
 * Placement Dashboard's Active Drives table.
 */
export function EligibleStudentsModal({
  jobId,
  title,
  onClose,
}: {
  jobId: string;
  title: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useApi<EligibleStudent[]>(`/jobs/${jobId}/eligible-students`, () =>
    getEligibleStudents(jobId),
  );
  const [search, setSearch] = useState('');
  const [notAppliedOnly, setNotAppliedOnly] = useState(true);
  // Portal to <body> so the overlay is fixed to the viewport, not trapped by
  // an ancestor with a transform (the admin shell's page-transition wrapper).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  const notAppliedCount = (data ?? []).filter((s) => !s.applied).length;
  const filtered = (data ?? []).filter((s) => {
    if (notAppliedOnly && s.applied) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.programme.toLowerCase().includes(q)
    );
  });

  function download() {
    if (filtered.length === 0) return;
    const header = ['Roll No', 'Name', 'Programme', 'CGPA %', 'Applied', 'Email', 'Phone'];
    const escape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = filtered.map((s) =>
      [
        s.rollNumber,
        s.fullName,
        s.programme,
        s.cgpa != null ? String(s.cgpa) : '',
        s.applied ? 'Yes' : 'No',
        s.email,
        s.phone ?? '',
      ]
        .map(escape)
        .join(','),
    );
    const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `eligible-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-strong">Eligible students · {title}</p>
            <p className="text-xs text-subtle">
              {data ? `${data.length} eligible · ${notAppliedCount} not applied yet` : 'Loading…'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {filtered.length > 0 && (
              <button
                onClick={download}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Download
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-subtle transition hover:bg-app hover:text-strong"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <label className="flex items-center gap-2 text-xs font-medium text-body">
            <input
              type="checkbox"
              checked={notAppliedOnly}
              onChange={(e) => setNotAppliedOnly(e.target.checked)}
            />
            Not applied yet only
          </label>
          {(data?.length ?? 0) > 5 && (
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no., or programme…"
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading || !data ? (
            <div className="p-5">
              <InlineSkeleton width="w-full" height="h-32" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-5 text-sm text-subtle">
              {notAppliedOnly && notAppliedCount === 0
                ? 'Every eligible student has already applied. 🎉'
                : 'No students match.'}
            </p>
          ) : (
            <ul>
              {filtered.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3 text-sm last:border-0 hover:bg-app"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/students/${s.id}`}
                      className="font-medium text-strong hover:underline"
                    >
                      {s.fullName}
                    </Link>
                    <span className="ml-2 text-xs text-subtle">{s.rollNumber}</span>
                    {s.applied && (
                      <Badge tint="mint" size="sm" className="ml-2 align-middle">
                        Applied
                      </Badge>
                    )}
                    <p className="text-xs text-subtle">
                      {s.programme}
                      {s.cgpa != null ? ` · ${s.cgpa}%` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                    <a href={`mailto:${s.email}`} className="text-primary-600 hover:underline">
                      {s.email}
                    </a>
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="text-subtle hover:text-primary-600 hover:underline"
                      >
                        {s.phone}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
