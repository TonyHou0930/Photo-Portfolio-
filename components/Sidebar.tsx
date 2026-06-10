'use client';
import { Project, FlatPhoto } from '@/lib/data';

type Filter = { type: string; value: string };

export default function Sidebar({ collapsed, projects, allPhotos, filter, onFilter }: {
  collapsed: boolean; projects: Project[]; allPhotos: FlatPhoto[];
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  const total = allPhotos.length;
  const act = (t: string, v: string) => filter.type === t && filter.value === v;

  // Categories
  const categories = new Map<string, number>();
  allPhotos.forEach(p => { if (p.category) categories.set(p.category, (categories.get(p.category) || 0) + 1); });

  // Locations
  const locations = new Map<string, number>();
  allPhotos.forEach(p => { if (p.location) locations.set(p.location, (locations.get(p.location) || 0) + 1); });

  // Tags
  const tags = new Map<string, number>();
  allPhotos.forEach(p => p.tags.forEach(t => tags.set(t, (tags.get(t) || 0) + 1)));
  const sortedTags = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]);

  // Stories (projects with story text)
  const withStory = projects.filter(p => p.story);

  return (
    <div className={`sidebar${collapsed ? ' off' : ''}`}>
      <div className="sb-head">
        <div className="sb-logo">Portfolio</div>
        <div className="sb-name">TonyHOU</div>
        <div className="sb-role">Photographer</div>
      </div>
      <div className="sb-scroll">

        <div className="sec">Collections</div>
        <div className={`si${act('all','all')?' act':''}`} onClick={() => onFilter({ type:'all', value:'all' })}>
          <div className="ic" style={{ background:'#c8c0a8' }} /><div className="nm">All Works</div><div className="cnt">{String(total).padStart(2,'0')}</div>
        </div>
        {Array.from(categories.entries()).map(([cat, count]) => (
          <div key={cat} className={`si${act('cat',cat)?' act':''}`} onClick={() => onFilter({ type:'cat', value:cat })}>
            <div className="ic" style={{ background:'#c8c0a8' }} /><div className="nm">{cat}</div><div className="cnt">{String(count).padStart(2,'0')}</div>
          </div>
        ))}

        {withStory.length > 0 && <>
          <div className="sec" style={{ marginTop:6 }}>Stories</div>
          {withStory.map(p => (
            <div key={p.id} className={`si${act('project',p.id)?' act':''}`} onClick={() => onFilter({ type:'project', value:p.id })}>
              <div className="ic" style={{ background:'#7a5db8' }} /><div className="nm">{p.title}</div>
            </div>
          ))}
        </>}

        {locations.size > 0 && <>
          <div className="sec" style={{ marginTop:6 }}>Locations</div>
          {Array.from(locations.entries()).map(([loc, count]) => (
            <div key={loc} className={`si${act('loc',loc)?' act':''}`} onClick={() => onFilter({ type:'loc', value:loc })}>
              <div className="loc-dot" /><div className="nm">{loc}</div><div className="cnt">{String(count).padStart(2,'0')}</div>
            </div>
          ))}
        </>}

        {sortedTags.length > 0 && <>
          <div className="sec" style={{ marginTop:6 }}>Tags</div>
          {sortedTags.map(([tag, count]) => (
            <div key={tag} className={`si${act('tag',tag)?' act':''}`} onClick={() => onFilter({ type:'tag', value:tag })}>
              <div className="sq" style={{ width:5, height:5, borderRadius:1, background:'#2e2b27', flexShrink:0 }} />
              <div className="nm">#{tag}</div><div className="cnt">{String(count).padStart(2,'0')}</div>
            </div>
          ))}
        </>}

      </div>
      <div className="sb-ft">
        <div className="sb-ft-row">
          <div className="sb-ft-i"><div className="sb-ft-n">{String(total).padStart(3,'0')}</div><div className="sb-ft-l">Works</div></div>
          <div className="sb-ft-i"><div className="sb-ft-n">{String(projects.length).padStart(2,'0')}</div><div className="sb-ft-l">Projects</div></div>
          <div className="sb-ft-i"><div className="sb-ft-n">{String(locations.size).padStart(2,'0')}</div><div className="sb-ft-l">Places</div></div>
        </div>
      </div>
    </div>
  );
}
