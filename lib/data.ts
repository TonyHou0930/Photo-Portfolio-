export interface PhotoItem {
  file: string;
  originalFile?: string;
  title: string;
  story?: string;
  url?: string;
  featured?: boolean;
  location?: string;
  year?: string;
  camera?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  tags?: string[];
  blurDataURL?: string;
  lat?: number;
  lng?: number;
  width?: number;
  height?: number;
}

export interface Project {
  id: string;
  dir?: string;
  title: string;
  story?: string;
  cover: string;
  location?: string;
  year?: string;
  tags: string[];
  music?: string;
  musicTitle?: string;
  musicArtist?: string;
  photos: PhotoItem[];
}

export interface PortfolioData {
  defaultMusic?: string;
  defaultMusicTitle?: string;
  defaultMusicArtist?: string;
  projects: Project[];
}

export interface FlatPhoto {
  file: string;
  title: string;
  story?: string;
  url: string;
  blurDataURL?: string;
  projectId: string;
  projectTitle: string;
  location: string;
  year: string;
  category: string;
  tags: string[];
  featured: boolean;
  camera?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  lat?: number;
  lng?: number;
  width?: number;
  height?: number;
}

export function flattenPhotos(data: PortfolioData): FlatPhoto[] {
  const all: FlatPhoto[] = [];
  data.projects.forEach(proj => {
    proj.photos.forEach(p => {
      const dir = proj.dir;
      all.push({
        file: p.file, title: p.title, story: p.story,
        url: dir ? `/photos/${dir}/${p.file}` : `/photos/${p.file}`,
        blurDataURL: p.blurDataURL,
        projectId: proj.id, projectTitle: proj.title,
        location: p.location || proj.location || '',
        year: p.year || proj.year || '',
        category: proj.title,
        tags: [...new Set([...(proj.tags || []), ...(p.tags || [])])],
        featured: p.featured ?? false,
        camera: p.camera, focalLength: p.focalLength,
        aperture: p.aperture, shutterSpeed: p.shutterSpeed, iso: p.iso,
        lat: p.lat,
        lng: p.lng,
        width: p.width,
        height: p.height,
      });
    });
  });
  return all;
}

export function getRelatedPhotos(current: FlatPhoto, allPhotos: FlatPhoto[], limit = 3): FlatPhoto[] {
  return allPhotos
    .filter(p => p.file !== current.file && p.projectId !== current.projectId)
    .map(p => ({ photo: p, score: p.tags.filter(t => current.tags.includes(t)).length + (p.location === current.location ? 2 : 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.photo);
}

export function exifString(p: FlatPhoto): string {
  return [p.camera, p.focalLength, p.aperture, p.shutterSpeed, p.iso].filter(Boolean).join(' · ');
}
export function exifDetails(p: FlatPhoto): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  if (p.camera) items.push({ label: 'Camera', value: p.camera });
  if (p.focalLength) items.push({ label: 'Focal', value: p.focalLength });
  if (p.aperture) items.push({ label: 'Aperture', value: p.aperture });
  if (p.shutterSpeed) items.push({ label: 'Shutter', value: p.shutterSpeed });
  if (p.iso) items.push({ label: 'ISO', value: p.iso });
  return items;
}
// Focal length → category
export function focalCategory(fl?: string): string | null {
  if (!fl) return null;
  const mm = parseFloat(fl);
  if (isNaN(mm)) return null;
  if (mm <= 24) return 'Ultra Wide';
  if (mm <= 50) return 'Standard';
  if (mm <= 85) return 'Portrait';
  if (mm <= 200) return 'Telephoto';
  return 'Super Tele';
}

// EXIF → shooting style(s)
export function shootingStyles(p: FlatPhoto): string[] {
  const styles: string[] = [];
  if (p.aperture) {
    const f = parseFloat(p.aperture.replace('f/', ''));
    if (!isNaN(f) && f <= 2.8) styles.push('Bokeh');
    if (!isNaN(f) && f >= 8) styles.push('Sharp');
  }
  if (p.iso) {
    const iso = parseInt(p.iso.replace('ISO ', ''));
    if (!isNaN(iso) && iso >= 1600) styles.push('Low Light');
  }
  if (p.shutterSpeed) {
    const raw = p.shutterSpeed.replace('s', '');
    let sec = 0;
    if (raw.includes('/')) { const [a, b] = raw.split('/'); sec = parseFloat(a) / parseFloat(b); }
    else sec = parseFloat(raw);
    if (!isNaN(sec)) {
      if (sec >= 1 / 30) styles.push('Long Exposure');
      if (sec <= 1 / 1000) styles.push('Freeze');
    }
  }
  return styles;
}

const ZH_COUNTRY: Record<string, string> = {
  '台灣': 'Taiwan', '日本': 'Japan', '韓國': 'South Korea',
  '中國': 'China', '香港': 'Hong Kong', '泰國': 'Thailand',
  '德國': 'Germany', '法國': 'France', '義大利': 'Italy', '意大利': 'Italy',
  '西班牙': 'Spain', '英國': 'United Kingdom', '荷蘭': 'Netherlands',
  '瑞士': 'Switzerland', '奧地利': 'Austria', '捷克': 'Czech Republic',
  '美國': 'United States of America', '加拿大': 'Canada',
  '澳洲': 'Australia', '紐西蘭': 'New Zealand',
  '越南': 'Vietnam', '新加坡': 'Singapore', '馬來西亞': 'Malaysia',
  '印尼': 'Indonesia', '菲律賓': 'Philippines', '印度': 'India',
  '冰島': 'Iceland', '挪威': 'Norway', '瑞典': 'Sweden', '丹麥': 'Denmark',
  '芬蘭': 'Finland', '波蘭': 'Poland', '匈牙利': 'Hungary', '希臘': 'Greece',
  '土耳其': 'Turkey', '克羅埃西亞': 'Croatia', '葡萄牙': 'Portugal',
  '比利時': 'Belgium', '愛爾蘭': 'Ireland', '俄羅斯': 'Russia',
  '埃及': 'Egypt', '南非': 'South Africa', '墨西哥': 'Mexico',
  '巴西': 'Brazil', '阿根廷': 'Argentina', '秘魯': 'Peru',
  '柬埔寨': 'Cambodia', '緬甸': 'Myanmar', '寮國': 'Laos',
  '蒙古': 'Mongolia', '尼泊爾': 'Nepal',
};
const EN_TO_ZH = Object.fromEntries(Object.entries(ZH_COUNTRY).map(([z, e]) => [e, z]));

export function locationCountryEn(loc: string): string | null {
  for (const zh of Object.keys(ZH_COUNTRY)) {
    if (loc.startsWith(zh)) return ZH_COUNTRY[zh];
  }
  return null;
}

export function matchCountry(loc: string, countryEn: string): boolean {
  const zh = EN_TO_ZH[countryEn];
  return zh ? loc.startsWith(zh) : false;
}

const PALETTE = ['#f5b1ae','#f5c28c','#f0e878','#bef078','#86f078','#78f0b4','#78f0e4','#78b8f0','#b478f0','#f078de'];
const colorMap: Record<string, string> = {}; let ci = 0;
export function getCatColor(cat: string): string {
  if (!cat) return '#555';
  if (!colorMap[cat]) { colorMap[cat] = PALETTE[ci % PALETTE.length]; ci++; }
  return colorMap[cat];
}
