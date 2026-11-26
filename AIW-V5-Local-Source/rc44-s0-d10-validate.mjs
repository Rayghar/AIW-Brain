// AIW rc44, build s0-w3-bundle (the lead's S0 work of wave 3; audit/rc44/build-notes/s0-w3-bundle.md): where the
// design packages' first-draw readers load (rulings D10 and Y1 of audit/rc44/RULINGS-2026-11-18.md; build contract
// rules 50 to 52) and the one size check of the owner's decision AA2 of 2026-11-26 (contract part 2 step 7).
//   D10.1 the same findings, readings, stamps, fingerprint and SDD text as at 4349bb6, on the client (the route stubs and
//         what they load, ensureExtensions) and on the server (design-packages.js), for a document holding each package's
//         records and for one holding none; each side in a process of its own, as each is in use;
//   D10.2 a document with any one package's records, and one with all three, opens with at most the route plus 160 KB;
//   D10.3 a document with no package records opens with exactly the route;
//   D10.4 the route grows by at most 1 KB for this part;
//   D10.5 the script files grow by at most 2, to 150 at most; the gate in client-bundle.mjs is the measured count, with
//         ruling Y1 named beside it; no other gate moves (the chapters cap moves by AA2 alone);
//         (D10.4 and D10.5 read this part's size evidence, audit/rc44/evidence/s0-w3-bundle-size.json, always, and hold
//         the live build to it at this build's own commit: AIW_D10_MEASURE=1; D10.2, D10.3 and AA2 hold on every build)
//   AA2   the chapters route cap is the base's raised by 32 KB, named beside it, and the build passes the one size check
//         (rc44-s0-readings.mjs assertRouteWithinCap), which reads every cap from client-bundle.mjs.
// The goldens (rc44-s0-d10-baseline.json: the SHA-256 of each document and of each side's readings, and the base's
// build and gates) were captured from an unchanged checkout of 4349bb6 with `node rc44-s0-d10-validate.mjs --capture
// 4349bb6`, run in that checkout (a git archive of 4349bb6 with this file added, nothing else); they are never
// recaptured. The documents are built again here from the packages' fixtures through the commands (the adoption
// document holds a 4 MB change journal, too much to keep), and each must be the base's, byte for byte, before its
// readings are compared: a document that moved says that a fixture or a command changed, not a reading. Every fixture
// takes a fixed time; the suite reads no clock. Run: npm run test:rc44-s0-d10
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as R from './rc44-s0-readings.mjs';

const KB = 1024, GOLDEN = 'rc44-s0-d10-baseline.json', AT = '2026-11-26T09:00:00.000Z', SCRATCH = '.aiw-local/rc44-s0-d10';
const ROUTES = 'public/design-package-routes.js', NAMES = ['none', 'knowledge', 'adoption', 'selection', 'deployment'];
const argv = process.argv.slice(2), sha = text => createHash('sha256').update(text).digest('hex');

