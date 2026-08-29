'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@campusgo/ui';
import { PageSkeleton } from '../../../../components/page-skeleton';
import { PdfModal } from '../../../../components/pdf-modal';
import { getMyPlacementPolicy, type PlacementPolicy } from '../../../../lib/placement-policy';

export default function MyPlacementPolicyPage() {
  const [policy, setPolicy] = useState<PlacementPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    getMyPlacementPolicy()
      .then(setPolicy)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load policy'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton cardHeight={180} />;

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Placement Policy</h1>
          <p className="text-sm text-subtle">
            The rules and process your placement cell follows this season.
          </p>
        </div>
        <Link href="/me" className="shrink-0 text-sm font-medium text-primary-600 hover:underline">
          ← Home
        </Link>
      </header>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!policy?.fileUrl ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="text-sm text-subtle">
            Your placement cell hasn&apos;t uploaded a policy document yet.
          </p>
        </Card>
      ) : (
        <Card className="space-y-4 p-5">
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
                Updated{' '}
                {new Date(policy.updatedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPdf(true)}
            className="w-full rounded-lg border border-border bg-app px-4 py-3 text-left text-sm font-medium text-primary-600 hover:bg-primary-50/30"
          >
            View policy document →
          </button>
        </Card>
      )}

      {showPdf && policy?.fileUrl && (
        <PdfModal url={policy.fileUrl} name={policy.fileName} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}
