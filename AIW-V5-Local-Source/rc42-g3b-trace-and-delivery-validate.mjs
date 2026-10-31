// AIW v0.10.0-rc.10.73.42, group G3b (D6, D15): a trace review is refused on a broken trail and stops counting once the
// trail breaks; a delivery action is marked Verified only by a signed-in person who neither wrote nor owns it, and a
// Verified mark without such a person never makes its architecture obligation current-verified. Both ways an action is
// created (review.action and the adoption of Sol's review finding) record its author; legacy, imported and SDD readings
// follow. Synthetic fixtures only; the Worker round trip runs on an in-memory database, with no provider call.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import * as rv from './public/review-domain.js';
import {architectureObligationsFor,architectureEvidenceSources} from './public/architecture-obligations.js';
import {acceptedObligationFixture,linkedAction,verificationPayload,obligationAt} from './architecture-obligation-fixtures.mjs';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {adoptIntelligence,reviewPacket} from './public/intelligence-context.js';
import {reviewInstructionsPin} from './intelligence-provider.js';
import {neutraliseImportedAuthority} from './recovery-service.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const results=[];
async function check(name,fn){try{await fn();results.push(true);console.log('PASS',name);}catch(e){results.push(false);console.log('FAIL',name,'\n ',String(e?.message||e).slice(0,600));}}
const at='2026-10-30T10:00:00.000Z';
const cmd=(p,type,payload={},actor='architect-a',options={})=>rv.applyFinalReviewCommand(p,{type:'review.'+type,payload},at,actor,options).document;
const trace=(p,id,extra={})=>({requirementId:id,stamp:rv.traceStamp(p,id),visited:[0,1,2,3,4],reviewed:true,reviewer:'Synthetic reviewer',notes:'Followed all five stages.',...extra});
const traceFinding=(p,id)=>rv.finalFindings(p).find(f=>f.code==='trace'&&f.objectId===id);
// A requirement nothing in the design answers for: every hop of its trail is missing.
const withRequirement=(doc,id,title)=>{const p=structuredClone(doc);p.artefacts.push({id,type:'requirement',title,description:'The service shall '+title.toLowerCase()+'.',owner:'Synthetic owner',source:'Synthetic fixture',priority:'Should',acceptance:'Given a synthetic case, then '+title.toLowerCase()+'.',origin:'user',confirmed:false,scopeMode:'in',order:0});return rv.withFinalReview(p);};
const base=rv.withFinalReview(seedProject());

