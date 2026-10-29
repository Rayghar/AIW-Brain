// Round 10 · the notation line evidence. Every picture the Diagram tab and the Layers view offer for bank-payment, the
// five reference journeys, the 300-responsibility scale fixture and the 44-responsibility stress project
// (scripts/notation-lines-fixtures.mjs), laid out twice in the same run: the control (notationLayout with
// consolidate:false) and the picture as drawn (the default). Each is measured by notation-metrics.mjs: what is drawn
// (drawnMetrics: marks, line ends, ink, distinct visual crossing points, touches, bends, short segments, foreign shared
// runs, foreign lines on a trunk or at a join, T-contacts), the round-2 route measures (diagramMetrics) and the bundle
// integrity checker. The pictures are built as notation-view.js builds them with a fresh state: notationDiagram (no
// environment chosen, no object chosen), every layer on, the arrangement the reader would see first ([scene's,
// 'tree'] among those offered), and the Grouped alternative when it is offered and is not the default; a scene two
// chapters offer is one picture (measured at its first chapter). The Layers view is scene 'connected', by layer.
//   node scripts/notation-lines-evidence.mjs [--refetch] [--documents <dir>] [--out <dir>] [--project a,b] [--check]
//                                            [--name <base>] [--round <n>] [--corridors off]
// --documents measures another document set (default .aiw-local/notation-lines/documents, built on first use);
// --refetch rebuilds it from a fresh server; --check exits 1 when a routed picture breaks a structural gate (a bundle
// integrity violation, a foreign line on a trunk or at a join, a T-contact, a through-pass, words on words, or, round
// 11, a Layers corridor outside its rules) or a picture's Tab stops differ from its relationships.
// Round 11 (the Layers corridors, scripts/layers-corridors-evidence.mjs): --name sets the output files' base name
// (default notation-lines), --round the round the evidence records (default 10), and --corridors off lays every Layers
// view out without its corridors (notationLayout corridors:false, the round-10 picture: that run reproduces the
// round-10 files byte for byte). Each picture carries its corridor measures (notation-metrics.mjs corridorMetrics).
// Writes <out>/<name>.json and <name>.csv (deterministic: the same documents and source give the same bytes) and
// <name>-timing.json (run times and the document files' SHA-256, which differ from run to run).
// The port snap (round-10 N2) is part of the control, so its own before is audit/round10/evidence/
// notation-lines-before-snap.csv: this generator's CSV at the source before the snap, frozen. The evidence sets its
// group totals beside the control's (`snap`) and names, per picture, the connectors that kept the round-9 snap.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {REPO, DOCUMENTS, loadDocuments, sha256} from './notation-lines-fixtures.mjs';

const argv = process.argv.slice(2), flag = k => argv.includes(k), arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(REPO, arg('--out', 'audit/round11/evidence')), only = arg('--project') ? new Set(arg('--project').split(',')) : null;
const NAME = arg('--name', 'notation-lines'), ROUND = Number(arg('--round', '10')), corridors = arg('--corridors', 'on') !== 'off';
const imp = rel => import(pathToFileURL(path.join(REPO, rel)).href);
const started = performance.now();
const {notationDiagram, CHAPTER_SCENES, SCENES, CONNECTED, arrangementsFor, stripToLayers, LAYERS} = await imp('public/notation-model.js');
const {notationLayout} = await imp('public/notation-layout.js');
const {layerCounts} = await imp('public/layers-view.js');
const {drawnMetrics, diagramMetrics, bundleIntegrity, corridorMetrics, largeStraight, DRAWN} = await imp('notation-metrics.mjs');
const pkg = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8'));

const fetchStarted = performance.now();
const {docs, source} = await loadDocuments({dir: path.resolve(REPO, arg('--documents', DOCUMENTS)), refetch: flag('--refetch'), log: s => console.error(s)});
const fetchMs = Math.round(performance.now() - fetchStarted);
const projects = docs.filter(d => !only || only.has(d.key));
const REFERENCE = new Set(['bank-payment', 'service-permits', 'warehouse-fulfilment', 'clinic-appointments', 'parcel-lockers', 'library-reservations']);

