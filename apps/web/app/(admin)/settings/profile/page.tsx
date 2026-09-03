'use client';

import Link from 'next/link';
import { Card } from '@campusgo/ui';
import { useSession } from '../../../../lib/session';
import { PageSkeleton } from '../../../../components/page-skeleton';

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  COLLEGE_ADMIN: 'College Admin',
  PLACEMENT_OFFICER: 'Placement Officer',
  PLACEMENT_COORDINATOR: 'Placement Coordinator',
  MANAGEMENT: 'Management',
  TRAINING: 'Training',
  STUDENT: 'Student',
};

function roleLabel(role: string): string {
  return (
    ROLE_LABELS[role] ??
    role
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

/** Read-only summary of the signed-in staff account, plus a link to change
 *  the password. Account details themselves are managed by the College Admin
 *  from Settings → Team. */
export default function AdminProfilePage() {
  const { user, loading } = useSession();

  if (loading || !user) return <PageSkeleton />;

  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: user.fullName },
    { label: 'Email', value: user.email },
    { label: 'Role', value: roleLabel(user.role) },
  ];
  if (user.college?.name) rows.push({ label: 'College', value: user.college.name });
  if (user.isCollegeHead) rows.push({ label: 'College Head', value: 'Yes' });
  if (user.assignedProgrammes?.length) {
    rows.push({ label: 'Assigned programmes', value: user.assignedProgrammes.join(', ') });
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-strong">Profile</h1>
        <p className="text-sm text-subtle">Your account details.</p>
      </header>

      <Card className="p-0">
        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <dt className="text-sm text-subtle">{r.label}</dt>
              <dd className="text-right text-sm font-medium text-strong">{r.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/settings/change-password" className="font-medium text-primary-600 hover:underline">
          Change password →
        </Link>
      </div>

      <p className="text-xs text-subtle">
        Need to update your name or email? Ask your College Admin to change it from Settings → Team.
      </p>
    </div>
  );
}
