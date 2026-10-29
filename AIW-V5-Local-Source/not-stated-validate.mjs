// Not stated, open and patched (round 12, D-12, DM-05 to DM-10, DM-16). In Chapters 6 to 10 a value no source states is
// stored '' and printed 'not stated', never chosen for the person: a need's consequence, a capability's continuity, an
// option's operating model, a contract's style, a classification ('Not classified yet' for a new definition), personal
// data, a threat's priority and category, an environment's stage, a zone's kind, a placement's role, its replicas and a
// plan's copies, a path's dependency. Each chapter raises one warning per cause for them, and no rule computes on them.
// A record keeps open fields (open-fields.js): a required field in either state satisfies the record's shape. Every save
// is a patch: a field left out keeps its value, null clears it, a link list is sent whole or as {add, remove}, a save
// that changes nothing keeps the revision, and a value beyond its limit is refused, naming the limit, never cut. An
// older record keeps its shape when a save leaves its new fields out. Run: npm run test:not-stated
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import * as tech from './public/technology-domain.js';
import * as tr from './public/technology-realisation-domain.js';
import * as itf from './public/interfaces-domain.js';
import * as sec from './public/security-domain.js';
import * as rt from './public/runtime-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {deploySource} from './public/deploy-model.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const at = '2026-10-08T10:00:00.000Z';
const base = withFinalReview(seedProject());
let p = base;
const run = (type, payload) => { const r = applyCanonical(p, {type, payload}, at, 'architect-a'); p = r.document; return r.selected; };
const refused = (type, payload, words) => assert.throws(() => applyCanonical(p, {type, payload}, at), words, type);
const codes = (findings, code) => findings.filter(f => f.code === code);

// 1. Every not-stated value is accepted, stored '' and printed 'not stated'; a value outside its list is refused.
{
  run('technology.needs', {applicationId: 'api-pod', needs: tech.needsFor(p, 'api-pod').map(n => ({id: n.id, category: n.category, criticality: n.category === 'compute' ? null : n.criticality}))});
  const need = tech.needsFor(p, 'api-pod').find(n => n.category === 'compute');
  assert.equal(need.criticality, '');
  run('technology.capability', {id: 'tc-001', continuity: null});
  assert.equal(tech.capability(p, 'tc-001').continuity, '');
  run('techrealisation.option', {id: 'tr-001', option: {title: 'Unknown operator option'}});
  assert.equal(tr.realization(p, 'tr-001').options.at(-1).operatingModel, '', 'a new option says nothing about who runs it');
  run('interfaces.contract', {id: 'rest', kind: null});
  assert.equal(itf.contract(p, 'rest').kind, '');
  const d = run('interfaces.data', {title: 'Applicant profile', purpose: 'Who applies.', owner: 'Case team', authorityId: 'api-pod', protection: 'Masked in support views.'});
  assert.deepEqual([itf.dataRecord(p, d).classification, itf.dataRecord(p, d).personalData], ['Not classified yet', ''], 'a new definition is not classified yet, and says nothing yet about personal data');
  run('interfaces.data', {id: d, personalData: 'yes'});
  run('security.threat', {id: 'thr-001', priority: '', category: ''});
  assert.deepEqual([sec.threat(p, 'thr-001').priority, sec.threat(p, 'thr-001').category], ['', '']);
  run('runtime.environment', {id: 'env-001', stage: ''});
  // A field an older record never had is written once the save changes something (an unchanged save keeps the record).
  run('runtime.zone', {id: 'zone-b', kind: ''});
  assert.equal(rt.zone(p, 'zone-b').kind, undefined);
  run('runtime.zone', {id: 'zone-b', kind: '', owner: 'Recovery operations'});
  run('runtime.placement', {id: 'PL-001', role: '', replicas: ''});
  run('runtime.plan', {id: 'run-002', minReady: '', maxReplicas: null});
  run('runtime.path', {id: 'RP-001', mode: ''});
  assert.deepEqual([rt.environment(p, 'env-001').stage, rt.zone(p, 'zone-b').kind, p.runtime.placements[0].role, p.runtime.placements[0].replicas, rt.plan(p, 'run-002').minReady, rt.plan(p, 'run-002').maxReplicas, rt.runtimePath(p, 'RP-001').mode], ['', '', '', '', '', '', '']);
  for (const [type, payload, words] of [
    ['technology.capability', {id: 'tc-001', continuity: 'maybe'}, /Choose the continuity arrangement, or leave it not stated\./],
    ['interfaces.contract', {id: 'rest', kind: 'stream'}, /Choose the interaction style, or leave it not stated\./],
    ['interfaces.data', {id: d, personalData: 'perhaps'}, /Choose the personal data marker, or leave it not stated\./],
    ['security.threat', {id: 'thr-001', priority: 'Urgent'}, /Choose the threat category and priority, or leave them not stated\./],
    ['runtime.environment', {id: 'env-001', stage: 'Live'}, /choose its stage, or leave it not stated/],
    ['runtime.placement', {id: 'PL-001', role: 'hot'}, /or say the role is not stated/],
    ['runtime.path', {id: 'RP-001', mode: 'soft'}, /or say it is not stated/],
    ['runtime.plan', {id: 'run-002', minReady: 0}, /whole number between 1 and 10000/]]) refused(type, payload, words);
  const md = [tech.exportTechnologyMarkdown(p), tr.exportTechnologyRealisationMarkdown(p), itf.exportInterfacesMarkdown(p), sec.exportSecurityMarkdown(p), rt.exportRuntimeMarkdown(p)].join('\n');
  for (const words of ['Continuity: not stated', ' · not stated · ', 'Personal data: yes', 'not stated · not stated', 'role not stated · replicas not stated', 'dependency not stated']) assert.ok(md.includes(words), 'the editions print ' + words);
  pass('a need\'s consequence, a capability\'s continuity, an option\'s operating model, a contract\'s style, a threat\'s priority and category, an environment\'s stage, a zone\'s kind, a placement\'s role and replicas, a plan\'s copies and a path\'s dependency take not stated (\'\'); a new data definition is not classified yet; other values are refused by name; the editions print not stated');
}

