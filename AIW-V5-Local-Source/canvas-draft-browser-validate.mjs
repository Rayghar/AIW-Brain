// Modelling on the canvas (rc41, W3), rendered: "Add … here" places a ghost element at the pointer (in its own lane, in
// the clicked group) and opens the chapter's own editor prefilled; cancelling removes the ghost and records nothing;
// saving records the element through the editor's own command and the picture shows it where the ghost stood (a pin,
// presentation only). A drag from an element's port draws a ghost line, the drop offers the kinds the standard allows
// for the pair with the owning chapter of each, choosing one opens that chapter's editor prefilled with both ends, and
// the saved relationship is drawn; a pair the standard disallows says why; the keyboard path goes through the selection
// toolbar's "Connect to…". Reference resolution: `?object=<ref>` and in-app links resolve as the id does.
// Needs Playwright and Chromium (AIW_BROWSER_EXECUTABLE). AIW_SHOTS=<dir> also writes the pictures of the walk.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync, mkdirSync} from 'node:fs';
import net from 'node:net';
import {referenceProject} from './notation-fixtures.mjs';
import {relationshipOffers, allowedPairs, draftTypesFor, DRAFT_TYPES, NO_DRAFT_REASON, draftSection, kindsMenuHTML, notOfferedLines, noOfferReason, targetCountWords} from './public/canvas-draft.js';
import {notationDiagram, notationScenes} from './public/notation-model.js';
import {architectureModel, relationshipFindings} from './public/architecture-model.js';
import {applyCanonical} from './public/canonical-command.js';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.AIW_SHOTS || ''; if (SHOTS) mkdirSync(SHOTS, {recursive: true});
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/canvas-draft-browser-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [];
const pass = n => { checks.push(n); console.log('PASS', n.slice(0, 160)); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const FAMILIES = ['Realization', 'Serving', 'Assignment', 'Composition', 'Aggregation', 'Flow', 'Triggering', 'Access', 'Association', 'Influence'];

// ---------------------------------------------------------------- 1. the allowed-pairs table, pure
{
  const p = referenceProject();
  const kinds = r => r.offers.map(o => `${o.chapter}:${o.editor}:${o.relation}:${o.archimate.type}`);
  const cc = relationshipOffers(p, 'api-pod', 'risk-engine');
  assert.deepEqual(kinds(cc), ['5:interaction:interaction:Flow', '8:contract:interaction:Flow'], 'component → component: an interaction (Chapter 5) and a contract (Chapter 8), both Flow');
  const rr = relationshipOffers(p, 'api', 'risk');
  // (rc41 close, C11: a structural connection is saved as kind 'trace', which the connected model types as a dependency —
  // Serving, read from the target; was '4:connection:trace:Association', the type of the kind's name, not of the record)
  assert.deepEqual(kinds(rr), ['4:connection:flow:Flow', '4:connection:trace:Serving'], 'responsibility → responsibility: a connection, flow or trace');
  assert.deepEqual(rr.offers.map(o => o.archimate.readsBack), [false, true], 'the standard reads the structural connection from the drop target (risk serves api)');
  // An implementation link between two application components has no typed relationship in the standard's table: it is
  // offered as the Association the exchange writes for it (the connected model types the saved link the same way).
  // (rc41 close fix-up: api → api-pod is the reference project's own implementation link, which the Chapter 4 editor does not
  // record twice, so the pair that offers it is one not yet linked; was relationshipOffers(p, 'api', 'api-pod') and
  // (p, 'api-pod', 'api') offering it)
  const mapping = relationshipOffers(p, 'api', 'risk-engine');
  assert.deepEqual(kinds(mapping), ['4:mapping:realizedBy:Association'], 'responsibility → component: the implementation link');
  assert.equal(mapping.offers[0].archimate.valid, false); assert.equal(mapping.offers[0].archimate.wanted, 'Realization');
  const swapped = relationshipOffers(p, 'risk-engine', 'api');
  assert.deepEqual(kinds(swapped), ['4:mapping:realizedBy:Association']); assert.equal(swapped.offers[0].swap, true, 'component → responsibility: the same link, written from the responsibility');
  for (const [a, b] of [['api', 'api-pod'], ['api-pod', 'api']]) { const linked = relationshipOffers(p, a, b); assert.deepEqual([kinds(linked), linked.refused.map(x => [x.key, x.why])], [[], [['4:mapping:realizedBy', 'This implementation mapping already exists.']]], `${a} → ${b}: already linked, so not offered again, and said`); }
  const cap = relationshipOffers(p, 'api-pod', 'tc-001');
  // (rc41 close, C12: the Chapter 6 domain refuses a dependency from a component to a capability — prerequisite and
  // recovery links connect capabilities — so none is offered; was ['6:dependency:dependency:Serving', '6:need:hasNeed:Association'])
  assert.deepEqual(kinds(cap), ['6:need:hasNeed:Association'], 'component → capability: the component’s technology need');
  assert.throws(() => applyCanonical(p, {type: 'technology.dependency', payload: {from: 'api-pod', to: 'tc-001', type: 'dependency', label: 'requires', policy: 'Fail closed'}}), /Prerequisite and recovery links connect capabilities/, 'the dependency the table no longer offers is one the Chapter 6 domain refuses');
  assert.deepEqual(kinds(relationshipOffers(p, 'oauth', 'api-pod')), ['9:control-protects:protects:Influence'], 'control → component: what it protects');
  assert.deepEqual(kinds(relationshipOffers(p, 'thr-001', 'api-pod')), ['9:threat-targets:threatens:Influence'], 'threat → component: its exposure');
  assert.deepEqual(kinds(relationshipOffers(p, 'oauth', 'thr-001')), ['9:control-mitigates:mitigates:Influence'], 'control → threat: mitigation');
  assert.deepEqual(relationshipOffers(p, 'instruction', 'risk-record').offers.map(o => o.key), ['8:lineage:transforms'], 'data → data: a derivation');
  // (rc41 close, C11: the Chapter 5 editor stores a data dependency as kind 'trace', which the model types as a dependency
  // the standard allows only as an Association between a data object and a component; was '5:interaction:data:Access')
  assert.deepEqual(kinds(relationshipOffers(p, 'api-pod', 'instruction')), ['5:interaction:data:Association', '8:authority:owns:Access'], 'component → data: a data dependency (Chapter 5, an Association as saved) or the authority (Chapter 8, Access)');
  assert.deepEqual(relationshipOffers(p, 'tc-001', 'tr-001').offers.map(o => o.key), ['7:realisation:implementedBy'], 'capability → technology: the realization mapping');
  assert.deepEqual(kinds(relationshipOffers(p, 'run-001', 'oauth')), ['10:plan-controls:enforces:Influence'], 'operating plan → control: enforcement');
  for (const r of [cc, rr, cap, mapping, relationshipOffers(p, 'instruction', 'risk-record'), relationshipOffers(p, 'tc-001', 'tr-001')]) for (const o of r.offers) { assert.ok(FAMILIES.includes(o.archimate.type), o.archimate.type); assert.match(o.archimate.rule, /ArchiMate 3\.1/, 'every offer cites the standard’s rule'); assert.ok(o.word && o.record && o.section, 'and carries its word, record and Work section'); assert.ok(FAMILIES.includes(o.archimate.wanted)); }
  const none = relationshipOffers(p, 'api-pod', 'rest');
  assert.equal(none.offers.length, 0); assert.match(none.reason, /^AIW records no relationship from an application component to an interface contract; ArchiMate 3\.2 allows .*Association between an ApplicationComponent and an ApplicationService/, 'component → contract: nothing to record, and the standard’s allowance said in one line');
  assert.match(relationshipOffers(p, 'api-pod', 'api-pod').reason, /cannot be connected to itself/);
  assert.match(relationshipOffers(p, 'api-pod', 'no-such').reason, /Both ends must be saved records/);
  assert.deepEqual(relationshipOffers(p, 'party:ext-channel', 'api-pod').offers.map(o => o.key), ['5:interaction:interaction', '8:contract:interaction'], 'a party drawn as a caller (party:<id>) resolves to its record');
  // rc41 close (C1): an end drawn on the picture that no chapter records (the reference project's process step
  // "initiate", drawn beside JRN-001 with the same title) is refused with the sentence, whichever way it is drawn; an end
  // the owning editor does not list (JRN-001 for Chapter 4's connection editor, which lists its own model's process
  // steps) is refused too, so no editor is handed an end it would replace with its first option.
  for (const [a, b] of [['JRN-001', 'initiate'], ['initiate', 'JRN-001'], ['REQ-001', 'confirm']]) {
    const r = relationshipOffers(p, a, b);
    assert.deepEqual(r.offers, [], `${a} → ${b}: nothing is offered`);
    // (rc41 close, lead, on merging the canvas and standard packages — old → new: the reason matched "Both ends must be
    // saved records of the design: “…” is drawn on the picture but is not a saved record." → the link editor's own rule
    // speaks first, in the words its save throws, for each of the seven Chapter 1 kinds, and the reason says so exactly)
    assert.deepEqual(r.refused.map(o => [o.key, o.why]), ['requires', 'delivers', 'precedes', 'constrains', 'supports', 'informs', 'participates in'].map(k => ['1:link:' + k, 'Both relationship endpoints must be saved Chapter 1 records.']), `${a} → ${b}: each Chapter 1 kind is refused in the link editor's words`);
    assert.equal(r.reason, 'Not offered: “requires”, “delivers”, “precedes”, “constrains”, “supports”, “informs”, “participates in” (a Chapter 1 requirement relationship), as its editor says: Both relationship endpoints must be saved Chapter 1 records.', r.reason);
  }
  assert.deepEqual(kinds(relationshipOffers(p, 'api', 'initiate')), ['4:connection:serves:Serving', '4:connection:realises:Realization'], 'responsibility → the process step Chapter 4 records against: serves or realises');
  const step = relationshipOffers(p, 'api', 'JRN-001');
  // (old → new, as above: "The Chapter 4 connection editor cannot take JRN-001 “Initiate payment” as an end: it lists only
  // the elements of its own model." → the connection editor's own refusal of both kinds, in its words)
  assert.deepEqual([step.offers, step.refused.map(o => [o.key, o.why])], [[], [['4:connection:serves', 'Connect two different existing objects, including a logical responsibility.'], ['4:connection:realises', 'Connect two different existing objects, including a logical responsibility.']]]);
  assert.equal(step.reason, 'Not offered: “serves”, “realises” (a Chapter 4 logical connection), as its editor says: Connect two different existing objects, including a logical responsibility.');
  // (rc41 close, lead, on merging the canvas and standard packages — old → new: "offers.length is 7" → each of the seven
  // Chapter 1 kinds has its exact fate: two saved journey steps are ends the link editor takes, so nothing is lost as an
  // untaken end; "precedes" is refused in the editor's own words (the reference project already records it), and the four
  // the standard allows none of between two business events are withheld with the type each would read as.)
  const steps = relationshipOffers(p, 'JRN-001', 'JRN-002');
  assert.deepEqual([kinds(steps), steps.refused.map(o => [o.key, o.why]), steps.withheld.map(o => [o.key, o.wanted]), steps.reason],
    [['1:link:supports:Association', '1:link:informs:Association'], [['1:link:precedes', 'This relationship already exists.']], [['1:link:requires', 'Realization'], ['1:link:delivers', 'Realization'], ['1:link:constrains', 'Influence'], ['1:link:participates in', 'Assignment']], ''],
    'two saved journey steps: every Chapter 1 kind is offered, refused by its editor or withheld by the standard — none lost as an untaken end');
  assert.deepEqual([targetCountWords(19, 19, ''), targetCountWords(1, 19, ' risk engine '), targetCountWords(0, 19, 'ledgr'), targetCountWords(0, 0, '')], ['19 elements to choose from', '1 of 19 elements match “risk engine”', 'No element matches “ledgr”', 'No other element to connect to'], 'the target list’s count words');
  const table = allowedPairs();
  assert.ok(table.length >= 20 && table.every(r => r.chapter >= 1 && r.chapter <= 10 && r.from.length && r.to.length && r.kinds.length), 'the table names an owning chapter, ends and kinds for every row');
  assert.deepEqual(draftTypesFor(5), ['component']); assert.deepEqual(draftTypesFor(8), ['contract', 'data', 'party']); assert.deepEqual(draftTypesFor(11), []); assert.match(NO_DRAFT_REASON[11], /evidence is history/);
  assert.ok(Object.keys(DRAFT_TYPES).length === 11 && Object.values(DRAFT_TYPES).flat().every(t => draftSection(t)), 'every element type a chapter adds names its Work section');
  pass('the allowed-pairs table: AIW’s recorded kinds per pair of record types, each typed by the ArchiMate 3.2 table with its rule and owning chapter; disallowed and unrecorded pairs say why in one line');
}

// ---------------------------------------------------------------- 1b. what the menu says is what the saved record reads as (rc41 close)
// C11: every kind offered for a pair is saved through its own chapter's command (the editor's fields as the draft prefills
// them, and what a person types) and the connected model types the new relationship exactly as the menu did — type,
// validity, wanted type and the standard's direction (element types after any reversal; the drop target first when the
// menu says it reads back); the recorded relationships the reference project already holds read, in the menu for their
// two ends, exactly as the model types them. C12: the domain accepts every offered kind's save, and every row of the
// table with an editor command here is reached. C13: no offered kind's save raises RELATION-INVALID, and every kind the
// menu withholds would; the menu names what it withholds.
{
  const list = v => (Array.isArray(v) ? v : []), objectType = (m, id) => (m.objects.get(id) || m.objects.get(String(id).replace(/^party:/, '')))?.type;
  const p = referenceProject(), before = JSON.stringify(p), M = architectureModel(p), objs = [...M.objects.values()];
  const mapped = new Set(list(p.logical?.mappings).map(m => m.logicalId + '>' + m.physicalId));
  const freeMap = objs.filter(o => o.type === 'responsibility').flatMap(r => objs.filter(o => o.type === 'component' && !mapped.has(r.id + '>' + o.id)).map(c => [r.id, c.id]))[0];
  assert.ok(freeMap, 'a responsibility and a component not yet linked');
  const COMMAND = {
    link: (o, a, b) => ({type: 'relationship', payload: {from: a, to: b, kind: o.relation}}),
    connection: (o, a, b) => ({type: 'logical.connection', payload: {from: a, to: b, label: 'Canvas check', kind: o.relation, condition: ''}}),
    mapping: (o, a, b) => ({type: 'logical.mapping', payload: {logicalId: o.swap ? b : a, physicalId: o.swap ? a : b, scope: 'Canvas check scope', owner: 'Lead', status: 'candidate', evidence: 'Canvas check'}}),
    interaction: (o, a, b) => ({type: 'realisation.interaction', payload: {from: a, to: b, label: 'Canvas check', interaction: o.interaction, condition: '', failure: 'Retry once, then hold.'}}),
    dependency: (o, a, b) => ({type: 'technology.dependency', payload: {from: a, to: b, type: o.relation, label: 'Canvas check', policy: 'Canvas check policy', critical: false}}),
    'tr-connection': (o, a, b) => ({type: 'techrealisation.connection', payload: {from: a, to: b, title: 'Canvas check interface', protocol: 'HTTPS', contract: 'Request and response', security: 'Mutual TLS', failure: 'Retry once', data: 'Instruction', owner: 'Lead'}}),
    lineage: (o, a, b) => ({type: 'interfaces.lineage', payload: {from: a, to: b, title: 'Canvas check derivation', transformation: 'Canvas check', owner: 'Lead'}})
  };
  // (rc41 close, lead, on merging the canvas package: api → JRN-001 is now refused before its editor is asked — the Chapter
  // 4 connection editor cannot take a journey step as an end — so it no longer counts two editor refusals; ACT-001 →
  // JRN-001 (the link editor: already recorded) and risk → risk-engine (the mapping editor: already recorded) keep the
  // walk's six editor refusals, each refused in its editor's own words. The floor below is unchanged.)
  const PAIRS = [['OUT-001', 'OUT-002'], ['REQ-001', 'REQ-002'], ['JRN-001', 'JRN-003'], ['ACT-001', 'JRN-002'], ['api', 'risk'], ['api', 'initiate'], freeMap, [freeMap[1], freeMap[0]], ['api-pod', 'risk-engine'], ['api-pod', 'instruction'], ['api-pod', 'tc-001'], ['tc-001', 'postgres'], ['tr-001', 'tr-002'], ['instruction', 'risk-record'], ['JRN-001', 'JRN-002'], ['api', 'JRN-001'], ['ext-channel', 'ext-core'], ['api', 'api-pod'], ['tc-001', 'gateway'], ['ACT-001', 'JRN-001'], ['risk', 'risk-engine']];
  const reached = new Set(), invalidIn = q => new Set(relationshipFindings(q).filter(f => f.code === 'RELATION-INVALID').map(f => f.relationshipId));
  let saved = 0, held = 0, refusedSaid = 0;
  for (const [a, b] of PAIRS) {
    const r = relationshipOffers(p, a, b);
    for (const o of list(r.refused)) {
      const build = COMMAND[o.editor]; if (!build) continue;
      assert.throws(() => applyCanonical(p, build({...o, swap: !!o.swap, interaction: o.interaction}, a, b)), e => e.message === o.why, `${o.key} ${a} → ${b}: a kind the menu says its editor refuses is refused in those words (${o.why})`);
      refusedSaid++;
    }
    for (const o of [...r.offers, ...list(r.withheld).map(w => ({...w, withheld: true}))]) {
      const build = COMMAND[o.editor]; if (!build) continue;
      reached.add(`${o.chapter}:${o.editor}:${objectType(M, a)}>${objectType(M, b)}`);
      let res; try { res = applyCanonical(p, build({...o, swap: !!o.swap, interaction: o.interaction}, a, b)); } catch (e) { assert.fail(`${o.key} ${a} → ${b}: the menu offers what its editor cannot save (${e.message})`); }
      const fresh = architectureModel(res.document).relationships.filter(e => !M.relationships.some(x => x.id === e.id) && e.source === o.model && [a, b].includes(e.from) && [a, b].includes(e.to));
      assert.equal(fresh.length, 1, `${o.key} ${a} → ${b}: one saved relationship in ${o.model}`);
      const e = fresh[0], invalid = invalidIn(res.document).has(e.id);
      if (o.withheld) { assert.ok(invalid && e.archimate.wanted === o.wanted, `${o.key} ${a} → ${b}: a withheld kind is one readiness reports as RELATION-INVALID (wanted ${o.wanted})`); held++; continue; }
      assert.ok(!invalid, `${o.key} ${a} → ${b}: an offered kind raises no RELATION-INVALID`);
      const pick = x => ({type: x.type, valid: x.valid, wanted: x.wanted, source: x.source, target: x.target});
      assert.deepEqual(pick(o.archimate), pick(e.archimate), `${o.key} ${a} → ${b}: the menu says what the saved record reads as`);
      const standardFrom = e.archimate.reversed ? e.to : e.from;
      assert.equal(o.archimate.readsBack, standardFrom === b, `${o.key} ${a} → ${b}: the menu says which way the standard reads it`);
      saved++;
    }
  }
  for (const row of allowedPairs().filter(x => COMMAND[x.editor])) assert.ok([...reached].some(k => k.startsWith(`${row.chapter}:${row.editor}:`) && row.from.includes(k.split(':')[2].split('>')[0]) && row.to.includes(k.split('>')[1])), `the check reaches the table's row ${row.chapter} ${row.editor} ${row.from.join('/')} → ${row.to.join('/')}`);
  // The relationships the project already records, read in the menu for their own two ends. (rc41 close fix-up: a recorded
  // kind the table lists for the pair is offered, refused in its editor's words — an editor that records a kind once says
  // it already exists — or withheld, never missing; was: a recorded relationship with no matching offer was skipped, so an
  // offer dropped from the menu failed nothing. Only a kind the row does not list — a Chapter 5 event interaction, a
  // Chapter 4 flow to a journey step — is not compared, and counted.)
  const sources = new Set(allowedPairs().map(x => x.model)), invalidNow = invalidIn(p);
  const sameRow = (e, o) => ({relationships: () => e.attributes.kind === o.relation, 'logical.connections': () => e.attributes.kind === o.relation, 'realisation.connections': () => e.attributes.interaction === o.interaction, 'technology.dependencies': () => e.attributes.type === o.relation, 'technologyRealisation.connections': () => true})[e.source]?.() ?? e.type === o.relation;
  const listed = (e, row) => ({relationships: () => row.kinds.includes(e.attributes.kind), 'logical.connections': () => row.kinds.includes(e.attributes.kind), 'realisation.connections': () => e.attributes.interaction === row.interaction, 'technology.dependencies': () => row.kinds.includes(e.attributes.type), 'technologyRealisation.connections': () => true})[e.source]?.() ?? row.kinds.includes(e.type);
  let compared = 0, unlisted = 0, recordedRefused = 0;
  for (const e of M.relationships.filter(x => sources.has(x.source))) for (const row of allowedPairs().filter(x => x.model === e.source)) {
    const [a, b] = row.swap ? [e.to, e.from] : [e.from, e.to];
    if (!row.from.includes(objectType(M, a)) || !row.to.includes(objectType(M, b))) continue;
    if (!listed(e, row)) { unlisted++; continue; }
    const r = relationshipOffers(p, a, b), mine = x => x.model === e.source && x.editor === row.editor && sameRow(e, x);
    const o = r.offers.find(mine), f = list(r.refused).find(mine), w = list(r.withheld).find(mine);
    assert.ok(o || f || w, `${e.id} (${e.source}, ${e.type}) ${a} → ${b}: a recorded kind the table lists for the pair is offered, refused or withheld — never missing from the menu`);
    if (w) { assert.ok(invalidNow.has(e.id), `${e.id}: a recorded kind the menu withholds is reported as RELATION-INVALID`); compared++; continue; }
    const x = o || f;
    assert.deepEqual([x.archimate.type, x.archimate.valid, x.archimate.source, x.archimate.target], [e.archimate.type, e.archimate.valid, e.archimate.source, e.archimate.target], `${e.id} (${e.source}, ${e.type}) ${a} → ${b}: the menu reads it as the model does`);
    if (f) recordedRefused++;
    compared++;
  }
  assert.ok(saved >= 25 && held >= 6 && refusedSaid >= 6 && compared >= 40 && recordedRefused >= 10, `saved ${saved}, withheld ${held}, refused ${refusedSaid}, recorded compared ${compared} (${recordedRefused} of them refused as already recorded), ${unlisted} recorded kinds the table does not list`);
  // (rc41 close fix-up, C12) Every class of pair drawn together on a Chapter 1–11 picture (by record type and the collection
  // its record comes from: a journey artefact and the process step drawn with it are both typed journey): every offered
  // kind with a command here saves through its chapter's command, and every kind the menu says its editor refuses is
  // refused by that command in exactly those words. Was: a party → party interaction (Chapter 5 wants a component at one
  // end), a Chapter 1 link to a process step and a Chapter 4 "serves" to a journey artefact were offered and refused on save.
  const classOf = id => { const o = M.objects.get(id) || M.objects.get(String(id).replace(/^party:/, '')); return o ? `${o.type}/${String(o.source).replace(/\[\d+\]$/, '').replace(/^model\.context\..*/, 'model.context')}` : null; };
  const rowFor = (a, b) => allowedPairs().some(row => row.from.includes(objectType(M, a)) && row.to.includes(objectType(M, b)));
  const reps = new Map();
  for (let ch = 1; ch <= 11; ch++) for (const scene of [...notationScenes(ch).map(x => x.id), 'connected']) {
    const D = notationDiagram(p, scene, {chapter: ch}), ids = D.nodes.filter(n => !n.fold && n.type).map(n => n.id);
    for (const a of ids) for (const b of ids) { if (a === b || !rowFor(a, b)) continue; const k = classOf(a) + ' > ' + classOf(b); if (!reps.has(k)) reps.set(k, [a, b, `Chapter ${ch} ${scene}`]); }
  }
  let classSaved = 0; const classRefused = new Set();
  for (const [k, [a, b, where]] of reps) {
    const r = relationshipOffers(p, a, b), [ra, rb] = [a, b].map(id => String(id).replace(/^party:/, ''));
    for (const o of r.offers) { const build = COMMAND[o.editor]; if (!build) continue; try { applyCanonical(p, build(o, ra, rb)); classSaved++; } catch (e) { assert.fail(`${o.key} ${a} → ${b} (${k}, ${where}): the menu offers what its editor refuses (${e.message})`); } }
    for (const o of list(r.refused)) { const build = COMMAND[o.editor]; if (!build) continue; assert.throws(() => applyCanonical(p, build(o, ra, rb)), e => e.message === o.why, `${o.key} ${a} → ${b} (${k}, ${where}): refused in the editor's words`); classRefused.add(`${o.key} ${k}`); }
  }
  for (const want of ['5:interaction:interaction party/interfaces.parties > party/interfaces.parties', '1:link:requires requirement/artefacts > journey/model.context', '4:connection:serves responsibility/logical.responsibilities > journey/artefacts']) assert.ok(classRefused.has(want), `refused, and said: ${want}`);
  assert.ok(reps.size >= 60 && classSaved >= 100, `${reps.size} classes of pair drawn together, ${classSaved} offered kinds saved, ${classRefused.size} refused kinds refused in the editors' words`);
  // What the menu says when nothing is left: the editors' refusals; the standard's (a branch the reference table cannot
  // reach, since Chapter 1's "supports" and "informs" always fall back to an Association, so it is read directly).
  const step = relationshipOffers(p, 'REQ-001', 'initiate');
  assert.deepEqual([step.offers.length, list(step.refused).length, list(step.withheld).length], [0, 7, 0], 'a requirement → the process step drawn with its journey: nothing offered, seven kinds refused');
  assert.equal(step.reason, 'Not offered: “requires”, “delivers”, “precedes”, “constrains”, “supports”, “informs”, “participates in” (a Chapter 1 requirement relationship), as its editor says: Both relationship endpoints must be saved Chapter 1 records.');
  // (rc41 close, lead — old → new: the canvas package's C27 made the refused pair's dialog described by its reason and take
  // the keyboard on its Close; the pin now requires both as well as the line)
  assert.match(kindsMenuHTML(step), /^<div class="nt-draft-menu nt-draft-refused" role="dialog" aria-label="No relationship allowed" aria-describedby="nt-draft-reason">.*<p class="nt-draft-reason" id="nt-draft-reason">Not offered: “requires”.*<button type="button" class="cm-btn" data-nt="draft-cancel" data-nt-focus>Close/, 'the menu is the refusal with that line, described by it, its Close taking the keyboard');
  const W = [{word: 'precedes', wanted: 'Triggering', source: 'Outcome', target: 'Outcome'}, {word: 'participates in', wanted: 'Assignment', source: 'Outcome', target: 'Outcome'}];
  assert.equal(noOfferReason({type: 'outcome'}, {type: 'outcome'}, 'Outcome', 'Outcome', {withheld: W}), 'AIW records nothing from an outcome to an outcome that ArchiMate 3.2 allows between an Outcome and an Outcome: “precedes” would read as Triggering; “participates in” would read as Assignment.', 'every kind withheld: the standard’s line');
  assert.equal(noOfferReason({type: 'outcome'}, {type: 'outcome'}, 'Outcome', 'Outcome', {withheld: W.slice(0, 1), refused: [{chapter: 1, record: 'requirement relationship', word: 'requires', why: 'This relationship already exists.'}]}), 'Not offered: “requires” (a Chapter 1 requirement relationship), as its editor says: This relationship already exists. AIW records nothing from an outcome to an outcome that ArchiMate 3.2 allows between an Outcome and an Outcome: “precedes” would read as Triggering.', 'refused and withheld: both said');
  // (C12/C13 walk) A link already recorded is not offered again: JRN-001 precedes JRN-002 is the reference project's own.
  const recorded = relationshipOffers(p, 'JRN-001', 'JRN-002');
  assert.ok(!recorded.offers.some(o => o.key === '1:link:precedes') && list(recorded.refused).some(x => x.key === '1:link:precedes' && x.why === 'This relationship already exists.'), 'JRN-001 precedes JRN-002 is recorded: not offered again, and said');
  // The menu: the direction the standard reads, and what is withheld, named; every interpolated value escaped.
  const menu = kindsMenuHTML(relationshipOffers(p, 'api', 'risk'));
  assert.match(menu, /<b>relates to<\/b><small>Serving, read LR-002 → LR-001 · logical connection · Chapter 4<\/small>/, 'relates to reads as the Serving the record gets, from the drop target');
  const motivation = relationshipOffers(p, 'OUT-001', 'OUT-002');
  assert.deepEqual(motivation.offers.map(o => o.relation), ['requires', 'delivers', 'constrains', 'supports', 'informs']);
  assert.deepEqual(list(motivation.withheld).map(w => [w.relation, w.wanted]), [['precedes', 'Triggering'], ['participates in', 'Assignment']], 'between two outcomes "precedes" and "participates in" are withheld');
  // (rc41 close fix-up: the note is the menu's description, so a screen reader in the menu hears it; was
  // /<p class="nt-draft-withheld">Not offered, … \(Assignment\)\.<\/p><button type="button" role="menuitem" class="nt-draft-menu-cancel"/)
  assert.match(kindsMenuHTML(motivation), /<p class="nt-draft-withheld" id="nt-draft-not-offered">Not offered, as ArchiMate 3\.2 allows none of them from Outcome to Outcome: “precedes” \(Triggering\), “participates in” \(Assignment\)\.<\/p><button type="button" role="menuitem" class="nt-draft-menu-cancel"/, 'the menu names the withheld kinds, with the type each would read as, above Cancel');
  assert.match(kindsMenuHTML(motivation), /^<div class="nt-draft-menu" role="menu" aria-label="Relationship kinds the standard allows" aria-describedby="nt-draft-not-offered">/, 'the note describes the menu');
  assert.deepEqual(notOfferedLines(motivation), ['Not offered, as ArchiMate 3.2 allows none of them from Outcome to Outcome: “precedes” (Triggering), “participates in” (Assignment).'], 'the lines the live region reads with the count');
  assert.ok(!/aria-describedby/.test(kindsMenuHTML(relationshipOffers(p, 'api-pod', 'risk-engine'))), 'a menu with nothing withheld has no description');
  assert.match(kindsMenuHTML(recorded), /<p class="nt-draft-withheld" id="nt-draft-not-offered">Not offered, as ArchiMate 3\.2 allows none of them from BusinessProcess to BusinessProcess: [^<]*<br>Not offered: “precedes” \(a Chapter 1 requirement relationship\), as its editor says: This relationship already exists\.<\/p>/, 'the menu names a kind already recorded, in the editor’s words');
  assert.ok(!kindsMenuHTML({...motivation, from: {...motivation.from, ref: '<img src=x onerror=alert(1)>'}}).includes('<img'), 'a reference is escaped');
  assert.equal(JSON.stringify(p), before, 'checking writes nothing to the project');
  pass(`what the menu says is what the saved record reads as: ${saved} offered kinds saved through their own chapter commands read exactly as offered with no RELATION-INVALID, ${held} withheld kinds would raise it, ${refusedSaid} refused kinds are refused by their editors in the words the menu says, ${compared} recorded relationships read in the menu as the model types them (none missing); over ${reps.size} classes of pair drawn together on Chapters 1–11, ${classSaved} offered kinds save and ${classRefused.size} refused kinds are refused as said; no component → capability dependency is offered (Chapter 6 refuses it)`);
}

const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await ctx.newPage(); page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message.slice(0, 200)); });
const shot = async name => { if (SHOTS) await page.screenshot({path: `${SHOTS}/${name}.png`}); };
const hiddenDialogShot = async name => { if (!SHOTS) return; await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.style.visibility = 'hidden'; }); await shot(name); await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.style.visibility = ''; }); };
// The first-visit coach of a chapter may arrive after the picture: it is waited for briefly and closed, so it never
// stands over a control the walk clicks.
const open = async (url, selector = '.cm-svg .nt-node') => { await page.goto(base + url, {waitUntil: 'networkidle'}); await page.waitForSelector(selector, {timeout: 20000}); await wait(700); const c = await page.waitForSelector('#ux-coach [data-coach="close"]', {state: 'visible', timeout: 1200}).catch(() => null); if (c) { await c.click(); await wait(200); } };
const doc = () => page.evaluate(() => window.aiwProjectStore.value.document);
// rc41 close (C10): the whole saved document as text, and the store's revision. A cancel, an Escape or a Discard leaves
// both exactly as they were before the Add or the Connect began: the canvas never writes the document.
const snapshot = () => page.evaluate(() => ({text: JSON.stringify(window.aiwProjectStore.value.document), revision: window.aiwProjectStore.value.revision ?? null}));
const unchanged = async (before, what) => { const now = await snapshot(); assert.equal(now.revision, before.revision, `${what}: the store's revision is unchanged`); assert.ok(now.text === before.text, `${what}: the saved document is byte-identical`); };
const active = () => page.evaluate(() => { const a = document.activeElement; return a ? {nt: a.dataset?.nt || null, id: a.dataset?.id || null, node: a.dataset?.ntNode || null, field: a.dataset?.ntField || null, summary: a.matches('.cm-add > summary'), refusedClose: a.matches('.cm-stage > .nt-draft-refused [data-nt="draft-cancel"]')} : null; });
// rc41 close (C28): the ghost's ink against what it is drawn on, in WCAG contrast ratios: the box (its fill and
// fill-opacity over the stage), the kicker band (over the box). `sel` names the element (a ghost, or a real one to compare).
const contrastOf = sel => page.evaluate(sel => {
  const g = document.querySelector(sel); if (!g) return null;
  const rgb = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, gg, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return {r, g: gg, b, a}; };
  const over = (top, alpha, under) => ({r: top.r * alpha + under.r * (1 - alpha), g: top.g * alpha + under.g * (1 - alpha), b: top.b * alpha + under.b * (1 - alpha)});
  const lum = ({r, g: gg, b}) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
  const ratio = (x, y) => { const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };
  const cs = el => getComputedStyle(el), stage = rgb(cs(document.querySelector('.cm-stage')).backgroundColor);
  const boxEl = g.querySelector('rect.nt-box'), bandEl = g.querySelector('rect.nt-kband'), boxFill = rgb(cs(boxEl).fill), bandFill = rgb(cs(bandEl).fill);
  const box = over(boxFill, Number(cs(boxEl).fillOpacity) * boxFill.a, stage), band = over(bandFill, Number(cs(bandEl).fillOpacity) * bandFill.a, box);
  const ink = s => rgb(cs(g.querySelector(s)).fill);
  return {title: ratio(ink('.nt-title'), box), sub: g.querySelector('.nt-sub') ? ratio(ink('.nt-sub'), box) : null, kicker: ratio(ink('.nt-kicker'), band)};
}, sel);
const inTheme = async (theme, fn) => { const was = await page.evaluate(() => document.documentElement.getAttribute('data-theme')); await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme); await wait(150); try { return await fn(); } finally { await page.evaluate(t => { if (t == null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }, was); await wait(100); } };
const fixed = c => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v == null ? v : Number(v.toFixed(2))]));
const emptySpot = () => page.evaluate(() => { const svg = document.querySelector('.cm-svg'), r = svg.getBoundingClientRect(), st = document.querySelector('.cm-stage').getBoundingClientRect(); for (let y = Math.min(r.bottom, st.bottom) - 30; y > Math.max(r.top, st.top) + 30; y -= 20) for (let x = Math.max(r.left, st.left) + 60; x < Math.min(r.right, st.right) - 30; x += 20) { const el = document.elementFromPoint(x, y); if (el && el.closest('.cm-svg') && !el.closest('.nt-node,.nt-port,.nt-hit,.nt-bhit,.nt-edge,.nt-trunk,.nt-draft-note')) return {x, y}; } return null; });
const spotIn = sel => page.evaluate(sel => { const g = document.querySelector(sel); if (!g) return null; const r = g.querySelector('rect').getBoundingClientRect(); for (let y = r.bottom - 20; y > r.top + 40; y -= 12) for (let x = r.left + 20; x < r.right - 20; x += 12) { const el = document.elementFromPoint(x, y); if (el && el.closest('.cm-svg') && !el.closest('.nt-node,.nt-port,.nt-hit,.nt-bhit,.nt-edge,.nt-trunk') && el.closest('.nt-group') === g) return {x, y}; } return null; }, sel);
const centre = sel => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
const live = () => page.$eval('.cm .nt-live', e => e.textContent).catch(() => '');
const transformOf = sel => page.$eval(sel, e => e.getAttribute('transform'));
const dragPort = async (from, to) => { const a = await centre(`.cm-svg .nt-ports .nt-port[data-nt-port="${from}"] circle`), b = await centre(`.cm-svg .nt-node[data-nt-node="${to}"]`); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, {steps: 6}); await page.mouse.move(b.x, b.y, {steps: 6}); await wait(150); };
const submit = async form => { await page.evaluate(f => document.querySelector(f).requestSubmit(), form); await wait(1800); };
const prefs = ch => page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), `aiw-notation-v2-ch${ch}:bank-payment`);
try {
  // ---------------------------------------------------------------- 2. Chapter 5: Add here → ghost → editor → cancel; then save
  await open('/?chapter=5&tab=model&model=diagram'); await shot('ch5-01-diagram');
  await page.click('.cm-add > summary'); await wait(350);
  assert.deepEqual(await page.$$eval('.cm-add [data-nt="add-here"]', b => b.map(x => [x.textContent, x.disabled])), [['Add an application component here', false]], 'the Add menu offers the chapter’s own type');
  await shot('ch5-02-add-menu');
  const snap5 = await snapshot();
  await page.click('.cm-add [data-nt="add-here"][data-id="component"]'); await wait(350);
  assert.ok(await page.$eval('.cm', e => e.classList.contains('nt-placing')), 'placement mode');
  assert.match(await page.$eval('.cm-stage > .nt-draft-note', e => e.textContent), /Click where the new application component should stand · Escape cancels/);
  assert.equal(!!(await page.$('.cm-add[open]')), false, 'the Add menu closed');
  await shot('ch5-03-placing');
  const before5 = (await doc()).realisation.components.map(c => c.id);
  const spot = await emptySpot(); assert.ok(spot, 'an empty spot on the picture');
  await page.mouse.click(spot.x, spot.y); await wait(900);
  assert.ok(await page.$('.cm-svg .nt-draft-ghost[data-nt-ghost="component"]'), 'a ghost element stands at the pointer');
  // Clicked in the context lane, the ghost takes the lane the picture's components stand in, covering none of them.
  const lane5 = await page.evaluate(() => { const g = document.querySelector('.cm-svg .nt-draft-ghost').getBoundingClientRect(), peer = document.querySelector('.cm-svg .nt-node[data-nt-node="api-pod"] rect.nt-box').getBoundingClientRect(), boxes = [...document.querySelectorAll('.cm-svg .nt-node:not(.nt-draft-ghost) rect.nt-box')].map(r => r.getBoundingClientRect()); return {sameRow: Math.abs(g.top - peer.top) < peer.height, covers: boxes.some(b => g.left < b.right && g.right > b.left && g.top < b.bottom && g.bottom > b.top)}; });
  assert.deepEqual(lane5, {sameRow: true, covers: false}, 'the ghost stands in the components’ lane and covers no element');
  assert.equal(await page.$eval('.cm-svg .nt-draft-ghost .nt-kicker', e => e.textContent), 'Physical application component', 'with the standard’s kicker');
  assert.match(await page.$eval('.cm-svg .nt-draft-ghost', e => e.textContent), /New application component/);
  const ghostAt = await transformOf('.cm-svg .nt-draft-ghost');
  assert.equal(await page.$eval('dialog[open] h2', e => e.textContent), 'Create an application component', 'the chapter’s own editor opened');
  assert.equal(await page.$eval('#a-component-form [name="kind"]', e => e.value), 'service', 'prefilled with the type');
  assert.equal(!!(await page.$('.cm.nt-placing')), false, 'placement mode ended with the click');
  await hiddenDialogShot('ch5-04-ghost'); await shot('ch5-05-editor');
  assert.deepEqual((await doc()).realisation.components.map(c => c.id), before5, 'no record exists while the editor is open');
  assert.ok(!JSON.stringify(await prefs(5)).includes('ghost'), 'the ghost is not in the saved preferences (never a pin)');
  // rc41 close (C28): the ghost's words read in both themes (4.5:1 for its 12, 10 and 9.5 px text), on its own box.
  const ghost5 = {light: fixed(await inTheme('light', () => contrastOf('.cm-svg .nt-draft-ghost'))), dark: fixed(await inTheme('dark', () => contrastOf('.cm-svg .nt-draft-ghost')))};
  for (const theme of ['light', 'dark']) for (const part of ['title', 'sub', 'kicker']) assert.ok(ghost5[theme][part] >= 4.5, `Chapter 5 ghost, ${theme} theme: its ${part} reads at ${ghost5[theme][part]}:1, at least 4.5:1 (${JSON.stringify(ghost5)})`);
  await page.keyboard.press('Escape'); await wait(800);
  assert.equal(!!(await page.$('dialog[open]')), false, 'Escape closed the editor');
  assert.equal(!!(await page.$('.cm-svg .nt-draft-ghost')), false, 'cancelling removed the ghost');
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-note')), false, 'and the status line');
  assert.deepEqual((await doc()).realisation.components.map(c => c.id), before5, 'nothing was recorded');
  await unchanged(snap5, 'Chapter 5 element draft cancelled with Escape');
  assert.equal(await live(), 'Draft cancelled; nothing was recorded.');
  await shot('ch5-06-cancelled');
  pass(`Chapter 5: Add → "Add an application component here" → a click places a dashed ghost with the kicker PHYSICAL APPLICATION COMPONENT and opens the component editor prefilled; no record, no pin; its words read at ≥ 4.5:1 in both themes (${JSON.stringify(ghost5)}); Escape cancels, removes the ghost and leaves the saved document byte-identical`);

  // rc41 close (C7): the keyboard places a ghost as the pointer does. Add → the entry → the status line's "Place in view"
  // has the keyboard; Escape returns it to Add; Enter on an element stands the ghost beside it; Enter on "Place in view"
  // stands it in the view; cancelling the editor returns the keyboard to Add and records nothing.
  const keyAdd = async () => { await page.focus('.cm-add > summary'); await page.keyboard.press('Enter'); await wait(350); await page.keyboard.press('Tab'); assert.deepEqual([(await active()).nt, (await active()).id], ['add-here', 'component'], 'Tab reaches "Add an application component here"'); await page.keyboard.press('Enter'); await wait(450); };
  await keyAdd();
  assert.ok(await page.$('.cm.nt-placing'), 'placement mode by the keyboard');
  assert.equal((await active()).nt, 'draft-place', 'the keyboard is on the status line’s "Place in view" (not on the closed menu’s hidden entry)');
  assert.match(await live(), /or press Enter to place it in the view/);
  await page.keyboard.press('Escape'); await wait(350);
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-note')), false); assert.equal(!!(await page.$('.cm.nt-placing')), false);
  assert.equal((await active()).summary, true, 'Escape returns the keyboard to Add');
  const snapK = await snapshot();
  await keyAdd();
  await page.focus('.cm-svg .nt-node[data-nt-node="risk-engine"]'); await page.keyboard.press('Enter'); await wait(900);
  assert.ok(await page.$('.cm-svg .nt-draft-ghost[data-nt-ghost="component"]'), 'Enter on an element in placement mode stands the ghost');
  assert.deepEqual(await page.evaluate(() => { const g = document.querySelector('.cm-svg .nt-draft-ghost').getBoundingClientRect(), peer = document.querySelector('.cm-svg .nt-node[data-nt-node="risk-engine"] rect.nt-box').getBoundingClientRect(), boxes = [...document.querySelectorAll('.cm-svg .nt-node:not(.nt-draft-ghost) rect.nt-box')].map(r => r.getBoundingClientRect()); return {sameRow: Math.abs(g.top - peer.top) < peer.height, covers: boxes.some(b => g.left < b.right && g.right > b.left && g.top < b.bottom && g.bottom > b.top)}; }), {sameRow: true, covers: false}, 'beside that element, in its lane, covering none');
  assert.equal(await page.$eval('dialog[open] h2', e => e.textContent), 'Create an application component', 'and the chapter’s own editor opened');
  await page.keyboard.press('Escape'); await wait(900);
  assert.equal(!!(await page.$('dialog[open]')), false); assert.equal(!!(await page.$('.cm-svg .nt-draft-ghost')), false);
  assert.equal((await active()).summary, true, 'cancelled, the keyboard is back on Add');
  await keyAdd(); await page.keyboard.press('Enter'); await wait(900);
  assert.ok(await page.$('.cm-svg .nt-draft-ghost[data-nt-ghost="component"]'), 'Enter on "Place in view" stands the ghost in the view');
  assert.ok(await page.evaluate(() => { const g = document.querySelector('.cm-svg .nt-draft-ghost rect.nt-box').getBoundingClientRect(), s = document.querySelector('.cm-stage').getBoundingClientRect(); return g.right > s.left && g.left < s.right && g.bottom > s.top && g.top < s.bottom; }), 'where the stage shows it');
  await page.keyboard.press('Escape'); await wait(900);
  assert.equal(!!(await page.$('dialog[open]')), false); assert.equal(!!(await page.$('.cm-svg .nt-draft-ghost')), false);
  await unchanged(snapK, 'Chapter 5 keyboard placements cancelled');
  pass('Chapter 5, keyboard placement: Add → Tab → Enter puts the keyboard on "Place in view"; Escape returns it to Add; Enter on an element stands the ghost beside it in its lane; Enter on "Place in view" stands it in the view; each opens the editor; cancelled, the keyboard is back on Add and the document is byte-identical');

  await page.click('.cm-add > summary'); await wait(300); await page.click('.cm-add [data-nt="add-here"][data-id="component"]'); await wait(300);
  await page.mouse.click(spot.x, spot.y); await wait(900);
  const ghostAt2 = await transformOf('.cm-svg .nt-draft-ghost'); assert.equal(ghostAt2, ghostAt, 'the same spot, the same place');
  await page.fill('#a-component-form [name="title"]', 'Canvas draft component'); await page.fill('#a-component-form [name="purpose"]', 'Recorded from the picture through the Chapter 5 editor.');
  await submit('#a-component-form');
  const after5 = (await doc()).realisation.components, created = after5.find(c => !before5.includes(c.id));
  assert.ok(created && created.title === 'Canvas draft component', 'the editor’s save created the component');
  assert.equal(created.origin ?? 'user', 'user'); assert.ok(!created.provenance?.author || created.provenance.author.kind === 'person', 'with the editor’s own provenance (a person’s record)');
  assert.equal(!!(await page.$('dialog[open]')), false); assert.equal(!!(await page.$('.cm-svg .nt-draft-ghost')), false, 'the ghost is gone');
  await page.waitForSelector(`.cm-svg .nt-node[data-nt-node="${created.id}"]`, {timeout: 8000});
  const at = await transformOf(`.cm-svg .nt-node[data-nt-node="${created.id}"]`);
  assert.equal(at, ghostAt, `the real element stands where the ghost stood (${at}; pins ${JSON.stringify((await prefs(5)).pins)}; ${await page.$eval('.cm-html', e => e.querySelector('.nt-warn')?.textContent || 'no dropped-pin note')}; ${await page.$eval('.cm-state', e => e.textContent).catch(() => '')})`);
  const pins5 = Object.values((await prefs(5)).pins || {}).find(g => g[created.id]);
  assert.ok(pins5 && pins5[created.id].x === Number(ghostAt.match(/\(([\d.]+) ([\d.]+)\)/)[1]), 'a pin at the ghost’s position holds it (presentation only)');
  assert.equal(!!(await page.$('.cm-html .nt-warn')), false, 'the pin was applied');
  assert.match(await live(), /is recorded and stands where the draft stood/);
  await shot('ch5-07-saved');
  pass(`Chapter 5: saving in the editor created ${created.id} through its own command; the picture draws it at the ghost’s place (${at}), pinned there; the ghost and the status line are gone`);

  // The saved element was brought into view (the camera moved to it); the picture is opened afresh for the next flow.
  await wait(700);
  assert.ok(await page.evaluate(id => { const r = document.querySelector(`.cm-svg .nt-node[data-nt-node="${id}"] rect.nt-box`).getBoundingClientRect(), s = document.querySelector('.cm-stage').getBoundingClientRect(); return r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom; }, created.id), 'the saved element is brought into view');

  // ---------------------------------------------------------------- 3. Chapter 5: a relationship by drag, the kinds menu, the editor prefilled
  await open('/?chapter=5&tab=model&model=diagram');
  await page.hover('.cm-svg .nt-node[data-nt-node="api-pod"]'); await wait(300);
  assert.ok(await page.$('.cm-svg .nt-ports .nt-port[data-nt-port="api-pod"]'), 'the port handle shows on the hovered element');
  await shot('ch5-08-port');
  const snapR = await snapshot();
  await dragPort('api-pod', 'risk-engine');
  assert.equal(await page.$eval('.cm-svg .nt-draft-line', e => e.getAttribute('class')), 'nt-draft-line nt-draft-ok', 'a ghost line follows the pointer, green over an allowed target');
  assert.ok(await page.$eval('.cm-svg .nt-node[data-nt-node="risk-engine"]', e => e.classList.contains('nt-drop-target')));
  await shot('ch5-09-ghost-line');
  await page.mouse.up(); await wait(400);
  const items = await page.$$eval('.cm-stage > .nt-draft-menu[role="menu"] [data-nt="draft-kind"]', b => b.map(x => ({key: x.dataset.id, text: x.textContent, title: x.title})));
  assert.deepEqual(items.map(i => i.key), ['5:interaction:interaction', '8:contract:interaction'], 'the kinds the standard allows for component → component');
  assert.match(items[0].text, /^interacts withFlow · component interaction · Chapter 5$/); assert.match(items[0].title, /^Flow \(ArchiMate 3\.1/);
  assert.match(await page.$eval('.nt-draft-menu-head', e => e.textContent), /APP-001 → APP-002/);
  assert.ok(await page.$eval('.cm-stage > .nt-draft-menu [data-nt="draft-kind"]', e => e === document.activeElement), 'the first kind has the keyboard');
  await shot('ch5-10-kinds-menu');
  await page.click('.cm-stage > .nt-draft-menu [data-nt="draft-kind"][data-id="5:interaction:interaction"]'); await wait(700);
  assert.equal(await page.$eval('dialog[open] h2', e => e.textContent), 'Connect application components');
  assert.deepEqual(await page.$eval('#a-interaction-form', f => [f.from.value, f.to.value]), ['api-pod', 'risk-engine'], 'the Chapter 5 editor opened prefilled with both ends');
  assert.ok(await page.$('.cm-svg .nt-draft-line'), 'the ghost line stands while the editor is open');
  await hiddenDialogShot('ch5-11-link-ghost'); await shot('ch5-12-interaction-editor');
  await page.keyboard.press('Escape'); await wait(800);
  assert.equal(!!(await page.$('dialog[open]')), false); assert.equal(!!(await page.$('.cm-svg .nt-draft-line')), false, 'cancelling removes the ghost line');
  await unchanged(snapR, 'Chapter 5 relationship draft cancelled with Escape');
  pass('Chapter 5: a drag from APP-001’s port to APP-002 draws a ghost line, the drop offers "interacts with · Flow" for Chapter 5 and Chapter 8, choosing the interaction opens the Chapter 5 editor prefilled with both ends; Escape cancels, removes the line and leaves the saved document byte-identical');

  // the disallowed pair: a component dropped on a contract
  const contractNode = await page.$eval('.cm-svg', svg => { const ids = [...svg.querySelectorAll('.nt-node[data-nt-node]')].map(n => n.dataset.ntNode); return ['rest', 'posting-api', 'network'].find(id => ids.includes(id)) || null; });
  assert.ok(contractNode, 'a contract is drawn on the application picture');
  await page.hover('.cm-svg .nt-node[data-nt-node="api-pod"]'); await wait(300);
  await dragPort('api-pod', contractNode);
  assert.equal(await page.$eval('.cm-svg .nt-draft-line', e => e.getAttribute('class')), 'nt-draft-line nt-draft-refused', 'the line turns red over a refused target');
  await page.mouse.up(); await wait(400);
  assert.ok(await page.$('.cm-stage > .nt-draft-menu.nt-draft-refused[role="dialog"]'));
  const reason = await page.$eval('.nt-draft-menu .nt-draft-reason', e => e.textContent);
  assert.match(reason, /^AIW records no relationship from an application component to an interface contract; ArchiMate 3\.2 allows/, reason);
  // rc41 close (C27): the refused pair's dialog takes the keyboard on its Close and is described by its reason; closed,
  // the keyboard is back on the element the line was drawn from.
  assert.equal((await active()).refusedClose, true, 'the refused pair’s dialog has the keyboard on its Close');
  assert.equal(await page.$eval('.cm-stage > .nt-draft-refused', e => e.getAttribute('aria-describedby')), 'nt-draft-reason');
  await shot('ch5-13-refused');
  await page.keyboard.press('Escape'); await wait(300);
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-menu')), false, 'Escape closes it');
  assert.equal((await active()).node, 'api-pod', 'and the keyboard returns to the element the line was drawn from');
  pass('Chapter 5: a component dragged onto a contract is refused with the reason in one line (what AIW records, what the standard allows); the dialog takes the keyboard on its Close, and Escape returns it to the element');

  // the keyboard path: select → Connect to… → the target list → the kinds. rc41 close (C25): selected with Enter on the
  // focused element and reached with Tab (the toolbar follows its element in the keyboard's order) — no pointer.
  await page.focus('.cm-svg .nt-node[data-nt-node="api-pod"]'); await page.keyboard.press('Enter'); await wait(600);
  assert.equal(await page.$eval('.cm-stage > .nt-seltools.nt-seltools-one', e => e.getAttribute('aria-label')), 'The selected element');
  assert.match(await page.$eval('.cm-stage > .nt-seltools [data-nt="connect-from"]', e => e.textContent), /Connect to…/);
  assert.equal(await page.$eval('.cm-stage > .nt-seltools [data-nt="connect-from"]', e => e.getAttribute('aria-keyshortcuts')), 'C');
  assert.match(await live(), /^APP-001 selected\. C, or Tab, reaches Connect to… to record a relationship from it\.$/, 'the toolbar is said when it appears');
  assert.equal((await active()).node, 'api-pod');
  await page.keyboard.press('Tab');
  assert.equal((await active()).nt, 'connect-from', 'Tab from the selected element reaches "Connect to…" (not the last stop of the picture)');
  await page.keyboard.press('Shift+Tab'); assert.equal((await active()).node, 'api-pod', 'Shift+Tab goes back to the element');
  await page.keyboard.press('Tab');
  await shot('ch5-14-connect-to');
  await page.keyboard.press('Enter'); await wait(350);
  const targets = await page.$$eval('.nt-draft-targets [data-nt="draft-target"]', b => b.map(x => x.dataset.id));
  assert.ok(targets.length >= 5 && !targets.includes('api-pod') && targets.includes('risk-engine'), 'every other element of the picture is a target');
  assert.ok(await page.$eval('.nt-draft-targets input', e => e === document.activeElement), 'the find field has the keyboard');
  const countText = () => page.$eval('.nt-draft-targets .nt-draft-count', e => e.textContent);
  assert.equal(await countText(), `${targets.length} elements to choose from`);
  await page.keyboard.type('risk'); await wait(200);
  assert.deepEqual(await page.$$eval('.nt-draft-targets [data-nt="draft-target"]:not([hidden])', b => b.map(x => x.dataset.id)), ['risk-engine', 'risk'], 'typing narrows the list (the component and the responsibility named Risk)');
  await page.keyboard.type(' engine'); await wait(200);
  assert.deepEqual(await page.$$eval('.nt-draft-targets [data-nt="draft-target"]:not([hidden])', b => b.map(x => x.dataset.id)), ['risk-engine'], 'and further');
  assert.equal(await countText(), `1 of ${targets.length} elements match “risk engine”`, 'the count says what the words leave');
  await shot('ch5-15-targets');
  await page.keyboard.press('Enter'); await wait(400);
  assert.deepEqual(await page.$$eval('.cm-stage > .nt-draft-menu [data-nt="draft-kind"]', b => b.map(x => x.dataset.id)), ['5:interaction:interaction', '8:contract:interaction'], 'Enter takes the first match and the kinds follow');
  await page.keyboard.press('Escape'); await wait(300);
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-menu')), false);
  assert.equal((await active()).node, 'api-pod');
  pass('Chapter 5, keyboard: Enter selects an element and says its toolbar; Tab reaches "Connect to…" and Shift+Tab returns; the target list counts what the words leave; Enter picks the match and the same kinds menu follows; Escape leaves, back on the element');

  // rc41 close (C0): the filtered result is chosen by the pointer and by the arrow keys; a click into Find keeps the words
  // and the selection. (Leaving the box fired a change that drew the picture again and the list unfiltered.)
  const findTarget = async words => { await page.keyboard.press('c'); await wait(350); assert.equal((await active()).field, 'draft-target-find', 'C on the element opens "Connect to…" with the keyboard in Find'); await page.keyboard.type(words); await wait(200); };
  const shown = () => page.$$eval('.nt-draft-targets [data-nt="draft-target"]:not([hidden])', b => b.map(x => x.dataset.id));
  const kindsHead = () => page.$eval('.cm-stage > .nt-draft-menu[role="menu"] .nt-draft-menu-head', e => e.textContent).catch(() => '');
  await findTarget('risk engine');
  await page.click('.nt-draft-targets [data-nt="draft-target"][data-id="risk-engine"]'); await wait(450);
  assert.match(await kindsHead(), /APP-001 → APP-002/, 'type, then click the filtered result: the kinds for APP-001 → APP-002 follow');
  await page.keyboard.press('Escape'); await wait(300);
  await findTarget('risk engine');
  await page.click('.nt-draft-targets input'); await wait(300);
  assert.deepEqual([await page.$eval('.nt-draft-targets input', e => e.value), await shown()], ['risk engine', ['risk-engine']], 'a click into Find keeps the words and the filtered list');
  assert.match(await page.$eval('#subject-strip', e => e.innerText.replace(/\s+/g, ' ')), /Holding Payment service APP-001/, 'and the selection');
  await page.keyboard.press('ArrowDown'); await wait(300);
  assert.deepEqual([(await active()).nt, (await active()).id], ['draft-target', 'risk-engine'], 'ArrowDown reaches the filtered result');
  assert.deepEqual([await page.$eval('.nt-draft-targets input', e => e.value), await shown()], ['risk engine', ['risk-engine']], 'with the words and the filter kept');
  await page.keyboard.press('Enter'); await wait(450);
  assert.match(await kindsHead(), /APP-001 → APP-002/, 'Enter on it: the kinds follow');
  await page.keyboard.press('Escape'); await wait(300);
  // rc41 close (C26): no match — the count says so, Enter keeps the list and the words and says it, Escape leaves.
  await findTarget('ledgr');
  assert.deepEqual([await shown(), await countText()], [[], 'No element matches “ledgr”'], 'no match is counted');
  await page.keyboard.press('Enter'); await wait(300);
  assert.ok(await page.$('.cm-stage > .nt-draft-targets'), 'Enter with no match keeps the list (it took the list’s Cancel)');
  assert.equal(await page.$eval('.nt-draft-targets input', e => e.value), 'ledgr');
  assert.equal(await live(), 'No element matches “ledgr”.', 'and says there is no match');
  await page.keyboard.press('Escape'); await wait(300);
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-menu')), false);
  // rc41 close (C19): the wheel over the target list scrolls the list, not the picture; a press and a drag on the menu's
  // own surface do not pan the picture either.
  await findTarget('');
  const camera = () => page.$eval('.cm-world', e => getComputedStyle(e).transform);
  const cam0 = await camera(), listBox = await page.$eval('.nt-draft-targets-list', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2, overflow: e.scrollHeight > e.clientHeight}; });
  assert.ok(listBox.overflow, 'the list is longer than its box');
  await page.mouse.move(listBox.x, listBox.y); await page.mouse.wheel(0, 240); await wait(400);
  assert.ok(await page.$eval('.nt-draft-targets-list', e => e.scrollTop) > 0, 'the wheel scrolls the list');
  assert.equal(await camera(), cam0, 'and leaves the picture where it was');
  const head = await page.$eval('.nt-draft-targets .nt-draft-menu-head', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
  await page.mouse.move(head.x, head.y); await page.mouse.down(); await page.mouse.move(head.x + 80, head.y + 60, {steps: 6}); await page.mouse.up(); await wait(300);
  assert.equal(await camera(), cam0, 'a press and a drag on the menu do not pan the picture');
  assert.ok(await page.$('.cm-stage > .nt-draft-targets'), 'and the list stays open');
  await page.keyboard.press('Escape'); await wait(300);
  pass('Chapter 5, the target list: type then click the result, or ArrowDown to it — the kinds follow; a click into Find keeps the words and the selection; no match is counted and Enter keeps the list; the wheel scrolls the list and a drag on it pans nothing');

  // rc41 close (C16): a draft in progress lets go when its picture goes — another view of the chapter, another tab, another
  // project — and never takes the clicks of a chapter's own view.
  await page.click('.cm-add > summary'); await wait(300); await page.click('.cm-add [data-nt="add-here"][data-id="component"]'); await wait(300);
  assert.ok(await page.$('.cm-stage > .nt-draft-note'));
  await page.click('.cm-views .cm-view[data-id="components"]'); await page.waitForSelector('.rz-card[data-card="risk-engine"]', {timeout: 10000}); await wait(600);
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-note')), false, 'on the chapter’s own view the placement has gone');
  assert.equal(!!(await page.$('.cm.nt-placing')), false);
  await page.$eval('.rz-card[data-card="risk-engine"]', e => e.scrollIntoView({block: 'center'})); await wait(300);
  await page.click('.rz-card[data-card="risk-engine"] .rz-t'); await wait(500);
  assert.match(await page.$eval('#subject-strip', e => e.innerText.replace(/\s+/g, ' ')), /Holding Risk engine APP-002/, 'and a click on a card selects it');
  await open('/?chapter=5&tab=model&model=diagram');
  await page.focus('.cm-svg .nt-node[data-nt-node="api-pod"]'); await page.keyboard.press('c'); await wait(350);
  assert.ok(await page.$('.cm-stage > .nt-draft-targets'));
  await page.click('#tab-work'); await wait(900); await page.click('#tab-model'); await page.waitForSelector('.cm-svg .nt-node', {timeout: 15000}); await wait(700);
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-menu')), false, 'a click outside the model (another tab) ends the target list; it is not drawn again on return');
  await page.focus('.cm-svg .nt-node[data-nt-node="api-pod"]'); await page.keyboard.press('c'); await wait(350);
  assert.ok(await page.$('.cm-stage > .nt-draft-targets'));
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('aiw:project-switched')));
  await page.evaluate(() => window.aiwRoute('/?chapter=5&tab=model&model=diagram')); await page.waitForSelector('.cm-svg .nt-node', {timeout: 15000}); await wait(900);
  assert.equal(!!(await page.$('.cm-stage > .nt-draft-menu')), false, 'a project switch ends it; it is not drawn over the next project’s picture');
  pass('Chapter 5: a placement ends when the chapter’s own view opens (whose cards then take their clicks); a target list ends on a click outside the model and on a project switch, and is not drawn again');

  // ---------------------------------------------------------------- 4. Chapter 4: a responsibility in a group; a connection drawn
  await open('/?chapter=4&tab=model&model=diagram'); await shot('ch4-01-diagram');
  await page.click('.cm-add > summary'); await wait(300);
  assert.deepEqual(await page.$$eval('.cm-add [data-nt="add-here"]', b => b.map(x => x.textContent)), ['Add a responsibility here']);
  await page.click('.cm-add [data-nt="add-here"][data-id="responsibility"]'); await wait(300);
  const groupId = await page.$eval('.cm-svg .nt-group[data-nt-group]', g => g.dataset.ntGroup);
  const inGroup = await spotIn(`.cm-svg .nt-group[data-nt-group="${groupId}"]`); assert.ok(inGroup, 'a spot inside a module group');
  const before4 = (await doc()).logical.responsibilities.map(r => r.id);
  await page.mouse.click(inGroup.x, inGroup.y); await wait(900);
  assert.equal(await page.$eval('.cm-svg .nt-draft-ghost .nt-kicker', e => e.textContent), 'Logical application component');
  assert.equal(await page.$eval('dialog[open] h2', e => e.textContent), 'Create a logical responsibility');
  assert.equal(await page.$eval('#l-responsibility-form [name="groupId"]', e => e.value), groupId, 'the editor is prefilled with the clicked group');
  // The group's one row is full: the ghost stands in the group's columns, below its members, covering none of them; the
  // group grows to hold the saved element (asserted after the save).
  const inside4 = await page.evaluate(id => { const g = document.querySelector('.cm-svg .nt-draft-ghost').getBoundingClientRect(), r = document.querySelector(`.cm-svg .nt-group[data-nt-group="${id}"] rect`).getBoundingClientRect(), boxes = [...document.querySelectorAll('.cm-svg .nt-node:not(.nt-draft-ghost) rect.nt-box')].map(x => x.getBoundingClientRect()); return {columns: g.left >= r.left && g.right <= r.right, below: g.top >= r.top, covers: boxes.some(b => g.left < b.right && g.right > b.left && g.top < b.bottom && g.bottom > b.top)}; }, groupId);
  assert.deepEqual(inside4, {columns: true, below: true, covers: false}, 'the ghost stands in the clicked group’s columns and covers no element');
  await hiddenDialogShot('ch4-02-ghost-in-group'); await shot('ch4-03-editor');
  const ghost4 = await transformOf('.cm-svg .nt-draft-ghost');
  await page.fill('#l-responsibility-form [name="title"]', 'Canvas draft responsibility');
  await submit('#l-responsibility-form');
  const created4 = (await doc()).logical.responsibilities.find(r => !before4.includes(r.id));
  assert.ok(created4 && created4.groupId === groupId, 'saved in the group the ghost was placed in');
  await page.waitForSelector(`.cm-svg .nt-node[data-nt-node="${created4.id}"]`, {timeout: 8000});
  assert.equal(await transformOf(`.cm-svg .nt-node[data-nt-node="${created4.id}"]`), ghost4, 'drawn where the ghost stood');
  assert.ok(await page.evaluate(([id, gid]) => { const n = document.querySelector(`.cm-svg .nt-node[data-nt-node="${id}"] rect.nt-box`).getBoundingClientRect(), r = document.querySelector(`.cm-svg .nt-group[data-nt-group="${gid}"] rect`).getBoundingClientRect(); return n.left >= r.left && n.right <= r.right && n.top >= r.top && n.bottom <= r.bottom; }, [created4.id, groupId]), 'inside its group, which grew to hold it');
  assert.equal(!!(await page.$('.cm-svg .nt-draft-ghost')), false);
  await shot('ch4-04-saved');
  pass(`Chapter 4: a responsibility placed inside ${groupId} opens the editor with that group prefilled; saved, ${created4.id} belongs to the group and stands where the ghost stood`);

  await page.hover('.cm-svg .nt-node[data-nt-node="api"]'); await wait(300);
  await dragPort('api', 'risk'); await shot('ch4-05-ghost-line'); await page.mouse.up(); await wait(400);
  assert.deepEqual(await page.$$eval('.cm-stage > .nt-draft-menu [data-nt="draft-kind"]', b => b.map(x => x.dataset.id + '|' + x.textContent)), ['4:connection:flow|flows toFlow · logical connection · Chapter 4', '4:connection:trace|relates toServing, read LR-002 → LR-001 · logical connection · Chapter 4'], 'the menu says what the saved connection reads as (rc41 close, C11; was "relates toAssociation")');
  await shot('ch4-06-kinds-menu');
  const edgesBefore = (await doc()).logical.connections.map(c => c.id);
  await page.click('.cm-stage > .nt-draft-menu [data-nt="draft-kind"][data-id="4:connection:flow"]'); await wait(700);
  assert.deepEqual(await page.$eval('#l-connection-form', f => [f.from.value, f.to.value, f.kind.value]), ['api', 'risk', 'flow'], 'the Chapter 4 editor opened prefilled with both ends and the kind');
  await shot('ch4-07-connection-editor');
  await page.fill('#l-connection-form [name="label"]', 'hands the canvas draft on');
  await submit('#l-connection-form');
  const conn = (await doc()).logical.connections.find(c => !edgesBefore.includes(c.id));
  assert.ok(conn && conn.from === 'api' && conn.to === 'risk' && conn.kind === 'flow', 'the connection was recorded by the editor');
  assert.equal(!!(await page.$('.cm-svg .nt-draft-line')), false, 'the ghost line is gone');
  await page.click('[data-nt="connections"][data-id="all"]'); await wait(600);
  await page.waitForSelector(`.cm-svg [data-nt-edge="${conn.id}"]`, {timeout: 8000});
  await shot('ch4-08-relationship-drawn');
  pass(`Chapter 4: a drag from LR-001 to LR-002 offers flow and trace; "flows to" opens the connection editor prefilled (api → risk, flow); saved, ${conn.id} is drawn on the picture`);

  // ---------------------------------------------------------------- 5. the Layers view: the same controls on the connected model
  await page.click('.cm-views .cm-view[data-id="layers"]'); await page.waitForSelector('.cm-svg .nt-band', {timeout: 10000}); await wait(600);
  await page.click('.cm-add > summary'); await wait(300);
  assert.deepEqual(await page.$$eval('.cm-add [data-nt="add-here"]', b => b.map(x => [x.textContent, x.disabled])), [['Add a responsibility here', false]], 'Layers offers the same entry');
  assert.equal(!!(await page.$('.cm-add .nt-add-here-wait')), false, 'with no waiting reason on a picture');
  await page.keyboard.press('Escape'); await page.click('.cm-views .cm-view[data-id="table"]'); await wait(600);
  await page.click('.cm-add > summary'); await wait(300);
  assert.equal(await page.$eval('.cm-add [data-nt="add-here"]', b => b.disabled), true, 'on a sheet the entry waits for a picture');
  assert.match(await page.$eval('.cm-add [data-nt="add-here"]', b => b.title), /Open the Diagram or Layers view/);
  // rc41 close (C31): the reason is visible text beside the waiting entries (a title is read only on a mouse hover), and
  // each entry names it as its description.
  const waitNote = await page.$eval('.cm-add .nt-add-here-wait', e => ({text: e.textContent, id: e.id, shown: e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility === 'visible'}));
  assert.deepEqual(waitNote, {text: 'Open the Diagram or Layers view to place it on the picture.', id: 'nt-add-here-wait-4', shown: true}, 'the reason stands as visible text in the Add menu');
  assert.ok(await page.$$eval('.cm-add [data-nt="add-here"]', (b, id) => b.length && b.every(x => x.getAttribute('aria-describedby') === id), waitNote.id), 'and is each waiting entry’s description');
  await page.keyboard.press('Escape');
  pass('the Layers view offers "Add … here" as the Diagram does; on the Table it is disabled and says to open a picture, as visible text the entry is described by');

  // ---------------------------------------------------------------- 5b. every other chapter: an element draft and a relationship draft
  // open the owning chapter's own editor, prefilled; cancelling (the editor's own discard when it asks) leaves no ghost.
  const cancelEditor = async () => { for (let i = 0; i < 4 && await page.$('dialog[open]'); i++) { const discard = await page.evaluateHandle(() => [...document.querySelectorAll('dialog[open] button')].find(b => /^Discard/.test(b.textContent.trim()) && b.offsetParent)); if (discard.asElement()) { await discard.asElement().click(); await wait(500); continue; } await page.keyboard.press('Escape'); await wait(500); } };
  const expected = {
    1: {types: ['requirement', 'journey', 'actor', 'outcome'], menu: 'Add', element: /^Add a business outcome$/, form: '#r-artefact-form', rel: '1:link:precedes', relForm: '#r-link-form', pair: ['JRN-001', 'JRN-003'], withheld: '1:link:requires', refused: ['JRN-001', 'JRN-002', '1:link:precedes', 'This relationship already exists.'], fields: {from: 'JRN-001', kind: 'precedes', to: 'JRN-003'}, save: (a, b) => ({type: 'relationship', payload: {from: a, to: b, kind: 'precedes'}})},
    2: {types: ['quality'], menu: 'bar', element: /^Add a driver$/, form: '#q-driver-form'},
    3: {types: ['decision'], menu: 'bar', element: /^Frame a design question$/, form: '#d-question-form'},
    6: {types: ['capability'], menu: 'Add', element: /^New logical technology capability$/, form: '#t-capability-form', rel: '6:dependency:dependency', relForm: '#t-dependency-form', pair: ['tc-001', 'postgres'], fields: {from: 'tc-001', to: 'postgres', type: 'dependency'}, save: (a, b) => ({type: 'technology.dependency', payload: {from: a, to: b, type: 'dependency', label: 'Canvas walk', policy: 'Canvas walk policy', critical: false}})},
    7: {types: ['technology'], menu: 'Add', element: /^New technology realization$/, form: '#tr-plan-form', rel: '7:realisation:implementedBy', relForm: '#tr-plan-form', checks: {capabilityIds: 'tc-001'}},
    8: {types: ['contract', 'data', 'party'], menu: 'Add', element: /^Add participant$/, form: '#i-party-form', rel: '8:contract:interaction', relForm: '#i-editor', fields: {from: 'api-pod', to: 'risk-engine'}, save: (a, b) => ({type: 'interfaces.contract', payload: {title: 'Canvas walk contract', from: a, to: b, exchanges: []}})},
    9: {types: ['threat', 'control'], menu: 'Add', element: /^New control design$/, form: '#sec-control-form', rel: '9:control-protects:protects', relForm: '#sec-control-form'},
    10: {types: ['instance'], menu: 'Add', element: /^Place a runtime component$/, form: '#rt-placement-form'}
  };
  const breadth = [];
  for (const [ch, x] of Object.entries(expected).map(([c, v]) => [Number(c), v])) {
    await open(`/?chapter=${ch}&tab=model&model=diagram`);
    assert.equal(!(await page.$('.cm-add')), x.menu === 'bar', `Chapter ${ch}: the entries stand in ${x.menu === 'bar' ? 'the bar’s Add here menu (the header adds with one button)' : 'the Add menu'}`);
    await page.click(x.menu === 'bar' ? '[data-nt="menu"][data-id="add-here"]' : '.cm-add > summary'); await wait(300);
    assert.deepEqual(await page.$$eval('[data-nt="add-here"]', b => b.map(e => e.dataset.id)), x.types, `Chapter ${ch} adds its own types`);
    if (x.menu === 'bar') assert.ok(await page.$eval('[data-nt-menu="add-here"] .nt-pop[role="menu"] [data-nt="add-here"]', b => b.getAttribute('role') === 'menuitem'), 'menu items in the bar’s menu');
    const snapE = await snapshot();
    await page.click(`[data-nt="add-here"][data-id="${x.types.at(-1)}"]`); await wait(300);
    const at = await emptySpot(); await page.mouse.click(at.x, at.y); await wait(900);
    assert.ok(await page.$(`.cm-svg .nt-draft-ghost[data-nt-ghost="${x.types.at(-1)}"]`), `Chapter ${ch}: the ghost stands`);
    assert.match(await page.$eval('dialog[open] h2', e => e.textContent.trim()), x.element, `Chapter ${ch}: its own editor opened`);
    assert.ok(await page.$(`dialog[open] ${x.form}`));
    // rc41 close (C28): the outcome ghost (the business-dark family, white words) reads as the picture's own outcomes do,
    // its title and its "not saved yet" at 4.5:1 or more in both themes.
    if (ch === 1) {
      // (the picture's own outcome, as the renderer styles one: the ghost's markup without the ghost's class, drawn beside it for the reading)
      const real = '.cm-svg .nt-ghost-twin';
      await page.evaluate(() => { const g = document.querySelector('.cm-svg .nt-draft-ghost'), t = g.cloneNode(true); t.classList.remove('nt-draft-ghost'); t.classList.add('nt-ghost-twin'); t.removeAttribute('data-nt-ghost'); g.after(t); });
      for (const theme of ['light', 'dark']) {
        const [g, r] = await inTheme(theme, async () => [fixed(await contrastOf('.cm-svg .nt-draft-ghost')), fixed(await contrastOf(real))]);
        assert.ok(g.title >= 4.5 && g.sub >= 4.5, `Chapter 1 outcome ghost, ${theme} theme: title ${g.title}:1 and "not saved yet" ${g.sub}:1, at least 4.5:1`);
        assert.ok(Math.abs(g.kicker - r.kicker) < 0.02 && Math.abs(g.title - r.title) < 0.02, `Chapter 1 outcome ghost, ${theme} theme: its kicker and title read as a saved outcome’s (${JSON.stringify(g)} against ${JSON.stringify(r)})`);
      }
      await page.evaluate(() => document.querySelector('.cm-svg .nt-ghost-twin')?.remove());
    }
    await cancelEditor(); assert.equal(!!(await page.$('dialog[open]')), false); assert.equal(!!(await page.$('.cm-svg .nt-draft-ghost')), false, `Chapter ${ch}: cancelled, no ghost`);
    await unchanged(snapE, `Chapter ${ch} element draft cancelled`);
    let rel = '';
    if (x.rel) {
      const pair = await page.evaluate(async key => { const m = await import('/canvas-draft.js'), p = window.aiwProjectStore.value.document, ids = [...document.querySelectorAll('.cm-svg .nt-node[data-nt-node]')].map(n => n.dataset.ntNode).filter(id => !id.startsWith('fold:')); for (const a of ids) for (const b of ids) if (a !== b && m.relationshipOffers(p, a, b).offers.some(o => o.key === key)) return {a, b}; return null; }, x.rel);
      assert.ok(pair, `Chapter ${ch}: a pair on its picture offers ${x.rel}`);
      // (rc41 close: Chapter 1's "requires" is no longer offered between two journey steps, which readiness reports as
      // RELATION-INVALID (C13), and Chapter 6 offers no component → capability dependency (C12); the first pair on each
      // picture is pinned instead of JRN-001 → JRN-002 and api-pod → tc-001. Fix-up: JRN-001 precedes JRN-002 is the
      // reference project's own link, which the Chapter 1 editor does not record twice, so it is not offered and the
      // first pair is JRN-001 → JRN-003; was ['JRN-001', 'JRN-002'], an offer whose save the editor refused)
      if (x.pair) assert.deepEqual([pair.a, pair.b], x.pair, `Chapter ${ch}: the first pair on its picture that offers ${x.rel}`);
      // The walk's offer is one its editor saves: the chapter's own command, applied to a copy of the document (nothing saved).
      if (x.save) assert.equal(await page.evaluate(async cmd => { const m = await import('/canonical-command.js'); try { m.applyCanonical(window.aiwProjectStore.value.document, cmd); return ''; } catch (e) { return e.message; } }, x.save(pair.a, pair.b)), '', `Chapter ${ch}: its editor saves ${x.rel} for ${pair.a} → ${pair.b}`);
      if (x.refused) {
        const [ra, rb, key, why] = x.refused, said = await page.evaluate(async ([a, b]) => { const m = await import('/canvas-draft.js'), r = m.relationshipOffers(window.aiwProjectStore.value.document, a, b); return {offers: r.offers.map(o => o.key), refused: r.refused.map(o => [o.key, o.why])}; }, [ra, rb]);
        assert.ok(!said.offers.includes(key) && said.refused.some(([k, w]) => k === key && w === why), `Chapter ${ch}: ${key} is not offered for ${ra} → ${rb}, and the menu says why (${why})`);
      }
      if (x.withheld) {
        const said = await page.evaluate(async ([a, b, key]) => { const m = await import('/canvas-draft.js'), r = m.relationshipOffers(window.aiwProjectStore.value.document, a, b); return {offered: r.offers.some(o => o.key === key), withheld: r.withheld.some(w => w.key === key), menu: m.kindsMenuHTML(r)}; }, [pair.a, pair.b, x.withheld]);
        assert.ok(!said.offered && said.withheld && said.menu.includes('nt-draft-withheld'), `Chapter ${ch}: ${x.withheld} is withheld for ${pair.a} → ${pair.b} and the menu says so`);
      }
      const snapL = await snapshot();
      await page.click(`.cm-svg .nt-node[data-nt-node="${pair.a}"]`); await wait(500);
      await page.click('.cm-stage > .nt-seltools [data-nt="connect-from"]'); await wait(300);
      await page.click(`.nt-draft-targets [data-nt="draft-target"][data-id="${pair.b}"]`); await wait(300);
      if (x.withheld) {
        // What is not offered is the menu's description and is read with the count (rc41 close fix-up).
        assert.ok(await page.$eval('.cm-stage > .nt-draft-menu', m => { const id = m.getAttribute('aria-describedby'), d = id && document.getElementById(id); return !!d && m.contains(d) && /^Not offered/.test(d.textContent); }), `Chapter ${ch}: the menu is described by what it does not offer`);
        assert.match(await live(), /relationship kinds? allowed between JRN-001 and JRN-003\. Not offered, as ArchiMate 3\.2 allows none of them from BusinessProcess to BusinessProcess: “requires” \(Realization\)/, `Chapter ${ch}: the live region reads what is not offered with the count`);
      }
      await page.click(`.cm-stage > .nt-draft-menu [data-nt="draft-kind"][data-id="${x.rel}"]`); await wait(900);
      assert.ok(await page.$(`dialog[open] ${x.relForm}`), `Chapter ${ch}: ${x.rel} opened ${x.relForm}`);
      for (const [name, value] of Object.entries(x.fields || {})) assert.equal(await page.$eval(`${x.relForm} [name="${name}"]`, e => e.value), value, `Chapter ${ch}: ${name} prefilled`);
      for (const [name, value] of Object.entries(x.checks || {})) assert.ok(await page.$eval(`${x.relForm} [name="${name}"][value="${value}"]`, e => e.checked), `Chapter ${ch}: ${name} ${value} ticked`);
      if (ch === 9) assert.ok(await page.$eval(`${x.relForm} [name="targetIds"][value="${pair.b}"]`, e => e.checked), `Chapter 9: ${pair.b} ticked as a protected object`);
      assert.ok(await page.$('.cm-svg .nt-draft-line'), 'the ghost line stands while the editor is open');
      await cancelEditor(); assert.equal(!!(await page.$('dialog[open]')), false); assert.equal(!!(await page.$('.cm-svg .nt-draft-line')), false, `Chapter ${ch}: cancelled, no ghost line`);
      await unchanged(snapL, `Chapter ${ch} relationship draft cancelled`);
      rel = ` · ${pair.a} → ${pair.b} ${x.rel}`;
    }
    breadth.push(`${ch}: ${x.types.join('/')}${rel}`);
  }
  pass(`every other chapter (1, 2, 3, 6, 7, 8, 9, 10) places its own type and opens its own editor; its relationship kinds open the owning editor prefilled; cancelling leaves no ghost and the saved document byte-identical (${breadth.join('; ')})`);

  // rc41 close (C1): an end the owning editor does not list never reaches it. Handed a pair the table does not offer (a
  // saved journey step and the process step drawn beside it), the hand-over refuses with the sentence and opens nothing.
  // (old → new: the sentence is the link editor's own refusal, as the menu's above)
  const guard = await page.evaluate(async () => { const m = await import('/canvas-draft.js'); let why = null; const ok = m.openDraft({kind: 'relationship', chapter: 1, editor: 'link', relation: 'requires', from: 'JRN-001', to: 'initiate'}, {onFailed: w => { why = w; }}); await new Promise(r => setTimeout(r, 600)); return {ok, why, dialog: !!document.querySelector('dialog[open]'), pending: m.pendingDraft()}; });
  assert.deepEqual(guard, {ok: false, why: 'Not offered: “requires”, “delivers”, “precedes”, “constrains”, “supports”, “informs”, “participates in” (a Chapter 1 requirement relationship), as its editor says: Both relationship endpoints must be saved Chapter 1 records.', dialog: false, pending: null}, 'the hand-over refuses an end the editor does not list');

  // rc41 close (C17): an element draft saved under another type is reported as saved, not as cancelled; it is drawn with
  // its own type, so no pin is written at the ghost's place for it.
  await open('/?chapter=1&tab=model&model=diagram');
  await page.click('.cm-add > summary'); await wait(300); await page.click('.cm-add [data-nt="add-here"][data-id="requirement"]'); await wait(300);
  const at1 = await emptySpot(); await page.mouse.click(at1.x, at1.y); await wait(900);
  assert.ok(await page.$('.cm-svg .nt-draft-ghost[data-nt-ghost="requirement"]'));
  assert.equal(await page.$eval('#r-artefact-form [name="type"]', e => e.value), 'requirement');
  const before1 = (await doc()).artefacts.map(a => a.id);
  await page.selectOption('#r-artefact-form [name="type"]', 'outcome'); await page.fill('#r-artefact-form [name="title"]', 'Canvas draft outcome');
  await submit('#r-artefact-form');
  const made1 = (await doc()).artefacts.find(a => !before1.includes(a.id));
  assert.ok(made1 && made1.type === 'outcome' && made1.title === 'Canvas draft outcome', 'the editor saved an outcome');
  assert.equal(await live(), `${made1.id} is recorded as an outcome; the picture draws it with its own type, not where the requirement draft stood.`, 'and the canvas says it was recorded (it said "Draft cancelled; nothing was recorded.")');
  assert.equal(!!(await page.$('.cm-svg .nt-draft-ghost')), false);
  assert.ok(!JSON.stringify((await prefs(1)).pins || {}).includes(made1.id), 'no pin is written for a record of another type');
  pass(`Chapter 1: a requirement draft saved as an outcome (${made1.id}) is reported as recorded, with its type, and drawn in its own place; a hand-over with an end its editor does not list is refused`);

  // rc41 close (W4): a double-click on a part that is not yet selected opens (dissects) it, though its first click selects
  // it — the subject strip arrives above the studio and, with Details closed, the Details column opens, both moving the
  // part from under the pointer — and however long that first click takes to draw (the views read the browser's click
  // count; a 420 ms clock taken in the handler missed it).
  const crumbs = () => page.$eval('.cm-crumbs', e => e.innerText.replace(/\s+/g, ' '));
  for (const [url, card, want] of [['/?chapter=9&tab=model&model=model', '.tm-card[data-card="api-pod"]', /Payment services › Payment service$/], ['/?chapter=5&tab=model&model=components', '.rz-card[data-card="core-adapter"] .rz-t', /Control & accounting › Core connector$/]]) {
    for (const details of ['closed', 'open']) {
      await open(url, card);
      if ((await page.evaluate(() => document.body.dataset.panel === 'open')) !== (details === 'open')) { await page.click('.workspace-tools [data-panel-toggle]'); await wait(600); }
      const back = async () => { await page.evaluate(() => document.activeElement?.blur?.()); for (let i = 0; i < 4 && /›/.test(await crumbs()); i++) { await page.keyboard.press('Escape'); await wait(300); } };
      await back(); assert.doesNotMatch(await crumbs(), /›/, `${url}: the whole system to start from`);
      const held = () => page.$eval('#subject-strip', e => /Holding/.test(e.innerText));
      if (await held()) { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Escape'); await wait(400); }
      assert.equal(await held(), false, `${url}: nothing is selected yet`);
      await page.dblclick(card); await wait(600);
      assert.match(await crumbs(), want, `${url}, Details ${details}: the double-click on an unselected part opens it`);
      await back();
    }
  }
  pass('a double-click on a part not yet selected opens it on the Chapter 9 threat model and the Chapter 5 components, with Details open or closed (the selection moves the part; the second click is read by the browser’s click count)');

  // ---------------------------------------------------------------- 6. reference resolution in the shell
  await open('/?chapter=5&tab=work&object=APP-001', '.work-body');
  assert.equal(new URL(page.url()).searchParams.get('object'), 'api-pod', '?object=APP-001 resolves to api-pod on Work and the address is rewritten with the id');
  assert.ok(await page.$('#inspector [data-record-card="api-pod"], #inspector .record-card-head'), 'the record is held');
  assert.match(await page.$eval('#inspector', e => e.textContent), /APP-001/);
  await open('/?chapter=4&tab=model&model=diagram&object=lr-002');
  assert.equal(new URL(page.url()).searchParams.get('object'), 'risk', 'a lower-case reference on the Model tab resolves too');
  await page.evaluate(() => window.aiwRoute('/?chapter=8&tab=work&object=IF-002')); await wait(900);
  assert.equal(new URL(page.url()).searchParams.get('object'), 'posting-api', 'an in-app link by reference (as a data-work-record link or Sol’s answer routes) resolves');
  await page.evaluate(() => window.aiwRoute('/?chapter=2&tab=validate&object=QD-003')); await wait(900);
  assert.equal(new URL(page.url()).searchParams.get('object'), 'QD-003', 'a record whose reference is its id keeps it on Validate');
  pass('reference resolution: ?object=APP-001 (Work), lr-002 (Model) and an in-app link to IF-002 resolve to the records and the address carries the id; QD-003 holds as before');

  // ---------------------------------------------------------------- 7. a phone frame
  await ctx.close();
  const phone = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const pg = await phone.newPage(); pg.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR (phone)', e.message.slice(0, 200)); });
  await pg.goto(base + '/?chapter=5&tab=model&model=diagram', {waitUntil: 'networkidle'}); await pg.waitForSelector('.cm-svg .nt-node', {timeout: 20000}); await wait(800);
  const coach = await pg.$('#ux-coach [data-coach="close"]'); if (coach) await coach.click();
  // On a phone the Details sheet opens over the stage with a selection; the pictures close it and bring the stage into view.
  const stageView = async () => { const close = await pg.$('#inspector > .panel-dismiss'); if (close && await close.isVisible()) { await close.click(); await wait(400); } await pg.$eval('.cm-stage', e => e.scrollIntoView({block: 'start'})); await wait(250); };
  await stageView(); if (SHOTS) await pg.screenshot({path: `${SHOTS}/phone-01-diagram.png`});
  await pg.click('.cm-add > summary'); await wait(300); if (SHOTS) await pg.screenshot({path: `${SHOTS}/phone-02-add-menu.png`});
  await pg.click('.cm-add [data-nt="add-here"][data-id="component"]'); await wait(300); await stageView();
  assert.match(await pg.$eval('.cm-stage > .nt-draft-note', e => e.textContent), /Click where the new application component/);
  const noteBox = await pg.$eval('.cm-stage > .nt-draft-note', e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 390; }); assert.ok(noteBox, 'the status line fits the phone');
  if (SHOTS) await pg.screenshot({path: `${SHOTS}/phone-03-placing.png`});
  await pg.keyboard.press('Escape'); await wait(300);
  assert.equal(!!(await pg.$('.cm-stage > .nt-draft-note')), false);
  await pg.click('.cm-svg .nt-node[data-nt-node="api-pod"]'); await wait(500); await stageView();
  await pg.click('.cm-stage > .nt-seltools [data-nt="connect-from"]'); await wait(350);
  const menuBox = await pg.$eval('.cm-stage > .nt-draft-menu', e => { const r = e.getBoundingClientRect(); return {left: r.left, right: r.right}; });
  assert.ok(menuBox.left >= 0 && menuBox.right <= 390, `the target list fits the phone (${JSON.stringify(menuBox)})`);
  if (SHOTS) await pg.screenshot({path: `${SHOTS}/phone-04-targets.png`});
  await pg.click('.nt-draft-targets [data-nt="draft-target"][data-id="risk-engine"]'); await wait(400);
  assert.ok(await pg.$('.cm-stage > .nt-draft-menu[role="menu"]'));
  if (SHOTS) await pg.screenshot({path: `${SHOTS}/phone-05-kinds.png`});
  await phone.close();
  pass('phone (390 × 844): the status line, the target list and the kinds menu fit the frame');

  assert.deepEqual(errors, [], 'no page errors');
  pass('no page errors');
} finally {
  await browser.close();
  server.kill();
  try { rmSync(db, {force: true}); } catch { /* temporary */ }
}
console.log(JSON.stringify({suite: 'canvas draft (rendered)', passed: checks.length, checks}, null, 2));
