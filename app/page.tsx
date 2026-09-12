'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Gallery from '@/components/Gallery';
import GraphView from '@/components/GraphView';
import CameraView from '@/components/CameraView';
import MapView from '@/components/MapView';
import SeriesView from '@/components/SeriesView';
import Lightbox from '@/components/Lightbox';
import { PortfolioData, Project, FlatPhoto, flattenPhotos, matchCountry } from '@/lib/data';

type Filter = { type: string; value: string };
type ViewMode = 'gallery' | 'graph' | 'camera' | 'map';

export default function Home() {
  const [data, setData] = useState<PortfolioData>({ projects: [] });
  const [sbOff, setSbOff] = useState(false);
  const [view, setView] = useState<ViewMode>('gallery');
  const [filter, setFilter] = useState<Filter>({ type: 'all', value: 'all' });
  const [seriesProject, setSeriesProject] = useState<Project | null>(null);
  const [lbFile, setLbFile] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('portfolio-theme');
    if (saved === 'dark') {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('portfolio-theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    fetch('/api/photos').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 1024) setSbOff(true);
  }, []);

  const projects = data.projects.filter(p => p.photos.length > 0);
  const allPhotos = useMemo(() => flattenPhotos(data), [data]);

  const filtered = useMemo(() => {
    let pool = allPhotos;
    if (filter.type === 'cat') pool = pool.filter(p => p.category === filter.value);
    if (filter.type === 'loc') pool = pool.filter(p => p.location === filter.value);
    if (filter.type === 'tag') pool = pool.filter(p => p.tags.includes(filter.value));
    if (filter.type === 'project') pool = pool.filter(p => p.projectId === filter.value);
    if (filter.type === 'country') pool = pool.filter(p => matchCountry(p.location, filter.value));
    const feat = pool.filter(p => p.featured);
    return feat.length > 0 ? feat : pool;
  }, [allPhotos, filter]);

  const graphFiltered = useMemo(() => {
    let pool = allPhotos;
    if (filter.type === 'cat') pool = pool.filter(p => p.category === filter.value);
    if (filter.type === 'loc') pool = pool.filter(p => p.location === filter.value);
    if (filter.type === 'tag') pool = pool.filter(p => p.tags.includes(filter.value));
    if (filter.type === 'project') pool = pool.filter(p => p.projectId === filter.value);
    if (filter.type === 'country') pool = pool.filter(p => matchCountry(p.location, filter.value));
    return pool;
  }, [allPhotos, filter]);

  const pathLabel = filter.type === 'all' ? 'All Works'
    : filter.type === 'tag' ? '#' + filter.value
    : filter.type === 'country' ? '🌍 ' + filter.value
    : filter.value;

  const openLightbox = useCallback((file: string) => {
    setLbFile(file);
  }, []);

  const lbPhoto = useMemo(() => allPhotos.find(p => p.file === lbFile) || null, [allPhotos, lbFile]);

  const currentMusic = useMemo(() => {
    if (seriesProject?.music) return { src: seriesProject.music, title: seriesProject.musicTitle || '', artist: seriesProject.musicArtist || '' };
    return { src: data.defaultMusic || '', title: data.defaultMusicTitle || '', artist: data.defaultMusicArtist || '' };
  }, [seriesProject, data]);

  const openSeries = useCallback((projectId: string) => {
    const proj = projects.find(p => p.id === projectId || p.title === projectId);
    if (proj) { setSeriesProject(proj); setSbOff(true); }
  }, [projects]);

  const handleFilter = useCallback((f: Filter) => {
    const isMobile = window.innerWidth <= 1024;
    if (f.type === 'project') { openSeries(f.value); setFilter(f); return; }
    setSeriesProject(null); setSbOff(isMobile); setFilter(f);
  }, [openSeries]);

  const closeSeries = useCallback(() => {
    setSeriesProject(null); setSbOff(window.innerWidth <= 1024); setFilter({ type: 'all', value: 'all' });
  }, []);

  const goHome = useCallback(() => {
    setSeriesProject(null);
    setLbFile(null);
    setView('gallery');
    setFilter({ type: 'all', value: 'all' });
    setSbOff(window.innerWidth <= 1024);
  }, []);

  const onGraphCatClick = useCallback((cat: string, photoFiles: string[]) => {
    const proj = projects.find(p => p.title === cat);
    if (proj) { openSeries(proj.id); return; }
    if (photoFiles.length > 0) {
      const matched = allPhotos.filter(p => photoFiles.includes(p.file));
      if (!matched.length) return;
      const locs = [...new Set(matched.map(p => p.location).filter(Boolean))];
      const yrs = [...new Set(matched.map(p => p.year).filter(Boolean))].sort();
      const tags = [...new Set(matched.flatMap(p => p.tags))];
      const virtualProj: Project = {
        id: '__virtual__', title: cat, cover: matched[0].file,
        location: locs.length <= 2 ? locs.join(' & ') : `${locs.length} locations`,
        year: yrs.length === 1 ? yrs[0] : yrs.length > 1 ? `${yrs[0]}–${yrs[yrs.length - 1]}` : '',
        tags,
        photos: matched.map(p => ({
          file: p.file, title: p.title, url: p.url,
          location: p.location, year: p.year,
          camera: p.camera, focalLength: p.focalLength,
          aperture: p.aperture, shutterSpeed: p.shutterSpeed, iso: p.iso,
          tags: p.tags, blurDataURL: p.blurDataURL, lat: p.lat, lng: p.lng,
          width: p.width, height: p.height,
        })),
      };
      setSeriesProject(virtualProj); setSbOff(true);
      return;
    }
    setFilter({ type: 'cat', value: cat }); setView('gallery');
  }, [projects, openSeries, allPhotos]);

  if (!projects.length) return (
    <div className="shell">
      <div className="empty">
        <div className="empty-icon">◈</div>
        <div className="empty-text">No projects yet</div>
        <div className="empty-sub">Edit <code>data/photos.json</code> to add your projects</div>
      </div>
    </div>
  );

  return (
    <div className="shell">
      {!seriesProject && (
        <Sidebar collapsed={sbOff} projects={projects} allPhotos={allPhotos}
          filter={filter} onFilter={handleFilter} onHome={goHome} />
      )}

      <div className="main-area">
        {!seriesProject && (
          <Topbar path={pathLabel} count={filtered.length} view={view}
            onToggle={() => setSbOff(v => !v)} onView={setView} music={currentMusic}
            theme={theme} onThemeToggle={toggleTheme} />
        )}

        <div className="view-wrap">
          {seriesProject ? (
            <SeriesView project={seriesProject}
              onClose={closeSeries} onPhotoClick={openLightbox}
              onViewGraph={() => { setSeriesProject(null); setView('graph'); setSbOff(window.innerWidth <= 1024); }} />
          ) : (
            <>
              <Gallery projects={projects} visible={view === 'gallery'}
                onProjectClick={openSeries} />
              <GraphView photos={graphFiltered} visible={view === 'graph'}
                onClickCat={onGraphCatClick}
                onClickPhoto={openLightbox} />
              <CameraView photos={allPhotos} visible={view === 'camera'}
                onClickPhoto={openLightbox} />
              <MapView photos={allPhotos} visible={view === 'map'}
                onFilter={(f) => {
                  const matched = allPhotos.filter(p => matchCountry(p.location, f.value));
                  if (matched.length > 0) {
                    const locs = [...new Set(matched.map(p => p.location).filter(Boolean))];
                    const yrs = [...new Set(matched.map(p => p.year).filter(Boolean))].sort();
                    const tags = [...new Set(matched.flatMap(p => p.tags))];
                    const virtualProj: Project = {
                      id: '__virtual__', title: f.value, cover: matched[0].file,
                      location: locs.length <= 2 ? locs.join(' & ') : `${locs.length} locations`,
                      year: yrs.length === 1 ? yrs[0] : yrs.length > 1 ? `${yrs[0]}–${yrs[yrs.length - 1]}` : '',
                      tags,
                      photos: matched.map(p => ({
                        file: p.file, title: p.title, url: p.url,
                        location: p.location, year: p.year,
                        camera: p.camera, focalLength: p.focalLength,
                        aperture: p.aperture, shutterSpeed: p.shutterSpeed, iso: p.iso,
                        tags: p.tags, blurDataURL: p.blurDataURL, lat: p.lat, lng: p.lng,
                        width: p.width, height: p.height,
                      })),
                    };
                    setSeriesProject(virtualProj); setSbOff(true);
                  } else {
                    setFilter(f); setView('gallery');
                  }
                }} />
              <div className="scanline" />
            </>
          )}
          {!seriesProject && (
            <div className="view-hint">
              {view === 'gallery' ? 'scroll to explore'
                : view === 'camera' ? '轉動焦距環探索 · 拖動光圈環篩選'
                : view === 'map' ? 'scroll to zoom · drag to pan · click country to explore'
                : 'scroll to zoom · drag to pan · click node to explore'}
            </div>
          )}
        </div>
      </div>

      {lbPhoto && (
        <Lightbox photo={lbPhoto} allPhotos={allPhotos} projects={projects}
          onClose={() => setLbFile(null)} onNavigate={openLightbox} />
      )}
    </div>
  );
}
