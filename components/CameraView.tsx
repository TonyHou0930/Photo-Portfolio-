'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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

interface FocalGroup {
  label: string;
  range: string;
  min: number;
  max: number;
}

const FOCAL_GROUPS: FocalGroup[] = [
  { label: '16', range: 'Ultra Wide', min: 0, max: 20 },
  { label: '24', range: 'Ultra Wide', min: 20, max: 28 },
  { label: '35', range: 'Standard', min: 28, max: 42 },
  { label: '50', range: 'Standard', min: 42, max: 65 },
  { label: '85', range: 'Portrait', min: 65, max: 105 },
  { label: '135', range: 'Telephoto', min: 105, max: 170 },
  { label: '200', range: 'Telephoto', min: 170, max: Infinity },
];

const APERTURE_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
const RULER_STEP = 48;
const MINOR_TICKS = 3;

function parseFocal(fl?: string): number | null {
  if (!fl) return null;
  const n = parseFloat(fl);
  return isNaN(n) ? null : n;
}

function parseAperture(ap?: string): number | null {
  if (!ap) return null;
  const m = ap.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export default function CameraView({ photos, visible, onClickPhoto }: {
  photos: FlatPhoto[];
  visible: boolean;
  onClickPhoto: (file: string) => void;
}) {
  const [selectedFocal, setSelectedFocal] = useState<number | null>(null);
  const [apertureMax, setApertureMax] = useState<number>(16);
  const trackRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const wheelCooldown = useRef(false);
  const rulerDrag = useRef<{ startY: number; startOffset: number } | null>(null);
  const [rulerOffset, setRulerOffset] = useState(0);
  const isSnapping = useRef(false);

  const photosWithFocal = useMemo(() =>
    photos.map(p => ({ ...p, _focal: parseFocal(p.focalLength), _aperture: parseAperture(p.aperture) })),
    [photos]
  );

  const focalCounts = useMemo(() => {
    const counts = new Map<number, number>();
    FOCAL_GROUPS.forEach((_, i) => counts.set(i, 0));
    photosWithFocal.forEach(p => {
      if (p._focal === null) return;
      const idx = FOCAL_GROUPS.findIndex(g => p._focal! >= g.min && p._focal! < g.max);
      if (idx >= 0) counts.set(idx, (counts.get(idx) || 0) + 1);
    });
    return counts;
  }, [photosWithFocal]);

  const filtered = useMemo(() => {
    let pool = photosWithFocal;
    if (selectedFocal !== null) {
      const g = FOCAL_GROUPS[selectedFocal];
      pool = pool.filter(p => p._focal !== null && p._focal >= g.min && p._focal < g.max);
    }
    if (apertureMax < 16) {
      pool = pool.filter(p => p._aperture !== null && p._aperture <= apertureMax);
    }
    return pool;
  }, [photosWithFocal, selectedFocal, apertureMax]);

  const activeGroup = selectedFocal !== null ? FOCAL_GROUPS[selectedFocal] : null;

  const breadcrumb = activeGroup
    ? `${activeGroup.label}mm · ${activeGroup.range}${apertureMax < 16 ? ` · ≤f/${apertureMax}` : ''}`
    : `全部焦段${apertureMax < 16 ? ` · ≤f/${apertureMax}` : ''}`;

  // Snap ruler to a focal index (or null = center/all)
  const snapTo = useCallback((idx: number | null) => {
    setSelectedFocal(idx);
    if (idx === null) {
      setRulerOffset(0);
    } else {
      setRulerOffset(-idx * RULER_STEP);
    }
  }, []);

  // --- Ruler wheel ---
  const onRulerWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (wheelCooldown.current) return;
    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 380);

    const dir = e.deltaY > 0 ? 1 : -1;
    setSelectedFocal(prev => {
      if (prev === null) {
        const start = dir > 0 ? 0 : FOCAL_GROUPS.length - 1;
        setRulerOffset(-start * RULER_STEP);
        return start;
      }
      const next = prev + dir;
      if (next < 0 || next >= FOCAL_GROUPS.length) {
        setRulerOffset(0);
        return null;
      }
      setRulerOffset(-next * RULER_STEP);
      return next;
    });
  }, []);

  // --- Ruler drag ---
  const onRulerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isSnapping.current = false;
    rulerDrag.current = { startY: e.clientY, startOffset: rulerOffset };
  }, [rulerOffset]);

  const onRulerTouchStart = useCallback((e: React.TouchEvent) => {
    isSnapping.current = false;
    rulerDrag.current = { startY: e.touches[0].clientY, startOffset: rulerOffset };
  }, [rulerOffset]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!rulerDrag.current) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const delta = clientY - rulerDrag.current.startY;
      setRulerOffset(rulerDrag.current.startOffset + delta);
    };
    const onUp = () => {
      if (!rulerDrag.current) return;
      rulerDrag.current = null;
      isSnapping.current = true;
      // Snap to nearest focal group
      setRulerOffset(prev => {
        const idx = Math.round(-prev / RULER_STEP);
        const clamped = Math.max(-1, Math.min(FOCAL_GROUPS.length, idx));
        if (clamped < 0 || clamped >= FOCAL_GROUPS.length) {
          setSelectedFocal(null);
          return 0;
        }
        setSelectedFocal(clamped);
        return -clamped * RULER_STEP;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  // --- Aperture drag ---
  const snapToStop = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (APERTURE_STOPS.length - 1));
    setApertureMax(APERTURE_STOPS[idx]);
  }, []);

  const onTrackDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    snapToStop(e.clientX);
  }, [snapToStop]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      snapToStop(e.clientX);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [snapToStop]);

  const onTrackTouch = useCallback((e: React.TouchEvent) => {
    snapToStop(e.touches[0].clientX);
  }, [snapToStop]);

  const onTrackTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    snapToStop(e.touches[0].clientX);
  }, [snapToStop]);

  // Build ruler ticks
  const rulerTicks = useMemo(() => {
    const ticks: { y: number; major: boolean; label?: string; range?: string; count?: number; idx?: number }[] = [];
    FOCAL_GROUPS.forEach((g, i) => {
      const showRange = i === 0 || FOCAL_GROUPS[i - 1].range !== g.range;
      ticks.push({ y: i * RULER_STEP, major: true, label: g.label, range: showRange ? g.range : undefined, count: focalCounts.get(i) || 0, idx: i });
      if (i < FOCAL_GROUPS.length - 1) {
        for (let t = 1; t <= MINOR_TICKS; t++) {
          ticks.push({ y: i * RULER_STEP + t * (RULER_STEP / (MINOR_TICKS + 1)), major: false });
        }
      }
    });
    return ticks;
  }, [focalCounts]);

  // Calculate which index is closest to center for highlighting
  const nearestIdx = rulerOffset === 0 && selectedFocal === null
    ? null
    : Math.round(-rulerOffset / RULER_STEP);

  return (
    <div className={`cam-wrap${visible ? ' on' : ''}`}>
      {/* Top status */}
      <div className="cam-status">
        <span className="cam-status-dim">探索模式 /</span>
        <span className="cam-status-lit">{breadcrumb}</span>
        <span className="cam-status-dim">· {filtered.length} 張照片</span>
      </div>

      {/* Left: Ruler-style Focal Ring */}
      <div className="cam-ruler"
        ref={rulerRef}
        onWheel={onRulerWheel}
        onMouseDown={onRulerDown}
        onTouchStart={onRulerTouchStart}>
        {/* Fixed triangle indicator */}
        <div className="cam-ruler-indicator">
          <div className="cam-ruler-tri" />
        </div>
        {/* Fixed center line */}
        <div className="cam-ruler-center-line" />
        {/* Sliding ruler strip */}
        <div className="cam-ruler-strip"
          style={{
            transform: `translateY(${rulerOffset}px)`,
            transition: (isSnapping.current || !rulerDrag.current) ? 'transform .3s cubic-bezier(.4,0,.2,1)' : 'none',
          }}>
          {rulerTicks.map((tick, i) => {
            const dist = selectedFocal !== null && tick.major && tick.idx !== undefined
              ? Math.abs(tick.idx - selectedFocal)
              : tick.major ? 0 : 999;
            const isActive = tick.major && tick.idx === nearestIdx && nearestIdx !== null
              && nearestIdx >= 0 && nearestIdx < FOCAL_GROUPS.length;
            const opacity = tick.major
              ? (isActive ? 1 : Math.max(0.2, 1 - dist * 0.2))
              : 0.15;
            return (
              <div key={i}
                className={`cam-ruler-tick${tick.major ? ' major' : ''}${isActive ? ' active' : ''}`}
                style={{ top: tick.y, opacity }}
                onClick={tick.major && tick.idx !== undefined ? () => snapTo(
                  selectedFocal === tick.idx ? null : tick.idx!
                ) : undefined}>
                {tick.major ? (
                  <>
                    <span className="cam-ruler-num">{tick.label}</span>
                    {(tick.count ?? 0) > 0 && <span className="cam-ruler-count">{tick.count}</span>}
                    <div className="cam-ruler-dash major" />
                    {tick.range && <span className="cam-ruler-range">{tick.range}</span>}
                  </>
                ) : (
                  <div className="cam-ruler-dash" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Photo Grid */}
      <div className="cam-center">
        {filtered.length === 0 ? (
          <div className="cam-empty">
            <div className="cam-empty-icon">◈</div>
            <div className="cam-empty-text">此範圍沒有照片</div>
          </div>
        ) : (
          <div className="cam-grid">
            {filtered.map(p => {
              const ratio = p.width && p.height ? p.width / p.height : 1;
              const aspect = ratio < 0.75 ? 'portrait' : ratio > 1.4 ? 'cine' : 'std';
              return (
                <div key={p.file} className={`cam-card cam-ar-${aspect}`}
                  onClick={() => onClickPhoto(p.file)}>
                  <BlurImage src={p.url} alt={p.title} blur={p.blurDataURL} />
                  <div className="cam-card-info">
                    <span>{p.focalLength || '—'}</span>
                    <span>{p.aperture || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: Aperture Ring */}
      <div className="cam-aperture-ring">
        <div className="cam-ap-label">APERTURE</div>
        <div className="cam-ap-tag bokeh">Bokeh</div>
        <div className="cam-ap-track"
          ref={trackRef}
          onMouseDown={onTrackDown}
          onTouchStart={onTrackTouch}
          onTouchMove={onTrackTouchMove}>
          <div className="cam-ap-line" />
          <div className="cam-ap-fill" style={{ width: `${(APERTURE_STOPS.indexOf(apertureMax) / (APERTURE_STOPS.length - 1)) * 100}%` }} />
          <div className="cam-ap-thumb" style={{ left: `${(APERTURE_STOPS.indexOf(apertureMax) / (APERTURE_STOPS.length - 1)) * 100}%` }} />
          {APERTURE_STOPS.map((stop, i) => {
            const pct = (i / (APERTURE_STOPS.length - 1)) * 100;
            const isActive = stop === apertureMax;
            const isInRange = stop <= apertureMax;
            return (
              <div key={stop} className={`cam-ap-stop${isActive ? ' active' : ''}${isInRange ? ' in-range' : ''}`}
                style={{ left: `${pct}%` }}>
                <div className="cam-ap-stop-label">f/{stop}</div>
                <div className="cam-ap-stop-tick" />
              </div>
            );
          })}
        </div>
        <div className="cam-ap-tag sharp">Sharp</div>
      </div>
    </div>
  );
}
