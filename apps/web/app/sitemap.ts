import type { MetadataRoute } from 'next';
import { MARKETING_PATHS } from '../lib/routes';

const SITE = 'https://www.campusgoindia.com';

/**
 * When each page's content last actually changed.
 *
 * This used to be `new Date()`, which stamped every build time onto all nine
 * URLs and told crawlers the whole site changed whenever anything deployed.
 * Google discounts a lastmod it finds unreliable, so an inaccurate one is
 * worse than none. Bump the entry for a page when you edit its copy; ignore
 * dependency bumps and refactors that leave the rendered text alone.
 */
const LAST_MODIFIED: Record<string, string> = {
  '/': '2026-09-24',
  '/product': '2026-09-24',
  '/insights': '2026-09-24',
  '/mobile': '2026-09-24',
  '/readiness': '2026-09-23',
  '/about': '2026-09-23',
  '/contact': '2026-09-23',
  '/privacy': '2026-09-23',
  '/terms': '2026-09-23',
};

/**
 * Public marketing pages only — the student/officer/admin app is behind auth,
 * and the tokenised links (/r/…, /alumni-register/…) are noindex by design.
 *
 * No `changeFrequency` or `priority`: Google and Bing both ignore them, so
 * they are noise that has to be kept in sync for no benefit.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_PATHS.map((path) => ({
    url: path === '/' ? SITE : `${SITE}${path}`,
    lastModified: LAST_MODIFIED[path],
  }));
}
