// The frozen Round 16 corridor comparison describes the legacy Show every element
// rendering, where individual lines are still available. Round 17's default overview
// has its own live source checks in layers-overview-validate.mjs, imported below.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import './layers-overview-validate.mjs';

const repo = import.meta.dirname, out = path.join(repo, 'audit/round16/evidence');
const read = name => JSON.parse(readFileSync(path.join(out, name + '.json'), 'utf8'));
const on = read('layers-corridors-current'), off = read('layers-corridors-control'), summary = read('layers-corridors-comparison');
const timingOn = read('layers-corridors-current-timing'), timingOff = read('layers-corridors-control-timing');
const key = r => [r.project, r.chapter, r.scene, r.arrangement].join(' · ');
const checks = [], pass = s => { checks.push(s); console.log('PASS', s); };

// These measurements belong to Round 16. Validate their paired fingerprints and
// measured invariants without representing them as fresh Round 17 evidence.
for (const x of [on, off]) {
  assert.equal(x.schema, 'aiw.notation-lines.v1'); assert.equal(x.round, 16); assert.equal(x.productionAccepted, false);
  assert.equal(x.release, 'AIW v0.10.0-rc.10.73.16');
}
assert.match(on.corridors, /corridors:true/); assert.match(off.corridors, /corridors:false/);
assert.deepEqual(on.sources, off.sources); assert.deepEqual(on.documents, off.documents);
assert.deepEqual(timingOn.documents.files, timingOff.documents.files, 'identical fixture document fingerprints');
assert.deepEqual(on.thresholds, off.thresholds);
pass(`both frozen Round 16 variants name the same ${Object.keys(on.sources).length} source hashes and ${on.documents.length} document fingerprints`);

// All independent structural checks stay strict on both variants.
for (const x of [on, off]) {
  const g = x.gates;
  for (const k of ['integrityViolations', 'foreignOnTrunk', 'foreignAtJoin', 'tContacts', 'through', 'labelOnLabel', 'bundlesInStraightPictures', 'bundlesInTheControl']) assert.equal(g[k], 0, k);
  assert.equal(g.tabStopsEqualRelationships, true);
  assert.deepEqual(g.defaultsWhereAfterExceedsControl, []);
  assert.deepEqual(g.corridorRules, {overfull: 0, offPitch: 0, onElement: 0});
  assert.equal(g.routedPictures, 307);
}
assert.equal(off.gates.layersCorridors.planned, 0);
assert.ok(on.gates.layersCorridors.planned > 0 && on.gates.layersCorridors.followed > 0);
pass('all 307 routed pictures retain zero structural violations, valid corridor slots, complete relationship tab stops and no bundle regression');

// Non-Layers pictures are bitwise-equivalent in their measured routing outcomes;
// the comparison has the same picture keys rather than changing the scene set.
const before = new Map(off.pictures.map(r => [key(r), r]));
assert.equal(on.pictures.length, off.pictures.length);
assert.deepEqual(new Set(on.pictures.map(key)), new Set(off.pictures.map(key)));
for (const r of on.pictures) {
  const b = before.get(key(r)); assert.ok(b, key(r));
  assert.equal(r.nodes, b.nodes, key(r) + ' nodes'); assert.equal(r.edges, b.edges, key(r) + ' edges');
  assert.deepEqual(r.groups, b.groups, key(r) + ' groups');
  if (r.scene !== 'connected') {
    assert.deepEqual(r.control, b.control, key(r) + ' control');
    assert.deepEqual(r.after, b.after, key(r) + ' drawn');
    assert.deepEqual(r.consolidation, b.consolidation, key(r) + ' bundle outcome');
    assert.equal(r.corridors.planned, 0, key(r) + ' plans no Layers corridor');
  }
}
pass(`${on.pictures.length} matched pictures; every non-Layers picture has identical metrics and bundle outcome with corridors on and off`);

const c = on.groups.C.after, b = off.groups.C.after;
assert.equal(on.groups.C.pictures, 64); assert.equal(off.groups.C.pictures, 64);
assert.ok(c.visualCrossings <= b.visualCrossings * 0.8, `at least 20% fewer crossing points: ${b.visualCrossings} → ${c.visualCrossings}`);
for (const field of ['foreignShared', 'touches', 'ink']) assert.ok(c[field] <= b[field], field + ': ' + b[field] + ' → ' + c[field]);
assert.ok(on.groups.C.fallbacks.length <= off.groups.C.fallbacks.length, 'no new aggregate fallback count');
for (const f of on.groups.C.fallbacks) assert.ok(['duplicates', 'none'].includes(f.fallback) && f.why.length, f.picture + ' explains fallback');
const P = on.groups.C.corridors;
assert.ok(P.planned > 0 && P.slotted <= P.demand && P.followed <= P.slotted);
assert.equal(summary.crossings.off, b.visualCrossings); assert.equal(summary.crossings.on, c.visualCrossings);
assert.deepEqual(summary.fallbacks, {off: off.groups.C.fallbacks.length, on: on.groups.C.fallbacks.length});
assert.deepEqual(summary.corridors, P);
pass(`Round 16 detailed Layers view: crossing points ${b.visualCrossings} → ${c.visualCrossings} (${summary.crossings.reductionPercent}% fewer), shared ${b.foreignShared} → ${c.foreignShared}, touches ${b.touches} → ${c.touches}, ink ${b.ink} → ${c.ink}, fallbacks ${off.groups.C.fallbacks.length} → ${on.groups.C.fallbacks.length}`);
console.log(JSON.stringify({status: 'passed', historicalChecks: checks.length, release: on.release, comparison: {...summary, method: 'Frozen Round 16 paired source and documents; legacy detailed view only.'}}, null, 2));
