// Round 10 · the chapter-lines gate (workstream V8): the chapter views' line measures (scripts/chapter-lines-evidence.mjs)
// on hand-built lines whose every number is worked out by hand, then on bank-payment and the five reference journeys.
// It proves that the measures count what is drawn; that each control is today's drawing (line for line while none of
// the view's workstreams has landed, and reproducing the investigation's numbers always); that LANDED agrees with the
// shapes the layouts return; that every assertion a landed workstream switches on holds; that the structural identities
// the round-10 design names (Ch10 a head per needed part and a mark per link, Ch9 heads equal entries plus contracts,
// Ch2 one comb per parent) catch what they must; and that the evidence is byte-identical across two processes and
// equal to audit/round11/evidence/chapter-lines.json.
// Run: npm run test:chapter-lines (the evidence: npm run evidence:chapter-lines)
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.dirname(fileURLToPath(import.meta.url));
// The second process starts first: it builds the same projects while this one measures.
const child = new Promise((resolve, reject) => {
  const p = spawn(process.execPath, ['scripts/chapter-lines-evidence.mjs', '--stdout'], {cwd: REPO, stdio: ['ignore', 'pipe', 'pipe']});
  let out = '', err = '';
  p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { err += d; });
  p.on('error', reject); p.on('exit', code => (code === 0 ? resolve(out) : reject(Error('the evidence process exited with ' + code + ': ' + err.slice(-2000)))));
});
const CL = await import('./scripts/chapter-lines-evidence.mjs');
const {lineMetrics, colourIntervals, maxPortsPerSide, shapesOf, measureProject, evaluate, chapterProjects, chapterLines, serialise, failures, deployRow, anatomyRow, LANDED, CHAPTER_WORKSTREAMS, VIEW_SOURCE, ANCHORS} = CL;
const {deploySource, deployScope, defaultDepth: deployDepth, foldDeploy} = await import('./public/deploy-model.js');
const {deployLayout, DEP} = await import('./public/deploy-layout.js');

const checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const line = (id, share, pts) => ({id, share, pts});

