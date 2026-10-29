import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import {draftSteps, applySteps} from './public/architecture-drafter.js';
import {themePacket, architectureInstructionsPin, validateArchitectureDraft, guardArchitectureDraft} from './public/architecture-contract.js';
import {requestArchitectureDraft} from './architecture-request.js';
import {runArchitectureJob} from './architecture-job.js';

const at = '2026-10-10T00:00:00Z';
let p = createProject({name: 'Statement pilot', template: 'blank'}, 'architect', at);
p = applyCanonical(p, {type: 'artefact', payload: {type: 'requirement', title: 'Account statement', description: 'Customers shall see and download account statements.', source: 'Synthetic workshop', confirmed: false}}, at).document;
const steps = draftSteps(p); let step;
while (!(step = steps.next()).done) { /* complete the rules skeleton */ }
const skeleton = step.value;
const env = {OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'test-model'};
const response = (id, body) => new Response(JSON.stringify({id, model: 'test-model', status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(body)}]}], usage: {input_tokens: 10, output_tokens: 8}}));
let calls = 0;
const fetcher = async (_url, init) => {
  calls++;
  const sent = JSON.parse(init.body);
  if (sent.text.format.name === 'aiw_architecture_draft_check') return response('review-1', {proposals: [{id: 'A1', supported: true, defects: [], notes: ['The basis matches the cited requirement.']}]});
  const packet = JSON.parse(sent.input[0].content);
  assert.equal(packet.task, 'architecture-draft');
  return response('draft-1', {proposals: [{kind: 'responsibility', title: 'Statement retrieval', statement: 'Sol proposes a statement retrieval boundary.', requirementRefs: [packet.requirements[0].ref], passages: [], basis: 'Customers shall see and download account statements.', interpretation: 'Sol proposes a retrieval responsibility that can be allocated to a component.'}], keep: []});
};
const packet = themePacket(p, skeleton, {key: 'pilot', title: 'Pilot', kind: 'area', id: null, stored: false, members: p.artefacts.filter(a => a.type === 'requirement')}, {instructions: architectureInstructionsPin()});
const checked = await requestArchitectureDraft(env, packet, {fetcher});
assert.equal(calls, 2, 'draft and independent source check');
assert.equal(checked.result.proposals.length, 1);
assert.equal(checked.groundingReview.accepted, true);
assert.equal(checked.providerReceipt.calls.length, 2);
const citedButUnrelated = guardArchitectureDraft(packet, validateArchitectureDraft({proposals: [{kind: 'responsibility', title: 'Fee waiver assessment', statement: 'Sol proposes a fee waiver service.', requirementRefs: [packet.requirements[0].ref], passages: [], basis: packet.requirements[0].statement, interpretation: 'Sol proposes a fee waiver service.'}], keep: []}, packet));
assert.equal(citedButUnrelated.proposals.length, 0, 'a source reference alone cannot ground an unrelated responsibility');
assert.match(citedButUnrelated.withheld[0].issues.join(' '), /name has no topic/);
const inventedBasis = guardArchitectureDraft(packet, validateArchitectureDraft({proposals: [{kind: 'responsibility', title: 'Statement retrieval', statement: 'Sol proposes a retrieval service.', requirementRefs: [packet.requirements[0].ref], passages: [], basis: 'Customers request tax certificates from the archive.', interpretation: 'Sol proposes a retrieval service.'}], keep: []}, packet));
assert.equal(inventedBasis.proposals.length, 0, 'a fabricated basis is withheld even when the title matches');

