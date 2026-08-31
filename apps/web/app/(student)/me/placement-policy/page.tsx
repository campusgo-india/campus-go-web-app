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
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-cream text-tint-cream-fg">
            <PolicyIcon />
          </span>
          <p className="text-sm text-subtle">
            Your placement cell hasn&apos;t uploaded a policy document yet.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-card shadow-card">
          <div className="bg-gradient-primary p-5 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
              <PolicyIcon />
            </span>
            <p className="mt-3 text-sm font-medium text-white/80">Current season</p>
            <p className="mt-0.5 text-lg font-bold">Placement Policy</p>
          </div>
          <div className="space-y-4 bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-tint-rose text-tint-rose-fg">
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
              className="w-full rounded-lg bg-gradient-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-nav hover:opacity-95"
            >
              View policy document →
            </button>
          </div>
        </div>
      )}

      {showPdf && policy?.fileUrl && (
        <PdfModal url={policy.fileUrl} name={policy.fileName} onClose={() => setShowPdf(false)} />
      )}
    </div>
  );
}

function PolicyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
      <path d="M9 4h6a2 2 0 0 1 2 2v13a1 1 0 0 1-1.45.9L12 18.2l-3.55 1.7A1 1 0 0 1 7 19V6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
    </svg>
  );
}
