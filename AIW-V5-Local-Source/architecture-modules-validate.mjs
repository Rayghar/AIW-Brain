// Drafting by module (round 24, audit/round24/PLAN.md D-24-03 to D-24-05; findings F2, F3, F4 and F6). The synthetic
// register of the shape of a real one (scripts/synthetic-workbook.mjs: 1,400 requirements in 18 domains and 19 capability
// themes, generated text) is imported through the intake with its module structure proposed, then drafted by Sol through a
// test double that stands in for the provider (nothing here calls one; no key is set). The suite asserts:
//   1. the units: each requirement in exactly one unit (its home), the platform modules first (largest first by what they
//      own and serve), then the business modules by size; a module above the packet's bound drafted in parts of whole
//      sub-modules, each part naming its module and sub-modules; a platform module that only serves sends a bounded sample
//      of what it serves, in turn from each module it serves; no theme group drafted;
//   2. the packets: a module's requirements by sub-module, the platform services catalogue (the platform modules and the
//      components the platform units proposed, with their responsibilities) and every component proposed so far in the
//      state, components first;
//   3. the contract (sol-architecture-4): the decision categories defined, foundational kept for the cross-cutting pass,
//      which has its own instructions (selected by the packet's task); a component's uses and serves checked;
//   4. consolidation: a double that re-proposes one concern in several units (and whose merges keep a later unit's
//      proposal over an earlier one's) yields one component per concern, with the folded sentences, ends and served
//      drivers kept and a note per fold; the merges the checks refuse (another module's component, a chain) or the
//      review does not support are not applied; the same stamp twice, and on a checkpoint replay;
//   5. a rules component Sol's accepted components replace is not in the bundle, with a note; a failed unit brings back
//      its own rules records only;
//   6. Chapter 4 by module: one responsibility group per module realising it, each responsibility in its module's group;
//   7. the decisions: the cross pass's platform-wide ones first, its style decision with the topic 'style'; a unit's
//      "foundational" drafted as structural, with a note;
//   8. the plan counts the module units;
//   9. through the HTTP API (the drafting job, every proposal page reviewed, then applied): one responsibility group per
//      module, every drafted component in its module (module-scope.js), every component naming the drivers it serves
//      with a reason (realisation-domain.js serves).
// Run: npm run test:architecture-modules
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';
import {processDraftingQueue} from './drafting-service.js';
import {draftArchitecture, draftUnits, concernKey, nounPhrase, UNIT_LIMITS} from './public/architecture-drafter.js';
import {ARCHITECTURE_PROMPT_VERSION, ARCHITECTURE_INSTRUCTIONS, ARCHITECTURE_CROSS_INSTRUCTIONS, THEME_LIMITS, STATE_LIMITS, themePacket, validateArchitectureDraft, guardArchitectureDraft, recordedState} from './public/architecture-contract.js';
import {requestArchitectureDraft} from './architecture-request.js';
import {runArchitectureJob, architecturePlan} from './architecture-job.js';
import {moduleTree} from './public/module-model.js';
import {recordModules} from './public/module-scope.js';
import {requirementGroups} from './public/requirement-groups.js';
import {withFinalReview} from './public/review-domain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';

const checks = [], pass = name => checks.push(name);
const root = await mkdtemp(path.join(tmpdir(), 'aiw-architecture-modules-')), db = localDatabase(path.join(root, 'd.sqlite'));
const env = {DB: db, FILES: localFiles(path.join(root, 'files')), ASSETS: {fetch: () => new Response('asset')}, OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'test-double'}, origin = 'https://aiw.test', OWNER = 'architect-modules';
const call = async (route, {body, bytes, project, owner = OWNER} = {}) => {
  const r = await worker.fetch(new Request(origin + route + (project ? (route.includes('?') ? '&' : '?') + 'project=' + project : ''), {method: body || bytes ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {})}, body: bytes || (body ? JSON.stringify(body) : undefined)}), env);
  return {status: r.status, body: await r.json()};
};
async function imported(name) {
  const id = (await call('/api/projects', {body: {name, template: 'blank'}})).body.document.id, {bytes, manifest} = syntheticWorkbook({rows: 1400});
  const up = (await call('/api/intake?action=upload&filename=Synthetic.xlsx', {bytes, project: id})).body, ins = (await call('/api/intake?action=inspect', {body: {uploadId: up.id, sheet: manifest.sheet}, project: id})).body;
  const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: true, modules: true}};
  const pre = (await call('/api/intake?action=preview', {body: input, project: id})).body;
  const applied = await call('/api/intake?action=apply', {body: {...input, revision: pre.projectRevision, previewStamp: pre.stamp, reviewed: true}, project: id});
  assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 300));
  return {id, document: withFinalReview(applied.body.document), revision: applied.body.revision};
}

