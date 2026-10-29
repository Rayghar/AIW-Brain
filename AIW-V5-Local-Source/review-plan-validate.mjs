// The review plan at size (round 12, GR-GOV-04, -05, -11, -13, -19; workstream D3). A drafted design of the size of the
// exercise (the scale gate's 500 records per chapter, with Chapter 1 grown to 1,400 requirements: about 9,000 records
// and links, synthetic, generated here, no client text), every record stamped as a draft by Sol exactly as the Worker
// stamps a governed batch sent with authorKind 'sol-draft'. Then:
//   1. the plan counts the work by kind and chapter, and ranks its steps as the desk ranks its vitals, largest first,
//      with the first step's command one call away (GR-GOV-19);
//   2. a person reviews the whole drafted design in tens of recorded judgements, each with its scope stated: 1,400 and
//      more Chapter 1 records take one save, with two exceptions left open (GR-GOV-04);
//   3. each judgement keeps every record's own fingerprint: a later edit reopens that record alone (GR-GOV-05);
//   4. one treatment covers a whole finding cause and lapses for the one member whose inputs change (GR-GOV-13);
//   5. four eyes: with the project's rule on, nobody judges records they wrote;
//   6. through the Worker: completing AIW's proposal, or saving again within one Sol-draft session, opens no affected
//      review, and a person's later change does (GR-GOV-11).
// Run: npm run test:review-plan
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync} from 'node:fs';
import {buildScaleProject} from './scripts/build-scale-fixture.mjs';
import {withFinalReview, applyFinalReviewCommand, inheritedFindings, findingTreatment, causeFindings} from './public/review-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {reviewPlan, planCommand, stepRecords} from './public/review-plan.js';
import {provenanceSummary, eachRecord, stampWritten, stampAuthorship, recordLabel, findRecord} from './public/provenance.js';
import {RANK} from './public/desk-vitals.js';
import {handOver} from './public/document-memo.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {changeEvents} from './public/changes-domain.js';
import {createProject} from './shared/projects-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import {markDrafted} from './public/architecture-drafter.js';

const checks = [], timings = {}, began = Date.now();
const pass = n => { checks.push(n); console.log('PASS', n, '(' + Math.round((Date.now() - began) / 1000) + ' s)'); };
const timed = (name, fn) => { const t = performance.now(); const v = fn(); timings[name] = Math.round(performance.now() - t); return v; };
const AT = '2026-10-08T12:00:00.000Z', DRAFTER = {kind: 'sol-draft', id: 'sol-drafter', account: 'agent', session: 'scale-draft'};

// ---------------------------------------------------------------- the drafted design
// The scale gate's project, from its cache when the sources it was built from are unchanged (scale-validate.mjs).
const sources = () => { const files = ['scripts/build-scale-fixture.mjs', ...['public', 'shared'].flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => dir + '/' + f))]; const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + readFileSync(f, 'utf8') + '\0'); return h.digest('hex').slice(0, 16); };
const cacheDir = '.aiw-local/scale-fixture', cached = cacheDir + '/scale-500-' + sources() + '.json';
let raw;
if (existsSync(cached)) raw = readFileSync(cached, 'utf8');
else { raw = JSON.stringify((await buildScaleProject({perChapter: 500})).document); mkdirSync(cacheDir, {recursive: true}); for (const f of readdirSync(cacheDir)) if (f.startsWith('scale-500-')) rmSync(cacheDir + '/' + f, {force: true}); writeFileSync(cached, raw); }
let p = withFinalReview(JSON.parse(raw));
// Chapter 1 grown to the exercise's 1,400 requirements, through the requirements domain's own command.
for (let i = p.artefacts.filter(a => a.type === 'requirement').length + 1; i <= 1400; i++) p = applyCommand(handOver(p), {type: 'artefact', payload: {type: 'requirement', title: 'Settle instruction batch ' + i, description: 'The service settles batch ' + i + ' once, with its reference.', acceptance: 'Given batch ' + i + ', when it settles, then it is recorded once.', owner: 'Settlement team ' + (i % 6 + 1), priority: 'Should'}}, AT).document;
p = withFinalReview(p);
// Every record drafted by Sol, as the Worker stamps the records of a governed batch sent as a Sol draft. A draft confirms,
// accepts and marks reviewed nothing (the Worker refuses it), so the scale fixture's own confirmations are taken off.
eachRecord(p, r => { if (r.confirmed === true) r.confirmed = false; if (r.targetConfirmed === true) r.targetConfirmed = false; if (r.status === 'reviewed') r.status = 'candidate'; if (r.status === 'accepted') r.status = 'recorded'; stampWritten(r, DRAFTER, AT); });
const requirements = p.artefacts.filter(a => a.type === 'requirement').length;
assert.equal(requirements, 1400);
let s = provenanceSummary(p);
assert.equal(s.byKind['sol-draft'], s.total); assert.equal(s.solDraftedNotReviewed, s.total); assert.equal(s.line, 'Drafted by Sol; not reviewed by a person.');
pass(`the drafted design: ${s.total.toLocaleString('en-GB')} records and ${s.links.total.toLocaleString('en-GB')} links, ${requirements} requirements, every one drafted by Sol and not reviewed`);

