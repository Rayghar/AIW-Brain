// Records how Sol's checks treat each reported defect, case by case, on the code in the working tree.
// Run from AIW-V5-Local-Source: node ../release-evidence/sol-check-fixes/probe-sol-checks.mjs <label>
// Writes release-evidence/sol-check-fixes/PROBE_<label>.json. Uses the provider test double only.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const src = path.resolve('.'), at = f => pathToFileURL(path.join(src, f)).href;
const {seedProject} = await import(at('public/requirements-domain.js'));
const {withFinalReview} = await import(at('public/review-domain.js'));
const {reasoningPacket, validateReasoningOutput, guardReasoning, settleReasoning, REVIEW_INSTRUCTIONS} = await import(at('public/brain-reasoning.js'));
const {requestReasoning} = await import(at('intelligence-provider.js'));
const {mockAssessment, mockReview, envelope} = await import(at('mock-llm-provider.mjs'));

const project = withFinalReview(seedProject());
const packet = reasoningPacket(project, {task: 'decisions', ids: ['F:capacity:run-001', 'F:latency:QD-003', 'F:capacity:run-008', 'J:security:run-002', 'F:switch:tr-003', 'D:ADR-001'], scope: 'probe'});
const good = mockAssessment(packet), prose = n => Array.from({length: n}, () => 'The arithmetic follows the reading and names what still needs evidence.').join(' ');
// What happens to the batch: settled per decision, or the error that ends the whole request.
function outcome(raw) {
  try { const s = settleReasoning(packet, guardReasoning(packet, validateReasoningOutput(raw, packet)), null);
    return {batch: 'completed', answered: s.assessments.filter(a => !a.withheld).length, withheld: s.assessments.filter(a => a.withheld).map(a => ({id: a.id, issues: a.issues})), of: packet.items.length}; }
  catch (e) { return {batch: 'failed', error: e.message, answered: 0, of: packet.items.length}; }
}
const edit = f => { const x = structuredClone(good); f(x); return outcome(x); };
const cases = {
  'reasoning over 1,800 characters': edit(x => { x.assessments[0].reasoning = prose(40); }),
  'a fifth risk': edit(x => { x.assessments[1].risks = ['One.', 'Two.', 'Three.', 'Four.', 'Five.']; }),
  'a headline over 240 characters': edit(x => { x.assessments[1].headline = 'A headline that runs on and on '.repeat(12).trim() + '.'; }),
  'the same decision twice': edit(x => { x.assessments.push(structuredClone(x.assessments[2])); }),
  'guarantee wording in a drafted scaling policy': edit(x => { x.assessments[0].refinements = [{key: 'maxReplicas', value: '26', why: 'Headroom for a rolling release.'}, {key: 'scalingPolicy', value: 'Horizontal Pod Autoscaler on CPU at 70 %, from 3 to 26 replicas, to ensure availability during the peak.', why: 'Names the policy the reading implies.'}]; }),
  'guarantee wording in the reasoning (must still withhold)': edit(x => { x.assessments[0].reasoning += ' Twenty-six replicas ensure availability at the peak.'; }),
  'a broken structure (must still fail)': edit(x => { x.assessments[0].extra = 1; })
};
// End to end through the provider path, as a live answer with one oversized field would arrive.
const fetcher = async (url, options) => { const body = JSON.parse(options.body), input = JSON.parse(body.input[0].content); let out;
  if (body.text.format.name === 'aiw_desk_assessment') { out = mockAssessment(input); out.assessments[0].reasoning = prose(40); } else out = mockReview(input);
  return new Response(JSON.stringify(envelope(out))); };
try { const r = await requestReasoning({OPENAI_API_KEY: 'test-key', AIW_LLM_MODEL: 'probe'}, packet, {fetcher}); cases['end to end: one oversized field in a live answer'] = {batch: 'completed', answered: r.result.assessments.filter(a => !a.withheld).length, of: packet.items.length}; }
catch (e) { cases['end to end: one oversized field in a live answer'] = {batch: 'failed', code: e.code, error: e.message, answered: 0, of: packet.items.length}; }
// The second pass: what its instructions say about the design's own gaps and about refinements.
cases['second pass: design gaps are not defects in the advice'] = {stated: /gaps?[^.]{0,120}(design|reading)[^.]{0,160}not (?:a )?defects?|not defects[^.]{0,200}gaps/i.test(REVIEW_INSTRUCTIONS)};
cases['second pass: refinements are proposals, not achieved outcomes'] = {stated: /refinements?[^.]{0,160}proposals?/i.test(REVIEW_INSTRUCTIONS)};
const label = process.argv[2] || 'run';
writeFileSync(path.resolve('../release-evidence/sol-check-fixes/PROBE_' + label + '.json'), JSON.stringify({schema: 'aiw-sol-check-probe-v1', label, at: new Date().toISOString(), provider: 'test double (mock-llm-provider.mjs); no live model', packetDecisions: packet.items.length, cases}, null, 2) + '\n');
for (const [k, v] of Object.entries(cases)) console.log(k.padEnd(58), v.batch ? `${v.batch}${v.error ? ' — ' + v.error : ''} · answered ${v.answered}/${v.of}${v.withheld?.length ? ' · withheld ' + v.withheld.map(w => w.id).join(', ') : ''}` : 'stated: ' + v.stated);
