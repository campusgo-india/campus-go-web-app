'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Switch } from '@campusgo/ui';
import { DetailSkeleton } from '../../../../../../components/page-skeleton';
import { getCollege, type College } from '../../../../../../lib/colleges';
import {
  getEmailSettings,
  sendTestEmail,
  setEmailEnabled,
  updateEmailSettings,
  type EmailSettings,
} from '../../../../../../lib/college-email';

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

export default function CollegeEmailSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [college, setCollege] = useState<College | null>(null);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [c, s] = await Promise.all([getCollege(id), getEmailSettings(id)]);
      setCollege(c);
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <DetailSkeleton />;
  if (!college || !settings) {
    return <p className="text-danger">{error ?? 'College not found'}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/platform/colleges" className="text-sm text-primary-600 hover:underline">
          ← Colleges
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-strong">Email settings</h1>
        <p className="text-sm text-subtle">{college.name}</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <SmtpForm collegeId={id} settings={settings} onSaved={(s) => setSettings(s)} />

      <TestEmailPanel
        collegeId={id}
        settings={settings}
        defaultRecipient={college.contactEmail}
        onVerified={(s) => setSettings(s)}
      />

      <EnableSwitch collegeId={id} settings={settings} onChanged={(s) => setSettings(s)} />
    </div>
  );
}

function SmtpForm({
  collegeId,
  settings,
  onSaved,
}: {
  collegeId: string;
  settings: EmailSettings;
  onSaved: (s: EmailSettings) => void;
}) {
  const [host, setHost] = useState(settings.smtpHost ?? '');
  const [port, setPort] = useState(String(settings.smtpPort ?? 587));
  const [secure, setSecure] = useState(settings.smtpSecure);
  const [user, setUser] = useState(settings.smtpUser ?? '');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState(settings.fromEmail ?? '');
  const [fromName, setFromName] = useState(settings.fromName ?? '');
  const [replyTo, setReplyTo] = useState(settings.replyTo ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = host.trim() && port.trim() && user.trim() && fromEmail.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateEmailSettings(collegeId, {
        smtpHost: host.trim(),
        smtpPort: Number(port),
        smtpSecure: secure,
        smtpUser: user.trim(),
        smtpPassword: password.trim() || undefined,
        fromEmail: fromEmail.trim(),
        fromName: fromName.trim() || undefined,
        replyTo: replyTo.trim() || undefined,
      });
      setPassword('');
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-strong">SMTP configuration</h2>
        <p className="mt-1 text-xs text-subtle">
          This college's own mail server. If left unconfigured or disabled, notification emails
          send from the platform's default address instead.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="SMTP host *">
          <input
            className={inputCls}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.office365.com"
          />
        </Field>
        <Field label="Port *">
          <input
            className={inputCls}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="587"
            inputMode="numeric"
          />
        </Field>
        <Field label="Username *">
          <input
            className={inputCls}
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="placements@college.edu"
          />
        </Field>
        <Field label={settings.hasPassword ? 'Password (saved — leave blank to keep)' : 'Password *'}>
          <input
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={settings.hasPassword ? '••••••••' : ''}
          />
        </Field>
        <Field label="From email *">
          <input
            className={inputCls}
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="placements@college.edu"
          />
        </Field>
        <Field label="From name">
          <input
            className={inputCls}
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="College Placements"
          />
        </Field>
        <Field label="Reply-to">
          <input
            className={inputCls}
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="placements@college.edu"
          />
        </Field>
        <label className="flex items-center gap-2 pt-6 text-sm text-body">
          <input
            type="checkbox"
            checked={secure}
            onChange={(e) => setSecure(e.target.checked)}
            className="h-4 w-4"
          />
          Use SSL (port 465) instead of STARTTLS (587)
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={save} loading={saving} disabled={!ready}>
        Save settings
      </Button>
    </Card>
  );
}

function TestEmailPanel({
  collegeId,
  settings,
  defaultRecipient,
  onVerified,
}: {
  collegeId: string;
  settings: EmailSettings;
  defaultRecipient: string;
  onVerified: (s: EmailSettings) => void;
}) {
  const [to, setTo] = useState(defaultRecipient);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  async function run() {
    setSending(true);
    setResult(null);
    try {
      const res = await sendTestEmail(collegeId, to.trim() || undefined);
      setResult(res);
      if (res.success) {
        onVerified({ ...settings, verifiedAt: new Date().toISOString(), lastTestError: null });
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Send failed' });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div>
        <h2 className="text-sm font-semibold text-strong">Send a test email</h2>
        <p className="mt-1 text-xs text-subtle">
          Required before enabling — confirms the SMTP settings above actually work.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 space-y-1">
          <span className="text-xs font-medium text-subtle">Send to</span>
          <input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={run} loading={sending} disabled={!settings.hasPassword}>
          Send test email
        </Button>
      </div>
      {result?.success && (
        <p className="text-sm text-success">Test email sent successfully.</p>
      )}
      {result && !result.success && (
        <p className="text-sm text-danger">Failed: {result.error ?? 'Unknown error'}</p>
      )}
      {settings.verifiedAt && (
        <p className="text-xs text-subtle">
          Last verified {new Date(settings.verifiedAt).toLocaleString()}.
        </p>
      )}
    </Card>
  );
}

function EnableSwitch({
  collegeId,
  settings,
  onChanged,
}: {
  collegeId: string;
  settings: EmailSettings;
  onChanged: (s: EmailSettings) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEnable = !!settings.verifiedAt;

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      onChanged(await setEmailEnabled(collegeId, next));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-strong">Enable college email</h2>
        <p className="mt-1 text-xs text-subtle">
          {canEnable
            ? 'When on, this college\'s notification emails send from the address above instead of the platform default.'
            : 'Send a successful test email above to unlock this.'}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <Switch
        checked={settings.enabled}
        onCheckedChange={toggle}
        disabled={busy || !canEnable}
        aria-label="Enable college email"
      />
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-subtle">{label}</span>
      {children}
    </label>
  );
}
