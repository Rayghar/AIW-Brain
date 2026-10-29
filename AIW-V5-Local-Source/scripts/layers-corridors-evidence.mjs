// Round 11 · the Layers corridors evidence (workstream D). The round-10 line harness (scripts/notation-lines-evidence.mjs)
// run on the same documents and gates with the Layers views planned with their corridors (notationLayout corridors:true,
// the default since round 11), written as audit/round11/evidence/layers-corridors.json, .csv and -timing.json; then this
// script reads that run beside the round-10 record (audit/round10/evidence/notation-lines.json, immutable) and writes
// layers-corridors.md: the before and after of the 64 routed reference Layers views (group C) and the 88 routed reference
// Diagram defaults (group A), picture by picture for the Layers views, the fallbacks, the corridor measures and the
// round-10 gates. The before is the round-10 record; the round-11 source reproduces it with every Layers view laid out
// without corridors (--verify-before runs the harness with --corridors off into .aiw-local and compares the round-10
// projection of its output, the round-11 fields left out, byte for byte).
//   node scripts/layers-corridors-evidence.mjs [--documents <dir>] [--out <dir>] [--check] [--verify-before] [--skip-run]
// --check exits 1 when the harness breaks a structural gate, a Diagram default's numbers moved against round 10, or a
// Layers corridor breaks its rules; the round-11 target (Layers crossing points at least 20% below the round-10 record,
// no new fallback) is reported as met or not, never silently.
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {REPO, sha256} from './notation-lines-fixtures.mjs';

const argv = process.argv.slice(2), flag = k => argv.includes(k), arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(REPO, arg('--out', 'audit/round11/evidence')), BEFORE = path.join(REPO, 'audit/round10/evidence/notation-lines.json'), BEFORE_TIMING = path.join(REPO, 'audit/round10/evidence/notation-lines-timing.json');
const NAME = 'layers-corridors', pkg = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const harness = (args, out) => { const r = spawnSync(process.execPath, ['scripts/notation-lines-evidence.mjs', '--out', out, ...args, ...(arg('--documents') ? ['--documents', arg('--documents')] : [])], {cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26}); process.stderr.write(r.stderr || ''); process.stdout.write(r.stdout || ''); return r.status; };

mkdirSync(OUT, {recursive: true});
if (!flag('--skip-run')) { const code = harness(['--name', NAME, '--round', '11', '--check'], OUT); if (code !== 0 && !flag('--check')) console.error('the harness exited with ' + code); if (code !== 0 && flag('--check')) process.exit(code); }
const after = JSON.parse(readFileSync(path.join(OUT, NAME + '.json'), 'utf8')), before = JSON.parse(readFileSync(BEFORE, 'utf8'));
const timingAfter = JSON.parse(readFileSync(path.join(OUT, NAME + '-timing.json'), 'utf8')), timingBefore = existsSync(BEFORE_TIMING) ? JSON.parse(readFileSync(BEFORE_TIMING, 'utf8')) : null;

// The round-10 projection of a run: the fields the round-10 harness wrote, so a run without corridors compares with the
// round-10 file byte for byte.
const ROUND10_GATES = ['routedPictures', 'integrityViolations', 'foreignOnTrunk', 'foreignAtJoin', 'tContacts', 'through', 'labelOnLabel', 'maxForeignSharedOnADiagramDefault', 'diagramDefaultsAboveThreeForeignShared', 'maxForeignSharedOnALayersView', 'tabStopsEqualRelationships', 'defaultsWhereAfterExceedsControl', 'bundlesInStraightPictures', 'bundlesInTheControl', 'picturesWithFallback', 'picturesIdenticalToControl'];
const project10 = text => {
  const e = JSON.parse(text), {corridors, ...head} = e;
  head.round = 10;
  head.thresholds = Object.fromEntries(Object.entries(head.thresholds).filter(([k]) => !k.startsWith('CORRIDOR_')));
  head.gates = Object.fromEntries(ROUND10_GATES.map(k => [k, head.gates[k]]));
  for (const g of Object.values(head.groups)) delete g.corridors;
  head.pictures = head.pictures.map(({corridors, ...r}) => r);
  const {pictures, ...rest} = head;
  return JSON.stringify(rest, null, 1).replace(/\n}$/, ',\n "pictures": [\n' + pictures.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n}') + '\n';
};
let verify = null;
if (flag('--verify-before')) {
  const dir = path.join(REPO, '.aiw-local', 'layers-corridors-before'); mkdirSync(dir, {recursive: true});
  const code = harness(['--name', 'notation-lines', '--corridors', 'off'], dir);
  const projected = project10(readFileSync(path.join(dir, 'notation-lines.json'), 'utf8')), recorded = readFileSync(BEFORE, 'utf8');
  // Two blocks differ by design: `sources` (the round-11 harness and modules carry other hashes) and `definitions` (the
  // metric definitions, read from notation-metrics.mjs, now describe corridorMetrics too). Every other key, the pictures
  // and the gates among them, must be byte-identical.
  const P = JSON.parse(projected), R = JSON.parse(recorded), keys = [...new Set([...Object.keys(P), ...Object.keys(R)])];
  const differing = keys.filter(k => JSON.stringify(P[k]) !== JSON.stringify(R[k])), byDesign = ['sources', 'definitions'];
  verify = {exit: code, projectedSha256: sha256(projected), recordedSha256: sha256(recorded), identical: projected === recorded, differing, reproduced: differing.every(k => byDesign.includes(k))};
}

