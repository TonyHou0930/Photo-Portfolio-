const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');
const crypto = require('crypto');

const PHOTOS_DIR = path.join(__dirname, '..', 'public', 'photos');
const DATA_PATH = path.join(__dirname, '..', 'data', 'photos.json');
const ORIG_EXTS = ['.jpg', '.jpeg', '.png', '.tiff', '.heic'];
const ALL_EXTS = [...ORIG_EXTS, '.webp'];
const BATCH_SIZE = 6;

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

function readExifSync(filePath) {
  const r = { year:'', camera:'', focalLength:'', aperture:'', shutterSpeed:'', iso:'', lat:undefined, lng:undefined };
  try {
    const buf = fs.readFileSync(filePath);
    const tags = ExifReader.load(buf, { expanded: true });
    const d = tags.exif?.DateTimeOriginal?.description || tags.exif?.DateTime?.description;
    if (d) { const m = d.match(/^(\d{4})/); if (m) r.year = m[1]; }
    r.camera = tags.exif?.Model?.description || '';
    if (tags.exif?.FocalLength?.description) r.focalLength = tags.exif.FocalLength.description.replace(' mm','mm');
    if (tags.exif?.FNumber?.description) { const fn = tags.exif.FNumber.description; r.aperture = fn.startsWith('f/') ? fn : 'f/' + fn; }
    if (tags.exif?.ExposureTime?.description) r.shutterSpeed = tags.exif.ExposureTime.description + 's';
    if (tags.exif?.ISOSpeedRatings?.description) r.iso = 'ISO ' + tags.exif.ISOSpeedRatings.description;
    if (tags.gps && tags.gps.Latitude !== undefined && tags.gps.Longitude !== undefined) {
      r.lat = Math.round(parseFloat(tags.gps.Latitude) * 100) / 100;
      r.lng = Math.round(parseFloat(tags.gps.Longitude) * 100) / 100;
    }
  } catch {}
  return r;
}

const geoCache = new Map();
async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geoCache.has(key)) return geoCache.get(key);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`, { headers: { 'User-Agent': 'PortfolioOS/1.0' } });
    if (res.ok) { const d = await res.json(); const c = d.address?.city||d.address?.town||d.address?.village||d.address?.county; const loc = c ? `${c}, ${d.address?.country}` : (d.address?.country||''); geoCache.set(key, loc); return loc; }
  } catch {}
  return '';
}

async function forwardGeocode(locationName) {
  if (!locationName) return { lat: undefined, lng: undefined };
  if (geoCache.has('fwd:' + locationName)) return geoCache.get('fwd:' + locationName);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`, { headers: { 'User-Agent': 'PortfolioOS/1.0' } });
    if (res.ok) { const r = await res.json(); if (r.length > 0) { const result = { lat: parseFloat(r[0].lat), lng: parseFloat(r[0].lon) }; geoCache.set('fwd:' + locationName, result); return result; } }
  } catch {}
  return { lat: undefined, lng: undefined };
}

async function processImage(fp, ext, baseName, photoDir) {
  const results = { webpFile: null, blurDataURL: '', dominantColor: '' };

  if (ext !== '.webp' && sharp) {
    const webpFile = baseName + '.webp';
    const webpPath = path.join(photoDir, webpFile);
    if (!fs.existsSync(webpPath)) {
      try { await sharp(fp).rotate().webp({ quality: 82 }).toFile(webpPath); } catch {}
    }
    results.webpFile = webpFile;
  }

  if (sharp) {
    try {
      const { dominant } = await sharp(fp).resize(4, 4).stats();
      const { r, g, b } = dominant;
      results.dominantColor = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    } catch {}
    try {
      const buf = await sharp(fp).resize(20, 20, { fit: 'cover' }).webp({ quality: 20 }).toBuffer();
      results.blurDataURL = `data:image/webp;base64,${buf.toString('base64')}`;
    } catch {}
  }

  return results;
}

