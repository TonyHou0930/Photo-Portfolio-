'use client';
import { useRef, useState } from 'react';
import { Project } from '@/lib/data';

function BlurImage({ src, alt, blur, onAspect }: {
  src: string; alt: string; blur?: string;
  onAspect?: (ratio: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="blur-wrap">
      {blur && <img src={blur} alt="" className={`blur-bg${loaded ? ' out' : ''}`} aria-hidden />}
      <img src={src} alt={alt} loading="lazy" className={`real-img${loaded ? ' in' : ''}`}
        onLoad={(e) => {
          setLoaded(true);
          const img = e.currentTarget;
          if (onAspect && img.naturalWidth && img.naturalHeight) {
            onAspect(img.naturalWidth / img.naturalHeight);
          }
        }} />
    </div>
  );
}

function aspectClass(ratio: number): string {
  if (ratio < 0.75) return 'pc-portrait';
  if (ratio > 1.4) return 'pc-cine';
  return 'pc-std';
}

function CoverCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dir = project.dir;
  const coverFile = project.cover;
  const coverPhoto = project.photos.find(p => p.file === coverFile || p.originalFile === coverFile) || project.photos[0];
  const coverUrl = coverPhoto?.url || (dir ? `/photos/${dir}/${coverFile}` : `/photos/${coverFile}`);
  const blur = coverPhoto?.blurDataURL;

  // Pre-calculate aspect ratio if dimensions are available
  const preAspect = coverPhoto?.width && coverPhoto?.height
    ? aspectClass(coverPhoto.width / coverPhoto.height) : '';

  const handleAspect = (ratio: number) => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove('pc-portrait', 'pc-cine', 'pc-std');
    el.classList.add(aspectClass(ratio));
  };

  return (
    <div className="photo-card-wrap">
      <div ref={cardRef} className={`photo-card${preAspect ? ' ' + preAspect : ''}`} onClick={onClick}>
        <BlurImage src={coverUrl} alt={project.title} blur={blur} onAspect={handleAspect} />
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
  onProjectClick: (projectId: string) => void;
}) {
  return (
    <div className={`gallery-scroll${visible ? '' : ' off'}`}>
      <div className="gallery-columns">
        {projects.map(p => (
          <CoverCard key={p.id} project={p} onClick={() => onProjectClick(p.id)} />
        ))}
      </div>
    </div>
  );
}
