import type { MetadataRoute } from 'next';

const SITE = 'https://www.campusgoindia.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The authenticated app lives at these top-level paths (route groups add
      // no segment). Marketing lives at /product, /readiness, /mobile, /insights.
      disallow: [
        '/api/',
        '/me/',
        '/me',
        '/dashboard',
        '/students',
        '/jobs',
        '/companies',
        '/alumni',
        '/internships',
        '/training',
        '/placement',
        '/placement-policy',
        '/offer-limit',
        '/reports',
        '/analytics',
        '/notifications',
        '/settings',
        '/platform',
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
