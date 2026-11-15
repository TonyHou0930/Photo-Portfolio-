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
    <nav className="topbar" aria-label="主導覽列">
      <button className="hm-btn" onClick={onToggle} aria-label="切換側邊欄">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true"><line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="1.2"/><line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.2"/><line x1="0" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.2"/></svg>
      </button>
      <div className="tb-sep" aria-hidden="true" />
      <div className="tb-path" dangerouslySetInnerHTML={{ __html: `${path} / <b>${count} photos</b>` }} />
      <div className="view-btns" role="group" aria-label="檢視模式">
        {music?.src && <MusicPlayer src={music.src} title={music.title} artist={music.artist} />}
        <div className="tb-sep" aria-hidden="true" />
        <button className={`vb${view==='gallery'?' act':''}`} onClick={() => onView('gallery')} aria-label="相簿檢視" aria-pressed={view==='gallery'}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1" y="1" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/><rect x="8.8" y="1" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/><rect x="1" y="8.8" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/><rect x="8.8" y="8.8" width="5.2" height="5.2" rx=".8" stroke="currentColor" strokeWidth="1"/></svg>
        </button>
        <button className={`vb${view==='camera'?' act':''}`} onClick={() => onView('camera')} aria-label="相機檢視" aria-pressed={view==='camera'}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1" y="3.5" width="13" height="9" rx="1.2" stroke="currentColor" strokeWidth="1"/><circle cx="7.5" cy="8" r="2.8" stroke="currentColor" strokeWidth="1"/><circle cx="7.5" cy="8" r="1" fill="#b8ae9e"/><rect x="4" y="2" width="4" height="2" rx=".6" stroke="currentColor" strokeWidth=".7"/></svg>
        </button>
        <div className="tb-sep" aria-hidden="true" />
        <button className="vb" onClick={onThemeToggle} aria-label={theme === 'light' ? '切換暗黑模式' : '切換淺色模式'}>
          {theme === 'light' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M10 2.5A5 5 0 114.5 11 4 4 0 0010 2.5z" stroke="currentColor" strokeWidth="1"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M3.1 3.1l1.4 1.4M9.5 9.5l1.4 1.4M3.1 10.9l1.4-1.4M9.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth=".7"/></svg>
          )}
        </button>
      </div>
    </nav>
  );
}
