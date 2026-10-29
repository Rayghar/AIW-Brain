// The legacy readings fixture (round 12, D-04): documents written by the code before readings became fingerprints, and
// what that code said about them, for fingerprint-validate.mjs to hold the upgrade to. Run it in a source tree of
// AIW v0.10.0-rc.10.73.16 (commit c5e0582: records there keep copies of what they read); the current tree writes
// fingerprints, so running it here would build a document with nothing to upgrade, and it refuses.
//   cd <rc.10.73.16 tree>/AIW-V5-Local-Source && node <this tree>/AIW-V5-Local-Source/scripts/build-legacy-readings-fixture.mjs <out.json.br>
// Everything goes through that tree's own routes on a fresh local database, as the workbench sends it: the reference
// journey (no client material), then a resolved driver conflict, a recorded technology selection, a workspace analysis,
// the review intake, a confirmed narrative, a requirement trail review, a disposition, a verified delivery action, the
// checks, a recorded review and a frozen baseline (state A); then a requirement edit with one affected record reviewed, a responsibility
// revised and a driver renamed (state B). A second project takes the same steps without the baseline (state C) and is
// exported as a recovery package (small enough to stay a plain one; its document is the package's) and restored. Each state carries the judgements of
// fingerprint-fixtures.mjs as that tree's modules compute them. In the fixture's documents a frozen baseline keeps its
// stamps, chapter stamps and source whole, while its SDD text is cut to the first 4,000 characters, its findings to the
// first three and its connected model left out (it is drawn from the source when absent); no judgement reads them.
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {brotliCompressSync, constants} from 'node:zlib';
import path from 'node:path';
const ROOT = process.cwd(), out = process.argv[2];
if (!out) { console.error('Usage: node build-legacy-readings-fixture.mjs <out.json.br> (cwd: an rc.10.73.16 source tree)'); process.exit(2); }
const load = f => import(path.join(ROOT, f));
const {default: worker} = await load('worker.js');
const {localDatabase} = await load('local-db.js'), {localFiles} = await load('local-files.js');
const M = {review: await load('public/review-domain.js'), quality: await load('public/quality-domain.js'), decisions: await load('public/decisions-domain.js'), logical: await load('public/logical-domain.js'), realisation: await load('public/realisation-domain.js'), technology: await load('public/technology-domain.js'), techrealisation: await load('public/technology-realisation-domain.js'), changes: await load('public/changes-domain.js'), guidance: await load('public/guidance-record.js'), memo: await load('public/document-memo.js')};
const {readingJudgements} = await import(new URL('../fingerprint-fixtures.mjs', import.meta.url));
const dir = await mkdtemp(tmpdir() + '/aiw-legacy-readings-'), env = {DB: localDatabase(dir + '/legacy.sqlite'), FILES: localFiles(dir + '/files'), ASSETS: {fetch: () => new Response('ok')}};
const ACTOR = 'fixture-architect', origin = 'https://aiw.test';
const api = async (route, body, method = body ? 'POST' : 'GET') => { const r = await worker.fetch(new Request(origin + route, {method, headers: {'oai-authenticated-user-id': ACTOR, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); const text = await r.text(); if (!r.ok) throw Error(route + ' → ' + r.status + ' ' + text.slice(0, 300)); return JSON.parse(text); };
try {
  const judged = p => readingJudgements(M, M.review.withFinalReview(structuredClone(p)));
  const build = async (name, freeze) => {
    const created = await api('/api/projects', {name, template: 'bank-payment', brief: 'A payment journey used to keep the readings of the records before round 12.'});
    const id = created.document.id;
    let revision = created.revision, doc = created.document;
    const read = async () => { const r = await api('/api/project?project=' + id); doc = r.document; revision = r.revision; return doc; };
    const run = async (type, payload) => { const r = await api('/api/commands?project=' + id, {revision, command: {type, payload}}); revision = r.revision; doc = r.document; return r; };
    await read();
    if (typeof doc.logical.responsibilities[0].sourceSnapshot !== 'string' || doc.logical.responsibilities[0].sourceSnapshot.startsWith('fp1:')) throw Error('This tree writes fingerprints already; run the script in an rc.10.73.16 tree.');
    const view = () => M.review.withFinalReview(structuredClone(doc));
    const [d1, d2] = doc.quality.drivers;
    await run('quality.conflict', {driverIds: [d1.id, d2.id], title: 'Integrity checks and response time', effect: 'Synchronous checks add latency to the acknowledgement.', owner: 'Architecture lead', resolution: 'Keep the checks in the path and measure the acknowledgement under peak load.', status: 'resolved'});
    const tr = doc.technologyRealisation.records[1];
    await run('techrealisation.preference', {id: tr.id, optionId: tr.options[0].id});
    const tr2 = doc.technologyRealisation.records.find(r => r.id === tr.id);
    await run('techrealisation.plan', {...tr2, rationale: 'The first option gives the atomic unique-reference guarantee the posting path needs.', mappings: doc.technologyRealisation.mappings.filter(m => m.realizationId === tr.id).map(m => ({capabilityId: m.capabilityId, scope: m.scope}))});
    await run('techrealisation.record', {id: tr.id, reviewed: true});
    await run('workspace.analysis', {kind: 'rollout', title: 'Rehearse the first operating plan', basis: 'Fixture rehearsal; nothing is executed.', inputs: {planId: doc.runtime.plans[0].id}});
    await run('review.intake', {});
    await run('review.narrative', {title: 'Payment journey · solution design', owner: 'Architecture lead', audience: 'Architecture board', summary: 'A payment journey whose records keep their readings as copies.', scope: 'Instruction intake to settlement.', approach: 'Durable hand-off with reconciliation before replay.', confirmed: true});
    await run('review.trace', {requirementId: 'REQ-002', stamp: M.review.reviewSourceStamp(view()), visited: [0, 1, 2, 3, 4], reviewed: true, reviewer: 'Fixture reviewer', notes: 'All five stages followed.'});
    { const v = view(), f = M.review.inheritedFindings(v).find(x => x.level === 'error'); await run('review.disposition', {findingId: f.id, stamp: f.stamp, treatment: 'Accepted design limitation', rationale: 'Accepted for the fixture.', reviewer: 'Fixture reviewer', reference: 'FIX-1', reviewed: true}); }
    const action = await run('review.action', {title: 'Verify the posting reference', owner: 'Delivery lead', due: '2026-12-01', acceptance: 'A repeated instruction returns the recorded outcome.', objectIds: ['REQ-001'], findingId: ''});
    await run('review.delivery', {id: action.selected, status: 'Verified', progress: 'Repeated instruction test passed.', reviewed: true, reviewer: 'Fixture reviewer', reference: 'TEST-1'});
    await run('review.checks', {});
    await run('review.record', {outcome: 'Revision required', reviewer: 'Fixture reviewer', reference: 'REV-1', rationale: 'The fixture keeps a recorded review.', reviewed: true, stamp: M.review.reviewDesignStamp(view())});
    if (freeze) await run('review.baseline', {title: 'Fixture baseline', reviewed: true, stamp: M.review.reviewDesignStamp(view())});
    const before = structuredClone(await read());
    // Then: a requirement edit, one affected record reviewed, a responsibility revised, a driver renamed.
    const req = doc.artefacts.find(a => a.id === 'REQ-001');
    await run('artefact', {...req, acceptance: req.acceptance + ' The recorded outcome carries the original reference.'});
    { const v = view(), e = M.changes.changeEvents(v).at(-1), item = e.items[0]; await run('change.review', {changeId: e.id, itemKey: item.key, outcome: 'unchanged', reviewer: 'Fixture reviewer', rationale: 'The record still meets the edited acceptance.', evidence: 'Reviewed against the edit.', reviewed: true, targetStamp: M.changes.changeItemState(v, e, item).stamp}); }
    const lr = doc.logical.responsibilities.find(r => r.requirementIds.includes('REQ-001')) || doc.logical.responsibilities[0];
    await run('logical.responsibility', {...lr, purpose: lr.purpose + ' It keeps the original reference.'});
    const d1b = doc.quality.drivers.find(d => d.id === d1.id);
    await run('quality.driver', {...d1b, title: d1b.title + ' (renamed)'});
    return {id, before, after: structuredClone(await read())};
  };
  const cut = p => { for (const b of p.finalReview.baselines) { b.markdown = b.markdown.slice(0, 4000) + '\n\n[The rest of the frozen SDD is left out of the fixture.]\n'; b.findings = b.findings.slice(0, 3); delete b.model; } return p; };
  const one = await build('Legacy readings fixture', true), two = await build('Legacy readings fixture · recovery', false);
  const pack = await api('/api/recovery?project=' + two.id + '&action=export');
  if (pack.schema !== 'aiw.recovery.v1') throw Error('The recovery package is ' + pack.schema + '; the fixture keeps a plain one.');
  const restore = async () => { const preview = await api('/api/recovery?action=preview', {package: pack}); const restored = await api('/api/recovery?action=restore', {package: pack, hash: preview.hash, name: 'Legacy readings fixture · restored', reviewed: true}); return (await api('/api/project?project=' + restored.id)).document; };
  const r1 = judged(await restore()), r2 = judged(await restore());
  if (JSON.stringify(r1) !== JSON.stringify(r2)) throw Error('Two restores of the same package judge differently; the fixture would not be deterministic.');
  const fixture = {schema: 'aiw.legacy-readings-fixture.v1', code: 'AIW v0.10.0-rc.10.73.16 (c5e0582): records keep copies of what they read', builtAt: new Date().toISOString(),
    states: [{name: 'A · baseline frozen', document: cut(one.before), expected: judged(one.before)}, {name: 'B · edited after the baseline', document: cut(one.after), expected: judged(one.after)}, {name: 'C · no baseline, as a recovery package', expected: judged(two.after), recovery: pack, expectedRestored: r1}]};
  // Brotli with a 16 MB window: the states share most of their text, which it keeps once.
  const text = Buffer.from(JSON.stringify(fixture)), bytes = brotliCompressSync(text, {params: {[constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24, [constants.BROTLI_PARAM_SIZE_HINT]: text.length}});
  await writeFile(out, bytes);
  console.log(JSON.stringify({out, bytes: bytes.length, documentChars: fixture.states.map(s => JSON.stringify(s.document || s.recovery.project).length), recoveryChars: JSON.stringify(pack).length, events: two.after.changes.events.length}));
} finally { env.DB.close(); await rm(dir, {recursive: true, force: true}); }
