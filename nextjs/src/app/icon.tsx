import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#461a7a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${siteUrl}/logo.webp`}
          width={24}
          height={24}
          style={{ objectFit: 'contain' }}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