// ---------------------------------------------------------------- the documents (built at capture, on the base tree)
// Each through the commands of the base as a signed-in person would send them (worker.js commandHandler; the knowledge
// library through the entry knowledge-concept-commands.js), from the packages' own fixtures:
//   none        the Bank Payment reference (rc44-s0-readings.mjs reference): no package records;
//   knowledge   the Bank Payment reference relying on a released concept of a knowledge library: one concept pin and
//               one link through it (p10-knowledge: knowledge.conceptPins, knowledge.conceptLinks);
//   adoption    the Bank Payment reference with three guided design tasks applied, read once by the server, whose read
//               upgrade writes their adoptions (p40-adoption: adoptions.records);
//   selection   a component selection started on a Chapter 3 decision (p40-adoption: a package step kept on a built-in
//               record, decision.selection, and no adoption);
//   deployment  the Tidewater project with its topology typed (p30-deployment: runtime.topology and its records).
async function buildDocuments() {
  const {commandHandler} = await import('./worker.js'), {withFinalReview} = await import('./public/review-domain.js');
  const person = id => ({kind: 'person', id, account: 'person', reviewed: true});
  const run = (p, type, payload, actor) => { const h = commandHandler(type); assert.equal(typeof h, 'function', type); const r = h(structuredClone(p), {type, payload}, AT, actor, {author: person(actor)}); return {document: withFinalReview(r.document), selected: r.selected}; };
  const docs = {none: R.reference('bank-payment')};
  { const F = await import('./rc44-wp1-knowledge-fixtures.mjs'), CC = await import('./public/knowledge-concept-commands.js'), K = await import('./public/knowledge-governance.js');
    let p = F.blankProject('rc44-s0-d10-library'); const k = (type, payload, actor) => { const r = CC.applyConceptCommand(p, {type: 'knowledge.' + type, payload}, F.AT, actor, F.person(actor)); p = r.document; return r.selected; };
    const CONCEPT = {conceptId: 'SYN-P001', title: 'Transactional outbox', kind: 'pattern', family: 'Reliable publication', scope: ['data-owner', 'interaction'], stages: [5, 8], lenses: ['integrity', 'reliability'], steward: 'Integration guild', reviewDue: '2027-11-16'};
    k('library', {enabled: true, reason: 'This project authors one tranche of the synthetic handbook.', reviewer: 'Synthetic steward', reviewed: true}, 'steward');
    const sourceId = k('source', F.sourcePayload('SYN-P001 Transactional outbox', F.SYN_P001), 'importer'), record = k('concept', CONCEPT, 'importer'), forms = F.p001Forms(), claimIds = {};
    for (const t of ['definition', 'applicability']) claimIds[t] = k('claim', F.formClaim(sourceId, 'SYN-P001', forms[t]), 'importer');
    k('concept', {...CONCEPT, id: record, forms: Object.entries(claimIds).map(([type, claimId]) => ({type, claimId}))}, 'importer');
    for (const id of Object.values(claimIds)) k('review', {...F.REVIEW, formChecked: true, id}, 'reviewer');
    k('concept-review', {decision: 'verified', reviewer: 'Synthetic second person', reason: 'Checked the identity, each form and its membership.', reviewed: true, identityChecked: true, formsChecked: true, crosswalkChecked: true, id: record}, 'reviewer');
    const releaseId = k('release', {...F.REVIEW, title: 'Synthetic integration concepts 1', conceptIds: ['SYN-P001']}, 'releaser'); k('activate', {...F.REVIEW, id: releaseId, stamp: K.knowledgeStamp(p)}, 'releaser');
    const design = structuredClone(R.reference('bank-payment')), {library: _mark, ...knowledge} = structuredClone(p.knowledge); design.knowledge = knowledge;
    const STEP = {reviewer: 'Synthetic architect', reason: 'This design relies on the released concept.', reviewed: true};
    let q = run(design, 'knowledge.concept-pin', {conceptId: 'SYN-P001', releaseId, ...STEP}, 'architect').document;
    q = run(q, 'knowledge.concept-link', {pinId: q.knowledge.conceptPins[0].id, objectId: 'api-pod', ...STEP}, 'architect').document;
    docs.knowledge = q; }
  { const P = await import('./rc44-wp2-fixtures.mjs'), U = await import('./public/adoption-upgrade.js');
    docs.adoption = withFinalReview(U.upgradeAdoptions(P.bankPaymentApplied()));
    docs.selection = run(P.selectionProject(), 'selection.start', {kind: 'component', responsibilityIds: ['api'], owner: 'Payments architect'}, 'architect-a').document; }
  { const W = await import('./rc44-wp9a-deployment-fixtures.mjs'); let p = W.tidewater();
    W.typeTopology((type, payload) => { const r = run(p, type, payload, W.A); p = r.document; return r.selected; }); docs.deployment = p; }
  return docs;
}
// A selection chosen, and no adoption (ruling U6: a package's step kept on a built-in record): two released profiles
// compared and the inbox chosen, every row named unproven, so that the selection raises its finding on the decision (a
// second person confirms it: selection-confirm, an error). Not among the goldens: on the base the browser did not load
// the package for it (its stub asked for adoptions only), so the client read no such finding (case D10.6).
async function chosenSelection(selection) {
  const {commandHandler} = await import('./worker.js'), {withFinalReview} = await import('./public/review-domain.js'), {selectionReading} = await import('./public/adoption-selection.js');
  const send = (p, type, payload) => withFinalReview(commandHandler(type)(structuredClone(p), {type, payload}, AT, 'architect-a', {author: {kind: 'person', id: 'architect-a', account: 'person', reviewed: true}}).document);
  let p = selection; const d0 = p.decisions.records.find(d => d.selection), id = d0.id, released = key => ({scope: 'knowledge', claimId: p.knowledge.claims.find(x => x.subjectId === 'component-profile:' + key).id, releaseId: p.knowledge.releases.at(-1).id});
  for (const [key, title] of [['inbox', 'Inbox and deduplication component'], ['relay', 'Regional message relay']]) p = send(p, 'selection.candidate', {id, candidate: {kind: 'profile', ref: released(key)}, title});
  const d = p.decisions.records.find(x => x.id === id), inbox = d.alternatives.find(a => a.title === 'Inbox and deduplication component');
  return send(p, 'selection.choose', {id, alternativeId: inbox.id, reason: 'Fits.', unproven: selectionReading(p, d).constraints.map(c => c.id), rejections: Object.fromEntries(d.alternatives.filter(a => a.id !== inbox.id).map(a => [a.id, 'Not this one.']))});
}

