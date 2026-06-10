import { FlatPhoto, getCatColor } from './data';

export type GraphMode = 'graph' | 'color' | 'timeline';

export interface GNode {
  id: string; x: number; y: number; gx: number; gy: number;
  r: number; label: string; type: 'cat' | 'photo' | 'tag' | 'location' | 'color-group';
  cat?: string; tags?: string[]; vx: number; vy: number;
  photoUrl?: string; dominantColor?: string; year?: string;
}
export interface GEdge { a: string; b: string; type: 'cat' | 'tag' | 'location' | 'color'; }

const LOC_COLOR = '#e0a050';

// ── Color helpers ──────────────────────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function colorGroupName(h: number): string {
  if (h < 30) return 'Warm Reds';
  if (h < 60) return 'Golden Tones';
  if (h < 120) return 'Greens';
  if (h < 180) return 'Teals';
  if (h < 240) return 'Blues';
  if (h < 300) return 'Purples';
  return 'Warm Reds';
}

const COLOR_GROUP_COLORS: Record<string, string> = {
  'Warm Reds': '#e06050', 'Golden Tones': '#d4a84a', 'Greens': '#5db88a',
  'Teals': '#4ab8b8', 'Blues': '#5080d0', 'Purples': '#9060c0',
};

// ── BUILD GRAPH ────────────────────────────────────────────────
export function buildGraph(
  photos: FlatPhoto[], w: number, h: number, mode: GraphMode,
  extractedColors?: Map<string, string>
): { nodes: GNode[]; edges: GEdge[] } {
  if (mode === 'timeline') return buildTimeline(photos, w, h);
  if (mode === 'color') return buildColorGraph(photos, w, h, extractedColors);
  return buildNormalGraph(photos, w, h);
}

