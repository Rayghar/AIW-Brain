// Open fields and the one priority scale (round 12, D-12, DM-07, DM-16): a field is stated, not stated or an open
// question, kept on the record and never inferred from a value that says something; every priority scale maps to one
// ordinal level, with '' for not stated sorting last. Run: npm run test:open-fields
import assert from 'node:assert/strict';
import {OPEN_STATES, isOpenText, questionOf, fieldOpen, openFields, withOpen, cleanOpen, printable} from './public/open-fields.js';
import {SCALES, levelOf, valueAt, convert, priorityRank, sddPriority, cleanBasis, PRIORITY_BASIS} from './public/priority-scale.js';

const checks = [], pass = n => checks.push(n);

// 1. Words that say nothing, and words that say something.
for (const t of ['', '   ', 'Open question: who owns the ledger?', 'open question - which window', 'Not stated in the brief or the upstream records.', 'not stated', 'Unassigned', 'TBD', 'to be confirmed', 'Confirm source'])
  assert.equal(isOpenText(t), true, JSON.stringify(t) + ' says nothing');
for (const t of ['Customer service team', '99.9% over 30 days', 'Not applicable to branches outside Lagos', 'Questions are logged by the help desk'])
  assert.equal(isOpenText(t), false, JSON.stringify(t) + ' says something');
assert.equal(questionOf('Open question: which time zone runs end of day? Not stated in the brief or the upstream records.'), 'which time zone runs end of day?');
assert.equal(questionOf('Open question: the recovery site'), 'the recovery site?');
assert.equal(questionOf('A stated value'), null);
pass('placeholders and open-question words read as open; stated words, including ones that mention questions or "not", read as stated');

// 2. The kept state wins over the words; numbers, booleans and filled lists are stated.
const r = {owner: 'Operations', window: 'Open question: which window?', target: 0, confirmed: false, ids: [], open: {owner: {state: 'open-question', question: 'Which team owns it after go-live?'}}};
assert.deepEqual(fieldOpen(r, 'owner'), {field: 'owner', state: 'open-question', question: 'Which team owns it after go-live?'});
assert.equal(fieldOpen(r, 'window').state, 'open-question'); assert.equal(fieldOpen(r, 'window').derived, true);
assert.equal(fieldOpen(r, 'target'), null, 'zero is a value'); assert.equal(fieldOpen(r, 'confirmed'), null);
assert.equal(fieldOpen(r, 'ids').state, 'not-stated'); assert.equal(fieldOpen({ids: ['REQ-001']}, 'ids'), null);
assert.deepEqual(openFields(r, ['owner', 'window', 'target']).map(o => o.field), ['owner', 'window']);
pass('a recorded state is read first; otherwise the words decide; zero, false and filled lists are stated');

// 3. Setting and cleaning the open map is pure and bounded.
const before = JSON.stringify(r);
const open = withOpen(r, 'target', 'not-stated', {raisedBy: 'sol-drafter', at: '2026-10-08T00:00:00Z'});
assert.equal(JSON.stringify(r), before, 'the record is not changed');
assert.deepEqual(open.target, {state: 'not-stated', raisedBy: 'sol-drafter', at: '2026-10-08T00:00:00Z'});
assert.deepEqual(Object.keys(withOpen(r, 'owner', null)), [], 'null clears the entry');
assert.throws(() => withOpen(r, 'owner', 'open-question'), /Write the open question/);
assert.throws(() => withOpen(r, 'owner', 'maybe'), /Choose not stated or open question/);
assert.deepEqual(cleanOpen({a: {state: 'not-stated'}, b: {state: 'guess'}, c: {state: 'open-question'}, d: {state: 'open-question', question: 'x'.repeat(700)}}, ['a', 'b', 'c', 'd']), {a: {state: 'not-stated'}, d: {state: 'open-question', question: 'x'.repeat(600)}});
assert.deepEqual(cleanOpen({a: {state: 'not-stated'}}, ['b']), {}, 'fields outside the allowed list are dropped');
assert.equal(printable(r, 'owner'), 'open: Which team owns it after go-live?');
assert.equal(printable({x: ''}, 'x', 'owner'), 'open: owner not stated');
assert.equal(printable({x: 'Treasury'}, 'x'), 'Treasury');
assert.deepEqual([...OPEN_STATES], ['not-stated', 'open-question']);
pass('withOpen and cleanOpen return new, bounded maps; an open question needs its question; printable says "open: …" once');

