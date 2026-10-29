// Actual accepted teacher wording, reduced to synthetic guard regressions.
import assert from 'node:assert/strict';
import {overclaim,guardReasoning,validateReasoningOutput,settleReasoning} from './public/brain-reasoning.js';
import {mockAssessment,mockReview} from './mock-llm-provider.mjs';
const invalid=[
 'The architectural idea from layered architecture supports managing dependencies and change propagation, ensuring that state changes in transfer requests remain isolated and consistent.',
 "This aligns with the layered architectural style which supports dependency isolation, aiding concurrency control needed to enforce 'first valid commit wins'.",
 'Separation of concerns guarantees transaction consistency.',
 'Dependency isolation establishes concurrency correctness.',
 'A layered design can ensure transaction consistency if workload is low.'
];
for(const text of invalid)assert.equal(overclaim(text),'guarantee',text);
const legitimate=[
 'Layered architecture limits change propagation and may improve modifiability.',
 'Dependency isolation helps organize concurrency-control code; it does not establish correctness.',
 'Layering does not ensure state consistency.',
 'A layered service could preserve state consistency if a version-checked conditional update atomically checks the stored version and permission.',
 'Layered components could ensure transaction consistency only when a serializable transaction includes the relevant checks; that boundary needs verification.',
 'Verify whether the proposed layered service preserves consistent state under concurrent requests.',
 'A storage transaction could provide atomicity if its contract supports the required checks.'
];
for(const text of legitimate)assert.equal(overclaim(text),null,text);
const packet={request:{prompt:'Teach this requirement.'},items:[{id:'M:1:REQ-001',kind:'record',ref:'S1',knobs:[],allowed:{verdicts:['apply','judge','insufficient'],knobs:[],proposals:null,preferred:[]}}],sources:[{ref:'S1',excerpt:'A maker with payment permissions may edit pending requests. First valid committed action wins; approval requires current version. Approver authorization and deletion retention remain open.'}]};
const draft=()=>{const d=mockAssessment(packet),a=d.assessments[0];d.summary='The proposed concurrency boundary still needs design and verification.';a.reasoning='An atomic version check is a candidate mechanism; define and verify its storage contract.';a.headline='Retain the current-version constraint.';a.risks=[];a.questions=[];a.refinements=[];a.verification=[];return d;};
const checked=d=>guardReasoning(packet,validateReasoningOutput(d,packet));
for(const where of ['summary','reasoning']){const d=draft();if(where==='summary')d.summary=invalid[0];else d.assessments[0].reasoning=invalid[1];const c=checked(d),r=settleReasoning(packet,c,mockReview({candidate:c}));assert(r.assessments[0].withheld,'An approving checker cannot waive a structural correctness shortcut in '+where);assert(!r.summary.includes('layered architecture'));}
function withTest(steps){const d=draft();d.assessments[0].verification=[{title:'Proposed same-version race',steps,failure:'Competing actions run on one pending version.',passCriterion:'Only the first valid action commits and stale actions fail.',sourceRefs:['S1']}];return d;}
const confused=checked(withTest(['Attempt concurrent modifications, deletions, and approvals on the same pending transfer request using makers with and without payment permissions.']));assert(confused.assessments[0].problems.some(p=>p.includes('approver authorization')));assert(settleReasoning(packet,confused,mockReview({candidate:confused})).assessments[0].withheld);
for(const steps of [
 ['Confirm the approver authorization before running this proposed test.','Attempt concurrent modifications, deletions, and approvals using makers for edits and the separately authorized approver for approval.'],
 ['Attempt approval using a maker without approval permission and assert the approval is rejected.'],
 ['Attempt concurrent edits using makers with the required payment permissions.']
])assert.deepEqual(checked(withTest(steps)).assessments[0].problems,[],'Explicit actor prerequisites, negative approval checks and maker-only edits remain valid proposals');
const known={...packet,sources:[{ref:'S1',excerpt:'Makers are explicitly authorized both to edit and approve a pending request under the recorded project policy.'}]};assert.deepEqual(guardReasoning(known,validateReasoningOutput(withTest(['Attempt concurrent edits and approvals using makers with the recorded permissions.']),known)).assessments[0].problems,[],'The guard cannot invent an unresolved approval role when the source actually defines it');
console.log('PASS: layering/change isolation cannot establish transaction or concurrency correctness; shared summaries fail closed; conditional mechanisms, modifiability and proposed tests survive; unresolved approval roles remain explicit prerequisites. Synthetic only.');