// The groups the round-10 design states its numbers for (design-spec.json, success metrics).
const GROUPS = {
  A: {title: 'reference Diagram defaults, routed', test: r => REFERENCE.has(r.project) && r.default && r.scene !== 'connected' && !r.straight},
  B: {title: 'bank-payment Diagram defaults, routed', test: r => r.project === 'bank-payment' && r.default && r.scene !== 'connected' && !r.straight},
  C: {title: 'reference Layers views, routed', test: r => REFERENCE.has(r.project) && r.scene === 'connected' && !r.straight},
  D: {title: 'reference Grouped alternatives', test: r => REFERENCE.has(r.project) && !r.default},
  E: {title: 'stress-44 and scale-300, routed', test: r => ['stress-44', 'scale-300'].includes(r.project) && !r.straight},
  F: {title: 'pictures drawn with straight lines (unchanged this round by design)', test: r => r.straight}
};
const NAMED = [['bank-payment', 6, 'solution', 'layered'], ['bank-payment', 7, 'stack', 'tree'], ['bank-payment', 3, 'rationale', 'tree'], ['bank-payment', 1, 'motivation', 'tree'], ['bank-payment', 2, 'drivers', 'tree'], ['bank-payment', 3, 'decisions', 'tree'], ['bank-payment', 5, 'application', 'tree'], ['bank-payment', 5, 'container', 'grouped'], ['bank-payment', 9, 'security', 'grouped'], ['bank-payment', 4, 'connected', 'by-layer'], ['bank-payment', 5, 'connected', 'by-layer'], ['bank-payment', 6, 'connected', 'by-layer'], ['bank-payment', 8, 'connected', 'by-layer'], ['bank-payment', 6, 'solution', 'grouped'], ['stress-44', 4, 'logical', 'grouped'], ['stress-44', 5, 'application', 'tree']];
const K = ['edges', 'paths', 'markers', 'lineEnds', 'ink', 'visualCrossings', 'visualCrossingsDisjoint', 'touches', 'words', 'joins', 'bends', 'shortSegs', 'foreignShared', 'sameBundleShared', 'foreignOnTrunk', 'foreignAtJoin', 'tContacts', 'tabStops', 'bundles', 'bundled', 'duplicates', 'dissolved', 'through', 'crossings', 'sharedRuns', 'labelOnLabel', 'labelOnNode', 'integrity'];

