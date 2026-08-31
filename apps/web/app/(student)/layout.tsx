import { SessionProvider } from '../../lib/session';
import { ConfirmProvider } from '../../components/confirm-provider';
import { MobileBottomNav } from '../../components/mobile-bottom-nav';
import { StudentBrandHeader } from '../../components/student-brand-header';
import { TrainingFeedbackModal } from '../../components/training-feedback-modal';

/** Mobile-first shell for the Student experience (PWA-installable). */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        <div className="mx-auto flex min-h-screen max-w-md flex-col bg-app">
          <StudentBrandHeader />
          <main className="flex-1 px-5 pb-24 pt-3">{children}</main>
          <MobileBottomNav />
          <TrainingFeedbackModal />
        </div>
      </ConfirmProvider>
    </SessionProvider>
  );
}
