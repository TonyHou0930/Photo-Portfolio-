'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Gallery from '@/components/Gallery';
import GraphView from '@/components/GraphView';
import SplitDeck from '@/components/SplitDeck';
import Lightbox from '@/components/Lightbox';
import { PortfolioData, Project, FlatPhoto, flattenPhotos } from '@/lib/data';

type Filter = { type: string; value: string };
type ViewMode = 'gallery' | 'graph';

export default function Home() {
  const [data, setData] = useState<PortfolioData>({ projects: [] });
  const [sbOff, setSbOff] = useState(false);
  const [view, setView] = useState<ViewMode>('gallery');
  const [filter, setFilter] = useState<Filter>({ type: 'all', value: 'all' });
  const [deckProject, setDeckProject] = useState<Project | null>(null);
  const [lbFile, setLbFile] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/photos').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  const projects = data.projects.filter(p => p.photos.length > 0);
  const allPhotos = useMemo(() => flattenPhotos(data), [data]);

  const filtered = useMemo(() => {
    let pool = allPhotos;
    if (filter.type === 'cat') pool = pool.filter(p => p.category === filter.value);
    if (filter.type === 'loc') pool = pool.filter(p => p.location === filter.value);
    if (filter.type === 'tag') pool = pool.filter(p => p.tags.includes(filter.value));
    if (filter.type === 'project') pool = pool.filter(p => p.projectId === filter.value);
    const feat = pool.filter(p => p.featured);
    return feat.length > 0 ? feat : pool;
  }, [allPhotos, filter]);

  const pathLabel = filter.type === 'all' ? 'All Works'
    : filter.type === 'tag' ? '#' + filter.value
    : filter.value;

  const lbPhoto = useMemo(() => allPhotos.find(p => p.file === lbFile) || null, [allPhotos, lbFile]);

  const currentMusic = useMemo(() => {
    if (deckProject?.music) return { src: deckProject.music, title: deckProject.musicTitle || '', artist: deckProject.musicArtist || '' };
    return { src: data.defaultMusic || '', title: data.defaultMusicTitle || '', artist: data.defaultMusicArtist || '' };
  }, [deckProject, data]);

  // Open split-deck for a project
  const openDeck = useCallback((projectIdOrTitle: string) => {
    const proj = projects.find(p => p.id === projectIdOrTitle || p.title === projectIdOrTitle);
    if (proj) { setDeckProject(proj); setSbOff(true); }
  }, [projects]);

  const handleFilter = useCallback((f: Filter) => {
    if (f.type === 'project') { openDeck(f.value); setFilter(f); return; }
    setDeckProject(null); setSbOff(false); setFilter(f);
  }, [openDeck]);

  const closeDeck = useCallback(() => {
    setDeckProject(null); setSbOff(false); setFilter({ type: 'all', value: 'all' });
  }, []);

  // Graph: click category node → open Split-Deck
  const onGraphCatClick = useCallback((cat: string) => {
    const proj = projects.find(p => p.title === cat);
    if (proj) { openDeck(proj.id); }
    else { setFilter({ type: 'cat', value: cat }); setView('gallery'); }
  }, [projects, openDeck]);

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
      {!deckProject && (
        <Sidebar collapsed={sbOff} projects={projects} allPhotos={allPhotos}
          filter={filter} onFilter={handleFilter} />
      )}

      <div className="main-area">
        {!deckProject && (
          <Topbar path={pathLabel} count={filtered.length} view={view}
            onToggle={() => setSbOff(v => !v)} onView={setView} music={currentMusic} />
        )}

        <div className="view-wrap">
          {deckProject ? (
            <SplitDeck project={deckProject} allPhotos={allPhotos}
              onClose={closeDeck} onPhotoClick={f => setLbFile(f)} />
          ) : (
            <>
              <Gallery photos={filtered} visible={view === 'gallery'}
                onPhotoClick={f => setLbFile(f)} />
              <GraphView photos={allPhotos} visible={view === 'graph'}
                onClickCat={onGraphCatClick}
                onClickPhoto={f => setLbFile(f)} />
              <div className="scanline" />
            </>
          )}
          <div className="view-hint">
            {deckProject ? 'scroll filmstrip · click photo for lightbox'
              : view === 'gallery' ? 'scroll to explore'
              : 'scroll to zoom · drag to pan · click node to explore'}
          </div>
        </div>
      </div>

      {lbPhoto && (
        <Lightbox photo={lbPhoto} allPhotos={allPhotos} projects={projects}
          onClose={() => setLbFile(null)} onNavigate={f => setLbFile(f)} />
      )}
    </div>
  );
}