// The picture as drawn is checked against its control too (a member's detour, bundleIntegrity).
const measure = (D, L, control = null) => {
  const scene = D.scene?.id || null, m = drawnMetrics(L, {sequence: scene === 'sequence', scene}), d = diagramMetrics(L, {scene}), v = bundleIntegrity(L, {scene, control});
  return {metrics: {edges: L.edges.length, ...m, through: d.through, crossings: d.crossings, sharedRuns: d.sharedRuns, labelOnLabel: d.labelOnLabel, labelOnNode: d.labelOnNode, integrity: v.length}, violations: v};
};
// A bundle is named by its element, and the system element's id carries the project id, which differs between document
// builds: the evidence names it 'project-…' so its body stays the same for the same source.
const anon = t => String(t).replace(/project-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'project-…');
const rows = [], timing = [], seen = new Set();
const run = (P, chapter, scene, arrangement, D, {every = null, isDefault = true, ck = ''} = {}) => {
  const key = P.key + '|' + scene + '|' + arrangement + '|' + ck; if (seen.has(key) || !D.nodes.length) return; seen.add(key);
  const t0 = performance.now(), Lc = notationLayout(D, {arrangement, every, consolidate: false, corridors}), t1 = performance.now(), La = notationLayout(D, {arrangement, every, corridors}), t2 = performance.now();
  const c = measure(D, Lc), a = measure(D, La, Lc), t3 = performance.now();
  const C = La.consolidation || {}, rules = {};
  for (const x of a.violations) rules[x.rule] = (rules[x.rule] || 0) + 1;
  // The Layers corridors (round 11) as planned and as drawn: demand is the row crossings of the lane-spanning connectors,
  // slotted those given a slot (the way points), followed those the drawn route runs through.
  const cm = corridorMetrics(La);
  const row = {project: P.key, chapter, scene, arrangement, default: isDefault, groups: [], straight: arrangement === 'radial' || scene === 'sequence' || largeStraight(Lc) || !Lc.edges.length, nodes: Lc.nodes.length, edges: Lc.edges.length,
    sameAsControl: JSON.stringify(Lc) === JSON.stringify(La), control: c.metrics, after: a.metrics,
    consolidation: {fallback: C.fallback || false, why: (C.why || []).slice(0, 8).map(anon), passes: C.passes ?? 0, dissolved: a.metrics.dissolved, aligned: C.aligned ?? 0},
    corridors: {planned: cm.planned, demand: La.corridors?.crossings ?? 0, slotted: cm.crossings, followed: cm.followed, overfull: cm.overfull, offPitch: cm.offPitch, onElement: cm.onElement},
    snapReverted: (La.snapReverted || []).slice(0, 8), snapRevertedCount: (La.snapReverted || []).length,
    integrity: {violations: a.violations.length, rules, examples: a.violations.slice(0, 5)}};
  row.groups = Object.keys(GROUPS).filter(g => GROUPS[g].test(row));
  rows.push(row);
  timing.push({project: P.key, chapter, scene, arrangement, controlMs: Math.round(t1 - t0), afterMs: Math.round(t2 - t1), measureMs: Math.round(t3 - t2)});
};
const defaultArrangement = (scene, D) => { const offered = arrangementsFor(D).map(a => a.id); return [scene.arrangement, 'tree'].find(a => a && offered.includes(a)); };
for (const P of projects) {
  for (let ch = 1; ch <= 11; ch++) {
    for (const id of CHAPTER_SCENES[ch] || []) {
      const scene = SCENES.find(s => s.id === id), full = notationDiagram(P.document, id, {environmentId: null, objectId: null}); if (!full) continue;
      const D = stripToLayers(full, [...LAYERS]), def = defaultArrangement(scene, D);
      run(P, ch, id, def, D);
      if (def !== 'grouped' && arrangementsFor(D).some(a => a.id === 'grouped')) run(P, ch, id, 'grouped', D, {isDefault: false});
    }
    const full = notationDiagram(P.document, CONNECTED.id, {chapter: ch});
    if (full) { const D = stripToLayers(full, [...LAYERS]); run(P, ch, 'connected', 'by-layer', D, {every: {counts: layerCounts(full), none: 'none in this chapter'}, ck: 'ch' + ch}); }
  }
  console.error(P.key + ': ' + rows.filter(r => r.project === P.key).length + ' pictures');
}