// ---------------------------------------------------------------- one side's readings, in a process of its own
// `--side client|server <file> <name>`: the server registers every package when it starts (design-packages.js); the
// browser holds the route stubs (design-package-routes.js) and loads, before a document is first drawn, what they say
// it needs (design-extensions.js ensureExtensions). Answers the document's readings (rc44-s0-readings.mjs digests) and
// the packages then registered.
async function side(which, file, name) {
  const doc = JSON.parse(readFileSync(file, 'utf8'))[name];
  if (which === 'server') await import('./design-packages.js'); else await import('./' + ROUTES);
  const X = await import('./public/design-extensions.js');
  if (which === 'client') await X.ensureExtensions({document: doc, revision: 1});
  return {digests: R.digests(doc), registered: X.EXTENSIONS.map(e => e.id).filter(id => !id.endsWith('-route'))};
}
const readSide = (which, file, name) => { const r = spawnSync(process.execPath, [process.argv[1], '--side', which, file, name], {encoding: 'utf8', maxBuffer: 1 << 26}); if (r.status !== 0) throw Error(which + ' ' + name + ': ' + (r.stderr || r.stdout).slice(0, 600)); return JSON.parse(r.stdout.trim().split('\n').at(-1)); };

// ---------------------------------------------------------------- what a document opens with
// The route stubs of this build whose needs(document) holds, and the lazy entries their load imports (read from the stub
// as written: load:()=>import('./<entry>.js'), the one form S0's suite allows). opensWithDocument answers
// rc44-s0-readings.mjs opensWithRecords over those entries together (each script counted once), and the route alone when
// no stub asks for anything.
async function stubs() { await import('./' + ROUTES); const X = await import('./public/design-extensions.js'); return X.EXTENSIONS.filter(e => e.id.endsWith('-route')); }
const entryOf = stub => { const m = /import\('\.\/([a-z0-9-]+\.js)'\)/.exec(String(stub.load)); assert.ok(m, stub.id + ' loads one lazy entry: ' + stub.load); return 'public/' + m[1]; };
async function entriesFor(doc) { return [...new Set((await stubs()).filter(s => s.needs(doc)).map(entryOf))].sort(); }
async function opensWithDocument(meta, doc, dataNames) { const entries = await entriesFor(doc); return {entries, ...R.opensWithRecords(meta, entries, dataNames)}; }

const measure = report => ({chapters: report.routes.chapters.code, projects: report.routes.projects.code, scripts: report.scripts, under10k: report.buckets.under10k, from10to50k: report.buckets.from10to50k, over50k: report.buckets.over50k, css: report.css});
const gatesOf = B => ({entry: B.entry, chunk: B.chunk, css: B.css, routes: {...B.routes}, data: {...B.data}, scripts: B.scripts, tiny: B.tiny});

