import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CampusGO — From Campus to Career';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Site-wide default social card. Individual pages can add their own
 *  `opengraph-image` later to override this. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #14245C 0%, #2E4CA6 55%, #3B6EF5 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 800 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'white',
              color: '#14245C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
            }}
          >
            C
          </div>
          CampusGO
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>From Campus to Career.</div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.75)', maxWidth: 900 }}>
            The complete placement &amp; career readiness platform for colleges and universities.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {['Readiness', 'Recruitment', 'Placements', 'Alumni'].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 22,
                fontWeight: 600,
                padding: '10px 22px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
