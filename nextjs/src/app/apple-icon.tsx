import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const logoData = await fetch(
    new URL('../../public/logo.png', import.meta.url)
  ).then(r => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2e0f52',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoData as unknown as string} width={120} height={120} style={{ objectFit: 'contain' }} alt="" />
      </div>
    ),
    { ...size },
  );
}