// ---------------------------------------------------------------- the provider double
// It answers each unit with proposals written from the unit's own packet: a driver, a responsibility and a component of
// its own; a business module also re-proposes the reporting concern (and one the audit concern) that a platform module
// provides, owns data in it, protects it with a control and runs a batch into it, so the consolidation has ends to keep.
// The cross pass decides the style and hosting and answers merges: one that keeps a later unit's component over an
// earlier one's, and others the checks or the review refuse. The check supports what it is shown, except one merge.
const first = s => String(s).split(/\s+/)[0];
const cap1 = s => s[0].toUpperCase() + s.slice(1);
const NS = 'not stated';
let failing = '', seen = [];
const unitAnswer = packet => {
  const m = packet.theme.module, title = m.title, word = first(title), r0 = packet.requirements[0], cite = {requirementRefs: [r0.ref], passages: [], basis: r0.statement};
  const name = nounPhrase(r0.statement) || 'source record', Name = cap1(name), driver = title + ' timeliness', resp = `${word} ${name} processing`;
  const out = [
    {kind: 'driver', driverKind: 'operational', quality: 'none', title: driver, description: `The work of ${title} must be done on time.`, impact: `Sol proposes that ${title} keeps its own processing path.`, priority: 'Medium', priorityReason: 'it carries daily work', lensConcern: 'none', stimulus: NS, conditions: NS, response: NS, metric: NS, targetValue: NS, unit: NS, ...cite, interpretation: 'Sol proposes an operational driver.'},
    {kind: 'responsibility', title: resp, statement: `Sol proposes one responsibility for each ${name}.`, ...cite, interpretation: `Sol proposes one owner for the ${name} work.`}
  ];
  const services = (packet.platform?.services || []).map(s => s.title), workflow = services.filter(t => concernKey(t) === 'workflow');
  const component = (title_, sentences, extra = {}) => ({kind: 'component', title: title_, componentKind: 'application service', responsibilities: sentences, solution: `Sol proposes a service of its own for ${title_.toLowerCase()}.`, properties: [], uses: [], serves: [{driver, reason: `It keeps the work of ${title} on time.`}], realises: [resp], ...cite, interpretation: `Sol proposes ${title_.toLowerCase()}.`, ...extra});
  if (m.role === 'platform') {
    const own = {reporting: 'Reporting and analytics service', workflow: 'Approval workflow service', access: 'Identity and access service', audit: 'Audit trail store', batch: 'Batch scheduler', integration: 'Integration gateway', configuration: 'Platform settings service', notification: 'Notification service'}[concernKey(m.concern || title) || ''] || title + ' shared service';
    out.push(component(own, [`It provides ${own.toLowerCase()} to every module.`, 'It keeps one record of what each module asks of it.', 'It answers each module through one interface.']));
    return {proposals: out, keep: []};
  }
  const ledger = word + ' ledger service', reporting = word + ' reporting service';
  out.push(component(ledger, [`It keeps the ${word.toLowerCase()} entries.`, `It checks each ${name} before it is kept.`, `It answers enquiries on the ${word.toLowerCase()} entries.`], {uses: workflow}));
  out.push(component(reporting, [`It produces the ${word.toLowerCase()} reports.`, `It exports the ${word.toLowerCase()} extracts.`, `It answers the ${word.toLowerCase()} searches.`]));
  if (title === 'Lending') out.push(component('Lending audit log store', ['It keeps the history of every lending change.', 'It records who changed what and when.', 'It answers an auditor’s enquiry.']));
  if (title === 'Teller Services') out.push(component(packet.theme.module.part === '1 of 2' ? 'Teller cash register store' : 'Teller cash drawer store', ['It keeps the cash of each teller.', 'It records each cash movement.', 'It balances the drawer at the end of the day.']));
  out.push({kind: 'data', entity: Name + ' report extract', purpose: `Sol proposes an extract of each ${name}.`, owner: reporting, keyFields: ['extract reference'], classification: 'not classified yet', ...cite, interpretation: 'Sol proposes one extract.'});
  out.push({kind: 'control', title: word + ' report access control', category: 'Identity & access', statement: `Only the people who may see the ${word.toLowerCase()} reports see them.`, component: reporting, makerRole: NS, checkerRole: NS, ...cite, interpretation: 'Sol proposes an access control.'});
  out.push({kind: 'batch', title: word + ' nightly extract run', trigger: NS, schedule: NS, window: NS, cutOff: NS, predecessors: [], restartPoint: NS, volume: NS, component: ledger, target: reporting, ...cite, interpretation: 'Sol proposes a nightly run.'});
  if (title === 'Deposit Accounts' && packet.theme.module.part === '1 of 3') out.push({kind: 'decision', question: `How should the ${word.toLowerCase()} entries be kept?`, category: 'foundational', context: `The ${word.toLowerCase()} entries arrive all day.`, alternatives: [{title: 'Keep each entry at once', approach: 'Each entry is kept as it arrives.', consequences: ['It is simple.'], effects: [{driver, effect: 'supports', reason: 'It keeps the work on time.'}]}, {title: 'Keep entries in batches', approach: 'Entries wait for a run.', consequences: ['It absorbs peaks.'], effects: []}], preferred: 'Keep each entry at once', justification: [{driver, effect: 'supports', reason: 'It keeps the work on time.'}], impact: 'Sol proposes that the ledger service keeps each entry itself.', openQuestions: [], ...cite, interpretation: 'Sol proposes direct keeping.'});
  return {proposals: out, keep: packet.skeleton.filter(s => s.kind === 'component').map(s => s.key)};
};
const crossAnswer = packet => {
  const byTitle = t => packet.upstream.find(u => u.title === t), comps = packet.upstream.filter(u => u.kind === 'component'), drivers = packet.upstream.filter(u => u.kind === 'driver');
  const reporting = byTitle('Reporting and analytics service'), d1 = drivers[0], d2 = drivers[1];
  const decision = (question, title1, title2) => ({kind: 'decision', question, category: 'foundational', context: 'The units proposed a reporting and analytics service among their components.', alternatives: [{title: title1, approach: 'One way.', consequences: ['It is simple.'], effects: [{driver: d1.title, effect: 'supports', reason: 'It keeps the work on time.'}]}, {title: title2, approach: 'Another way.', consequences: ['It is flexible.'], effects: [{driver: d2.title, effect: 'neutral', reason: 'It changes little.'}]}], preferred: title1, justification: [{driver: d1.title, effect: 'supports', reason: 'It keeps the work on time.'}], impact: 'Sol proposes one structure for every module.', openQuestions: [], requirementRefs: [reporting.ref], passages: [], basis: 'The units proposed a reporting and analytics service.', interpretation: 'Sol proposes a platform-wide choice.'});
  const merges = [];
  const keepLater = byTitle('Teller cash drawer store'), foldEarlier = byTitle('Teller cash register store');
  if (keepLater && foldEarlier) merges.push({keep: keepLater.ref, into: [foldEarlier.ref], reason: 'One store of teller cash.'});
  const lending = byTitle('Lending ledger service'), branch = byTitle('Branch ledger service');
  if (lending && branch) merges.push({keep: lending.ref, into: [branch.ref], reason: 'Two ledgers.'});
  if (keepLater && foldEarlier) merges.push({keep: foldEarlier.ref, into: [byTitle('Teller ledger service')?.ref].filter(Boolean), reason: 'A chain.'});
  const dl = byTitle('Lending timeliness'), dd = byTitle('Deposit Accounts timeliness');
  if (dl && dd) merges.push({keep: dl.ref, into: [dd.ref], reason: 'One timeliness concern.'});
  const dt = byTitle('Tax Handling timeliness'), df = byTitle('Foreign Exchange timeliness');
  if (dt && df) merges.push({keep: dt.ref, into: [df.ref], reason: 'Two concerns the review tells apart.'});
  assert.ok(comps.length > 20, 'the cross pass sees every component');
  return {proposals: [decision('How should the platform be hosted and deployed?', 'Host it on shared infrastructure', 'Host each module apart'), decision('Which architectural style should structure the platform?', 'Adopt a modular monolith', 'Adopt services per module')], merges: merges.filter(m => m.into.length), keep: []};
};
const checkAnswer = input => {
  const tax = input.packet?.upstream?.find(u => u.title === 'Tax Handling timeliness')?.ref;
  return {proposals: input.candidate.proposals.map(x => ({id: x.id, supported: true, defects: [], notes: []})), ...(input.candidate.merges ? {merges: input.candidate.merges.map(m => m.keep === tax ? {id: m.id, supported: false, defects: ['The two drivers are two concerns of two modules.'], notes: []} : {id: m.id, supported: true, defects: [], notes: []})} : {})};
};
const envelope = (answer, id) => new Response(JSON.stringify({id, model: 'test-double', status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(answer)}]}], usage: {input_tokens: 40, output_tokens: 20}}));
let calls = 0;
const fetcher = async (_url, init) => {
  calls++;
  const body = JSON.parse(init.body), name = body.text.format.name, input = JSON.parse(body.input[0].content);
  if (name === 'aiw_architecture_draft_check') return envelope(checkAnswer(input), 'check-' + calls);
  assert.equal(name, 'aiw_architecture_draft');
  seen.push({task: input.task, key: input.request?.theme, instructions: body.instructions, packet: input});
  if (input.task !== 'architecture-cross' && input.theme?.module?.title === failing) return new Response(JSON.stringify({id: 'cut-' + calls, model: 'test-double', status: 'incomplete', output: [], usage: {input_tokens: 10, output_tokens: 5}}));
  return envelope(input.task === 'architecture-cross' ? crossAnswer(input) : unitAnswer(input), 'draft-' + calls);
};
const request = packet => requestArchitectureDraft(env, packet, {fetcher});
const previousFetch = globalThis.fetch;