// ---------------------------------------------------------------- 1. the plan, ranked as the desk ranks its vitals
let plan = timed('plan', () => reviewPlan(p));
const recordSteps = plan.steps.filter(x => x.kind === 'records');
assert.equal(recordSteps.reduce((n, x) => n + x.count, 0), s.total + s.links.total, 'the plan counts every drafted record and link');
for (const c of plan.chapters) assert.equal(Object.entries(c).filter(([k]) => !['chapter', 'title', 'total'].includes(k)).reduce((n, [, v]) => n + v, 0), c.total, 'chapter ' + c.chapter + ' counts by kind');
assert.ok(plan.byKind.records && plan.byKind.findings, JSON.stringify(plan.byKind));
const rank = x => RANK.indexOf(x.severity);
for (let i = 1; i < plan.steps.length; i++) { const a = plan.steps[i - 1], b = plan.steps[i]; assert.ok(rank(a) < rank(b) || rank(a) === rank(b) && a.count >= b.count, 'ranked: ' + a.id + ' before ' + b.id); }
assert.equal(plan.first, plan.steps[0]); assert.equal(plan.first.severity, 'bad');
assert.equal(plan.first.count, Math.max(...plan.steps.filter(x => x.severity === 'bad').map(x => x.count)), 'the plan opens on its largest critical cause');
for (const x of plan.steps) assert.ok(x.title && x.scope && Number.isInteger(x.count) && x.count > 0, 'every step states its scope: ' + x.id);
const firstCommand = timed('first command', () => planCommand(p, plan.first));
assert.equal(firstCommand.type, plan.first.commandType); assert.ok(firstCommand.payload.stamp, 'the first step\'s command carries the stamp of what the person is shown');
const recordsFirst = plan.steps.find(x => x.kind === 'records');
assert.equal(recordsFirst.count, Math.max(...plan.steps.filter(x => x.kind === 'records').map(x => x.count)), 'the drafted records open on their largest group');
assert.equal(planCommand(p, recordsFirst).type, 'review.judgement');
assert.ok(stepRecords(p, plan.first).length > 0, 'a sample of the first step opens');
pass(`the plan counts ${plan.items.toLocaleString('en-GB')} items in ${plan.total} steps by kind and chapter, ranked critical first and largest first as the desk ranks its vitals; its first step (${plan.first.title}) is one command away (plan ${timings.plan} ms, first command ${timings['first command']} ms)`);

