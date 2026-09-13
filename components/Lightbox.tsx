'use client';
import { useEffect, useState, useRef } from 'react';
import { FlatPhoto, Project, getRelatedPhotos, exifString, exifDetails } from '@/lib/data';

type Rect = { top: number; left: number; width: number; height: number };

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

export default function Lightbox({ photo, allPhotos, projects, onClose, onNavigate, sourceRect }: {
  photo: FlatPhoto; allPhotos: FlatPhoto[]; projects: Project[];
  onClose: () => void; onNavigate: (file: string) => void;
  sourceRect?: Rect | null;
}) {
  const initRect = useRef(sourceRect || null);
  const initFile = useRef(photo.file);
  const ghostRef = useRef<HTMLDivElement>(null);
  const [flyDone, setFlyDone] = useState(!sourceRect);
  const [bgReady, setBgReady] = useState(!sourceRect);
  const [panelReady, setPanelReady] = useState(false);

  useEffect(() => {
    const src = initRect.current;
    if (!src) return;
    const ghost = ghostRef.current;
    if (!ghost) { setFlyDone(true); setBgReady(true); return; }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ratio = (photo.width && photo.height) ? photo.width / photo.height : 4 / 3;
    const isMobile = vw <= 640;
    const panelW = isMobile ? 0 : 320;
    const maxH = vh * 0.85;
    const maxW = (vw - panelW) * 0.9;

    let fw: number, fh: number;
    if (maxW / maxH > ratio) { fh = maxH; fw = fh * ratio; }
    else { fw = maxW; fh = fw / ratio; }

    const ft = (vh - fh) / 2;
    const fl = (vw - panelW - fw) / 2;

    requestAnimationFrame(() => {
      setBgReady(true);
      ghost.style.transition = 'all .5s cubic-bezier(.4,0,.2,1)';
      ghost.style.top = ft + 'px';
      ghost.style.left = fl + 'px';
      ghost.style.width = fw + 'px';
      ghost.style.height = fh + 'px';
    });

    const tid = setTimeout(() => setFlyDone(true), 550);
    return () => clearTimeout(tid);
  }, []);

  useEffect(() => {
    if (!flyDone) return;
    const delay = initRect.current ? 200 : 1200;
    const t = setTimeout(() => setPanelReady(true), delay);
    return () => clearTimeout(t);
  }, [flyDone]);

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
  const isInitialPhoto = photo.file === initFile.current && !!initRect.current;

  return (
    <div className="lb"
      style={initRect.current ? {
        background: bgReady ? 'rgba(0,0,0,.96)' : 'transparent',
        transition: 'background .5s cubic-bezier(.4,0,.2,1)',
      } : undefined}
      onClick={onClose}>

      {!flyDone && initRect.current && (
        <div ref={ghostRef} className="lb-ghost"
          style={{
            top: initRect.current.top,
            left: initRect.current.left,
            width: initRect.current.width,
            height: initRect.current.height,
          }}>
          {photo.blurDataURL && <img src={photo.blurDataURL} alt="" aria-hidden />}
          <img src={photo.url} alt={photo.title} />
        </div>
      )}

      {flyDone && (
        <div className="lb-layout lb-layout-show"
          onClick={e => e.stopPropagation()}>

          <div className="lb-photo-area">
            {isInitialPhoto ? (
              <div className="lb-hero-wrap">
                <img src={photo.url} alt={photo.title} className="lb-hero lb-hero-sharp" />
              </div>
            ) : (
              <SlitReveal key={photo.file} photo={photo} slitDir={slitDir} />
            )}
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
      )}
      <button className={`lb-close${panelReady ? ' lb-close-show' : ''}`} onClick={onClose}>×</button>
    </div>
  );
}
