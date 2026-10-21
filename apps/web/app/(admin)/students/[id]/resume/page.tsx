'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageSkeleton } from '../../../../../components/page-skeleton';
import { PdfModal } from '../../../../../components/pdf-modal';
import { getStudentResume, type OfficerResume } from '../../../../../lib/resume';

/** Officer view of a student's résumé — renders the uploaded PDF. */
export default function StudentResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [resume, setResume] = useState<OfficerResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewIdx, setViewIdx] = useState<number | null>(null);

  useEffect(() => {
    getStudentResume(id)
      .then((r) => {
        setResume(r);
        setViewIdx(0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load resume'));
  }, [id]);

  const files = resume
    ? [
        ...(resume.fileUrl
          ? [{ url: resume.fileUrl, name: resume.fileName, size: resume.fileSize }]
          : []),
        ...(resume.secondFileUrl
          ? [{ url: resume.secondFileUrl, name: resume.secondFileName, size: resume.secondFileSize }]
          : []),
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/students/${id}`} className="text-sm text-primary-600 hover:underline">
          ← Back to student
        </Link>
        {resume && !resume.isPublished && (
          <span className="rounded-full bg-tint-cream px-3 py-1 text-xs font-medium text-tint-cream-fg">
            Not published by student
          </span>
        )}
      </div>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : !resume ? (
        <PageSkeleton />
      ) : (
        <>
          {files.map((f, i) => (
            <div
              key={f.url}
              className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 shadow-card"
            >
              <div>
                <p className="text-sm font-medium text-strong">
                  {files.length > 1 ? `Resume ${i + 1} · ` : ''}
                  {f.name}
                </p>
                <p className="text-xs text-subtle">{(f.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setViewIdx(i)}
                  className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-strong hover:bg-app"
                >
                  View
                </button>
                <a
                  href={f.url}
                  download={f.name}
                  className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  Download PDF
                </a>
              </div>
            </div>
          ))}
        </>
      )}

      {viewIdx !== null && files[viewIdx] && (
        <PdfModal
          url={files[viewIdx].url}
          name={files[viewIdx].name}
          onClose={() => setViewIdx(null)}
        />
      )}
    </div>
  );
}
