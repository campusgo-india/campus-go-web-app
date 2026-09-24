import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SwrProvider } from '../lib/swr';
import { AppSplash } from '../components/app-splash';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const SITE_URL = 'https://www.campusgoindia.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CampusGo — From Campus to Career',
    template: '%s · CampusGo',
  },
  description:
    'The complete placement & career readiness platform for colleges and universities — student data, training, recruiters, recruitment, placements, internships and alumni in one connected system.',
  applicationName: 'CampusGo',
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true },
  // No `alternates.canonical` here on purpose. A canonical set on the root
  // layout is inherited by every page that does not override it, which made
  // /login and /forgot-password declare themselves duplicates of the homepage
  // — and a noindex page canonicalising to the homepage can carry that
  // noindex across. Each indexable page sets its own canonical instead.
  openGraph: {
    type: 'website',
    siteName: 'CampusGo',
    locale: 'en_IN',
    url: SITE_URL,
    title: 'CampusGo — From Campus to Career',
    description:
      'The complete placement & career readiness platform for colleges and universities.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CampusGo — From Campus to Career',
    description:
      'The complete placement & career readiness platform for colleges and universities.',
  },
};

export const viewport: Viewport = {
  themeColor: '#3B6EF5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      {/* Browser extensions (e.g. Grammarly) inject attributes on <body> before
          hydration; suppress the resulting attribute mismatch on this element. */}
      <body className="font-sans" suppressHydrationWarning>
        <AppSplash />
        <SwrProvider>{children}</SwrProvider>
      </body>
    </html>
  );
}