// ---------------------------------------------------------------- D6
await check('D6: a trace review is refused while its trail has missing hops, and the refusal names each hop',()=>{
 const lonely=withRequirement(base,'REQ-090','Report every held instruction daily');
 assert.throws(()=>cmd(lonely,'trace',trace(lonely,'REQ-090')),e=>/REQ-090/.test(e.message)&&['4','5','6','7','10'].every(n=>e.message.includes('Chapter '+n)),'a trace review on a trail with missing hops is refused, naming each hop');
 assert(traceFinding(lonely,'REQ-090'),'the trace warning stays');
 assert.deepEqual(rv.traceBreaks(lonely,'REQ-090').map(b=>[b.hop,b.chapter,b.state]),[['logical',4,'missing'],['applications',5,'missing'],['capabilities',6,'missing'],['realizations',7,'missing'],['runtime',10,'missing']]);
 for(const r of rv.reviewRequirements(base))assert.deepEqual(rv.traceBreaks(base,r.id),[],r.id+': the reference trail is whole');
});
await check('D6: a component that names the requirement while no responsibility on its trail reaches it is a broken hop',()=>{
 const p=structuredClone(withRequirement(base,'REQ-090','Report every held instruction daily')),app=p.realisation.components.find(c=>c.id===p.logical.mappings[0].physicalId);app.requirementIds=[...(app.requirementIds||[]),'REQ-090'];const named=rv.withFinalReview(p);
 assert(rv.reviewTrace(named,'REQ-090').applications.some(a=>a.id===app.id),'the component is on the trail by naming the requirement');
 assert.throws(()=>cmd(named,'trace',trace(named,'REQ-090')),e=>/broken/.test(e.message)&&/Chapter 5/.test(e.message));
 assert.deepEqual(rv.traceBreaks(named,'REQ-090').slice(0,2).map(b=>[b.hop,b.state]),[['logical','missing'],['applications','broken']]);
});
await check('D6: a trace review records the trail\'s hops; a review kept on a broken trail stays loadable and no longer clears the warning',()=>{
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
await check('D6: a later break reopens a trace review, including one recorded against the whole design',()=>{
 let p=cmd(base,'trace',{...trace(base,'REQ-002'),stamp:rv.reviewSourceStamp(base)});assert(rv.traceReviewFor(p,'REQ-002'));
 // Its responsibility stops naming it: the trail breaks from Chapter 4 on, and the review no longer counts.
 const q=structuredClone(p);for(const r of q.logical.responsibilities)if(Array.isArray(r.requirementIds))r.requirementIds=r.requirementIds.filter(id=>id!=='REQ-002');const broken=rv.withFinalReview(q);
 assert.equal(rv.reviewTrace(broken,'REQ-002').logical.length,0);
 assert.equal(rv.traceReviewFor(broken,'REQ-002'),null);assert(traceFinding(broken,'REQ-002'));assert(rv.traceBreaks(broken,'REQ-002').some(b=>b.hop==='logical'&&b.chapter===4&&b.state==='missing'));
});
await check('D6: a break that leaves the trail\'s stamp as it was still reopens the trace review (its component names the requirement, its allocation is removed)',()=>{
 // The seed's REQ-001 component names REQ-001 itself, so removing its allocation (MAP-001) keeps it on the trail and the stamp unchanged.
 const named=structuredClone(base);named.realisation.components.find(c=>c.id==='api-pod').requirementIds=['REQ-001'];const p=rv.withFinalReview(named),stamp=rv.traceStamp(p,'REQ-001');
 const reviewed=cmd(p,'trace',trace(p,'REQ-001'));assert(rv.traceReviewFor(reviewed,'REQ-001')&&!traceFinding(reviewed,'REQ-001'),'the whole trail is reviewed');
 const q=structuredClone(reviewed);q.logical.mappings=q.logical.mappings.filter(m=>m.id!=='MAP-001');const broken=rv.withFinalReview(q);
 assert.equal(rv.traceStamp(broken,'REQ-001'),stamp,'the trail\'s stamp is unchanged: the stamp alone cannot see this break');
 assert(rv.reviewTrace(broken,'REQ-001').applications.some(a=>a.id==='api-pod'),'the component is still on the trail');
 assert.equal(rv.traceReviewFor(broken,'REQ-001'),null,'the trace review no longer counts once the allocation is gone');
 assert(traceFinding(broken,'REQ-001'),'and the trace warning is back');
 assert.deepEqual(rv.traceBreaks(broken,'REQ-001').map(b=>[b.hop,b.chapter,b.state]),[['applications',5,'broken']]);
});
await check('D6: a grouped trace review refuses a broken trail by name and accepts it only as a named exception, left open',()=>{
 const p=withRequirement(base,'REQ-092','Export the daily held list'),scope={kind:'requirements',ids:['REQ-001','REQ-092']},{ids}=rv.traceScope(p,scope);
 const group={scope,stamp:rv.groupTraceStamp(p,ids),reviewed:true,reviewer:'Synthetic reviewer',notes:'Followed both trails.'};
 assert.throws(()=>cmd(p,'trace',group,'reviewer-b'),e=>/REQ-092/.test(e.message)&&!/REQ-001/.test(e.message)&&/exception/i.test(e.message));
 const q=cmd(p,'trace',{...group,exceptions:[{id:'REQ-092',reason:'Its trail is not designed yet.'}]},'reviewer-b'),rec=q.finalReview.traces.at(-1);
 assert.deepEqual(rec.requirementIds,['REQ-001']);assert(rec.hops?.['REQ-001']?.runtime>0,'a grouped review keeps each trail\'s state');
 assert(rv.traceReviewFor(q,'REQ-001')&&!rv.traceReviewFor(q,'REQ-092'));
});
await check('D6: a grouped refusal names the first ten broken trails and says how many more there are',()=>{
 let p=base;const lonely=Array.from({length:12},(_,i)=>'REQ-'+(170+i));for(const id of lonely)p=withRequirement(p,id,'Report held instruction set '+id);
 const scope={kind:'requirements',ids:['REQ-001',...lonely]},{ids}=rv.traceScope(p,scope);
 assert.throws(()=>cmd(p,'trace',{scope,stamp:rv.groupTraceStamp(p,ids),reviewed:true,reviewer:'Synthetic reviewer',notes:'Followed every trail.'},'reviewer-b'),e=>lonely.filter(id=>e.message.includes(id+':')).length===10&&!e.message.includes('REQ-001:')&&/and 2 more/.test(e.message),'the refusal counts the broken trails it does not name');
});

// ---------------------------------------------------------------- D15
const action={title:'Synthetic delivery evidence',owner:'Fixture owner',due:'2026-11-01',acceptance:'Record the observed result and review its limits.',objectIds:['api'],findingId:''};
const verify=id=>({id,status:'Verified',progress:'Synthetic observed check only',reviewer:'Typed external reviewer',reference:'Fixture evidence',reviewed:true});
await check('D15: the author of a delivery action does not mark it Verified on a typed reviewer name, with four eyes off or on',()=>{
 const p=cmd(base,'action',action),a=p.finalReview.actions.at(-1);
 assert.throws(()=>cmd(p,'delivery',verify(a.id)),/architect-a/,'its author does not verify it');
 for(const fourEyes of [false,true]){const q=structuredClone(p);q.workspace={...(q.workspace||{}),governance:{...(q.workspace?.governance||{}),fourEyes}};assert.throws(()=>cmd(rv.withFinalReview(q),'delivery',verify(a.id)),/architect-a/,'four eyes '+fourEyes);}
 assert.equal(a.actor,'architect-a','an action records the signed-in person who wrote it');
 // In progress and Blocked are progress, not verification: the author records them.
 assert.equal(cmd(p,'delivery',{id:a.id,status:'In progress',progress:'Started.'}).finalReview.actions.at(-1).status,'In progress');
});
await check('D15: Verified records the signed-in verifier and is refused to nobody signed in, agents, Sol, every author and the owner',()=>{
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
await check('D15: an obligation is current-verified only on a second signed-in person\'s verification; earlier self-verified marks stay loadable and leave it awaiting review',()=>{
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
// The second way the product creates a delivery action: a person adopts one of Sol's review findings (intelligence.adopt).
const solReview=p=>{const instructions=reviewInstructionsPin(),packet=reviewPacket(p,{chapter:4},{instructions}),objectId=packet.sources.find(s=>s.kind==='record').objectId;return {id:'g3b-review-run',mode:'review',status:'completed',request:{chapter:4},packet,instructions,result:{findings:[{id:'F1',elementId:objectId,severity:'confirm',title:'Confirm the responsibility boundary',reason:'The boundary needs a named acceptance condition.'}]}};};
const adoptFinding={kind:'review-finding',findingId:'F1',reviewed:true,historicalAcknowledged:true,historicalReason:'Synthetic fixture: the finding still warrants an action.'};
await check('D15: the person who adopts Sol\'s review finding as a delivery action is its author, and does not verify it after another person saves it',()=>{
 const adopted=adoptIntelligence(base,adoptFinding,solReview(base),at,'architect-a'),p=adopted.document,a=p.finalReview.actions.find(x=>x.id===adopted.selected);
 assert.equal(a.owner,'','adoption leaves the owner to be named');
 const saved=cmd(p,'action',{...a,owner:'Delivery lead',due:'2026-11-15'},'editor-b');
 assert.throws(()=>cmd(saved,'delivery',verify(a.id),'architect-a'),/architect-a wrote/,'the adopter does not verify the action they created');
 assert.throws(()=>cmd(saved,'delivery',verify(a.id),'editor-b'),/editor-b wrote/,'nor does the person who saved it again');
 assert.equal(cmd(saved,'delivery',verify(a.id),'verifier-c').finalReview.actions.find(x=>x.id===a.id).verification.actor,'verifier-c','a third person verifies it');
 assert.equal(a.actor,'architect-a','the adopter is recorded as the action\'s author');
 assert.equal(saved.finalReview.actions.find(x=>x.id===a.id).history.at(-1).actor,'architect-a');
});
await check('D15: over the Worker, intelligence.adopt records the signed-in adopter as the action\'s author (worker.js, intelligence-service.js)',async()=>{
 const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v);},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null;},async delete(k){files.delete(k);}},ASSETS:{fetch:()=>new Response('asset')}};
 const owner='architect-a',api=(path,method='GET',body,as=owner)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{'oai-authenticated-user-id':as,Origin:'https://aiw.test',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
 try{
  let state=await(await api('/api/project')).json();const projectId=state.document.id;
  for(const who of ['editor-b','verifier-c'])await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind(owner,projectId,who,'editor',at).run();
  const run={...solReview(rv.withFinalReview(state.document)),id:crypto.randomUUID(),projectId},key='intelligence/'+owner+'/'+projectId+'/'+run.id+'.json';files.set(key,JSON.stringify(run));
  await env.DB.prepare("INSERT INTO intelligence_runs(owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES(?,?,?,?,?,?,'completed',?,?,?,?,?,?,0,0)").bind(owner,run.id,projectId,run.result.findings[0].elementId,'review',run.packet.stamp,'Synthetic fixture','no-live-model',key,at,at,owner).run();
  const post=async(type,payload,as,expected=200)=>{const r=await api('/api/commands?project='+projectId,'POST',{revision:state.revision,command:{type,payload}},as),body=await r.text();assert.equal(r.status,expected,type+' as '+as+': answered '+r.status+', expected '+expected+' · '+body.slice(0,200));if(r.ok)state=JSON.parse(body);return body;};
  await post('intelligence.adopt',{...adoptFinding,runId:run.id},owner);
  const id=state.selected,a=state.document.finalReview.actions.find(x=>x.id===id);
  await post('review.action',{...a,owner:'Delivery lead',due:'2026-11-15'},'editor-b');
  assert.match(await post('review.delivery',verify(id),owner,400),/architect-a wrote/,'the adopter does not verify it over HTTP');
  await post('review.delivery',verify(id),'verifier-c');assert.equal(state.document.finalReview.actions.find(x=>x.id===id).verification.actor,'verifier-c');
  assert.equal(a.actor,owner,'the Worker records the adopter as the action\'s author');
 }finally{env.DB.close();}
});
await check('D15: the owner check sets case, spaces and punctuation aside (a free-text owner against an account id)',()=>{
 const p=cmd(base,'action',{...action,owner:'Verifier C'}),a=p.finalReview.actions.at(-1);
 assert.throws(()=>cmd(p,'delivery',verify(a.id),'verifier-c'),/verifier-c owns/);
 assert.throws(()=>cmd(p,'delivery',verify(a.id),'verifier.c'),/verifier\.c owns/);
 assert.equal(cmd(p,'delivery',verify(a.id),'reviewer-d').finalReview.actions.at(-1).verification.actor,'reviewer-d');
});
await check('D15: an action saved before authors were recorded keeps its last person writer (provenance.author) as an author once it is saved again',()=>{
 const p=structuredClone(cmd(base,'action',action)),a=p.finalReview.actions.at(-1);delete a.actor;a.provenance={author:{kind:'person',by:'architect-a',at}};
 const legacy=rv.withFinalReview(JSON.parse(JSON.stringify(p)));
 assert.throws(()=>cmd(legacy,'delivery',verify(a.id),'verifier-c'),/names no author/,'it names no author until it is saved again');
 const saved=cmd(legacy,'action',{...a,acceptance:'Revised by a second person.'},'editor-b');
 assert.throws(()=>cmd(saved,'delivery',verify(a.id),'architect-a'),/architect-a wrote/,'its legacy writer does not verify it');
 assert.equal(saved.finalReview.actions.at(-1).history.at(-1).actor,'architect-a','the legacy writer is kept on its revision');
 assert.equal(cmd(saved,'delivery',verify(a.id),'verifier-c').finalReview.actions.at(-1).verification.actor,'verifier-c');
 // A mark of Sol's draft names no person: nothing is taken from it.
 const sol=structuredClone(legacy);sol.finalReview.actions.at(-1).provenance={author:{kind:'sol-draft',by:'sol',at}};
 assert.equal(cmd(rv.withFinalReview(sol),'action',{...a},'editor-b').finalReview.actions.at(-1).history.at(-1).actor,undefined);
});
await check('D15: a recovery import keeps an action\'s author and revision writers as imported assertions only; the action names no author on this workbench',()=>{
 const first=cmd(base,'action',action),p=cmd(first,'action',{...first.finalReview.actions.at(-1),acceptance:'Revised acceptance.'},'editor-b');
 const imported=rv.withFinalReview(neutraliseImportedAuthority(structuredClone(p),at)),ia=imported.finalReview.actions.at(-1),revisions=ia.history.filter(h=>h.revision!=null);
 assert.equal(ia.actor,null);assert.equal(ia.importedActor,'editor-b');
 assert(revisions.length&&revisions.every(h=>!h.actor),'no revision names a signed-in writer on this workbench');assert.deepEqual(revisions.map(h=>h.importedActor),['architect-a']);
 assert.throws(()=>cmd(imported,'delivery',verify(ia.id),'verifier-c'),/names no author/,'it is saved again here before anyone verifies it');
 const saved=cmd(imported,'action',{...ia},'reviewer-d'),sa=saved.finalReview.actions.at(-1);
 assert.equal(sa.history.at(-1).actor,undefined,'the imported writer is not taken as a writer here');assert.equal(sa.history.at(-1).importedActor,'editor-b','and stays on its revision as an imported assertion');
 assert.throws(()=>cmd(saved,'delivery',verify(ia.id),'reviewer-d'),/reviewer-d wrote/);
 assert.equal(cmd(saved,'delivery',verify(ia.id),'verifier-c').finalReview.actions.at(-1).verification.actor,'verifier-c');
});
await check('D15: the delivery edition of the SDD says when a Verified mark does not count for its obligation',()=>{
 let p=acceptedObligationFixture();
 p=applyEvidenceCommand(p,{type:'evidence.source',payload:{title:'Synthetic observed exercise',location:'fixture://observations/g3b-sdd',excerpt:'Fixture: one authoritative effect observed.',status:'Confirmed',confirmedBy:'Synthetic evidence reviewer',reviewed:true}},obligationAt,'synthetic-reviewer').document;
 const sources=architectureEvidenceSources(p,[{sourceId:p.coauthoring.sources[0].id,revision:1}]),first=architectureObligationsFor(p)[0];
 p=rv.applyFinalReviewCommand(p,{type:'review.action',payload:linkedAction(p,first)},obligationAt,'synthetic-reviewer').document;const id=p.finalReview.actions.at(-1).id;
 const verified=rv.applyFinalReviewCommand(p,{type:'review.delivery',payload:verificationPayload(p,id,sources)},obligationAt,'synthetic-verifier').document;
 const line=doc=>architectureMarkdown(doc,{audience:'delivery'}).markdown.split('\n').find(l=>l.startsWith('**'+id+' · '));
 assert(/verified/.test(line(verified))&&!/does not count/.test(line(verified)),line(verified));
 const self=structuredClone(verified);self.finalReview.actions.find(x=>x.id===id).verification.actor='synthetic-reviewer';
 assert.match(line(rv.withFinalReview(JSON.parse(JSON.stringify(self)))),/verified; the mark does not count until a second signed-in person, who did not write or own the action, verifies it/);
});
process.exitCode=results.every(Boolean)?0:1;
console.log(results.filter(Boolean).length+' of '+results.length+' checks pass');
