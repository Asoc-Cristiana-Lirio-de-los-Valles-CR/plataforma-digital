import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  // Return pre-generated static icon (generated via sharp during setup)
  // Falls back to a solid-color icon if the file is missing
  try {
    const file = readFileSync(join(process.cwd(), 'public', 'apple-touch-icon.png'));
    return new Response(file, { headers: { 'Content-Type': 'image/png' } });
  } catch {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2e0f52' }} />
      ),
      { ...size },
    );
  }
}
