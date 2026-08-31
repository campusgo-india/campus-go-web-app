'use client';

import { useState } from 'react';
import { SessionProvider } from '../../lib/session';
import { ConfirmProvider } from '../../components/confirm-provider';
import { AdminSidebar } from '../../components/admin-sidebar';
import { AdminTopbar } from '../../components/admin-topbar';

/** Web shell for Platform Admin / College Admin / Placement Officer —
 * fixed sidebar on desktop, a slide-in drawer below md (the wrapped phone
 * app uses this shell too for officer-facing pages like Training/Jobs). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <SessionProvider>
      <ConfirmProvider>
        <div className="flex h-screen overflow-hidden bg-app">
          <AdminSidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar onMenuClick={() => setMobileNavOpen(true)} />
            {/* Only the content scrolls; the sidebar + topbar stay fixed. */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
          </div>
        </div>
      </ConfirmProvider>
    </SessionProvider>
  );
}
