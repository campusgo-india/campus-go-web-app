/**
 * The route tables that decide what is reachable and what is crawlable.
 *
 * `middleware.ts` and `app/robots.ts` both read from here on purpose. They used
 * to keep private copies, which drifted: `/applications` and `/feedback` were
 * added to the admin shell but never to the disallow list, so they stayed
 * crawlable. Adding an authenticated route to ADMIN_PREFIXES now keeps it out
 * of the crawl automatically.
 */

/** Mobile student shell. Everything under /me requires a STUDENT session. */
export const STUDENT_PREFIXES = ['/me'];

/**
 * Desktop officer/admin shell. Route groups add no URL segment, so these are
 * the real top-level paths. Keep sorted — it is a disallow list as much as a
 * routing table.
 */
export const ADMIN_PREFIXES = [
  '/alumni',
  '/analytics',
  '/applications',
  '/companies',
  '/dashboard',
  '/feedback',
  '/internships',
  '/jobs',
  '/notifications',
  '/offer-limit',
  '/placement',
  '/placement-policy',
  '/platform',
  '/reports',
  '/settings',
  '/students',
  '/training',
];

/** Public marketing pages — the only URLs we want crawled and indexed. */
export const MARKETING_PATHS = [
  '/',
  '/product',
  '/readiness',
  '/mobile',
  '/insights',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

/**
 * Reachable without a session but never worth indexing: sign-in, password
 * recovery, and the tokenised capability links.
 *
 * These are deliberately NOT in robots.txt. A disallowed URL can still be
 * indexed without its content when something links to it, and a crawler that
 * is blocked never sees the noindex. Letting them be crawled and serving
 * `noindex` is what actually keeps them out of the index — see the `robots`
 * metadata on `app/login/layout.tsx` and `app/(public)/layout.tsx`.
 */
export const PUBLIC_NOINDEX_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/alumni-register',
  '/employer-feedback',
];
