// The architecture drafter at the size of a real project (round 12, workstream E; audit/round12/DESIGN.md D-10). A
// synthetic workbook of 1,400 requirements in 18 domains and 19 capability themes (scripts/synthetic-workbook.mjs: the
// shape of a real register, none of its text) is imported through the intake with its domain and theme groups, then
// drafted by public/architecture-drafter.js and, over HTTP, by the drafting job (drafting-service.js). The suite
// asserts, by gap:
//   GR-DRF-01  drivers per concern and kind, a responsibility per group, components per domain, decisions per theme;
//              every requirement traced through its group;
//   GR-DRF-02  the draft as a background job with progress per chapter and a receipt; a retried start returns the same
//              job and never drafts twice; a job can be stopped; time linear in the requirements;
//   GR-DRF-03  every cap under its bound with its headroom, and no proposal refused for count;
//   GR-DRF-04  imported requirements on journey steps by group, accepted in one reviewed step; Chapter 8 hand-overs;
//   GR-DRF-07  Chapter 1 outcomes, actors, scope and journey steps from the groups, each citing the rows it rests on;
//   GR-DRF-08  functional rows never become quality scenarios; a quality heading drafts its category;
//   GR-DRF-12  the job commits its proposals as one Sol draft, not reviewed: one save, one journal event per chapter;
//   GR-DRF-13  one candidate obligation per value-gap area, as a proposal; the delivery exchange exports accepted ones;
//   GR-DRF-14  groups placed on plateaus by their delivery status;
//   GR-RUN-05  a migration record tied to the plateaus and a delivery action when the source shows an existing system;
//   GR-DRF-16  citations from each record's own groups; one set of environments;
//   GR-DRF-20  a synthetic bundle of 5,000 records applied as one job, with one preview and one journal event per
//              chapter, within 15 minutes;
// and the doctrine: every drafted record is Sol's proposal (never confirmed, approved or reviewed by a person; the person
// who applied it is recorded as having applied it, not as its author), no alternative is chosen or recorded as
// preferred, an alternative is assessed only where it follows a Playbook style or pattern, exactly as its marks draft
// (round 25, D-25-09: "x" supports, "(x)" unknown with the question, each citing its cell, marked by: 'rules' until a
// person sends it again), the draft is the same byte for byte for the same project, and candidate knowledge kept on the
// project changes nothing.
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';
import {draftArchitecture, draftPreview, applyDraftBundle, solDraftOf, DRAFT_SCHEMA, DRAFT_ENGINE, DRAFT_BATCH, DRAFT_ORIGIN} from './public/architecture-drafter.js';
import {requirementGroups, groupMembers, groupsOf} from './public/requirement-groups.js';
import {driverKind, driverCode} from './public/quality-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {findings as chapterOneFindings} from './public/requirements-domain.js';
import {plateauGroups, migrationsOf, roadmapFindings} from './public/roadmap-domain.js';
import {deliveryExchange} from './public/delivery-feedback.js';
import {draftsByGroup, draftOffer} from './public/readiness-model.js';
import {draftChapter} from './shared/journey-drafter.js';
import {applyKnowledgeCommand, knowledgeStamp} from './public/knowledge-governance.js';
import {applyRecordLifecycleCommand} from './public/record-lifecycle.js';
import {digest} from './public/brain-integrity.js';
import {STYLES, PATTERNS, TACTICS, attribute} from './public/playbook-knowledge.js';
import {readDecision} from './public/decision-reading.js';
import {suggestEffects} from './public/decision-suggestions.js';
import {applyDecisionCommand, rulesAssessed} from './public/decisions-domain.js';

