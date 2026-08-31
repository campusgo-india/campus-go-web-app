'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@campusgo/ui';
import { changePasswordPathForRole, homePathForRole } from '@campusgo/auth';
import { login } from '../../lib/auth-actions';
import { PasswordInput } from '../../components/password-input';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
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
      if (user.mustChangePassword) {
        router.push(changePasswordPathForRole(user.role));
        return;
      }
      const next = params.get('next');
      router.push(next || homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white sm:items-center sm:justify-center sm:bg-app sm:py-10">
      <div className="flex w-full flex-1 flex-col overflow-hidden sm:max-w-sm sm:flex-none sm:rounded-3xl sm:shadow-nav">
        {/* Colored hero band — logo on a branded gradient, Swiggy-style */}
        <div className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-primary px-6 pb-10 pt-14 sm:pb-8 sm:pt-10">
          <div
            className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)' }}
          />
          <div
            className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(226,128,64,0.25) 0%, rgba(255,255,255,0) 70%)' }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-nav sm:h-16 sm:w-16">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, next/image not configured */}
            <img src="/logo-mark.png" alt="CampusGo" className="h-12 w-12 object-contain sm:h-10 sm:w-10" />
          </div>
          <p className="relative mt-4 text-sm font-medium text-white/80">From Campus to Career</p>
        </div>

        {/* White sheet — form */}
        <div className="flex-1 rounded-t-3xl bg-white px-6 pb-8 pt-7 shadow-[0_-8px_24px_-16px_rgba(16,24,40,0.15)] sm:flex-none sm:rounded-t-none sm:shadow-none">
          <h1 className="text-2xl font-extrabold tracking-tight text-strong">Welcome back</h1>
          <p className="mt-1 text-sm text-subtle">Sign in to continue to CampusGo.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-strong">Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-subtle">
                  <MailIcon />
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[52px] w-full rounded-2xl border border-border bg-app px-4 py-3.5 pl-11 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
                  placeholder="you@college.edu"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-strong">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary-600 hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 text-subtle">
                  <LockIcon />
                </span>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[52px] w-full rounded-2xl border border-border bg-app px-4 py-3.5 pl-11 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              type="submit"
              className="press h-[52px] w-full rounded-2xl text-base"
              loading={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-subtle">
            By continuing you agree to CampusGo&rsquo;s{' '}
            <Link href="/terms" className="font-medium text-primary-600 hover:underline">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-primary-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  );
}
