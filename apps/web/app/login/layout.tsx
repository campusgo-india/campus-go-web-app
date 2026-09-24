import type { Metadata } from 'next';

/**
 * The sign-in page is linked from the header and footer of every marketing
 * page, so crawlers reach it constantly. It has no content worth ranking and
 * would compete with the homepage for brand queries.
 *
 * `follow: true` because the links out of it (Terms, Privacy) are real pages;
 * only this URL should stay out of the index. A layout is needed because
 * `page.tsx` is a client component and cannot export metadata.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