if (argv[0] === '--side') { console.log(JSON.stringify(await side(argv[1], argv[2], argv[3]))); process.exit(0); }
if (argv[0] === '--capture') {
  // Run in an unchanged checkout of the base (this file added): the documents, both sides' readings, the base's build.
  mkdirSync(SCRATCH, {recursive: true}); const docs = await buildDocuments(), file = SCRATCH + '/documents.json'; writeFileSync(file, JSON.stringify(docs));
  const readingsOf = which => Object.fromEntries(NAMES.map(n => [n, readSide(which, file, n)]));
  const client = readingsOf('client'), server = readingsOf('server');
  const {bundleClient, BUDGET} = await import('./client-bundle.mjs'), built = await bundleClient(SCRATCH + '/client'), meta = JSON.parse(readFileSync(built.metafile, 'utf8'));
  const opens = {}; for (const n of NAMES) { const entries = await entriesFor(docs[n]); opens[n] = {entries, each: Object.fromEntries(entries.map(e => [e, R.opensWithRecords(meta, e, Object.keys(BUDGET.data))]))}; }
  console.log(JSON.stringify({schema: 'aiw.rc44.s0-d10-baseline.v1', capturedFrom: argv[1] || 'working tree', at: AT, how: 'node rc44-s0-d10-validate.mjs --capture <sha>, in an unchanged checkout of <sha> with this file added', documents: Object.fromEntries(NAMES.map(n => [n, sha(JSON.stringify(docs[n]))])), readings: {client: Object.fromEntries(NAMES.map(n => [n, client[n].digests])), server: Object.fromEntries(NAMES.map(n => [n, server[n].digests]))}, registered: {client: Object.fromEntries(NAMES.map(n => [n, client[n].registered])), server: Object.fromEntries(NAMES.map(n => [n, server[n].registered]))}, build: measure(built.report), gates: gatesOf(BUDGET), opens}, null, 1));
  process.exit(0);
}

// ---------------------------------------------------------------- the cases
const checks = [], failed = [], pass = n => { checks.push(n); console.log('PASS ' + n); };
const ONLY = process.env.AIW_D10_ONLY ? process.env.AIW_D10_ONLY.split(',') : null;
const block = async (name, fn) => { if (ONLY && !ONLY.some(x => name.startsWith(x))) return; try { await fn(); } catch (e) { failed.push(name); console.log('FAIL ' + name + ': ' + (e?.stack || e?.message || e).split('\n').slice(0, process.env.AIW_D10_VERBOSE ? 40 : 4).join(' | ')); } };
const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')), BASE = golden.build;
assert.equal(golden.capturedFrom, '4349bb6', 'the goldens are the base\'s'); assert.deepEqual(Object.keys(golden.documents), NAMES);
const DOCS = await buildDocuments(), FILE = SCRATCH + '/documents.json'; mkdirSync(SCRATCH, {recursive: true});
const CHOSEN = await chosenSelection(DOCS.selection); writeFileSync(FILE, JSON.stringify({...DOCS, chosen: CHOSEN}));

await block('D10.1 readings', async () => {
  for (const n of NAMES) assert.equal(sha(JSON.stringify(DOCS[n])), golden.documents[n], 'the ' + n + ' document is the base\'s, byte for byte (a fixture or a command changed, not a reading)');
  const file = FILE, moved = [];
  for (const n of NAMES) { const server = readSide('server', file, n);
    for (const [which, now] of [['server', server], ['client', readSide('client', file, n)]]) { const was = golden.readings[which][n]; for (const k of Object.keys(was)) if (now.digests[k] !== was[k]) moved.push(which + ' ' + n + ': ' + k);
      // every package the server holds, once a document holds any package's records (the one shared entry), and none otherwise
      if (which === 'client') assert.deepEqual(now.registered, n === 'none' ? [] : server.registered, 'the client registers ' + (n === 'none' ? 'no package for a document without package records' : 'every package the server holds for a document with ' + n + ' records (the one shared entry)') + ': ' + JSON.stringify(now.registered)); } }
  assert.ok(golden.registered.server.none.every(id => readSide('server', file, 'none').registered.includes(id)), 'the server holds at least the base\'s packages');
  assert.deepEqual(moved, [], 'every reading is the base\'s, on the client and on the server');
  pass('D10.1: the graph, model, trails, findings, stamps (the design fingerprint), readiness, provenance, registers, SDD and ARS of ' + NAMES.join(', ') + ' are byte for byte those of 4349bb6, on the client and on the server; the client registers every package once a document holds any package\'s records, and none for one that holds none');
});

await block('D10.6 a package step kept on a built-in record', async () => {
  // (ruling U6, with D10) the client reads what the server reads, but for what only the server prints (a package's
  // sections of the SDD: S0's sections part is read by the server's exports), for every document: one that holds a
  // package's step kept on a built-in record (a chosen selection, with no adoption) loads the package as one with its
  // records does, and the error the selection raises on its decision reads on the client too
  const differ = [];
  for (const n of [...NAMES, 'chosen']) { const c = readSide('client', FILE, n), s = readSide('server', FILE, n); for (const k of Object.keys(s.digests)) if (k !== 'sdd' && c.digests[k] !== s.digests[k]) differ.push(n + ': ' + k); }
  assert.deepEqual(differ, [], 'the client and the server read the same, but for the SDD\'s package sections');
  const {selectionFindings} = await import('./public/adoption-selection.js'); assert.ok(selectionFindings(CHOSEN).some(f => f.code === 'selection-confirm' && f.level === 'error'), 'the chosen selection raises its error on the decision');
  pass('D10.6 (U6): the client reads every document as the server does, but for the SDD\'s package sections: ' + [...NAMES, 'chosen'].join(', ') + ' (a chosen selection with no adoption, whose decision carries the error selection-confirm, loads the package on the client)');
});

