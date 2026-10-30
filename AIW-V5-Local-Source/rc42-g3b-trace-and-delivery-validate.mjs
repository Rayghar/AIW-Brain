// AIW v0.10.0-rc.10.73.42, group G3b (D6, D15): a trace review is refused on a broken trail and stops counting once the
// trail breaks; a delivery action is marked Verified only by a signed-in person who neither wrote nor owns it, and a
// Verified mark without such a person never makes its architecture obligation current-verified. Synthetic fixtures only.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import * as rv from './public/review-domain.js';
import {architectureObligationsFor,architectureEvidenceSources} from './public/architecture-obligations.js';
import {acceptedObligationFixture,linkedAction,verificationPayload,obligationAt} from './architecture-obligation-fixtures.mjs';
import {applyEvidenceCommand} from './public/evidence-domain.js';

const results=[];
function check(name,fn){try{fn();results.push(true);console.log('PASS',name);}catch(e){results.push(false);console.log('FAIL',name,'\n ',String(e?.message||e).slice(0,600));}}
const at='2026-10-30T10:00:00.000Z';
const cmd=(p,type,payload={},actor='architect-a',options={})=>rv.applyFinalReviewCommand(p,{type:'review.'+type,payload},at,actor,options).document;
const trace=(p,id,extra={})=>({requirementId:id,stamp:rv.traceStamp(p,id),visited:[0,1,2,3,4],reviewed:true,reviewer:'Synthetic reviewer',notes:'Followed all five stages.',...extra});
const traceFinding=(p,id)=>rv.finalFindings(p).find(f=>f.code==='trace'&&f.objectId===id);
// A requirement nothing in the design answers for: every hop of its trail is missing.
const withRequirement=(doc,id,title)=>{const p=structuredClone(doc);p.artefacts.push({id,type:'requirement',title,description:'The service shall '+title.toLowerCase()+'.',owner:'Synthetic owner',source:'Synthetic fixture',priority:'Should',acceptance:'Given a synthetic case, then '+title.toLowerCase()+'.',origin:'user',confirmed:false,scopeMode:'in',order:0});return rv.withFinalReview(p);};
const base=rv.withFinalReview(seedProject());

// ---------------------------------------------------------------- D6
check('D6: a trace review is refused while its trail has missing hops, and the refusal names each hop',()=>{
 const lonely=withRequirement(base,'REQ-090','Report every held instruction daily');
 assert.throws(()=>cmd(lonely,'trace',trace(lonely,'REQ-090')),e=>/REQ-090/.test(e.message)&&['4','5','6','7','10'].every(n=>e.message.includes('Chapter '+n)),'a trace review on a trail with missing hops is refused, naming each hop');
 assert(traceFinding(lonely,'REQ-090'),'the trace warning stays');
 assert.deepEqual(rv.traceBreaks(lonely,'REQ-090').map(b=>[b.hop,b.chapter,b.state]),[['logical',4,'missing'],['applications',5,'missing'],['capabilities',6,'missing'],['realizations',7,'missing'],['runtime',10,'missing']]);
 for(const r of rv.reviewRequirements(base))assert.deepEqual(rv.traceBreaks(base,r.id),[],r.id+': the reference trail is whole');
});
check('D6: a component that names the requirement while no responsibility on its trail reaches it is a broken hop',()=>{
 const p=structuredClone(withRequirement(base,'REQ-090','Report every held instruction daily')),app=p.realisation.components.find(c=>c.id===p.logical.mappings[0].physicalId);app.requirementIds=[...(app.requirementIds||[]),'REQ-090'];const named=rv.withFinalReview(p);
 assert(rv.reviewTrace(named,'REQ-090').applications.some(a=>a.id===app.id),'the component is on the trail by naming the requirement');
 assert.throws(()=>cmd(named,'trace',trace(named,'REQ-090')),e=>/broken/.test(e.message)&&/Chapter 5/.test(e.message));
 assert.deepEqual(rv.traceBreaks(named,'REQ-090').slice(0,2).map(b=>[b.hop,b.state]),[['logical','missing'],['applications','broken']]);
});
check('D6: a trace review records the trail\'s hops; a review kept on a broken trail stays loadable and no longer clears the warning',()=>{
 const legacy=withRequirement(base,'REQ-091','Archive every settled instruction');
 legacy.finalReview.traces.push({id:'TRV-090',at,actor:'architect-a',requirementId:'REQ-091',stamp:rv.traceStamp(legacy,'REQ-091'),basis:'trail',reviewer:'Synthetic reviewer',notes:'Recorded before rc.10.73.42 on a broken trail.'});
 const kept=rv.withFinalReview(JSON.parse(JSON.stringify(legacy)));
 assert.equal(kept.finalReview.traces.at(-1).id,'TRV-090','an existing trace review on a broken trail stays loadable');
 assert.equal(rv.traceReviewFor(kept,'REQ-091'),null,'it no longer counts while its trail is broken');
 assert(traceFinding(kept,'REQ-091'),'and the trace warning is back');
 assert(!rv.finalMilestones(kept).find(m=>m.id==='trace').done);
 const p=cmd(base,'trace',trace(base,'REQ-001')),rec=p.finalReview.traces.at(-1),t=rv.reviewTrace(p,'REQ-001');
 assert(rv.traceReviewFor(p,'REQ-001')&&!traceFinding(p,'REQ-001'),'a whole trail is reviewed as before');
 assert.deepEqual(rec.hops,{logical:t.logical.length,applications:t.applications.length,capabilities:t.capabilities.length,realizations:t.realizations.length,runtime:t.runtime.length},'the review keeps the trail\'s state');
});
check('D6: a later break reopens a trace review, including one recorded against the whole design',()=>{
 let p=cmd(base,'trace',{...trace(base,'REQ-002'),stamp:rv.reviewSourceStamp(base)});assert(rv.traceReviewFor(p,'REQ-002'));
 // Its responsibility stops naming it: the trail breaks from Chapter 4 on, and the review no longer counts.
 const q=structuredClone(p);for(const r of q.logical.responsibilities)if(Array.isArray(r.requirementIds))r.requirementIds=r.requirementIds.filter(id=>id!=='REQ-002');const broken=rv.withFinalReview(q);
 assert.equal(rv.reviewTrace(broken,'REQ-002').logical.length,0);
 assert.equal(rv.traceReviewFor(broken,'REQ-002'),null);assert(traceFinding(broken,'REQ-002'));assert(rv.traceBreaks(broken,'REQ-002').some(b=>b.hop==='logical'&&b.chapter===4&&b.state==='missing'));
});
check('D6: a grouped trace review refuses a broken trail by name and accepts it only as a named exception, left open',()=>{
 const p=withRequirement(base,'REQ-092','Export the daily held list'),scope={kind:'requirements',ids:['REQ-001','REQ-092']},{ids}=rv.traceScope(p,scope);
 const group={scope,stamp:rv.groupTraceStamp(p,ids),reviewed:true,reviewer:'Synthetic reviewer',notes:'Followed both trails.'};
 assert.throws(()=>cmd(p,'trace',group,'reviewer-b'),e=>/REQ-092/.test(e.message)&&!/REQ-001/.test(e.message)&&/exception/i.test(e.message));
 const q=cmd(p,'trace',{...group,exceptions:[{id:'REQ-092',reason:'Its trail is not designed yet.'}]},'reviewer-b'),rec=q.finalReview.traces.at(-1);
 assert.deepEqual(rec.requirementIds,['REQ-001']);assert(rec.hops?.['REQ-001']?.runtime>0,'a grouped review keeps each trail\'s state');
 assert(rv.traceReviewFor(q,'REQ-001')&&!rv.traceReviewFor(q,'REQ-092'));
});

