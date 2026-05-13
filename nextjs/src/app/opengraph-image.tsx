import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a0730 0%, #2e0f52 45%, #461a7a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Gold top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #c9a227, #ecc44a, #c9a227)',
          }}
        />

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${siteUrl}/logo.webp`}
          width={160}
          height={160}
          style={{ objectFit: 'contain', marginBottom: '32px' }}
          alt=""
        />

        {/* Gold divider */}
        <div
          style={{
            width: '60px',
            height: '2px',
            background: '#c9a227',
            borderRadius: '2px',
            marginBottom: '32px',
          }}
        />

        {/* Church name */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '52px',
            fontWeight: '700',
            letterSpacing: '-1px',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: '900px',
          }}
        >
          Iglesia Cristiana Lirio de los Valles
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: 'rgba(255,255,255,0.60)',
            fontSize: '26px',
            marginTop: '20px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          Costa Rica · liriodelosvallescr.org
        </div>

        {/* Gold bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
