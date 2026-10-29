// Round 11 · the Layers corridors evidence gate (workstream D): audit/round11/evidence/layers-corridors.json, written by
// scripts/layers-corridors-evidence.mjs from the round-10 line harness, read beside the round-10 record. What it holds:
// the evidence is the current source's (the SHA-256 of every module it names equals the file on disk: stale evidence
// fails and names the command that regenerates it); the round-10 structural gates hold on every routed picture and the
// corridor rules on every routed Layers view; every picture outside the Layers view has the numbers it had in round 10;
// the 64 reference Layers views cross at least 20% less than the round-10 record and fall back no more often than this
// round measured; the thresholds mirror the layout's. Run: npm run test:layers-corridors (the evidence: npm run
// evidence:layers-corridors).
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DRAWN} from './notation-metrics.mjs';
import {CORRIDOR} from './public/notation-layout.js';

const REPO = path.dirname(fileURLToPath(import.meta.url)), checks = [], pass = name => { checks.push(name); console.log('PASS', name); };
const sha256 = text => createHash('sha256').update(text).digest('hex');
const FILE = path.join(REPO, 'audit/round11/evidence/layers-corridors.json'), BEFORE = path.join(REPO, 'audit/round10/evidence/notation-lines.json'), REGEN = 'npm run evidence:layers-corridors';
assert.ok(existsSync(FILE), 'audit/round11/evidence/layers-corridors.json exists (' + REGEN + ')');
const E = JSON.parse(readFileSync(FILE, 'utf8')), B = JSON.parse(readFileSync(BEFORE, 'utf8'));
const key = r => [r.project, r.chapter, r.scene, r.arrangement].join(' · ');

// 1. Provenance: the current source, the round, the release notation, no production claim.
{
  assert.equal(E.schema, 'aiw.notation-lines.v1'); assert.equal(E.round, 11); assert.equal(E.productionAccepted, false); assert.equal(E.controllingBaseline, 'AIW v0.10.0-rc.10.73.6');
  assert.match(E.release, /^AIW v0\.10\.0-rc\.10\.\d+\.\d+$/, 'the release notation'); assert.equal(E.release, JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8')).release, 'the release the evidence names is the package\'s');
  assert.match(E.corridors, /corridors:true/, 'the Layers views were planned with their corridors');
  const stale = Object.entries(E.sources).filter(([f, h]) => sha256(readFileSync(path.join(REPO, f), 'utf8')) !== h).map(([f]) => f);
  assert.deepEqual(stale, [], 'the evidence is the current source\'s; regenerate it with ' + REGEN + ' (stale: ' + stale.join(', ') + ')');
  assert.deepEqual(Object.fromEntries(['SPAN', 'SLOTS', 'PITCH', 'MARGIN'].map(k => [k, E.thresholds['CORRIDOR_' + k]])), {...CORRIDOR}, 'the thresholds recorded are the layout\'s CORRIDOR, through DRAWN');
  assert.deepEqual(E.thresholds, DRAWN, 'and the whole of DRAWN');
  assert.ok(existsSync(path.join(REPO, 'audit/round11/evidence/layers-corridors.md')) && existsSync(path.join(REPO, 'audit/round11/evidence/layers-corridors.csv')), 'the table and the CSV stand beside it');
  pass(`round-11 evidence of the current source (${Object.keys(E.sources).length} modules by SHA-256), release ${E.release}, productionAccepted false, thresholds = DRAWN`);
}

// 2. The round-10 gates and the corridor rules.
{
  const g = E.gates;
  for (const k of ['integrityViolations', 'foreignOnTrunk', 'foreignAtJoin', 'tContacts', 'through', 'labelOnLabel', 'bundlesInStraightPictures', 'bundlesInTheControl']) assert.equal(g[k], 0, k);
  assert.equal(g.tabStopsEqualRelationships, true); assert.deepEqual(g.defaultsWhereAfterExceedsControl, [], 'no default draws more marks, line ends or ink than its control');
  assert.deepEqual(g.corridorRules, {overfull: 0, offPitch: 0, onElement: 0}, 'every corridor of every routed Layers view in a gap, at most four to a gap, eight px apart, clear of the elements');
  assert.equal(g.routedPictures, B.gates.routedPictures, 'the same routed pictures as round 10');
  for (const r of E.pictures.filter(r => r.scene === 'connected' && !r.straight)) assert.equal(r.corridors.overfull + r.corridors.offPitch + r.corridors.onElement, 0, key(r));
  pass(`the round-10 gates hold on ${g.routedPictures} routed pictures and the corridor rules on every routed Layers view (${JSON.stringify(g.layersCorridors)})`);
}