// The tables.
const key = r => [r.project, r.chapter, r.scene, r.arrangement].join(' · ');
const byKey = rows => new Map(rows.map(r => [key(r), r]));
const B = byKey(before.pictures), A = byKey(after.pictures);
// A picture outside the Layers view is a scene of a document in an arrangement; the chapter is where the scene is
// first offered, and a scene a chapter stops offering (round 11: cooperation left Chapter 5) is the same picture at
// its next chapter, compared by scene.
const sceneKey = r => [r.project, r.scene, r.arrangement].join(' · ');
const byScene = rows => new Map(rows.filter(r => r.scene !== 'connected').map(r => [sceneKey(r), r]));
const Bs = byScene(before.pictures), As = byScene(after.pictures);
const same = r => B.get(key(r)) || Bs.get(sceneKey(r));
const GROUP_K = ['visualCrossings', 'foreignShared', 'touches', 'bends', 'ink', 'markers', 'lineEnds'];
const pct = (a, b) => (a ? (Math.round((b - a) / a * 1000) / 10).toFixed(1) + '%' : '–');
const n = x => Number(x).toLocaleString('en-GB');
const groupRow = g => { const b = before.groups[g], a = after.groups[g]; return `| ${g} · ${a.title} | ${b.pictures} / ${a.pictures} | ` + GROUP_K.map(k => `${n(b.after[k])} → ${n(a.after[k])} (${pct(b.after[k], a.after[k])})`).join(' | ') + ` | ${b.fallbacks.length} → ${a.fallbacks.length} |`; };
const layersMs = t => t ? t.pictures.filter(p => p.scene === 'connected').reduce((s, p) => ({control: s.control + p.controlMs, after: s.after + p.afterMs, max: Math.max(s.max, p.afterMs)}), {control: 0, after: 0, max: 0}) : null;
const msB = layersMs(timingBefore), msA = layersMs(timingAfter);
const layersRows = after.pictures.filter(r => r.groups.includes('C'));
const perView = layersRows.map(r => { const b = B.get(key(r)); return `| ${r.project} | ${r.chapter} | ${r.nodes} | ${r.edges} | ${b ? b.after.visualCrossings : '–'} → ${r.after.visualCrossings} | ${b ? b.after.foreignShared : '–'} → ${r.after.foreignShared} | ${r.corridors.planned} / ${r.corridors.demand} / ${r.corridors.slotted} / ${r.corridors.followed} | ${b && b.consolidation.fallback ? b.consolidation.fallback : '–'} → ${r.consolidation.fallback || '–'} |`; });
const fbB = new Map(before.pictures.filter(r => r.groups.includes('C') && r.consolidation.fallback).map(r => [key(r), r.consolidation.fallback])), fbA = new Map(layersRows.filter(r => r.consolidation.fallback).map(r => [key(r), r.consolidation.fallback]));
const newFallbacks = [...fbA].filter(([k]) => !fbB.has(k)), resolved = [...fbB].filter(([k]) => !fbA.has(k)), changed = [...fbA].filter(([k, v]) => fbB.has(k) && fbB.get(k) !== v);
// The Diagram defaults and every other non-Layers picture: control and after unchanged against round 10.
const METRIC_K = Object.keys(before.pictures[0].after);
const rehoused = after.pictures.filter(r => r.scene !== 'connected' && !B.has(key(r)) && Bs.has(sceneKey(r))).map(r => `${key(r)} (Chapter ${Bs.get(sceneKey(r)).chapter} in round 10)`);
const moved = after.pictures.filter(r => r.scene !== 'connected').flatMap(r => { const b = same(r); if (!b) return [key(r) + ': not in round 10']; const diffs = []; for (const side of ['control', 'after']) for (const k of METRIC_K) if (b[side][k] !== r[side][k]) diffs.push(`${side}.${k} ${b[side][k]} → ${r[side][k]}`); if (b.consolidation.fallback !== r.consolidation.fallback) diffs.push(`fallback ${b.consolidation.fallback} → ${r.consolidation.fallback}`); return diffs.length ? [key(r) + ': ' + diffs.join(', ')] : []; });
const missing = before.pictures.filter(r => r.scene !== 'connected' && !A.has(key(r)) && !As.has(sceneKey(r))).map(key);
const C = {before: before.groups.C.after.visualCrossings, after: after.groups.C.after.visualCrossings};
const target = {crossingsBefore: C.before, crossingsAfter: C.after, change: pct(C.before, C.after), met: C.after <= 0.8 * C.before, newFallbacks: newFallbacks.map(([k, v]) => k + ' (' + v + ')'), resolvedFallbacks: resolved.map(([k, v]) => k + ' (' + v + ')'), changedFallbacks: changed.map(([k, v]) => k + ' (' + fbB.get(k) + ' → ' + v + ')')};
const gateLine = g => Object.entries(g).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join('; ');