const checks = [], pass = name => checks.push(name), measured = {};
// Round 25 (D-25-09): what the SA Playbook's marks draft for an alternative (its source names its Playbook entry) against
// a decision's drivers, worked out here from the Playbook's own data: a style or a pattern only; "x" supports and "(x)"
// unknown with the question, each citing the entry's cell for the quality (a style's row, else its source), by: 'rules'.
const PLAYBOOK_ENTRIES = new Map([...STYLES.map(x => [x.id, {...x, form: 'style'}]), ...PATTERNS.map(x => [x.id, {...x, form: 'pattern'}]), ...TACTICS.map(x => [x.id, {...x, form: 'tactic'}])]);
function markedAssessments(source, driverIds, qualityOf) {
  const x = PLAYBOOK_ENTRIES.get(String(source).split(' · ')[1]), out = {};
  if (!x || x.form === 'tactic') return out;
  for (const id of driverIds) {
    const quality = qualityOf(id), mark = quality ? x.effects?.[quality] : null, name = quality ? attribute(quality)?.name : null;
    if (!mark || !name) continue;
    const evidence = 'SA Playbook, ' + ((x.form === 'style' && x.rows?.[name]) || x.src);
    out[id] = mark === 'x' ? {effect: 'supports', reason: `The SA Playbook marks the ${x.name} ${x.form} as strong support for ${name.toLowerCase()}.`, evidence, by: 'rules'}
      : {effect: 'unknown', reason: `The SA Playbook marks the ${x.name} ${x.form} as potential or conditional support for ${name.toLowerCase()}: say whether the condition holds here.`, evidence, by: 'rules'};
  }
  return out;
}
const root = await mkdtemp(path.join(tmpdir(), 'aiw-drafter-groups-')), db = localDatabase(path.join(root, 'd.sqlite'));
const env = {DB: db, FILES: localFiles(path.join(root, 'files')), ASSETS: {fetch: () => new Response('asset')}}, origin = 'https://aiw.test', OWNER = 'architect-e';
let pid = '';
const api = async (route, {body, bytes, owner = OWNER, headers = {}, project = pid} = {}) => {
  const r = await worker.fetch(new Request(origin + route + (route.includes('?') ? '&' : '?') + 'project=' + project, {method: body || bytes ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {}), ...headers}, ...(body ? {body: JSON.stringify(body)} : bytes ? {body: bytes} : {})}), env);
  return {status: r.status, body: await r.json()};
};
// A project of the synthetic workbook, imported through the intake with its domain and capability-theme groups.
async function importedProject(rows, name) {
  const created = await worker.fetch(new Request(origin + '/api/projects', {method: 'POST', headers: {'oai-authenticated-user-id': OWNER, Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({name, template: 'blank'})}), env);
  const id = (await created.json()).document.id, {bytes, manifest} = syntheticWorkbook({rows});
  const call = (route, opts) => api(route, {...opts, project: id});
  const up = (await call('/api/intake?action=upload&filename=Synthetic.xlsx', {bytes})).body, ins = (await call('/api/intake?action=inspect', {body: {uploadId: up.id, sheet: manifest.sheet}})).body;
  const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: true}};
  const pre = (await call('/api/intake?action=preview', {body: input})).body;
  const applied = await call('/api/intake?action=apply', {body: {...input, revision: pre.projectRevision, previewStamp: pre.stamp, reviewed: true}});
  assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 300));
  return {id, manifest, document: withFinalReview(applied.body.document), revision: applied.body.revision};
}
const poll = async (id, project = pid) => { for (let i = 0; i < 6000; i++) { const s = await api('/api/drafting?action=status&id=' + id, {project}); assert.equal(s.status, 200, JSON.stringify(s.body)); if (!['queued', 'running'].includes(s.body.job.status)) return s.body.job; await new Promise(r => setTimeout(r, 25)); } throw Error('The job did not finish.'); };
const reviewPages = async (id, preview, project = pid) => {
  let opened = 0;
  for (const chapter of preview.body.preview.chapters) for (let offset = 0; offset < chapter.records; offset += 20) {
    const page = await api('/api/drafting?action=records&id=' + id + '&chapter=' + encodeURIComponent(chapter.chapter) + '&offset=' + offset, {project});
    assert.equal(page.status, 200, JSON.stringify(page.body));
    assert.equal(page.body.records.length, Math.min(20, chapter.records - offset), 'the page exposes every proposed record for review');
    const marked = await api('/api/drafting?action=review-page', {project, body: {id, chapter: chapter.chapter, offset, stamp: preview.body.preview.stamp}});
    assert.equal(marked.status, 200, JSON.stringify(marked.body));
    opened++;
  }
  assert.equal(opened, preview.body.review.total, 'all proposal pages were opened and reviewed before apply');
};
const uuid = n => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`;
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const timeDraft = p => { const t = []; let d; for (let i = 0; i < 3; i++) { const s = performance.now(); d = draftArchitecture(p); t.push(performance.now() - s); } return {d, ms: median(t)}; };

try {
  // ---------------------------------------------------------------- the project and its draft
  const big = await importedProject(1400, 'Synthetic bank platform');
  pid = big.id;
  const p = big.document, reqs = p.artefacts.filter(a => a.type === 'requirement'), groups = requirementGroups(p);
  const domains = groups.filter(g => g.kind === 'domain'), themes = groups.filter(g => g.kind === 'theme');
  assert.equal(reqs.length, 1400); assert.equal(domains.length, 18, 'eighteen domains'); assert.ok(themes.length >= 18, 'the capability themes');
  assert.ok(draftsByGroup(p), 'an imported project is drafted by requirement group');
  const before = JSON.stringify(p);
  const {d, ms} = timeDraft(p);
  measured.draft1400 = {ms: Math.round(ms), records: d.counts.records, commands: d.counts.commands, byChapter: d.counts.byChapter};
  assert.equal(JSON.stringify(p), before, 'drafting never changes the project');
  assert.equal(d.schema, DRAFT_SCHEMA); assert.equal(d.engine, DRAFT_ENGINE);
  const all = d.chapters.flatMap(c => c.records), ch = n => d.chapters.find(c => String(c.chapter) === String(n)).records;
  const payloadOf = r => r.commands[0].payload;
  // GR-DRF-01: drivers per concern and kind.
  const drivers = ch(2), byKind = k => drivers.filter(r => payloadOf(r).kind === k);
  assert.equal(byKind('functional').length, domains.length, 'a functional driver per functional area');
  for (const r of byKind('functional')) { const x = payloadOf(r); assert.equal(x.requirementGroupIds.length, 1); assert.ok(domains.some(g => g.id === x.requirementGroupIds[0])); assert.match(x.source, /\d[\d,]* requirements: [\d,]+ delivered, [\d,]+ gaps?/, 'counts belong to the source line'); assert.equal(x.description, '', 'a design explanation is not a count dump'); assert.ok(x.open.description?.question, 'the architect is asked for the design explanation'); assert.ok(['High', 'Medium', 'Low'].includes(x.priority) && x.priorityBasis === 'source band', 'priority from the source bands'); }
  assert.ok(byKind('quality').length >= 2 && byKind('quality').length <= 14, 'a quality driver per quality concern, not per requirement');
  assert.ok(byKind('operational').length >= 1 && byKind('data').length >= 1, 'operational and data drivers from the concerns the rows evidence');
  assert.equal(byKind('business').length, 0, 'no business driver without a brief');
  assert.deepEqual(d.asks.map(a => a.chapter), [1], 'only Chapter 1 asks for the brief');
  // GR-DRF-08: functional rows never become quality scenarios; a quality heading drafts its category.
  const headings = {availability: /stability|resilien/i, traceability: /audit|history/i, security: /roles|access/i};
  for (const r of byKind('quality')) {
    const x = payloadOf(r), groupsOfIt = x.requirementGroupIds.map(id => groups.find(g => g.id === id));
    assert.ok(groupsOfIt.every(g => headings[x.category]?.test(g.title)), `${x.category}: drafted from the source's own heading (${groupsOfIt.map(g => g.title)})`);
    const heading = new Set(x.requirementGroupIds.flatMap(id => groupMembers(p, id)));
    assert.ok(x.requirementIds.every(id => heading.has(id)), 'it cites only the rows under its heading');
    assert.deepEqual([x.stimulus, x.conditions, x.response, x.targetValue], ['', '', '', ''], 'the scenario is a stub and the target not stated (no row states a quality figure)');
    assert.equal(x.open.stimulus.state, 'not-stated');
  }
  assert.ok(byKind('quality').some(r => payloadOf(r).category === 'availability') && byKind('quality').some(r => payloadOf(r).category === 'traceability'), 'availability and traceability from their headings');
  pass('GR-DRF-01, GR-DRF-08: drivers by kind: a functional driver per functional area with its requirement and gap counts and a source-band priority; a quality driver per quality concern the source\'s own headings name, a stub scenario with no target, citing only rows under its heading; operational and data drivers per evidenced concern; no business driver and one question for the brief');
  // Responsibilities per group, components per domain, decisions per theme.
  const resp = ch(4).filter(r => r.kind === 'responsibility'), journeyConnections = ch(4).filter(r => r.kind === 'connection');
  assert.equal(resp.length, domains.length + themes.length, 'a responsibility per requirement group');
  for (const r of resp) { const x = payloadOf(r); assert.equal(x.requirementGroupIds.length, 1, 'each linked to its group'); assert.equal(r.groups[0], x.requirementGroupIds[0]); const own = new Set(groupMembers(p, r.groups[0])); assert.ok(r.cites.length && r.cites.every(id => own.has(id)), `GR-DRF-16: ${r.title} cites its own group's rows`); assert.ok(x.boundary.includes(reqs.find(a => a.id === r.cites[0]).title.slice(0, 25)), 'its boundary names one of its own requirements in words'); }
  const comps = ch(5), kinds = new Set(comps.map(r => payloadOf(r).kind));
  assert.ok(comps.length >= 10 && comps.length <= 40, `tens of components, not hundreds (${comps.length})`);
  for (const g of domains) assert.equal(comps.filter(r => r.groups.includes(g.id)).length, 1, `${g.title} is realised by one component`);
  for (const k of ['service', 'store', 'worker', 'adapter', 'channel']) assert.ok(kinds.has(k), 'GR-DRF-15: a component of kind ' + k);
  for (const r of comps) { assert.doesNotMatch(r.title, /\b(?:shall|must|should|will|can)\b/i, 'no modal verb in ' + r.title); assert.doesNotMatch(r.title, /^(?:the|ensure|ability|record|display|validate|approve)\b/i, 'a noun, not a verb phrase: ' + r.title); assert.ok(payloadOf(r).allocations.length >= 1, 'each realises responsibilities'); assert.ok(payloadOf(r).open.architecturalSolution && Array.isArray(payloadOf(r).properties) && !payloadOf(r).properties.length, 'its properties and solution left open'); }
  const allocated = comps.flatMap(r => payloadOf(r).allocations.map(a => a.logicalId.replace('@draft:', '')));
  assert.deepEqual([...new Set(allocated)].sort(), resp.map(r => r.key).sort(), 'every responsibility is realised by exactly one component');
  assert.equal(new Set(allocated).size, allocated.length);
  const decisions = ch(3), topicKeys = decisions.map(r => r.key);
  assert.equal(new Set(topicKeys).size, topicKeys.length, 'one decision per architectural theme');
  for (const k of ['style', 'hosting', 'integration', 'data', 'identity', 'batch', 'observability', 'resilience', 'channels']) assert.ok(topicKeys.includes('c3.' + k), 'a decision for the theme ' + k);
  // Round 25 (D-25-09): an alternative is assessed exactly as the Playbook's marks draft against the decision's quality
  // drivers, and only then (a tactic, a design decision or an unmarked quality: nothing); none is chosen or preferred.
  const qualityOfRef = new Map(byKind('quality').map(r => ['@draft:' + r.key, payloadOf(r).category])), drafted1400 = {supports: 0, unknown: 0};
  for (const r of decisions) {
    const save = r.commands[0].payload, alts = r.commands.slice(1);
    assert.ok(['foundational', 'structural', 'cross-cutting', 'trade-off', 'additional'].includes(save.category), 'a category');
    assert.ok(save.driverIds.length >= 1, r.key + ': its drivers');
    assert.ok(alts.length >= 2 && alts.length <= 12, r.key + ': two to twelve alternatives');
    for (const a of alts) {
      assert.match(a.payload.source, /^SA Playbook · /, 'an alternative from the Playbook');
      const expected = markedAssessments(a.payload.source, save.driverIds, id => qualityOfRef.get(id) || null);
      assert.deepEqual(a.payload.assessments, expected, r.key + ': ' + a.payload.title + ' is assessed exactly as the Playbook\'s marks draft, and only then');
      for (const v of Object.values(expected)) drafted1400[v.effect]++;
      assert.equal(a.payload.rejectionReason, '');
    }
    assert.ok(!('selectedAlternativeId' in save) && !('recommendation' in save), 'no alternative is chosen or recorded as preferred');
    assert.ok(r.commands.every(c => c.type === 'decision.save' || c.type === 'decision.alternative'), 'and no command chooses one');
  }
  assert.ok(drafted1400.supports > 0, 'the register\'s pattern alternatives carry assessments drafted from their marks');
  measured.drafted1400 = {decisions: decisions.length, alternatives: decisions.reduce((n, r) => n + r.commands.length - 1, 0), assessments: drafted1400};
  pass(`GR-DRF-01, GR-DRF-15: a responsibility per requirement group, linked to it, its boundary citing its own rows; tens of components, each functional area realised by exactly one, named by a noun, of the kinds service, store, batch worker, adapter and channel, their properties open; one decision per architectural theme with its category, drivers and two to twelve Playbook alternatives, none chosen or preferred, a style or pattern alternative assessed exactly as its marks draft against the decision's quality drivers (${drafted1400.supports} supports, ${drafted1400.unknown} unknown with the question, by AIW's rules) and no other alternative assessed`);
  // Every requirement traced through its group, and placed on a step.
  assert.equal(d.trace.traced, 1400, 'every requirement traced through its group'); assert.deepEqual(d.trace.untraced, []);
  const tracedThrough = new Set(all.flatMap(r => r.groups));
  for (const a of reqs) assert.ok(groupsOf(p, a.id).some(g => tracedThrough.has(g)), a.id + ' is traced through a group');
  const steps = ch(1).filter(r => r.kind === 'journey'), placed = steps.flatMap(r => payloadOf(r).links.filter(l => l[1] === 'requires').map(l => l[2]));
  assert.ok(journeyConnections.length >= steps.length, 'each step is linked to a logical responsibility');
  assert.ok(journeyConnections.every(r => ['serves', 'realises'].includes(payloadOf(r).kind) && payloadOf(r).from.startsWith('@draft:c4.') && payloadOf(r).to.startsWith('@draft:c1.step.')), 'typed responsibility to step links, never a title match');
  assert.equal(placed.length, 1400, 'every requirement placed on one step'); assert.equal(new Set(placed).size, 1400);
  assert.equal(d.trace.placed, 1400);
  assert.equal(new Set(steps.map(r => payloadOf(r).journeyId)).size, domains.length, 'one journey per functional area');
  assert.ok(steps.every(r => ['', 'supporting', 'administrative'].includes(payloadOf(r).processKind)) && steps.some(r => payloadOf(r).processKind === 'supporting') && steps.some(r => payloadOf(r).processKind === 'administrative'), 'steps of the business, and supporting and administrative processes');
  for (const r of steps) { const members = new Set(r.groups.flatMap(g => groupMembers(p, g))); assert.ok(payloadOf(r).links.every(l => members.has(l[2])), r.title + ': its requirements are of its own groups'); }
  // GR-DRF-07: outcomes, actors and scope from the groups, each citing the rows it rests on.
  const kindsOf = k => ch(1).filter(r => r.kind === k);
  assert.ok(kindsOf('outcome').length >= 1 && kindsOf('outcome').every(r => r.cites.length >= 2 && payloadOf(r).links.every(l => l[1] === 'delivers')), 'outcomes the rows state, each citing and linking its rows');
  const userGroups = new Set(reqs.map(a => a.userGroup).filter(Boolean));
  assert.equal(kindsOf('actor').length, userGroups.size, 'an actor per user group');
  for (const r of kindsOf('actor')) { const x = payloadOf(r); for (const f of ['role', 'motivations', 'wishes', 'concerns', 'usage', 'benefits']) assert.equal(x.open[f].state, 'not-stated', 'every persona field open'); assert.ok(r.cites.every(id => reqs.find(a => a.id === id).userGroup === r.title), 'it cites its own user group\'s rows'); }
  assert.equal(kindsOf('scope').length, domains.length, 'an in-scope record per functional area');
  assert.ok(kindsOf('scope').every(r => payloadOf(r).requirementGroupIds.length === 1 && r.cites.every(id => groupMembers(p, r.groups[0]).includes(id))));
  pass('GR-DRF-01, GR-DRF-04, GR-DRF-05, GR-DRF-07: every one of 1,400 requirements traced through its group and placed on exactly one step of its own area\'s journey (steps of the business, and supporting and administrative processes); outcomes, an actor per user group with every persona field open, and an in-scope record per area, each citing its own rows');
  // GR-DRF-03: every cap under its bound; nothing refused for count.
  for (const c of d.caps) assert.ok(c.headroom >= 0 && c.after <= c.limit, `${c.label}: ${c.after} of ${c.limit}`);
  assert.ok(d.caps.find(c => c.id === 'drivers').after <= 100 && d.caps.find(c => c.id === 'components').after <= 100, 'a grouped draft uses a fraction of a cap');
  measured.caps = Object.fromEntries(d.caps.map(c => [c.id, `${c.after}/${c.limit}`]));
  // Determinism.
  assert.equal(JSON.stringify(draftArchitecture(structuredClone(p))), JSON.stringify(d), 'the same project drafts the same bundle, byte for byte');
  assert.equal(d.stamp, digest(Object.fromEntries(Object.entries(d).filter(([k]) => !['counts', 'caps', 'stamp'].includes(k)))), 'the stamp is the bundle\'s digest');
  pass('GR-DRF-03: every cap under its bound with its headroom (drivers ' + measured.caps.drivers + ', components ' + measured.caps.components + ', responsibilities ' + measured.caps.responsibilities + '); nothing refused for count; the same project drafts the same bundle byte for byte');
  // A chapter drafted alone applies alone: what names a record of a chapter left out is left out with it, and said.
  for (const n of [3, 6, 8, 9, 'delivery']) {
    const alone = draftArchitecture(p, {chapters: [n]});
    assert.deepEqual(alone.chapters.map(c => c.chapter), [n]);
    const result = applyDraftBundle(p, alone, {actor: OWNER, jobId: 'alone'});
    assert.equal(Object.keys(result.created).length, alone.counts.records, `Chapter ${n} alone: every proposal it keeps applies`);
    if (alone.counts.records < ch(n).length) assert.ok(alone.notes.some(x => /left out: .*neither in this draft nor in the project/.test(x)), `Chapter ${n} alone says what it left out`);
  }
  pass('GR-DRF-02: a chapter drafted alone (3, 6, 8, 9 and the delivery plan) applies alone; a proposal that names a record of a chapter left out is left out with it, and the draft says so');
  // GR-DRF-02: time linear in the requirements (twice the requirements, about twice the time).
  const double = await importedProject(2800, 'Synthetic bank platform, twice the size');
  const {d: d2, ms: ms2} = timeDraft(double.document);
  measured.draft2800 = {ms: Math.round(ms2), records: d2.counts.records};
  measured.ratio = Math.round(ms2 / ms * 100) / 100;
  assert.ok(ms2 / ms < 4, `twice the requirements takes about twice the time (${Math.round(ms)} ms → ${Math.round(ms2)} ms)`);
  assert.ok(ms < 20000 && ms2 < 40000, 'seconds, not minutes');
  assert.equal(d2.trace.traced, 2800);
  pass(`GR-DRF-02: drafting is linear in the requirements: 1,400 in ${Math.round(ms)} ms, 2,800 in ${Math.round(ms2)} ms (ratio ${measured.ratio}); every one of 2,800 traced`);
  // Candidate knowledge never scores: kept on the project as candidate claims, it changes nothing in the draft.
  const pack = JSON.parse(readFileSync('candidate-sets/core-banking-candidate-pack.json', 'utf8')), packText = readFileSync('candidate-sets/core-banking-candidate-pack.json', 'utf8');
  let kept = applyKnowledgeCommand(p, {type: 'knowledge.source', payload: {title: pack.title, body: packText, url: 'https://aiw.test/candidate-sets/core-banking-candidate-pack.json', revision: pack.preparedOn, path: 'candidate-sets/core-banking-candidate-pack.json', license: 'Candidate; rights not checked'}}, '2026-10-08T00:00:00Z', 'pack-author').document;
  const sourceId = kept.knowledge.sources.at(-1).id, lines = packText.split('\n');
  for (const e of pack.entries.slice(0, 3)) { const at = lines.findIndex(l => l.includes('"id": "' + e.id + '"')) + 1; kept = applyKnowledgeCommand(kept, {type: 'knowledge.claim', payload: {sourceId, lineStart: at, lineEnd: at + 2, subjectId: e.id, predicate: 'recommends', statement: e.intent, claimType: 'applicability', polarity: 'supports', conditions: ['Core banking'], limitations: ['Candidate only; not reviewed']}}, '2026-10-08T00:00:00Z', 'pack-author').document; }
  assert.equal(kept.knowledge.claims.length, 3);
  assert.equal(JSON.stringify(draftArchitecture(kept)), JSON.stringify(d), 'candidate knowledge kept on the project changes nothing in the draft');
  assert.ok(!JSON.stringify(d).includes('CB-CANDIDATE') && !/candidate/i.test(JSON.stringify(d.chapters.flatMap(c => c.records.flatMap(r => r.commands.filter(x => x.type === 'decision.alternative').map(x => x.payload.source))))), 'no alternative rests on candidate knowledge');
  pass('doctrine: candidate knowledge kept on the project as candidate claims changes nothing in the draft, and no alternative rests on it');
  // The journey drafter's per-requirement rules are retired for this project; the one predicate offers the grouped draft.
  for (const n of [1, 2, 4, 5, 8, 10]) { const x = draftChapter(p, n); assert.equal(x.records.length, 0); assert.equal(x.grouped, true, 'Chapter ' + n + ' answers grouped'); }
  assert.equal(draftOffer(p, 1).kind, 'grouped'); assert.equal(draftOffer(p, 4).kind, 'grouped'); assert.match(draftOffer(p, 1).reason, /1,400 requirements were imported in \d+ requirement groups/);
  pass('GR-DRF-01, GR-DRF-17: no chapter of an imported project is drafted one record per requirement: the journey drafter answers grouped, and the one predicate offers the architecture draft with its reason');

  // ---------------------------------------------------------------- the job and its receipt, over HTTP
  const draftId = uuid(1);
  let r = await api('/api/drafting?action=start', {body: {requestId: draftId}});
  assert.equal(r.status, 202, JSON.stringify(r.body)); assert.equal(r.body.receipt, draftId); assert.equal(r.body.status, 'queued', 'the receipt comes back at once, the job queued');
  const retry = await api('/api/drafting?action=start', {body: {requestId: draftId}});
  assert.equal(retry.status, 200); assert.equal(retry.body.id, draftId); assert.equal(retry.body.replayed, true, 'a retried start returns the same job');
  let job = await poll(draftId);
  assert.equal(job.status, 'completed', job.error);
  assert.equal(job.progress.chapters.length, 12, 'progress per chapter'); assert.deepEqual(job.progress.chapters.map(c => c.records), d.chapters.map(c => c.records.length));
  assert.equal(job.summary.stamp, d.stamp, 'the job drafts the bundle the drafter drafts');
  const again = await api('/api/drafting?action=start', {body: {requestId: draftId}});
  assert.equal(again.body.id, draftId); assert.equal(again.body.status, 'completed');
  const viaKey = await api('/api/drafting?action=start', {body: {}, headers: {'Idempotency-Key': 'retry-key-0000000000001'}}), viaKeyAgain = await api('/api/drafting?action=start', {body: {}, headers: {'Idempotency-Key': 'retry-key-0000000000001'}});
  assert.equal(viaKey.status, 202); assert.equal(viaKeyAgain.body.id, viaKey.body.id, 'the same Idempotency-Key returns the same job');
  await poll(viaKey.body.id);
  const jobsRow = await db.prepare("SELECT COUNT(*) AS n FROM project_jobs WHERE project_id=? AND kind='draft'").bind(pid).first();
  assert.equal(jobsRow.n, 2, 'two receipts, two drafts: a retry never drafts twice');
  assert.equal((await api('/api/drafting?action=start', {body: {requestId: draftId, chapters: [2]}})).status, 409, 'a receipt names one piece of work');
  // Stopped: a job stops between its chapters, and keeps no draft.
  const stopId = uuid(2);
  assert.equal((await api('/api/drafting?action=start', {body: {requestId: stopId}})).status, 202);
  const stopped = await api('/api/drafting?action=cancel', {body: {id: stopId}});
  assert.equal(stopped.status, 200); assert.equal(stopped.body.cancelled, true);
  const stoppedJob = await poll(stopId);
  assert.equal(stoppedJob.status, 'cancelled'); assert.ok(!stoppedJob.summary, 'a stopped draft keeps no bundle');
  const latest = await api('/api/drafting?action=latest');
  assert.equal(latest.body.draft.id, stopId, 'the newest draft is found by the project, for a page reloaded without its receipt');
  pass('GR-DRF-02: the draft runs as a job: the receipt comes back at once; progress per chapter (12 chapters); a retried start, by receipt or by Idempotency-Key, returns the same job and never drafts twice; a receipt names one piece of work; a job is stopped between chapters and keeps nothing; the newest job is found by the project');

  // ---------------------------------------------------------------- previewed and applied as one reviewed step
  const pv = await api('/api/drafting?action=preview&id=' + draftId);
  assert.equal(pv.status, 200); assert.equal(pv.body.stale, false);
  assert.deepEqual(pv.body.preview.chapters.map(c => c.records), d.chapters.map(c => c.records.length), 'counts per chapter');
  assert.ok(pv.body.preview.chapters.every(c => c.sample.length === Math.min(5, c.records)), 'a sample per chapter');
  assert.ok(pv.body.preview.caps.every(c => typeof c.headroom === 'number') && !pv.body.preview.over.length, 'every cap with its headroom');
  const preview = draftPreview(p, d, pv.body.revision);
  assert.equal(pv.body.preview.stamp, preview.stamp, 'the preview is stamped with the bundle and the project revision');
  const page = await api('/api/drafting?action=records&id=' + draftId + '&chapter=4&offset=0');
  assert.equal(page.status, 200); assert.equal(page.body.total, d.chapters.find(c => c.chapter === 4).records.length);
  assert.equal(page.body.records.length, Math.min(20, page.body.total), 'the review reads one bounded page of full proposal fields');
  assert(page.body.records.every(r => r.commands.length && r.cites.length), 'the details show the proposed commands and citations');
  assert.equal((await api('/api/drafting?action=records&id=' + draftId + '&chapter=4&offset=-1')).status, 400);
  assert.equal((await api('/api/drafting?action=records&id=' + draftId + '&chapter=4', {owner: 'stranger-reader'})).status, 404);
  assert.equal((await api('/api/drafting?action=start', {body: {requestId: uuid(7), mode: 'model'}})).status, 503, 'an unconfigured model is never silently replaced by the rules');
  const applyId = uuid(3), applyBody = {id: draftId, requestId: applyId, stamp: pv.body.preview.stamp, revision: pv.body.revision, reviewed: true};
  assert.equal((await api('/api/drafting?action=apply', {body: {...applyBody, reviewed: false}})).status, 400, 'an unreviewed apply is refused');
  assert.equal((await api('/api/drafting?action=apply', {body: {...applyBody, stamp: 'x'}})).status, 409, 'an apply of another preview is refused');
  assert.equal((await api('/api/drafting?action=apply', {body: applyBody, owner: 'stranger-reader'})).status, 404, 'another account sees no such project');
  assert.equal((await api('/api/drafting?action=apply', {body: applyBody})).status, 409, 'an acknowledgement without proposal-page review is refused');
  await reviewPages(draftId, pv);
  const activityBefore = (await db.prepare('SELECT COUNT(*) AS n FROM project_activity WHERE project_id=?').bind(pid).first()).n;
  r = await api('/api/drafting?action=apply', {body: applyBody});
  assert.equal(r.status, 202, JSON.stringify(r.body)); assert.equal(r.body.receipt, applyId);
  const t0 = Date.now();
  job = await poll(applyId);
  measured.apply1400 = {ms: Date.now() - t0, commands: d.counts.commands};
  assert.equal(job.status, 'completed', job.error);
  assert.equal(job.progress.chapters.length, 12); assert.equal(job.progress.done, d.counts.commands, 'progress counts every command');
  const saved = await api('/api/project');
  assert.equal(saved.body.revision, pv.body.revision + 1, 'GR-DRF-12: one save for the whole draft');
  const doc = saved.body.document, added = doc.changes.events.slice(-12);
  assert.equal(doc.changes.events.length, (p.changes?.events?.length || 0) + 12, 'one journal event per chapter, and no other');
  assert.ok(added.every(e => e.authorKind === DRAFT_ORIGIN && e.reviewed === false && e.actor === OWNER && e.appliedBy === OWNER && e.source.kind === 'draft-apply'), 'each says Sol drafted it, nobody reviewed it, and who applied it');
  assert.ok(!doc.changes.events.some(e => e.requirementId), 'no requirement change is journalled one by one');
  const activity = (await db.prepare('SELECT document FROM project_activity WHERE project_id=? ORDER BY created_at').bind(pid).all()).results.map(x => JSON.parse(x.document));
  assert.equal(activity.length, activityBefore + 1, 'one activity row'); assert.equal(activity.at(-1).title, 'draft.apply'); assert.equal(activity.at(-1).authorKind, DRAFT_ORIGIN); assert.equal(activity.at(-1).reviewed, false);
  // Round 12 (GR-GOV-08): every journal event and the activity row say why the batch was applied.
  assert.ok(added.every(e => typeof e.reason === 'string' && e.reason.length > 0) && typeof activity.at(-1).reason === 'string' && activity.at(-1).reason.length > 0, 'each journal event and the activity row say why');
  // Every applied record a proposal by Sol, applied by the person, reviewed by no one; nothing confirmed or chosen.
  const applied = [...doc.quality.drivers, ...doc.decisions.records, ...doc.logical.responsibilities, ...doc.logical.connections, ...doc.realisation.components, ...doc.technology.capabilities, ...doc.technology.needs, ...doc.technologyRealisation.records, ...doc.interfaces.contracts, ...doc.interfaces.data, ...(doc.interfaces.invariants || []), ...doc.interfaces.parties, ...doc.security.threats, ...doc.security.controls, ...doc.runtime.environments, ...doc.runtime.zones, ...doc.runtime.plans, ...doc.runtime.placements, ...doc.finalReview.actions, ...doc.roadmap.plateaus, ...migrationsOf(doc), ...doc.artefacts.filter(a => a.type !== 'requirement')];
  assert.ok(applied.length >= d.counts.records, 'every drafted record landed');
  for (const x of applied) { const m = solDraftOf(x); assert.ok(m, (x.ref || x.id) + ' carries its draft'); assert.equal(m.reviewed, false); assert.equal(m.appliedBy, OWNER); assert.equal(x.origin, DRAFT_ORIGIN); assert.equal(x.state, 'proposed', (x.ref || x.id) + ' is a proposal'); assert.notEqual(x.confirmed, true); }
  // Round 25 (D-25-09): every applied assessment is the one the bundle drafted, its by: 'rules' mark kept through the
  // apply, or an undrafted one that states nothing; no alternative is chosen or recorded as preferred.
  const bundled = new Map(d.chapters.find(c => c.chapter === 3).records.map(x => [x.key, x])), refOf = new Map(doc.quality.drivers.map(x => [x.id, '@draft:' + x.provenance.draft.key]));
  let rulesKept = 0;
  for (const x of doc.decisions.records) {
    assert.ok(x.selectedAlternativeId === null && !('recommendation' in x) && x.status === 'draft' && x.alternatives.length >= 2, x.id + ': no alternative chosen or recorded as preferred');
    const record = bundled.get(x.provenance.draft.key);
    x.alternatives.forEach((a, i) => {
      assert.deepEqual(Object.keys(a.assessments), x.driverIds, x.id + ' ' + a.title + ': one assessment per driver');
      for (const [id, v] of Object.entries(a.assessments)) { assert.deepEqual(v, record.commands[i + 1].payload.assessments[refOf.get(id)] || {effect: 'unknown', reason: '', evidence: ''}, x.id + ' ' + a.title + ' on ' + id + ': as drafted, or nothing stated'); if (rulesAssessed(v)) rulesKept++; }
    });
  }
  assert.equal(rulesKept, drafted1400.supports + drafted1400.unknown, 'every drafted assessment keeps its by: \'rules\' mark through the apply');
  assert.ok(doc.quality.drivers.every(x => !x.targetConfirmed && !x.confirmed));
  assert.ok(!JSON.stringify(doc).includes('"productionAccepted":true'));
  // The codes the components name are the drivers' own.
  const fd1 = doc.quality.drivers.find(x => x.provenance.draft.key === 'c2.fd.RG-001');
  assert.equal(driverKind(fd1), 'functional'); assert.ok(doc.realisation.components.some(c => c.rationale.includes(driverCode(doc, fd1))), 'a component names its drivers by code');
  pass('GR-DRF-12, GR-DRF-20: previewed (counts and a sample per chapter, every cap with its headroom, stamped with the bundle and the revision) and applied as one reviewed step: refused unreviewed or for another preview; one save, one activity row, one journal event per chapter saying Sol drafted it, nobody reviewed it and who applied it; every record a proposal by Sol (state proposed, origin sol-draft, reviewed false), nothing confirmed, chosen or preferred, and no alternative assessed but as the Playbook\'s marks drafted, each such assessment keeping its by: \'rules\' mark through the apply; components name their drivers by code');
  // GR-DRF-04: imported requirements on journey steps, accepted in that one step; Chapter 8 then holds hand-overs.
  assert.deepEqual(chapterOneFindings(doc).filter(f => f.code === 'journey-link'), [], 'no journey-link finding is left');
  const requiresLinks = doc.relationships.filter(x => x.kind === 'requires' && reqs.some(a => a.id === x.to));
  assert.equal(new Set(requiresLinks.map(x => x.to)).size, 1400, 'every imported requirement on a journey step');
  const handovers = doc.interfaces.contracts.filter(c => c.provenance.draft.key.startsWith('c8.ho.'));
  assert.ok(handovers.length >= domains.length, 'hand-overs between the components of the journeys');
  assert.ok(doc.interfaces.contracts.some(c => c.kind === 'batch'), 'periodic work drafts a batch contract');
  // GR-DRF-16: one set of environments, a placement per component, copies not stated.
  assert.equal(doc.runtime.environments.length, 3, 'one environment per stage, not one per component');
  assert.equal(doc.runtime.placements.length, doc.runtime.environments.length * doc.realisation.components.length);
  assert.ok(doc.runtime.placements.every(x => x.replicas === ''), 'copies not stated');
  // GR-DRF-13: one candidate obligation per value-gap area; the delivery exchange exports the accepted ones only.
  const gapAreas = domains.filter(g => groupMembers(p, g.id).some(id => { const a = reqs.find(x => x.id === id); return a.assessment.delivery && a.assessment.delivery !== 'Delivered'; }));
  const obligations = doc.finalReview.actions.filter(a => a.provenance.draft.key.startsWith('d.ob.'));
  assert.equal(obligations.length, gapAreas.length, 'one candidate obligation per value-gap area');
  assert.ok(obligations.every(a => a.state === 'proposed' && /not yet fully delivered/.test(a.acceptance)));
  let exchange = deliveryExchange(withFinalReview(doc));
  assert.equal(exchange.obligations.length, 0, 'nothing a person has not accepted is exported'); assert.equal(exchange.proposedObligations, doc.finalReview.actions.length);
  const keep = obligations[0];
  r = await api('/api/commands', {body: {revision: saved.body.revision, command: {type: 'review.action', payload: {id: keep.id, title: keep.title, owner: 'Delivery lead', due: '', acceptance: keep.acceptance, objectIds: keep.objectIds, plateauId: keep.plateauId}}}});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const kept2 = r.body.document.finalReview.actions.find(a => a.id === keep.id);
  assert.equal(kept2.state, undefined, 'a person\'s save makes the obligation theirs'); assert.equal(solDraftOf(kept2)?.edited, true, 'and keeps that Sol drafted it, marked edited');
  exchange = deliveryExchange(withFinalReview(r.body.document));
  assert.deepEqual(exchange.obligations.map(a => a.id), [keep.id], 'the accepted obligation is exported');
  // GR-DRF-14 and GR-RUN-05: groups placed on plateaus by delivery status; a migration record tied to plateaus and an action.
  const placements = plateauGroups(doc), target = placements.find(x => x.kind === 'target');
  assert.equal(placements.reduce((n, x) => n + x.groups.length, 0), groups.length, 'every group placed on a plateau');
  assert.ok(target.groups.every(g => g.gaps > 0 && g.basis === 'delivery status'), 'a group with gaps is placed on the target');
  const migration = migrationsOf(doc)[0];
  assert.ok(migration && migration.plateauIds.length === 2 && migration.actionIds.length === 1, 'a migration record tied to the plateaus and a delivery action');
  assert.equal(migration.open.reconciliation.state, 'not-stated');
  assert.deepEqual(roadmapFindings(doc).filter(f => f.code.startsWith('ROADMAP-MIGRATION')), []);
  pass('GR-DRF-04, GR-DRF-13, GR-DRF-14, GR-DRF-16, GR-RUN-05: every imported requirement on a journey step and no journey-link finding; hand-overs and a batch contract in Chapter 8; one set of three environments with a placement per component, copies not stated; one candidate obligation per value-gap area, exported only once a person keeps it (which keeps that Sol drafted it, marked edited); every group placed on a plateau by delivery status; a migration record tied to both plateaus and a delivery action, its reconciliation not stated');
  // The same draft is not applied twice; a new draft of the drafted project proposes only what is missing.
  assert.equal((await api('/api/drafting?action=apply', {body: {...applyBody, requestId: uuid(4)}})).status, 409, 'an applied draft is not applied again');
  const drafted = withFinalReview(r.body.document), redraft = draftArchitecture(drafted);
  measured.redraft = {records: redraft.counts.records, byKind: redraft.counts.byKind};
  assert.ok(redraft.counts.records < 10, `a second draft of the drafted project proposes almost nothing (${redraft.counts.records})`);
  // What it proposes names the records the first draft left, and applies; what a person or the first draft made stays.
  const reapplied = applyDraftBundle(drafted, redraft, {actor: OWNER, jobId: 'redraft'}).document;
  assert.deepEqual(reapplied.technology.needs.map(n => [n.id, n.applicationId, n.category]), drafted.technology.needs.map(n => [n.id, n.applicationId, n.category]), 'the needs each component holds are kept, not replaced');
  assert.deepEqual(reapplied.roadmap.groups, drafted.roadmap.groups, 'every group keeps its place');
  assert.equal(reapplied.finalReview.actions.find(a => a.id === keep.id).owner, 'Delivery lead', 'the obligation a person kept is theirs');
  // A drafted record that is gone is proposed again, naming the records the first draft left; a retired one is not.
  const gone = obligations.find(a => a.id !== keep.id), less = structuredClone(drafted);
  less.finalReview.actions = less.finalReview.actions.filter(a => a.id !== gone.id);
  const back = draftArchitecture(less);
  assert.deepEqual(back.chapters.flatMap(c => c.records.map(x => x.key)), [gone.provenance.draft.key], 'only the record that is gone is proposed again');
  const returned = applyDraftBundle(less, back, {actor: OWNER, jobId: 'again'}).document.finalReview.actions.at(-1);
  assert.deepEqual([returned.objectIds, returned.plateauId, returned.state], [gone.objectIds, gone.plateauId, 'proposed'], 'it names the component and the plateau the first draft left');
  const actor = doc.artefacts.find(a => a.type === 'actor'), retired = applyRecordLifecycleCommand(drafted, {type: 'record.retire', payload: {id: actor.id, reason: 'Not an actor of this platform.'}}, '2026-10-08T00:00:00Z', OWNER).document;
  assert.equal(draftArchitecture(retired).counts.records, 0, 'a drafted record a person retired is not proposed again');
  pass(`GR-DRF-02, GR-DRF-12: an applied draft is not applied again; a second draft of the drafted project proposes ${redraft.counts.records} record(s) and applies without replacing a component's needs, a group's place or a kept obligation; a drafted record that is gone is proposed again, naming the component and plateau the first draft left; one a person retired is not`);

  // E2-01–05: a compact, wholly synthetic banking-shaped source checks the newer record kinds and the governed
  // knowledge boundary. The titles are deliberately different from their IDs, so accidental ID prose is visible.
  const tiny = structuredClone(p), detailLines = [
    ...Array(3).fill('Record ledger posting instruction at end-of-day'),
    ...Array(3).fill('Report ledger postings for enquiries and search'),
    ...Array(3).fill('Schedule end-of-day ledger posting run'),
    ...Array(3).fill('Approve ledger posting under dual control'),
    ...Array(3).fill('Archive ledger posting audit history')
  ];
  tiny.artefacts = reqs.slice(0, detailLines.length).map((a, i) => ({...a, title: detailLines[i], description: detailLines[i]}));
  tiny.requirementGroups = {version: 1, counter: 5, records: ['Ledger posting', 'Reporting', 'Batch scheduler', 'Approval workflow', 'Audit history'].map((title, i) => ({id: 'RG-' + String(i + 1).padStart(3, '0'), kind: 'domain', title, memberIds: tiny.artefacts.slice(i * 3, i * 3 + 3).map(a => a.id), rule: []}))};
  const detail = draftArchitecture(tiny), by = (chapter, kind) => detail.chapters.find(c => c.chapter === chapter).records.filter(r => r.kind === kind);
  const needs = by(6, 'need').flatMap(r => r.commands[0].payload.needs.map(n => n.category));
  for (const category of ['scheduling', 'workflow', 'search', 'reporting', 'archive']) assert.ok(needs.includes(category), `${category} comes from evidenced work`);
  const postingComponent = by(5, 'component').find(r => /Ledger posting store/i.test(r.title));
  assert.ok(postingComponent, 'ledger record-keeping becomes a posting store');
  const inv = by(8, 'invariant').find(r => r.commands[0].payload.title.includes(postingComponent.title));
  assert.ok(inv?.commands[0].payload.open.condition?.question && inv.commands[0].payload.dataIds.length, 'posting store keeps an open invariant bound to its data');
  const readContract = by(8, 'contract').find(r => /reads .*post/i.test(r.title) && r.commands[0].payload.to === '@draft:' + postingComponent.key);
  assert.ok(readContract?.commands[0].payload.exchanges.length && /^read /i.test(readContract.commands[0].payload.operation), 'reporting read is an explicit data contract: ' + by(8, 'contract').map(r => r.title).join('; '));
  const batchContract = by(8, 'contract').find(r => r.commands[0].payload.kind === 'batch');
  for (const field of ['batchTrigger', 'batchSchedule', 'batchWindow', 'cutOff', 'restartPoint', 'volume', 'predecessorIds']) assert.equal(batchContract?.commands[0].payload.open[field]?.state, 'not-stated', `${field} remains open: ${JSON.stringify(batchContract?.commands[0].payload.open)}`);
  assert.ok(by(9, 'control').some(r => /dual control/i.test(r.title)), 'dual control is an explicit proposed control');
  assert.ok(by(8, 'contract').every(r => /^[a-z]+\s+/i.test(r.commands[0].payload.operation) && !/[.-]$/.test(r.commands[0].payload.operation)), 'contract operations are readable verb phrases');
  assert.ok(by(4, 'responsibility').every(r => !/RG-\d+|REQ-\d+/.test(r.commands[0].payload.purpose + r.commands[0].payload.boundary)), 'responsibility prose uses names, with IDs retained as links');
  assert.ok(by(4, 'connection').every(r => ['serves', 'realises'].includes(r.commands[0].payload.kind) && r.commands[0].payload.to.startsWith('@draft:c1.step.')), 'journey connections are typed and use step identity');
  const detailApplied = applyDraftBundle(tiny, detail, {actor: OWNER, jobId: 'synthetic-detail'}).document;
  assert.ok(detailApplied.interfaces.invariants.some(r => r.dataIds.every(id => detailApplied.interfaces.data.some(d => d.id === id))), 'invariant links resolve on apply');
  assert.ok(detailApplied.interfaces.contracts.some(r => /^read /i.test(r.operation) && r.exchanges.some(e => detailApplied.interfaces.data.some(d => d.id === e.dataId))), 'read contract resolves its data link');
  assert.equal(draftArchitecture(detailApplied).counts.records, 0, 'focused source redrafts idempotently');

  const knowledgeAt = '2026-10-08T09:00:00.000Z', sourceText = 'Synthetic posting guide\nCompare synchronous posting with queued posting against consistency and recovery needs.\n';
  let knowledge = applyKnowledgeCommand(tiny, {type: 'knowledge.source', payload: {title: 'Synthetic posting guide', body: sourceText, path: 'synthetic/posting.txt', revision: '1', license: 'Synthetic test text'}}, knowledgeAt, 'author').document;
  knowledge = applyKnowledgeCommand(knowledge, {type: 'knowledge.claim', payload: {sourceId: knowledge.knowledge.sources.at(-1).id, lineStart: 2, lineEnd: 2, subjectId: 'decision-topic:posting-consistency', predicate: 'offers a decision topic', claimType: 'definition', polarity: 'neutral', statement: 'Compare synchronous posting with queued posting against consistency and recovery needs.', conditions: ['For ledger posting.'], limitations: ['No option chosen.'], tags: ['title:Posting consistency', 'question:How should ledger posting maintain consistency?', 'concern:reliability']}}, knowledgeAt, 'author').document;
  const question = 'How should ledger posting maintain consistency?';
  assert.ok(!draftArchitecture(knowledge).chapters[2].records.some(r => r.title === question), 'candidate topic does not influence the draft');
  const claimId = knowledge.knowledge.claims.at(-1).id, knowledgeReview = {reviewed: true, reviewer: 'Synthetic second reviewer', reason: 'Synthetic exact-passage review'};
  knowledge = applyKnowledgeCommand(knowledge, {type: 'knowledge.review', payload: {...knowledgeReview, decision: 'verified', sourceChecked: true, rightsChecked: true, conditionsChecked: true, id: claimId}}, knowledgeAt, 'independent-reviewer').document;
  knowledge = applyKnowledgeCommand(knowledge, {type: 'knowledge.release', payload: {...knowledgeReview, title: 'Synthetic topic release', claimIds: [claimId]}}, knowledgeAt, 'author').document;
  knowledge = applyKnowledgeCommand(knowledge, {type: 'knowledge.activate', payload: {...knowledgeReview, id: knowledge.knowledge.releases.at(-1).id, stamp: knowledgeStamp(knowledge)}}, knowledgeAt, 'author').document;
  const topic = draftArchitecture(knowledge).chapters[2].records.find(r => r.title === question);
  assert.ok(topic && /Released decision topic.*source SHA-256/.test(topic.commands[0].payload.source), 'eligible release creates a cited topic decision');
  assert.ok(topic.commands.slice(1).every(c => c.type === 'decision.alternative') && !topic.commands.some(c => c.type === 'decision.choose'), 'released method leaves alternatives unchosen');
  pass('E2-01–05: typed step connections; scheduling, workflow, search, reporting and archive needs from work; posting invariant and reporting read contract linked to data; batch fields open; dual control; verb operations and readable prose; candidates inert and an eligible exact-passage release only frames an unchosen decision; small-source apply and redraft');

  // ---------------------------------------------------------------- D-25-09 (E2): assessments drafted from the marks
  // A synthetic source whose capability themes are headed by four of the qualities the style table marks, each with its
  // own priority band: the style decision weighs them, and each style carries exactly what its marks draft.
  {
    const at25 = '2026-10-14T09:00:00.000Z', rows = [
      ['Record the reservation for each client', 'Must'], ['Amend the reservation for a client', 'Should'], ['Cancel the reservation for a client', 'Could'],
      ['Bill the client for each reservation', 'Must'], ['Credit the client for a cancelled reservation', 'Should'], ['Send the client a statement of reservations', 'Could'],
      ['Answer a reservation search within two seconds', 'Must'], ['Keep response times steady at the month end', 'Must'],
      ['Absorb the growth in reservation volumes', 'Should'], ['Serve twice the volumes without a redesign', 'Should'],
      ['Exchange reservations with partner systems', 'Must'], ['Meet the standards compliance of the partner exchange', 'Must'],
      ['Change a billing rule without touching the reservations', 'Could'], ['Keep each part maintainable by its own team', 'Could']];
    const shaped = structuredClone(p);
    shaped.artefacts = reqs.slice(0, rows.length).map((a, i) => ({...a, title: rows[i][0], description: rows[i][0], priority: rows[i][1]}));
    const rid = shaped.artefacts.map(a => a.id), group = (n, kind, title, members) => ({id: 'RG-' + String(n).padStart(3, '0'), kind, title, memberIds: members.map(i => rid[i]), rule: []});
    shaped.requirementGroups = {version: 1, counter: 6, records: [group(1, 'domain', 'Reservations', [0, 1, 2, 6, 7, 8, 9]), group(2, 'domain', 'Billing', [3, 4, 5, 10, 11, 12, 13]), group(3, 'theme', 'Performance and response times', [6, 7]), group(4, 'theme', 'Growth and volumes', [8, 9]), group(5, 'theme', 'Interoperability and standards compliance', [10, 11]), group(6, 'theme', 'Maintainability and support', [12, 13])]};
    const draft = draftArchitecture(shaped), c2 = draft.chapters.find(c => c.chapter === 2).records, c3 = draft.chapters.find(c => c.chapter === 3).records;
    const quality = new Map(c2.filter(r => r.commands[0].payload.kind === 'quality').map(r => ['@draft:' + r.key, r.commands[0].payload.category]));
    const refOfQuality = q => [...quality].find(([, x]) => x === q)?.[0];
    assert.deepEqual([...quality.values()].sort(), ['interoperability', 'maintainability', 'performance', 'scalability'], 'a quality driver per quality heading');
    assert.deepEqual(['performance', 'scalability', 'interoperability', 'maintainability'].map(q => c2.find(r => '@draft:' + r.key === refOfQuality(q)).commands[0].payload.priority), ['High', 'Medium', 'High', 'Low'], 'each with the priority of its rows\' bands');
    const style = c3.find(r => r.key === 'c3.style'), styleDrivers = style.commands[0].payload.driverIds;
    assert.deepEqual(styleDrivers.filter(id => quality.has(id)).map(id => quality.get(id)), ['maintainability', 'interoperability', 'performance', 'scalability'], 'the style decision weighs the qualities the style table marks');
    const counted = {supports: 0, unknown: 0};
    for (const r of c3) for (const c of r.commands.slice(1)) { const want = markedAssessments(c.payload.source, r.commands[0].payload.driverIds, id => quality.get(id) || null); assert.deepEqual(c.payload.assessments, want, r.key + ': ' + c.payload.title + ' exactly as its marks draft'); for (const v of Object.values(want)) counted[v.effect]++; }
    const styleAlt = title => style.commands.slice(1).find(c => c.payload.title === title).payload;
    assert.deepEqual(styleAlt('Adopt the SOA style').assessments[refOfQuality('performance')], {effect: 'unknown', reason: 'The SA Playbook marks the SOA style as potential or conditional support for performance: say whether the condition holds here.', evidence: 'SA Playbook, Arch Style + Quality Props!F13', by: 'rules'}, '"(x)" drafts no effect and asks whether the condition holds, citing its cell');
    assert.deepEqual(styleAlt('Adopt the Microservices style').assessments[refOfQuality('interoperability')], {effect: 'supports', reason: 'The SA Playbook marks the Microservices style as strong support for interoperability.', evidence: 'SA Playbook, Arch Style + Quality Props!G9', by: 'rules'}, '"x" drafts supports, citing its cell');
    assert.deepEqual(Object.keys(styleAlt('Adopt the Layered style').assessments).map(id => quality.get(id)), ['maintainability'], 'a style is assessed only on the qualities it is marked for');
    assert.deepEqual(counted, {supports: 8, unknown: 1}, 'eight supports and one question, all on the style decision');
    assert.ok(c3.every(r => r.key === 'c3.style' || r.commands.slice(1).every(c => !Object.keys(c.payload.assessments).length)), 'no decision whose drivers the marks do not reach is assessed');
    assert.ok(c3.every(r => r.commands.every(c => c.type !== 'decision.choose') && !('recommendation' in r.commands[0].payload) && !('selectedAlternativeId' in r.commands[0].payload)), 'the rules draft no choice and no preferred alternative');
    // Applied: each lands with its mark (the decision is Sol's proposal before its alternatives are), as a proposal with
    // no working choice and no preferred alternative.
    const applied = applyDraftBundle(shaped, draft, {actor: OWNER, jobId: 'marked', at: at25}).document;
    const dec = applied.decisions.records.find(x => x.provenance.draft.key === 'c3.style'), idOf = new Map(applied.quality.drivers.map(x => ['@draft:' + x.provenance.draft.key, x.id]));
    assert.ok(dec.state === 'proposed' && dec.selectedAlternativeId === null && !('recommendation' in dec) && applied.decisions.records.every(x => x.selectedAlternativeId === null && !('recommendation' in x)), 'applied: proposals, nothing chosen or preferred');
    dec.alternatives.forEach((a, i) => assert.deepEqual(Object.fromEntries(Object.entries(a.assessments).filter(([, v]) => rulesAssessed(v))), Object.fromEntries(Object.entries(style.commands[i + 1].payload.assessments).map(([k, v]) => [idOf.get(k), v])), a.title + ': its drafted assessments land, each marked as AIW\'s rules\''));
    // The reading weighs them as recorded effects, and only on the decision they are drafted on.
    const reading = readDecision(applied, dec);
    for (const row of reading.rows) for (const part of row.parts) assert.equal(part.effect, row.alt.assessments[part.driverId].effect === 'supports' ? 'supports' : 'unknown', row.alt.title + ' on ' + part.driverId + ': read as recorded');
    assert.equal(reading.state, 'read', 'the drafted effects are judged effects');
    const bare = {...draft, chapters: draft.chapters.map(c => c.chapter !== 3 ? c : {...c, records: c.records.map(r => ({...r, commands: r.commands.map(x => x.type === 'decision.alternative' ? {...x, payload: {...x.payload, assessments: {}}} : x)}))})};
    const unassessed = applyDraftBundle(shaped, bare, {actor: OWNER, jobId: 'unmarked', at: at25}).document;
    const readAll = doc => doc.decisions.records.map(x => { const r = readDecision(doc, x); return {key: x.provenance.draft.key, state: r.state, order: r.order, lead: r.lead, tied: r.tied, rows: r.rows.map(row => [row.id, row.score, row.low, row.high])}; });
    const before = readAll(unassessed), after = readAll(applied);
    for (const [i, x] of after.entries()) if (x.key !== 'c3.style') assert.deepEqual(x, before[i], x.key + ': a decision with no drafted assessment reads as before');
    assert.equal(before.find(x => x.key === 'c3.style').state, 'unjudged', 'without them, the style decision has no stated effect to weigh');
    // They are the suggestions recorded: with them taken away, the Playbook suggests exactly them, and recording the
    // suggestions reads as the drafted decision reads.
    const stripped = {...dec, alternatives: dec.alternatives.map(a => ({...a, assessments: Object.fromEntries(Object.entries(a.assessments).map(([k, v]) => [k, rulesAssessed(v) ? {effect: 'unknown', reason: '', evidence: ''} : v]))}))};
    const offered = suggestEffects(applied, stripped), marked = dec.alternatives.flatMap(a => Object.entries(a.assessments).filter(([, v]) => rulesAssessed(v)).map(([id, v]) => ({a, id, v})));
    for (const {a, id, v} of marked) { const s = offered.cells.find(c => c.alternativeId === a.id && c.driverId === id)?.suggestions.find(x => x.from === 'playbook'); assert.ok(s && s.reason === v.reason && s.evidence === v.evidence && (v.effect === 'supports' ? s.effect === 'supports' : s.effect === null && s.ask === true), a.title + ' on ' + id + ': the suggestion it records'); }
    assert.equal(offered.cells.filter(c => c.suggestions.some(s => s.from === 'playbook')).length, marked.length, 'and the Playbook suggests nothing else');
    assert.deepEqual([offered.hypothesis.lead, offered.hypothesis.tied], [reading.lead, reading.tied], 'recording the suggestions reads as the drafted decision reads');
    // A person's: a save that does not send the assessments keeps the mark; one that sends them makes them the person's,
    // and once the person keeps the decision the rules' mark cannot be sent back.
    const soa = dec.alternatives.find(a => a.title === 'Adopt the SOA style'), soaOf = doc => doc.decisions.records.find(x => x.id === dec.id).alternatives.find(a => a.id === soa.id);
    const rulesOf = a => Object.values(a.assessments).filter(rulesAssessed).length;
    assert.equal(rulesOf(soaOf(applyDecisionCommand(applied, {type: 'decision.alternative', payload: {id: dec.id, alternativeId: soa.id, title: 'Adopt the SOA style, as reviewed'}}, at25).document)), 3, 'a save that leaves the assessments out keeps the rules\' mark');
    const resent = soaOf(applyDecisionCommand(applied, {type: 'decision.alternative', payload: {id: dec.id, alternativeId: soa.id, assessments: Object.fromEntries(Object.entries(soa.assessments).map(([k, v]) => [k, {effect: v.effect, reason: v.reason, evidence: v.evidence}]))}}, at25).document);
    assert.ok(rulesOf(resent) === 0 && Object.entries(resent.assessments).every(([k, v]) => v.effect === soa.assessments[k].effect), 'sent again by a person, the same effects are the person\'s');
    const keptByPerson = applyRecordLifecycleCommand(applied, {type: 'record.keep', payload: {id: dec.id}}, at25, OWNER).document;
    assert.equal(rulesOf(soaOf(applyDecisionCommand(keptByPerson, {type: 'decision.alternative', payload: {id: dec.id, alternativeId: soa.id, assessments: soa.assessments}}, at25).document)), 0, 'once the person keeps the decision, the rules\' mark cannot be sent back');
    measured.marked = {decisions: c3.length, alternatives: c3.reduce((n, r) => n + r.commands.length - 1, 0), assessments: counted, styleLead: reading.lead ? dec.alternatives.find(a => a.id === reading.lead).title : null, styleTied: reading.tied.length};
    pass(`D-25-09 (E2): the rules drafter assesses a style or pattern alternative from the SA Playbook's marks against the drivers of the qualities they mark (the style decision weighs the qualities its table marks): "x" supports and "(x)" no effect with the question whether the condition holds, each citing its cell and marked by AIW's rules (${counted.supports} supports, ${counted.unknown} question on a synthetic source); applied through the drafter's own path the marks survive; the reading weighs them as recorded effects on that decision only; they are exactly what the Playbook's suggestions offer, recorded; a person's re-send makes them the person's; no choice and no preferred alternative is recorded`);
  }

  // ---------------------------------------------------------------- GR-DRF-20: a bundle of 5,000 records, one job
  const huge = await importedProject(1400, 'Synthetic bank platform, a bundle of 5,000');
  const q = huge.document, gs = requirementGroups(q).map(g => g.id), rq = q.artefacts.filter(a => a.type === 'requirement').map(a => a.id);
  const rec = (key, chapter, kind, commands) => ({key, chapter, kind, title: key, groups: [gs[key.length % gs.length]], cites: [rq[0]], commands});
  const make = (n, f) => Array.from({length: n}, (_, i) => f(i + 1));
  const chapters = [
    {chapter: 1, records: make(1300, i => rec('o' + i, 1, 'outcome', [{type: 'artefact', payload: {type: i % 2 ? 'outcome' : 'scope', title: 'Bundle record ' + i, description: 'A record of the synthetic bundle.', owner: '', source: 'Synthetic bundle', scopeMode: 'in', confirmed: false}}]))},
    {chapter: 2, records: make(450, i => rec('fd' + i, 2, 'driver', [{type: 'quality.driver', payload: {kind: 'functional', title: 'Bundle driver ' + i, description: 'A driver of the bundle.', impact: '', requirementGroupIds: [gs[i % gs.length]], requirementIds: [], responsibilityIds: [], owner: '', source: 'Synthetic bundle', priority: '', confirmed: false}}]))},
    {chapter: 3, records: make(400, i => rec('dc' + i, 3, 'decision', [{type: 'decision.save', payload: {question: 'Bundle question ' + i + '?', context: 'A decision of the bundle.', category: 'additional', topic: 'custom', requirementIds: [rq[i % rq.length]], driverIds: ['@draft:fd' + (1 + i % 450)], owner: '', source: 'Synthetic bundle'}}, {type: 'decision.alternative', payload: {id: '@self', title: 'First way ' + i, summary: 'One way.', responsibilityIds: [], relationships: [], assessments: {}}}, {type: 'decision.alternative', payload: {id: '@self', title: 'Second way ' + i, summary: 'Another way.', responsibilityIds: [], relationships: [], assessments: {}}}]))},
    {chapter: 4, records: make(450, i => rec('lr' + i, 4, 'responsibility', [{type: 'logical.responsibility', payload: {title: 'Bundle responsibility ' + i, purpose: 'A responsibility of the bundle.', boundary: 'Its own work.', owner: '', requirementIds: [rq[i % rq.length]], requirementGroupIds: [], decisionIds: [], source: 'Synthetic bundle', confirmed: false}}]))},
    {chapter: 5, records: make(450, i => rec('ap' + i, 5, 'component', [{type: 'realisation.component', payload: {title: 'Bundle component ' + i, kind: 'service', purpose: 'A component of the bundle.', boundary: 'Its own work.', inputs: '', outputs: '', owner: '', rationale: '', source: 'Synthetic bundle', status: 'draft', allocations: [{logicalId: '@draft:lr' + i, scope: 'Realises it.'}]}}]))},
    {chapter: 8, records: [...make(450, i => rec('dt' + i, 8, 'data', [{type: 'interfaces.data', payload: {title: 'Bundle data ' + i, purpose: 'Data of the bundle.', authorityId: '@draft:ap' + i, classification: 'Not classified yet', owner: '', evidence: 'Synthetic bundle'}}])), ...make(450, i => rec('if' + i, 8, 'contract', [{type: 'interfaces.contract', payload: {from: '@draft:ap' + i, to: '@draft:ap' + (1 + i % 450), title: 'Bundle contract ' + i, kind: 'request', purpose: 'A contract of the bundle.', operation: 'op-' + i, owner: '', evidence: 'Synthetic bundle', exchanges: [{dataId: '@draft:dt' + i, role: 'request'}]}}]))]},
    {chapter: 9, records: [...make(475, i => rec('th' + i, 9, 'threat', [{type: 'security.threat', payload: {targetIds: ['@draft:ap' + (1 + i % 450)], title: 'Bundle threat ' + i, category: 'Unauthorised action', scenario: 'A threat of the bundle.', consequence: 'A consequence.', priority: '', owner: ''}}]))]}
  ];
  const total = chapters.reduce((n, c) => n + c.records.length, 0);
  chapters[0].records.push(...make(5000 - total, i => rec('x' + i, 1, 'outcome', [{type: 'artefact', payload: {type: 'outcome', title: 'Bundle extra ' + i, description: 'A record of the synthetic bundle.', owner: '', source: 'Synthetic bundle', confirmed: false}}])));
  for (const c of chapters) { c.title = 'Chapter ' + c.chapter; c.commands = c.records.reduce((n, x) => n + x.commands.length, 0); }
  const base = {schema: DRAFT_SCHEMA, engine: DRAFT_ENGINE, basis: {projectId: huge.id, requirements: 1400, synthetic: true}, chapters, notes: [], asks: [], trace: {}, doctrine: 'A synthetic bundle of 5,000 records.'};
  const bundle = {...base, counts: {records: 5000, commands: chapters.reduce((n, c) => n + c.commands, 0), byChapter: Object.fromEntries(chapters.map(c => [c.chapter, c.records.length])), byKind: {}}, caps: [], stamp: digest(base)};
  assert.equal(bundle.counts.records, 5000);
  // Kept as a completed draft of this project (what a draft job stores), then previewed and applied over HTTP.
  const key = 'drafting/' + encodeURIComponent(OWNER) + '/' + huge.id + '/' + uuid(5) + '.json', at = new Date().toISOString();
  await env.FILES.put(key, JSON.stringify(bundle));
  await db.prepare("INSERT INTO project_jobs(owner_id,project_id,id,kind,status,input_hash,document,revision,created_at,updated_at) VALUES(?,?,?,'draft','completed',?,?,1,?,?)").bind(OWNER, huge.id, uuid(5), 'synthetic', JSON.stringify({kind: 'draft', inputHash: 'synthetic', outputKey: key, outputHash: digest(bundle), basis: {revision: huge.revision}, summary: {stamp: bundle.stamp, counts: bundle.counts}}), at, at).run();
  const hp = await api('/api/drafting?action=preview&id=' + uuid(5), {project: huge.id});
  assert.equal(hp.status, 200, JSON.stringify(hp.body)); assert.equal(hp.body.preview.counts.records, 5000); assert.deepEqual(hp.body.preview.over, [], 'the bundle meets every cap');
  await reviewPages(uuid(5), hp, huge.id);
  const t1 = Date.now();
  r = await api('/api/drafting?action=apply', {project: huge.id, body: {id: uuid(5), requestId: uuid(6), stamp: hp.body.preview.stamp, revision: hp.body.revision, reviewed: true}});
  assert.equal(r.status, 202, JSON.stringify(r.body));
  const big5000 = await poll(uuid(6), huge.id);
  measured.apply5000 = {ms: Date.now() - t1, records: 5000, commands: bundle.counts.commands};
  assert.equal(big5000.status, 'completed', big5000.error);
  assert.ok(measured.apply5000.ms < 15 * 60 * 1000, `5,000 records applied in ${Math.round(measured.apply5000.ms / 1000)} s, within 15 minutes`);
  const after5000 = (await api('/api/project', {project: huge.id})).body;
  assert.equal(after5000.revision, hp.body.revision + 1, 'one save');
  assert.equal(after5000.document.changes.events.filter(e => e.source?.kind === 'draft-apply').length, chapters.length, 'one journal event per chapter');
  assert.equal(after5000.document.security.threats.length, 475); assert.equal(after5000.document.realisation.components.length, 450); assert.equal(after5000.document.artefacts.length, 1400 + chapters[0].records.length);
  pass(`GR-DRF-20: a synthetic bundle of 5,000 records (${bundle.counts.commands.toLocaleString('en-GB')} commands) applied as one job with one preview, one save and one journal event per chapter, in ${Math.round(measured.apply5000.ms / 1000)} s (bound: 15 minutes)`);
} finally {
  db.close?.();
  await rm(root, {recursive: true, force: true});
}
console.log(JSON.stringify({suite: 'Architecture drafter at size', passed: checks.length, checks, measured, batch: DRAFT_BATCH, limits: ['Every drafted record is a proposal by Sol: not confirmed, approved or reviewed by a person. No alternative is chosen. A live model-assisted draft is verified only with live model access.']}, null, 1));
