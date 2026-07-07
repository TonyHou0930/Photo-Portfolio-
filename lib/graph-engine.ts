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
  if (h < 30) return 'Warm Reds'; if (h < 60) return 'Golden Tones';
  if (h < 120) return 'Greens'; if (h < 180) return 'Teals';
  if (h < 240) return 'Blues'; if (h < 300) return 'Purples';
  return 'Warm Reds';
}

const COLOR_GROUP_COLORS: Record<string, string> = {
  'Warm Reds': '#e06050', 'Golden Tones': '#d4a84a', 'Greens': '#5db88a',
  'Teals': '#4ab8b8', 'Blues': '#5080d0', 'Purples': '#9060c0',
};

export function buildGraph(
  photos: FlatPhoto[], w: number, h: number, mode: GraphMode,
  extractedColors?: Map<string, string>
): { nodes: GNode[]; edges: GEdge[] } {
  if (mode === 'timeline') return buildTimeline(photos, w, h);
  if (mode === 'color') return buildColorGraph(photos, w, h, extractedColors);
  return buildNormalGraph(photos, w, h);
}

// ── NORMAL MODE — concentric rings ─────────────────────────────
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

  // ── Layer 1: Categories on inner ring ──
  const catRadius = Math.min(w, h) * 0.18;
  const catCenters: Record<string, { x: number; y: number; angle: number }> = {};
  cats.forEach((cat, i) => {
    const a = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * catRadius;
    const y = cy + Math.sin(a) * catRadius;
    catCenters[cat] = { x, y, angle: a };
    nodes.push({ id: 'c:' + cat, x, y, gx: x, gy: y, r: 8, label: cat, type: 'cat', cat, vx: 0, vy: 0 });
  });

  // ── Layer 2: Photos on middle ring, clustered around their category ──
  const photoRadius = Math.min(w, h) * 0.32;
  const catPhotos: Record<string, FlatPhoto[]> = {};
  photos.forEach(p => {
    const c = p.category || 'default';
    if (!catPhotos[c]) catPhotos[c] = [];
    catPhotos[c].push(p);
  });

  cats.forEach(cat => {
    const cc = catCenters[cat];
    const group = catPhotos[cat] || [];
    const arcSpan = (group.length / Math.max(photos.length, 1)) * Math.PI * 2;
    const startAngle = cc.angle - arcSpan / 2;

    group.forEach((p, i) => {
      const a = group.length === 1
        ? cc.angle
        : startAngle + (i / (group.length - 1)) * arcSpan;
      const jitter = (Math.random() - 0.5) * 20;
      const r = photoRadius + jitter;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      nodes.push({ id: 'p:' + p.file, x: px, y: py, gx: px, gy: py, r: 4, label: p.title, type: 'photo', cat: p.category, tags: p.tags, photoUrl: p.url, year: p.year, vx: 0, vy: 0 });
      edges.push({ a: 'c:' + cat, b: 'p:' + p.file, type: 'cat' });
      if (p.location) edges.push({ a: 'l:' + p.location, b: 'p:' + p.file, type: 'location' });
    });
  });

  // ── Layer 3: Locations between their photos and category ──
  locs.forEach(loc => {
    const locPhotos = photos.filter(p => p.location === loc);
    if (!locPhotos.length) return;
    let ax = 0, ay = 0, cnt = 0;
    locPhotos.forEach(p => {
      const n = nodes.find(nn => nn.id === 'p:' + p.file);
      if (n) { ax += n.x; ay += n.y; cnt++; }
    });
    if (!cnt) return;
    ax /= cnt; ay /= cnt;
    const midR = (catRadius + photoRadius) / 2;
    const ang = Math.atan2(ay - cy, ax - cx);
    const lx = cx + Math.cos(ang) * midR;
    const ly = cy + Math.sin(ang) * midR;
    nodes.push({ id: 'l:' + loc, x: lx, y: ly, gx: lx, gy: ly, r: 5, label: loc, type: 'location', vx: 0, vy: 0 });
  });

  // ── Layer 4: Tags on outer ring ──
  const tagRadius = Math.min(w, h) * 0.42;
  usedTags.forEach(tag => {
    const owners = photos.filter(p => p.tags.includes(tag));
    if (!owners.length) return;
    let avgAngle = 0, cnt = 0;
    owners.forEach(p => {
      const n = nodes.find(nn => nn.id === 'p:' + p.file);
      if (n) { avgAngle += Math.atan2(n.y - cy, n.x - cx); cnt++; }
    });
    if (!cnt) return;
    avgAngle /= cnt;
    const jitter = (Math.random() - 0.5) * 0.3;
    const tx = cx + Math.cos(avgAngle + jitter) * (tagRadius + Math.random() * 15);
    const ty = cy + Math.sin(avgAngle + jitter) * (tagRadius + Math.random() * 15);
    nodes.push({ id: 't:' + tag, x: tx, y: ty, gx: tx, gy: ty, r: 2, label: '#' + tag, type: 'tag', vx: 0, vy: 0 });
    owners.forEach(p => edges.push({ a: 'p:' + p.file, b: 't:' + tag, type: 'tag' }));
  });

  return { nodes, edges };
}

