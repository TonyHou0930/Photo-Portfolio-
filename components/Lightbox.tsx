'use client';
import { useEffect, useMemo } from 'react';
import { FlatPhoto, Project, PortfolioData, getRelatedPhotos, exifString } from '@/lib/data';

export default function Lightbox({ photo, allPhotos, projects, onClose, onNavigate }: {
  photo: FlatPhoto; allPhotos: FlatPhoto[]; projects: Project[];
  onClose: () => void; onNavigate: (file: string) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const exif = exifString(photo);
  const related = getRelatedPhotos(photo, allPhotos);
  const project = projects.find(p => p.id === photo.projectId);
  const sharedTag = (p: FlatPhoto) => {
    const shared = p.tags.filter(t => photo.tags.includes(t));
    return shared.length ? '#' + shared[0] : '';
  };

  // Same-project photos (for browsing within project)
  const siblings = allPhotos.filter(p => p.projectId === photo.projectId && p.file !== photo.file);

  return (
    <div className="lb" onClick={onClose}>
      <div className="lb-layout" onClick={e => e.stopPropagation()}>

        {/* Left: image + EXIF */}
        <div className="lb-photo-area">
          <img src={photo.url} alt={photo.title} />
          {exif && <div className="lb-exif">{exif}</div>}
        </div>

        {/* Right: info panel */}
        <div className="lb-panel">
          <div className="lb-panel-top">
            <div className="lb-p-title">{photo.title}</div>
            <div className="lb-p-meta">
              {photo.year && <span>{photo.year}</span>}
              {photo.location && <span>◉ {photo.location}</span>}
            </div>
            {project?.story && (
              <div className="lb-p-story">{project.story}</div>
            )}
            {exif && <div className="lb-p-exif">{exif}</div>}
          </div>

          {/* Same project photos */}
          {siblings.length > 0 && (
            <div className="lb-section">
              <div className="lb-sec-label">{project?.title || 'Project'}</div>
              <div className="lb-thumbs">
                {siblings.slice(0, 6).map(s => (
                  <div key={s.file} className="lb-thumb" onClick={() => onNavigate(s.file)}>
                    <img src={s.url} alt={s.title} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-project related */}
          {related.length > 0 && (
            <div className="lb-section">
              <div className="lb-sec-label">Related</div>
              <div className="lb-related-row">
                {related.map(r => (
                  <div key={r.file} className="lb-rel-node" onClick={() => onNavigate(r.file)}>
                    <div className="lb-rel-line" />
                    <img src={r.url} alt={r.title} loading="lazy" />
                    <div className="lb-rel-info">
                      <span className="lb-rel-title">{r.title}</span>
                      <span className="lb-rel-tag">{sharedTag(r)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <button className="lb-close" onClick={onClose}>×</button>
    </div>
  );
}
