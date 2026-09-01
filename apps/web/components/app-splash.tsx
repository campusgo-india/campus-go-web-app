'use client';

import { useEffect, useState } from 'react';

/**
 * Branded launch screen for the installed app (PWA / Android TWA-APK).
 *
 * The OS shows its own splash for a split second, then hands off to the web
 * view — which would otherwise flash the app background before React paints.
 * This overlay bridges that gap with a blue screen and a graduation-cap
 * animation. It only runs when we're actually running standalone (not a
 * regular browser tab) and only once per app session.
 */
export function AppSplash() {
  const [phase, setPhase] = useState<'hidden' | 'shown' | 'leaving'>('hidden');

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith('android-app://');
    if (!standalone) return;

    try {
      if (sessionStorage.getItem('cg_splash') === '1') return;
      sessionStorage.setItem('cg_splash', '1');
    } catch {
      /* private mode — just show it */
    }

    setPhase('shown');
    const toLeaving = setTimeout(() => setPhase('leaving'), 1500);
    const toGone = setTimeout(() => setPhase('hidden'), 2050);
    return () => {
      clearTimeout(toLeaving);
      clearTimeout(toGone);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div className={`app-splash${phase === 'leaving' ? ' app-splash--out' : ''}`} aria-hidden="true">
      <div className="app-splash__art">
        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="app-splash__ring" cx="48" cy="45" r="30" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
          <g className="app-splash__cap">
            {/* mortarboard */}
            <path d="M48 19 86 34 48 49 10 34 48 19Z" fill="#fff" />
            {/* head band under the board */}
            <path
              d="M29 41.5v11.5C29 61 37.5 66 48 66s19-5 19-13V41.5L48 49 29 41.5Z"
              fill="rgba(255,255,255,0.82)"
            />
            {/* button + tassel (swings) */}
            <g className="app-splash__tassel">
              <circle cx="48" cy="33" r="3" fill="#fff" />
              <path d="M48 33 78 34.5V54" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="78" cy="56" r="4.5" fill="#F2954A" />
            </g>
          </g>
        </svg>
      </div>
      <p className="app-splash__word">CampusGO</p>
    </div>
  );
}