// ---------------------------------------------------------------- D15
const action={title:'Synthetic delivery evidence',owner:'Fixture owner',due:'2026-11-01',acceptance:'Record the observed result and review its limits.',objectIds:['api'],findingId:''};
const verify=id=>({id,status:'Verified',progress:'Synthetic observed check only',reviewer:'Typed external reviewer',reference:'Fixture evidence',reviewed:true});
check('D15: the author of a delivery action does not mark it Verified on a typed reviewer name, with four eyes off or on',()=>{
 const p=cmd(base,'action',action),a=p.finalReview.actions.at(-1);
 assert.throws(()=>cmd(p,'delivery',verify(a.id)),/architect-a/,'its author does not verify it');
 for(const fourEyes of [false,true]){const q=structuredClone(p);q.workspace={...(q.workspace||{}),governance:{...(q.workspace?.governance||{}),fourEyes}};assert.throws(()=>cmd(rv.withFinalReview(q),'delivery',verify(a.id)),/architect-a/,'four eyes '+fourEyes);}
 assert.equal(a.actor,'architect-a','an action records the signed-in person who wrote it');
 // In progress and Blocked are progress, not verification: the author records them.
 assert.equal(cmd(p,'delivery',{id:a.id,status:'In progress',progress:'Started.'}).finalReview.actions.at(-1).status,'In progress');
});
check('D15: Verified records the signed-in verifier and is refused to nobody signed in, agents, Sol, every author and the owner',()=>{
 const p=cmd(base,'action',action),a=p.finalReview.actions.at(-1);
 assert.throws(()=>cmd(p,'delivery',verify(a.id),null),/Sign in/,'a verification needs a signed-in person');
 assert.throws(()=>cmd(p,'delivery',verify(a.id),'sol-agent',{author:{kind:'sol-draft',id:'sol-agent',account:'agent'}}),/agent|Sol/,'an agent account never verifies');
 assert.throws(()=>cmd(p,'delivery',verify(a.id),'verifier-c',{author:{kind:'sol-draft',id:'verifier-c',account:'person'}}),/agent|Sol/,'a draft by Sol never verifies');
 const owned=cmd(p,'action',{...a,owner:'Verifier-C'}),oa=owned.finalReview.actions.at(-1);
 assert.throws(()=>cmd(owned,'delivery',verify(oa.id),'verifier-c'),/owns/,'its owner does not verify it, whatever the case of the name');
 const v=cmd(p,'delivery',verify(a.id),'verifier-c'),va=v.finalReview.actions.at(-1);
 assert.equal(va.status,'Verified');assert.equal(va.verification.actor,'verifier-c','the signed-in verifier is recorded');assert.equal(va.verification.reviewer,'Typed external reviewer');assert(rv.actionComplete(v,va));
 // A person who wrote any revision of the action is one of its authors.
 const r=cmd(p,'action',{...a,acceptance:'Revised acceptance.'},'editor-b'),ra=r.finalReview.actions.at(-1);
 assert.equal(ra.actor,'editor-b');
 for(const who of ['architect-a','editor-b'])assert.throws(()=>cmd(r,'delivery',verify(ra.id),who),new RegExp(who),who+' wrote a revision');
 assert.equal(cmd(r,'delivery',verify(ra.id),'verifier-c').finalReview.actions.at(-1).verification.actor,'verifier-c');
 // An action saved before rc.10.73.42 names no author: nobody can show they are independent of it until it is saved again.
 const old=structuredClone(p);delete old.finalReview.actions.at(-1).actor;
 assert.throws(()=>cmd(rv.withFinalReview(old),'delivery',verify(a.id),'verifier-c'),/author/);
});
check('D15: an obligation is current-verified only on a second signed-in person\'s verification; earlier self-verified marks stay loadable and leave it awaiting review',()=>{
 let p=acceptedObligationFixture();
 p=applyEvidenceCommand(p,{type:'evidence.source',payload:{title:'Synthetic observed exercise',location:'fixture://observations/g3b',excerpt:'Fixture: one authoritative effect observed.',status:'Confirmed',confirmedBy:'Synthetic evidence reviewer',reviewed:true}},obligationAt,'synthetic-reviewer').document;
 const sources=architectureEvidenceSources(p,[{sourceId:p.coauthoring.sources[0].id,revision:1}]),first=architectureObligationsFor(p)[0],read=doc=>architectureObligationsFor(doc).find(o=>o.id===first.id);
 p=rv.applyFinalReviewCommand(p,{type:'review.action',payload:linkedAction(p,first)},obligationAt,'synthetic-reviewer').document;const id=p.finalReview.actions.at(-1).id;
 // The self-verified mark as the code before rc.10.73.42 recorded it: the action's author verified it.
 const self=structuredClone(p),sa=self.finalReview.actions.find(x=>x.id===id);sa.actor='synthetic-reviewer';
 const selfMarked=rv.applyFinalReviewCommand(rv.withFinalReview(self),{type:'review.delivery',payload:verificationPayload(self,id,sources)},obligationAt,'synthetic-verifier').document;
 selfMarked.finalReview.actions.find(x=>x.id===id).verification.actor='synthetic-reviewer';
 const loaded=rv.withFinalReview(JSON.parse(JSON.stringify(selfMarked)));
 assert.equal(loaded.finalReview.actions.find(x=>x.id===id).status,'Verified','a self-verified mark stays loadable');
 assert.notEqual(read(loaded).verificationState,'current-verified','a self-verified mark does not make the obligation current-verified');
 assert.throws(()=>rv.applyFinalReviewCommand(p,{type:'review.delivery',payload:verificationPayload(p,id,sources)},obligationAt,'synthetic-reviewer'),/synthetic-reviewer/);
 const verified=rv.applyFinalReviewCommand(p,{type:'review.delivery',payload:verificationPayload(p,id,sources)},obligationAt,'synthetic-verifier').document;
 assert.equal(read(verified).verificationState,'current-verified');
 const legacy=edit=>{const q=structuredClone(verified);edit(q.finalReview.actions.find(x=>x.id===id));return rv.withFinalReview(JSON.parse(JSON.stringify(q)));};
 for(const [why,edit] of [['by its author',a=>{a.verification.actor=a.actor;}],['by its owner',a=>{a.verification.actor=a.owner;}],['by nobody signed in',a=>{delete a.verification.actor;}],['on an action that names no author',a=>{delete a.actor;}]]){
  const q=legacy(edit),o=read(q),a=q.finalReview.actions.find(x=>x.id===id);
  assert.equal(a.status,'Verified',why+': the mark stays loadable');
  assert.equal(o.verificationState,'evidence-awaiting',why+': awaiting an independent verification');assert.equal(o.verification,'pending',why);
  assert(o.verificationReasons.some(x=>/second signed-in person/.test(x)),why+': '+o.verificationReasons.join(' '));
  assert(!rv.actionComplete(q,a),why+': the action is not complete');
  assert(rv.finalFindings(q).some(f=>f.code==='architecture-obligation'&&f.objectId===first.id),why+': the final checks ask for it');
 }
});
process.exitCode=results.every(Boolean)?0:1;
console.log(results.filter(Boolean).length+' of '+results.length+' checks pass');
