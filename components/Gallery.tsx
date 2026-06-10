'use client';
import { useState } from 'react';
import { FlatPhoto } from '@/lib/data';

function BlurImage({ src, alt, blur }: { src: string; alt: string; blur?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="blur-wrap">
      {blur && <img src={blur} alt="" className={`blur-bg${loaded ? ' out' : ''}`} aria-hidden />}
      <img src={src} alt={alt} loading="lazy" className={`real-img${loaded ? ' in' : ''}`}
        onLoad={() => setLoaded(true)} />
    </div>
  );
}

export default function Gallery({ photos, visible, onPhotoClick }: {
  photos: FlatPhoto[]; visible: boolean;
  onPhotoClick: (file: string) => void;
}) {
  return (
    <div className={`gallery-scroll${visible ? '' : ' off'}`}>
      <div className="gallery-columns">
        {photos.map(p => (
          <div key={p.file} className="photo-card-wrap">
            <div className="photo-card" onClick={() => onPhotoClick(p.file)}>
              <BlurImage src={p.url} alt={p.title} blur={p.blurDataURL} />
              <div className="photo-chips">
                {p.year && <span className="chip chip-year">{p.year}</span>}
                {p.location && <span className="chip chip-loc">◉ {p.location}</span>}
              </div>
              <div className="photo-hover">
                <div className="photo-hover-title">{p.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}