const md = `# Round 11 · corridors for the Layers view: the evidence

Release ${pkg.release} (controlling baseline AIW v0.10.0-rc.10.73.6; productionAccepted false). Generated by
\`scripts/layers-corridors-evidence.mjs\` (\`npm run evidence:layers-corridors\`): the round-10 harness
\`scripts/notation-lines-evidence.mjs\` on the same documents (${after.documents.map(d => d.key).join(', ')}; ${timingAfter.documents.source})
with the same gates, written as \`layers-corridors.json\`, \`.csv\` and \`-timing.json\`. The before is the round-10 record
\`audit/round10/evidence/notation-lines.json\`, unchanged.${verify ? verify.identical ? ' The round-11 source laid out without corridors (`--corridors off`) reproduces that record byte for byte (SHA-256 ' + verify.recordedSha256.slice(0, 12) + '…).' : verify.reproduced ? ' The round-11 source laid out without corridors (`--corridors off`) reproduces every picture, group and gate of that record byte for byte; the two files differ only in ' + verify.differing.map(k => '`' + k + '`').join(' and ') + ' (the round-11 harness and modules carry other hashes; the metric definitions now describe corridorMetrics).' : ' WARNING: the round-11 source laid out without corridors does NOT reproduce the round-10 record: ' + verify.differing.join(', ') + ' differ (projected SHA-256 ' + verify.projectedSha256.slice(0, 12) + '…, recorded ' + verify.recordedSha256.slice(0, 12) + '…).' : ''}

## The groups, round 10 → round 11 (the picture as drawn)

| Group | Pictures | Crossing points | Foreign shared runs | Touches | Bends | Ink | Marks | Line ends | Fallbacks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${['C', 'A', 'B', 'D', 'E'].map(groupRow).join('\n')}

The straight pictures (group F) are unchanged by design (a Layers view above 160 connectors or 120 elements plans no corridor).

Timing of the Layers views (every Layers picture of every document, ${msA ? timingAfter.pictures.filter(p => p.scene === 'connected').length : '–'} layouts; machine-dependent, round 10 measured on ${timingBefore ? timingBefore.node : '–'} and this run on ${timingAfter.node}): control ${msB ? n(msB.control) : '–'} → ${n(msA.control)} ms, as drawn ${msB ? n(msB.after) : '–'} → ${n(msA.after)} ms, slowest as drawn ${msB ? msB.max : '–'} → ${msA.max} ms (the budget suite holds each reference Layers view under 900 ms and within three times its control plus 100 ms).

## The target

Layers crossing points on the 64 reference views: ${n(C.before)} → ${n(C.after)} (${target.change}); the round-11 target of at least 20% fewer is **${target.met ? 'met' : 'not met'}**.
Fallbacks on those views: ${fbB.size} → ${fbA.size}. New: ${newFallbacks.length ? newFallbacks.map(([k, v]) => `${k} (${v})`).join('; ') : 'none'}. Resolved: ${resolved.length ? resolved.map(([k, v]) => `${k} (${v})`).join('; ') : 'none'}. Changed: ${changed.length ? changed.map(([k, v]) => `${k} (${fbB.get(k)} → ${v})`).join('; ') : 'none'}.
Corridors on those views: ${JSON.stringify(after.groups.C.corridors)} (planned connectors; row crossings they demand; slots given; slots the drawn route runs through). Corridor rules on every routed Layers view: ${JSON.stringify(after.gates.corridorRules)}.

## The Diagram defaults and every other picture

${rehoused.length ? 'Pictures offered at another chapter since round 10, with the same numbers (' + rehoused.length + '): ' + rehoused.join('; ') + '.\n\n' : ''}${moved.length ? 'Pictures outside the Layers view whose numbers moved against round 10 (' + moved.length + '):\n\n' + moved.map(m => '- ' + m).join('\n') : 'Every picture outside the Layers view (the 88 routed reference Diagram defaults among them) has the same control and after numbers and the same fallback as in round 10.'}${missing.length ? '\n\nRound-10 pictures missing from this run: ' + missing.join('; ') : ''}

## The gates

Round 11: ${gateLine(after.gates)}

Round 10: ${gateLine(before.gates)}

## The 64 Layers views

| Project | Chapter | Elements | Connectors | Crossing points | Foreign shared runs | Corridors planned / demand / slotted / followed | Fallback |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
${perView.join('\n')}
`;
writeFileSync(path.join(OUT, NAME + '.md'), md);
console.log(JSON.stringify({wrote: path.relative(REPO, path.join(OUT, NAME + '.md')), target, moved: moved.length, rehoused: rehoused.length, missing: missing.length, verify}, null, 1));
if (flag('--check') && (moved.length || missing.length || (verify && !verify.reproduced))) { console.error('the Diagram defaults moved, pictures are missing, or the before is not reproduced'); process.exit(1); }
