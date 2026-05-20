import { ImageResponse } from 'next/og';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liriodelosvallescr.org';

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #3d1466 0%, #1a0a30 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${siteUrl}/logo.png`}
          width={340}
          height={340}
          style={{ objectFit: 'contain' }}
          alt=""
        />
      </div>
    ),
    { width: 512, height: 512 },
  );

  return response;
}
