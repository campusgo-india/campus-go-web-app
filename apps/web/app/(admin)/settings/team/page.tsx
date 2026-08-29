'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, SectionCard } from '@campusgo/ui';
import { isValidEmail, isValidPhone } from '@campusgo/shared';
import { useSession } from '../../../../lib/session';
import { PasswordInput } from '../../../../components/password-input';
import { CopyButton } from '../../../../components/copy-button';
import { useConfirm } from '../../../../components/confirm-provider';
import { listMySchools, type CollegeSchool } from '../../../../lib/courses';
import {
  createUser,
  deactivateUser,
  listUsers,
  reactivateUser,
  resetUserPassword,
  updateUser,
  type CreateUserResult,
  type TeamMember,
} from '../../../../lib/users';

const ROLE_LABEL: Record<string, string> = {
  COLLEGE_ADMIN: 'College Admin',
  PLACEMENT_OFFICER: 'Placement Officer',
  PLACEMENT_COORDINATOR: 'Placement Coordinator',
};

export default function TeamSettingsPage() {
  const confirm = useConfirm();
  const { user, loading } = useSession();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<CreateUserResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<{ member: TeamMember; tempPassword: string } | null>(
    null,
  );
  const [editProgrammesFor, setEditProgrammesFor] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setMembers(await listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    }
  }

  useEffect(() => {
    if (loading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function onDeactivate(m: TeamMember) {
    const ok = await confirm({
      title: `Deactivate ${m.fullName}?`,
      message: 'They will be signed out immediately and unable to log in until reactivated.',
      acknowledgement: 'I understand they will lose access right away.',
      confirmLabel: 'Deactivate',
      destructive: true,
    });
    if (!ok) return;
    await run(m.id, () => deactivateUser(m.id), 'Could not deactivate');
  }

  async function onReactivate(m: TeamMember) {
    await run(m.id, () => reactivateUser(m.id), 'Could not reactivate');
  }

  async function onChangeRole(m: TeamMember, role: string) {
    if (role === m.role) return;
    await run(m.id, () => updateUser(m.id, { role }), 'Could not change role');
  }

  async function onResetPassword(m: TeamMember) {
    const ok = await confirm({
      title: `Reset password for ${m.fullName}?`,
      message:
        "They'll be signed out and any password they currently have stops working immediately. A new one-time temp password is generated for you to share with them.",
      confirmLabel: 'Reset password',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(m.id);
    setError(null);
    setCreated(null);
    try {
      const { tempPassword } = await resetUserPassword(m.id);
      setResetFor({ member: m, tempPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setBusyId(null);
    }
  }

  async function run(id: string, fn: () => Promise<unknown>, fallback: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusyId(null);
    }
  }

  const active = members.filter((m) => m.isActive);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-strong">Team</h1>
          <p className="text-sm text-subtle">
            {active.length} member{active.length === 1 ? '' : 's'} · Placement Officers &
            Administrators
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings/courses" className="text-sm font-medium text-primary-600 hover:underline">
            Manage schools & programmes →
          </Link>
          <Button
            onClick={() => {
              setShowForm((s) => !s);
              setCreated(null);
            }}
            variant={showForm ? 'outline' : 'primary'}
          >
            {showForm ? 'Cancel' : 'Add member'}
          </Button>
        </div>
      </header>

      {/* One-time credentials shown right after creation */}
      {created && (
        <Card className="space-y-2 border border-success/30 bg-success/5 p-5">
          <p className="text-sm font-semibold text-strong">
            {ROLE_LABEL[created.user.role] ?? created.user.role} “{created.user.fullName}” added
          </p>
          <p className="text-sm text-body">
            {created.passwordGenerated
              ? "Share these credentials once — the temp password won't be shown again:"
              : 'Created with the password you set. Share the login below.'}
          </p>
          <div className="rounded-md bg-white p-3 text-sm">
            <p>
              <span className="text-subtle">Email:</span>{' '}
              <span className="font-medium text-strong">{created.user.email}</span>
            </p>
            {created.passwordGenerated && created.tempPassword && (
              <p className="mt-1 flex items-center gap-2">
                <span className="text-subtle">Temp password:</span>
                <code className="rounded bg-app px-1.5 py-0.5 font-mono text-strong">
                  {created.tempPassword}
                </code>
                <CopyButton value={created.tempPassword} className="px-2 py-1" />
              </p>
            )}
          </div>
          <p className="text-xs text-subtle">
            They'll be prompted to set a new password on first login.
          </p>
        </Card>
      )}

      {/* One-time credentials shown right after a password reset */}
      {resetFor && (
        <Card className="space-y-2 border border-success/30 bg-success/5 p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-strong">
              Password reset for “{resetFor.member.fullName}”
            </p>
            <button
              onClick={() => setResetFor(null)}
              aria-label="Dismiss"
              className="text-xs text-subtle hover:text-strong"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-body">
            Share this once — it won't be shown again. They'll be prompted to set a new password on
            next login.
          </p>
          <div className="rounded-md bg-white p-3 text-sm">
            <p>
              <span className="text-subtle">Email:</span>{' '}
              <span className="font-medium text-strong">{resetFor.member.email}</span>
            </p>
            <p className="mt-1 flex items-center gap-2">
              <span className="text-subtle">Temp password:</span>
              <code className="rounded bg-app px-1.5 py-0.5 font-mono text-strong">
                {resetFor.tempPassword}
              </code>
              <CopyButton value={resetFor.tempPassword} className="px-2 py-1" />
            </p>
          </div>
        </Card>
      )}

      {showForm && (
        <NewMemberForm
          onCreated={(result) => {
            setShowForm(false);
            setCreated(result);
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <SectionCard flush>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-app/60 text-xs uppercase text-subtle">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Last login</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-subtle">
                  No team members yet. Add your first.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const isSelf = m.id === user?.id;
                return (
                  <Fragment key={m.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-app/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-strong">
                        {m.fullName}
                        {isSelf && <span className="ml-1.5 text-xs text-subtle">(you)</span>}
                      </p>
                      <p className="text-xs text-subtle">
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {isSelf || !m.isActive ? (
                        <Badge tint={m.role === 'COLLEGE_ADMIN' ? 'lavender' : 'cream'}>
                          {ROLE_LABEL[m.role] ?? m.role}
                        </Badge>
                      ) : (
                        <select
                          value={m.role}
                          disabled={busyId === m.id}
                          onChange={(e) => onChangeRole(m, e.target.value)}
                          className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-strong outline-none focus:border-primary-400 disabled:opacity-50"
                        >
                          <option value="PLACEMENT_OFFICER">Placement Officer</option>
                          <option value="COLLEGE_ADMIN">College Admin</option>
                          <option value="PLACEMENT_COORDINATOR">Placement Coordinator</option>
                        </select>
                      )}
                      {m.role === 'PLACEMENT_COORDINATOR' && m.assignedProgrammes.length > 0 && (
                        <p className="mt-1 text-xs text-subtle">{m.assignedProgrammes.join(', ')}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-subtle">
                      {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      {m.isActive ? (
                        <span className="rounded-pill bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-pill bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {m.role === 'PLACEMENT_COORDINATOR' && m.isActive && (
                          <button
                            onClick={() => setEditProgrammesFor((id) => (id === m.id ? null : m.id))}
                            className="text-xs font-medium text-primary-600 hover:underline"
                          >
                            {editProgrammesFor === m.id ? 'Hide' : 'Edit programmes'}
                          </button>
                        )}
                        {!isSelf && m.isActive && (
                          <button
                            onClick={() => onResetPassword(m)}
                            disabled={busyId === m.id}
                            className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                          >
                            Reset password
                          </button>
                        )}
                        {isSelf ? null : m.isActive ? (
                          <button
                            onClick={() => onDeactivate(m)}
                            disabled={busyId === m.id}
                            className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                          >
                            {busyId === m.id ? 'Removing…' : 'Deactivate'}
                          </button>
                        ) : (
                          <button
                            onClick={() => onReactivate(m)}
                            disabled={busyId === m.id}
                            className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                          >
                            {busyId === m.id ? 'Restoring…' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editProgrammesFor === m.id && (
                    <tr className="border-b border-border">
                      <td colSpan={5} className="bg-app/30 px-5 py-4">
                        <EditProgrammesPanel
                          member={m}
                          onUpdated={() => {
                            setEditProgrammesFor(null);
                            load();
                          }}
                          onCancel={() => setEditProgrammesFor(null)}
                        />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/** Reassign the programmes a coordinator covers — the only field NewMemberForm
 * can't fix after the fact, which used to mean deleting and recreating the
 * account (losing their login) just to correct a wrong/empty assignment. */
function EditProgrammesPanel({
  member,
  onUpdated,
  onCancel,
}: {
  member: TeamMember;
  onUpdated: () => void;
  onCancel: () => void;
}) {
  const [schools, setSchools] = useState<CollegeSchool[]>([]);
  const [assigned, setAssigned] = useState<string[]>(member.assignedProgrammes);
  const [freeText, setFreeText] = useState(member.assignedProgrammes.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMySchools()
      .then(setSchools)
      .catch(() => {
        /* non-fatal: falls back to free entry if this fails */
      });
  }, []);

  const toggleProgramme = (programme: string) => {
    setAssigned((a) => (a.includes(programme) ? a.filter((b) => b !== programme) : [...a, programme]));
  };

  async function save() {
    const programmes = schools.length > 0 ? assigned : freeText.split(',').map((b) => b.trim()).filter(Boolean);
    if (programmes.length === 0) {
      setError('Pick at least one programme.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateUser(member.id, { assignedProgrammes: programmes });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update programmes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-subtle">
        Programmes {member.fullName} covers — students outside these programmes stay invisible to them.
      </p>
      {schools.length > 0 ? (
        <div className="space-y-3 rounded-md border border-border bg-white p-3">
          {schools.map((c) => (
            <div key={c.id}>
              <p className="text-xs font-semibold text-strong">{c.name}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {(c.programmes.length > 0 ? c.programmes : [c.name]).map((b) => (
                  <label key={b} className="flex items-center gap-1.5 text-sm text-body">
                    <input type="checkbox" checked={assigned.includes(b)} onChange={() => toggleProgramme(b)} />
                    {b}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <input
          className={inputCls}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Comma-separated programmes"
        />
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} loading={saving} disabled={saving}>
          {saving ? 'Saving…' : 'Save programmes'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function NewMemberForm({ onCreated }: { onCreated: (r: CreateUserResult) => void }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'PLACEMENT_OFFICER',
    phone: '',
    assignedProgrammes: [] as string[],
    freeTextProgrammes: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<CollegeSchool[]>([]);

  useEffect(() => {
    listMySchools()
      .then(setSchools)
      .catch(() => {
        /* non-fatal: programme picker just falls back to free entry if this fails */
      });
  }, []);

  // A coordinator can cover more than one programme (e.g. BBA & MBA), so this
  // is a checklist grouped by school rather than a single cascading select. A
  // school with no sub-programmes (like MBA) IS the programme — students in that
  // school have Student.programme === school name (see students CSV import) — so
  // it's listed as a single checkbox using the school's own name.
  const toggleProgramme = (programme: string) => {
    setForm((f) => ({
      ...f,
      assignedProgrammes: f.assignedProgrammes.includes(programme)
        ? f.assignedProgrammes.filter((b) => b !== programme)
        : [...f.assignedProgrammes, programme],
    }));
  };

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError(null);
    const programmes =
      schools.length > 0
        ? form.assignedProgrammes
        : form.freeTextProgrammes
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean);
    await createUser({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      role: form.role,
      phone: form.phone.trim() || undefined,
      assignedProgrammes: form.role === 'PLACEMENT_COORDINATOR' ? programmes : undefined,
      password: form.password.trim() || undefined,
    })
      .then(onCreated)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not add member'));
  }

  const emailOk = !form.email.trim() || isValidEmail(form.email);
  const phoneOk = !form.phone.trim() || isValidPhone(form.phone);
  const passwordOk = form.password.trim() === '' || form.password.trim().length >= 8;
  const programmeOk =
    form.role !== 'PLACEMENT_COORDINATOR' ||
    (schools.length > 0 ? form.assignedProgrammes.length > 0 : form.freeTextProgrammes.trim());
  const ready =
    form.fullName.trim() &&
    form.email.trim() &&
    isValidEmail(form.email) &&
    phoneOk &&
    passwordOk &&
    programmeOk;

  return (
    <Card className="space-y-4 p-5">
      <p className="text-sm font-semibold text-strong">Add a team member</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name *">
          <input className={inputCls} value={form.fullName} onChange={set('fullName')} />
        </Field>
        <Field label="Email *">
          <input className={inputCls} value={form.email} onChange={set('email')} />
          {!emailOk && <FieldError>Enter a valid email address.</FieldError>}
        </Field>
        <Field label="Role *">
          <select className={inputCls} value={form.role} onChange={set('role')}>
            <option value="PLACEMENT_OFFICER">Placement Officer</option>
            <option value="COLLEGE_ADMIN">College Admin</option>
            <option value="PLACEMENT_COORDINATOR">Placement Coordinator</option>
          </select>
        </Field>
        {form.role === 'PLACEMENT_COORDINATOR' && (
          <div className="sm:col-span-2">
            <span className="text-xs font-medium text-subtle">
              Programmes * — pick every one this coordinator covers
            </span>
            {schools.length > 0 ? (
              <div className="mt-1.5 space-y-3 rounded-md border border-border bg-white p-3">
                {schools.map((c) => (
                  <div key={c.id}>
                    <p className="text-xs font-semibold text-strong">{c.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {(c.programmes.length > 0 ? c.programmes : [c.name]).map((b) => (
                        <label key={b} className="flex items-center gap-1.5 text-sm text-body">
                          <input
                            type="checkbox"
                            checked={form.assignedProgrammes.includes(b)}
                            onChange={() => toggleProgramme(b)}
                          />
                          {b}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <input
                className={`${inputCls} mt-1.5`}
                value={form.freeTextProgrammes}
                onChange={set('freeTextProgrammes')}
                placeholder="Comma-separated, e.g. BBA, MBA"
              />
            )}
          </div>
        )}
        <Field label="Phone">
          <input
            className={inputCls}
            value={form.phone}
            onChange={set('phone')}
            placeholder="10-digit mobile"
          />
          {!phoneOk && <FieldError>Enter a valid 10-digit mobile number.</FieldError>}
        </Field>
        <Field label="Password">
          <PasswordInput
            className={inputCls}
            value={form.password}
            onChange={set('password')}
            placeholder="Leave blank to auto-generate"
            autoComplete="new-password"
          />
          {!passwordOk && <FieldError>Password must be at least 8 characters.</FieldError>}
        </Field>
      </div>
      <p className="text-xs text-subtle">
        Placement Officers manage students, companies, jobs and the ATS pipeline. College Admins can
        additionally manage the team. Placement Coordinators are read-only, scoped to their assigned
        programmes — they can see jobs posted and which of their programmes' students have applied.
        Set a password to share directly, or leave blank for a one-time temp password.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} disabled={!ready}>
        Add member
      </Button>
    </Card>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-danger">{children}</span>;
}
