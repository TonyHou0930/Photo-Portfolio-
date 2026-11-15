'use client';
import { Project, FlatPhoto } from '@/lib/data';

type Filter = { type: string; value: string };

export default function Sidebar({ collapsed, projects, allPhotos, filter, onFilter, onHome, onClose }: {
  collapsed: boolean; projects: Project[]; allPhotos: FlatPhoto[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onHome: () => void;
  onClose?: () => void;
}) {
  const total = allPhotos.length;
  const act = (t: string, v: string) => filter.type === t && filter.value === v;

  const categories = new Map<string, number>();
  allPhotos.forEach(p => { if (p.category) categories.set(p.category, (categories.get(p.category) || 0) + 1); });

  const locations = new Map<string, number>();
  allPhotos.forEach(p => { if (p.location) locations.set(p.location, (locations.get(p.location) || 0) + 1); });

  const tags = new Map<string, number>();
  allPhotos.forEach(p => p.tags.forEach(t => tags.set(t, (tags.get(t) || 0) + 1)));
  const sortedTags = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]);

  const withStory = projects.filter(p => p.story);

  return (
    <aside className={`sidebar${collapsed ? ' off' : ''}`} aria-label="篩選側邊欄">
      <div className="sb-head sb-home" onClick={onHome} role="button" tabIndex={0} aria-label="回到首頁"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHome(); } }}>
        <div className="sb-logo">Portfolio</div>
        <div className="sb-name">TonyHOU</div>
        <div className="sb-role">Photographer</div>
        {onClose && (
          <button className="sb-close" onClick={e => { e.stopPropagation(); onClose(); }} aria-label="關閉側邊欄">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>
      <nav className="sb-scroll" aria-label="篩選選單">

        <div className="sec">Collections</div>
        <div role="group" aria-label="Collections">
          <div className={`si${act('all','all')?' act':''}`} onClick={() => onFilter({ type:'all', value:'all' })} role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFilter({ type:'all', value:'all' }); } }}>
            <div className="ic" style={{ background:'#c8c0a8' }} aria-hidden="true" /><div className="nm">All Works</div><div className="cnt">{String(total).padStart(2,'0')}</div>
          </div>
          {Array.from(categories.entries()).map(([cat, count]) => (
            <div key={cat} className={`si${act('cat',cat)?' act':''}`} onClick={() => onFilter({ type:'cat', value:cat })} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFilter({ type:'cat', value:cat }); } }}>
              <div className="ic" style={{ background:'#c8c0a8' }} aria-hidden="true" /><div className="nm">{cat}</div><div className="cnt">{String(count).padStart(2,'0')}</div>
            </div>
          ))}
        </div>

        {withStory.length > 0 && <>
          <div className="sec" style={{ marginTop:6 }}>Stories</div>
          <div role="group" aria-label="Stories">
            {withStory.map(p => (
              <div key={p.id} className={`si${act('project',p.id)?' act':''}`} onClick={() => onFilter({ type:'project', value:p.id })} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFilter({ type:'project', value:p.id }); } }}>
                <div className="ic" style={{ background:'#7a5db8' }} aria-hidden="true" /><div className="nm">{p.title}</div>
              </div>
            ))}
          </div>
        </>}

        {locations.size > 0 && <>
          <div className="sec" style={{ marginTop:6 }}>Locations</div>
          <div role="group" aria-label="Locations">
            {Array.from(locations.entries()).map(([loc, count]) => (
              <div key={loc} className={`si${act('loc',loc)?' act':''}`} onClick={() => onFilter({ type:'loc', value:loc })} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFilter({ type:'loc', value:loc }); } }}>
                <div className="loc-dot" aria-hidden="true" /><div className="nm">{loc}</div><div className="cnt">{String(count).padStart(2,'0')}</div>
              </div>
            ))}
          </div>
        </>}

        {sortedTags.length > 0 && <>
          <div className="sec" style={{ marginTop:6 }}>Tags</div>
          <div role="group" aria-label="Tags">
            {sortedTags.map(([tag, count]) => (
              <div key={tag} className={`si${act('tag',tag)?' act':''}`} onClick={() => onFilter({ type:'tag', value:tag })} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFilter({ type:'tag', value:tag }); } }}>
                <div className="sq" style={{ width:5, height:5, borderRadius:1, background:'#2e2b27', flexShrink:0 }} aria-hidden="true" />
                <div className="nm">#{tag}</div><div className="cnt">{String(count).padStart(2,'0')}</div>
              </div>
            ))}
          </div>
        </>}

      </nav>
      <div className="sb-ft">
        <div className="sb-ft-row">
          <div className="sb-ft-i"><div className="sb-ft-n">{String(total).padStart(3,'0')}</div><div className="sb-ft-l">Works</div></div>
          <div className="sb-ft-i"><div className="sb-ft-n">{String(projects.length).padStart(2,'0')}</div><div className="sb-ft-l">Projects</div></div>
          <div className="sb-ft-i"><div className="sb-ft-n">{String(locations.size).padStart(2,'0')}</div><div className="sb-ft-l">Places</div></div>
        </div>
      </div>
    </aside>
  );
}
