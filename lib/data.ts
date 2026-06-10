export interface PhotoItem {
  file: string;
  originalFile?: string;
  title: string;
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
}

export function flattenPhotos(data: PortfolioData): FlatPhoto[] {
  const all: FlatPhoto[] = [];
  data.projects.forEach(proj => {
    proj.photos.forEach(p => {
      const dir = proj.dir;
      all.push({
        file: p.file, title: p.title,
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

const PALETTE = ['#5d9ab8','#c8a84a','#5db88a','#a87ab8','#b85d5d','#5db8b8','#b8a85d','#7a5db8'];
const colorMap: Record<string, string> = {}; let ci = 0;
export function getCatColor(cat: string): string {
  if (!cat) return '#555';
  if (!colorMap[cat]) { colorMap[cat] = PALETTE[ci % PALETTE.length]; ci++; }
  return colorMap[cat];
}
