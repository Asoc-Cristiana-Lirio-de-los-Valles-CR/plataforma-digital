import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#2e0f52',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${siteUrl}/logo.webp`}
          width={130}
          height={130}
          style={{ objectFit: 'contain' }}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
