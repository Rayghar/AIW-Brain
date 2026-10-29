// Current-source comparison of Layers routing with its corridor planner on and off.
// The Round 10 and 11 evidence is a frozen historical record, whose scene offerings
// and source hashes differ from this release. Both sides below use today's source,
// the same saved fixture documents and the same independent metric definitions.
// Run: npm run evidence:layers-corridors-current
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {REPO} from './notation-lines-fixtures.mjs';

const out = path.join(REPO, 'audit/round16/evidence');
mkdirSync(out, {recursive: true});
for (const [name, mode] of [['layers-corridors-current', 'on'], ['layers-corridors-control', 'off']]) {
  const p = spawnSync(process.execPath, ['scripts/notation-lines-evidence.mjs', '--name', name, '--round', '16', '--corridors', mode, '--out', out, '--check'], {cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26});
  process.stdout.write(p.stdout || ''); process.stderr.write(p.stderr || '');
  if (p.error || p.status !== 0) throw p.error || Error(name + ': evidence harness failed (' + p.status + ')');
}
const on = JSON.parse(readFileSync(path.join(out, 'layers-corridors-current.json'), 'utf8'));
const off = JSON.parse(readFileSync(path.join(out, 'layers-corridors-control.json'), 'utf8'));
const c = on.groups.C.after, b = off.groups.C.after;
const summary = {
  schema: 'aiw.layers-corridors-comparison.v1', release: on.release, productionAccepted: false,
  method: 'Same current source, documents, scenes, and metrics; only Layers corridor planning switches on or off.',
  pictures: on.pictures.length, layersViews: on.groups.C.pictures,
  crossings: {off: b.visualCrossings, on: c.visualCrossings, reductionPercent: Math.round((1 - c.visualCrossings / b.visualCrossings) * 1000) / 10},
  foreignShared: {off: b.foreignShared, on: c.foreignShared}, touches: {off: b.touches, on: c.touches}, ink: {off: b.ink, on: c.ink},
  fallbacks: {off: off.groups.C.fallbacks.length, on: on.groups.C.fallbacks.length},
  corridors: on.groups.C.corridors,
  historical: 'audit/round10/evidence/notation-lines.json and audit/round11/evidence/layers-corridors.json remain frozen; their sources/scenes are different and are not the quantitative control for this release.'
};
writeFileSync(path.join(out, 'layers-corridors-comparison.json'), JSON.stringify(summary, null, 2) + '\n');
writeFileSync(path.join(out, 'layers-corridors-comparison.md'), `# Layers corridor comparison · current source\n\n${summary.method}\n\n| Measure | Corridors off | Corridors on |\n| --- | ---: | ---: |\n| Reference Layers crossing points | ${b.visualCrossings} | ${c.visualCrossings} (${summary.crossings.reductionPercent}% fewer) |\n| Foreign shared runs | ${b.foreignShared} | ${c.foreignShared} |\n| Touches | ${b.touches} | ${c.touches} |\n| Ink (px) | ${b.ink} | ${c.ink} |\n| Fall back | ${summary.fallbacks.off} | ${summary.fallbacks.on} |\n\nThe ${summary.pictures} pictures include ${summary.layersViews} routed reference Layers views. Both runs keep source SHA-256 values and document fingerprints in the adjacent JSON and timing records. The independent structural and comparison gates run through \`npm run test:layers-corridors\`.\n\n${summary.historical}\n`);
console.log(JSON.stringify(summary, null, 2));
