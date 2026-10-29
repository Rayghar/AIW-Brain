// The connected model and its perspectives (round 5, R5-C: one picture world). A perspective — one concern of the model
// over a scope — is an entry of every chapter's Model switcher, drawn by the notation kit in the chapter model's frame
// (public/perspective-view.js); "Explore all perspectives", its own canvas and layout engine are retired. These checks
// hold what a perspective reads and records: the one model (identity, mappings and gaps, the chapter stages, the
// process), the picture each concern draws and how a scope narrows it, the perspective a chapter saves (workspace.view:
// a way of looking, never a fact), frozen baselines, Sol's server-rebuilt scope, exchange round trips and the import.
// The browser suite (ux-shell-browser-validate.mjs) drives the switcher, the routes and the frame.
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview,exportSDD,applyFinalReviewCommand,reviewDesignStamp} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {architectureModel,architectureScope,architectureView,chapterArchitectureView,explorationContext,normalizeExploration,CHAPTER_STAGES,CONCERNS} from './public/architecture-model.js';
import {architectureEditCommand} from './public/architecture-commands.js';
import {processPaths,processConflicts,processScenarios,processFindings,withProcessModel} from './public/process-model.js';
import {SCENES,LAYERS,notationScenes} from './public/notation-model.js';
import {notationLayout} from './public/notation-layout.js';
import {svgParts} from './public/notation-svg.js';
import {concernOf,sceneOf,perspectivesOf,perspectivePicture} from './public/perspective-view.js';
import {processGuideHTML,processDetailsHTML,processElementCommand,processTransitionCommand,processClaimCommand,processRemoveCommand,processRetireCommand,processRecord,processScenario,scenarioIn,chooseScenario} from './public/process-editing.js';
import {nativePackage,validateNativePackage,exchangeMappingTemplate,orbusExchange,semanticDocument,archimateExchange,ilographExchange,eraserExchange,zipFiles,csvCell,targetId} from './public/model-exchange.js';
import {previewWorkingChange,applyWorkbenchCommand,workingBasis} from './public/workbench-domain.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {generationCurrent} from './public/aiw-brain.js';
import {sha256} from './public/workbook-reader.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
const at='2026-09-23T13:00:00Z',checks=[],check=async(name,fn)=>{await fn();checks.push(name);};
const p=withFinalReview(seedProject()),m=architectureModel(p),before=JSON.stringify(p);
await check('One identity spans realization, data, protection and deployment; shared capabilities remain singular',()=>{
 assert.equal(m.issues.length,0);assert.equal(m.objects.get('queue').shared,true);
 assert.equal(m.relationships.filter(e=>e.source==='logical.mappings').length,p.logical.mappings.length);
 const scope=architectureScope(m,'GRP-003');assert(scope.core.has('worker'));assert(!scope.core.has('api-pod'));
 const v=architectureView(m,{scopeId:'GRP-003',concern:'realization',selectedId:'worker'});assert(v.objects.some(o=>o.id==='worker'));assert(!v.objects.some(o=>o.id==='api-pod'));
 for(const [concern] of CONCERNS){const view=architectureView(m,{scopeId:'GRP-003',concern,selectedId:'worker'});assert.equal(view.selected.id,'worker');assert.equal(new Set(view.objects.map(o=>o.id)).size,view.objects.length);}
 assert.equal(JSON.stringify(p),before);
});
await check('Many-to-many realization remains a relationship and missing mappings remain gaps',()=>{
 const q=structuredClone(p);q.logical.mappings.push({...q.logical.mappings[0],id:'MAP-X',physicalId:'worker'});const model=architectureModel(q);assert.equal(model.outgoing.get('api').filter(e=>e.type==='realizedBy').length,2);assert(model.objects.get('worker').shared);
 q.logical.mappings=q.logical.mappings.filter(r=>r.logicalId!=='risk');assert(architectureView(architectureModel(q),{concern:'realization'}).gaps.some(g=>g.id==='risk'&&g.type==='realizedBy'));
});
await check('Chapter 4–11 reveal distinct, bounded mappings while retaining one object identity and a return to the full model',()=>{
 // The payment followed through the chapters (the settlement investigation's thread): one recorded object per chapter.
 const thread={4:'hub',5:'worker',6:'gateway',7:'tr-005',8:'network',9:'audit',10:'PL-003',11:'ADR-003'},expected={5:['responsibility','component'],6:['component','capability'],7:['capability','technology']};
 for(let chapter=4;chapter<=11;chapter++){
  const selectedId=thread[chapter];assert(m.objects.has(selectedId),`Chapter ${chapter} keeps its recorded object`);
  const stage=CHAPTER_STAGES[chapter],state=normalizeExploration({chapter,mode:'guided',scopeId:chapter<=7?'GRP-003':m.root,concern:stage.concern,selectedId,anchorId:'worker',context:'functional'},m);
  const view=chapterArchitectureView(m,state),complete=architectureView(m,state);
  assert(view.objects.every(o=>stage.types.includes(o.type)),`Chapter ${chapter} leaked another stage's object type`);
  assert(view.objects.length<=complete.objects.length);assert(view.relationships.every(e=>view.objects.some(o=>o.id===e.from)&&view.objects.some(o=>o.id===e.to)));
  if(expected[chapter])assert.deepEqual([...new Set(view.objects.map(o=>o.type))].sort(),expected[chapter].sort());
  const packet=explorationContext(m,state);assert.equal(packet.chapter,chapter);assert.equal(packet.mode,'guided');assert.deepEqual(packet.objects.map(o=>o.id),view.objects.slice(0,40).map(o=>o.id));
  const full=chapterArchitectureView(m,{...state,mode:'explore'});assert.equal(full.objects.length,complete.objects.length);
  assert(view.objects.some(o=>o.id===selectedId),`Chapter ${chapter} shows the followed object`);
 }
 assert.equal(JSON.stringify(p),before);
});
await check('Chapters 8 and 9 read the same payment component, contract and protection',()=>{
 const fourth=chapterArchitectureView(m,{chapter:4,mode:'guided',scopeId:'GRP-003',concern:'structure',context:'functional',selectedId:'hub'});
 assert.deepEqual(fourth.objects.map(o=>o.id).sort(),['hub','ledger','notify']);
 const saved=normalizeExploration({chapter:8,mode:'guided',scopeId:m.root,concern:'data',selectedId:'network',anchorId:'worker'},m);
 const eighth=chapterArchitectureView(m,saved);assert(eighth.objects.some(o=>o.id==='worker'));assert(eighth.objects.some(o=>o.id==='network'));assert(eighth.objects.some(o=>o.id==='settlement'));
 const ninth=chapterArchitectureView(m,{...saved,chapter:9,concern:'security',selectedId:'audit'});
 assert.deepEqual(new Set(ninth.objects.map(o=>o.id)),new Set(['worker','network','audit','thr-004','tb-002']));
 assert(ninth.relationships.some(e=>e.from==='audit'&&e.to==='network'));
 assert(ninth.relationships.some(e=>e.from==='worker'&&e.to==='network'));
 assert(ninth.relationships.some(e=>e.from==='worker'&&e.to==='tb-002'));
 assert.equal(explorationContext(m,saved).anchorId,'worker');
 assert.equal(normalizeExploration({...saved,anchorId:'invented'},m).anchorId,null);
});
await check('The payment process branches are connected to the original journey identities',()=>{
 const routes=processPaths(p),v=architectureView(m,{scopeId:'GRP-003',concern:'process',selectedId:'JRN-002'});
 assert.deepEqual(routes.map(r=>r.id),['confirmed','held','uncertain']);
 assert.deepEqual(routes.map(r=>r.ids.at(-1)),['PROC-REF-DONE','PROC-REF-HELD','PROC-REF-PENDING']);
 assert.equal(v.objects.filter(o=>o.type==='journey').length,5);
 assert.equal(v.relationships.length,10);assert(v.relationships.every(e=>e.type==='sequence'));
 assert.equal(m.objects.get('JRN-002').record,p.artefacts.find(a=>a.id==='JRN-002'));
 assert(architectureView(m,{concern:'realization'}).objects.some(o=>o.id==='risk'));
});
await check('Process edits, conditional paths and conflicting claims use the staged review and SDD',()=>{
 const command={type:'process.element',payload:{kind:'task',title:'Enquire about pending settlement',purpose:'Keep the reference pending and reconcile against an authoritative outcome.',lane:'Payments',owner:'Payments operations',source:'Architect working proposal',sourceLocator:'Review needed',requirementIds:['REQ-004']}};
 const preview=previewWorkingChange(p,[command]);assert(preview.diff.records.some(r=>r.id===preview.selected));
 assert.throws(()=>applyWorkbenchCommand(p,{type:'workspace.apply',payload:{commands:[command],stamp:preview.stamp,reviewed:false}},at,'test'),/Review/);
 const applied=applyWorkbenchCommand(p,{type:'workspace.apply',payload:{commands:[command],stamp:preview.stamp,reviewed:true}},at,'test').document,task=applied.processModel.elements[0];
 assert.equal(task.confirmed,false);assert.equal(architectureModel(applied).objects.get(task.id).type,'task');
 const transition={type:'process.transition',payload:{from:'PROC-REF-PENDING',to:task.id,label:'Enquire',condition:'Outcome is still unknown',source:'Architect proposal'}};
 const p2=previewWorkingChange(applied,[transition]),linked=applyWorkbenchCommand(applied,{type:'workspace.apply',payload:{commands:[transition],stamp:p2.stamp,reviewed:true}},at,'test').document;
 assert(architectureView(architectureModel(linked),{concern:'process'}).relationships.some(e=>e.from==='PROC-REF-PENDING'&&e.to===task.id));
 const claim=statement=>({type:'process.claim',payload:{subjectId:'JRN-004',topic:'Routing path',statement,source:'PayHub design study',sourceLocator:'Page 19, routing figure'}});
 const first=previewWorkingChange(linked,[claim('Payments route through a switch')]),withClaim=applyWorkbenchCommand(linked,{type:'workspace.apply',payload:{commands:[claim('Payments route through a switch')],stamp:first.stamp,reviewed:true}},at,'test').document;
 const second=previewWorkingChange(withClaim,[claim('Payments call the switch directly')]),conflicted=applyWorkbenchCommand(withClaim,{type:'workspace.apply',payload:{commands:[claim('Payments call the switch directly')],stamp:second.stamp,reviewed:true}},at,'test').document;
 assert.equal(processConflicts(conflicted).length,1);assert.equal(conflicted.processModel.claims[0].status,'Needs review');assert.equal(architectureModel(conflicted).issues.length,0);assert(exportSDD(conflicted).includes('Different source statements need reconciliation'));
 const packet=intelligencePacket(conflicted,{chapter:4,objectId:'JRN-004',mode:'design',prompt:'Explain settlement recovery and the open switch boundary.',exploration:{scopeId:m.root,concern:'process'}});
 const context=JSON.parse(packet.sources.find(s=>s.kind==='architecture-exploration').excerpt);assert.equal(context.processClaims.length,2);assert.equal(context.sourceQuestions[0].status,'Open source reconciliation question');
 const excluded=structuredClone(conflicted);excluded.workspace={...excluded.workspace,aiPolicy:{excludedObjectIds:[conflicted.processModel.claims[0].id]}};
 const disclosed=JSON.parse(intelligencePacket(excluded,{chapter:4,objectId:'JRN-004',mode:'design',prompt:'Explain settlement recovery.',exploration:{scopeId:m.root,concern:'process'}}).sources.find(s=>s.kind==='architecture-exploration').excerpt);assert.equal(disclosed.processClaims.length,1);
 assert.equal(JSON.stringify(p),before);
});
await check('The process is authored where it is drawn: the scenario traced, add, connect with a condition, claim, edit and remove, each a reviewed process command',()=>{
 const ok=(doc,command)=>{const q=previewWorkingChange(doc,[command]);return applyWorkbenchCommand(doc,{type:'workspace.apply',payload:{commands:[command],stamp:q.stamp,reviewed:true}},at,'test').document;};
 // The guide (the Process perspective's companion and Chapter 1's): the scenarios, the chosen one's steps, and what can be
 // added; a frozen design state offers nothing to change.
 chooseScenario('uncertain');const guide=processGuideHTML(p,{selectedId:'PROC-REF-PENDING'});
 assert.equal((guide.match(/data-pe="scenario"/g)||[]).length,3);assert.match(guide,/data-pe="scenario" data-id="uncertain" aria-pressed="true"/);
 assert.equal((guide.match(/data-pe="step"/g)||[]).length,processScenario(p).ids.length);assert.match(guide,/data-id="PROC-REF-PENDING" aria-current="step"/);
 assert.match(guide,/data-pe="new"/);assert.match(guide,/data-pe="connect" data-from="PROC-REF-PENDING"/);
 assert.equal((processGuideHTML(p,{frozen:true}).match(/data-pe="(new|connect)"[^>]*disabled/g)||[]).length,2);
 // The picture traces the chosen scenario: its elements and the drawn flows between consecutive ones.
 const {D}=perspectivePicture(p,{concern:'process',chapter:1}),traced=scenarioIn(D,p);
 assert.equal(traced.id,'uncertain');assert(traced.nodes.has('PROC-REF-PENDING'));assert.equal(traced.edges.size,processScenario(p).ids.length-1);
 // A reference route is illustrative: claimed against, never edited or removed.
 const ref=processDetailsHTML(p,{id:'PROC-REF-RISK'});assert.match(ref,/data-pe="claim" data-subject="PROC-REF-RISK"/);assert.doesNotMatch(ref,/data-pe="(edit|remove)"/);
 assert.throws(()=>previewWorkingChange(p,[processRemoveCommand('PROC-REF-HELD')]),/illustrative/);
 // Add, connect, claim, edit and remove: the companion's commands, through the reviewed workspace change.
 const added=ok(p,processElementCommand({kind:'event',title:'Settlement outcome confirmed by enquiry',purpose:'The enquiry establishes the authoritative outcome.',lane:'Payments',owner:'Payments operations',source:'Architect working proposal',sourceLocator:'Review needed',requirementId:'REQ-004',authorityId:''})),el=added.processModel.elements[0];
 assert.deepEqual(el.requirementIds,['REQ-004']);assert.equal(processRecord(added,el.id).kind,'element');
 const mine=processDetailsHTML(added,{id:el.id});assert.match(mine,/data-pe="edit" data-id=/);assert.match(mine,/data-pe="remove" data-id=/);
 const connected=ok(added,processTransitionCommand({from:'PROC-REF-PENDING',to:el.id,label:'Enquire',condition:'The outcome is still unknown after the timeout',owner:'',source:'Architect proposal',sourceLocator:''})),path=connected.processModel.transitions[0];
 assert.match(processDetailsHTML(connected,{edgeId:path.id}),/data-pe="edit-path"/);
 const revised=ok(connected,processTransitionCommand({...path,condition:'No authoritative response within the agreed window'},path));
 assert.equal(revised.processModel.transitions.length,1);assert.equal(revised.processModel.transitions[0].condition,'No authoritative response within the agreed window');
 const claimed=ok(revised,processClaimCommand({topic:'Enquiry operation',statement:'The provider offers a status enquiry by original reference.',source:'Provider interface guide',sourceLocator:'Section 4.2',owner:''},el.id)),cl=claimed.processModel.claims[0];
 assert.equal(cl.subjectId,el.id);assert.equal(cl.status,'Needs review');
 const edited=ok(claimed,architectureEditCommand(claimed,el.id,{title:'Outcome confirmed by enquiry',purpose:el.purpose,owner:'Payments operations'}));
 assert.equal(edited.processModel.elements[0].title,'Outcome confirmed by enquiry');assert.deepEqual(edited.processModel.elements[0].requirementIds,['REQ-004']);
 // Removal goes in order (what names a record goes first, so nothing points at a record that has gone), and is reviewed.
 // Round 12 (GR-GOV-24): a path is a link and is removed, an edit; the claim and the object are records and retire with
 // why (restorable, through record.retire): their hard removal is refused, naming the retire path.
 assert.throws(()=>previewWorkingChange(edited,[processRemoveCommand(el.id)]),/paths that connect it/);
 assert.throws(()=>previewWorkingChange(edited,[processRemoveCommand(cl.id)]),/leaves the design through Retire/);
 const retireClaim=processRetireCommand(cl.id,'The provider guide answered it.'),q=previewWorkingChange(edited,[retireClaim]);assert.throws(()=>applyWorkbenchCommand(edited,{type:'workspace.apply',payload:{commands:[retireClaim],stamp:q.stamp,reviewed:false}},at,'test'),/Review/);
 const gone=ok(ok(ok(edited,retireClaim),processRemoveCommand(path.id)),processRetireCommand(el.id,'Folded into the enquiry step.'));
 assert.equal(gone.processModel.elements.length+gone.processModel.transitions.length+gone.processModel.claims.length,0);
 assert.equal(architectureModel(gone).objects.has(el.id),false);assert.equal(JSON.stringify(p),before);
 chooseScenario('confirmed');
});
await check('Older frozen design sources do not acquire a new reference route when the application evolves',()=>{
 const old=structuredClone(p);delete old.processModel;assert(!architectureModel(old).objects.has('PROC-REF-START'));assert(architectureModel(p).objects.has('PROC-REF-START'));
});
await check('Quick edits retain allocations, technology support and realization mappings',()=>{
 for(const id of ['api-pod','queue','tr-003']){const command=architectureEditCommand(p,id,{owner:'Architecture review'}),q=previewWorkingChange(p,[command]);assert.deepEqual(q.document.logical.mappings.map(m=>m.id).sort(),p.logical.mappings.map(m=>m.id).sort());assert.deepEqual(q.document.technology.mappings.map(m=>m.id).sort(),p.technology.mappings.map(m=>m.id).sort());assert.deepEqual(q.document.technologyRealisation.mappings.map(m=>m.id).sort(),p.technologyRealisation.mappings.map(m=>m.id).sort());}
 assert.throws(()=>architectureEditCommand(p,'api-pod',{id:'replacement'}));
});
await check('Accept updates every projection and SDD; unreviewed or stale proposals cannot apply',()=>{
 const command=architectureEditCommand(p,'api-pod',{title:'Payment intake service'}),q=previewWorkingChange(p,[command]);assert.equal(architectureModel(p).objects.get('api-pod').title,'Payment service');
 assert.throws(()=>applyWorkbenchCommand(p,{type:'workspace.apply',payload:{commands:[command],stamp:q.stamp,reviewed:false}},at,'test'),/Review/);
 const changed=structuredClone(p);changed.realisation.components[0].purpose+=' Changed';assert.throws(()=>applyWorkbenchCommand(changed,{type:'workspace.apply',payload:{commands:[command],stamp:q.stamp,reviewed:true}},at,'test'),/changed/);
 const next=applyWorkbenchCommand(p,{type:'workspace.apply',payload:{commands:[command],stamp:q.stamp,reviewed:true}},at,'test').document;assert.equal(architectureModel(next).objects.get('api-pod').title,'Payment intake service');assert(exportSDD(next).includes('Payment intake service'));assert.equal(JSON.stringify(p),before);
});
await check('Every chapter starts a new perspective on its own concern; each concern draws a standard picture, the one its chapter holds when it holds one',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11].map(concernOf),['process','rationale','rationale','structure','realization','realization','realization','data','security','deployment','rationale']);
 for(const [concern] of CONCERNS)for(let chapter=1;chapter<=11;chapter++)assert(SCENES.some(s=>s.id===sceneOf(concern,chapter)),`${concern} in Chapter ${chapter} draws a known picture`);
 assert.deepEqual([4,5,6,7,10].map(chapter=>sceneOf('realization',chapter)),['application','application','solution','stack','usage']);
 assert.equal(sceneOf('deployment',7),'usage');assert.equal(sceneOf('deployment',4),'deployment');
 assert.equal(sceneOf('behaviour',8),'cooperation');assert.equal(sceneOf('behaviour',4),'cooperation');
 assert.equal(sceneOf('data',8),'data');assert.equal(sceneOf('rationale',3),'rationale');assert.equal(sceneOf('rationale',2),'drivers');assert.equal(sceneOf('rationale',11),'rationale');assert.equal(sceneOf('structure',10),'logical');
});
await check('Each concern of the reference project draws through the notation kit, the layers strip it and a scope narrows it to what it reaches',()=>{
 for(const [concern] of CONCERNS){
  const {scene,full,D}=perspectivePicture(p,{concern,chapter:4});assert(full.nodes.length,`${concern} (${scene}) draws elements`);assert.equal(D.nodes.length,full.nodes.length);
  const L=notationLayout(D,{arrangement:D.scene.arrangement});assert(L.W>0&&L.H>0&&L.nodes.length===D.nodes.length);
  const parts=svgParts(D,L,{prefix:'pv',interactive:true});assert(D.nodes.every(n=>parts.nodes.includes(`data-nt-node="${n.id}"`)),`${concern}: every element is drawn and can be selected`);
  const one=perspectivePicture(p,{concern,chapter:4,layers:[full.nodes[0].layer]}).D;assert(one.nodes.every(n=>n.layer===full.nodes[0].layer));
 }
 const scope=architectureScope(m,'GRP-003'),whole=perspectivePicture(p,{concern:'structure',chapter:4}).full,settlement=perspectivePicture(p,{concern:'structure',scopeId:'GRP-003',chapter:4}).full;
 assert(settlement.nodes.length<whole.nodes.length&&settlement.nodes.length>0);assert(settlement.nodes.every(n=>scope.ids.has(n.id)));
 for(const id of ['hub','ledger','notify'])assert(settlement.nodes.some(n=>n.id===id),`the Settlement scope keeps ${id}`);
 assert(settlement.edges.every(e=>settlement.nodes.some(n=>n.id===e.from)&&settlement.nodes.some(n=>n.id===e.to)));assert.equal(settlement.scopedFrom,whole.nodes.length);
 const realization=perspectivePicture(p,{concern:'realization',scopeId:'GRP-003',chapter:5}).full,core=architectureScope(m,'GRP-003').core;assert(realization.nodes.some(n=>n.id==='worker'));assert(!realization.nodes.some(n=>n.id==='api-pod'));assert(realization.nodes.every(n=>core.has(n.id)),'a realization keeps the scope\'s own chain');
 assert.equal(perspectivePicture(p,{concern:'process',scopeId:'GRP-003',chapter:1}).full.nodes.length,perspectivePicture(p,{concern:'process',chapter:1}).full.nodes.length,'the process is drawn whole');
 assert.deepEqual(perspectivePicture(p,{concern:'structure',scopeId:'missing',chapter:4}).full.nodes.length,whole.nodes.length,'an unknown scope draws the whole system');
 assert.equal(perspectivePicture(null,{concern:'structure'}).D,null);assert.deepEqual(LAYERS.length,8);
 assert.equal(JSON.stringify(p),before);
});
await check('A perspective saved from a chapter is a saved view of its concern, scope and design state, never a fact; a bookmark is not one',()=>{
 const payload={title:'Settlement · Protection',purpose:'Who protects the settlement path',chapter:4,tab:'model',objectId:'hub',exploration:{concern:'security',scopeId:'GRP-003',baselineId:null,selectedId:'hub',chapter:4,mode:'explore',context:'functional'}};
 const q=applyWorkbenchCommand(p,{type:'workspace.view',payload},at,'test').document,v=perspectivesOf(q).at(-1);
 assert.deepEqual({title:v.title,chapter:v.chapter,tab:v.tab,concern:v.exploration.concern,scopeId:v.exploration.scopeId,selectedId:v.exploration.selectedId,baselineId:v.exploration.baselineId},{title:'Settlement · Protection',chapter:4,tab:'model',concern:'security',scopeId:'GRP-003',selectedId:'hub',baselineId:null});
 assert.equal(workingBasis(q),workingBasis(p));assert.equal(architectureModel(q).signature,m.signature);
 const first=perspectivesOf(applyWorkbenchCommand(p,{type:'workspace.view',payload:{...payload,chapter:1,objectId:'',exploration:{...payload.exploration,concern:'process',chapter:1,selectedId:null}}},at,'test').document).at(-1);
 assert.deepEqual([first.chapter,first.exploration.chapter,first.exploration.concern],[1,null,'process'],'Chapters 1–3 save perspectives too');
 const bookmark=applyWorkbenchCommand(p,{type:'workspace.view',payload:{title:'Bookmark',chapter:4,tab:'work',objectId:''}},at,'test').document;
 assert.equal(perspectivesOf(bookmark).length,perspectivesOf(p).length);assert.equal(bookmark.workbench.views.length,(p.workbench?.views||[]).length+1);
 assert.equal(JSON.stringify(p),before);
});
await check('The explorer world is retired: no module, stylesheet or chapter model keeps its canvas, its mode or its body class, and what only it offered has one path elsewhere',async()=>{
 for(const f of ['public/architecture-explorer.js','public/architecture-explorer.css','public/architecture-layout.js'])assert(!existsSync(f),`${f} is retired`);
 const sources=(await readdir('public')).filter(f=>/\.(js|css|html)$/.test(f));
 for(const f of sources){const text=await readFile(path.join('public',f),'utf8');assert(!/architecture-explorer|architecture-layout|mountArchitectureExplorer|explorerObserver/.test(text),`${f} still names the explorer`);assert(!/\.am-active|am-explorer/.test(text),`${f} still styles the explorer`);}
 for(const f of ['story','utility','tradeoff','responsibility','realise','platform','stack','exchange','threat','deploy']){const text=await readFile(`public/${f}-view.js`,'utf8');assert(!/="explore"|'am-active'/.test(text),`the Chapter model ${f}-view.js keeps no explorer entry or body class`);}
 const shell=await readFile('public/workspace-ux.js','utf8');assert(shell.includes("import('./perspective-view.js')"));assert(!/aiw-chapter-model-mode|exploreAllPerspectives/.test(shell));
 for(const f of ['desk','validate'])assert(!/="explore"|'am-active'|Explore all perspectives/.test(await readFile(`public/${f}-view.js`,'utf8')),`${f}-view.js keeps no explorer entry`);
 const app=await readFile('public/app.js','utf8');assert(!/canvas-card|id="canvas"|data-am-rail|All perspectives/.test(app),'the shell keeps no empty canvas host and no explorer fallback');
 const texts=await Promise.all(sources.map(async f=>[f,await readFile(path.join('public',f),'utf8')]));
 assert(!texts.some(([,t])=>/chapterNextSelection|queueExplorationQuestion|am-export-ready/.test(t)),'the explorer\'s handoff helpers are gone');
 // What only the explorer offered moved, not vanished: the process's authoring (process-editing.js, used by the Process
 // perspective and Chapter 1's Model) and the settlement investigation (the architecture case, Chapter 11).
 assert.deepEqual(texts.filter(([,t])=>t.includes("from './process-editing.js'")).map(([f])=>f).sort(),['perspective-view.js'],'the authoring travels with the perspective view');
 assert(texts.find(([f])=>f==='story-view.js')[1].includes("import('./perspective-view.js')"),'Chapter 1\'s Model reaches it there');
 assert.deepEqual(texts.filter(([f,t])=>f!=='settlement-investigation.js'&&t.includes('settlementInvestigation')).map(([f])=>f),['architecture-case-ui.js']);
});
let saved;
await check('Saved perspective state does not change architecture facts or replace frozen snapshots',()=>{
 saved=applyWorkbenchCommand(p,{type:'workspace.view',payload:{title:'Settlement dissection',purpose:'Explain shared delivery support',chapter:5,tab:'model',objectId:'worker',exploration:{scopeId:'GRP-003',concern:'realization',selectedId:'worker',context:'functional'},layout:{positions:{worker:{x:520,y:224,width:264,height:152,pinned:true}}}}},at,'test').document;
 assert.equal(workingBasis(saved),workingBasis(p));assert.equal(architectureModel(saved).signature,m.signature);assert.equal(saved.workbench.views[0].exploration.selectedId,'worker');assert.equal(saved.workbench.views[0].layout.positions.worker.width,264);assert.equal(normalizeExploration({scopeId:'missing',selectedId:'missing'},m).scopeId,m.root);
 assert.throws(()=>applyWorkbenchCommand(p,{type:'workspace.view',payload:{title:'Invalid layout',chapter:5,tab:'model',exploration:{concern:'realization'},layout:{positions:{invented:{x:0,y:0,width:200,height:100}}}}},at,'test'),/unknown object/);
 assert.throws(()=>applyWorkbenchCommand(p,{type:'workspace.view',payload:{title:'Missing baseline',chapter:5,tab:'model',exploration:{baselineId:'missing'}}},at,'test'),/baseline/);
});
await check('Frozen perspective reads the captured model after a working edit, and exports its exact snapshot',async()=>{
 let q=applyFinalReviewCommand(p,{type:'review.checks'},at).document;q=applyFinalReviewCommand(q,{type:'review.baseline',payload:{title:'Review snapshot',stamp:reviewDesignStamp(q),reviewed:true}},at).document;
 const baseline=q.finalReview.baselines[0],snapshot=JSON.stringify(baseline.source);
 q=applyWorkbenchCommand(q,{type:'workspace.view',payload:{title:'Frozen settlement',chapter:5,tab:'model',objectId:'worker',exploration:{scopeId:'GRP-003',selectedId:'worker',concern:'realization',baselineId:baseline.id}}},at,'test').document;
 const command=architectureEditCommand(q,'worker',{title:'Changed working worker'}),preview=previewWorkingChange(q,[command]);q=applyWorkbenchCommand(q,{type:'workspace.apply',payload:{commands:[command],stamp:preview.stamp,reviewed:true}},at,'test').document;
 assert.equal(JSON.stringify(q.finalReview.baselines[0].source),snapshot);assert.equal(architectureModel(q.finalReview.baselines[0].source).objects.get('worker').title,'Settlement worker');assert.equal(architectureModel(q).objects.get('worker').title,'Changed working worker');
 const native=await nativePackage(q);await validateNativePackage(native);assert.equal(JSON.stringify(native.project.finalReview.baselines[0].source),snapshot);
});
await check('Sol receives a server-rebuilt scope; disclosure exclusions and stale context still apply',()=>{
 const raw={chapter:4,objectId:'hub',mode:'design',prompt:'Explain the module realization and recovery gaps.',exploration:{scopeId:'GRP-003',concern:'realization',objects:[{id:'invented',title:'Malicious client fact'}]}};const packet=intelligencePacket(p,raw),source=packet.sources.find(s=>s.kind==='architecture-exploration');assert(source);assert(!source.excerpt.includes('Malicious'));assert(JSON.parse(source.excerpt).objects.some(o=>o.id==='worker'));assert(packet.coverage.characters<=28000);
 const q=structuredClone(p);q.workspace={...q.workspace,aiPolicy:{excludedObjectIds:['worker']}};assert(!JSON.parse(intelligencePacket(q,raw).sources.find(s=>s.kind==='architecture-exploration').excerpt).objects.some(o=>o.id==='worker'));
 const receipt={context:packet.context,basisStamp:packet.basisStamp,sources:packet.sources};assert(generationCurrent(p,receipt));q.realisation.components[0].purpose+=' Altered';assert(!generationCurrent(q,receipt));assert.throws(()=>intelligencePacket(p,{...raw,exploration:{baselineId:'frozen'}}),/working design/);
});
let pack;
await check('Native round trip preserves typed identities, attributes, relationship meaning and perspectives',async()=>{
 pack=await nativePackage(saved,{scopeId:'GRP-003',concern:'realization',selectedId:'worker'});const result=await validateNativePackage(JSON.parse(JSON.stringify(pack)));assert.deepEqual(semanticDocument(result.project),pack.semantic);assert.equal(result.views,1);
 const bad=structuredClone(pack);bad.project.realisation.components[0].title='Tampered';await assert.rejects(()=>validateNativePackage(bad),/checksum/);
 const dangling=structuredClone(pack);dangling.project.logical.mappings[0].physicalId='missing';dangling.semantic=semanticDocument(dangling.project);delete dangling.checksum;dangling.checksum=await sha256(new TextEncoder().encode(JSON.stringify(dangling)));await assert.rejects(()=>validateNativePackage(dangling),/endpoint/);
});
await check('Orbus reports missing mappings, uses stable identities and produces repeat-update manifests without deletions',()=>{
 const empty=orbusExchange(p);assert(!empty.readyForTenantTrial);assert(empty.omissions.length);const map=exchangeMappingTemplate(p);map.target={name:'Synthetic metamodel',modelId:'test-model',identityAttributeId:'external-id'};for(const [type,entry] of Object.entries(map.objectTypes)){entry.objectTypeId='test-'+type;for(const k of Object.keys(entry.attributes))entry.attributes[k]='test-'+k;}for(const entry of Object.values(map.relationshipTypes)){entry.relationshipTypeId='test-relationship';entry.typePairId='test-pair';}
 const first=orbusExchange(p,map),again=orbusExchange(p,map,first.manifest);assert(first.readyForTenantTrial);assert.equal(again.changes.create.length+again.changes.update.length,0);assert.equal(again.changes.unchanged.length,first.objects.length+first.relationships.length);assert(!again.verifiedInTenant);
 const next=structuredClone(p);next.realisation.components[0].title='Changed title';const delta=orbusExchange(next,map,first.manifest);assert(delta.changes.update.length>0);assert.equal(delta.changes.create.length,0);assert(!Object.hasOwn(delta.changes,'delete'));
});
await check('External projections escape labels and preserve unique target identifiers; ZIP paths stay bounded',async()=>{
 assert.notEqual(targetId('a/b'),targetId('a_b'));assert(csvCell('=1+1').startsWith('"\''));const i=JSON.parse(ilographExchange(p).document);assert.equal(new Set(i.resources.map(o=>o.id)).size,i.resources.length);assert(i.perspectives.length===CONCERNS.length);assert(eraserExchange(p,{concern:'realization'}).document.includes('direction right'));assert(archimateExchange(p).report.omittedObjects.length);await assert.rejects(async()=>zipFiles([{name:'../bad',text:'bad'}]));
 if(process.env.AIW_EXPLORER_OUTPUT){await writeFile(path.join(process.env.AIW_EXPLORER_OUTPUT,'architecture.xml'),archimateExchange(p).document);await writeFile(path.join(process.env.AIW_EXPLORER_OUTPUT,'exchange.zip'),new Uint8Array(await zipFiles([{name:'AIW-Model.json',text:JSON.stringify(pack)}]).arrayBuffer()));}
});
await check('Empty projects stay empty and a 2,000-requirement fixture does not invent implementation objects',()=>{
 const q=createProject({name:'Unmodelled project',template:'blank'},'empty',at);assert.equal(architectureModel(q).objects.size,1);for(let i=0;i<2000;i++)q.artefacts.push({id:'REQ-'+i,type:'requirement',title:'Requirement '+i,description:'Define the acceptance evidence.',confirmed:false});const start=Date.now(),model=architectureModel(q);assert.equal(model.objects.size,2001);assert(![...model.objects.values()].some(o=>o.type==='component'));assert(Date.now()-start<15000);
});
await check('Round 6 (Contract T): every project has a process model, the Process perspective draws the BPMN meanings and the ArchiMate typing and reads message flows, Chapter 1 offers the sequence picture, and the bank keeps its reference scenarios',()=>{
 const blank=withProcessModel(createProject({name:'Blank process',template:'blank'},'blank-process',at));
 assert.deepEqual([blank.processModel.elements,blank.processModel.transitions,blank.processModel.claims],[[],[],[]],'a blank project has an empty process model');assert.deepEqual(processFindings(blank),[]);assert.deepEqual(processScenarios(blank),[]);
 const older=structuredClone(blank);delete older.processModel;assert.deepEqual(withProcessModel(older).processModel,{schemaVersion:1,referenceVersion:0,version:0,elements:[],transitions:[],claims:[]},'an older document without one gets an empty model and no reference routes');
 assert.deepEqual(processScenarios(p).map(s=>s.id),processPaths(p).map(s=>s.id),'the bank\'s scenarios are its reference paths');assert.deepEqual(processFindings(p),[],'the bank reference passes the structural checks');
 const {D}=perspectivePicture(p,{concern:'process',chapter:1});
 assert.deepEqual(D.nodes.find(n=>n.id==='PROC-REF-START').glyph,{position:'start',eventType:'none'});assert.deepEqual(D.nodes.find(n=>n.id==='PROC-REF-DONE').glyph,{position:'end',eventType:'none'});assert.deepEqual(D.nodes.find(n=>n.id==='PROC-REF-RISK').glyph,{gatewayType:'exclusive'});
 assert.ok(D.edges.some(e=>e.kind==='sequence')&&D.edges.filter(e=>e.kind==='sequence'&&e.record).every(e=>e.archimate?.type==='Triggering'&&e.archimate.valid),'every recorded flow is typed Triggering');
 assert.deepEqual(notationScenes(1).map(s=>s.id),['process','context','motivation','sequence','module-map']);assert.equal(sceneOf('process',1),'process');
 assert.ok(architectureView(m,{concern:'process'}).relationships.every(e=>['sequence','message','precedes'].includes(e.type)),'the Process perspective reads sequence and message flows');
 const guide=processGuideHTML(blank);assert.match(guide,/Connect with a flow/);assert.doesNotMatch(guide,/data-pe="scenario"/);assert.doesNotMatch(guide,/how the payment reaches its outcome/);
 assert.match(processGuideHTML(p),/how the payment reaches its outcome/);
 assert.equal(JSON.stringify(p),before);
});
const root=await mkdtemp(path.join(tmpdir(),'aiw-model-test-')),env={DB:localDatabase(path.join(root,'db.sqlite')),FILES:localFiles(path.join(root,'files'))},origin='https://aiw.test';let project='bank-payment';
async function api(route,body,status=200){const res=await worker.fetch(new Request(origin+route+(route.includes('?')?'&':'?')+'project='+project,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'test-owner',Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;}
try{await check('Server import previews integrity, creates an isolated project and preserves semantic links',async()=>{
 await api('/api/project');const preview=await api('/api/recovery?action=preview',{package:pack});assert.equal(preview.objects,pack.semantic.objects.length);const restored=await api('/api/recovery?action=restore',{package:pack,hash:preview.hash,name:'Restored semantic model',reviewed:true},201);project=restored.id;const stored=await api('/api/project'),model=architectureModel(stored.document);assert.equal(model.issues.length,0);assert(model.objects.has('queue'));assert.deepEqual(model.relationships.filter(e=>e.type==='realizedBy').map(e=>[e.id,e.from,e.to]),m.relationships.filter(e=>e.type==='realizedBy').map(e=>[e.id,e.from,e.to]));assert.equal(stored.document.workbench.views[0].exploration.scopeId,'GRP-003');assert(restored.modelView);assert.equal(stored.document.workspace.initialModelViewId,restored.modelView);assert(stored.document.workbench.views.some(v=>v.id===restored.modelView&&v.exploration.scopeId==='GRP-003'));
 });}finally{env.DB.close();await rm(root,{recursive:true,force:true});}
const report={status:'passed',checks,limits:['The switcher, the routes, the frame, the process dialogs and the settlement trace are driven in a browser by ux-shell-browser-validate.mjs; this suite reads the model, the pictures, the process commands and the saved views.','Orbus uses a synthetic target mapping for deterministic preparation tests; no tenant import/update was performed.','No novice/practitioner study or live provider generation was run by these tests.','The scale fixture verifies projection for 2,000 requirements, not rendering or multi-user performance at 100,000 objects.']};
if(process.env.AIW_EXPLORER_OUTPUT)await writeFile(path.join(process.env.AIW_EXPLORER_OUTPUT,'AIW-v50-Model-Verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
