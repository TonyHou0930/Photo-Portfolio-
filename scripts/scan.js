/**
 * npm run scan
 *
 * 1. Scans public/photos/ subfolders → projects
 * 2. Reads EXIF (GPS, camera, date)
 * 3. Converts to WebP (optimized size)
 * 4. Generates blur placeholder (tiny base64)
 * 5. Writes data/photos.json
 */

const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');
const sharp = require('sharp');

const PHOTOS_DIR = path.join(__dirname, '..', 'public', 'photos');
const DATA_PATH = path.join(__dirname, '..', 'data', 'photos.json');
const EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.heic'];
const WEBP_QUALITY = 82;
const BLUR_SIZE = 20;

// ── EXIF ──
async function readExif(filePath) {
  const r = { year:'', camera:'', focalLength:'', aperture:'', shutterSpeed:'', iso:'', location:'', lat:undefined, lng:undefined };
  try {
    const buf = fs.readFileSync(filePath);
    const tags = ExifReader.load(buf, { expanded: true });
    const d = tags.exif?.DateTimeOriginal?.description || tags.exif?.DateTime?.description;
    if (d) { const m = d.match(/^(\d{4})/); if (m) r.year = m[1]; }
    r.camera = tags.exif?.Model?.description || '';
    if (tags.exif?.FocalLength?.description) r.focalLength = tags.exif.FocalLength.description.replace(' mm','mm');
    if (tags.exif?.FNumber?.description) r.aperture = 'f/' + tags.exif.FNumber.description;
    if (tags.exif?.ExposureTime?.description) r.shutterSpeed = tags.exif.ExposureTime.description + 's';
    if (tags.exif?.ISOSpeedRatings?.description) r.iso = 'ISO ' + tags.exif.ISOSpeedRatings.description;
    if (tags.gps?.Latitude && tags.gps?.Longitude) {
      r.lat = tags.gps.Latitude; r.lng = tags.gps.Longitude;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${r.lat}&lon=${r.lng}&format=json&zoom=10&accept-language=en`, { headers: { 'User-Agent': 'PortfolioOS/1.0' } });
        if (res.ok) { const d = await res.json(); const c = d.address?.city||d.address?.town||d.address?.village||d.address?.county; r.location = c ? `${c}, ${d.address?.country}` : (d.address?.country||''); }
        await new Promise(r => setTimeout(r, 1100));
      } catch {}
    }
  } catch {}
  return r;
}

// ── WebP conversion ──
async function convertToWebp(srcPath, destPath) {
  try {
    await sharp(srcPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(destPath);
    const srcStat = fs.statSync(srcPath);
    const dstStat = fs.statSync(destPath);
    const saved = Math.round((1 - dstStat.size / srcStat.size) * 100);
    return { size: dstStat.size, saved };
  } catch (e) {
    return null;
  }
}

// ── Blur placeholder ──
async function generateBlurPlaceholder(filePath) {
  try {
    const buf = await sharp(filePath)
      .resize(BLUR_SIZE, BLUR_SIZE, { fit: 'cover' })
      .webp({ quality: 20 })
      .toBuffer();
    return `data:image/webp;base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

// ── Helpers ──
function fileToTitle(f) { return f.replace(/\.[^/.]+$/,'').replace(/[_\-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim()||'Untitled'; }
function dirToId(d) { return d.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

// ── Main ──
async function main() {
  console.log('\n  ◈ Portfolio OS — Scan + Optimize\n');
  if (!fs.existsSync(PHOTOS_DIR)) { fs.mkdirSync(PHOTOS_DIR, { recursive: true }); console.log('  Created public/photos/\n'); return; }
  const dataDir = path.dirname(DATA_PATH); if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  let existing = { projects: [] };
  try { if (fs.existsSync(DATA_PATH)) existing = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')); } catch {}
  const existingProjects = new Map();
  (existing.projects || []).forEach(p => existingProjects.set(p.id, p));

  const entries = fs.readdirSync(PHOTOS_DIR, { withFileTypes: true });
  const subdirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  const rootFiles = entries.filter(e => e.isFile() && EXTS.includes(path.extname(e.name).toLowerCase())).map(e => e.name);

  const projectDirs = subdirs.length > 0
    ? subdirs.map(d => ({ dir: d, id: dirToId(d), title: fileToTitle(d), files: fs.readdirSync(path.join(PHOTOS_DIR, d)).filter(f => EXTS.includes(path.extname(f).toLowerCase())).sort() }))
    : [{ dir: '.', id: 'default', title: 'Works', files: rootFiles.sort() }];

  const result = {
    defaultMusic: existing.defaultMusic || '',
    defaultMusicTitle: existing.defaultMusicTitle || '',
    defaultMusicArtist: existing.defaultMusicArtist || '',
    projects: []
  };

  let totalSaved = 0;

  for (const pd of projectDirs) {
    if (!pd.files.length) continue;
    const existP = existingProjects.get(pd.id);
    const existPhotos = new Map();
    if (existP) existP.photos.forEach(p => existPhotos.set(p.file, p));

    const photos = [];
    let projLoc = existP?.location || '';
    let projYear = existP?.year || '';
    const photoDir = pd.dir === '.' ? PHOTOS_DIR : path.join(PHOTOS_DIR, pd.dir);

    console.log(`  📁 ${pd.dir === '.' ? 'root' : pd.dir}`);

    for (const file of pd.files) {
      // Skip already-converted webp duplicates
      const baseName = file.replace(/\.[^/.]+$/, '');
      const ext = path.extname(file).toLowerCase();

      if (existPhotos.has(file) && existPhotos.get(file).blurDataURL) {
        photos.push(existPhotos.get(file));
        continue;
      }

      const fp = path.join(photoDir, file);
      process.stdout.write(`     ${file}`);

      // Read EXIF
      const exif = await readExif(fp);
      if (exif.location) process.stdout.write(` → ${exif.location}`);

      // Convert to WebP if not already
      let webpFile = file;
      if (ext !== '.webp') {
        webpFile = baseName + '.webp';
        const webpPath = path.join(photoDir, webpFile);
        if (!fs.existsSync(webpPath)) {
          const result = await convertToWebp(fp, webpPath);
          if (result) {
            process.stdout.write(` [webp -${result.saved}%]`);
            totalSaved += result.saved;
          }
        } else {
          process.stdout.write(` [webp ✓]`);
        }
      }

      // Generate blur placeholder
      const blurDataURL = await generateBlurPlaceholder(fp);
      process.stdout.write(` [blur ✓]`);
      console.log('');

      if (!projLoc && exif.location) projLoc = exif.location;
      if (!projYear && exif.year) projYear = exif.year;

      // Preserve existing edits
      const existEntry = existPhotos.get(file);
      photos.push({
        file: webpFile,
        originalFile: ext !== '.webp' ? file : undefined,
        title: existEntry?.title || fileToTitle(file),
        featured: existEntry?.featured ?? false,
        location: existEntry?.location || exif.location || '',
        year: existEntry?.year || exif.year || '',
        camera: existEntry?.camera || exif.camera || '',
        focalLength: existEntry?.focalLength || exif.focalLength || '',
        aperture: existEntry?.aperture || exif.aperture || '',
        shutterSpeed: existEntry?.shutterSpeed || exif.shutterSpeed || '',
        iso: existEntry?.iso || exif.iso || '',
        tags: existEntry?.tags || [],
        blurDataURL,
      });
    }

    result.projects.push({
      id: pd.id,
      dir: pd.dir === '.' ? '' : pd.dir,
      title: existP?.title || pd.title,
      story: existP?.story || '',
      cover: existP?.cover || (photos[0]?.file || ''),
      location: projLoc,
      year: projYear,
      tags: existP?.tags || [],
      music: existP?.music || '',
      musicTitle: existP?.musicTitle || '',
      musicArtist: existP?.musicArtist || '',
      photos,
    });
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(result, null, 2));
  const totalPhotos = result.projects.reduce((s, p) => s + p.photos.length, 0);
  console.log(`\n  ✓ ${result.projects.length} projects, ${totalPhotos} photos`);
  console.log(`  ✓ WebP converted, blur placeholders generated`);
  console.log(`  ✓ Saved to data/photos.json\n`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
