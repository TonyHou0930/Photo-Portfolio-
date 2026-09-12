'use client';
import MusicPlayer from './MusicPlayer';

interface Props {
  path: string; count: number; view: string;
  onToggle: () => void; onView: (v: 'gallery' | 'graph' | 'camera' | 'map') => void;
  music?: { src: string; title: string; artist: string };
  theme: 'light' | 'dark'; onThemeToggle: () => void;
}

export default function Topbar({ path, count, view, onToggle, onView, music, theme, onThemeToggle }: Props) {
  return (
    <div className="topbar">
      <button className="hm-btn" onClick={onToggle}>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="1.2"/><line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.2"/><line x1="0" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.2"/></svg>
      </button>
      <div className="tb-sep" />
      <div className="tb-path" dangerouslySetInnerHTML={{ __html: `${path} / <b>${count} photos</b>` }} />
      <div className="view-btns">
        {music?.src && <MusicPlayer src={music.src} title={music.title} artist={music.artist} />}
        <div className="tb-sep" />
        <div className={`vb${view==='gallery'?' act':''}`} onClick={() => onView('gallery')} title="Gallery">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/><rect x="8.8" y="1" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/><rect x="1" y="8.8" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/><rect x="8.8" y="8.8" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/></svg>
        </div>
        <div className={`vb${view==='camera'?' act':''}`} onClick={() => onView('camera')} title="Camera">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3.5" width="13" height="9" rx="1.2" stroke="currentColor" strokeWidth="1"/><circle cx="7.5" cy="8" r="2.8" stroke="currentColor" strokeWidth="1"/><circle cx="7.5" cy="8" r="1" fill="#b8ae9e"/><rect x="4" y="2" width="4" height="2" rx=".6" stroke="currentColor" strokeWidth=".7"/></svg>
        </div>
        <div className="tb-sep" />
        <div className="vb" onClick={onThemeToggle} title={theme === 'light' ? '暗黑模式' : '淺色模式'}>
          {theme === 'light' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 2.5A5 5 0 114.5 11 4 4 0 0010 2.5z" stroke="currentColor" strokeWidth="1"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.1 3.1l1.4 1.4M9.5 9.5l1.4 1.4M3.1 10.9l1.4-1.4M9.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth=".7"/></svg>
          )}
        </div>
      </div>
    </div>
  );
}