const sum = (rs, side) => Object.fromEntries(K.map(k => [k, rs.reduce((t, r) => t + (Number(r[side][k]) || 0), 0)]));
const pct = (a, b) => (a ? Math.round((b - a) / a * 1000) / 10 : 0);
const groups = Object.fromEntries(Object.entries(GROUPS).map(([g, {title, test}]) => {
  const rs = rows.filter(test), control = sum(rs, 'control'), after = sum(rs, 'after');
  return [g, {title, pictures: rs.length, control, after, changePercent: Object.fromEntries(['markers', 'lineEnds', 'ink', 'visualCrossings', 'touches', 'bends', 'shortSegs', 'foreignShared'].map(k => [k, pct(control[k], after[k])])),
    corridors: Object.fromEntries(['planned', 'demand', 'slotted', 'followed'].map(k => [k, rs.reduce((t, r) => t + r.corridors[k], 0)])),
    fallbacks: rs.filter(r => r.consolidation.fallback).map(r => ({picture: [r.project, r.chapter, r.scene, r.arrangement].join(' · '), fallback: r.consolidation.fallback, why: r.consolidation.why}))}];
}));
const routed = rows.filter(r => !r.straight), defaults = rows.filter(r => r.default && !r.straight);
const layersRouted = routed.filter(r => r.scene === 'connected');
const gates = {
  routedPictures: routed.length,
  integrityViolations: routed.reduce((t, r) => t + r.after.integrity, 0),
  // Round 11: on every routed Layers view, no gap holds more corridors than its slots, none two corridors off their pitch,
  // and no corridor on an element or nearer its side than the margin.
  corridorRules: Object.fromEntries(['overfull', 'offPitch', 'onElement'].map(k => [k, layersRouted.reduce((t, r) => t + r.corridors[k], 0)])),
  layersCorridors: Object.fromEntries(['planned', 'demand', 'slotted', 'followed'].map(k => [k, layersRouted.reduce((t, r) => t + r.corridors[k], 0)])),
  foreignOnTrunk: routed.reduce((t, r) => t + r.after.foreignOnTrunk, 0), foreignAtJoin: routed.reduce((t, r) => t + r.after.foreignAtJoin, 0), tContacts: routed.reduce((t, r) => t + r.after.tContacts, 0),
  through: routed.reduce((t, r) => t + r.after.through, 0), labelOnLabel: rows.reduce((t, r) => t + r.after.labelOnLabel, 0),
  maxForeignSharedOnADiagramDefault: Math.max(0, ...defaults.filter(r => r.scene !== 'connected').map(r => r.after.foreignShared)),
  diagramDefaultsAboveThreeForeignShared: defaults.filter(r => r.scene !== 'connected' && r.after.foreignShared > 3).map(r => [r.project, r.chapter, r.scene, r.arrangement].join(' · ') + ': ' + r.after.foreignShared),
  maxForeignSharedOnALayersView: Math.max(0, ...defaults.filter(r => r.scene === 'connected').map(r => r.after.foreignShared)),
  tabStopsEqualRelationships: rows.every(r => r.after.tabStops === r.edges && r.control.tabStops === r.edges),
  defaultsWhereAfterExceedsControl: defaults.filter(r => ['markers', 'lineEnds', 'ink'].some(k => r.after[k] > r.control[k])).map(r => [r.project, r.chapter, r.scene, r.arrangement].join(' · ')),
  bundlesInStraightPictures: rows.filter(r => r.straight).reduce((t, r) => t + r.after.bundles, 0),
  bundlesInTheControl: rows.reduce((t, r) => t + r.control.bundles, 0),
  picturesWithFallback: rows.filter(r => r.consolidation.fallback).length,
  picturesIdenticalToControl: rows.filter(r => r.sameAsControl).length
};
// The snap's before and after, per group: the frozen pre-snap CSV's control totals against this run's control.
const BEFORE_SNAP = path.join(REPO, 'audit/round10/evidence/notation-lines-before-snap.csv'), SNAP_K = ['markers', 'lineEnds', 'ink', 'visualCrossings', 'touches', 'bends', 'shortSegs', 'foreignShared', 'through', 'crossings', 'sharedRuns', 'labelOnLabel'];
const snap = (() => {
  let text; try { text = readFileSync(BEFORE_SNAP, 'utf8'); } catch { return null; }
  const [head, ...lines] = text.trim().split('\n'), cols = head.split(','), before = lines.map(l => Object.fromEntries(l.split(',').map((v, i) => [cols[i], JSON.parse(v)])));
  const totals = Object.fromEntries(Object.keys(GROUPS).map(g => { const rs = before.filter(r => String(r.groups).split(';').includes(g)), b = Object.fromEntries(SNAP_K.map(k => [k, rs.reduce((t, r) => t + (Number(r['control_' + k]) || 0), 0)])), a = Object.fromEntries(SNAP_K.map(k => [k, groups[g].control[k]]));
    return [g, {pictures: [rs.length, groups[g].pictures], before: b, after: a, changePercent: Object.fromEntries(SNAP_K.map(k => [k, pct(b[k], a[k])]))}]; }));
  return {before: path.relative(REPO, BEFORE_SNAP), beforeSha256: sha256(text), after: 'this run, control (consolidate:false includes the snap)', snapReverted: rows.reduce((t, r) => t + r.snapRevertedCount, 0), picturesWithSnapReverted: rows.filter(r => r.snapRevertedCount).length, groups: totals};
})();
const named = NAMED.map(([project, chapter, scene, arrangement]) => { const r = rows.find(x => x.project === project && x.chapter === chapter && x.scene === scene && x.arrangement === arrangement); return r ? {picture: [project, chapter, scene, arrangement].join(' · '), edges: r.edges, ...Object.fromEntries(['markers', 'lineEnds', 'ink', 'visualCrossings', 'touches', 'words', 'bends', 'shortSegs', 'foreignShared', 'joins', 'bundles'].map(k => [k, [r.control[k], r.after[k]]])), fallback: r.consolidation.fallback} : {picture: [project, chapter, scene, arrangement].join(' · '), missing: true}; }).filter(x => !only || !x.missing);
// The metric definitions, read from notation-metrics.mjs itself so the evidence and the code cannot disagree.
const header = readFileSync(path.join(REPO, 'notation-metrics.mjs'), 'utf8').split('\n'), from = header.findIndex(l => l.startsWith('// drawnMetrics(L)')), to = header.findIndex(l => l.startsWith('// bundleIntegrity(L)'));
const definitions = header.slice(from, to).map(l => l.replace(/^\/\/ ?/, '')).join('\n').trim();
const sources = Object.fromEntries(['public/notation-model.js', 'public/notation-layout.js', 'public/notation-palette.js', 'public/layers-view.js', 'notation-metrics.mjs', 'notation-fixtures.mjs', 'scripts/notation-lines-evidence.mjs'].map(f => [f, sha256(readFileSync(path.join(REPO, f), 'utf8'))]));

