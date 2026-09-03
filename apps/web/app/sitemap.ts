import type { MetadataRoute } from 'next';

const SITE = 'https://www.campusgoindia.com';

/** Public marketing pages only — the app (student/officer/admin) is behind auth. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = ['', '/product', '/readiness', '/mobile', '/insights', '/about', '/contact', '/privacy', '/terms'];
  return paths.map((p) => ({
    url: `${SITE}${p}`,
    lastModified: now,
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : p === '/privacy' || p === '/terms' ? 0.3 : 0.7,
  }));
}