let built = null;
const build = async () => built ??= await (async () => { const {bundleClient} = await import('./client-bundle.mjs'), b = await bundleClient(SCRATCH + '/client'); return {report: b.report, meta: JSON.parse(readFileSync(b.metafile, 'utf8'))}; })();
const allThree = () => { const d = structuredClone(DOCS.adoption); d.knowledge = structuredClone(DOCS.knowledge.knowledge); d.runtime = structuredClone(DOCS.deployment.runtime); d.technology = structuredClone(DOCS.deployment.technology); return d; };

await block('D10.2 opens with records', async () => {
  const {BUDGET} = await import('./client-bundle.mjs'), {report, meta} = await build(), route = report.routes.chapters.code, data = Object.keys(BUDGET.data);
  const rows = [];
  for (const [n, d] of [['knowledge', DOCS.knowledge], ['adoption', DOCS.adoption], ['selection', DOCS.selection], ['chosen', CHOSEN], ['deployment', DOCS.deployment], ['all three', allThree()]]) {
    const o = await opensWithDocument(meta, d, data); rows.push(n + ' ' + o.added + ' B in ' + o.files + ' (' + o.entries.join(', ') + ')');
    assert.equal(o.route, route, 'the helper counts the route as the gate does');
    assert.ok(o.entries.length >= 1, n + ': its records load an entry'); assert.ok(o.added <= 160 * KB, n + ' opens with at most the route plus 160 KB (163,840 B): +' + o.added + ' B in ' + o.files + ' scripts (' + o.entries.join(', ') + ')');
  }
  pass('D10.2: a document with one package\'s records, and one with all three, opens with at most the route plus 160 KB: ' + rows.join('; '));
});

await block('D10.3 no package records', async () => {
  const {BUDGET} = await import('./client-bundle.mjs'), {report, meta} = await build(), o = await opensWithDocument(meta, DOCS.none, Object.keys(BUDGET.data));
  assert.deepEqual(o, {entries: [], route: report.routes.chapters.code, added: 0, total: report.routes.chapters.code, files: 0}, 'a document with no package records loads no entry: it opens with exactly the route');
  pass('D10.3: a document with no package records opens with exactly the route (' + o.route + ' B)');
});

// D10.4 and D10.5 are this part's own figures. The size evidence (audit/rc44/evidence/s0-w3-bundle-size.json, written
// from node build.mjs at this build and at the base) is held to them always; the live build is held to the evidence at
// this build's own commit (AIW_D10_MEASURE=1), since later builds move the route, which the one size check holds (AA2).
const EVIDENCE = 'audit/rc44/evidence/s0-w3-bundle-size.json', AT_THIS_BUILD = process.env.AIW_D10_MEASURE === '1';
const evidence = () => { assert.ok(existsSync(EVIDENCE), 'the size evidence of this build is kept (' + EVIDENCE + ')'); const e = JSON.parse(readFileSync(EVIDENCE, 'utf8'));
  assert.equal(e.before?.commit, '4349bb6', 'measured against 4349bb6'); assert.deepEqual([e.before.chapters, e.before.scripts, e.before.buckets?.under10k, e.before.css], [BASE.chapters, BASE.scripts, BASE.under10k, BASE.css], 'the evidence\'s base is the build the goldens were captured with'); assert.equal(e.productionAccepted, false); return e; };

