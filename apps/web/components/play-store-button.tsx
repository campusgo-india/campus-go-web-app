import { PLAY_STORE_URL } from '../lib/site';

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#00D7FE" d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z" />
      <path fill="#FFCE00" d="m16.1 15.2-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1 .6 1 1.6 0 2.2l-3.7 2.1-.1-.1z" />
      <path fill="#F63448" d="m16.2 15.1-3.2-3.1-9.4 9.4c.4.4.9.4 1.6.1l11-6.4" />
      <path fill="#00F076" d="M16.2 8.9 5.2 2.5c-.7-.4-1.2-.3-1.6.1L13 12l3.2-3.1z" />
    </svg>
  );
}

/**
 * "Get it on Google Play" link. `dark` is the filled badge-style button for
 * light backgrounds; `light` is the outlined version for the dark footer/CTA;
 * `compact` is the small header button.
 */
export function PlayStoreButton({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'light' | 'compact';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-white px-3.5 text-sm font-semibold text-strong hover:bg-app ${className}`}
      >
        <PlayIcon className="h-4 w-4" />
        Get the app
      </a>
    );
  }
  const tone =
    variant === 'dark'
      ? 'bg-strong text-white hover:opacity-90'
      : 'border border-white/25 bg-white/10 text-white hover:bg-white/15';
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get CampusGo on Google Play"
      className={`inline-flex h-12 items-center gap-3 rounded-md px-4 ${tone} ${className}`}
    >
      <PlayIcon className="h-6 w-6" />
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
          Get it on
        </span>
        <span className="block text-sm font-semibold">Google Play</span>
      </span>
    </a>
  );
}
