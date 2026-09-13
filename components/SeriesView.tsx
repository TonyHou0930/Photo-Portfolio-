'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Project, PhotoItem } from '@/lib/data';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?/<>[]{}=+~^';

function useScrambleText(target: string, active: boolean, onDone?: () => void) {
  const [text, setText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);
  useEffect(() => {
    if (!active) { stop(); return; }
    let frame = 0;
    const len = target.length;
    const totalFrames = Math.max(len * 3, 20);
    intervalRef.current = setInterval(() => {
      frame++;
      const resolved = Math.floor((frame / totalFrames) * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (target[i] === ' ') { out += ' '; continue; }
        if (i < resolved) { out += target[i]; }
        else { out += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]; }
      }
      setText(out);
      if (resolved >= len) {
        stop();
        setText(target);
        onDone?.();
      }
    }, 35);
    return stop;
  }, [target, active, stop, onDone]);
  return text;
}

function ScrambleValue({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);
  const [scrambling, setScrambling] = useState(false);
  const prevValue = useRef(value);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (value === prevValue.current) return;
    prevValue.current = value;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScrambling(true);
    let frame = 0;
    const len = value.length;
    const totalFrames = Math.max(len * 3, 14);
    intervalRef.current = setInterval(() => {
      frame++;
      const resolved = Math.floor((frame / totalFrames) * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (value[i] === ' ' || value[i] === ',') { out += value[i]; continue; }
        if (i < resolved) out += value[i];
        else out += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setDisplay(out);
      if (resolved >= len) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setDisplay(value);
        setScrambling(false);
      }
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [value]);

  return <span className={scrambling ? 'sv-meta-scramble' : ''}>{display}</span>;
}

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

interface MiniNode {
  id: string; x: number; y: number; r: number;
  label: string; type: 'photo' | 'tag';
  file?: string;
}
interface MiniEdge { a: string; b: string; }

function buildMiniGraph(photos: PhotoItem[], w: number, h: number) {
  const nodes: MiniNode[] = [];
  const edges: MiniEdge[] = [];
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) * 0.32;

  photos.forEach((p, i) => {
    const a = (i / photos.length) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: 'p:' + p.file, x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius,
      r: 5, label: p.title || p.file, type: 'photo', file: p.file,
    });
  });

  const tagMap = new Map<string, string[]>();
  photos.forEach(p => {
    (p.tags || []).forEach(t => {
      if (!tagMap.has(t)) tagMap.set(t, []);
      tagMap.get(t)!.push(p.file);
    });
  });

  const tagRadius = Math.min(w, h) * 0.15;
  let tagIdx = 0;
  const usedTags = [...tagMap.entries()].filter(([, files]) => files.length >= 2);
  usedTags.forEach(([tag, files]) => {
    const a = (tagIdx / Math.max(usedTags.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const tid = 't:' + tag;
    nodes.push({
      id: tid, x: cx + Math.cos(a) * tagRadius, y: cy + Math.sin(a) * tagRadius,
      r: 2.5, label: tag, type: 'tag',
    });
    files.forEach(f => edges.push({ a: 'p:' + f, b: tid }));
    tagIdx++;
  });

  photos.forEach((p, i) => {
    if (i < photos.length - 1) {
      edges.push({ a: 'p:' + p.file, b: 'p:' + photos[i + 1].file });
    }
  });

  return { nodes, edges };
}

function drawMiniGraph(
  ctx: CanvasRenderingContext2D, nodes: MiniNode[], edges: MiniEdge[],
  w: number, h: number, activeFile: string | null, hoverNode: string | null,
  theme?: { ink: string; node: string }
) {
  const ink = theme?.ink || '0,0,0';
  const nc = theme?.node || '#2c2824';
  ctx.clearRect(0, 0, w, h);

  const connectedToActive = new Set<string>();
  if (activeFile) {
    const activeId = 'p:' + activeFile;
    connectedToActive.add(activeId);
    edges.forEach(e => {
      if (e.a === activeId) connectedToActive.add(e.b);
      if (e.b === activeId) connectedToActive.add(e.a);
    });
  }

  edges.forEach(e => {
    const a = nodes.find(n => n.id === e.a);
    const b = nodes.find(n => n.id === e.b);
    if (!a || !b) return;
    const lit = connectedToActive.has(e.a) && connectedToActive.has(e.b);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = lit ? `rgba(${ink},.35)` : `rgba(${ink},.1)`;
    ctx.lineWidth = lit ? 1 : 0.5;
    ctx.stroke();
  });

  nodes.forEach(n => {
    const isActive = n.file === activeFile;
    const isHover = n.id === hoverNode;
    const isConnected = connectedToActive.has(n.id);

    const r = n.r + (isActive ? 4 : isHover ? 2 : 0);
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

    if (n.type === 'photo') {
      if (isActive) {
        ctx.fillStyle = nc;
        ctx.shadowColor = nc;
        ctx.shadowBlur = 16;
      } else if (isHover) {
        ctx.fillStyle = `rgba(${ink},.8)`;
        ctx.shadowColor = `rgba(${ink},.4)`;
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = isConnected ? `rgba(${ink},.55)` : `rgba(${ink},.2)`;
        ctx.shadowBlur = 0;
      }
    } else {
      if (isHover) {
        ctx.fillStyle = `rgba(${ink},.65)`;
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = isConnected ? `rgba(${ink},.4)` : `rgba(${ink},.12)`;
        ctx.shadowBlur = 0;
      }
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    const showLabel = isActive || isHover || isConnected;
    if (showLabel) {
      const isPhoto = n.type === 'photo';
      ctx.font = (isActive || isHover ? '500 ' : '400 ') + (isPhoto ? '10' : '9') + 'px "JetBrains Mono",monospace';
      ctx.fillStyle = isActive || isHover ? `rgba(${ink},.8)` : `rgba(${ink},.45)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, n.x, n.y + r + 6);
    }
  });
}

function MiniGraph({ photos, activeFile, onClickPhoto }: {
  photos: PhotoItem[]; activeFile: string | null;
  onClickPhoto?: (file: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{ nodes: MiniNode[]; edges: MiniEdge[] } | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const el = containerRef.current;
    if (!canvas || !el || !graphRef.current) return;
    const w = el.clientWidth, h = el.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const theme = {
      ink: cs.getPropertyValue('--ink').trim() || '0,0,0',
      node: cs.getPropertyValue('--canvas-node').trim() || '#2c2824',
    };
    drawMiniGraph(ctx, graphRef.current.nodes, graphRef.current.edges, w, h, activeFile, hoverNode, theme);
  }, [activeFile, hoverNode]);

  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      graphRef.current = buildMiniGraph(photos, w, h);
      redraw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [photos, redraw]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const observer = new MutationObserver(() => redraw());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [redraw]);

  const hitTest = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !graphRef.current) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const n of graphRef.current.nodes) {
      const dx = n.x - x, dy = n.y - y;
      if (dx * dx + dy * dy < (n.r + 8) * (n.r + 8)) return n;
    }
    return null;
  }, []);

  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const n = hitTest(e);
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = n ? 'pointer' : 'default';
    setHoverNode(n?.id || null);
  }, [hitTest]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const n = hitTest(e);
    if (n?.type === 'photo' && n.file && onClickPhoto) {
      onClickPhoto(n.file);
    }
  }, [hitTest, onClickPhoto]);

  return (
    <div className="sv-mini-graph" ref={containerRef}>
      <canvas ref={canvasRef}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverNode(null)}
        onClick={handleClick} />
    </div>
  );
}

export default function SeriesView({ project, onClose, onPhotoClick, onViewGraph }: {
  project: Project;
  onClose: () => void;
  onPhotoClick: (file: string, rect?: { top: number; left: number; width: number; height: number }) => void;
  onViewGraph?: () => void;
}) {
  const dir = project.dir;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Slit-reveal stages for hero
  const [stage, setStage] = useState<'loading' | 'reveal' | 'done'>('loading');
  const [scrambleDone, setScrambleDone] = useState(false);
  const [sharpLoaded, setSharpLoaded] = useState(false);
  const prevProjectId = useRef(project.id);

  const scrambleLabel = useMemo(() => project.title || project.id, [project.title, project.id]);
  const scrambled = useScrambleText(scrambleLabel, stage === 'loading',
    useCallback(() => setScrambleDone(true), []));

  // Reset on project change
  useEffect(() => {
    if (project.id !== prevProjectId.current) {
      prevProjectId.current = project.id;
      setStage('loading');
      setScrambleDone(false);
      setSharpLoaded(false);
    }
    scrollRef.current?.scrollTo(0, 0);
  }, [project.id]);

  // Preload hero, then reveal
  const orderedPhotos = useMemo(() => {
    if (!project.cover) return project.photos;
    const idx = project.photos.findIndex(p => p.file === project.cover || p.originalFile === project.cover);
    if (idx <= 0) return project.photos;
    const copy = [...project.photos];
    const [cover] = copy.splice(idx, 1);
    copy.unshift(cover);
    return copy;
  }, [project.photos, project.cover]);

  const coverPhoto = orderedPhotos[0];
  const coverUrl = coverPhoto?.url || (dir ? `/photos/${dir}/${coverPhoto?.file}` : `/photos/${coverPhoto?.file}`);
  const heroIsPortrait = coverPhoto?.width && coverPhoto?.height ? coverPhoto.height > coverPhoto.width : false;

  // Scramble done → reveal (slit opens with blur, sharp loads in background)
  useEffect(() => {
    if (stage !== 'loading' || !scrambleDone) return;
    const t = setTimeout(() => setStage('reveal'), 600);
    return () => clearTimeout(t);
  }, [stage, scrambleDone]);

  // Reveal → done
  useEffect(() => {
    if (stage !== 'reveal') return;
    const t = setTimeout(() => setStage('done'), 1200);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const seriesPhotos = useMemo(() => orderedPhotos.slice(1), [orderedPhotos]);

  const cameras = useMemo(() => {
    const set = new Set<string>();
    project.photos.forEach(p => { if (p.camera) set.add(p.camera); });
    return [...set];
  }, [project.photos]);

  const photoRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setPhotoRef = useCallback((file: string, el: HTMLDivElement | null) => {
    if (el) photoRefs.current.set(file, el);
    else photoRefs.current.delete(file);
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const visibleMap = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          const file = (e.target as HTMLElement).dataset.file;
          if (file) visibleMap.set(file, e.intersectionRatio);
        });
        let best: { file: string; ratio: number } | null = null;
        visibleMap.forEach((ratio, file) => {
          if (ratio >= 0.66 && ratio > (best?.ratio || 0)) {
            best = { file, ratio };
          }
        });
        if (best) setActivePhoto((best as { file: string; ratio: number }).file);
      },
      { root, threshold: [0, 0.33, 0.66, 1] }
    );
    photoRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [seriesPhotos]);

  const activePhotoData = useMemo(() => {
    if (!activePhoto) return null;
    return seriesPhotos.find(p => p.file === activePhoto) || null;
  }, [activePhoto, seriesPhotos]);

  const metaCamera = activePhotoData?.camera || cameras[0] || '';
  const metaLocation = activePhotoData?.location || project.location || '';
  const metaTags = activePhotoData?.tags?.join(', ') || project.tags.join(', ');
  const metaStory = activePhotoData?.story || '';

  const isRevealing = stage === 'reveal' || stage === 'done';
  const isDone = stage === 'done';

  return (
    <div className="sv-scroll" ref={scrollRef}>
      {/* Loading overlay with brackets + scramble text */}
      <div className={`sv-loader${stage === 'loading' ? ' sv-loader-show' : ''}`}>
        <div className="lb-loader-brackets">
          <span className="lb-lbr lb-lbr-tl" />
          <span className="lb-lbr lb-lbr-tr" />
          <span className="lb-lbr lb-lbr-bl" />
          <span className="lb-lbr lb-lbr-br" />
        </div>
        <div className="lb-scramble">{scrambled}</div>
      </div>

      {/* Hero with slit reveal + blur-up */}
      <div className={`sv-hero ${heroIsPortrait ? 'sv-hero-portrait' : 'sv-hero-landscape'}`}>
        <div className={`sv-hero-slit${isRevealing ? ` sv-hero-slit-open ${heroIsPortrait ? 'slit-portrait' : 'slit-landscape'}` : ''}`}>
          <div className="sv-hero-blur-wrap">
            {coverPhoto?.blurDataURL && (
              <img src={coverPhoto.blurDataURL} alt="" className={`sv-hero-blur${sharpLoaded ? ' sv-hero-blur-out' : ''}`} aria-hidden />
            )}
            <img src={coverUrl} alt={project.title} className={sharpLoaded ? 'sv-hero-sharp' : ''}
              onLoad={() => setSharpLoaded(true)} />
          </div>
        </div>
      </div>

      <div className={`sv-body${isDone ? ' sv-body-show' : ''}`}>
        <div className="sv-sidebar">
          <button className="sv-back" onClick={onClose}>← 回到攝影作品</button>
          <h1 className="sv-title">{project.title}</h1>
          {project.year && <div className="sv-date">{project.year}</div>}
          {project.story && <div className="sv-story">{project.story}</div>}

          <div className="sv-sidebar-meta">
            {metaCamera && (
              <div className="sv-meta-item">
                <span className="sv-meta-label">相機</span>
                <span className="sv-meta-value"><ScrambleValue value={metaCamera} /></span>
              </div>
            )}
            {metaLocation && (
              <div className="sv-meta-item">
                <span className="sv-meta-label">位置</span>
                <span className="sv-meta-value"><ScrambleValue value={metaLocation} /></span>
              </div>
            )}
            {metaTags && (
              <div className="sv-meta-item">
                <span className="sv-meta-label">標籤</span>
                <span className="sv-meta-value"><ScrambleValue value={metaTags} /></span>
              </div>
            )}
          </div>

          {metaStory && (
            <div className="sv-photo-story">{metaStory}</div>
          )}

          <div className="sv-graph-section">
            <div className="sv-graph-header">
              <span className="sv-graph-label">知識圖譜</span>
              {onViewGraph && (
                <button className="sv-graph-link" onClick={onViewGraph}>
                  前往 →
                </button>
              )}
            </div>
            <MiniGraph photos={seriesPhotos} activeFile={activePhoto}
              onClickPhoto={(file) => {
                const el = photoRefs.current.get(file);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }} />
          </div>
        </div>

        <div className="sv-content">
          {seriesPhotos.map(p => {
            const url = p.url || (dir ? `/photos/${dir}/${p.file}` : `/photos/${p.file}`);
            const isPortrait = p.width && p.height ? p.height > p.width : false;
            return (
              <div key={p.file} data-file={p.file}
                ref={el => setPhotoRef(p.file, el)}
                className={`sv-photo ${isPortrait ? 'sv-portrait' : 'sv-landscape'}`}
                onClick={(e) => {
                  const img = e.currentTarget.querySelector('img.real-img');
                  const r = (img || e.currentTarget).getBoundingClientRect();
                  onPhotoClick(p.file, { top: r.top, left: r.left, width: r.width, height: r.height });
                }}>
                <BlurImage src={url} alt={p.title} blur={p.blurDataURL} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