const evidence = {
  schema: 'aiw.notation-lines.v1', round: ROUND, release: pkg.release, controllingBaseline: 'AIW v0.10.0-rc.10.73.6', productionAccepted: false,
  generator: 'scripts/notation-lines-evidence.mjs', control: 'notationLayout(D, {consolidate:false}) in the same run', thresholds: DRAWN, definitions,
  corridors: corridors ? 'the Layers views planned with their corridors (notationLayout corridors:true, the default since round 11)' : 'the Layers views without corridors (notationLayout corridors:false, the round-10 picture)',
  groupsNote: 'A picture may belong to several groups (B is part of A). Straight pictures (radial, sequence, and the straight-mode giants: by layer above 160 connectors or 120 elements, any arrangement above STRAIGHT_EDGES) and pictures with no connector are group F only. The class follows the drawing mode, not the geometry: since the round-10 port snap a small routed picture can draw every connector as one straight segment and stays routed.',
  sources, documents: projects.map(p => ({key: p.key, name: p.name, how: p.how, pictures: rows.filter(r => r.project === p.key).length})),
  documentsNote: 'Each run records the SHA-256 of the document files it measured in notation-lines-timing.json: documents built on fresh servers differ only in the project id and record timestamps, which no measure reads, so this file is byte-identical across them.',
  gates, groups, snap, named, pictures: rows
};
mkdirSync(OUT, {recursive: true});
// Readable where it is read (the summary indented), compact where it is long (one line per picture).
const {pictures, ...head} = evidence;
writeFileSync(path.join(OUT, NAME + '.json'), JSON.stringify(head, null, 1).replace(/\n}$/, ',\n "pictures": [\n' + pictures.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n}') + '\n');
const CSV_K = ['markers', 'lineEnds', 'ink', 'visualCrossings', 'visualCrossingsDisjoint', 'touches', 'words', 'joins', 'bends', 'shortSegs', 'foreignShared', 'foreignOnTrunk', 'foreignAtJoin', 'tContacts', 'tabStops', 'bundles', 'bundled', 'duplicates', 'through', 'crossings', 'sharedRuns', 'labelOnLabel', 'integrity'];
const CSV_C = ['planned', 'demand', 'slotted', 'followed'];
const csv = [['project', 'chapter', 'scene', 'arrangement', 'default', 'groups', 'straight', 'nodes', 'edges', 'sameAsControl', 'fallback', ...CSV_K.flatMap(k => ['control_' + k, 'after_' + k]), ...CSV_C.map(k => 'corridors_' + k)].join(','),
  ...rows.map(r => [r.project, r.chapter, r.scene, r.arrangement, r.default, r.groups.join(';'), r.straight, r.nodes, r.edges, r.sameAsControl, r.consolidation.fallback || '', ...CSV_K.flatMap(k => [r.control[k], r.after[k]]), ...CSV_C.map(k => r.corridors[k])].map(x => JSON.stringify(x)).join(','))].join('\n') + '\n';
