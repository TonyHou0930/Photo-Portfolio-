'use client';
import MusicPlayer from './MusicPlayer';

interface Props {
  path: string; count: number; view: string;
  onToggle: () => void; onView: (v: 'gallery' | 'graph') => void;
  music?: { src: string; title: string; artist: string };
}

export default function Topbar({ path, count, view, onToggle, onView, music }: Props) {
  return (
    <div className="topbar">
      <button className="hm-btn" onClick={onToggle}>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><line x1="0" y1="1" x2="16" y2="1" stroke="#c8c0a8" strokeWidth="1.2"/><line x1="0" y1="6" x2="12" y2="6" stroke="#c8c0a8" strokeWidth="1.2"/><line x1="0" y1="11" x2="16" y2="11" stroke="#c8c0a8" strokeWidth="1.2"/></svg>
      </button>
      <div className="tb-sep" />
      <div className="tb-path" dangerouslySetInnerHTML={{ __html: `${path} / <b>${count} photos</b>` }} />
      <div className="view-btns">
        {music?.src && <MusicPlayer src={music.src} title={music.title} artist={music.artist} />}
        <div className="tb-sep" />
        <div className={`vb${view==='gallery'?' act':''}`} onClick={() => onView('gallery')} title="Gallery">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.2" height="5.2" rx=".8" stroke="#c8c0a8" strokeWidth="1"/><rect x="8.8" y="1" width="5.2" height="5.2" rx=".8" stroke="#c8c0a8" strokeWidth="1"/><rect x="1" y="8.8" width="5.2" height="5.2" rx=".8" stroke="#c8c0a8" strokeWidth="1"/><rect x="8.8" y="8.8" width="5.2" height="5.2" rx=".8" stroke="#c8c0a8" strokeWidth="1"/></svg>
        </div>
        <div className={`vb${view==='graph'?' act':''}`} onClick={() => onView('graph')} title="Knowledge Graph">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="#c8c0a8" strokeWidth="1"/><circle cx="2" cy="3" r="1.3" stroke="#c8c0a8" strokeWidth=".9"/><circle cx="13" cy="3" r="1.3" stroke="#c8c0a8" strokeWidth=".9"/><circle cx="2" cy="12" r="1.3" stroke="#c8c0a8" strokeWidth=".9"/><circle cx="13" cy="12" r="1.3" stroke="#c8c0a8" strokeWidth=".9"/><line x1="5.7" y1="6.2" x2="3.1" y2="4.1" stroke="#c8c0a8" strokeWidth=".7"/><line x1="9.3" y1="6.2" x2="11.9" y2="4.1" stroke="#c8c0a8" strokeWidth=".7"/><line x1="5.7" y1="8.8" x2="3.1" y2="10.9" stroke="#c8c0a8" strokeWidth=".7"/><line x1="9.3" y1="8.8" x2="11.9" y2="10.9" stroke="#c8c0a8" strokeWidth=".7"/></svg>
        </div>
      </div>
    </div>
  );
}
