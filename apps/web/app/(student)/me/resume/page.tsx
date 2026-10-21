'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card } from '@campusgo/ui';
import { useConfirm } from '../../../../components/confirm-provider';
import { PageSkeleton } from '../../../../components/page-skeleton';
import { PdfModal } from '../../../../components/pdf-modal';
import {
  deleteMyResume,
  getMyResume,
  updateMyResume,
  uploadMyResume,
  type MyResume,
  type ResumeSlot,
} from '../../../../lib/resume';

const MAX_BYTES = 1 * 1024 * 1024;

const SLOT_LABEL: Record<ResumeSlot, string> = { 1: 'Resume 1', 2: 'Resume 2 (optional)' };

function slotFile(r: MyResume | null, slot: ResumeSlot) {
  if (!r) return null;
  const url = slot === 1 ? r.fileUrl : r.secondFileUrl;
  if (!url) return null;
  return {
    url,
    name: slot === 1 ? r.fileName : r.secondFileName,
    size: slot === 1 ? r.fileSize : r.secondFileSize,
  };
}

export default function MyResumePage() {
  return (
    <Suspense fallback={<PageSkeleton cardHeight={180} />}>
      <MyResume />
    </Suspense>
  );
}

function MyResume() {
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [resume, setResume] = useState<MyResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<ResumeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewSlot, setViewSlot] = useState<ResumeSlot | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Which slot the hidden file input is currently picking a file for.
  const pickingSlot = useRef<ResumeSlot>(1);

  useEffect(() => {
    load();
    // If the browser restores this page from back-forward cache after a login
    // switch, reload so we never show the previous student's resume.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) load();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setResume(await getMyResume());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resume');
    } finally {
      setLoading(false);
    }
  }

  function selectFile(slot: ResumeSlot) {
    pickingSlot.current = slot;
    inputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const slot = pickingSlot.current;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Resume must be 1 MB or smaller.');
      return;
    }

    setUploadingSlot(slot);
    setError(null);
    try {
      const r = await uploadMyResume(file, slot);
      setResume(r);
      if (next && slot === 1 && r.fileUrl) {
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingSlot(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function togglePublished() {
    if (!resume) return;
    const next = !resume.isPublished;
    setError(null);
    try {
      setResume(await updateMyResume({ isPublished: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    }
  }

  async function remove(slot: ResumeSlot) {
    if (!slotFile(resume, slot)) return;
    const ok = await confirm({
      title: `Delete ${SLOT_LABEL[slot].replace(' (optional)', '').toLowerCase()}?`,
      message:
        'This removes the uploaded PDF. Your public link will stay empty until you upload a new one.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      setResume(await deleteMyResume(slot));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const publicUrl = resume
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${resume.publicSlug}`
    : '';
  const hasAny = !!slotFile(resume, 1) || !!slotFile(resume, 2);
  const viewing = viewSlot ? slotFile(resume, viewSlot) : null;

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-strong">My resume</h1>
          <p className="text-sm text-subtle">
            Upload your résumé as a PDF, or two if you apply to different kinds of roles, and share
            the public link.
          </p>
        </div>
        <Link href="/me/profile" className="shrink-0 text-sm font-medium text-primary-600 hover:underline">
          Back
        </Link>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <PageSkeleton cardHeight={180} />
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFileChange}
          />

          {([1, 2] as const).map((slot) => (
            <ResumeSlotCard
              key={slot}
              label={SLOT_LABEL[slot]}
              file={slotFile(resume, slot)}
              uploading={uploadingSlot === slot}
              onPick={() => selectFile(slot)}
              onView={() => setViewSlot(slot)}
              onDelete={() => remove(slot)}
            />
          ))}

          {resume && hasAny && (
            <Card className="max-w-full space-y-3 overflow-hidden p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-strong">Public link</span>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={resume.isPublished}
                    onChange={togglePublished}
                    className="h-4 w-4 accent-primary-600"
                  />
                  Published
                </label>
              </div>
              <code className="block max-w-full truncate rounded-md bg-app px-3 py-2 text-xs text-strong">
                {publicUrl}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard?.writeText(publicUrl)}
                >
                  Copy link
                </Button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm font-medium text-primary-600 hover:underline"
                >
                  Open public page →
                </a>
              </div>
              {!resume.isPublished && (
                <p className="text-xs text-warning">
                  Your public link is hidden. Toggle Published to share it.
                </p>
              )}
            </Card>
          )}
        </>
      )}

      {viewing && <PdfModal url={viewing.url} name={viewing.name} onClose={() => setViewSlot(null)} />}
    </div>
  );
}

function ResumeSlotCard({
  label,
  file,
  uploading,
  onPick,
  onView,
  onDelete,
}: {
  label: string;
  file: { url: string; name: string; size: number } | null;
  uploading: boolean;
  onPick: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="max-w-full space-y-4 overflow-hidden p-5">
      <p className="text-sm font-semibold text-strong">{label}</p>
      {!file ? (
        <button
          onClick={onPick}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-app px-6 py-8 text-center transition hover:border-primary-400 hover:bg-primary-50/30 disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="mb-3 h-10 w-10 text-subtle"
          >
            <path
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M17 8l-5-5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-medium text-strong">{uploading ? 'Uploading…' : 'Click to upload PDF'}</p>
          <p className="mt-1 text-xs text-subtle">PDF only · max 1 MB</p>
        </button>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
                  <path
                    d="M14 2v6h6"
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="break-words font-medium text-strong">{file.name}</p>
                <p className="text-xs text-subtle">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 sm:justify-end">
              <Button variant="ghost" size="sm" onClick={onPick} loading={uploading}>
                Replace
              </Button>
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
          <button
            onClick={onView}
            className="w-full rounded-lg border border-border bg-app px-4 py-3 text-left text-sm font-medium text-primary-600 hover:bg-primary-50/30"
          >
            Preview resume →
          </button>
        </>
      )}
    </Card>
  );
}