writeFileSync(path.join(OUT, NAME + '.csv'), csv);
const totalMs = Math.round(performance.now() - started);
writeFileSync(path.join(OUT, NAME + '-timing.json'), JSON.stringify({generatedAt: new Date().toISOString(), node: process.version, documents: {source, fetchMs, files: projects.map(p => ({key: p.key, sha256: p.sha256}))}, totalMs, layoutMs: {control: timing.reduce((t, x) => t + x.controlMs, 0), after: timing.reduce((t, x) => t + x.afterMs, 0)}, pictures: timing}, null, 1) + '\n');

// A summary on stdout.
const show = ['markers', 'lineEnds', 'ink', 'visualCrossings', 'touches', 'bends', 'shortSegs', 'foreignShared', 'joins', 'bundles'];
for (const [g, x] of Object.entries(groups)) console.log(`${g} ${x.title} (${x.pictures}): ` + show.map(k => `${k} ${x.control[k]}→${x.after[k]}`).join('  ') + (x.fallbacks.length ? '  fallbacks ' + x.fallbacks.length : '') + (x.corridors.planned ? '  corridors ' + JSON.stringify(x.corridors) : ''));
if (snap) for (const [g, x] of Object.entries(snap.groups)) console.log(`snap ${g} (${x.pictures.join('/')}): ` + ['bends', 'shortSegs', 'visualCrossings', 'touches', 'foreignShared', 'ink'].map(k => `${k} ${x.before[k]}→${x.after[k]}`).join('  '));
console.log('gates', JSON.stringify(gates));
console.log(`wrote ${path.relative(REPO, OUT)}/${NAME}.json, .csv and -timing.json: ${rows.length} pictures in ${totalMs} ms (documents ${source}, ${fetchMs} ms)`);
if (flag('--check')) {
  const broken = routed.filter(r => r.after.integrity || r.after.foreignOnTrunk || r.after.foreignAtJoin || r.after.tContacts || r.after.through || r.after.labelOnLabel).map(r => [r.project, r.chapter, r.scene, r.arrangement].join(' · '));
  const corridorsBroken = layersRouted.filter(r => r.corridors.overfull || r.corridors.offPitch || r.corridors.onElement).map(r => [r.project, r.chapter, r.scene, r.arrangement].join(' · '));
  if (broken.length || corridorsBroken.length || !gates.tabStopsEqualRelationships || gates.bundlesInStraightPictures || gates.bundlesInTheControl) { console.error('structural gates broken: ' + JSON.stringify({broken: broken.slice(0, 20), corridorsBroken: corridorsBroken.slice(0, 20), tabStops: gates.tabStopsEqualRelationships, bundlesInStraightPictures: gates.bundlesInStraightPictures, bundlesInTheControl: gates.bundlesInTheControl})); process.exit(1); }
  console.log('structural gates hold');
}