// 4. One priority scale.
assert.equal(levelOf('requirement', 'Must'), 1); assert.equal(levelOf('requirement', 'could'), 3);
assert.equal(levelOf('driver-legacy', 'Important'), 2); assert.equal(levelOf('threat', 'High'), 1); assert.equal(levelOf('threat', 'Moderate'), 2);
assert.equal(levelOf('driver', ''), null); assert.equal(levelOf('driver', 'Urgent'), null);
assert.equal(convert('driver-legacy', 'Critical', 'driver'), 'High'); assert.equal(convert('requirement', 'Should', 'sdd'), 'Medium');
assert.equal(convert('threat', 'Low', 'requirement'), 'Could'); assert.equal(convert('requirement', '', 'driver'), '');
assert.equal(valueAt('threat', 1), 'High'); assert.equal(valueAt('driver', null), '');
assert.deepEqual(['Low', '', 'High', 'Medium'].sort((a, b) => priorityRank('driver', a) - priorityRank('driver', b)), ['High', 'Medium', 'Low', '']);
assert.equal(sddPriority('requirement', ''), 'not stated'); assert.equal(sddPriority('driver-legacy', 'Supporting'), 'Low');
assert.equal(cleanBasis('source band'), 'source band'); assert.equal(cleanBasis('guess'), '');
assert.throws(() => levelOf('mood', 'High'), /Unknown priority scale/);
assert.deepEqual(Object.keys(SCALES), ['requirement', 'driver', 'driver-legacy', 'threat', 'sdd']); assert.equal(PRIORITY_BASIS.length, 3);
pass('every scale maps to one ordinal level; not stated is empty, never weighted and sorts last; conversions keep the level');

// GR-CMP-04 (round 23): a placeholder followed by "Open question" asks it; it no longer reads as a stated owner, so a
// responsibility and a component holding it raise the open-question cause instead of passing in silence.
{
  assert.deepEqual(fieldOpen({owner: 'Unassigned. Open question'}, 'owner'), {field: 'owner', state: 'open-question', question: '', derived: true});
  assert.equal(fieldOpen({owner: 'Unassigned. Open question: who runs it at night?'}, 'owner').question, 'who runs it at night?');
  assert.equal(fieldOpen({owner: 'Unassigned accounts team'}, 'owner'), null, 'a name that begins with the word stays a name');
  const {seedProject} = await import('./public/requirements-domain.js');
  const {withLogical, applyLogicalCommand, logicalFindings} = await import('./public/logical-domain.js');
  const {withRealisation, applyRealisationCommand, realisationFindings} = await import('./public/realisation-domain.js');
  let p = withLogical(seedProject());
  const r = p.logical.responsibilities[0];
  p = applyLogicalCommand(p, {type: 'logical.responsibility', payload: {...r, owner: 'Unassigned. Open question'}}).document;
  assert.ok(logicalFindings(p).some(f => f.code === 'open-question' && f.objectId === r.id), 'the responsibility raises the open question');
  p = withRealisation(p); const c = p.realisation.components[0];
  p = applyRealisationCommand(p, {type: 'realisation.component', payload: {...c, owner: 'Unassigned. Open question'}}, '2026-10-14T00:00:00.000Z').document;
  assert.ok(realisationFindings(p).some(f => f.code === 'open-question' && f.objectId === c.id), 'and so does the component');
  pass('a placeholder followed by "Open question" is an open question: a responsibility or a component holding it as its owner raises the open-question cause instead of passing as stated (GR-CMP-04)');
}

console.log(JSON.stringify({suite: 'open-fields', checks}, null, 1));
