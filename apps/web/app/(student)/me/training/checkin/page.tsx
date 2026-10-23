'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@campusgo/ui';
import { checkInToSession } from '../../../../../lib/training';

type State =
  | { kind: 'working' }
  | { kind: 'done'; title: string; already: boolean }
  | { kind: 'error'; message: string };

export default function CheckInPage() {
  return (
    <Suspense fallback={null}>
      <CheckIn />
    </Suspense>
  );
}

// Opened by scanning the attendance QR: marks the signed-in student present, no taps needed.
function CheckIn() {
  const params = useSearchParams();
  const sessionId = params.get('s');
  const token = params.get('t');
  const [state, setState] = useState<State>({ kind: 'working' });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!sessionId || !token) {
      setState({ kind: 'error', message: 'This link is incomplete. Scan the QR code again.' });
      return;
    }
    checkInToSession(sessionId, token)
      .then((r) => setState({ kind: 'done', title: r.sessionTitle, already: r.alreadyMarked }))
      .catch((err) =>
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not mark your attendance',
        }),
      );
  }, [sessionId, token]);

  return (
    <div className="space-y-4 pt-6">
      <Card className="space-y-3 p-8 text-center">
        {state.kind === 'working' && <p className="text-sm text-subtle">Marking your attendance…</p>}
        {state.kind === 'done' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
              ✓
            </span>
            <p className="text-lg font-semibold text-strong">
              {state.already ? 'Already marked present' : "You're marked present"}
            </p>
            <p className="text-sm text-subtle">{state.title}</p>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-2xl text-danger">
              !
            </span>
            <p className="text-lg font-semibold text-strong">Couldn&apos;t mark attendance</p>
            <p className="text-sm text-subtle">{state.message}</p>
          </>
        )}
      </Card>
      <Link
        href="/me/training"
        className="block text-center text-sm font-medium text-primary-600 hover:underline"
      >
        Go to Training
      </Link>
    </div>
  );
}