// ---------------------------------------------------------------- 2. the drafted design reviewed in tens of judgements
const judge = (doc, step, extra = {}, actor = 'architect-a') => { const c = planCommand(doc, step); return applyFinalReviewCommand(doc, {type: c.type, payload: {...c.payload, outcome: 'kept', rationale: 'Read against the requirement groups; kept as drafted.', evidence: 'Sampled ' + Math.min(12, step.count) + ' records and every exception.', reviewed: true, ...extra}}, AT, actor).document; };
const chapterOne = recordSteps.find(x => x.chapter === 1 && x.target.scope.path === 'artefacts');
assert.ok(chapterOne.count >= 1400, 'Chapter 1 holds the 1,400 requirements');
const exceptions = stepRecords(p, chapterOne, 2).map(r => ({id: r.chapter + ':' + r.id, reason: 'Its owner asked for a second look.'}));
assert.throws(() => judge(p, chapterOne, {exceptions: [{id: exceptions[0].id}]}), /reason/);
p = timed('one judgement of the Chapter 1 records', () => judge(p, chapterOne, {exceptions}));
let j = p.finalReview.judgements.at(-1);
assert.equal(j.records.length, chapterOne.count - 2); assert.equal(j.exceptions.length, 2); assert.equal(j.actor, 'architect-a'); assert.match(j.label, /drafted by Sol in Chapter 1, not yet reviewed/);
const sampleReq = p.artefacts.find(a => a.type === 'requirement' && !exceptions.some(x => x.id === '1:' + a.id));
assert.equal(recordLabel(p, sampleReq, 1), 'Drafted by Sol · reviewed by architect-a');
let saves = 1;
for (const step of recordSteps.filter(x => x !== chapterOne)) { p = judge(p, step); saves++; }
s = provenanceSummary(p);
assert.equal(s.solDraftedNotReviewed, 2, 'only the two exceptions are left'); assert.equal(s.reviewers.join(), 'architect-a');
plan = reviewPlan(p);
const left = plan.steps.filter(x => x.kind === 'records');
assert.deepEqual(left.map(x => [x.chapter, x.count]), [[1, 2]], 'the exceptions come back as one step of two');
assert.ok(saves >= 10 && saves <= 60, saves + ' judgements: tens, not thousands');
pass(`a person reviews the ${s.total.toLocaleString('en-GB')} drafted records and their links in ${saves} recorded judgements, each with its scope stated; the ${chapterOne.count.toLocaleString('en-GB')} Chapter 1 records take one save (${timings['one judgement of the Chapter 1 records']} ms) with two exceptions left open, and come back as one step`);

// ---------------------------------------------------------------- 3. stamps per record
// Sol drafts one responsibility again, in another session; the Worker stamps it as it stamps every commit.
const r1 = p.logical.responsibilities[10], r2 = p.logical.responsibilities[11], redraft = {type: 'logical.responsibility', payload: {...r1, purpose: r1.purpose + ' It records the reference first.'}};
const result = applyLogicalCommand(p, redraft, AT), edited = withFinalReview(stampAuthorship(p, result.document, redraft, result, {...DRAFTER, session: 'second-pass'}, AT));
const label = (doc, id) => recordLabel(doc, doc.logical.responsibilities.find(r => r.id === id), 4);
assert.equal(label(edited, r1.id), 'Drafted by Sol · not reviewed', 'the edited record is open again');
assert.equal(label(edited, r2.id), 'Drafted by Sol · reviewed by architect-a', 'its neighbour stays reviewed');
assert.equal(provenanceSummary(edited).solDraftedNotReviewed, 3);
pass('each judgement keeps every record\'s own fingerprint: an edit reopens that record alone, its neighbours stay reviewed');

