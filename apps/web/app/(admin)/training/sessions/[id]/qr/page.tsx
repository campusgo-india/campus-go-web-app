'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../../../components/page-skeleton';
import {
  getSession,
  getSessionQr,
  listAttendance,
  type SessionQr,
  type TrainingSession,
} from '../../../../../../lib/training';

/**
 * Dynamic attendance QR — project this on the screen. The code changes every
 * ~30 seconds so a screenshot forwarded to someone who isn't in the room stops
 * working almost immediately; students scan it with their phone camera and are
 * marked present after signing in. The count below updates live.
 */
export default function SessionQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [qr, setQr] = useState<SessionQr | null>(null);
  const [present, setPresent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshQr = useCallback(async () => {
    try {
      const next = await getSessionQr(id);
      setQr(next);
      setError(null);
      // Fetch the following token slightly before this one expires.
      const wait = Math.max(2000, new Date(next.expiresAt).getTime() - Date.now() - 1500);
      timer.current = setTimeout(refreshQr, wait);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the QR code');
      timer.current = setTimeout(refreshQr, 5000);
    }
  }, [id]);

  useEffect(() => {
    getSession(id)
      .then(setSession)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load session'));
    refreshQr();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, refreshQr]);

  // Live "present" count, polled every few seconds.
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const rows = await listAttendance(id);
        if (!stop) setPresent(rows.filter((r) => r.present).length);
      } catch {
        // keep the last count
      }
    }
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id]);

  if (!session) return error ? <p className="text-danger">{error}</p> : <ListSkeleton />;

  return (
    <div className="mx-auto max-w-xl space-y-5 text-center">
      <div className="flex items-center justify-between text-left">
        <Link
          href={`/training/sessions/${id}/attendance`}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Back to attendance
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-strong">{session.title}</h1>
        <p className="text-sm text-subtle">Scan to mark your attendance</p>
      </div>

      <Card className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 p-6">
        {qr ? (
          <QRCodeSVG value={qr.checkinUrl} size={280} level="M" marginSize={2} />
        ) : (
          <div className="h-[280px] w-[280px] animate-pulse rounded-md bg-app" />
        )}
        <p className="text-xs text-subtle">
          This code refreshes automatically. Open your phone camera and scan it, then sign in if
          asked.
        </p>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <p className="text-lg text-body">
        <span className="text-3xl font-bold text-strong">{present ?? '—'}</span> marked present
      </p>
    </div>
  );
}