// 1. Crossings: an interior horizontal × vertical intersection between different shares, once per point; never within
// one share, and never where a line only touches another (a T).
{
  const m = lineMetrics([line('a', 'A', [[0, 0], [100, 0]]), line('b', 'B', [[50, -50], [50, 50]])]);
  assert.deepEqual([m.lines, m.crossingPairs, m.visualCrossings, m.ink, m.uniqueInk, m.overdraw, m.overlaps, m.bends], [2, 1, 1, 200, 200, 1, 0, 0]);
  assert.equal(lineMetrics([line('a', 'A', [[0, 0], [100, 0]]), line('b', 'A', [[50, -50], [50, 50]])]).visualCrossings, 0, 'lines of one share never count as crossing each other');
  assert.equal(lineMetrics([line('a', 'A', [[0, 0], [100, 0]]), line('b', 'B', [[50, 0], [50, 50]])]).crossingPairs, 0, 'a T is not a crossing');
  const three = lineMetrics([line('h', 'A', [[0, 0], [100, 0]]), line('v1', 'B', [[50, -20], [50, 20]]), line('v2', 'C', [[50, -10], [50, 30]])]);
  assert.deepEqual([three.crossingPairs, three.visualCrossings, three.overlaps, three.foreignOverlaps], [2, 1, 1, 1], 'two collinear foreign verticals cross the horizontal at one visible point');
  pass('crossings: per pair and per visible point, between shares only, a T is not a crossing');
}
// 2. Ink: two routes of one share on one trunk (50 + 100 + 50 and 50 + 60 + 50 px) share 60 px of trunk and 50 px of
// branch, so 360 px is drawn over 250 px of unique ink; the collinear overlaps are within the share.
{
  const m = lineMetrics([line('r1', 'E', [[0, 0], [50, 0], [50, 100], [100, 100]]), line('r2', 'E', [[0, 40], [50, 40], [50, 100], [100, 100]])], {heads: 2, joins: 1, marks: 0});
  assert.deepEqual([m.ink, m.uniqueInk, m.overdraw, m.overlaps, m.foreignOverlaps, m.bends, m.heads, m.joins], [360, 250, 1.44, 2, 0, 4, 2, 1]);
  assert.equal(lineMetrics([line('d', 'D', [[0, 0], [30, 40]])]).ink, 50, 'a diagonal counts its length');
  assert.equal(lineMetrics([line('z', 'Z', [[5, 5], [5, 5], [5, 25]])]).bends, 0, 'a repeated point is no corner');
  pass('ink: drawn, unique and overdraw; overlaps inside a share are not foreign');
}
// 3. Today's interval colouring: shortest span first (then the top, then the key), the lowest free level, `gap` px apart.
{
  const tracks = () => [{key: 'a', a: 0, b: 100}, {key: 'b', a: 50, b: 60}, {key: 'c', a: 104, b: 200}, {key: 'd', a: 200, b: 210}];
  const t3 = tracks(); assert.equal(colourIntervals(t3, 3), 2);
  assert.deepEqual(Object.fromEntries(t3.map(t => [t.key, t.level])), {a: 1, b: 0, c: 1, d: 0}, 'b and d first (10 px), then c (96 px), then a (100 px), 4 px clear of c');
  const t4 = tracks(); assert.equal(colourIntervals(t4, 4), 3, 'with a 4 px gap a and c may not share a level');
  const r = (from, to, xa, xt, xb, ya, yb) => ({link: {from, to}, xa, xt, xb, ya, yb});
  assert.equal(maxPortsPerSide([r('X', 'Y', 100, 150, 200, 10, 20), r('X', 'Y', 100, 157, 200, 21, 30), r('Z', 'Y', 100, 164, 200, 40, 20), r('X', 'W', 100, 171, 200, 32, 50)]), 3, 'X has three ports on its right side; Y two on its left (20 is shared)');
  pass('track colouring and ports per card side, by hand');
}
// 4. The shapes a landed workstream returns are recognised, and only in their own view.
{
  assert.deepEqual(shapesOf('ch10-deployment', {rails: []}), ['V6']); assert.deepEqual(shapesOf('ch3-decision-map', {combs: [], routes: []}), ['V3']);
  assert.deepEqual(shapesOf('ch2-utility', {combs: []}), ['V4']); assert.deepEqual(shapesOf('ch9-threat', {wires: {}, routes: []}), ['V2']);
  assert.deepEqual(shapesOf('ch1-context', {routes: [{share: 'k'}]}), ['V5']); assert.deepEqual(shapesOf('whole-design@ch6', {threads: [{kind: 'spine'}]}), ['V7']);
  assert.deepEqual(shapesOf('ch5-components', {routes: [{share: 'k'}]}), [], 'a fan-out share is a Chapter 1 shape');
  assert.deepEqual(shapesOf('ch1-context', {routes: [{share: null}, {id: 'r'}]}), [], 'routes without a share are today\'s Context');
  for (const [file, text] of VIEW_SOURCE) assert(readFileSync(path.join(REPO, file), 'utf8').includes(text), `${file} no longer reads: ${text} (update the harness to fold and measure as the view does)`);
  pass('workstream shapes recognised; the view code the harness replicates is unchanged (' + VIEW_SOURCE.length + ' lines)');
}