// ---------------------------------------------------------------- 4. one treatment for a whole finding cause
const findingSteps = plan.steps.filter(x => x.kind === 'findings');
const biggest = findingSteps.sort((a, b) => b.count - a.count)[0];
assert.ok(biggest.count >= 100, 'a systemic cause: ' + biggest.title + ' · ' + biggest.count);
const treat = planCommand(p, biggest);
p = timed('one treatment of the largest cause', () => applyFinalReviewCommand(p, {type: treat.type, payload: {...treat.payload, treatment: 'Accepted design limitation', rationale: 'The source does not state it for any record; carried as a limitation.', reviewer: 'Architecture lead', reference: 'Review plan, cause ' + biggest.target.cause, reviewed: true}}, AT, 'architect-a').document);
const d = p.finalReview.dispositions.at(-1);
assert.deepEqual([d.scope, d.actor, d.findings.length], ['cause', 'architect-a', biggest.count]);
assert.equal(causeFindings(p, biggest.target.cause).length, 0, 'every finding of the cause is treated');
const memberIds = new Set(d.findings.map(x => x[0])), member = inheritedFindings(p).find(f => memberIds.has(f.id));
const moved = structuredClone(p), hit = findRecord(moved, member.chapter, member.objectId);
assert.ok(hit, 'the finding is about a record: ' + member.objectId);
hit.record.title = String(hit.record.title || '') + ' (restated)';
const after = withFinalReview(moved), reopened = inheritedFindings(after).filter(f => memberIds.has(f.id) && findingTreatment(after, f) === 'Needs assessment');
assert.ok(reopened.length >= 1, 'a member whose record changed is reopened');
assert.ok(reopened.every(f => f.objectId === member.objectId), 'only the members about the changed record are reopened: ' + reopened.length + ' of ' + memberIds.size);
pass(`one reviewed treatment covers a whole cause (${biggest.title}) with who, when and why, in ${timings['one treatment of the largest cause']} ms; a change to one record reopens only the findings about it (${reopened.length} of ${memberIds.size})`);

// ---------------------------------------------------------------- 5. four eyes
{let q = structuredClone(edited);q.workspace = {...(q.workspace || {}), governance: {fourEyes: true}};
 const mine = q.logical.responsibilities.slice(0, 3);for (const r of mine) r.provenance = {...r.provenance, author: {kind: 'person', by: 'architect-a', at: AT}};
 const scope = {kind: 'records', ids: mine.map(r => '4:' + r.id)};
 const step = {kind: 'records', commandType: 'review.judgement', target: {scope}, count: 3};
 assert.throws(() => judge(q, step), /Four eyes: architect-a wrote/);
 q = judge(q, step, {}, 'reviewer-b');
 assert.equal(q.finalReview.judgements.at(-1).actor, 'reviewer-b');
 pass('four eyes: with the project\'s rule on, a person is refused a judgement of records they wrote; a second person records it');}