function fileToTitle(f) { return f.replace(/\.[^/.]+$/,'').replace(/[_\-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim()||'Untitled'; }

function dirToId(d) {
  const ascii = d.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if (ascii) return ascii;
  return crypto.createHash('md5').update(d).digest('hex').slice(0, 8);
}

function collectOriginals(dir) {
  const all = fs.readdirSync(dir).filter(f => {
    if (f.startsWith('.')) return false;
    return ALL_EXTS.includes(path.extname(f).toLowerCase());
  }).sort();

  const baseMap = new Map();
  for (const f of all) {
    const ext = path.extname(f).toLowerCase();
    const base = f.replace(/\.[^/.]+$/, '');
    if (!baseMap.has(base)) {
      baseMap.set(base, { originals: [], webp: null });
    }
    const entry = baseMap.get(base);
    if (ext === '.webp') {
      entry.webp = f;
    } else {
      entry.originals.push(f);
    }
  }

  const result = [];
  for (const [base, entry] of baseMap) {
    if (entry.originals.length > 0) {
      result.push(entry.originals[0]);
    } else if (entry.webp) {
      result.push(entry.webp);
    }
  }
  return result;
}

function findOriginal(photoDir, baseName) {
  for (const ext of ORIG_EXTS) {
    const candidate = path.join(photoDir, baseName + ext);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function hasExif(photo) {
  return !!(photo.camera || photo.focalLength || photo.aperture || photo.iso || photo.year);
}

async function processBatch(files, photoDir, existPhotos) {
  return Promise.all(files.map(async (file) => {
    const ext = path.extname(file).toLowerCase();
    const baseName = file.replace(/\.[^/.]+$/, '');
    const fp = path.join(photoDir, file);
    const webpKey = baseName + '.webp';

    const existEntry = existPhotos.get(file) || existPhotos.get(webpKey);
    if (existEntry && existEntry.blurDataURL && hasExif(existEntry)) {
      return { photo: existEntry, skipped: true, file };
    }

    const origPath = (ext === '.webp') ? findOriginal(photoDir, baseName) : fp;
    const exifSource = origPath || fp;
    const exif = readExifSync(exifSource);

    const img = await processImage(fp, ext, baseName, photoDir);
    const displayFile = img.webpFile || file;

    return {
      skipped: false,
      file,
      photo: {
        file: displayFile,
        originalFile: ext !== '.webp' ? file : undefined,
        title: existEntry?.title || fileToTitle(file),
        story: existEntry?.story || '',
        featured: existEntry?.featured ?? false,
        location: existEntry?.location || '',
        year: exif.year || existEntry?.year || '',
        camera: exif.camera || existEntry?.camera || '',
        focalLength: exif.focalLength || existEntry?.focalLength || '',
        aperture: exif.aperture || existEntry?.aperture || '',
        shutterSpeed: exif.shutterSpeed || existEntry?.shutterSpeed || '',
        iso: exif.iso || existEntry?.iso || '',
        tags: existEntry?.tags || [],
        lat: exif.lat ?? existEntry?.lat,
        lng: exif.lng ?? existEntry?.lng,
        blurDataURL: img.blurDataURL || existEntry?.blurDataURL || '',
        dominantColor: img.dominantColor || existEntry?.dominantColor || '',
      },
      exif,
    };
  }));
}

async function main() {
  const startTime = Date.now();
  console.log('\n  ◈ Portfolio OS — Scan\n');

  if (!fs.existsSync(PHOTOS_DIR)) { fs.mkdirSync(PHOTOS_DIR, { recursive: true }); console.log('  Created public/photos/\n'); return; }
  const dataDir = path.dirname(DATA_PATH); if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  let existing = { projects: [] };
  try { if (fs.existsSync(DATA_PATH)) { const raw = fs.readFileSync(DATA_PATH, 'utf-8').trim(); if (raw) existing = JSON.parse(raw); } } catch {}
  const existingProjects = new Map();
  (existing.projects || []).forEach(p => existingProjects.set(p.dir || p.id, p));

  const entries = fs.readdirSync(PHOTOS_DIR, { withFileTypes: true });
  const subdirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  const projectDirs = subdirs.length > 0
    ? subdirs.map(d => ({ dir: d, id: dirToId(d), title: d, files: collectOriginals(path.join(PHOTOS_DIR, d)) }))
    : [{ dir: '.', id: 'default', title: 'Works', files: collectOriginals(PHOTOS_DIR) }];

  const result = {
    defaultMusic: existing.defaultMusic || '',
    defaultMusicTitle: existing.defaultMusicTitle || '',
    defaultMusicArtist: existing.defaultMusicArtist || '',
    projects: []
  };

  for (const pd of projectDirs) {
    if (!pd.files.length) continue;
    const existP = existingProjects.get(pd.dir) || existingProjects.get(pd.id);
    const existPhotos = new Map();
    if (existP) existP.photos.forEach(p => {
      existPhotos.set(p.file, p);
      if (p.originalFile) existPhotos.set(p.originalFile, p);
    });

    const photoDir = pd.dir === '.' ? PHOTOS_DIR : path.join(PHOTOS_DIR, pd.dir);
    let projLoc = existP?.location || '';
    let projYear = existP?.year || '';

    console.log(`  📁 ${pd.dir === '.' ? 'root' : pd.dir} (${pd.files.length} files)`);

    const allPhotos = [];
    for (let i = 0; i < pd.files.length; i += BATCH_SIZE) {
      const batch = pd.files.slice(i, i + BATCH_SIZE);
      const batchLabel = `     batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pd.files.length / BATCH_SIZE)}`;
      process.stdout.write(`${batchLabel}: ${batch.length} photos...`);

      const results = await processBatch(batch, photoDir, existPhotos);

      const newCount = results.filter(r => !r.skipped).length;
      const skipCount = results.filter(r => r.skipped).length;
      console.log(` ✓ (${newCount} new, ${skipCount} cached)`);

      allPhotos.push(...results);
    }

    const needsGeocode = allPhotos.filter(r => !r.skipped && r.photo.lat !== undefined && !r.photo.location);
    const needsForwardGeo = allPhotos.filter(r => !r.skipped && r.photo.lat === undefined && r.photo.location);

    if (needsGeocode.length > 0) {
      console.log(`     geocoding ${needsGeocode.length} locations...`);
      for (const r of needsGeocode) {
        const loc = await reverseGeocode(r.photo.lat, r.photo.lng);
        if (loc) r.photo.location = loc;
        await new Promise(res => setTimeout(res, 1100));
      }
      console.log(`     ✓ reverse geocoding done`);
    }

    if (needsForwardGeo.length > 0) {
      console.log(`     forward geocoding ${needsForwardGeo.length} locations...`);
      for (const r of needsForwardGeo) {
        const geo = await forwardGeocode(r.photo.location);
        if (geo.lat !== undefined) { r.photo.lat = geo.lat; r.photo.lng = geo.lng; }
        await new Promise(res => setTimeout(res, 1100));
      }
      console.log(`     ✓ forward geocoding done`);
    }

    const photos = allPhotos.map(r => r.photo);
    photos.forEach(p => {
      if (!projLoc && p.location) projLoc = p.location;
      if (!projYear && p.year) projYear = p.year;
    });

    const coverFile = photos[0]?.originalFile || photos[0]?.file || '';

    result.projects.push({
      id: pd.id,
      dir: pd.dir === '.' ? '' : pd.dir,
      title: existP?.title || pd.title,
      story: existP?.story || '',
      cover: existP?.cover || coverFile,
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
  const withGPS = result.projects.reduce((s, p) => s + p.photos.filter(ph => ph.lat !== undefined).length, 0);
  const withExif = result.projects.reduce((s, p) => s + p.photos.filter(ph => hasExif(ph)).length, 0);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n  ✓ ${result.projects.length} projects, ${totalPhotos} photos`);
  console.log(`  ✓ ${withExif} photos with EXIF data`);
  console.log(`  ✓ ${withGPS} photos with GPS coordinates`);
  console.log(`  ✓ Done in ${elapsed}s`);
  console.log(`  ✓ Saved to data/photos.json\n`);
}

main().catch(err => { console.error('  Error:', err.message); process.exit(1); });
