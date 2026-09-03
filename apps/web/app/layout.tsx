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
    default: 'CampusGO — From Campus to Career',
    template: '%s · CampusGO',
  },
  description:
    'The complete placement & career readiness platform for colleges and universities — student data, training, recruiters, recruitment, placements, internships and alumni in one connected system.',
  applicationName: 'CampusGO',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'CampusGO',
    locale: 'en_IN',
    url: SITE_URL,
    title: 'CampusGO — From Campus to Career',
    description:
      'The complete placement & career readiness platform for colleges and universities.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CampusGO — From Campus to Career',
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
