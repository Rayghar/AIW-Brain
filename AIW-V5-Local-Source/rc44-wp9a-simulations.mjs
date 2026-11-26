// AIW rc44, work package wp9a slice 2 (audit/rc44/design/wp9a-deployment.md, Slice 2, case 6): what the walkthrough
// (public/runtime-domain.js simulateRuntime) answers without its third argument, for every environment, zone and mode
// of the three references and of the Tidewater project, untyped and typed, as the SHA-256 of its text. It imports only
// modules that exist at 4349bb6, so the same file reads the base tree: `node rc44-wp9a-simulations.mjs --capture
// 4349bb6` prints the digests (rc44-wp9a-simulations-baseline.json was captured so from an unchanged checkout of
// 4349bb6; it is never captured again). Reads no clock: every document is built at a fixed time.
import {createHash} from 'node:crypto';
import * as R from './rc44-s0-readings.mjs';
import * as F from './rc44-wp9a-deployment-fixtures.mjs';
import {commandHandler} from './worker.js';
import {simulateRuntime} from './public/runtime-domain.js';
import {withFinalReview} from './public/review-domain.js';

const AT = '2026-11-19T10:00:00.000Z', sha = text => createHash('sha256').update(text).digest('hex');
// The Tidewater project typed as the fixture types it, through the handlers the server calls, as a signed-in person.
function typed() {
  let p = F.tidewater();
  F.typeTopology((type, payload) => { const r = commandHandler(type)(structuredClone(p), {type, payload}, AT, F.A, {author: {kind: 'person', id: F.A, account: 'person', reviewed: true}}); p = withFinalReview(r.document); return r.selected; });
  return p;
}
export const documents = () => ({...Object.fromEntries(R.REFERENCES.map(t => [t, R.reference(t)])), tidewater: F.tidewater(), 'tidewater-typed': typed()});
// Every walkthrough a person can ask for: each zone of each environment, lost alone and with its failure domain.
export function walkthroughs(p) {
  const out = [];
  for (const e of p.runtime?.environments || []) for (const z of (p.runtime.zones || []).filter(x => x.environmentId === e.id)) for (const mode of ['zone', 'domain']) {
    let result; try { result = simulateRuntime(p, {environmentId: e.id, zoneId: z.id, mode, durationMinutes: 60}); } catch (error) { result = {refused: error.message}; }
    out.push([e.id, z.id, mode, result]);
  }
  return out;
}
export const simulationDigests = () => Object.fromEntries(Object.entries(documents()).map(([name, p]) => { const w = walkthroughs(p); return [name, {walkthroughs: w.length, sha: sha(JSON.stringify(w))}]; }));

if (process.argv[1] && process.argv[1].endsWith('rc44-wp9a-simulations.mjs') && process.argv.includes('--capture')) {
  console.log(JSON.stringify({capturedFrom: process.argv[process.argv.indexOf('--capture') + 1] || 'working tree', at: AT, digests: simulationDigests()}, null, 1));
  process.exit(0);
}