// 5. The real pictures.
const projects = chapterProjects(), evidence = chapterLines({projects}), text = serialise(evidence);
{
  assert.equal(evidence.productionAccepted, false);
  assert.deepEqual(evidence.landed, evidence.shapesInSource, 'LANDED in scripts/chapter-lines-evidence.mjs must name exactly the workstreams whose shapes the layouts return (add the id in the change that lands it)');
  assert(evidence.pictures.length >= 40, 'every view on every project that draws lines: ' + evidence.pictures.length);
  for (const v of CL.VIEWS) assert(evidence.pictures.some(r => r.view === v.view && r.project === 'bank-payment'), 'bank-payment draws ' + v.view);
  pass(`${evidence.pictures.length} pictures over ${projects.length} projects; landed [${evidence.landed.join(', ')}] = shapes in source`);
}
{
  const bad = evidence.anchors.filter(a => !a.holds);
  assert.equal(bad.length, 0, 'anchors: ' + JSON.stringify(bad));
  assert.equal(evidence.anchors.length, ANCHORS.reduce((t, [, , m, x]) => t + Object.keys({...m, ...x}).length, 0), 'every anchor is measured');
  // The V8 acceptance, by name: today's numbers on unchanged source.
  const at = (p, v, k) => evidence.anchors.find(a => a.picture === p + ' · ' + v && a.metric === k).measured;
  assert.deepEqual([at('bank-payment', 'ch10-deployment', 'heads'), at('bank-payment', 'ch10-deployment', 'visualCrossings'), at('bank-payment', 'ch10-deployment', 'ink')], [37, 42, 16824]);
  assert.deepEqual([at('bank-payment', 'ch9-threat', 'heads'), at('bank-payment', 'ch9-threat', 'visualCrossings')], [22, 29]);
  assert.equal(at('bank-payment', 'ch3-decision-map', 'visualCrossings'), 21); assert.equal(at('parcel-lockers', 'ch1-context', 'visualCrossings'), 134);
  pass(`controls reproduce the investigation's ${evidence.anchors.length} numbers (Ch10 37 heads, 42 crossings, 16,824 px; Ch9 22, 29; Ch3 21; Ch1 parcel-lockers 134)`);
}
{
  const bad = evidence.identities.filter(i => !i.holds);
  assert.equal(bad.length, 0, 'identities: ' + JSON.stringify(bad.slice(0, 5)));
  const open = evidence.pictures.filter(r => !CL.VIEWS.find(v => v.view === r.view).ws.some(w => LANDED.has(w))).length;
  assert.equal(evidence.identities.length, open, 'every picture whose workstreams have not landed is compared');
  pass(`each control equals its drawing line for line while its workstreams have not landed (${evidence.identities.length} pictures)`);
}
{
  const bad = failures(evidence);
  assert.equal(bad.length, 0, bad.slice(0, 20).join('\n'));
  assert(evidence.assertions.filter(a => a.ws === 'always').length >= 18, 'the lane guarantees are checked on every lane picture');
  for (const ws of CHAPTER_WORKSTREAMS) {
    if (LANDED.has(ws)) assert(evidence.assertions.some(a => a.ws === ws), ws + ' landed: its assertions run');
    else assert(evidence.awaiting.some(a => a.ws === ws) && !evidence.assertions.some(a => a.ws === ws), ws + ' not landed: its assertions wait');
  }
  pass(`${evidence.assertions.length} switched-on assertions hold; ${evidence.awaiting.length} wait for their workstream`);
}
{
  // The gates bite: a control that no longer reproduces a frozen number, a drawing that moves one line away from its
  // control, and a lane route through a card each fail the run.
  const bank = projects.find(p => p.key === 'bank-payment'), {rows} = measureProject(bank), clone = x => structuredClone(x);
  const tampered = rows.map(r => {
    const c = clone(r);
    if (c.view === 'ch10-deployment') c.control.heads = 36;
    if (c.view === 'ch3-decision-map') c.lines[0].pts[1][0] += 11;
    if (c.view === 'ch9-threat') c.structure.through = 1;
    return c;
  });
  const bad = failures(evaluate(tampered, new Set()));
  assert(bad.some(f => f.startsWith('anchor bank-payment · ch10-deployment heads: 36')), bad.join('\n'));
  assert(bad.some(f => f.startsWith('identity bank-payment · ch3-decision-map')), bad.join('\n'));
  assert(bad.some(f => f.startsWith('always lane routes orthogonal and through no card · bank-payment · ch9-threat')), bad.join('\n'));
  pass('a broken anchor, a drawing that strays from its control and a route through a card each fail the gate');
}
{
  for (const t of evidence.targets) { assert(t.today != null && t.drawn != null, 'target measured: ' + t.picture + ' ' + t.metric); assert.equal(t.met, t.target.startsWith('=') ? t.drawn === Number(t.target.slice(2)) : t.drawn <= Number(t.target.slice(3))); }
  assert(evidence.targets.length >= 40);
  pass(`${evidence.targets.length} workstream targets reported with today's and the drawn value (${evidence.summary.targets.met} met)`);
}

