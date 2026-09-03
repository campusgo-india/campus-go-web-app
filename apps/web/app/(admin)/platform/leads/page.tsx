'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { useConfirm } from '../../../../components/confirm-provider';
import {
  deleteLead,
  listLeads,
  updateLead,
  type Lead,
  type LeadPatch,
  type LeadSource,
} from '../../../../lib/leads';

const FILTERS: { value: '' | LeadSource; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'CONTACT', label: 'Contact' },
  { value: 'DEMO', label: 'Demo requests' },
];

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PlatformLeadsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<'' | LeadSource>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (s: '' | LeadSource) => {
    setLoading(true);
    setError(null);
    try {
      const { items, total } = await listLeads(s);
      setItems(items);
      setTotal(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(source);
  }, [source, load]);

  async function saveEdit(id: string, patch: LeadPatch) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateLead(id, patch);
      setItems((xs) => xs.map((x) => (x.id === id ? updated : x)));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(lead: Lead) {
    const ok = await confirm({
      title: `Delete ${lead.name}'s lead?`,
      message: `${lead.institution} · ${lead.email}\n\nThis permanently removes the enquiry.`,
      confirmLabel: 'Delete lead',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(lead.id);
    setError(null);
    try {
      await deleteLead(lead.id);
      setItems((xs) => xs.filter((x) => x.id !== lead.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete lead');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-strong">Leads</h1>
        <p className="text-sm text-subtle">
          Enquiries submitted through the marketing site&rsquo;s Contact / Request-a-demo form.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'ALL'}
            onClick={() => setSource(f.value)}
            className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
              source === f.value ? 'bg-primary-600 text-white' : 'bg-white text-body hover:bg-primary-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        {!loading && (
          <span className="ml-1 text-sm text-subtle">
            {total} {total === 1 ? 'lead' : 'leads'}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-subtle">No leads yet.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((lead) =>
            editing === lead.id ? (
              <LeadEditCard
                key={lead.id}
                lead={lead}
                saving={busyId === lead.id}
                onCancel={() => setEditing(null)}
                onSave={(patch) => saveEdit(lead.id, patch)}
              />
            ) : (
              <Card key={lead.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-strong">{lead.name}</p>
                      <Badge tint={lead.source === 'DEMO' ? 'cream' : 'lavender'}>
                        {lead.source === 'DEMO' ? 'Demo' : 'Contact'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-subtle">
                      {lead.designation} · {lead.institution}
                    </p>
                  </div>
                  <span className="text-xs text-subtle">{fmt(lead.createdAt)}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                  <a href={`mailto:${lead.email}`} className="font-medium text-primary-600 hover:underline">
                    {lead.email}
                  </a>
                  <a href={`tel:${lead.phone}`} className="font-medium text-primary-600 hover:underline">
                    {lead.phone}
                  </a>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-md bg-app p-3 text-sm leading-relaxed text-body">
                  {lead.message}
                </p>

                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(lead.id)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === lead.id}
                    onClick={() => remove(lead)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary-400';

function LeadEditCard({
  lead,
  saving,
  onCancel,
  onSave,
}: {
  lead: Lead;
  saving: boolean;
  onCancel: () => void;
  onSave: (patch: LeadPatch) => void;
}) {
  const [form, setForm] = useState({
    name: lead.name,
    institution: lead.institution,
    designation: lead.designation,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source: lead.source,
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid =
    form.name.trim().length >= 2 &&
    form.institution.trim().length >= 2 &&
    form.designation.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    /^(?:\+?91)?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, '')) &&
    form.message.trim().length >= 10;

  return (
    <Card className="space-y-3 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input className={inputCls} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Institution">
          <input className={inputCls} value={form.institution} onChange={set('institution')} />
        </Field>
        <Field label="Designation">
          <input className={inputCls} value={form.designation} onChange={set('designation')} />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Type">
          <select className={inputCls} value={form.source} onChange={set('source')}>
            <option value="CONTACT">Contact</option>
            <option value="DEMO">Demo request</option>
          </select>
        </Field>
      </div>
      <Field label="Message">
        <textarea
          rows={3}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
          value={form.message}
          onChange={set('message')}
        />
      </Field>
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={saving}
          disabled={!valid}
          onClick={() =>
            onSave({
              name: form.name.trim(),
              institution: form.institution.trim(),
              designation: form.designation.trim(),
              email: form.email.trim(),
              phone: form.phone.replace(/[\s-]/g, ''),
              message: form.message.trim(),
              source: form.source,
            })
          }
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
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
