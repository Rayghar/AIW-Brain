// AIW v0.10.0-rc.10.73.42, group G5 (Chapter 10 runtime): the defects D8, D10, D17 and D18 of the handbook gap review
// (audit/rc41/handbook-review/AIW-HANDBOOK-GAP-REVIEW-2026-10-30.md, section 3; CAPABILITY-DEEP-DIVES.md
// deployment-architecture, operability-and-delivery and worked-example; chapter-gaps C10-21). Each block failed on the
// base commit 25718b6 and passes with the fix. Run: npm run test:rc42-g5-runtime
//   D8  the review desk reads availability over independent hosting failure domains: zones that share a failure domain
//       or are access zones add none; survivors after losing the largest domain meet the minimum ready count; a
//       single-writer stateful plan does not hold on its replica count alone; placeholder words are no failure domain.
//   D10 the journey drafter proposes one environment per stage holding every part (no environment per component, so no
//       missing dependency by construction); RTO and RPO recorded as open on a capability are kept as open fields.
//   D17 drafted placeholders are kept as open fields, and neither placeholder words nor an open field satisfies the
//       operations check, so the 'operate' milestone never completes on them.
//   D18 Chapter 10's recover and operate proposals and its placeholders carry no payment wording into another domain:
//       the words come from the project's own contracts and data, or are neutral.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import * as rt from './public/runtime-domain.js';
import {reasoningSource, planFacts, availabilityCheck} from './public/design-reasoning.js';
import {deskSource} from './public/desk-vitals.js';
import {capacityObjective, capacityPlan} from './public/desk-capacity.js';
import {monitoringText} from './public/desk-fixes.js';
import {applyTechnologyCommand, technologyFindings} from './public/technology-domain.js';
import {isOpenText} from './public/open-fields.js';
import {createProject} from './shared/projects-domain.js';
import {REFERENCE_PROJECTS} from './public/reference-projects.js';

const checks = [], failed = [], pass = name => { checks.push(name); console.log('PASS', name); };
// Each defect is its own block, so a run on the base commit shows every defect that fails, not only the first.
const block = (id, fn) => { try { fn(); } catch (e) { failed.push(id); console.log('FAIL', id, '-', e.message.split('\n')[0]); } };
const at = '2026-10-30T09:00:00.000Z', clone = x => structuredClone(x);
const project = withFinalReview(seedProject());
const V = (D, plan, vital) => D.rows.find(r => r.id === plan).vitals.find(v => v.vital === vital);
const cmd = (p, type, payload) => rt.applyRuntimeCommand(p, {type: 'runtime.' + type, payload}, at).document;
const zoneOf = (p, id) => p.runtime.zones.find(z => z.id === id), planOf = (p, id) => p.runtime.plans.find(r => r.id === id);
const second = (p, zoneId = 'zone-b', replicas = 1) => { p.runtime.placements.push({id: 'PL-G5', revision: 1, planId: 'run-001', zoneId, role: 'active', replicas, basis: 'test', confirmed: true}); return p; };
const access = p => { p.runtime.zones.push({id: 'zone-x', ref: 'ZON-0X', revision: 1, environmentId: 'env-001', title: 'Branches', kind: 'access', failureDomain: 'Branch network', isolation: 'Separate branch network', owner: 'Branch operations', boundaryIds: [], boundaryId: ''}); return p; };
const facts = p => planFacts(reasoningSource(p), planOf(p, 'run-001'));
const BUDGET = 43.2; // QD-002 99.9 % over 30 days
const zonePlan = p => { const R = reasoningSource(p); return capacityPlan(R, capacityObjective(R, null, {kind: 'users', value: 100000, assumptions: {survive: 'zone'}})); };
const replicaRule = plan => plan.rows.find(r => r.id === 'api-pod').spec.find(s => s.k === 'Replicas').d;