let invoked = 0, saved = [];
const request = async packet => {
  invoked++;
  return packet.task === 'architecture-cross'
    ? {result: {proposals: [{kind: 'responsibility', title: 'Platform statement retrieval', statement: 'Sol proposes a shared retrieval boundary.', requirementRefs: ['REQ:REQ-001:A1'], passages: [], basis: 'A statement retrieval responsibility was proposed.', interpretation: 'Sol proposes a shared platform responsibility.', id: 'A1', ref: 'X.A1'}], keep: [], merges: []}, provider: 'mock', model: 'test-model', providerResponseId: 'cross-1'}
    : checked;
};
const run = await runArchitectureJob(p, skeleton, {request, onTheme: async (_theme, _done, _total, themes) => { saved = structuredClone(themes); }});
assert.equal(invoked, 2, 'one bounded theme and one cross-cutting pass');
assert.equal(run.themes[0].status, 'accepted');
assert.equal(run.themes[0].proposals[0].ref, 'REQ:REQ-001:A1', 'theme proposal references are globally distinct');
assert.equal(run.bundle.mode, 'sol');
const responsibility = run.bundle.chapters.find(c => c.chapter === 4).records.find(r => r.title === 'Statement retrieval');
assert.deepEqual(responsibility.cites, ['REQ-001']);
const cross = run.bundle.chapters.find(c => c.chapter === 4).records.find(r => r.title === 'Platform statement retrieval');
assert.deepEqual(cross.cites, ['REQ-001'], 'cross-cutting references resolve to underlying requirements');
const applied = applySteps(p, run.bundle, {at, actor: 'architect', jobId: 'draft-job'});
while (!(step = applied.next()).done) { /* apply canonical commands */ }
assert(step.value.document.logical.responsibilities.some(r => r.title === 'Statement retrieval' && r.state === 'proposed' && r.provenance?.draft?.engine === 'model'));
const resumed = await runArchitectureJob(p, skeleton, {request: async () => { throw Error('A checkpoint should prevent a second provider call.'); }, completed: saved});
assert.equal(resumed.bundle.stamp, run.bundle.stamp, 'a matching checkpoint gives the same bundle');
let slices = 0, sliceCalls = 0, checkpoint = [];
for (;;) {
  const partial = await runArchitectureJob(p, skeleton, {maxNewUnits: 1, completed: checkpoint, request: async q => { sliceCalls++; return request(q); }, onTheme: async (_theme, _done, _total, themes) => { checkpoint = structuredClone(themes); }});
  slices++;
  if (!partial.pending) { assert.equal(partial.bundle.stamp, run.bundle.stamp); break; }
  assert(slices < 5, 'bounded continuation completes');
}
assert.equal(sliceCalls, 2, 'one theme and one cross pass are each called once across durable slices');
assert.equal(slices, 2, 'the cross pass owns its own slice');
const fallen = await runArchitectureJob(p, skeleton, {request: async () => { throw Error('Synthetic upstream outage'); }});
assert.equal(fallen.themes[0].status, 'failed');
assert(fallen.bundle.chapters.find(c => c.chapter === 4).records.some(r => r.sol?.engine === 'rules'), 'a failed theme retains its rules skeleton');
let failedCheckpoint = [];
await runArchitectureJob(p, skeleton, {maxNewUnits: 1, request: async () => { throw Error('Temporary upstream outage'); }, onTheme: async (_theme, _done, _total, themes) => { failedCheckpoint = structuredClone(themes); }});
assert.equal(failedCheckpoint[0].attempts, 1);
const recovered = await runArchitectureJob(p, skeleton, {maxNewUnits: 1, completed: failedCheckpoint, request, onTheme: async (_theme, _done, _total, themes) => { failedCheckpoint = structuredClone(themes); }});
assert.equal(recovered.themes[0].status, 'accepted', 'an interrupted provider theme gets one bounded retry on the next slice');
let failureCalls = 0;
await runArchitectureJob(p, skeleton, {maxNewUnits: 1, request: async () => { failureCalls++; throw Error('Upstream stays unavailable'); }, onTheme: async (_theme, _done, _total, themes) => { failedCheckpoint = structuredClone(themes); }});
const twice = await runArchitectureJob(p, skeleton, {maxNewUnits: 1, completed: failedCheckpoint, request: async () => { failureCalls++; throw Error('Upstream stays unavailable'); }, onTheme: async (_theme, _done, _total, themes) => { failedCheckpoint = structuredClone(themes); }});
assert.equal(twice.themes[0].status, 'failed');
assert.equal(twice.themes[0].attempts, 2);
await runArchitectureJob(p, skeleton, {completed: failedCheckpoint, request: async () => { failureCalls++; throw Error('An exhausted theme must not call the provider again.'); }});
assert.equal(failureCalls, 2, 'an exhausted theme cannot call the provider again');
console.log('PASS Architecture job: checked model request, distinct theme refs, cross citations, model provenance through apply, checkpoint replay, bounded retry and fallback');
