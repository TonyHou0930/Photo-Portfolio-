'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import { FlatPhoto } from '@/lib/data';
import { GNode, GEdge, GraphMode, buildGraph, simulate, drawGraph } from '@/lib/graph-engine';

export default function GraphView({ photos, visible, onClickCat, onClickPhoto }: {
  photos: FlatPhoto[]; visible: boolean;
  onClickCat: (cat: string) => void;
  onClickPhoto: (file: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<GraphMode>('graph');
  const [extractedColors, setExtractedColors] = useState<Map<string, string>>(new Map());

  const state = useRef<{
    nodes: GNode[]; edges: GEdge[];
    dragId: string | null; hovId: string | null;
    dox: number; doy: number; raf: number;
    zoom: number; panX: number; panY: number;
    isPanning: boolean; panStartX: number; panStartY: number;
    panStartPX: number; panStartPY: number;
    mouseDownPos: { x: number; y: number } | null;
    mouseGX: number; mouseGY: number;
    visited: Set<string>;
  }>({
    nodes: [], edges: [], dragId: null, hovId: null,
    dox: 0, doy: 0, raf: 0,
    zoom: 1, panX: 0, panY: 0,
    isPanning: false, panStartX: 0, panStartY: 0,
    panStartPX: 0, panStartPY: 0,
    mouseDownPos: null,
    mouseGX: -9999, mouseGY: -9999,
    visited: new Set(),
  });

  // Extract dominant colors from images via Canvas
  useEffect(() => {
    if (!visible || extractedColors.size > 0) return;
    const map = new Map<string, string>();
    let done = 0;
    photos.forEach(p => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 4; c.height = 4;
          const ctx = c.getContext('2d')!;
          ctx.drawImage(img, 0, 0, 4, 4);
          const d = ctx.getImageData(0, 0, 4, 4).data;
          let rr = 0, gg = 0, bb = 0;
          for (let i = 0; i < d.length; i += 4) { rr += d[i]; gg += d[i+1]; bb += d[i+2]; }
          const n = d.length / 4;
          const hex = '#' + [rr/n, gg/n, bb/n].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
          map.set(p.file, hex);
        } catch {}
        done++;
        if (done >= photos.length) setExtractedColors(new Map(map));
      };
      img.onerror = () => { done++; if (done >= photos.length) setExtractedColors(new Map(map)); };
      img.src = p.url;
    });
  }, [visible, photos, extractedColors.size]);

  const resize = useCallback(() => {
    const c = canvasRef.current, w = wrapRef.current; if (!c || !w) return;
    const d = window.devicePixelRatio || 1;
    c.width = w.clientWidth * d; c.height = w.clientHeight * d;
    c.style.width = w.clientWidth + 'px'; c.style.height = w.clientHeight + 'px';
    c.getContext('2d')?.setTransform(d, 0, 0, d, 0, 0);
  }, []);

  const init = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const d = window.devicePixelRatio || 1;
    const { nodes, edges } = buildGraph(photos, c.width / d, c.height / d, mode, extractedColors);
    state.current.nodes = nodes; state.current.edges = edges;
    state.current.zoom = 1; state.current.panX = 0; state.current.panY = 0;
  }, [photos, mode, extractedColors]);

  const tick = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const d = window.devicePixelRatio || 1, w = c.width / d, h = c.height / d;
    const s = state.current;
    simulate(s.nodes, s.edges, w * 2, h * 2, s.dragId, s.mouseGX, s.mouseGY);
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(s.panX, s.panY);
    ctx.scale(s.zoom, s.zoom);
    drawGraph(ctx, s.nodes, s.edges, w / s.zoom, h / s.zoom, s.hovId, s.zoom, s.visited, mode);
    ctx.restore();
    s.raf = requestAnimationFrame(tick);
  }, [mode]);

  useEffect(() => {
    if (!visible) { cancelAnimationFrame(state.current.raf); return; }
    resize(); init(); tick();
    const h = () => { resize(); init(); };
    window.addEventListener('resize', h);
    return () => { cancelAnimationFrame(state.current.raf); window.removeEventListener('resize', h); };
  }, [visible, resize, init, tick]);

  // Reinit when mode changes
  useEffect(() => { if (visible) { resize(); init(); } }, [mode, visible, resize, init]);

  const toGraph = (mx: number, my: number) => {
    const s = state.current;
    return { gx: (mx - s.panX) / s.zoom, gy: (my - s.panY) / s.zoom };
  };
  const getN = (mx: number, my: number) => {
    const { gx, gy } = toGraph(mx, my);
    return state.current.nodes.slice().reverse().find(n => Math.hypot(n.x - gx, n.y - gy) < Math.max(n.r + 6, 18));
  };

  return (
    <div ref={wrapRef} className={`graph-wrap${visible ? ' on' : ''}`}>
      {/* Mode buttons */}
      <div className="graph-modes">
        <button className={`gm-btn${mode === 'graph' ? ' act' : ''}`} onClick={() => setMode('graph')}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1"/><circle cx="2" cy="2" r="1" stroke="currentColor" strokeWidth=".8"/><circle cx="10" cy="2" r="1" stroke="currentColor" strokeWidth=".8"/><circle cx="2" cy="10" r="1" stroke="currentColor" strokeWidth=".8"/><line x1="4.6" y1="4.8" x2="2.8" y2="2.8" stroke="currentColor" strokeWidth=".5"/><line x1="7.4" y1="4.8" x2="9.2" y2="2.8" stroke="currentColor" strokeWidth=".5"/><line x1="4.6" y1="7.2" x2="2.8" y2="9.2" stroke="currentColor" strokeWidth=".5"/></svg>
        </button>
        <button className={`gm-btn${mode === 'color' ? ' act' : ''}`} onClick={() => setMode('color')} title="Color Mode">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="4" cy="4" r="2.5" stroke="#e06050" strokeWidth="1"/><circle cx="8" cy="4" r="2.5" stroke="#5db88a" strokeWidth="1"/><circle cx="6" cy="8" r="2.5" stroke="#5080d0" strokeWidth="1"/></svg>
        </button>
        <button className={`gm-btn${mode === 'timeline' ? ' act' : ''}`} onClick={() => setMode('timeline')} title="Timeline">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1"/><circle cx="3" cy="6" r="1.2" fill="currentColor"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="6" r="1.2" fill="currentColor"/></svg>
        </button>
      </div>

      <canvas ref={canvasRef}
        onWheel={e => {
          e.preventDefault();
          const s = state.current;
          const rect = canvasRef.current!.getBoundingClientRect();
          const mx = e.clientX - rect.left, my = e.clientY - rect.top;
          const oldZoom = s.zoom;
          const delta = e.deltaY > 0 ? 0.99 : 1.01;
          s.zoom = Math.max(0.2, Math.min(4, s.zoom * delta));
          s.panX = mx - (mx - s.panX) * (s.zoom / oldZoom);
          s.panY = my - (my - s.panY) * (s.zoom / oldZoom);
        }}
        onMouseMove={e => {
          const rect = canvasRef.current!.getBoundingClientRect();
          const mx = e.clientX - rect.left, my = e.clientY - rect.top;
          const s = state.current;
          const { gx, gy } = toGraph(mx, my);
          s.mouseGX = gx; s.mouseGY = gy;

          if (s.isPanning) {
            s.panX = s.panStartPX + (mx - s.panStartX);
            s.panY = s.panStartPY + (my - s.panStartY);
            canvasRef.current!.style.cursor = 'grabbing'; return;
          }
          if (s.dragId) {
            const n = s.nodes.find(x => x.id === s.dragId);
            if (n) { n.x = gx - s.dox; n.y = gy - s.doy; n.gx = n.x; n.gy = n.y; n.vx = 0; n.vy = 0; }
            return;
          }
          const n = getN(mx, my); s.hovId = n?.id || null;
          canvasRef.current!.style.cursor = n ? (n.type === 'photo' || n.type === 'cat' || n.type === 'color-group' ? 'pointer' : 'grab') : 'grab';
          const tip = tipRef.current;
          if (tip && n && n.type === 'photo') {
            tip.classList.add('on');
            tip.style.left = Math.min(mx + 14, canvasRef.current!.clientWidth - 200) + 'px';
            tip.style.top = Math.max(my - 16, 4) + 'px';
            tip.querySelector('.gt-t')!.textContent = n.label;
            tip.querySelector('.gt-tg')!.innerHTML = (n.tags || []).map(t => `<span class="gt-ti">#${t}</span>`).join('');
          } else tip?.classList.remove('on');
        }}
        onMouseDown={e => {
          const rect = canvasRef.current!.getBoundingClientRect();
          const mx = e.clientX - rect.left, my = e.clientY - rect.top;
          const s = state.current;
          const n = getN(mx, my);
          s.mouseDownPos = { x: mx, y: my };
          if (n) {
            if (n.type === 'cat' || n.type === 'color-group' || n.type === 'photo') return;
            const { gx, gy } = toGraph(mx, my);
            s.dragId = n.id; s.dox = gx - n.x; s.doy = gy - n.y;
          } else {
            s.isPanning = true; s.panStartX = mx; s.panStartY = my;
            s.panStartPX = s.panX; s.panStartPY = s.panY;
          }
        }}
        onMouseUp={e => {
          const rect = canvasRef.current!.getBoundingClientRect();
          const mx = e.clientX - rect.left, my = e.clientY - rect.top;
          const s = state.current;
          const wasDrag = s.mouseDownPos && Math.hypot(mx - s.mouseDownPos.x, my - s.mouseDownPos.y) > 5;
          if (!wasDrag && s.mouseDownPos) {
            const n = getN(mx, my);
            if (n?.type === 'photo') {
              s.visited.add(n.id);
              onClickPhoto(n.id.replace('p:', ''));
            }
            if ((n?.type === 'cat' || n?.type === 'color-group') && n.cat) onClickCat(n.cat);
          }
          s.dragId = null; s.isPanning = false; s.mouseDownPos = null;
        }}
        onMouseLeave={() => {
          const s = state.current;
          s.dragId = null; s.isPanning = false; s.hovId = null; s.mouseDownPos = null;
          s.mouseGX = -9999; s.mouseGY = -9999;
          tipRef.current?.classList.remove('on');
        }}
      />
      <div ref={tipRef} className="graph-tip"><div className="gt-t" /><div className="gt-tg" /></div>
    </div>
  );
}
