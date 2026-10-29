// Regressions from the bounded live Sol packet: unstated priority became Must,
// and vague timing was described as a measurable acceptance criterion.
// Synthetic records and provider transport only; no external model or approval.
import assert from 'node:assert/strict';
import {seedProject, findings} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {storySource, foldStory, describeRequirement} from './public/story-model.js';
import {storyLayout} from './public/story-layout.js';
import {chapterReading} from './public/chapter-reasoning.js';
import {suggest} from './public/field-suggestions.js';
import {draftChapter} from './public/journey-drafter.js';
import {requestFieldDraft, guardFieldDraft, SPECIFICATION_DISCIPLINE} from './intelligence-provider.js';

const p=withFinalReview(seedProject()), req=p.artefacts.find(r=>r.id==='REQ-001');
req.priority='';
req.description='The service shall retain the request status for an authorised enquiry.';
req.acceptance='Given a pending request, when an authorised maker enquires, then its stored status is returned.';
const before=JSON.stringify(p), model=storySource(p);
assert.equal(model.R.get(req.id).priority,'Not stated');
assert.match(describeRequirement(model,req.id),/Not stated/);
assert.doesNotMatch(describeRequirement(model,req.id),/\(Must\)/);
for(const depth of ['requirements','steps']) {
  const folded=foldStory(model,{kind:'system'},depth), layout=storyLayout(folded);
  assert.ok(folded.bands.includes('Not stated'));
  assert.ok(layout.cards.some(c=>c.card.members.includes(req.id)&&c.card.band==='Not stated'));
  assert.ok(layout.cards.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)));
}
const ghost=foldStory(model,{kind:'system'},'requirements',{ghost:{mode:'new',record:{type:'requirement',title:'Synthetic open-priority request',priority:''},links:[]}});
assert.equal(ghost.ghost.band,'Not stated');
assert.ok(storyLayout(ghost).cards.some(c=>c.id===ghost.ghost.id));
const reading=chapterReading(p,'M:1:'+req.id).reading;
assert.ok(reading.notRecorded.includes('priority'));
assert.match(reading.chapterReads,/Not stated/);
assert.doesNotMatch(reading.chapterReads,/\(Must\)/);
assert.equal(JSON.stringify(p),before,'reading the model must not change its canonical priority');

const offers=suggest(p,'quality.driver','rationale',{values:{requirementIds:[req.id]}});
assert.ok(offers.some(o=>o.value.includes('has no stated priority')));
assert.ok(offers.every(o=>!o.value.includes('is a Must requirement')));
const draftProject=structuredClone(p);
draftProject.quality.drivers=draftProject.quality.drivers.filter(d=>!d.requirementIds.includes(req.id));
const draft=draftChapter(draftProject,2).records.find(r=>r.answers.requirementId===req.id);
assert.ok(draft,'the missing-priority requirement still gets a reviewable quality draft');
assert.equal(draft.answers.priority,'');
assert.ok(draft.gaps.some(g=>g.key==='priority'));
assert.match(draft.answers.rationale,/has no stated priority/);
for(const [recorded,expected] of [['Must','High'],['Should','Medium'],['Could','Low']]) {
  const q=structuredClone(draftProject);q.artefacts.find(r=>r.id===req.id).priority=recorded;
  assert.equal(draftChapter(q,2).records.find(r=>r.answers.requirementId===req.id).answers.priority,expected,'recorded priorities retain their mapped level instead of falling back to the first option');
}

for(const wording of ['immediately','promptly','quickly']) {
  const q=structuredClone(p), r=q.artefacts.find(x=>x.id===req.id);
  r.acceptance='Given a pending request, when an authorised maker enquires, then its stored status is returned '+wording+'.';
  const issue=findings(q).find(f=>f.artefactId===req.id&&f.code==='acceptance');
  assert.ok(issue,'vague timing in acceptance is surfaced even with a clear description');
  assert.ok(issue.detail.includes(wording));
  assert.equal(storySource(q).R.get(req.id).testable,false);
}
assert.ok(!findings(p).some(f=>f.artefactId===req.id&&f.code==='acceptance'),'observable functional acceptance does not need an invented numeric target');
const timed=structuredClone(p);
timed.artefacts.find(r=>r.id===req.id).acceptance='Given a pending request and the agreed workload, when an authorised maker enquires, then its stored status is returned within 250 milliseconds from API receipt to response completion.';
assert.ok(!findings(timed).some(f=>f.artefactId===req.id&&f.code==='acceptance'),'a stated timing criterion is not rejected as vague');

const packet={stamp:'synthetic-unknown-facts',target:{field:'acceptance',maxLength:4000,current:''},sources:[{ref:'S1',excerpt:'The stored request status must be returned. Priority and response-time target are not stated.'}]};
const draftOutput={field:'acceptance',value:'Given a pending request, when a maker enquires, then the stored status is returned immediately.',basis:'S1 supports this complete measurable acceptance criterion.',sourceRefs:['S1']};
assert.ok(guardFieldDraft({...packet,target:{...packet.target,field:'description'}},{field:'description',value:'The requirement should specify the accountable owner and the business outcome.',basis:'Missing information in S1.',sourceRefs:['S1']}).some(x=>x.includes('instructions to the architect')),'authoring guidance cannot replace recorded system behaviour');
assert.deepEqual(guardFieldDraft(packet,{...draftOutput,value:req.acceptance,basis:'A proposed observable result from S1; no timing target is stated.'}),[],'a functional behaviour draft remains possible without a numeric target');
const calls=[];
const run=await requestFieldDraft({OPENAI_API_KEY:'synthetic-not-a-real-key',AIW_LLM_MODEL:'synthetic-model',AIW_LLM_BASE_URL:'http://127.0.0.1:9/v1'},packet,{fetcher:async(_url,init)=>{
  const sent=JSON.parse(init.body);calls.push(sent);
  assert.ok(sent.instructions.includes(SPECIFICATION_DISCIPLINE),'both provider passes receive the same specification discipline');
  const result=calls.length===1?draftOutput:{supported:false,defects:['Immediately has no agreed timing boundary or threshold; this is not a complete measurable criterion.'],notes:[]};
  return new Response(JSON.stringify({id:'synthetic-'+calls.length,model:'synthetic-model',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}],usage:{input_tokens:10,output_tokens:10}}),{status:200});
}});
assert.equal(calls.length,2);
assert.equal(run.groundingReview.accepted,false);
assert.equal(run.result.withheld,true);
assert.equal(run.result.value,'');
console.log('PASS: unknown priorities remain unknown through model, layout, Sol context and quality drafts; vague timing remains an acceptance gap; provider review defects withhold misleading wording. Synthetic provider transport only.');