try {
  const base = await imported('Modules · drafting');
  const doc = base.document, tree = moduleTree(doc), reqs = doc.artefacts.filter(a => a.type === 'requirement');
  assert.equal(reqs.length, 1400);
  assert.ok(tree.modules.length >= 18 && tree.unassigned.length === 0 && tree.doubled.length === 0, 'the structure partitions the register');
  const skeleton = draftArchitecture(doc);

  // 1. The units.
  const units = draftUnits(doc), roles = units.map(u => u.role);
  const homes = new Map(); for (const u of units) for (const a of u.members) homes.set(a.id, (homes.get(a.id) || 0) + 1);
  assert.equal(homes.size, 1400, 'every requirement is in a unit'); assert.ok([...homes.values()].every(n => n === 1), 'each in exactly one unit');
  assert.ok(units.every(u => u.kind === 'module'), 'every unit is a module or a part of one');
  const themeIds = new Set(requirementGroups(doc).filter(g => g.kind === 'theme').map(g => g.id));
  assert.ok(units.every(u => !themeIds.has(u.id)), 'no theme group is drafted');
  const lastPlatform = roles.lastIndexOf('platform'), firstBusiness = roles.indexOf('business');
  assert.ok(lastPlatform >= 0 && firstBusiness > lastPlatform, 'the platform modules come first');
  const size = u => u.members.length + (u.servedTotal || 0);
  const platformUnits = units.filter(u => u.role === 'platform'), businessModules = [...new Set(units.filter(u => u.role === 'business').map(u => u.moduleId))];
  for (let i = 1; i < platformUnits.length; i++) assert.ok(size(platformUnits[i - 1]) >= size(platformUnits[i]), 'the platform modules largest first by what they own and serve');
  const owned = id => units.filter(u => u.moduleId === id).reduce((n, u) => n + u.members.length, 0);
  for (let i = 1; i < businessModules.length; i++) assert.ok(owned(businessModules[i - 1]) >= owned(businessModules[i]), 'the business modules by size');
  const deposit = units.filter(u => u.moduleTitle === 'Deposit Accounts');
  assert.ok(deposit.length >= 3 && deposit.every(u => u.members.length <= UNIT_LIMITS.requirements && u.part?.of === deposit.length), 'a module above the bound is drafted in parts within it');
  assert.ok(deposit.every((u, i) => u.title === `Deposit Accounts, part ${i + 1} of ${deposit.length}` && u.subs.length >= 1), 'each part names its module and its sub-modules');
  const depositTree = tree.modules.find(m => m.group.title === 'Deposit Accounts');
  for (const s of depositTree.children) { const holding = deposit.filter(u => u.members.some(a => tree.home.get(a.id)?.subId === s.id)); assert.equal(holding.length, 1, `${s.title} is whole in one part`); }
  const servingOnly = units.filter(u => u.role === 'platform' && !u.members.length);
  assert.ok(servingOnly.length >= 1, 'a platform module that only serves is a unit');
  for (const u of servingOnly) {
    assert.ok(u.served.length > 0 && u.served.length <= UNIT_LIMITS.served && u.served.length === Math.min(UNIT_LIMITS.served, u.servedTotal), `${u.title} sends a bounded sample of what it serves`);
    const by = new Map(); for (const a of u.served) { const m = tree.home.get(a.id).moduleId; by.set(m, (by.get(m) || 0) + 1); }
    const all = new Map(); for (const [rid, ms] of tree.served) if (ms.includes(u.moduleId)) { const m = tree.home.get(rid).moduleId; all.set(m, (all.get(m) || 0) + 1); }
    const counts = [...all].map(([m, n]) => ({n, k: by.get(m) || 0}));
    assert.equal(by.size, Math.min(all.size, u.served.length), `${u.title}: the sample draws on every module it serves`);
    assert.ok(counts.every(a => a.k === a.n || counts.every(b => b.k <= a.k + 1)), `${u.title}: the sample is taken in turn from each module it serves`);
  }
  pass('the units: every requirement in one unit, platform modules first (largest first), business modules by size, a large module in parts of whole sub-modules naming them, a sample for a platform module that only serves, no theme drafted');

  // 3 (contract) and 2 (packets), read from a run of the job through the double.
  assert.equal(ARCHITECTURE_PROMPT_VERSION, 'sol-architecture-4');
  assert.match(ARCHITECTURE_INSTRUCTIONS, /foundational is a choice that shapes the whole platform[^.]*\); it is kept for the cross-cutting pass/);
  assert.match(ARCHITECTURE_INSTRUCTIONS, /structural is how the unit's parts are divided/); assert.match(ARCHITECTURE_INSTRUCTIONS, /in serves, at most 5/); assert.match(ARCHITECTURE_INSTRUCTIONS, /in uses, by their titles in the catalogue/);
  assert.match(ARCHITECTURE_CROSS_INSTRUCTIONS, /merges: \[\{keep, into, reason\}\]/); assert.match(ARCHITECTURE_CROSS_INSTRUCTIONS, /Never fold a business module's component into a component of another business module/);
  failing = 'Period Close';
  let saved = [];
  const run = await runArchitectureJob(doc, skeleton, {request, onTheme: async (_t, _d, _n, themes) => { saved = structuredClone(themes); }});
  const sent = [...seen];
  assert.ok(sent.filter(s => s.task === 'architecture-cross').every(s => s.instructions === ARCHITECTURE_CROSS_INSTRUCTIONS), 'the cross pass reads its own instructions');
  assert.ok(sent.filter(s => s.task !== 'architecture-cross').every(s => s.instructions === ARCHITECTURE_INSTRUCTIONS), 'a unit reads the unit instructions');
  assert.equal(sent.filter(s => s.task === 'architecture-cross').length, 1);
  const packets = sent.filter(s => s.task !== 'architecture-cross').map(s => s.packet);
  const deposit1 = packets.find(x => x.theme.module?.title === 'Deposit Accounts' && x.theme.module.part === '1 of ' + deposit.length);
  const subOrder = deposit1.requirements.filter(r => !r.served).map(r => r.subModule);
  assert.ok(subOrder.every((s, i) => i === 0 || s === subOrder[i - 1] || !subOrder.slice(0, i).includes(s)), 'a module packet carries its requirements by sub-module');
  assert.ok(deposit1.theme.module.subModules.every(s => subOrder.includes(s.title)) && deposit1.theme.module.role === 'business');
  const platformComponents = run.themes.filter(t => t.role === 'platform' && t.status === 'accepted').flatMap(t => t.proposals.filter(x => x.kind === 'component').map(x => x.title));
  assert.ok(platformComponents.length >= 5);
  assert.deepEqual(deposit1.platform.services.map(s => s.title).sort(), [...platformComponents].sort(), 'the catalogue holds every component the platform units proposed');
  assert.ok(deposit1.platform.services.every(s => s.responsibilities.length >= 3) && deposit1.platform.modules.length === tree.modules.filter(m => m.group.role === 'platform').length, 'with their responsibilities, beside the platform modules');
  const lastPacket = packets.at(-1), before = run.themes.slice(0, -1).filter(t => t.status === 'accepted').flatMap(t => t.proposals.filter(x => x.kind === 'component').map(x => x.title));
  const stateComponents = lastPacket.state.filter(r => r.what === 'component').map(r => r.title);
  assert.ok(before.every(t => stateComponents.includes(t)), 'the state holds every component proposed so far');
  assert.equal(lastPacket.state.findIndex(r => r.what !== 'component'), stateComponents.length, 'components come first in the state');
  assert.ok(STATE_LIMITS.component >= 500 && lastPacket.omissions.state === 0);
  const servingPacket = packets.find(x => x.theme.module?.role === 'platform' && x.theme.requirements === 0);
  assert.ok(servingPacket.requirements.length && servingPacket.requirements.every(r => r.served && r.servedFrom), 'a platform module that only serves sends its sample, each marked with its module');
  pass('the packets: requirements by sub-module, the platform services catalogue with the platform units\' components and sentences, every component so far in the state (components first), the served sample; the cross pass on its own instructions');

  // The checks of sol-architecture-4: the drivers a component serves, the services it uses, a unit's foundational decision.
  {
    const p0 = themePacket(doc, skeleton, units.find(u => u.role === 'business'), {state: {...recordedState(doc), components: [{ref: 'Reporting and analytics service', title: 'Reporting and analytics service', kind: 'application service', role: 'platform', moduleTitle: 'Management Reporting', responsibilities: ['It reports.']}]}});
    const a = unitAnswer(p0), comp = a.proposals.find(x => x.kind === 'component'), check = x => guardArchitectureDraft(p0, validateArchitectureDraft({proposals: [...a.proposals.filter(y => y.kind === 'driver' || y.kind === 'responsibility'), x], keep: []}, p0));
    assert.equal(check(comp).withheld.length, 0, JSON.stringify(check(comp).withheld));
    assert.equal(check({...comp, uses: ['Reporting and analytics service']}).withheld.length, 0, 'a service the catalogue holds may be used');
    assert.match(check({...comp, uses: ['A service nobody proposed']}).withheld[0].issues.join(' '), /platform services catalogue does not hold/);
    assert.match(check({...comp, serves: [{driver: 'A driver nobody proposed', reason: 'It is served.'}]}).withheld[0].issues.join(' '), /serves .* which neither the packet nor this answer holds as a driver/);
    assert.match(check({...comp, serves: Array.from({length: THEME_LIMITS.serves + 1}, () => comp.serves[0])}).withheld[0].issues.join(' '), /at most 5/);
    assert.match(check({...comp, serves: [{driver: comp.serves[0].driver, reason: 'x'.repeat(THEME_LIMITS.reason + 1)}]}).withheld[0].issues.join(' '), /longer than its bound/);
    assert.match(check({...comp, serves: [{driver: comp.serves[0].driver, reason: ''}]}).withheld[0].issues.join(' '), /named with its reason/);
    assert.match(check({...comp, drivers: [comp.serves[0].driver]}).withheld[0].issues.join(' '), /field the contract does not have: drivers/, 'the sol-architecture-3 shape is refused');
  }
  pass('sol-architecture-4 checks: a component\'s services used come from the catalogue, the drivers it serves are known, at most five, each with a reason within its bound; the version-3 shape is refused');

  // 4. Consolidation, 5. skeleton retirement, 6. Chapter 4 by module, 7. the decisions.
  const B = run.bundle, ch = n => B.chapters.find(c => String(c.chapter) === String(n)).records, payload = r => r.commands[0].payload;
  const comps = ch(5), model = comps.filter(r => r.sol?.engine === 'model');
  const byConcern = new Map(); for (const r of model) { const k = concernKey(r.title); if (k) byConcern.set(k, [...(byConcern.get(k) || []), r]); }
  for (const [k, rs] of byConcern) assert.equal(rs.length, 1, `one component for the concern ${k}: ${rs.map(r => r.title)}`);
  const reportingRec = model.find(r => r.title === 'Reporting and analytics service');
  assert.ok(reportingRec && !model.some(r => / reporting service$/.test(r.title)), 'every business module\'s reporting service is folded into the platform one');
  assert.ok(!model.some(r => r.title === 'Lending audit log store') && model.some(r => r.title === 'Audit trail store'), 'a business audit store is folded into the platform audit store');
  const reportingPayload = payload(reportingRec);
  assert.match(reportingPayload.purpose, /It produces the lending reports\. It exports the lending extracts\./, 'the folded proposal\'s responsibility sentences are kept');
  const lendingResp = ch(4).find(r => r.sol?.theme === units.find(u => u.moduleTitle === 'Lending').key && r.kind === 'responsibility');
  assert.ok(reportingPayload.allocations.some(a => a.logicalId === '@draft:' + lendingResp.key), 'and its allocations');
  const lendingDriver = ch(2).find(r => r.title === 'Lending timeliness');
  assert.ok(reportingPayload.serves.some(s => s.driverId === '@draft:' + lendingDriver.key && /lending/i.test(s.reason)), 'and the drivers it serves, with why');
  assert.ok(reportingPayload.serves.length <= 12 && reportingRec.cites.length);
  const extract = ch(8).find(r => r.kind === 'data' && payload(r).authorityId === '@draft:' + reportingRec.key);
  assert.ok(extract, 'a data entity the folded component owned is owned by the kept one');
  assert.ok(ch(9).some(r => payload(r).targetIds.includes('@draft:' + reportingRec.key)) && ch(8).some(r => r.kind === 'contract' && payload(r).kind === 'batch' && payload(r).to === '@draft:' + reportingRec.key), 'the controls and batch runs that named it keep their ends');
  const foldNotes = B.notes.filter(n => /^Folded /.test(n));
  assert.ok(foldNotes.some(n => /^Folded “Lending reporting service” \(Lending\) into “Reporting and analytics service”: one platform service for reporting and analytics across the modules\./.test(n)), 'each fold is a note: ' + foldNotes.slice(0, 3).join(' | '));
  const proposedComponents = run.themes.flatMap(t => t.proposals.filter(x => x.kind === 'component').map(x => ({x, t})));
  const folded = proposedComponents.filter(({x, t}) => !model.some(r => r.sol.theme === t.key && r.title === x.title));
  assert.equal(folded.length, proposedComponents.length - model.length);
  for (const {x, t} of folded) assert.ok(foldNotes.some(n => n.includes(`“${x.title}” (${t.moduleTitle}`)), `a note for the fold of ${x.title} (${t.key})`);
  const foldedTitles = new Set(folded.map(({x, t}) => x.title + '\u0000' + t.moduleTitle));
  assert.equal(foldNotes.length, foldedTitles.size + 1, 'a note for every fold, once per title and module (each part of a module proposed its own), and one for the driver the cross pass merged');
  assert.ok(foldNotes.some(n => /^Folded “Deposit reporting service” \(Deposit Accounts, 3 proposals\) into “Reporting and analytics service”/.test(n)), 'a title folded from three parts is one line with its count');
  assert.match(B.notes.find(n => /folded into another of the same concern/.test(n)), new RegExp(`^${proposedComponents.length - model.length + 1} proposals folded into another of the same concern`));
  // The same component in each part of a module is one; the cross pass's merge keeps a later unit's over an earlier one's.
  assert.equal(model.filter(r => r.title === 'Deposit ledger service').length, 1);
  assert.ok(foldNotes.some(n => /^Folded 2 more proposals of “Deposit ledger service” \(Deposit Accounts\) into it: the same component, proposed again\./.test(n)));
  assert.ok(model.some(r => r.title === 'Teller cash drawer store') && !model.some(r => r.title === 'Teller cash register store'), 'the merge keeps the later unit\'s store');
  assert.match(payload(model.find(r => r.title === 'Teller cash drawer store')).purpose, /It keeps the cash of each teller\./);
  assert.ok(foldNotes.some(n => /^Folded “Teller cash register store” \(Teller Services\) into “Teller cash drawer store”: the cross-cutting pass merged them \(One store of teller cash\)/.test(n)));
  assert.ok(model.some(r => r.title === 'Lending ledger service') && model.some(r => r.title === 'Branch ledger service'), 'a merge of another business module\'s component is not applied');
  assert.ok(B.notes.some(n => /^The merge of “Branch ledger service” \(Branch Network\) into “Lending ledger service” \(Lending\) is not applied: it folds a business module’s component into another module’s\./.test(n)), 'the preview names a merge the checks refused');
  assert.ok(B.notes.some(n => /^M\d+: the merge into “Tax Handling timeliness” \(RG-\d+:A1\) is not applied: The two drivers are two concerns/.test(n)), 'and one the review did not support');
  const crossRun = run.cross, crossNotes = crossRun.groundingReview?.notes || [];
  assert.ok(crossNotes.some(n => /not applied: it folds a business module’s component into another module’s/.test(n)) && crossNotes.some(n => /not applied: it chains with another merge/.test(n)) && crossNotes.some(n => /merge into .* is not applied: The two drivers are two concerns/.test(n)), 'the refused merges are noted: ' + crossNotes.join(' | '));
  assert.equal(crossRun.merges.length, 2, 'the merges that stand: the teller store and the timeliness drivers');
  assert.ok(!ch(2).some(r => r.title === 'Deposit Accounts timeliness') && ch(2).some(r => r.title === 'Tax Handling timeliness') && ch(2).some(r => r.title === 'Foreign Exchange timeliness'), 'a driver merge stands whatever the unit order; one the review refuses does not');
  const depositLedger = payload(model.find(r => r.title === 'Deposit ledger service'));
  assert.ok(depositLedger.serves.some(s => s.driverId === '@draft:' + lendingDriver.key), 'a served driver folded into another resolves to it');
  assert.ok(ch(8).some(r => r.kind === 'contract' && payload(r).from === '@draft:' + model.find(x => x.title === 'Deposit ledger service').key && /uses Approval workflow service$/.test(r.title)), 'a use of a platform service is a contract to it');
  pass('consolidation: one component per concern (the business modules\' reporting and audit folded into the platform\'s), the folded sentences, allocations, served drivers and ends kept, a note per fold; one name in several parts is one; a merge keeps a later unit\'s proposal; the refused merges are not applied');

  // 5. A rules component Sol's accepted components replace is not kept; a failed unit brings back its own records only.
  const kept = new Set(run.themes.flatMap(t => t.keep));
  const depositRules = 'c5.' + depositTree.group.id;
  assert.ok(kept.has(depositRules) && skeleton.chapters.find(c => c.chapter === 5).records.some(r => r.key === depositRules), 'the double keeps the skeleton\'s component of a module it drafts');
  const failed = run.themes.find(t => t.moduleTitle === 'Period Close');
  assert.equal(failed.status, 'failed');
  const rulesComps = comps.filter(r => r.sol?.engine !== 'model');
  assert.deepEqual(rulesComps.map(r => r.key), ['c5.' + failed.moduleId], 'only the failed unit\'s own rules component stands: ' + rulesComps.map(r => r.title));
  assert.ok(payload(rulesComps[0]).allocations.some(a => a.logicalId === '@draft:c4.' + failed.moduleId) && payload(rulesComps[0]).serves.length === 1, 'realising its own responsibility, serving its module\'s driver');
  assert.ok(!comps.some(r => r.key === depositRules), 'the rules component of a module Sol drafted is not in the bundle, though Sol kept it');
  assert.ok(B.notes.some(n => /rules components? replaced by Sol’s components: .*“Deposit Accounts service” by “Deposit ledger service”/.test(n)), 'a note names the replacement');
  const unitOfGroup = new Map(); for (const t of run.themes) { unitOfGroup.set(t.id, unitOfGroup.get(t.id) || t); for (const s of t.subIds || []) unitOfGroup.set(s, unitOfGroup.get(s) || t); }
  for (const c of [2, 3, 4, 8, 9]) for (const r of ch(c).filter(x => x.sol?.engine === 'rules' && x.kind !== 'group')) assert.ok(kept.has(r.key) || unitOfGroup.get(r.groups[0]) === failed, `${r.key}: a rules record stands only when kept or when its own unit failed`);
  assert.ok(ch(4).some(r => r.sol?.engine === 'rules' && r.kind === 'responsibility' && r.groups[0] === failed.moduleId), 'the failed unit\'s own responsibility comes back');
  pass('a rules component Sol\'s accepted components replace is not in the bundle (a note names them); a failed unit brings back its own rules records only');

  // 6. Chapter 4 by module.
  const groupRecs = ch(4).filter(r => r.kind === 'group');
  assert.equal(groupRecs.length, tree.modules.length, 'one responsibility group per module');
  for (const m of tree.modules) { const g = groupRecs.find(r => payload(r).requirementGroupIds?.[0] === m.group.id); assert.ok(g && g.title === m.group.title && /^Realises the (?:business|platform) module /.test(payload(g).purpose), `${m.group.title} has its group`); }
  assert.ok(ch(4).findIndex(r => r.kind !== 'group') === groupRecs.length, 'the groups come first');
  for (const r of ch(4).filter(x => x.kind === 'responsibility' && x.sol?.engine === 'model')) { const t = run.themes.find(x => x.key === r.sol.theme); assert.equal(payload(r).groupId, '@draft:c4.group.' + t.moduleId, `${r.title} sits in its module's group`); assert.ok(payload(r).requirementGroupIds.every(id => id === t.moduleId || tree.byId.get(id)?.parentId === t.moduleId), 'linking its leaves'); }
  for (const r of model) { const t = run.themes.find(x => x.key === r.sol.theme); assert.ok(payload(r).requirementGroupIds.every(id => !themeIds.has(id)), `${r.title} links no theme group`); assert.ok(payload(r).requirementGroupIds.some(id => id === t.moduleId || tree.byId.get(id)?.parentId === t.moduleId), `${r.title} links its module or a sub-module of it`); }
  for (const r of ch(2).filter(x => x.sol?.engine === 'model')) assert.ok(payload(r).requirementGroupIds.every(id => !themeIds.has(id)), `${r.title} links no theme group`);
  pass('Chapter 4 by module: one group per module realising it, first; each responsibility in its unit\'s module group, linking its leaves; components and drivers link the module or its sub-modules, never a theme');

  // 7. The decisions.
  const decisions = ch(3);
  assert.equal(decisions[0].sol?.theme, 'cross'); assert.equal(payload(decisions[0]).topic, 'style'); assert.equal(payload(decisions[0]).category, 'foundational'); assert.match(decisions[0].title, /architectural style/);
  assert.equal(decisions[1].sol?.theme, 'cross'); assert.match(decisions[1].title, /hosted and deployed/); assert.equal(payload(decisions[1]).topic, 'custom');
  const downgraded = decisions.find(r => /How should the deposit entries be kept/.test(r.title));
  assert.equal(payload(downgraded).category, 'structural', 'a unit\'s foundational decision is drafted as structural');
  assert.match(downgraded.note, /Proposed as foundational by Deposit Accounts; drafted as structural/);
  assert.ok(B.notes.some(n => /was proposed as foundational; it is drafted as structural/.test(n)));
  assert.ok(!decisions.slice(2).some(r => r.sol?.theme === 'cross') && decisions.filter(r => payload(r).category === 'foundational').every(r => r.sol?.theme === 'cross' || r.sol?.engine === 'rules'), 'the cross pass\'s decisions first; a unit\'s never foundational');
  pass('the decisions: the cross pass\'s first in the order of the concerns (style with its topic, then hosting); a unit\'s foundational decision drafted as structural with a note');

  // Deterministic: the same proposals give the same bundle, and a checkpoint replays it.
  seen = []; calls = 0;
  const again = await runArchitectureJob(doc, skeleton, {request});
  assert.equal(again.bundle.stamp, B.stamp, 'the same stamp twice');
  let replayed = [];
  const replay = await runArchitectureJob(doc, skeleton, {request: packet => { replayed.push(packet.request.theme); return request(packet); }, completed: saved});
  assert.deepEqual(replayed, [failed.key], 'a checkpoint replays every unit without a provider call but the failed one\'s bounded retry');
  assert.equal(replay.bundle.stamp, B.stamp, 'a checkpoint replay keeps the stamp');
  replayed = [];
  const settled = await runArchitectureJob(doc, skeleton, {request: packet => { replayed.push(packet.request.theme); return request(packet); }, completed: replay.themes.concat(replay.cross)});
  assert.deepEqual(replayed, [], 'once retried, nothing is sent again');
  assert.equal(settled.bundle.stamp, B.stamp);
  pass('deterministic: the same stamp twice, and on a checkpoint replay (the failed unit retried once, then final)');

  // 8. The plan.
  const plan = architecturePlan(doc, skeleton);
  assert.equal(plan.units, 'modules'); assert.equal(plan.themes.length, units.length); assert.equal(plan.runs, units.length + 1);
  assert.deepEqual(plan.modules, {platform: platformUnits.length, business: units.length - platformUnits.length, parts: units.filter(u => u.part).length});
  assert.ok(plan.themes.every((t, i) => t.key === units[i].key && t.role === units[i].role) && plan.themes.slice(1).every((t, i) => t.packetBytes > 0 && plan.themes[i].packetBytes > 0));
  pass('the plan counts the module units, platform first, with their parts');

  // 9. Through the HTTP API: the drafting job, its pages reviewed, then applied.
  globalThis.fetch = fetcher; failing = ''; seen = [];
  const live = await imported('Modules · applied');
  const pid = live.id, api = (route, body) => call(route, {body, project: pid});
  const planned = await api('/api/drafting?action=plan');
  assert.equal(planned.status, 200); assert.equal(planned.body.plan.units, 'modules'); assert.ok(planned.body.plan.themes.every(t => t.role));
  const jobId = '91111111-2222-4333-8444-555555555555';
  assert.equal((await api('/api/drafting?action=start', {requestId: jobId, mode: 'model'})).status, 202);
  let job;
  for (let i = 0; i < 4000; i++) {
    job = (await api('/api/drafting?action=status&id=' + jobId)).body.job;
    if (job.status === 'queued' && job.progress?.phase === 'awaiting-next') await processDraftingQueue(env);
    if (!['queued', 'running'].includes(job.status)) break;
    await new Promise(r => setTimeout(r, 5));
  }
  assert.equal(job.status, 'completed', job.error);
  assert.equal(job.modelReview.themes, units.length); assert.equal(job.modelReview.cross, 'accepted');
  const pv = (await api('/api/drafting?action=preview&id=' + jobId)).body;
  assert.ok(pv.preview.notes.some(n => /^Folded “/.test(n)), 'the preview shows the folds');
  for (const c of pv.preview.chapters) for (let offset = 0; offset < c.records; offset += 20) {
    assert.equal((await api('/api/drafting?action=records&id=' + jobId + '&chapter=' + encodeURIComponent(c.chapter) + '&offset=' + offset)).status, 200);
    assert.equal((await api('/api/drafting?action=review-page', {id: jobId, chapter: c.chapter, offset, stamp: pv.preview.stamp})).status, 200);
  }
  const applyId = '92222222-2222-4333-8444-555555555555';
  assert.equal((await api('/api/drafting?action=apply', {id: jobId, requestId: applyId, stamp: pv.preview.stamp, revision: pv.revision, reviewed: true})).status, 202);
  let applied;
  for (let i = 0; i < 4000; i++) { applied = (await api('/api/drafting?action=status&id=' + applyId)).body.job; if (!['queued', 'running'].includes(applied.status)) break; await new Promise(r => setTimeout(r, 5)); }
  assert.equal(applied.status, 'completed', applied.error);
  const out = (await api('/api/project')).body.document, liveTree = moduleTree(out), RM = recordModules(out);
  for (const m of liveTree.modules) assert.equal(out.logical.groups.filter(g => (g.requirementGroupIds || []).includes(m.group.id)).length, 1, `one responsibility group realises ${m.group.title}`);
  const drafted = out.realisation.components.filter(c => c.provenance?.draft);
  assert.ok(drafted.length > 10);
  const liveUnits = draftUnits(live.document);
  for (const c of drafted) {
    const d = c.provenance.draft, unit = liveUnits.find(u => u.key === d.theme), moduleId = d.engine === 'model' ? unit?.moduleId : d.groups?.[0];
    assert.ok(moduleId && RM.get(c.id)?.modules.includes(liveTree.byId.get(moduleId)?.kind === 'sub-module' ? liveTree.byId.get(moduleId).parentId : moduleId), `${c.title} is in its module after apply`);
    assert.ok(c.serves?.length && c.serves.every(s => out.quality.drivers.some(x => x.id === s.driverId) && s.reason.length > 10 && s.reason.length <= 600), `${c.title} names the drivers it serves, with why`);
  }
  assert.ok(out.logical.responsibilities.filter(r => r.provenance?.draft).every(r => out.logical.groups.some(g => g.id === r.groupId)), 'every drafted responsibility sits in a group');
  pass('through the HTTP API, after every page is reviewed and the draft applied: one group per module, every drafted component in its module (module-scope.js), each naming the drivers it serves with why');

  // The serves link on a component (realisation-domain.js): known drivers, at most twelve, reasons within 600
  // characters; patch semantics; a component saved before keeps its shape.
  {
    const c = drafted.find(x => x.provenance.draft.engine === 'model'), d = out.quality.drivers.slice(0, 13), save = payload_ => applyRealisationCommand(structuredClone(out), {type: 'realisation.component', payload: {id: c.id, ...payload_}}, '2026-10-14T00:00:00Z');
    assert.deepEqual(save({title: c.title}).document.realisation.components.find(x => x.id === c.id).serves, c.serves, 'left out, the served drivers stay');
    assert.throws(() => save({serves: [{driverId: 'QD-none', reason: 'x'}]}), /Choose existing drivers/);
    assert.throws(() => save({serves: d.map(x => ({driverId: x.id, reason: 'Served.'}))}), /at most 12/);
    assert.throws(() => save({serves: [{driverId: d[0].id, reason: 'x'.repeat(601)}]}), /at most 600 characters/);
    assert.throws(() => save({serves: [{driverId: d[0].id, reason: 'a'}, {driverId: d[0].id, reason: 'b'}]}), /once/);
    assert.deepEqual(save({serves: {add: [{driverId: d[0].id, reason: 'Added.'}], remove: [c.serves[0].driverId]}}).document.realisation.components.find(x => x.id === c.id).serves.find(s => s.driverId === d[0].id)?.reason, 'Added.');
    assert.deepEqual(save({serves: null}).document.realisation.components.find(x => x.id === c.id).serves, [], 'null clears it');
    assert.deepEqual(save({serves: []}).document.realisation.components.find(x => x.id === c.id).serves, [], 'and so does an empty list');
    const plain = applyRealisationCommand(structuredClone(out), {type: 'realisation.component', payload: {title: 'A component without drivers', kind: 'service'}}, '2026-10-14T00:00:00Z').document.realisation.components.at(-1);
    assert.ok(!('serves' in plain), 'a component that serves no driver holds no empty list');
  }
  pass('serves on a component: known drivers, at most twelve, reasons within 600 characters, each once; patch semantics; absent while empty');

  console.log(JSON.stringify({checks: checks.length, passed: checks, units: units.length, calls, components: model.length, folds: foldNotes.length}, null, 1));
} finally {
  globalThis.fetch = previousFetch;
  await rm(root, {recursive: true, force: true});
}
