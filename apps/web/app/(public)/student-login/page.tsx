'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@campusgo/shared';
import { Button, Card } from '@campusgo/ui';
import { changePasswordPathForRole } from '@campusgo/auth';
import { login, logout } from '../../../lib/auth-actions';
import { PasswordInput } from '../../../components/password-input';

/**
 * Student-only entry point — used by the wrapped native app (which only
 * ever opens /me, so this is the page an unauthenticated visit there lands
 * on; see SessionProvider's loginPath) and reachable directly on the
 * website too. A staff account (Placement Officer/Coordinator/College
 * Admin) that signs in here is immediately signed back out — this form
 * never hands them off to the admin shell.
 */
export default function StudentLoginPage() {
  return (
    <Suspense fallback={null}>
      <StudentLoginForm />
    </Suspense>
  );
}

function StudentLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== UserRole.STUDENT) {
        await logout();
        setError('This login is for students only. Placement staff should use the staff login instead.');
        return;
      }
      if (user.mustChangePassword) {
        router.push(changePasswordPathForRole(user.role));
        return;
      }
      const next = params.get('next');
      router.push(next || '/me');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold">
          <span className="text-primary-700">Campus</span>
          <span className="text-primary-400">GO</span>
        </h1>
        <p className="text-sm text-subtle">Student sign in</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-strong">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            placeholder="you@college.edu"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-strong">Password</label>
            <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">
              Forgot?
            </Link>
          </div>
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-xs text-subtle">
        Placement staff? <Link href="/login" className="text-primary-600 hover:underline">Sign in here</Link>
      </p>
    </Card>
  );
}