// 6. The drawings once V3 and V4 land, measured on today's geometry while it is still today's (merging wires moves no
// line): Chapter 9 draws each entry's trunk once with one head, so its ink falls to today's unique ink and its heads to
// entries plus contracts; Chapter 2 and Chapter 3 draw shared trunks once; the comb identity fails while the utility
// layout returns no combs, as it must. A part whose workstream has landed is covered by the real pictures above.
{
  const ch9 = !LANDED.has('V2') && !LANDED.has('V4'), ch2 = !LANDED.has('V4'), ch3 = !LANDED.has('V3'), said = [];
  const bank = projects.find(p => p.key === 'bank-payment'), sim = new Set(['V3', 'V4']), {rows} = measureProject(bank, sim), row = v => rows.find(r => r.view === v);
  const ev = evaluate(rows, sim), held = rule => ev.assertions.filter(a => a.rule.startsWith(rule)).map(a => a.holds);
  if (ch9) {
    const t = row('ch9-threat');
    assert.equal(t.drawn.heads, t.extra.entries + t.extra.contracts); assert.equal(t.drawn.heads, 11); assert.equal(t.control.heads, 22);
    assert.equal(t.drawn.ink, t.control.uniqueInk, 'each piece drawn once'); assert.equal(t.drawn.uniqueInk, t.control.uniqueInk); assert.equal(t.drawn.overlaps, 0);
    assert.deepEqual(t.conflicts, {atJoin: 0, onTrunk: 0, tContacts: 0, apart: 0}); assert.equal(t.drawn.visualCrossings, t.control.visualCrossings, 'merging moves no line');
    assert.deepEqual(held('Ch9 heads equal entries plus contracts'), [true]); assert.deepEqual(held('Ch9 ink at or below'), [true]);
    said.push(`Ch9 heads 22 → ${t.drawn.heads}, ink ${t.control.ink} → ${t.drawn.ink}`);
  }
  if (ch2) {
    const u = row('ch2-utility');
    assert(u.drawn.ink < u.control.ink && u.drawn.uniqueInk === u.control.uniqueInk && u.drawn.heads === 0);
    assert.deepEqual(held('Ch2 one comb per parent'), [false], 'no combs: the identity fails');
    said.push(`Ch2 ink ${u.control.ink} → ${u.drawn.ink}, a missing comb is caught`);
  }
  if (ch3) {
    const d = row('ch3-decision-map');
    assert(d.extra.weighsInk[0] < d.extra.weighsInk[1] && d.drawn.uniqueInk === d.control.uniqueInk && d.drawn.visualCrossings === d.control.visualCrossings && d.drawn.heads === 9);
    assert.deepEqual(held('Ch3 crossings at or below the priority order'), [true]);
    said.push(`Ch3 weighs ink ${d.extra.weighsInk[1]} → ${d.extra.weighsInk[0]}`);
  }
  assert(!ev.identities.some(i => /ch9|ch2|ch3/.test(i.picture)), 'a landed view is no longer compared line for line');
  pass('once V3/V4 land, on today\'s geometry: ' + (said.join('; ') || 'all landed, covered by the real pictures'));
}

// 7. Chapter 10 rails as design-spec.json V6 declares them, built here on bank-payment's rows: a rail per needed part
// spanning its marks (6 px above each dependent's row centre) and its stub (6 px below the part's), interval coloured.
// The identities hold, the picture is cleaner than today's trunks, and each broken rail is caught.
{
  const doc = projects.find(p => p.key === 'bank-payment').document, V = deploySource(doc, {order: {}}), F = foldDeploy(V, deployScope(V, {kind: 'system'}), deployDepth(V)), L = deployLayout(F, {viewW: CL.DEPLOY_W});
  const cy = new Map(L.rows.map(r => [r.id, r.cy])), by = new Map();
  for (const l of F.links.filter(l => cy.has(l.from) && cy.has(l.to))) (by.get(l.to) || by.set(l.to, []).get(l.to)).push(l);
  const railsOf = () => {
    const rails = [...by].map(([to, ls]) => { const dots = ls.map(l => ({link: l.id, from: l.from, y: cy.get(l.from) - 6})), stubY = cy.get(to) + 6, ys = [stubY, ...dots.map(x => x.y)]; return {id: 'to:' + to, to, key: 'to:' + to, a: Math.min(...ys), b: Math.max(...ys), y1: Math.min(...ys), y2: Math.max(...ys), stubY, dots}; });
    const levels = colourIntervals(rails, 3), arcW = Math.max(30, DEP.ARC_PAD * 2 + levels * DEP.ARC_STEP), xb = DEP.RAIL + arcW - 4;
    for (const r of rails) { r.x = xb - DEP.ARC_PAD - r.level * DEP.ARC_STEP; r.xb = xb; }
    return {rails, arcW, x0: DEP.RAIL + arcW};
  };
  const V6 = new Set(['V6']), rowOf = R => deployRow('ch10-deployment', {...L, ...R}, F, V6);
  const good = rowOf(railsOf());
  assert.deepEqual(good.structure.railFaults, []); assert.equal(good.drawn.heads, good.extra.targets); assert.equal(good.drawn.heads, 15); assert.equal(good.drawn.marks, 37);
  assert(good.drawn.ink < good.control.ink && good.drawn.heads < good.control.heads && good.drawn.visualCrossings <= good.control.visualCrossings, JSON.stringify([good.drawn, good.control]));
  const ev = evaluate([{project: 'bank-payment', depth: 'all', ...good}], V6);
  assert(ev.assertions.filter(a => a.ws === 'V6').every(a => a.holds) && ev.assertions.filter(a => a.ws === 'V6').length === 2);
  const broken = (what, edit) => { const R = railsOf(); edit(R.rails); const f = rowOf(R).structure.railFaults; assert(f.length && f.some(x => x.includes(what)), what + ': ' + JSON.stringify(f)); };
  broken('marks', rails => rails[0].dots.pop());
  broken('rails', rails => rails.push({...rails[0], id: rails[0].id + '-again'}));
  broken('does not span', rails => { rails[0].y2 = rails[0].stubY - 10; });
  // A stub runs from its rail towards the cards, so it passes every rail nearer the cards: a mark there may not sit on it.
  broken('within 3 px of a stub', rails => { const near = rails.reduce((m, r) => (r.x > m.x ? r : m)), far = rails.find(r => r.x < near.x); near.dots[0].y = far.stubY + 1; near.y1 = Math.min(near.y1, near.dots[0].y); near.y2 = Math.max(near.y2, near.dots[0].y); });
  broken('exceed the budget', rails => rails.forEach((r, i) => { r.level = 2 * i; }));
  pass(`Ch10 rails per the spec: ${good.drawn.heads} heads (today ${good.control.heads}), ${good.drawn.marks} marks, ${good.extra.levels[0]} levels (today ${good.extra.levels[1]}), ${good.drawn.visualCrossings} crossings (today ${good.control.visualCrossings}), ink ${good.drawn.ink} (today ${good.control.ink}); a missing mark, a second rail, a short rail, a mark on a stub and levels over budget are caught`);
}

