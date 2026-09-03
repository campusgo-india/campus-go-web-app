import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact & Demo',
  description:
    'Talk to the CampusGO team or request a demo — we’ll walk through how the platform fits your institution’s placement process.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
