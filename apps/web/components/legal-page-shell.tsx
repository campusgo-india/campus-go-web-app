import Link from 'next/link';

/** Shared chrome for standalone legal pages (Privacy, Terms) — same header/
 * footer language as the marketing homepage, so they don't feel bolted on. */
export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-app">
      <header className="bg-[#0B1330]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="text-primary-300">Campus</span>
            <span className="text-primary-400">GO</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white/95 hover:bg-white/15"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-strong">{title}</h1>
        <p className="mt-2 text-sm text-subtle">Last updated {updated}</p>
        <div className="prose-legal mt-10 space-y-8">{children}</div>
      </main>

      <footer className="bg-[#0B1330] px-6 py-7">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <span className="text-xs text-white/35">
            © {new Date().getFullYear()} CampusGO. All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-white/50 hover:text-white/80">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-white/50 hover:text-white/80">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** One numbered section: a heading plus prose/list children. */
export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-strong">
        {n}. {title}
      </h2>
      <div className="mt-2.5 space-y-3 text-sm leading-relaxed text-body">{children}</div>
    </section>
  );
}
