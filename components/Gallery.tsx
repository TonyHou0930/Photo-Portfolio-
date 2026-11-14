'use client';
import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Project } from '@/lib/data';

function BlurImage({ src, alt, blur, onAspect, priority, width, height }: {
  src: string; alt: string; blur?: string;
  onAspect?: (ratio: number) => void;
  priority?: boolean;
  width?: number; height?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="blur-wrap">
      {blur && !priority && <img src={blur} alt="" className={`blur-bg${loaded ? ' out' : ''}`} aria-hidden />}
      {width && height ? (
        <Image
          src={src} alt={alt}
          width={width} height={height}
          priority={priority}
          placeholder={blur ? 'blur' : 'empty'}
          blurDataURL={blur}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
          className={`real-img${loaded ? ' in' : ''}`}
          onLoad={(e) => {
            setLoaded(true);
            const img = e.currentTarget as HTMLImageElement;
            if (onAspect && img.naturalWidth && img.naturalHeight) {
              onAspect(img.naturalWidth / img.naturalHeight);
            }
          }}
        />
      ) : (
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'}
          className={`real-img${loaded ? ' in' : ''}`}
          onLoad={(e) => {
            setLoaded(true);
            const img = e.currentTarget;
            if (onAspect && img.naturalWidth && img.naturalHeight) {
              onAspect(img.naturalWidth / img.naturalHeight);
            }
          }} />
      )}
    </div>
  );
}

function aspectClass(ratio: number): string {
  if (ratio < 0.75) return 'pc-portrait';
  if (ratio > 1.4) return 'pc-cine';
  return 'pc-std';
}

export type CardRect = {
  x: number; y: number; w: number; h: number;
  src: string; blur?: string;
  cx: number; cy: number;
};

function CoverCard({ project, onClick, priority }: { project: Project; onClick: (rect: CardRect) => void; priority?: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dir = project.dir;
  const coverFile = project.cover;
  const coverPhoto = project.photos.find(p => p.file === coverFile || p.originalFile === coverFile) || project.photos[0];
  const coverUrl = coverPhoto?.url || (dir ? `/photos/${dir}/${coverFile}` : `/photos/${coverFile}`);
  const blur = coverPhoto?.blurDataURL;

  const preAspect = coverPhoto?.width && coverPhoto?.height
    ? aspectClass(coverPhoto.width / coverPhoto.height) : '';

  const handleAspect = (ratio: number) => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove('pc-portrait', 'pc-cine', 'pc-std');
    el.classList.add(aspectClass(ratio));
  };

  const handleClick = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) { onClick({ x: 0, y: 0, w: 0, h: 0, src: coverUrl, blur, cx: e.clientX, cy: e.clientY }); return; }
    const img = el.querySelector('.real-img') as HTMLImageElement | null;
    const target = img || el;
    const r = target.getBoundingClientRect();
    onClick({ x: r.left, y: r.top, w: r.width, h: r.height, src: coverUrl, blur, cx: e.clientX, cy: e.clientY });
  };

  return (
    <div className="photo-card-wrap">
      <div ref={cardRef} className={`photo-card${preAspect ? ' ' + preAspect : ''}`} onClick={handleClick}>
        <BlurImage src={coverUrl} alt={project.title} blur={blur} onAspect={handleAspect}
          priority={priority} width={coverPhoto?.width} height={coverPhoto?.height} />
        <div className="photo-chips">
          {project.year && <span className="chip chip-year">{project.year}</span>}
          {project.location && <span className="chip chip-loc">◉ {project.location}</span>}
        </div>
        <div className="photo-hover">
          <div className="photo-hover-title">{project.title}</div>
        </div>
      </div>
    </div>
  );
}

export default function Gallery({ projects, visible, onProjectClick }: {
  projects: Project[]; visible: boolean;
  onProjectClick: (projectId: string, rect?: CardRect) => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = colRef.current;
    if (!el) return;
    const cards = el.querySelectorAll('.photo-card-wrap');

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight + 50) {
        card.classList.add('revealed');
      }
    });

    el.classList.add('scroll-reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    cards.forEach(card => {
      if (!card.classList.contains('revealed')) {
        observer.observe(card);
      }
    });

    return () => observer.disconnect();
  }, [projects]);

  return (
    <div className={`gallery-scroll${visible ? '' : ' off'}`}>
      <div ref={colRef} className="gallery-columns">
        {projects.map((p, i) => (
          <CoverCard key={p.id} project={p} priority={i < 3}
            onClick={(rect) => onProjectClick(p.id, rect)} />
        ))}
      </div>
    </div>
  );
}