// ── COLOR MODE ─────────────────────────────────────────────────
function buildColorGraph(photos: FlatPhoto[], w: number, h: number, extractedColors?: Map<string, string>): { nodes: GNode[]; edges: GEdge[] } {
  const cx = w / 2, cy = h / 2;
  const nodes: GNode[] = [], edges: GEdge[] = [];
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
    const r = Math.min(w, h) * 0.25;
    const gx = cx + Math.cos(a) * r, gy = cy + Math.sin(a) * r;
    const gc = COLOR_GROUP_COLORS[group] || '#888';
    nodes.push({ id: 'cg:' + group, x: gx, y: gy, gx, gy, r: 8, label: group, type: 'color-group', dominantColor: gc, vx: 0, vy: 0 });
    const ga = Math.PI * (3 - Math.sqrt(5));
    gPhotos.forEach((p, j) => {
      const pa = j * ga, pr = 35 + (j % 4) * 20;
      nodes.push({ id: 'p:' + p.file, x: gx + Math.cos(pa) * pr, y: gy + Math.sin(pa) * pr, gx: gx + Math.cos(pa) * pr, gy: gy + Math.sin(pa) * pr, r: 4, label: p.title, type: 'photo', dominantColor: extractedColors?.get(p.file) || gc, photoUrl: p.url, vx: 0, vy: 0 });
      edges.push({ a: 'cg:' + group, b: 'p:' + p.file, type: 'color' });
    });
  });
  return { nodes, edges };
}

