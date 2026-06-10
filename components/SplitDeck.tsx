'use client';
import { useRef, useEffect, useState } from 'react';
import { Project, FlatPhoto } from '@/lib/data';

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

export default function SplitDeck({ project, allPhotos, onClose, onPhotoClick }: {
  project: Project; allPhotos: FlatPhoto[];
  onClose: () => void; onPhotoClick: (file: string) => void;
}) {
  const filmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    const el = filmRef.current; if (!el) return;
    const h = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  const dir = project.dir;

  return (
    <div className="sd">
      <div className="sd-story">
        <button className="sd-back" onClick={onClose}><span>←</span> Back</button>
        <div className="sd-title">{project.title}</div>
        <div className="sd-meta">
          {project.location && <span>◉ {project.location}</span>}
          {project.year && <span>{project.year}</span>}
          <span>{project.photos.length} photographs</span>
        </div>
        {project.story && <div className="sd-text">{project.story}</div>}
        <div className="sd-tags">
          {project.tags.map(t => <span key={t} className="sd-tag">#{t}</span>)}
        </div>
      </div>
      <div className="sd-film" ref={filmRef}>
        {project.photos.map(p => (
          <div key={p.file} className="sd-frame" onClick={() => onPhotoClick(p.file)}>
            <BlurImage
              src={dir ? `/photos/${dir}/${p.file}` : `/photos/${p.file}`}
              alt={p.title}
              blur={p.blurDataURL} />
            <div className="sd-frame-title">{p.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
