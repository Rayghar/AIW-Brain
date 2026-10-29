// Native UI integration only. No browser, listener, provider or saved-project
// command is needed to read guidance or inspect its exact source.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

const w=new Window({url:'https://aiw.test/?project=intelligence-ui&chapter=5&tab=work&object=api-pod',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const k of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','MutationObserver','navigator','CSS'])Object.defineProperty(globalThis,k,{value:k==='window'?w:w[k],configurable:true,writable:true});
for(const k of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[k]=w[k].bind(w);
const requests=[],notices=[];let writes=0;
globalThis.fetch=async(url,options={})=>{requests.push({url:String(url),method:options.method||'GET'});assert.equal(options.method||'GET','GET','Reading a native surface must not send a provider or mutation request');return new Response(JSON.stringify({configured:false,runs:[],proposals:[],sources:[],releases:[],connectors:[],draft:null,status:{available:false}}),{status:200,headers:{'Content-Type':'application/json'}});};
window.addEventListener('aiw:notice',e=>notices.push(e.detail.message));
const waitFor=async(check,message)=>{for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail(message);};
const pause=()=>new Promise(r=>setTimeout(r,30));
const dom=html=>{const t=document.createElement('template');t.innerHTML=html;return t.content;};
const {createProject}=await import('./shared/projects-domain.js');
const {applyKnowledgeCommand,knowledgeStamp,knowledgeState}=await import('./public/knowledge-governance.js');
const {applyArchitectureCommand}=await import('./public/architecture-design.js');
const {loadCatalogue}=await import('./public/catalogue-store.js');
const {knowledgeStructures}=await import('./public/knowledge-structure.js');
const {architectureIntelligence}=await import('./public/architecture-intelligence.js');
const {chapterInsight,intelligenceActionHTML}=await import('./public/chapter-insight.js');
const {chapterHeaderHTML}=await import('./public/chapter-header.js');
const {chapterBrief,briefHTML}=await import('./public/chapter-brief.js');
const {solSection,refreshModelIntelligence}=await import('./public/chapter-sol.js');
const {brainContext}=await import('./public/aiw-brain.js');
const {coDesignGuideHTML}=await import('./public/co-design-guide.js');
const {validationSurfaceHTML,mountValidationWorkspace,refreshValidationIntelligence}=await import('./public/validation-workspace.js');
const {outputWorkspaceHTML,mountOutputWorkspace,refreshOutputIntelligence}=await import('./public/output-workspace.js');
const {SOL}=await import('./public/brain-reasoning-ui.js');
const {renderAKRDiscovery}=await import('./public/akr-source-discovery-ui.js');
const {renderRepositoryPilot}=await import('./public/repository-pilot-ui.js');

let p=createProject({name:'Synthetic native guidance fixture',template:'bank-payment'},'intelligence-ui','2026-10-20T15:00:00Z');
p.decisions.records=[]; // This fixture isolates a source prerequisite from stronger native decision blockers.
const at='2026-10-20T15:01:00Z',author='synthetic-author',reviewer='synthetic-reviewer';
const command=(type,payload,actor=author)=>{const r=applyKnowledgeCommand(p,{type:'knowledge.'+type,payload},at,actor);p=r.document;return r.selected;};
const review={reviewed:true,reviewer:'Synthetic second architect',reason:'Checked the exact source, permission, interpretation and conditions.',sourceChecked:true,rightsChecked:true,conditionsChecked:true,decision:'verified'};
const sourceId=command('source',{title:'Synthetic repeat policy <exact>',body:'Only repeat an operation when its business effect is idempotent or atomically deduplicated. A finite attempt budget still applies.',revision:'fixture-1',path:'synthetic/repeated-effect.txt',license:'Original synthetic test material'});
const unit={kind:'tactic',mechanism:'Bound repeated work and protect its business effect.',effects:[{quality:'reliability',direction:'supports',rationale:'A safe repeat can recover a transient failure; success remains unverified.'}],obligations:[{action:'Prove repeated effects are controlled.',evidence:'Repeat an uncertain request and verify one effect.'}],exclusions:['Unprotected repeated side effects.'],applicability:{requires:[{id:'safe-repeat',fact:'operation.repeatable',op:'eq',value:true,label:'The operation can be repeated safely.'}]},placement:[{target:'caller',reason:'The caller owns the attempt and deadline policy.'}]};
const claimId=command('claim',{sourceId,lineStart:1,lineEnd:1,subjectId:'synthetic-repeat-policy',predicate:'requires',statement:'Repeated attempts require a safe business effect and finite budget.',claimType:'prerequisite',polarity:'requires',conditions:['The selected operation may repeat.'],limitations:['This does not prove successful completion.'],architectureUnit:unit});
command('review',{...review,id:claimId},reviewer);
const releaseId=command('release',{...review,title:'Synthetic repeat policy',claimIds:[claimId]});
command('activate',{...review,id:releaseId,stamp:knowledgeStamp(p)});
command('link',{...review,objectId:'api-pod',claimId,releaseId});
const started=applyArchitectureCommand(p,{type:'architecture.start',payload:{topic:'interaction',requirementId:'REQ-001',driverId:'QD-002',contextIds:['api-pod']}},at);
p=started.document;const savedTaskId=started.selected;
const store={value:{document:p,revision:1},command:async()=>{writes++;throw Error('A read-only UI proof must not save');}};
window.aiwProjectStore=store;
Object.assign(SOL,{projectId:p.id,config:{configured:false},loading:false});
await loadCatalogue();
const before=JSON.stringify(p),reading=architectureIntelligence(p,{chapter:5,id:'api-pod'}),primary=reading.primary;
assert.equal(primary.authority.kind,'project-reviewed');assert.equal(primary.state,'needs-context');
const source=reading.sources.find(s=>s.id==='claim:'+releaseId+':'+claimId);assert(source,'The linked reviewed source is in the common reading');
const requestFor=(r,i,a)=>({projectId:p.id,subjectId:r.subject.id,chapter:r.subject.chapter,insightId:i.id,actionId:a.id,basisStamp:r.receipt.basisStamp,knowledgeStamp:r.receipt.knowledgeStamp});
const sourceAction=primary.actions.find(a=>a.kind==='open-knowledge'),sourceRequest=requestFor(reading,primary,sourceAction);
try{
 const work=dom(briefHTML(p,chapterBrief(p,5,'work','api-pod'))),model=dom(solSection(p,5,'api-pod')),coDesign=dom(coDesignGuideHTML(brainContext(p,{chapter:5,id:'api-pod',tab:'work'})));
 for(const [name,root] of [['Work',work],['Model',model],['Co-design',coDesign]]){
  assert(root.querySelector('[data-intelligence-id="'+primary.id+'"]'),name+' keeps the common insight identity');
  assert(root.textContent.includes(primary.question),name+' keeps the same next question');
  assert(root.textContent.includes(source.receipt.sourceHash),name+' exposes the exact source hash');
  assert(root.textContent.includes('This does not prove successful completion.'),name+' retains the source limitation');
  const action=root.querySelector('[data-intelligence-action="'+sourceAction.id+'"]');
  assert.equal(action?.dataset.intelligenceBasis,reading.receipt.basisStamp);assert.equal(action?.dataset.intelligenceKnowledge,reading.receipt.knowledgeStamp);
 }
 for(const tab of ['work','model','validate','output']){
  const r=architectureIntelligence(p,{chapter:5,id:'api-pod',tab}),header=chapterInsight(p,5,{tab,selectedId:'api-pod'});
  assert.equal(r.receipt.basisStamp,reading.receipt.basisStamp,'Presentation tabs do not change the saved design basis');
  assert.equal(header.lead.intelligence?.insight.id,primary.id,'The typed missing condition is the same primary in every chapter header');
  const link=dom(chapterHeaderHTML(header)).querySelector('a.chapter-next');
  assert(link,'The native Work destination stays reachable');
  const target=new URL(link.href,'https://aiw.test');assert.equal(target.searchParams.get('project'),p.id);assert.equal(target.searchParams.get('object'),'api-pod');
 }
 assert(requests.every(r=>r.method==='GET'&&r.url.includes('/api/intelligence/review-runs?')),'The existing Model companion may read saved review runs; contextual guidance never invokes a provider');
 console.log('PASS: Work, Model, Co-design and all four tab headers share the question, native action and exact source meaning');

 document.body.innerHTML='<main><input id="draft" value="Original"><section id="model">'+solSection(p,5,'api-pod')+'</section><section id="validate">'+validationSurfaceHTML(p,5,{findings:[{id:'fixture-missing-context',objectId:'api-pod',level:'error',title:'Synthetic missing condition',detail:'Review the selected operation.',actions:'<button type="button">Review definition</button>'}],title:'Review the saved component',purpose:'Synthetic fixture',run:'<button type="button">Run checks</button>'})+'</section><section id="output">'+outputWorkspaceHTML(p,5,{selectedId:'api-pod'})+'</section></main>';
 mountValidationWorkspace(document.querySelector('#validate'));
 mountOutputWorkspace(document.querySelector('#output'));
 // rc41 close (C5): the component specifications are one item of Output's strip; the component is chosen in the document.
 document.querySelector('[data-output-document="spec"]').click();
 {const pick=document.querySelector('#output select[data-output-record="spec"]');assert(pick,'the specification offers its component');pick.value='spec:api-pod';pick.dispatchEvent(new Event('change',{bubbles:true}));assert.equal(document.querySelector('#output select[data-output-record="spec"]').value,'spec:api-pod','api-pod’s specification is the one chosen');assert.match(document.querySelector('#output iframe').getAttribute('src'),/document=spec&id=api-pod&/);}
 for(const selector of ['[data-validation-intelligence]','[data-output-intelligence]']){
  const root=document.querySelector(selector);assert(root.querySelector('[data-intelligence-id="'+primary.id+'"]'));assert(root.textContent.includes(source.receipt.sourceHash));
 }
 const draft=document.querySelector('#draft'),frame=document.querySelector('iframe');draft.value='Unsaved native input';draft.focus();draft.setSelectionRange(4,11);
 const detail=document.querySelector('[data-sol-intelligence] details');detail.open=true;
 refreshModelIntelligence(p);refreshValidationIntelligence(p);refreshOutputIntelligence(p);
 assert.equal(document.querySelector('#draft'),draft);assert.equal(draft.value,'Unsaved native input');assert.equal(document.activeElement,draft);assert.equal(draft.selectionStart,4);assert.equal(draft.selectionEnd,11);assert.equal(document.querySelector('iframe'),frame,'Derived refresh retains the exact preview iframe');
 assert.equal(document.querySelector('[data-sol-intelligence] details').open,true,'Expanded source disclosure remains expanded');
 assert.equal(JSON.stringify(p),before);
 console.log('PASS: Validate and Output retain the same source reading; derived refresh preserves native input, caret, disclosure and preview');

 // Only now mount the real Companion. Its repository workspace remains lazy.
 document.body.innerHTML='<div id="app"><div class="r-assistant-bar"><button data-fixture="sol">Ask Sol</button><button data-fixture="mind">Co-design</button></div></div>';
 document.body.classList.add('cm-active');
 const brain=await import('./public/brain-context-ui.js');
 brain.mountBrainContext(p,{chapter:5,id:'api-pod'},'work');
 const holder=document.createElement('div');holder.innerHTML=intelligenceActionHTML(reading,primary,sourceAction,{projectId:p.id});document.body.append(holder);
 const detached=holder.querySelector('button');detached.click();holder.remove();await pause();
 assert.equal(document.querySelector('dialog[open]'),null,'A detached click is not replayed after the lazy Companion import');
 assert.equal(brain.launchIntelligenceAction({...sourceRequest,actionId:'forged-command'}),false);
 assert.equal(brain.launchIntelligenceAction({...sourceRequest,basisStamp:'old-basis'}),false);
 const other=architectureIntelligence(p,{chapter:5,id:'core-adapter'}),otherInsight=other.insights.find(i=>i.actions.some(a=>a.kind==='open-knowledge'));
 assert(otherInsight,'A distinct real component has its own current source action');
 assert.equal(brain.launchIntelligenceAction(requestFor(other,otherInsight,otherInsight.actions.find(a=>a.kind==='open-knowledge'))),false,'An off-context action is rejected even when its source is valid');
 assert.equal(brain.launchIntelligenceAction(sourceRequest),true);
 await waitFor(()=>document.querySelector('dialog[open] .ak-source-hash'),'The exact released source opens through the existing reader');
 const exact=document.querySelector('dialog[open]');assert(exact.textContent.includes(source.receipt.sourceHash));assert(exact.textContent.includes('Synthetic repeat policy <exact>'));assert(exact.textContent.includes('fixture-1'));assert(exact.textContent.includes('This does not prove successful completion.'));assert.equal(exact.querySelector('exact'),null,'Source title is escaped');
 exact.querySelector('[data-dialog-close]').click();
 console.log('PASS: native source actions resolve exact receipts; forged, stale, off-context and detached actions cannot navigate');

 const catalogueInsight=reading.insights.find(i=>i.actions.some(a=>a.kind==='open-knowledge'&&a.sourceId.startsWith('catalogue:')));assert(catalogueInsight,'Fixture retains related catalogue context');
 const catalogueAction=catalogueInsight.actions.find(a=>a.kind==='open-knowledge'),catalogueRequest=requestFor(reading,catalogueInsight,catalogueAction);
 window.aiwArchitectureTask.openTask(savedTaskId);assert(document.querySelector('.arc-task-head'),'Existing saved architecture comparison is active');
 const condition=document.querySelector('[data-arc-field="information"]');condition.value='Unsaved ownership condition';condition.dispatchEvent(new Event('input',{bubbles:true}));
 brain.launchIntelligenceAction(catalogueRequest);assert(document.querySelector('.arc-leave'),'Existing unsaved architecture guard is used');assert.equal(document.querySelector('[data-arc-field="information"]').value,'Unsaved ownership condition');
 document.querySelector('[data-arc-action="stay"]').click();document.querySelector('[data-arc-action="compare"]').click();
 brain.launchIntelligenceAction(catalogueRequest);document.querySelector('[data-arc-action="discard"]').click();
 await waitFor(()=>document.querySelector('.kw-concept'),'Catalogue source is visible after discarding the explicitly guarded unsaved condition');
 window.aiwArchitectureTask.openTask(savedTaskId);assert.equal(document.querySelector('.arc-steps [aria-current="step"]').dataset.arcAction,'compare','Resuming the saved task retains its comparison step');
 assert.equal(brain.launchIntelligenceAction(catalogueRequest),true);
 await waitFor(()=>document.querySelector('.kw-concept'),'Catalogue source is visible after the native guarded return');
 assert.equal(document.querySelector('.kw-concept [data-k-action="concept-connections"]').dataset.id,catalogueAction.sourceId.slice(10),'The exact catalogue concept is selected');
 assert.equal(document.querySelector('.arc-task-head'),null,'Source reading is not hidden by the active comparison');
 window.aiwKnowledge.openView('sources');
 document.querySelector('[data-k-action="new-source"]').click();
 let title=document.querySelector('[data-k-field="title"]');title.value='Unsaved source interpretation';title.dispatchEvent(new Event('input',{bubbles:true}));
 assert.equal(brain.launchIntelligenceAction(sourceRequest),true);assert(document.querySelector('.kw-leave'),'Existing unsaved-source guard is used');assert.equal(document.querySelector('[data-k-field="title"]').value,'Unsaved source interpretation');assert.equal(document.querySelector('dialog[open]'),null);
 document.querySelector('[data-k-action="stay"]').click();assert.equal(document.querySelector('[data-k-field="title"]').value,'Unsaved source interpretation');
 brain.launchIntelligenceAction(sourceRequest);
 const changed=structuredClone(p);changed.realisation.components.find(c=>c.id==='api-pod').description+=' Changed after this action was offered.';store.value={document:changed,revision:2};
 document.querySelector('[data-k-action="discard"]').click();await pause();
 assert.equal(document.querySelector('dialog[open]'),null,'An action is rechecked after unsaved edits are discarded');assert(notices.some(n=>n.includes('changed while another edit')));
 store.value={document:p,revision:3};brain.mountBrainContext(p,{chapter:5,id:'api-pod'},'work');
 console.log('PASS: catalogue navigation uses the native comparison return; unsaved input survives and deferred actions recheck their saved basis');

 window.aiwKnowledge.openView('sources');
 const leads=knowledgeStructures(p).reviewLeads,discovery=dom(renderAKRDiscovery('',knowledgeState(p),new Set(),p));
 assert.equal(discovery.querySelectorAll('[data-akr-review-lead]').length,14);
 for(const lead of leads){const card=discovery.querySelector('[data-akr-review-lead="'+lead.id+'"]');assert(card.textContent.includes(lead.statement));assert(card.textContent.includes(lead.receipt.objectHash));assert(card.textContent.includes('Discovery only'));assert.equal(card.querySelector('[data-k-action="akr-fetch"]'),null);}
 const prepare=document.querySelector('[data-k-action="seed-fetch"]');assert(prepare,'An archived lead can prepare the existing manual lookup');prepare.click();
 assert.equal(document.querySelector('[data-k-field="ref"]').value,'');assert.equal(document.querySelector('[data-k-field="expectedHash"]').value,'');assert(document.querySelector('[data-k-field="path"]').value);assert.match(document.querySelector('.kw-body').textContent,/not pinned originals/);
 console.log('PASS: all 14 exact archived source leads stay discovery-only; lookup preparation leaves immutable ref and passage hash unresolved');

 if(process.env.AIW_PACKET_PATH){
  const {prepareRepositoryPacket}=await import('./repository-packet.js'),packet=JSON.parse(await readFile(process.env.AIW_PACKET_PATH,'utf8'));
  const preview=prepareRepositoryPacket(p,packet,{tenantId:packet.tenantId,projectId:packet.projectId});
  assert.equal(preview.locators.length,24);assert(preview.candidates.length);
  let displayed=0;
  for(const locator of preview.locators){const html=dom(renderRepositoryPilot(knowledgeState(p),locator.path,new Set(),preview));for(const candidate of preview.candidates.filter(c=>c.revisionId===locator.revisionId)){const card=html.querySelector('[data-repository-candidate="'+candidate.claimId+'"]');assert(card,'Every candidate can be found through its exact source path');assert(card.textContent.includes(candidate.excerptHash));assert(card.textContent.includes(candidate.source.hash));assert(card.textContent.includes(candidate.source.manifestHash));assert(card.textContent.includes('Lines '+candidate.lineStart+'–'+candidate.lineEnd));displayed++;}assert.match(html.textContent,/Unreviewed candidates|source locations/);}
  console.log('PASS: actual supplied 24-source packet exposes '+displayed+' exact candidate passages/cues without activating advice');
 }
 assert.equal(writes,0);assert.equal(JSON.stringify(p),before);assert(requests.every(r=>r.method==='GET'));assert(!requests.some(r=>/\/(generate|reason|embed|prepare|adopt)(\?|$)/.test(r.url)));
 console.log('PASS: the native read/inspect/guard journeys perform zero saved-project commands or provider generation requests');
}finally{await w.happyDOM.close();}
