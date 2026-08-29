'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@campusgo/ui';
import { useConfirm } from '../../../components/confirm-provider';
import { PageSkeleton } from '../../../components/page-skeleton';
import { PdfModal } from '../../../components/pdf-modal';
import {
  deletePolicyDocument,
  getPlacementPolicy,
  uploadPolicyDocument,
  type PlacementPolicy,
} from '../../../lib/placement-policy';

const MAX_BYTES = 5 * 1024 * 1024;

export default function PlacementPolicyPage() {
  const confirm = useConfirm();
  const [policy, setPolicy] = useState<PlacementPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPolicy(await getPlacementPolicy());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policy');
    } finally {
      setLoading(false);
    }
  }

  function selectFile() {
    inputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Policy document must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      setPolicy(await uploadPolicyDocument(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Remove the placement policy document?',
      message: 'Students will no longer be able to view or download it until a new one is uploaded.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      setPolicy(await deletePolicyDocument());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <PageSkeleton cardHeight={220} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Placement Policy</h1>
        <p className="text-sm text-subtle">
          Upload the placement policy document — every student at this college can view it from
          their home screen.
        </p>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="max-w-xl space-y-5 overflow-hidden p-5">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onFileChange}
        />

        {!policy?.fileUrl ? (
          <button
            onClick={selectFile}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-app px-6 py-10 text-center transition hover:border-primary-400 hover:bg-primary-50/30 disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mb-3 h-10 w-10 text-subtle"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 8l-5-5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-medium text-strong">{uploading ? 'Uploading…' : 'Click to upload PDF'}</p>
            <p className="mt-1 text-xs text-subtle">PDF only · max 5 MB</p>
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
                    <path d="M14 2v6h6" fill="none" stroke="white" strokeWidth={2} strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="break-words font-medium text-strong">{policy.fileName}</p>
                  <p className="text-xs text-subtle">
                    {(policy.fileSize / 1024).toFixed(1)} KB · updated{' '}
                    {new Date(policy.updatedAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 sm:justify-end">
                <Button variant="ghost" size="sm" onClick={selectFile} loading={uploading}>
                  Replace
                </Button>
                <Button variant="danger" size="sm" onClick={remove}>
                  Delete
                </Button>
              </div>
            </div>

            <button
              onClick={() => setShowPdf(true)}
              className="w-full rounded-lg border border-border bg-app px-4 py-3 text-left text-sm font-medium text-primary-600 hover:bg-primary-50/30"
            >
              Preview policy document →
            </button>
          </>
        )}
      </Card>

      {showPdf && policy?.fileUrl && (
        <PdfModal url={policy.fileUrl} name={policy.fileName} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}
