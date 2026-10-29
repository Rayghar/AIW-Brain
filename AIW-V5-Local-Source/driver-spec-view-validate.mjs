// Applied design facts are read from the existing task history and folded into
// the established component specification. No second register or document schema.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {reasoningSource} from './public/design-reasoning.js';
import {componentSpec} from './public/design-spec.js';
import {componentSheet, componentSheetHTML, SHEET_SECTIONS} from './public/component-spec-view.js';

const project=withFinalReview(seedProject());
project.quality.drivers.push({id:'AD-OPS',kind:'operational',title:'Existing incident team',description:'The current team owns this boundary.',impact:'Reuse the established incident ownership.',componentIds:['api-pod'],responsibilityIds:[],requirementIds:[],confirmed:true});
project.coauthoring||={};project.coauthoring.designTasks||=[];
project.coauthoring.designTasks.push({id:'DES-SPEC',kind:'architecture',status:'applied',applied:{alternativeId:'ALT-SPEC',at:'2026-10-20T12:00:00.000Z',reasoningGraph:{solution:{
 id:'solution:DES-SPEC',state:'applied',taskId:'DES-SPEC',driverIds:['QD-002','AD-OPS'],decisionId:'ADR-001',verification:'pending',
 mechanism:{pattern:'Protected dependency call',tactic:'Circuit breaker'},
 placement:[{role:'caller',componentId:'api-pod',scope:'policy',responsibility:'Bound the remote wait and retain the honest unavailable result.'},{role:'processor',componentId:'risk-engine',scope:'responsibility',responsibility:'Unrelated dependency implementation must not leak into caller placement.'}],
 obligations:[{id:'DES-SPEC:failure',kind:'verification',action:'Inject dependency failure <during peak load>.',evidence:'Measure timeout and unavailable outcomes.',targetIds:['api-pod'],driverIds:['QD-002'],declared:true,verification:'pending'},{id:'DES-SPEC:other',kind:'recovery',action:'Unrelated recovery procedure.',evidence:'Other component recovery test.',targetIds:['risk-engine'],declared:false,verification:'pending'}],
 specifications:[{componentId:'api-pod',obligationIds:['DES-SPEC:failure'],capabilityIds:[]},{componentId:'risk-engine',obligationIds:['DES-SPEC:other'],capabilityIds:[]}]
}}}});
const before=JSON.stringify(project),C=componentSpec(reasoningSource(project),'api-pod'),html=componentSheetHTML(project,'api-pod'),sheet=componentSheet(project,'api-pod');
assert.ok(C.architectureSolutions.length===1&&C.architectureObligations.length===1,'The component specification reads the applied design and its own obligation');
assert.deepEqual(sheet.sections.map(s=>s.id),SHEET_SECTIONS.slice(1).map(s=>s.id),'The sheet renders the nine sections of the template after the identity');
assert.equal((html.match(/data-spec-section=/g)||[]).length,10,'The ten sections, the identity included, are on the page');
const responsibilities=html.match(/data-spec-section="purpose"[\s\S]*?<\/section>/)?.[0];
const solution=html.match(/data-spec-section="decisions"[\s\S]*?<\/section>/)?.[0];
const drivers=html.match(/data-spec-section="basis"[\s\S]*?<\/section>/)?.[0];
assert.match(responsibilities,/data-spec-field="roles"/,'The applied design’s role for this component is a field of Purpose and responsibilities');
assert.match(responsibilities,/caller · policy/);assert.match(responsibilities,/Bound the remote wait/);
assert.doesNotMatch(responsibilities,/Unrelated dependency/,'Placement is scoped to the held component');
assert.match(solution,/Protected dependency call · Circuit breaker/);
assert.match(solution,/DES-SPEC/);assert.match(solution,/decision=ADR-001/);
assert.match(solution,/data-spec-obligation="DES-SPEC:failure"/);
assert.match(solution,/Inject dependency failure &lt;during peak load&gt;/,'Project text is escaped');
assert.match(solution,/Measure timeout and unavailable outcomes/);assert.match(solution,/Verification pending/);
assert.doesNotMatch(solution,/Unrelated recovery/,'Only this component’s obligations are shown');
assert.match(drivers,/Drivers reaching it/);assert.match(drivers,/data-spec-driver="AD-OPS"/);assert.match(drivers,/Operational/);
assert.match(drivers,/Reuse the established incident ownership/,'Non-quality drivers show architectural impact');
assert.doesNotMatch(drivers,/AD-OPS[\s\S]*no target yet/);
assert.equal(JSON.stringify(project),before,'Reading the specification does not mutate design or task history');
console.log('PASS applied driver-design specification view: existing groups, exact placement, source decision and drivers, pending obligations, all driver kinds, escaped content and read-only projection.');