// ---------------------------------------------------------------- 6. no review opened within a drafting session or by completing a proposal
{const DB = localDatabase(':memory:'), files = new Map(), env = {DB, FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('')}};
 const api = (path, method = 'GET', body) => worker.fetch(new Request('https://aiw.test' + path, {method, headers: {'oai-authenticated-user-id': 'architect-a', ...(body ? {'Content-Type': 'application/json', Origin: 'https://aiw.test'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
 try {
  const created = await (await api('/api/projects', 'POST', {name: 'Permits · sessions', template: 'blank'})).json(), id = created.document.id;
  let st = created;
  const send = async (command, extra = {}) => { const r = await api('/api/commands?project=' + id, 'POST', {revision: st.revision, command, ...extra}); const b = await r.json(); assert.equal(r.status, 200, command.type + ': ' + JSON.stringify(b).slice(0, 300)); st = b; return b; };
  const batch = (commands, payload) => ({type: 'workspace.apply', payload: {commands, stamp: previewWorkingChange(st.document, commands).stamp, ...payload}});
  const draft = {reviewed: false, authorKind: 'sol-draft', reason: 'Sol drafts the permits design.', session: 'draft-7'};
  await send(batch([
   {type: 'artefact', payload: {type: 'requirement', title: 'Accept an application', description: 'The service accepts a permit application.', acceptance: 'Given an application, then it is recorded once.', owner: 'Permits office', priority: 'Must'}},
   {type: 'logical.responsibility', payload: {title: 'Take applications', purpose: 'Records each application once.', boundary: 'Owns the application.', owner: 'Permits office', requirementIds: ['REQ-001']}}], draft));
  const resp = st.document.logical.responsibilities.find(r => r.title === 'Take applications').id;
  await send(batch([
   {type: 'realisation.component', payload: {title: 'Intake service', kind: 'service', purpose: 'Takes applications.', boundary: 'Owns the application record.', owner: 'Delivery team', allocations: [{logicalId: resp, scope: 'All of the responsibility'}]}},
   {type: 'realisation.component', payload: {title: 'Notice worker', kind: 'worker', purpose: 'Sends notices.', boundary: 'Owns the notice record.', owner: 'Delivery team', allocations: [{logicalId: resp, scope: 'The notice of an accepted application'}]}}], draft));
  const [a, b] = st.document.realisation.components.map(c => c.id);
  await send(batch([{type: 'realisation.interaction', payload: {from: a, to: b, label: 'Hands over an accepted application', interaction: 'event'}}], draft));
  // The link cycle's second save, within the same session: journalled, no review opened.
  const req = st.document.artefacts.find(x => x.title === 'Accept an application');
  await send(batch([{type: 'artefact', payload: {...req, description: req.description + ' It keeps the reference.'}}], draft));
  let e = changeEvents(st.document).at(-1);
  assert.deepEqual([e.authorKind, e.session, e.items.length], ['sol-draft', 'draft-7', 0], 'no review within the session');
  assert.ok(e.quiet?.affected >= 1, 'the change reached records, and opened no review for them');
  assert.match(e.quiet.reason, /within the drafting session draft-7/);
  // Completing AIW's proposal (the contract it seeded for the event), by a person: journalled, no review opened.
  const seed = st.document.interfaces.contracts.find(c => c.state === 'proposed');assert.ok(seed, 'AIW proposed a contract for the event');
  await send({type: 'interfaces.contract', payload: {...seed, purpose: 'Passes an accepted application on.', owner: 'Integration team', protocol: 'Queue', operation: 'application.accepted'}});
  e = changeEvents(st.document).filter(x => x.source?.id === seed.id).at(-1);
  assert.ok(e, 'completing the proposal is journalled');
  assert.deepEqual([e.authorKind, e.items.length], ['person', 0], 'completing a proposal opens no review');
  assert.ok(e.quiet?.affected >= 1); assert.match(e.quiet.reason, /which AIW proposed/);
  // A person's later change opens its review.
  const again = st.document.artefacts.find(x => x.title === 'Accept an application');
  await send({type: 'artefact', payload: {...again, acceptance: again.acceptance + ' Even when it is resent.'}});
  e = changeEvents(st.document).at(-1);
  assert.deepEqual([e.authorKind, e.quiet ?? null], ['person', null]); assert.ok(e.items.length >= 1, 'a person\'s later change opens its reviews');
  // A Sol draft in another session opens them too: only the same session's second save is quiet.
  const third = st.document.artefacts.find(x => x.title === 'Accept an application');
  await send(batch([{type: 'artefact', payload: {...third, owner: 'Permits office · intake'}}], {...draft, session: 'draft-8'}));
  e = changeEvents(st.document).at(-1); assert.ok(e.items.length >= 1 && !e.quiet, 'another session\'s save opens its reviews');
 } finally { DB.close(); }
 pass('completing AIW\'s proposal, or saving a record again within the Sol-draft session that wrote it, is journalled with why and opens no affected review; a person\'s later change, or another session\'s, opens them');}

// 8. Proposals (AIW's, and those Sol's architecture draft applied): kept in one step each through the one lifecycle family
// (record.keep, at most 500 a step), the step's command one click from the plan; kept, each says who kept it.
{
  const at = '2026-10-08T12:00:00.000Z';
  let q = createProject({name: 'Proposals in the plan', template: 'blank'}, 'plan-proposals', at);
  const run = (type, payload) => { const r = applyCanonical(q, {type, payload}, at, 'architect-a'); q = r.document; return r.selected; };
  const a = run('realisation.component', {title: 'Intake service', kind: 'service', purpose: 'Takes applications.'});
  const b = run('realisation.component', {title: 'Notice worker', kind: 'worker', purpose: 'Sends notices.'});
  run('realisation.interaction', {from: a, to: b, label: 'Hands over an accepted application', interaction: 'event'});
  // Sol's draft applied two responsibilities as proposals (workstream E's mark).
  for (const title of ['Take applications', 'Send notices']) { const id = run('logical.responsibility', {title, purpose: title + '.', boundary: 'Its own records.', owner: 'Permits office'}); markDrafted(q.logical.responsibilities.find(r => r.id === id), {by: 'sol', kind: 'sol-draft', job: 'job-1', key: 'k-' + id, bundle: 'b-1', reviewed: false, appliedBy: 'architect-a', appliedAt: at, groups: [], cites: []}); }
  // AIW proposed a contract for the event; Sol's draft applied one more, which the chapter reads as a proposal too.
  const sent = run('interfaces.contract', {title: 'Notice of acceptance', purpose: 'Tells the notice worker an application is accepted.', from: a, to: b, kind: 'event'});
  markDrafted(q.interfaces.contracts.find(c => c.id === sent), {by: 'sol', kind: 'sol-draft', job: 'job-1', key: 'k-' + sent, bundle: 'b-1', reviewed: false, appliedBy: 'architect-a', appliedAt: at, groups: [], cites: []});
  q = withFinalReview(q);
  const plan = reviewPlan(q), keeps = plan.steps.filter(x => x.kind === 'proposals');
  const inSteps = keeps.flatMap(x => x.target.ids.map(id => x.chapter + ':' + id));
  assert.equal(inSteps.length, new Set(inSteps).size, 'no proposal is planned twice');
  assert.ok(keeps.find(x => x.id.startsWith('proposals:sol:8:'))?.target.ids.includes(sent), 'Sol\'s contract is planned as Sol\'s');
  assert.ok(!keeps.find(x => x.id.startsWith('proposals:aiw:8:'))?.target.ids.includes(sent), 'and not as AIW\'s');
  const sol = keeps.find(x => x.id.startsWith('proposals:sol:4:')), aiw = keeps.find(x => x.id.startsWith('proposals:aiw:'));
  assert.ok(sol && aiw, 'the plan lists Sol\'s proposals and AIW\'s: ' + JSON.stringify(keeps.map(x => x.id)));
  assert.equal(sol.count, 2); assert.match(sol.title, /Keep or dismiss 2 proposals Sol's draft made in Chapter 4/);
  assert.ok(!plan.steps.some(x => x.kind === 'records' && x.chapter === 4), 'a proposal is kept, not judged: a judgement would leave it out of every check');
  for (const step of keeps) {
    const command = planCommand(q, step);
    assert.deepEqual([command.type, command.payload.chapter, command.payload.ids.length], ['record.keep', step.chapter, step.count]);
    const prior = q, result = applyCanonical(q, command, at, 'reviewer-b');
    stampAuthorship(prior, result.document, command, result, {kind: 'person', id: 'reviewer-b', account: 'person', reviewed: true}, at);
    q = result.document;
    for (const id of command.payload.ids) { const r = findRecord(q, step.chapter, id).record; assert.equal(r.state, undefined, id + ' is kept'); assert.match(recordLabel(q, r, step.chapter), /kept by reviewer-b$/); }
  }
  assert.ok(!reviewPlan(q).steps.some(x => x.kind === 'proposals'), 'nothing is left to keep');
  pass('AIW\'s proposals and those Sol\'s draft applied are kept in one step each through the one lifecycle family (record.keep, the plan\'s command one click away), never judged and left out of the checks; kept, each says who kept it');
}

console.log(JSON.stringify({passed: checks.length, checks, timings}, null, 2));
