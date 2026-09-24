import type { MetadataRoute } from 'next';
import { ADMIN_PREFIXES, STUDENT_PREFIXES } from '../lib/routes';

const SITE = 'https://www.campusgoindia.com';

/**
 * Everything behind auth is disallowed; the marketing pages are open.
 *
 * The private paths come from `lib/routes.ts`, the same table the middleware
 * routes on, so a new authenticated route cannot be added to the app without
 * also being kept out of the crawl.
 *
 * Each prefix is emitted twice, anchored: `/alumni$` for the route itself and
 * `/alumni/` for everything under it. A bare `Disallow: /alumni` would be a
 * plain prefix match and would also block the public `/alumni-register/[slug]`
 * portal. `$` and `*` are honoured by Google and Bing.
 *
 * Sign-in and the tokenised capability links (/login, /reset-password/…, /r/…)
 * are intentionally absent: they carry `noindex` metadata instead, which a
 * blocked crawler would never get to read.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePrefixes = [...STUDENT_PREFIXES, ...ADMIN_PREFIXES];
  const disallow = ['/api/', ...privatePrefixes.flatMap((p) => [`${p}$`, `${p}/`])].sort();

  return {
    rules: { userAgent: '*', allow: '/', disallow },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