// ── NORMAL MODE ────────────────────────────────────────────────
function buildNormalGraph(photos: FlatPhoto[], w: number, h: number): { nodes: GNode[]; edges: GEdge[] } {
  const cx = w / 2, cy = h / 2;
  const nodes: GNode[] = [], edges: GEdge[] = [];

  const catSet = new Set<string>(), locSet = new Set<string>(), tagSet = new Set<string>();
  photos.forEach(p => {
    if (p.category) catSet.add(p.category);
    if (p.location) locSet.add(p.location);
    p.tags.forEach(t => tagSet.add(t));
  });
  const cats = Array.from(catSet), locs = Array.from(locSet);
  const usedTags = Array.from(tagSet).filter(t => !catSet.has(t) && !locSet.has(t));

  const bigNodes = [...cats.map(c => ({ k: c })), ...locs.map(l => ({ k: l }))];
  const centers: Record<string, { x: number; y: number }> = {};
  bigNodes.forEach((bn, i) => {
    const a = (i / bigNodes.length) * Math.PI * 2 - Math.PI / 2;
    const r = Math.min(w, h) * 0.42;
    centers[bn.k] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

  cats.forEach(cat => {
    const cc = centers[cat];
    nodes.push({ id: 'c:' + cat, x: cc.x, y: cc.y, gx: cc.x, gy: cc.y, r: 16, label: cat, type: 'cat', cat, vx: 0, vy: 0 });
  });
  locs.forEach(loc => {
    const cc = centers[loc];
    nodes.push({ id: 'l:' + loc, x: cc.x, y: cc.y, gx: cc.x, gy: cc.y, r: 12, label: loc, type: 'location', vx: 0, vy: 0 });
  });

  photos.forEach(p => {
    const cc = centers[p.category] || { x: cx, y: cy };
    const a = Math.random() * Math.PI * 2, r2 = 80 + Math.random() * 130;
    const px = cc.x + Math.cos(a) * r2, py = cc.y + Math.sin(a) * r2;
    nodes.push({ id: 'p:' + p.file, x: px, y: py, gx: px, gy: py, r: 6, label: p.title, type: 'photo', cat: p.category, tags: p.tags, photoUrl: p.url, year: p.year, vx: 0, vy: 0 });
    if (p.category) edges.push({ a: 'c:' + p.category, b: 'p:' + p.file, type: 'cat' });
    if (p.location) edges.push({ a: 'l:' + p.location, b: 'p:' + p.file, type: 'location' });
  });

  usedTags.forEach(tag => {
    const owners = photos.filter(p => p.tags.includes(tag));
    if (!owners.length) return;
    let ax = 0, ay = 0;
    owners.forEach(p => { const cc = centers[p.category] || { x: cx, y: cy }; ax += cc.x; ay += cc.y; });
    ax /= owners.length; ay /= owners.length;
    const off = 50 + Math.random() * 70, oa = Math.random() * Math.PI * 2;
    const tx = ax + Math.cos(oa) * off, ty = ay + Math.sin(oa) * off;
    nodes.push({ id: 't:' + tag, x: tx, y: ty, gx: tx, gy: ty, r: 3, label: '#' + tag, type: 'tag', vx: 0, vy: 0 });
    owners.forEach(p => edges.push({ a: 'p:' + p.file, b: 't:' + tag, type: 'tag' }));
  });

  return { nodes, edges };
}

// ── COLOR MODE ─────────────────────────────────────────────────
function buildColorGraph(
  photos: FlatPhoto[], w: number, h: number,
  extractedColors?: Map<string, string>
): { nodes: GNode[]; edges: GEdge[] } {
  const cx = w / 2, cy = h / 2;
  const nodes: GNode[] = [], edges: GEdge[] = [];

  // Group photos by color
  const groups = new Map<string, FlatPhoto[]>();
  photos.forEach(p => {
    const hex = extractedColors?.get(p.file) || '#888888';
    const [hue] = hexToHsl(hex);
    const group = colorGroupName(hue);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(p);
  });

  const groupArr = Array.from(groups.entries());
  groupArr.forEach(([group, gPhotos], i) => {
    const a = (i / groupArr.length) * Math.PI * 2 - Math.PI / 2;
    const r = Math.min(w, h) * 0.35;
    const gx = cx + Math.cos(a) * r, gy = cy + Math.sin(a) * r;
    const gc = COLOR_GROUP_COLORS[group] || '#888';

    nodes.push({ id: 'cg:' + group, x: gx, y: gy, gx, gy, r: 14, label: group, type: 'color-group', dominantColor: gc, vx: 0, vy: 0 });

    gPhotos.forEach(p => {
      const pa = Math.random() * Math.PI * 2, pr = 50 + Math.random() * 90;
      const px = gx + Math.cos(pa) * pr, py = gy + Math.sin(pa) * pr;
      const col = extractedColors?.get(p.file) || gc;
      nodes.push({ id: 'p:' + p.file, x: px, y: py, gx: px, gy: py, r: 6, label: p.title, type: 'photo', dominantColor: col, photoUrl: p.url, vx: 0, vy: 0 });
      edges.push({ a: 'cg:' + group, b: 'p:' + p.file, type: 'color' });
    });
  });

  return { nodes, edges };
}

// ── TIMELINE MODE ──────────────────────────────────────────────
function buildTimeline(photos: FlatPhoto[], w: number, h: number): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [], edges: GEdge[] = [];
  const sorted = [...photos].sort((a, b) => (a.year || '0').localeCompare(b.year || '0'));
  const margin = 80;
  const usableW = w - margin * 2;

  sorted.forEach((p, i) => {
    const x = margin + (i / Math.max(sorted.length - 1, 1)) * usableW;
    const y = h / 2 + (Math.sin(i * 0.7) * h * 0.15);
    const c = getCatColor(p.category || '');
    nodes.push({ id: 'p:' + p.file, x, y, gx: x, gy: y, r: 7, label: p.title, type: 'photo', cat: p.category, tags: p.tags, photoUrl: p.url, year: p.year, vx: 0, vy: 0 });

    if (i > 0) {
      edges.push({ a: 'p:' + sorted[i - 1].file, b: 'p:' + p.file, type: 'cat' });
    }
  });

  // Year markers
  const years = [...new Set(sorted.map(p => p.year).filter(Boolean))];
  years.forEach(yr => {
    const yPhotos = sorted.filter(p => p.year === yr);
    const avgX = yPhotos.reduce((s, p) => {
      const n = nodes.find(nn => nn.id === 'p:' + p.file);
      return s + (n?.x || 0);
    }, 0) / yPhotos.length;
    nodes.push({ id: 'yr:' + yr, x: avgX, y: h / 2 - h * 0.28, gx: avgX, gy: h / 2 - h * 0.28, r: 10, label: yr!, type: 'cat', vx: 0, vy: 0 });
  });

  return { nodes, edges };
}

// ── SIMULATE ───────────────────────────────────────────────────
export function simulate(
  nodes: GNode[], edges: GEdge[], w: number, h: number,
  dragId: string | null, mouseGX?: number, mouseGY?: number
) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    n.vx += (n.gx - n.x) * .03;
    n.vy += (n.gy - n.y) * .03;

    // Magnetic hover — nodes slightly attracted to mouse
    if (mouseGX !== undefined && mouseGY !== undefined) {
      const dx = mouseGX - n.x, dy = mouseGY - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120 && dist > 5 && n.type === 'photo') {
        const force = (120 - dist) * 0.0004;
        n.vx += dx * force;
        n.vy += dy * force;
      }
    }

    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j], dx = n.x - m.x, dy = n.y - m.y, d = Math.sqrt(dx * dx + dy * dy) || .1;
      const minD = (n.r + m.r) * 4.5 + 55;
      if (d < minD) {
        const f = (minD - d) * .045;
        n.vx += dx / d * f; n.vy += dy / d * f;
        m.vx -= dx / d * f; m.vy -= dy / d * f;
      }
    }
    n.vx *= .52; n.vy *= .52;
    if (n.id !== dragId) { n.x += n.vx; n.y += n.vy; }
  }
  for (const e of edges) {
    const a = nodes.find(n => n.id === e.a), b = nodes.find(n => n.id === e.b);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || .1;
    const tgt = e.type === 'tag' ? 80 : e.type === 'color' ? 90 : 120;
    const f = (d - tgt) * .007;
    a.vx += dx / d * f; a.vy += dy / d * f;
    b.vx -= dx / d * f; b.vy -= dy / d * f;
  }
}