// ---------------------------------------------------------------- D8 (C10-21): independent hosting failure domains
block('D8', () => {
  // The control: two hosting zones in two stated failure domains, stateless, no minimum beyond one: it holds, as before.
  const two = second(clone(project));
  assert.equal(availabilityCheck(facts(two), BUDGET).state, 'holds', 'two active copies in two stated failure domains hold');
  assert.equal(V(deskSource(two), 'run-001', 'availability').state, 'ok');

  // Two zones that share one failure domain, and an access zone: one hosting failure domain, never 'holds'.
  const shared = access(second(clone(project)));
  zoneOf(shared, 'zone-b').failureDomain = 'Primary site · assumption';
  const c = availabilityCheck(facts(shared), BUDGET);
  assert.notEqual(c.state, 'holds', 'two zones on one failure domain do not survive the loss of that domain');
  assert.equal(c.state, 'unknown', 'how long losing the shared domain stops it is not recorded');
  assert.match(c.why, /one failure domain/);
  assert.notEqual(V(deskSource(shared), 'run-001', 'availability').state, 'ok', 'the desk availability vital does not read holds');
  assert.ok(rt.runtimeFindings(shared).some(f => f.code === 'single-domain' && f.objectId === 'run-001'), 'Chapter 10 warns of the same single domain the desk now reads');
  // Survive-one-zone sizing counts distinct hosting failure domains: one here, never the three zone records.
  const sz = zonePlan(shared);
  assert.equal(sz.zones, 1, 'one hosting failure domain, not three zone records (an access zone and a shared domain add none)');
  assert.doesNotMatch(replicaRule(sz), /3 zones|one of 3/, 'the rule never sizes for three zones');
  // Two distinct hosting failure domains and an access zone: sized over two, as a design of two zones is.
  const distinct = access(second(clone(project)));
  assert.equal(zonePlan(distinct).zones, 2, 'the access zone hosts nothing, so it is no failure domain to survive');
  assert.equal(zonePlan(distinct).rows.find(r => r.id === 'api-pod').replicas, zonePlan(second(clone(project))).rows.find(r => r.id === 'api-pod').replicas, 'an access zone changes no sizing');
  assert.match(replicaRule(zonePlan(distinct)), /failure domain/, 'the rule says it sizes over failure domains');

  // Survivors after losing the largest domain are compared with the minimum ready count.
  const short = second(clone(project));
  planOf(short, 'run-001').minReady = 2;
  const s = availabilityCheck(facts(short), BUDGET);
  assert.notEqual(s.state, 'holds', 'losing one domain leaves one copy, below the two it needs ready');
  assert.match(s.why, /minimum ready|needs ready/);
  planOf(short, 'run-001').minReady = 1;
  assert.equal(availabilityCheck(facts(short), BUDGET).state, 'holds', 'with one ready copy needed, the survivor is enough');

  // A stateful service with one writer: its copies are not interchangeable, so a replica count alone never holds.
  const stateful = second(clone(project)), sp = planOf(stateful, 'run-001');
  sp.stateMode = 'Stateful service'; sp.fencing = '';
  const w = availabilityCheck(facts(stateful), BUDGET);
  assert.equal(w.state, 'unknown', 'with no write authority stated, whether a surviving copy takes the writes is not recorded');
  assert.match(w.why, /write authority/);
  sp.fencing = 'One writer holds a lease; the standby is promoted only after the lease expires.';
  assert.equal(availabilityCheck(facts(stateful), BUDGET).state, 'unknown', 'with no promotion time recorded, it is not read as holding');
  sp.recoveryMinutes = '5';
  assert.equal(availabilityCheck(facts(stateful), BUDGET).state, 'holds', 'a promotion within the budget holds');
  assert.match(availabilityCheck(facts(stateful), BUDGET).why, /promot/);
  sp.recoveryMinutes = '60';
  assert.equal(availabilityCheck(facts(stateful), BUDGET).state, 'breaks', 'a promotion longer than the budget breaks it');

  // Placeholder words are no failure domain: two zones whose domains are open questions are not independent.
  const open = second(clone(project));
  zoneOf(open, 'zone-a').failureDomain = 'Open question: which shared failure domain does this zone belong to? Not stated in the brief or the upstream records.';
  zoneOf(open, 'zone-b').failureDomain = 'Open question: which failure domain holds the second copy? Not stated in the brief or the upstream records.';
  const o = availabilityCheck(facts(open), BUDGET);
  assert.equal(o.state, 'unknown', 'an unstated failure domain cannot show independence');
  assert.match(o.why, /failure domain/);
  assert.ok(rt.runtimeFindings(open).some(f => f.code === 'single-domain' && f.objectId === 'run-001'), 'Chapter 10 reads the open questions as one unstated domain, as the desk does');
  assert.equal(zonePlan(open).zones, 1, 'zones with no stated failure domain add no independent domain to size for');
  pass('D8 (C10-21): the desk availability verdict and its survive-one-zone sizing count distinct hosting failure domains (an access zone and zones sharing a domain add none; placeholder words are no domain), compare the survivors of the largest domain with the minimum ready count, and never read a single-writer stateful plan as holding on its replica count alone; Chapter 10 and the desk agree');
});

