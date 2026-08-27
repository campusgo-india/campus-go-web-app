'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { homePathForRole } from '@campusgo/auth';
import { Button, Card } from '@campusgo/ui';
import { changePassword } from '../../../../lib/auth-actions';
import { useSession } from '../../../../lib/session';
import { PasswordInput } from '../../../../components/password-input';

/**
 * College Admin / Placement Officer / Placement Coordinator's own password
 * change — reachable both voluntarily (topbar link) and after a forced reset
 * (mustChangePassword, e.g. a fresh College Admin account or a "Reset
 * password" from Team settings). Mirrors /me/change-password, which is
 * student-only and unreachable from this shell.
 */
export default function AdminChangePasswordPage() {
  const router = useRouter();
  const { user } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const forced = user?.mustChangePassword ?? false;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(current, next);
      router.replace(user ? homePathForRole(user.role) : '/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-strong">
          {forced ? 'Set your password' : 'Change password'}
        </h1>
        <p className="text-sm text-subtle">
          {forced
            ? 'You signed in with a temporary password. Choose a new one to continue.'
            : 'Update the password for your account.'}
        </p>
      </header>

      <Card className="space-y-4 p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label={forced ? 'Temporary password' : 'Current password'}
            value={current}
            onChange={setCurrent}
            placeholder="••••••••"
          />
          <Field
            label="New password"
            value={next}
            onChange={setNext}
            placeholder="At least 8 characters"
          />
          <Field
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter new password"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {loading ? 'Saving…' : 'Save password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-strong">{label}</label>
      <PasswordInput
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-border bg-white px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