await block('D10.4 the route', async () => {
  const e = evidence(), {report} = await build(), now = report.routes.chapters.code;
  assert.equal(e.deltas.chapters, e.after.chapters - e.before.chapters); assert.ok(e.deltas.chapters <= KB, 'the route grows by at most 1 KB for this part: ' + e.before.chapters + ' -> ' + e.after.chapters + ' (' + e.deltas.chapters + ' B)');
  if (AT_THIS_BUILD) assert.deepEqual([now, report.scripts, report.buckets, report.css], [e.after.chapters, e.after.scripts, e.after.buckets, e.after.css], 'at this build\'s commit the build measures what the evidence says');
  pass('D10.4: the chapters route grew ' + e.deltas.chapters + ' B for this part (' + e.before.chapters + ' B at 4349bb6 -> ' + e.after.chapters + ' B), at most 1 KB; this build: ' + now + ' B' + (AT_THIS_BUILD ? ', as the evidence says' : ''));
});

await block('D10.5 script files and gates', async () => {
  const {BUDGET} = await import('./client-bundle.mjs'), e = evidence(), {report} = await build(), src = readFileSync('client-bundle.mjs', 'utf8');
  assert.ok(e.after.scripts <= e.before.scripts + 2 && e.after.scripts <= 150, 'the script files grow by at most 2, to 150 at most: ' + e.before.scripts + ' -> ' + e.after.scripts);
  assert.equal(e.after.gates.scripts, e.after.scripts, 'the gate is moved to the measured count');
  assert.match(/^\s*scripts: \d+,(.*)$/m.exec(src)?.[1] || '', /ruling Y1/, 'the gate names ruling Y1 beside it');
  assert.ok(BUDGET.scripts <= 150 && report.scripts <= BUDGET.scripts, 'this build: ' + report.scripts + ' script files, the gate ' + BUDGET.scripts + ', at most 150');
  // no other gate moves: the base's gates are the goldens', and this part moved the chapters cap (AA2) and the script gate (Y1) alone
  const was = golden.gates; assert.deepEqual(e.before.gates, {chapters: was.routes.chapters, projects: was.routes.projects, scripts: was.scripts, under10k: was.tiny, css: was.css}, 'the evidence\'s gates before are the base\'s');
  assert.deepEqual({...e.after.gates, chapters: e.before.gates.chapters, scripts: e.before.gates.scripts}, e.before.gates, 'no other gate moves');
  if (AT_THIS_BUILD) { const now = gatesOf(BUDGET); assert.equal(BUDGET.scripts, report.scripts, 'at this build the gate is the measured count'); assert.deepEqual({...now, scripts: was.scripts, routes: {...now.routes, chapters: was.routes.chapters}}, was, 'and no other gate of client-bundle.mjs moved'); }
  pass('D10.5: ' + e.after.scripts + ' script files for this part (' + e.before.scripts + ' at 4349bb6), the gate moved to ' + e.after.gates.scripts + ' with ruling Y1 named; no other gate moved; this build: ' + report.scripts + ' of ' + BUDGET.scripts);
});

await block('AA2 the cap', async () => {
  const {BUDGET} = await import('./client-bundle.mjs'), {report} = await build(), src = readFileSync('client-bundle.mjs', 'utf8');
  assert.equal(BUDGET.routes.chapters, golden.gates.routes.chapters + 32 * KB, 'the chapters route cap is the base\'s raised by 32 KB');
  const at = src.indexOf('const CHAPTERS_ROUTE_BUDGET'); assert.ok(at > 0 && /AA2/.test(src.slice(Math.max(0, src.lastIndexOf('\n//', src.lastIndexOf('\n', at - 2)) - 600), at)) && /2026-11-26/.test(src.slice(at - 900, at)), 'the comment above the cap names the owner\'s decision AA2 of 2026-11-26');
  assert.equal(typeof R.assertRouteWithinCap, 'function', 'rc44-s0-readings.mjs states the one size check (assertRouteWithinCap)');
  const held = await R.assertRouteWithinCap(report, BASE);
  assert.deepEqual([held.cap, held.gate, held.cssCap], [BUDGET.routes.chapters, BUDGET.scripts, BUDGET.css], 'it reads the caps from client-bundle.mjs');
  pass('AA2: the chapters route cap is ' + BUDGET.routes.chapters + ' B (+32 KB, the owner\'s decision AA2 named); the build passes the one size check: route ' + held.route + ' B, ' + held.scripts + ' of ' + held.gate + ' script files, ' + held.under10k + ' files under 10 KB of ' + held.ceiling + ', stylesheet ' + held.css + ' of ' + held.cssCap + ' B');
});

console.log('\n' + checks.length + ' checks passed' + (failed.length ? ', ' + failed.length + ' failed: ' + failed.join(', ') : ''));
if (failed.length) process.exit(1);
