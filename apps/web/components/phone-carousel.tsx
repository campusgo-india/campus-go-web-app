'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PhoneShot, type PhoneShotData } from './site-sections';

/**
 * Horizontal phone carousel — shows ~3 screens at a time on desktop (2 on
 * tablet, 1 on mobile with a peek of the next). Scroll-snap track + arrow
 * buttons that page by one viewport; swipeable on touch.
 */
export function PhoneCarousel({ shots }: { shots: PhoneShotData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shots.map((s) => (
          <figure
            key={s.src}
            className="flex w-[78%] shrink-0 snap-start flex-col items-center sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
          >
            <PhoneShot src={s.src} alt={s.alt} />
            <figcaption className="mt-3 text-center text-xs text-subtle">{s.caption}</figcaption>
          </figure>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous"
        onClick={() => page(-1)}
        disabled={atStart}
        className="absolute -left-3 top-[42%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-strong shadow-card transition hover:bg-app disabled:pointer-events-none disabled:opacity-0 sm:flex"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => page(1)}
        disabled={atEnd}
        className="absolute -right-3 top-[42%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-strong shadow-card transition hover:bg-app disabled:pointer-events-none disabled:opacity-0 sm:flex"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
