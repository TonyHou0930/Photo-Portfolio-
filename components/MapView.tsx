'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { FlatPhoto, locationCountryEn } from '@/lib/data';

interface CountryPath { id: string; n: string; d: string; cx: number; cy: number; }
interface PhotoPin {
  lat: number; lng: number; sx: number; sy: number;
  city: string; region: string; country: string;
  title: string; url: string; file: string;
}

const extractCountryEn = locationCountryEn;

const MW = 960, MH = 500;
function project(lng: number, lat: number): [number, number] {
  const λ = (lng * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const x = λ;
  const y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * φ));
  const maxY = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * (Math.PI * 85 / 180)));
  return [((x / Math.PI + 1) / 2) * MW, ((1 - y / maxY) / 2) * MH];
}

export default function MapView({ photos, visible, onFilter }: {
  photos: FlatPhoto[]; visible: boolean;
  onFilter: (f: { type: string; value: string }) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<CountryPath[]>([]);
  const [hovCountry, setHovCountry] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const [vb, setVb] = useState({ x: -30, y: -20, w: MW + 60, h: MH + 40 });
  const drag = useRef({ active: false, sx: 0, sy: 0, svbx: 0, svby: 0, pinchDist: 0 });

  useEffect(() => {
    if (!visible || paths.length) return;
    fetch('/world-map.json').then(r => r.json()).then(setPaths).catch(() => {});
  }, [visible, paths.length]);

  const visited = useMemo(() => {
    const map = new Map<string, { name: string; count: number; thumbs: string[] }>();
    photos.forEach(p => {
      if (!p.location) return;
      const country = extractCountryEn(p.location);
      if (!country) return;
      if (!map.has(country)) map.set(country, { name: country, count: 0, thumbs: [] });
      const entry = map.get(country)!;
      entry.count++;
      if (entry.thumbs.length < 3) entry.thumbs.push(p.url);
    });
    return map;
  }, [photos]);

  // Individual photo pins with parsed location hierarchy
  const pins = useMemo(() => {
    const result: PhotoPin[] = [];
    photos.forEach(p => {
      if (!p.lat || !p.lng) return;
      const country = extractCountryEn(p.location) || p.location;
      const city = p.location;
      const [sx, sy] = project(p.lng, p.lat);
      result.push({ lat: p.lat, lng: p.lng, sx, sy, city, region: '', country, title: p.title, url: p.url, file: p.file });
    });
    return result;
  }, [photos]);

  // Cluster pins by proximity at current zoom level
  const zoomLevel = MW / vb.w; // 1 = world, ~3 = continent, ~8 = country
  const clusters = useMemo(() => {
    const radius = 25 / zoomLevel; // cluster radius in SVG units, tighter at higher zoom
    const used = new Set<number>();
    const result: { sx: number; sy: number; city: string; region: string; country: string; pins: PhotoPin[] }[] = [];
    pins.forEach((pin, i) => {
      if (used.has(i)) return;
      const group = [pin];
      used.add(i);
      pins.forEach((other, j) => {
        if (used.has(j)) return;
        if (Math.hypot(pin.sx - other.sx, pin.sy - other.sy) < radius) {
          group.push(other);
          used.add(j);
        }
      });
      const sx = group.reduce((s, p) => s + p.sx, 0) / group.length;
      const sy = group.reduce((s, p) => s + p.sy, 0) / group.length;
      result.push({ sx, sy, city: pin.city, region: pin.region, country: pin.country, pins: group });
    });
    return result;
  }, [pins, zoomLevel]);

  const totalLocations = useMemo(() => {
    const locs = new Set<string>();
    photos.forEach(p => {
      if (p.lat && p.lng) locs.add(`${Math.round(p.lat * 10)},${Math.round(p.lng * 10)}`);
    });
    return locs.size;
  }, [photos]);
  const totalPhotos = photos.filter(p => p.lat && p.lng).length;

  const clampVb = useCallback((v: typeof vb) => {
    const minW = 60, maxW = MW * 2.5;
    v.w = Math.max(minW, Math.min(maxW, v.w));
    v.h = v.w * (MH / MW);
    v.x = Math.max(-MW * 0.5, Math.min(MW - v.w * 0.3, v.x));
    v.y = Math.max(-MH * 0.5, Math.min(MH - v.h * 0.3, v.y));
    return v;
  }, []);

  const onWheelRef = useRef<(e: WheelEvent) => void>();
  onWheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const factor = e.deltaY > 0 ? 1.08 : 0.92;
    const minW = 60, maxW = MW * 2.5;
    setVb(prev => {
      const nw = Math.max(minW, Math.min(maxW, prev.w * factor));
      const nh = nw * (MH / MW);
      return clampVb({ x: prev.x + (prev.w - nw) * mx, y: prev.y + (prev.h - nh) * my, w: nw, h: nh });
    });
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, svbx: vb.x, svby: vb.y, pinchDist: 0 };
  }, [vb.x, vb.y]);

  const screenToSvg = useCallback((dx: number, dy: number) => {
    const svg = svgRef.current;
    if (!svg) return { dx: 0, dy: 0 };
    const rect = svg.getBoundingClientRect();
    return { dx: (dx / (rect.width || 1)) * vb.w, dy: (dy / (rect.height || 1)) * vb.h };
  }, [vb.w, vb.h]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const d = drag.current;
    if (!d.active) return;
    const { dx, dy } = screenToSvg(e.clientX - d.sx, e.clientY - d.sy);
    setVb(prev => clampVb({ ...prev, x: d.svbx - dx, y: d.svby - dy }));
  }, [screenToSvg, clampVb]);

  const onMouseUp = useCallback(() => { drag.current.active = false; }, []);

  const vbRef = useRef(vb);
  vbRef.current = vb;

  const onTouchMoveRef = useRef<(e: TouchEvent) => void>();
  onTouchMoveRef.current = (e: TouchEvent) => {
    e.preventDefault();
    const d = drag.current;
    if (e.touches.length === 2 && d.pinchDist) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = d.pinchDist / newDist;
      d.pinchDist = newDist;
      setVb(prev => {
        const nw = prev.w * factor, nh = prev.h * factor;
        return clampVb({ x: prev.x + (prev.w - nw) * 0.5, y: prev.y + (prev.h - nh) * 0.5, w: nw, h: nh });
      });
      return;
    }
    if (!d.active) return;
    const t = e.touches[0];
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cur = vbRef.current;
    const dx = ((t.clientX - d.sx) / (rect.width || 1)) * cur.w;
    const dy = ((t.clientY - d.sy) / (rect.height || 1)) * cur.h;
    setVb(prev => clampVb({ ...prev, x: d.svbx - dx, y: d.svby - dy }));
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const d = drag.current;
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      d.pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      d.active = false;
      return;
    }
    const t = e.touches[0];
    d.active = true; d.sx = t.clientX; d.sy = t.clientY; d.svbx = vb.x; d.svby = vb.y;
  }, [vb.x, vb.y]);

  const onTouchEnd = useCallback(() => {
    drag.current.active = false; drag.current.pinchDist = 0;
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !visible) return;
    const wh = (e: WheelEvent) => onWheelRef.current?.(e);
    const th = (e: TouchEvent) => onTouchMoveRef.current?.(e);
    wrap.addEventListener('wheel', wh, { passive: false });
    wrap.addEventListener('touchmove', th, { passive: false });
    return () => { wrap.removeEventListener('wheel', wh); wrap.removeEventListener('touchmove', th); };
  }, [visible]);

  const hovData = hovCountry ? visited.get(hovCountry) : null;

  // Scale factor for SVG-space text/elements that should stay constant on screen
  const s = vb.w / MW;

  // Determine what detail to show based on zoom
  const showCityLabels = zoomLevel > 2.5;
  const showPhotoTitles = zoomLevel > 6;
  const showPhotoDots = zoomLevel > 1.8;

  if (!visible) return null;

  return (
    <div ref={wrapRef} className="map-wrap" style={{ touchAction: 'none' }}
      onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>

      <svg ref={svgRef} className="map-svg" width="100%" height="100%"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        {/* Country shapes */}
        {paths.map((c, i) => {
          const isVisited = visited.has(c.n);
          const isHov = hovCountry === c.n;
          return (
            <path key={c.id ?? `unk-${i}`} d={c.d}
              className={`map-country${isVisited ? ' map-country-visited' : ''}${isHov ? ' map-country-hov' : ''}`}
              onMouseEnter={() => isVisited && setHovCountry(c.n)}
              onMouseLeave={() => setHovCountry(null)}
              onClick={(e) => {
                if (!isVisited) return;
                e.stopPropagation();
                onFilter({ type: 'country', value: c.n });
              }}
            />
          );
        })}

        {/* Progressive detail: location labels that appear on zoom */}
        {showPhotoDots && clusters.map((cl, i) => (
          <g key={i}>
            {/* Small dot */}
            <circle cx={cl.sx} cy={cl.sy} r={1.5 * s}
              className="map-dot" />
            {/* City label at medium zoom */}
            {showCityLabels && (
              <text x={cl.sx + 3 * s} y={cl.sy + 1 * s}
                className="map-city-label"
                fontSize={4.5 * s} pointerEvents="none">
                {cl.city}
              </text>
            )}
            {/* Individual photo titles at deep zoom */}
            {showPhotoTitles && cl.pins.map((pin, j) => (
              <text key={pin.file} x={pin.sx + 3 * s} y={pin.sy + (j * 4 + 6) * s}
                className="map-photo-label"
                fontSize={3 * s} pointerEvents="none">
                {pin.title}
              </text>
            ))}
          </g>
        ))}
      </svg>

      {/* Hover card */}
      {hovData && (
        <div className="map-card" style={{
          left: Math.min(mouse.x + 14, (wrapRef.current?.clientWidth || 800) - 240),
          top: Math.max(mouse.y - 44, 10),
        }}>
          <div className="map-card-thumbs">
            {hovData.thumbs.map(url => (
              <img key={url} src={url} alt="" className="map-card-thumb" />
            ))}
          </div>
          <div className="map-card-name">{hovData.name}</div>
          <div className="map-card-count">{hovData.count} photograph{hovData.count > 1 ? 's' : ''}</div>
        </div>
      )}

      {/* Stats */}
      <div className="map-bottom-stats">
        <span className="map-stat-num">{visited.size}</span> countries
        <span className="map-stat-sep">·</span>
        <span className="map-stat-num">{totalLocations}</span> locations
        <span className="map-stat-sep">·</span>
        <span className="map-stat-num">{totalPhotos}</span> photographs
      </div>
    </div>
  );
}
