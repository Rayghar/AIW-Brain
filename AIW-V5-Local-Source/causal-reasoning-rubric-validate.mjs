import assert from 'node:assert/strict';
import {fixedOrderingIssues} from './scripts/causal-reasoning-rubric.mjs';
const asReasoning = reasoning => ({summary: '', assessments: [{reasoning, alternativeChecks: [{alternativeId: 'ALT-001', admissibility: 'violates_constraint', constraint: 'Preserve per-key order.', reason: 'No ordering mechanism is supplied.'}]}]});
for (const text of [
  'No alternative currently violates the fixed constraint, but each reflects different risk and cost profiles.',
  'Both approaches have valid trade-offs.',
  'Neither alternative directly violates the fixed constraint.',
  'Is some deviation or eventual consistency acceptable in practice?',
  'Could eventual consistency be accepted to improve throughput?',
  'The architect can consider applying if eventual consistency suffices.',
  'What workload and throughput targets justify the trade-off between concurrency and strict ordering?',
  'Is preserving per-key order mandatory or negotiable?'
]) assert.ok(fixedOrderingIssues(asReasoning(text)).length, 'observed constraint relaxation must fail even with the correct structured enum: ' + text);
assert.ok(fixedOrderingIssues({summary: 'Both approaches have valid trade-offs.', assessments: [{reasoning: 'The unordered alternative violates the requirement.'}]}).length, 'a contradictory overall summary is not outside the rubric');
assert.ok(fixedOrderingIssues({summary: '', assessments: [{reasoning: 'ALT-001 violates the constraint.', questions: ['Is some deviation or eventual consistency acceptable in practice?']}]}).length, 'questions cannot quietly reopen the fixed requirement');
for (const text of [
  'ALT-001 violates the stated ordering constraint. ALT-002 preserves order but may limit throughput.',
  'The global constraint changed to per-key order in the supplied revised requirement. Preserve that revised boundary.',
  'Both approaches require tests, but ALT-001 is not viable as stated.',
  'Eventual consistency does not satisfy the stated ordering constraint.',
  'Measure the throughput cost while retaining strict ordering; no performance target is established.'
]) assert.deepEqual(fixedOrderingIssues(asReasoning(text)), [], 'valid constraint-preserving discussion is retained: ' + text);
console.log('PASS: the causal rubric rejects observed constraint-relaxation prose in summaries, assessments and questions even when enums are correct; valid preservation remains allowed. This is a necessary-condition rubric, not semantic certification.');