// 3. Every picture outside the Layers view has its round-10 numbers.
{
  const before = new Map(B.pictures.map(r => [key(r), r])), K = Object.keys(B.pictures[0].after), moved = [], rehoused = [];
  const sceneKey = r => [r.project, r.scene, r.arrangement].join(' · '), beforeByScene = new Map(B.pictures.filter(r => r.scene !== 'connected').map(r => [sceneKey(r), r]));
  for (const r of E.pictures) {
    if (r.scene === 'connected') continue;
    const b = before.get(key(r)) || beforeByScene.get(sceneKey(r)); assert.ok(b, key(r) + ' is a round-10 picture');
    if (b.chapter !== r.chapter) rehoused.push(r);
    for (const side of ['control', 'after']) for (const k of K) if (b[side][k] !== r[side][k]) moved.push(`${key(r)} ${side}.${k} ${b[side][k]} → ${r[side][k]}`);
    if (b.consolidation.fallback !== r.consolidation.fallback) moved.push(key(r) + ' fallback');
    assert.equal(r.corridors.planned, 0, key(r) + ': only a Layers view plans corridors');
  }
  assert.deepEqual(moved, [], 'the Diagram pictures are unchanged against round 10');
  assert.ok(rehoused.every(r => r.scene === 'cooperation' && r.chapter === 8 && beforeByScene.get(sceneKey(r)).chapter === 5), 'the only pictures at another chapter are the cooperation scenes, pictured at Chapter 8 since Chapter 5 stopped offering the scene (round 11)');
  assert.equal(E.pictures.filter(r => r.scene !== 'connected').length, B.pictures.filter(r => r.scene !== 'connected').length, 'and all of them are measured');
  assert.equal(E.groups.A.after.visualCrossings, B.groups.A.after.visualCrossings); assert.equal(E.groups.A.after.ink, B.groups.A.after.ink);
  pass(`the ${E.groups.A.pictures} routed reference Diagram defaults and every other picture outside the Layers view carry their round-10 numbers (crossing points ${E.groups.A.after.visualCrossings}, ink ${E.groups.A.after.ink})`);
}

// 4. The target on the 64 reference Layers views, and the fallbacks.
{
  const c = E.groups.C, b = B.groups.C;
  assert.equal(c.pictures, 64); assert.equal(b.pictures, 64);
  assert.ok(c.after.visualCrossings <= 0.8 * b.after.visualCrossings, `Layers crossing points at least 20% below round 10: ${b.after.visualCrossings} → ${c.after.visualCrossings}`);
  assert.ok(c.after.foreignShared <= b.after.foreignShared && c.after.touches <= b.after.touches && c.after.ink <= b.after.ink, 'foreign shared runs, touches and ink do not rise');
  // The fallbacks: the layouts that fall back are named with their reason; this round measured 5 of 64, as round 10 did,
  // two of them new and two resolved: the suite holds the count at round 10's, never more.
  const fb = c.fallbacks.map(f => f.picture), fb10 = b.fallbacks.map(f => f.picture);
  assert.ok(fb.length <= fb10.length, `no more Layers views fall back than in round 10 (${fb10.length}): ` + fb.join('; '));
  for (const f of c.fallbacks) assert.ok(['duplicates', 'none'].includes(f.fallback) && f.why.length, f.picture + ' says why');
  assert.ok(c.corridors.planned > 0 && c.corridors.slotted <= c.corridors.demand && c.corridors.followed <= c.corridors.slotted, 'corridors planned: ' + JSON.stringify(c.corridors));
  pass(`the 64 reference Layers views: crossing points ${b.after.visualCrossings} → ${c.after.visualCrossings} (${Math.round((c.after.visualCrossings - b.after.visualCrossings) / b.after.visualCrossings * 1000) / 10}%), foreign shared runs ${b.after.foreignShared} → ${c.after.foreignShared}, touches ${b.after.touches} → ${c.after.touches}, ink ${b.after.ink} → ${c.after.ink}; fallbacks ${fb10.length} → ${fb.length} (new: ${fb.filter(p => !fb10.includes(p)).join('; ') || 'none'}; resolved: ${fb10.filter(p => !fb.includes(p)).join('; ') || 'none'}); corridors ${JSON.stringify(c.corridors)}`);
}

console.log(JSON.stringify({status: 'passed', suite: 'layers-corridors', checks: checks.length, layers: {before: B.groups.C.after.visualCrossings, after: E.groups.C.after.visualCrossings, fallbacks: E.groups.C.fallbacks.length, corridors: E.groups.C.corridors}}, null, 1));