// ---------------------------------------------------------------- D10: the journey drafts stage environments; open RTO/RPO kept
const references = REFERENCE_PROJECTS.map(r => ({r, p: createProject({name: r.title, template: r.id}, 'g5-' + r.id, at)}));
block('D10', () => {
  for (const {r, p} of references) {
    const envs = p.runtime.environments, parts = rt.runtimeInputs(p).map(a => a.id).sort();
    assert.equal(envs.length, 1, `${r.id}: one environment for the production stage, not one per component (${envs.map(e => e.title).join('; ')})`);
    assert.equal(envs[0].stage, 'Production design');
    assert.deepEqual([...envs[0].assetIds].sort(), parts, `${r.id}: the stage environment holds every part (components and their realizations)`);
    assert.ok(p.realisation.components.every(c => !envs.some(e => e.title === c.title + ' production design')), `${r.id}: no '<component> production design' environment`);
    assert.ok(p.runtime.plans.every(x => x.environmentId === envs[0].id), `${r.id}: every plan is in the stage environment`);
    assert.deepEqual(rt.runtimeFindings(p).filter(f => f.code === 'missing-dependency' || f.code === 'unscoped').map(f => f.code + ':' + f.objectId), [], `${r.id}: the draft raises no missing dependency and leaves no part unscoped by construction`);
  }
  // Open RTO/RPO on a capability are kept as open fields, and satisfy the recovery shape as an open state does.
  const clinic = references.find(x => x.r.id === 'clinic-appointments').p, tc = clinic.technology.capabilities[0];
  const saved = applyTechnologyCommand(clinic, {type: 'technology.capability', payload: {id: tc.id, recoveryPlan: 'Restart the service from its image; replay the accepted bookings.', recoveryOwner: 'Clinic operations', open: {recoveryMinutes: {state: 'open-question', question: 'What recovery time does the clinic accept?'}, lossMinutes: {state: 'not-stated'}}}}, at).document;
  const c = saved.technology.capabilities.find(x => x.id === tc.id);
  assert.deepEqual([c.open?.recoveryMinutes?.state, c.open?.lossMinutes?.state], ['open-question', 'not-stated'], 'open RTO and RPO are kept, not silently dropped');
  assert.equal(c.open.recoveryMinutes.question, 'What recovery time does the clinic accept?');
  const tf = technologyFindings(saved);
  assert.ok(!tf.some(f => f.code === 'recovery-plan' && f.objectId === tc.id), 'the recovery shape reads the recorded open state');
  assert.ok(tf.some(f => f.code === 'open-question' && f.items?.some(i => i.objectId === tc.id && i.field === 'recoveryMinutes')), 'and the open RTO is listed as an open question');
  pass('D10: each reference journey drafts one Production design environment holding every part (no environment per component, no missing dependency, nothing unscoped by construction); RTO and RPO recorded as open on a capability are kept as open fields');
});

// ---------------------------------------------------------------- D17: placeholders are open fields and never satisfy operations
block('D17', () => {
  assert.equal(isOpenText('Runbook for Appointment scheduling service still to be written.'), true, 'the drafted runbook placeholder reads as open');
  for (const {r, p} of references) {
    const decided = p.runtime.plans.filter(x => !rt.runtimeIsSeed(p, x));
    assert.ok(decided.length, `${r.id}: the journey drafts plans`);
    for (const x of decided) {
      for (const f of ['runbook', 'rollback']) {
        assert.equal(x[f], '', `${r.id}: ${x.ref} keeps no placeholder words in ${f}`);
        assert.equal(x.open?.[f]?.state, 'open-question', `${r.id}: ${x.ref} ${f} is an open question`);
      }
      for (const f of ['readiness', 'monitoring', 'runbook', 'rollout', 'rollback']) assert.doesNotMatch(String(x[f] || ''), /still to be written|^\s*open question/i, `${r.id}: ${x.ref} ${f}`);
    }
    const fs = rt.runtimeFindings(p);
    assert.ok(decided.every(x => fs.some(f => f.code === 'operations' && f.objectId === x.id)), `${r.id}: every drafted plan still needs its operations defined`);
    assert.equal(rt.runtimeMilestones(p).find(m => m.id === 'operate').done, false, `${r.id}: the operate milestone is not complete on placeholders`);
  }
  // Placeholder words cannot satisfy the operations fields; nor can an open field; stated values do.
  const stated = {monitoring: 'Alert the on-call owner when the error rate passes 1 % for five minutes.', rollout: 'Canary to 5 % of traffic, then all after one clean hour.', runbook: 'RB-12 payment intake runbook, owned by the on-call owner.', rollback: 'Roll back when the canary error rate passes 1 %; the previous image stays deployed.'};
  const ops = q => rt.runtimeFindings(q).some(f => f.code === 'operations' && f.objectId === 'run-001');
  assert.equal(ops(cmd(project, 'plan', {id: 'run-001', ...stated})), false, 'stated operations satisfy the check');
  assert.equal(ops(cmd(project, 'plan', {id: 'run-001', ...stated, runbook: 'Runbook for Payment API still to be written.'})), true, 'a runbook still to be written is not a runbook');
  assert.equal(ops(cmd(project, 'plan', {id: 'run-001', ...stated, rollback: 'Open question: what triggers rollback and how is it checked? Not stated in the brief or the upstream records.'})), true, 'an open-question rollback is not a rollback');
  assert.equal(ops(cmd(project, 'plan', {id: 'run-001', ...stated, runbook: '', open: {runbook: {state: 'open-question', question: 'Which runbook operates it?'}}})), true, 'an open runbook is listed as open and does not satisfy operations');
  pass('D17: the journey keeps drafted Chapter 10 placeholders as open fields (runbook and rollback are open questions, no placeholder words), and neither placeholder words nor an open field satisfies the operations check, so the operate milestone never completes on them');
});

