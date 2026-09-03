'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Card } from '@campusgo/ui';
import { ListSkeleton } from '../../../../components/page-skeleton';
import { listLeads, type Lead, type LeadSource } from '../../../../lib/leads';

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
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<'' | LeadSource>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          {items.map((lead) => (
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
