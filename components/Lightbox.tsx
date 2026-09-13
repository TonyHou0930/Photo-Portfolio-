'use client';
import { useEffect, useState } from 'react';
import { FlatPhoto, Project, getRelatedPhotos, exifString, exifDetails } from '@/lib/data';

function SlitReveal({ photo, slitDir }: { photo: FlatPhoto; slitDir: string }) {
  const [sharpLoaded, setSharpLoaded] = useState(false);

  return (
    <div className={`lb-slit lb-slit-open ${slitDir}`}>
      <div className="lb-hero-wrap">
        {photo.blurDataURL && (
          <img src={photo.blurDataURL} alt="" className={`lb-hero-blur${sharpLoaded ? ' lb-hero-blur-out' : ''}`} aria-hidden />
        )}
        <img src={photo.url} alt={photo.title} className={`lb-hero${sharpLoaded ? ' lb-hero-sharp' : ''}`}
          onLoad={() => setSharpLoaded(true)} />
      </div>
    </div>
  );
}

export default function Lightbox({ photo, allPhotos, projects, onClose, onNavigate }: {
  photo: FlatPhoto; allPhotos: FlatPhoto[]; projects: Project[];
  onClose: () => void; onNavigate: (file: string) => void;
}) {
  const [panelReady, setPanelReady] = useState(false);

  useEffect(() => {
    if (panelReady) return;
    const t = setTimeout(() => setPanelReady(true), 1200);
    return () => clearTimeout(t);
  }, [panelReady]);

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
  const siblings = allPhotos.filter(p => p.projectId === photo.projectId && p.file !== photo.file);

  const isPortrait = photo.width && photo.height ? photo.height > photo.width : false;
  const slitDir = isPortrait ? 'slit-portrait' : 'slit-landscape';

  return (
    <div className="lb lb-active" onClick={onClose}>
      <div className="lb-layout lb-layout-show"
        onClick={e => e.stopPropagation()}>

        <div className="lb-photo-area">
          <SlitReveal key={photo.file} photo={photo} slitDir={slitDir} />
          {exif && <div className={`lb-exif${panelReady ? ' lb-exif-show' : ''}`}>{exif}</div>}
        </div>

        <div className={`lb-panel${panelReady ? ' lb-panel-show' : ''}`}>
          <div className="lb-panel-top">
            <div className="lb-p-title">{photo.title}</div>
            <div className="lb-p-meta">
              {photo.year && <span>{photo.year}</span>}
              {photo.location && <span>◉ {photo.location}</span>}
            </div>
            {photo.story && (
              <div className="lb-p-story">{photo.story}</div>
            )}
            {exifDetails(photo).length > 0 && (
              <div className="lb-exif-grid">
                {exifDetails(photo).map(item => (
                  <div key={item.label} className="lb-exif-item">
                    <span className="lb-exif-label">{item.label}</span>
                    <span className="lb-exif-value">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
      <button className={`lb-close${panelReady ? ' lb-close-show' : ''}`} onClick={onClose}>×</button>
    </div>
  );
}
