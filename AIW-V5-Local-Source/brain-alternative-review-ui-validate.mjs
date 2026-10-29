// Synthetic DOM regression for Sol's visible, per-alternative constraint assessment.
// No provider request, project write, architectural selection or approval is made.
import assert from 'node:assert/strict';
import {assessmentHTML} from './public/brain-reasoning-ui.js';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const window = new Window({url: 'https://aiw.test/'}), document = window.document;
const entry = {
  current: true,
  item: {kind: 'decision', allowed: {preferred: ['ALT-1', 'ALT-2', 'ALT-3']}, reading: {alternatives: [{id: 'ALT-1', title: 'Per-key handoff'}, {id: 'ALT-2', title: 'Unordered pool'}, {id: 'ALT-3', title: 'Unverified adapter'}]}},
  run: {id: 'synthetic-run', model: 'synthetic-model', createdAt: '2026-10-12T10:00:00Z', packet: {sources: [
    {ref: 'S1', kind: 'model', title: 'Recorded ordering constraint', excerpt: 'The submitted sequence for each key must be preserved.', posture: 'Project requirement'},
    {ref: 'S2', kind: 'project-note', title: 'Adapter uncertainty', excerpt: 'The adapter topology is not established.', posture: 'Open assumption'}
  ]}},
  a: {id: 'D:synthetic', verdict: 'judge', headline: 'Preserve the stated ordering boundary', reasoning: 'Compare the options against the recorded constraint before selecting one.', preferred: 'ALT-1', refinements: [], proposals: [], risks: [], questions: [], sourceRefs: ['S1', 'S2'], alternativeChecks: [
    {alternativeId: 'ALT-1', admissibility: 'viable_as_stated', constraint: 'Preserve the submitted sequence for each key.', reason: 'The proposed partition and single-consumer boundary preserves the stated sequence under its supplied assumptions.', sourceRefs: ['S1']},
    {alternativeId: 'ALT-2', admissibility: 'violates_constraint', constraint: 'Preserve the submitted sequence for each key.', reason: 'Competing consumers can complete the same key out of sequence.', sourceRefs: ['S1']},
    {alternativeId: 'ALT-3', admissibility: 'not_established', constraint: 'Preserve the submitted sequence for each key.', reason: 'The <adapter> topology and ordering behavior need evidence.', sourceRefs: ['S2']}
  ]}
};
const before = JSON.stringify(entry);
const render = e => { document.body.innerHTML = assessmentHTML(e, {id: e.a.id}); return document.body; };
const dom = render(entry), rows = [...dom.querySelectorAll('[data-sol-alternative]')];
assert.equal(rows.length, 3);
for (const row of rows) {
  const status = row.querySelector('[data-sol-alternative-status]');
  assert.ok(status && !status.closest('details:not([open])'), 'constraint status is visible without opening a disclosure');
  assert.match(row.textContent, /Constraint: Preserve the submitted sequence/);
  assert.ok(row.querySelector('details > summary'), 'exact source receipts use a native keyboard-operable disclosure');
}
assert.match(rows[0].textContent, /Viable as stated · Sol assessment/);
assert.match(rows[1].textContent, /Conflicts with a stated constraint/);
assert.match(rows[1].textContent, /Competing consumers can complete/);
assert.match(rows[2].textContent, /Compatibility not established/);
assert.match(rows[2].textContent, /Evidence or assumptions remain open/);
assert.match(rows[2].textContent, /The <adapter> topology/);
assert.equal(rows[2].querySelector('adapter'), null, 'model prose is escaped');
assert.equal(rows[0].querySelector('.dk-solsrc').textContent.includes('Adapter uncertainty'), false, 'each alternative shows only its own source receipts');
assert.match(rows[2].querySelector('.dk-solsrc').textContent, /Adapter uncertainty/);
assert.match(dom.querySelector('.dk-solpref').textContent, /ALT-1/);
assert.equal(JSON.stringify(entry), before, 'rendering does not mutate the response or select an alternative');

for (const preferred of ['ALT-2', 'ALT-3']) {
  const e = structuredClone(entry); e.a.preferred = preferred;
  const d = render(e);
  assert.equal(d.querySelector('.dk-solpref'), null, 'an incompatible or unestablished alternative is never rendered as preferred');
  assert.ok(d.querySelector('[data-sol-preference-blocked]'));
}
const incomplete = structuredClone(entry); incomplete.a.alternativeChecks = incomplete.a.alternativeChecks.slice(1);
assert.ok(render(incomplete).querySelector('[data-sol-preference-blocked]'), 'a preference without its supplied check is also withheld');

const legacy = structuredClone(entry); delete legacy.a.alternativeChecks;
const old = render(legacy);
assert.ok(old.querySelector('[data-sol-legacy-alternatives]'), 'older choice responses remain readable with their limitation stated');
assert.match(old.textContent, /Preserve the stated ordering boundary/);
assert.equal(old.querySelectorAll('[data-sol-alternative]').length, 0, 'no check is invented for a historical response');
legacy.item.allowed.preferred = null;
assert.equal(render(legacy).querySelector('[data-sol-legacy-alternatives]'), null, 'ordinary record assessments do not acquire a choice warning');

const stale = structuredClone(entry); stale.current = false;
assert.match(render(stale).textContent, /advice is kept as history/);
const withheld = structuredClone(entry); withheld.a.withheld = true;
assert.equal(render(withheld).querySelectorAll('[data-sol-alternative]').length, 0, 'withheld model assessments expose no alternative advice');
await window.happyDOM.close();
console.log('PASS: all alternative constraint statuses are visible with exact receipts and uncertainty; incompatible preferences are suppressed; legacy, stale and withheld responses remain honest. Synthetic DOM only.');
