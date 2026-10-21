'use client';

import { useState } from 'react';
import Image from 'next/image';

interface YoutubeEmbedProps {
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  className?: string;
}

export function YoutubeEmbed({ youtubeId, title, thumbnailUrl, className = '' }: YoutubeEmbedProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={`relative aspect-video w-full ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full rounded-2xl"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className={`relative aspect-video w-full group cursor-pointer ${className}`}
      aria-label={`Reproducir: ${title}`}
    >
      <Image
        src={thumbnailUrl}
        alt={title}
        fill
        className="object-cover rounded-2xl"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
        priority
      />
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-colors">
          <svg className="w-7 h-7 text-brand-700 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
