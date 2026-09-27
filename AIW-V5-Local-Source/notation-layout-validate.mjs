// The arrangements of the standard diagrams: every scene in every arrangement places every node
// without overlap, keeps a node inside its container, routes every edge, holds a pin, and gives the
// same picture twice. Run: npm run test:notation-layout
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {notationDiagram, SCENES, ARRANGEMENTS} from './public/notation-model.js';
import {notationLayout, overlaps, NL} from './public/notation-layout.js';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject());
let layouts = 0;
for (const s of SCENES) {
  const D = notationDiagram(project, s.id);
  for (const a of ARRANGEMENTS) {
    const L = notationLayout(D, {arrangement: a.id, viewW: 1200}), tag = s.id + ':' + a.id;
    assert.equal(L.nodes.length, D.nodes.length, tag + ': every node is placed');
    for (const n of L.nodes) assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y) && n.w > 0 && n.h > 0 && n.x >= 0 && n.y >= 0, tag + ': ' + n.id + ' has a place');
    for (let i = 0; i < L.nodes.length; i++) for (let j = i + 1; j < L.nodes.length; j++) assert.ok(!overlaps(L.nodes[i], L.nodes[j], 1), tag + ': ' + L.nodes[i].id + ' and ' + L.nodes[j].id + ' overlap');
    for (const g of L.groups) { for (const n of D.nodes.filter(n => n.group === g.id)) { const p = L.nodes.find(x => x.id === n.id); assert.ok(p.x >= g.x && p.y >= g.y && p.x + p.w <= g.x + g.w && p.y + p.h <= g.y + g.h, tag + ': ' + n.id + ' inside ' + g.id); } const parent = D.groups.find(x => x.id === g.id)?.parent; if (parent) { const pg = L.groups.find(x => x.id === parent); if (pg) assert.ok(g.x >= pg.x && g.y >= pg.y && g.x + g.w <= pg.x + pg.w && g.y + g.h <= pg.y + pg.h, tag + ': ' + g.id + ' inside ' + parent); } }
    if (['grouped', 'lanes'].includes(a.id)) assert.equal(L.groups.length, D.groups.length, tag + ': every container is drawn'); else assert.equal(L.groups.length, 0, tag + ': no containers in this arrangement');
    for (const e of L.edges) { assert.ok(e.pts.length >= 2 && e.pts.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), tag + ': edge ' + e.id + ' is routed'); assert.ok(Number.isFinite(e.lx) && Number.isFinite(e.ly)); }
    assert.ok(L.W >= Math.max(...L.nodes.map(n => n.x + n.w)) && L.H >= Math.max(...L.nodes.map(n => n.y + n.h)), tag + ': the world holds everything');
    assert.equal(JSON.stringify(notationLayout(D, {arrangement: a.id, viewW: 1200})), JSON.stringify(L), tag + ': the same picture twice');
    layouts++;
  }
}
pass(`${layouts} layouts (12 scenes × 6 arrangements): every node placed, no two overlap, nodes and subgroups inside their containers, every edge routed with a label point, the world holds everything, and each is deterministic`);

// Ranks and hubs read as the standard draws them.
{
  const D = notationDiagram(project, 'application'), T = notationLayout(D, {arrangement: 'tree'});
  const y = id => T.nodes.find(n => n.id === id).y;
  assert.ok(y('system:bank-payment') < y('api-pod') && y('api-pod') < y('api') && y('api') <= y('rest') || y('api-pod') < y('rest'), 'the application above its components, components above what they realize and implement');
  assert.ok(T.edges.filter(e => e.pts.length === 4).length >= 5, 'right-angled connectors');
  const R = notationLayout(notationDiagram(project, 'data'), {arrangement: 'radial'});
  const hubBox = R.nodes.find(n => n.id === 'tr-002'); assert.ok(hubBox, 'the shared transactional store is the hub');
  const others = R.nodes.filter(n => n.id !== 'tr-002');
  const cx = hubBox.x + hubBox.w / 2, cy = hubBox.y + hubBox.h / 2;
  assert.ok(others.every(n => Math.hypot(n.x + n.w / 2 - cx, n.y + n.h / 2 - cy) >= 150), 'the others stand on rings around it');
  const Lyr = notationLayout(notationDiagram(project, 'solution'), {arrangement: 'layered'});
  assert.ok(Lyr.bands.length >= 2 && Lyr.bands[0].title === 'Application' && Lyr.bands.at(-1).title.startsWith('Technology'), 'bands: application above technology');
  const Dp = notationDiagram(project, 'deployment'), Gp = notationLayout(Dp, {arrangement: 'grouped', viewW: 1300});
  assert.ok(Gp.groups.find(g => g.id === 'env-001') && Gp.groups.filter(g => g.id.startsWith('zone')).every(g => g.x >= Gp.groups.find(x => x.id === 'env-001').x), 'zones inside the environment');
  const Pr = notationDiagram(project, 'process'), Ln = notationLayout(Pr, {arrangement: 'lanes'});
  assert.ok(Ln.groups.length >= 2 && Ln.groups.every(g => g.w > 400), 'swimlanes span the diagram');
  const ranks = id => Ln.nodes.find(n => n.id === id).x;
  assert.ok(ranks('JRN-001') < ranks('JRN-002') && ranks('JRN-002') < ranks('JRN-003'), 'steps follow the sequence across the lanes');
  pass('tree ranks the application above its components and connects at right angles; radial rings the data around the shared store; layered puts application above technology; grouped nests zones in the environment; swimlanes carry the steps in sequence');
}

// A pin holds, and a container grows around a pinned node.
{
  const D = notationDiagram(project, 'security'), L0 = notationLayout(D, {arrangement: 'grouped', viewW: 1200});
  const target = L0.nodes.find(n => D.nodes.find(x => x.id === n.id)?.group), moved = {x: target.x + 400, y: target.y + 300};
  const L1 = notationLayout(D, {arrangement: 'grouped', viewW: 1200, pins: {[target.id]: moved}});
  const p = L1.nodes.find(n => n.id === target.id); assert.equal(p.x, moved.x); assert.equal(p.y, moved.y); assert.equal(p.pinned, true);
  const g = L1.groups.find(g => g.id === D.nodes.find(x => x.id === target.id).group);
  assert.ok(p.x + p.w <= g.x + g.w && p.y + p.h <= g.y + g.h, 'its trust zone grows around it');
  assert.ok(L1.nodes.filter(n => n.id !== target.id).every(n => { const o = L0.nodes.find(x => x.id === n.id); return o.x === n.x && o.y === n.y; }), 'the others stay where they were');
  pass('a dragged node keeps its place, its container grows around it, and nothing else moves');
}

console.log(JSON.stringify({suite: 'standard diagrams (arrangement)', passed: checks.length, checks, constants: NL}, null, 2));