// 8. Whole design spines (V7), on a hand-built picture: two components in one column over two capability lanes. A
// spine whose feet are its needs and which steps round the card below it is clean; a spine through the lower card, a
// second spine and feet that are not the needs are caught.
{
  const comp = (obj, y) => ({kind: 'comp', obj, x: 100, y, w: 200, h: 60, col: 0}), lane = (obj, y) => ({kind: 'lane', obj, x: 80, y, w: 400, h: 30});
  const M = {needs: new Map([['c1', ['l1', 'l2']], ['c2', ['l1']]])};
  const items = [comp('c1', 0), comp('c2', 100), lane('l1', 300), lane('l2', 360)];
  const spine = (from, points, feet) => ({kind: 'spine', from, points, feet: feet.map(to => ({to}))});
  const ok = [spine('c1', [[100, 50], [93, 50], [93, 168], [167, 168], [167, 360]], ['l1', 'l2']), spine('c2', [[200, 160], [200, 300]], ['l1'])];
  const rowOf = threads => anatomyRow(M, {items, threads, routes: []}, {items, threads, routes: []}, 6, new Set(['V7']));
  const good = rowOf(ok);
  assert.deepEqual(good.structure.spineFaults, []); assert.equal(good.drawn.marks, 3); assert.equal(good.control.marks, 3, 'the control draws one pillar per need');
  assert.equal(good.drawn.lines, 2); assert.equal(good.control.lines, 3);
  const faults = threads => rowOf(threads).structure.spineFaults.join('; ');
  assert.match(faults([spine('c1', [[133, 60], [133, 360]], ['l1', 'l2']), ok[1]]), /passes behind a component card/);
  assert.match(faults([...ok, spine('c2', [[250, 160], [250, 300]], ['l1'])]), /c2: 2 spines/);
  assert.match(faults([spine('c1', ok[0].points, ['l1']), ok[1]]), /c1: its feet are not its needs/);
  assert.match(faults([ok[0]]), /c2: needs a lane and has no spine/);
  pass('Whole design spines: clean spine accepted (2 lines for 3 needs); a pass behind a card, a second spine, wrong feet and a missing spine are caught');
}

// 9. Deterministic: the evidence is the same in-process, in a second process, and as written in audit/round11/evidence.
{
  assert.equal(serialise(chapterLines({projects})), text, 'two runs in one process');
  assert.equal(await child, text, 'a second process gives the same bytes');
  const file = path.join(REPO, 'audit/round11/evidence/chapter-lines.json');
  assert(existsSync(file), 'audit/round11/evidence/chapter-lines.json exists (npm run evidence:chapter-lines)');
  assert.equal(readFileSync(file, 'utf8'), text, 'audit/round11/evidence/chapter-lines.json is what the source draws: regenerate it with npm run evidence:chapter-lines');
  pass('evidence byte-identical in-process, across processes and on disk (' + text.length + ' bytes)');
}

console.log(JSON.stringify({status: 'passed', suite: 'chapter-lines', checks: checks.length, pictures: evidence.pictures.length, landed: evidence.landed, anchors: evidence.summary.anchors, identities: evidence.summary.identities, assertions: evidence.summary.assertions, targets: evidence.summary.targets}, null, 1));