// ── DRAW ───────────────────────────────────────────────────────
export function drawGraph(
  ctx: CanvasRenderingContext2D, nodes: GNode[], edges: GEdge[],
  w: number, h: number, hovId: string | null, zoom: number,
  visited: Set<string>, mode: GraphMode
) {
  const hE = new Set<GEdge>(), hN = new Set<string>();
  if (hovId) {
    hN.add(hovId);
    edges.forEach(e => { if (e.a === hovId || e.b === hovId) { hE.add(e); hN.add(e.a); hN.add(e.b); } });
  }
  const anyH = !!hovId;

  // ── Edges ──
  edges.forEach(e => {
    const a = nodes.find(n => n.id === e.a), b = nodes.find(n => n.id === e.b);
    if (!a || !b) return;
    const lit = hE.has(e);
    const isVisited = visited.has(a.id) && visited.has(b.id);

    if (e.type === 'location' && !lit) return;
    if (e.type === 'tag' && zoom < 1.0 && !lit) return;

    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);

    if (e.type === 'location') {
      ctx.strokeStyle = LOC_COLOR + '88'; ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); return;
    }
    if (e.type === 'tag') {
      ctx.strokeStyle = lit ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.04)';
      ctx.lineWidth = 0.3; ctx.stroke(); return;
    }

    // Cat/color/timeline edges
    if (isVisited) {
      // Breadcrumb path — flowing dashed line
      ctx.strokeStyle = 'rgba(200,192,168,.35)'; ctx.lineWidth = 1;
      const offset = (Date.now() / 80) % 20;
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -offset;
      ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    } else if (anyH) {
      ctx.strokeStyle = lit ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.025)';
      ctx.lineWidth = lit ? 0.8 : 0.2; ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 0.4; ctx.stroke();
    }
  });

  // ── Nodes ──
  nodes.forEach(n => {
    const isH = n.id === hovId, inS = hN.has(n.id), dim = anyH && !inS;
    const isVisited = visited.has(n.id);

    if (n.type === 'cat' || n.type === 'color-group') {
      const c = n.type === 'color-group' ? (n.dominantColor || '#888') : getCatColor(n.cat || '');
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (isH ? 3 : 0), 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.12)' : '#fff'; ctx.fill();
      ctx.strokeStyle = dim ? 'rgba(255,255,255,.08)' : c;
      ctx.lineWidth = isH ? 2.5 : 1.5; ctx.stroke();
      ctx.fillStyle = dim ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.85)';
      ctx.font = '500 11px JetBrains Mono,monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x + n.r + 10, n.y);

    } else if (n.type === 'location') {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (isH ? 2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.04)' : LOC_COLOR + '33'; ctx.fill();
      ctx.strokeStyle = dim ? 'rgba(255,255,255,.06)' : LOC_COLOR + (isH ? 'ff' : 'aa');
      ctx.lineWidth = isH ? 2 : 1.5; ctx.stroke();
      if (zoom > 0.6) {
        ctx.fillStyle = dim ? 'rgba(255,255,255,.06)' : LOC_COLOR + (isH ? 'ff' : 'cc');
        ctx.font = '500 9px JetBrains Mono,monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('◉ ' + n.label, n.x + n.r + 8, n.y);
      }

    } else if (n.type === 'photo') {
      const c = n.dominantColor || getCatColor(n.cat || '');
      const sz = n.r + (isH ? 3 : 0);

      // Visited glow
      if (isVisited && !dim) {
        ctx.beginPath(); ctx.arc(n.x, n.y, sz + 5, 0, Math.PI * 2);
        ctx.fillStyle = c + '18'; ctx.fill();
      }

      ctx.beginPath(); ctx.arc(n.x, n.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.05)' : isH ? '#fff' : c;
      ctx.fill();
      if (isH) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }

      // Label
      if (zoom > 0.85) {
        ctx.fillStyle = dim ? 'rgba(255,255,255,.04)' : isH ? '#fff' : 'rgba(255,255,255,.4)';
        ctx.font = (isH ? '500 ' : '') + '8px JetBrains Mono,monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x + n.r + 7, n.y);
      }

    } else {
      // Tag
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (isH ? 1 : 0), 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.02)' : isH ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.13)';
      ctx.fill();
      if (zoom > 1.3) {
        ctx.fillStyle = dim ? 'rgba(255,255,255,.03)' : isH ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.18)';
        ctx.font = '300 8px JetBrains Mono,monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x + n.r + 5, n.y);
      }
    }
  });
}
