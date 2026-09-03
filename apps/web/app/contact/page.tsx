'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PHONE_REGEX } from '@campusgo/shared';
import { SiteHeader, SiteFooter } from '../../components/site-chrome';
import { submitContactEnquiry } from '../../lib/contact';

type Intent = 'CONTACT' | 'DEMO';

const FLOW_STEPS = [
  'Students',
  'Training',
  'Opportunities',
  'Applications',
  'Recruitment',
  'Placements',
  'Alumni',
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />

      <section className="bg-[#0B1330] py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">Contact Us</span>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Let&rsquo;s Connect
          </h1>
          <p className="mx-auto mt-3.5 max-w-lg text-sm leading-relaxed text-white/60">
            Ready to make your placement process more connected? Whether you&rsquo;re a college,
            university or placement team looking to explore CampusGo, we&rsquo;d be happy to
            understand your requirements and demonstrate how the platform can fit your institution.
          </p>
        </div>
      </section>

      <section id="form" className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Suspense fallback={<ContactForm initialIntent="CONTACT" />}>
              <ContactFormWithIntent />
            </Suspense>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-card bg-card p-6 shadow-card">
              <p className="text-sm font-bold text-strong">Prefer to Reach Us Directly?</p>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-subtle">Email</p>
                <a href="mailto:campusgo@campusgoindia.com" className="font-medium text-primary-600 hover:underline">
                  campusgo@campusgoindia.com
                </a>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-subtle">Website</p>
                <p className="font-medium text-strong">campusgoindia.com</p>
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-medium text-subtle">For:</p>
                <p className="mt-1 text-xs leading-relaxed text-body">
                  Product enquiries · Demo requests · Institutional partnerships · Support
                </p>
              </div>
            </div>

            <div className="rounded-card border border-tint-cream bg-tint-cream/60 p-6">
              <p className="text-sm font-bold text-strong">See CampusGo in Action</p>
              <p className="mt-1.5 text-xs leading-relaxed text-body">
                Get a walkthrough of how CampusGo can help your institution manage the complete
                journey, end to end.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {FLOW_STEPS.map((step, i) => (
                  <span key={step} className="flex items-center gap-1.5">
                    <span className="rounded-pill bg-white px-2.5 py-1 text-[11px] font-semibold text-tint-cream-fg shadow-card">
                      {step}
                    </span>
                    {i < FLOW_STEPS.length - 1 && <span className="text-tint-cream-fg/60">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ContactFormWithIntent() {
  const params = useSearchParams();
  const initialIntent: Intent = params.get('intent') === 'demo' ? 'DEMO' : 'CONTACT';
  return <ContactForm initialIntent={initialIntent} />;
}

function ContactForm({ initialIntent }: { initialIntent: Intent }) {
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [form, setForm] = useState({
    name: '',
    institution: '',
    designation: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Every field is compulsory.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const phoneOk = PHONE_REGEX.test(form.phone.replace(/[\s-]/g, ''));
  const ready =
    form.name.trim().length >= 2 &&
    form.institution.trim().length >= 2 &&
    form.designation.trim().length >= 2 &&
    emailOk &&
    phoneOk &&
    form.message.trim().length >= 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) {
      setError('Please fill in every field — a valid email and 10-digit mobile number are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitContactEnquiry({
        name: form.name.trim(),
        institution: form.institution.trim(),
        designation: form.designation.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/[\s-]/g, ''),
        message: form.message.trim(),
        source: intent,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-card bg-tint-mint p-8 text-center">
        <p className="text-lg font-bold text-tint-mint-fg">Thanks — we&rsquo;ve got it.</p>
        <p className="mt-1.5 text-sm text-body">
          {intent === 'DEMO'
            ? 'Our team will reach out to schedule your demo shortly.'
            : "Our team will get back to you shortly."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-card bg-card p-6 shadow-card sm:p-8">
      <div className="mb-5 inline-flex rounded-pill border border-border bg-app p-1">
        {(['CONTACT', 'DEMO'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setIntent(v)}
            className={`rounded-pill px-4 py-1.5 text-xs font-semibold transition ${
              intent === v ? 'bg-primary-600 text-white' : 'text-subtle hover:text-body'
            }`}
          >
            {v === 'CONTACT' ? 'Get in touch' : 'Request a demo'}
          </button>
        ))}
      </div>

      <p className="text-lg font-bold text-strong">Contact CampusGo</p>

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Name *">
          <input
            required
            className={inputCls}
            value={form.name}
            onChange={set('name')}
            placeholder="Enter your name"
          />
        </Field>
        <Field label="Institution *">
          <input
            required
            className={inputCls}
            value={form.institution}
            onChange={set('institution')}
            placeholder="College / University name"
          />
        </Field>
        <Field label="Designation *">
          <input
            required
            className={inputCls}
            value={form.designation}
            onChange={set('designation')}
            placeholder="Principal / Placement Officer / Administrator / Other"
          />
        </Field>
        <Field label="Email *">
          <input
            required
            type="email"
            className={inputCls}
            value={form.email}
            onChange={set('email')}
            placeholder="Enter your official email"
          />
        </Field>
        <Field label="Phone *">
          <input
            required
            type="tel"
            inputMode="numeric"
            className={inputCls}
            value={form.phone}
            onChange={set('phone')}
            placeholder="10-digit mobile number"
          />
        </Field>
      </div>

      <div className="mt-3.5">
        <Field label="Message *">
          <textarea
            required
            rows={4}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary-400"
            value={form.message}
            onChange={set('message')}
            placeholder="Tell us about your institution or what you would like to explore."
          />
        </Field>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={!ready || submitting}
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground shadow-nav hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {submitting ? 'Sending…' : intent === 'DEMO' ? 'Request a Demo' : 'Submit Enquiry'}
      </button>
    </form>
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