// ---------------------------------------------------------------- D18: no payment wording outside payment projects
block('D18', () => {
  const PAY = /payment|financial/i, FIELDS = ['recoveryPlan', 'fencing', 'backupPlan', 'monitoring', 'runbook', 'rollout', 'rollback'];
  const ownWords = p => [...p.interfaces.contracts.map(c => c.title), ...p.interfaces.data.map(d => d.title), ...p.realisation.components.map(c => c.title)].filter(Boolean).sort((a, b) => b.length - a.length);
  const strip = (p, t) => ownWords(p).reduce((s, w) => s.split(w).join(''), t);
  for (const {r, p} of references) {
    for (const x of p.runtime.plans) for (const key of ['recover', 'operate']) {
      const q = rt.runtimeProposal(p, key, x.id);
      assert.ok(q, `${r.id}: ${key} proposal for ${x.ref}`);
      for (const f of FIELDS) assert.doesNotMatch(strip(p, String(q.record[f] || '')), PAY, `${r.id}: ${x.ref} ${key} ${f} carries no payment wording of its own: ${q.record[f]}`);
    }
    // The Chapter 10 register a project exports says nothing of payments it does not record.
    if (!PAY.test(JSON.stringify([p.artefacts, p.realisation, p.interfaces, p.technology, p.technologyRealisation, p.security]))) assert.doesNotMatch(rt.exportRuntimeMarkdown(p), PAY, `${r.id}: the Chapter 10 register carries no payment wording`);
  }
  // The proposal's words come from the project's own contracts: the Bank Payment reference reads its own.
  const bank = rt.withRuntime(project), api = rt.runtimeProposal(bank, 'recover', 'run-001'), own = bank.interfaces.contracts.filter(c => c.from === 'api-pod' || c.to === 'api-pod');
  assert.ok(own.length && own.some(c => api.record.recoveryPlan.includes(c.title)), 'the recover proposal names the outcomes of the plan\'s own contracts');
  // The work-card placeholder and the co-design text are domain neutral; so is the desk's monitoring draft.
  assert.doesNotMatch(readFileSync(new URL('./public/runtime-ui.js', import.meta.url), 'utf8'), PAY, 'Chapter 10\'s screen copy carries no payment wording');
  const D = deskSource(references.find(x => x.r.id === 'clinic-appointments').p), row = {...D.rows[0], drivers: [{id: 'QD-901', category: 'security'}]};
  assert.doesNotMatch(monitoringText(D, row), PAY, 'the desk\'s monitoring draft for a security driver carries no payment wording');
  pass('D18: Chapter 10\'s recover and operate proposals take their words from the plan\'s own contracts and data or neutral words, so no reference project receives payment wording it does not record itself; the Chapter 10 work-card placeholder, the co-design text and the desk\'s monitoring draft are domain neutral');
});

console.log(JSON.stringify({suite: 'rc42 G5 runtime (D8, D10, D17, D18)', passed: checks.length, failed, checks}, null, 1));
assert.deepEqual(failed, [], 'every G5 defect block passes');