// 2. One warning per cause per chapter, and no rule computes on a value that is not stated.
{
  for (const [chapter, findings, words] of [[6, tech.technologyFindings(p), ['TC-001 continuity']], [7, tr.technologyRealisationFindings(p), ['operating model']], [8, itf.interfaceFindings(p), ['IF-001 kind', 'classification']], [9, sec.securityFindings(p), ['THR-001 category', 'THR-001 priority']], [10, rt.runtimeFindings(p), ['ENV-001 stage', 'ZON-002 kind', 'PL-001 role', 'PL-001 replicas', 'RP-001 mode']]]) {
    const f = codes(findings, 'not-stated');
    assert.equal(f.length, 1, 'Chapter ' + chapter + ' raises one not-stated warning');
    assert.equal(f[0].level, 'warning');
    for (const w of words) assert.ok(f[0].detail.includes(w) || f[0].items.some(x => (x.field + '').toLowerCase().includes(w.split(' ').at(-1).toLowerCase())), 'Chapter ' + chapter + ' names ' + w + ': ' + f[0].detail);
  }
  assert.ok(!tech.technologyFindings(p).some(f => f.code === 'single-point' && f.objectId === 'tc-001'), 'no single-point warning for a continuity not stated');
  assert.ok(!codes(rt.runtimeFindings(p), 'single-domain').some(f => f.objectId === 'run-001'), 'no failure-domain reading on a placement whose role is not stated');
  assert.ok(!itf.interfaceFindings(p).some(f => f.code === 'kind'), 'a style not stated is an open item, not its own finding');
  const V = deploySource(p, {envId: 'env-001'});
  assert.deepEqual([V.plans.get('run-002').minReady, V.plans.get('run-002').maxReplicas, V.placements.find(l => l.id === 'PL-001').open], [null, null, true], 'the deployment companion reads copies not stated as nothing');
  const pl = rt.planCopies(p, rt.plan(p, 'run-001'));
  assert.equal(pl.open, 1); assert.match(pl.text, /without a stated role or count/);
  assert.match(rt.planCopies(p, rt.plan(p, 'run-002')).text, /^Needs an unstated number of ready, at most not stated|^Replicas not stated/);
  const {reasoningSource, planFacts, availabilityCheck} = await import('./public/design-reasoning.js');
  const facts = planFacts(reasoningSource(p), rt.plan(p, 'run-001'));
  assert.deepEqual([facts.open, availabilityCheck(facts, 40).state], [1, 'unknown'], 'an outage is not read from copies not stated, never as one active replica');
  assert.match(availabilityCheck(facts, 40).why, /does not state its role or copies/);
  pass('each chapter names its not-stated values in one warning; no single-point, failure-domain or style finding is computed on them, the copies reading says what is not stated, and the availability reading does not count them as one replica');
}

// 3. Open fields: a required field in either open state satisfies the record's shape, and raises one finding per cause.
{
  let q = base;
  const go = (type, payload) => { q = applyCanonical(q, {type, payload}, at).document; };
  go('technology.capability', {id: 'tc-007', owner: '', open: {owner: {state: 'not-stated', source: 'Workbook row 12'}, failureDomain: {state: 'open-question', question: 'Which site holds the primary copy?'}, invented: {state: 'not-stated'}, purpose: {state: 'guess'}}});
  const c = tech.capability(q, 'tc-007');
  assert.deepEqual(c.open, {owner: {state: 'not-stated', source: 'Workbook row 12'}, failureDomain: {state: 'open-question', question: 'Which site holds the primary copy?'}}, 'unknown fields and states are dropped');
  const fs = tech.technologyFindings(q);
  assert.ok(!fs.some(f => f.code === 'definition' && f.objectId === 'tc-007'), 'an owner recorded as not stated satisfies the definition check');
  assert.ok(codes(fs, 'not-stated')[0].items.some(x => x.objectId === 'tc-007' && x.field === 'owner'));
  assert.ok(codes(fs, 'open-question')[0].items.some(x => x.objectId === 'tc-007' && x.question === 'Which site holds the primary copy?'));
  go('technology.capability', {id: 'tc-007', open: null});
  assert.equal(tech.capability(q, 'tc-007').open, undefined, 'null clears the open map');
  assert.ok(tech.technologyFindings(q).some(f => f.code === 'definition' && f.objectId === 'tc-007'), 'and the empty owner is a gap again');
  pass('a record keeps open fields through cleanOpen (unknown fields and states dropped); an owner not stated satisfies the definition check; each chapter names not-stated values and open questions in one warning each; null clears them');
}

