import type { Metadata } from 'next';

/**
 * Password recovery and the tokenised capability links live in this group:
 * /forgot-password, /reset-password/[token], /alumni-register/[slug] and
 * /employer-feedback/[token].
 *
 * None of them should ever appear in search results — a reset or feedback URL
 * is a single-use secret, and an indexed alumni-registration slug invites
 * traffic a college did not invite. They are left crawlable rather than
 * blocked in robots.txt on purpose: a blocked crawler never reads the
 * noindex, and can still index a bare URL that something links to.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
