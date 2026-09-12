const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

const NAMES = {
  '004':'Afghanistan','008':'Albania','012':'Algeria','024':'Angola','032':'Argentina',
  '036':'Australia','040':'Austria','044':'Bahamas','050':'Bangladesh','051':'Armenia',
  '056':'Belgium','064':'Bhutan','068':'Bolivia','070':'Bosnia and Herzegovina',
  '072':'Botswana','076':'Brazil','084':'Belize','090':'Solomon Islands','096':'Brunei',
  '100':'Bulgaria','104':'Myanmar','108':'Burundi','112':'Belarus','116':'Cambodia',
  '120':'Cameroon','124':'Canada','140':'Central African Republic','144':'Sri Lanka',
  '148':'Chad','152':'Chile','156':'China','158':'Taiwan','170':'Colombia',
  '178':'Congo','180':'DR Congo','188':'Costa Rica','191':'Croatia','192':'Cuba',
  '196':'Cyprus','203':'Czechia','208':'Denmark','214':'Dominican Republic',
  '218':'Ecuador','222':'El Salvador','226':'Equatorial Guinea','231':'Ethiopia',
  '232':'Eritrea','233':'Estonia','242':'Fiji','246':'Finland','250':'France',
  '266':'Gabon','268':'Georgia','270':'Gambia','276':'Germany','288':'Ghana',
  '300':'Greece','304':'Greenland','320':'Guatemala','324':'Guinea','328':'Guyana',
  '332':'Haiti','340':'Honduras','348':'Hungary','352':'Iceland','356':'India',
  '360':'Indonesia','364':'Iran','368':'Iraq','372':'Ireland','376':'Israel',
  '380':'Italy','384':'Ivory Coast','388':'Jamaica','392':'Japan','398':'Kazakhstan',
  '400':'Jordan','404':'Kenya','408':'North Korea','410':'South Korea','414':'Kuwait',
  '417':'Kyrgyzstan','418':'Laos','422':'Lebanon','426':'Lesotho','428':'Latvia',
  '430':'Liberia','434':'Libya','440':'Lithuania','442':'Luxembourg','450':'Madagascar',
  '454':'Malawi','458':'Malaysia','462':'Maldives','466':'Mali','470':'Malta',
  '478':'Mauritania','480':'Mauritius','484':'Mexico','496':'Mongolia','498':'Moldova',
  '499':'Montenegro','504':'Morocco','508':'Mozambique','512':'Oman','516':'Namibia',
  '524':'Nepal','528':'Netherlands','540':'New Caledonia','548':'Vanuatu',
  '554':'New Zealand','558':'Nicaragua','562':'Niger','566':'Nigeria','578':'Norway',
  '586':'Pakistan','591':'Panama','598':'Papua New Guinea','600':'Paraguay','604':'Peru',
  '608':'Philippines','616':'Poland','620':'Portugal','630':'Puerto Rico','634':'Qatar',
  '642':'Romania','643':'Russia','646':'Rwanda','682':'Saudi Arabia','686':'Senegal',
  '688':'Serbia','694':'Sierra Leone','702':'Singapore','703':'Slovakia','704':'Vietnam',
  '705':'Slovenia','706':'Somalia','710':'South Africa','716':'Zimbabwe','724':'Spain',
  '728':'South Sudan','729':'Sudan','740':'Suriname','748':'Eswatini','752':'Sweden',
  '756':'Switzerland','760':'Syria','762':'Tajikistan','764':'Thailand','768':'Togo',
  '780':'Trinidad and Tobago','784':'UAE','788':'Tunisia','792':'Turkey',
  '795':'Turkmenistan','800':'Uganda','804':'Ukraine','807':'North Macedonia',
  '818':'Egypt','826':'United Kingdom','834':'Tanzania','840':'United States of America',
  '854':'Burkina Faso','858':'Uruguay','860':'Uzbekistan','862':'Venezuela',
  '887':'Yemen','894':'Zambia',
};

// Miller Cylindrical projection
const W = 960, H = 500;
function project([lng, lat]) {
  const λ = (lng * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const x = λ;
  const y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * φ));
  const maxY = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * (Math.PI * 85 / 180)));
  return [
    ((x / Math.PI + 1) / 2) * W,
    ((1 - y / maxY) / 2) * H,
  ];
}

function ringToPath(ring) {
  const segments = [[]];
  let prevX = null;
  ring.forEach(coord => {
    const [x, y] = project(coord);
    if (prevX !== null && Math.abs(x - prevX) > 400) {
      segments.push([]);
    }
    segments[segments.length - 1].push([x, y]);
    prevX = x;
  });
  return segments.map(seg =>
    seg.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z'
  ).join('');
}

function geometryToPath(geometry) {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ringToPath).join('');
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(poly => poly.map(ringToPath).join('')).join('');
  }
  return '';
}

function centroid(geometry) {
  let sumX = 0, sumY = 0, count = 0;
  const coords = geometry.type === 'Polygon'
    ? geometry.coordinates[0]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.reduce((all, poly) => all.concat(poly[0]), [])
      : [];
  coords.forEach(c => {
    const [x, y] = project(c);
    sumX += x; sumY += y; count++;
  });
  return count ? [+(sumX / count).toFixed(1), +(sumY / count).toFixed(1)] : [0, 0];
}

// Load world-atlas TopoJSON
const topoPath = path.join(__dirname, '..', 'node_modules', 'world-atlas', 'countries-110m.json');
const topo = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
const geo = topojson.feature(topo, topo.objects.countries);

const countries = geo.features.map(f => {
  const id = f.id;
  const name = NAMES[id] || `Unknown (${id})`;
  const d = geometryToPath(f.geometry);
  const [cx, cy] = centroid(f.geometry);
  return { id, n: name, d, cx, cy };
}).filter(c => c.d.length > 0 && c.id != null && c.id !== '010');

const out = JSON.stringify(countries);
const outPath = path.join(__dirname, '..', 'public', 'world-map.json');
fs.writeFileSync(outPath, out);
console.log(`Generated ${countries.length} countries (${(out.length / 1024).toFixed(0)}KB) → ${outPath}`);