// 4. Patches: what a save leaves out is kept, null clears, links take {add, remove}, an unchanged save keeps the revision.
{
  let q = base;
  const go = (type, payload) => { const r = applyCanonical(q, {type, payload}, at); q = r.document; return r; };
  const c0 = itf.contract(q, 'rest');
  go('interfaces.contract', {id: 'rest', title: 'Payment initiation (renamed)'});
  const c1 = itf.contract(q, 'rest');
  assert.deepEqual([c1.title, c1.purpose, c1.exchanges.length, c1.owner, c1.revision], ['Payment initiation (renamed)', c0.purpose, c0.exchanges.length, c0.owner, c0.revision + 1]);
  const version = q.interfaces.version;
  go('interfaces.contract', {id: 'rest', title: 'Payment initiation (renamed)'});
  assert.deepEqual([itf.contract(q, 'rest').revision, q.interfaces.version], [c1.revision, version], 'an unchanged save keeps the revision and the chapter version');
  go('interfaces.contract', {id: 'rest', compatibility: null});
  assert.equal(itf.contract(q, 'rest').compatibility, '');
  go('security.control', {id: 'oauth', targetIds: {add: ['posting-api'], remove: ['api-pod']}});
  assert.deepEqual(sec.control(q, 'oauth').targetIds, ['rest', 'posting-api']);
  go('runtime.plan', {id: 'run-001', recoveryMinutes: '15', targetsBasis: 'Tested failover', targetsConfirmed: true});
  go('runtime.plan', {id: 'run-001', recoveryMinutes: '30'});
  assert.equal(rt.plan(q, 'run-001').targetsConfirmed, false, 'a confirmation goes when what it confirms changes');
  go('runtime.plan', {id: 'run-001', title: 'API runtime', controlIds: {add: ['oauth']}});
  assert.deepEqual([rt.plan(q, 'run-001').recoveryMinutes, rt.plan(q, 'run-001').controlIds.includes('oauth')], ['30', true]);
  pass('a save keeps what it leaves out, null clears a field, links take {add, remove}, an unchanged save keeps the revision and the chapter version, and a confirmation goes when what it confirms changes');
}

// 5. Limits are refused, naming the limit and what was sent; an older record keeps its shape.
{
  for (const [type, payload, words] of [
    ['interfaces.contract', {id: 'rest', title: 'x'.repeat(161)}, /The contract name holds up to 160 characters; 161 were sent\./],
    ['interfaces.lineage', {from: 'instruction', to: 'posting', title: 'y'.repeat(161)}, /The derivation name holds up to 160 characters; 161 were sent\./],
    ['security.threat', {id: 'thr-002', targetIds: ['rest', 'nowhere']}, /Choose existing protected objects; nowhere is not in this project\./],
    ['interfaces.party', {id: 'ext-core', requirementIds: ['REQ-999']}, /Choose existing requirements; REQ-999 is not in this project\./],
    ['runtime.plan', {id: 'run-001', targets: Array.from({length: 25}, () => ({kind: 'latency'}))}, /A runtime plan states up to 24 targets; 25 were sent\./]]) refused(type, payload, words);
  let q = base;
  for (let i = 0; i < 10; i++) q = applyCanonical(q, {type: 'techrealisation.option', payload: {id: 'tr-001', option: {title: 'Option ' + i, operatingModel: 'Self managed'}}}, at).document;
  assert.equal(tr.realization(q, 'tr-001').options.length, 12, 'a realization compares up to 12 options');
  assert.throws(() => applyCanonical(q, {type: 'techrealisation.option', payload: {id: 'tr-001', option: {title: 'Thirteenth'}}}, at), /A realization compares up to 12 options, and TR-001 has 12\. Remove one before adding another\./);
  const before = JSON.stringify(Object.keys(itf.dataRecord(base, 'instruction')).sort());
  q = applyCanonical(base, {type: 'interfaces.data', payload: {id: 'instruction', purpose: 'The payment instruction a customer submits.'}}, at).document;
  assert.equal(JSON.stringify(Object.keys(itf.dataRecord(q, 'instruction')).sort()), before, 'a partial save adds no field the older record never had');
  pass('a value beyond its limit, an unknown id and a 13th option are refused, naming the limit and what was sent, never cut; a partial save of an older record keeps its shape');
}

console.log(JSON.stringify({suite: 'not-stated', passed: checks.length, checks}, null, 1));