// ── TIMELINE MODE ──────────────────────────────────────────────
function buildTimeline(photos: FlatPhoto[], w: number, h: number): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = [], edges: GEdge[] = [];
  const sorted = [...photos].sort((a, b) => (a.year || '0').localeCompare(b.year || '0'));
  const margin = 80, usableW = w - margin * 2;
  sorted.forEach((p, i) => {
    const x = margin + (i / Math.max(sorted.length - 1, 1)) * usableW;
    const y = h / 2 + (Math.sin(i * 0.7) * h * 0.15);
    nodes.push({ id: 'p:' + p.file, x, y, gx: x, gy: y, r: 5, label: p.title, type: 'photo', cat: p.category, tags: p.tags, photoUrl: p.url, year: p.year, vx: 0, vy: 0 });
    if (i > 0) edges.push({ a: 'p:' + sorted[i - 1].file, b: 'p:' + p.file, type: 'cat' });
  });
  const years = [...new Set(sorted.map(p => p.year).filter(Boolean))];
  years.forEach(yr => {
    const yp = sorted.filter(p => p.year === yr);
    const avgX = yp.reduce((s, p) => s + (nodes.find(n => n.id === 'p:' + p.file)?.x || 0), 0) / yp.length;
    nodes.push({ id: 'yr:' + yr, x: avgX, y: h / 2 - h * 0.28, gx: avgX, gy: h / 2 - h * 0.28, r: 6, label: yr!, type: 'cat', vx: 0, vy: 0 });
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
    n.vx += (n.gx - n.x) * .025;
    n.vy += (n.gy - n.y) * .025;

    if (mouseGX !== undefined && mouseGY !== undefined) {
      const dx = mouseGX - n.x, dy = mouseGY - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100 && dist > 5 && n.type === 'photo') {
        n.vx += dx / dist * 0.3;
        n.vy += dy / dist * 0.3;
      }
    }

    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j];
      const dx = n.x - m.x, dy = n.y - m.y;
      const d = Math.sqrt(dx * dx + dy * dy) || .1;
      const minD = (n.r + m.r) * 3 + 18;
      if (d < minD) {
        const f = (minD - d) * .04;
        n.vx += dx / d * f; n.vy += dy / d * f;
        m.vx -= dx / d * f; m.vy -= dy / d * f;
      }
    }

    n.vx *= .55; n.vy *= .55;
    if (n.id !== dragId) {
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(50, Math.min(w - 50, n.x));
      n.y = Math.max(40, Math.min(h - 40, n.y));
    }
  }

  for (const e of edges) {
    const a = nodes.find(n => n.id === e.a), b = nodes.find(n => n.id === e.b);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || .1;
    const tgt = e.type === 'tag' ? 35 : e.type === 'color' ? 45 : 55;
    const f = (d - tgt) * .008;
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

  edges.forEach(e => {
    const a = nodes.find(n => n.id === e.a), b = nodes.find(n => n.id === e.b);
    if (!a || !b) return;
    const lit = hE.has(e);
    const isVisited = visited.has(a.id) && visited.has(b.id);

    if (e.type === 'location' && !lit) return;
    if (e.type === 'tag' && zoom < 1.0 && !lit) return;

    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);

    if (e.type === 'location') {
      ctx.strokeStyle = LOC_COLOR + '99'; ctx.lineWidth = 0.6;
      ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); return;
    }
    if (e.type === 'tag') {
      ctx.strokeStyle = lit ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.06)';
      ctx.lineWidth = 0.4; ctx.stroke(); return;
    }

    if (isVisited) {
      ctx.strokeStyle = 'rgba(200,192,168,.4)'; ctx.lineWidth = 0.8;
      const offset = (Date.now() / 80) % 16;
      ctx.setLineDash([4, 4]); ctx.lineDashOffset = -offset;
      ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    } else if (anyH) {
      ctx.strokeStyle = lit ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.04)';
      ctx.lineWidth = lit ? 0.7 : 0.15; ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 0.5; ctx.stroke();
    }
  });

  nodes.forEach(n => {
    const isH = n.id === hovId, inS = hN.has(n.id), dim = anyH && !inS;
    const isVisited = visited.has(n.id);

    if (n.type === 'cat' || n.type === 'color-group') {
      const c = n.type === 'color-group' ? (n.dominantColor || '#888') : getCatColor(n.cat || '');
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (isH ? 2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.15)' : '#fff'; ctx.fill();
      ctx.strokeStyle = dim ? 'rgba(255,255,255,.1)' : c;
      ctx.lineWidth = isH ? 2 : 1.2; ctx.stroke();
      ctx.fillStyle = dim ? 'rgba(255,255,255,.15)' : '#e8e6e0';
      ctx.font = '500 10px JetBrains Mono,monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x + n.r + 8, n.y);

    } else if (n.type === 'location') {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (isH ? 1.5 : 0), 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.03)' : LOC_COLOR + '44'; ctx.fill();
      ctx.strokeStyle = dim ? 'rgba(255,255,255,.06)' : LOC_COLOR + (isH ? 'ee' : '88');
      ctx.lineWidth = isH ? 1.5 : 1; ctx.stroke();
      if (zoom > 0.55) {
        ctx.fillStyle = dim ? 'rgba(255,255,255,.06)' : LOC_COLOR + (isH ? 'ff' : 'bb');
        ctx.font = '400 8px JetBrains Mono,monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('◉ ' + n.label, n.x + n.r + 6, n.y);
      }

    } else if (n.type === 'photo') {
      const c = n.dominantColor || getCatColor(n.cat || '');
      const sz = n.r + (isH ? 2 : 0);
      if (isVisited && !dim) {
        ctx.beginPath(); ctx.arc(n.x, n.y, sz + 4, 0, Math.PI * 2);
        ctx.fillStyle = c + '20'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.06)' : isH ? '#fff' : c;
      ctx.fill();
      if (isH) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (zoom > 0.8) {
        ctx.fillStyle = dim ? 'rgba(255,255,255,.05)' : isH ? '#fff' : 'rgba(255,255,255,.45)';
        ctx.font = (isH ? '500 ' : '') + '8px JetBrains Mono,monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x + n.r + 5, n.y);
      }

    } else {
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + (isH ? 1 : 0), 0, Math.PI * 2);
      ctx.fillStyle = dim ? 'rgba(255,255,255,.03)' : isH ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.15)';
      ctx.fill();
      if (zoom > 1.2) {
        ctx.fillStyle = dim ? 'rgba(255,255,255,.04)' : isH ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)';
        ctx.font = '300 7px JetBrains Mono,monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x + n.r + 4, n.y);
      }
    }
  });
}
