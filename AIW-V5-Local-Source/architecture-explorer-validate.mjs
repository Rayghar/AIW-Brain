import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview,exportSDD,applyFinalReviewCommand,reviewDesignStamp} from './public/review-domain.js';
import {createProject} from './public/projects-domain.js';
import {architectureModel,architectureScope,architectureView,chapterArchitectureView,chapterNextSelection,explorationContext,normalizeExploration,CHAPTER_STAGES,CONCERNS} from './public/architecture-model.js';
import {architectureEditCommand} from './public/architecture-commands.js';
import {processPaths,processConflicts} from './public/process-model.js';
import {layoutArchitecture,edgeGeometry,visibleRelationships,occurrenceBounds,canPlaceOccurrence,staysInArchitecturalGroup,smartArrangeArchitecture} from './public/architecture-layout.js';
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
 let selectedId='GRP-003';const expected={5:['responsibility','component'],6:['component','capability'],7:['capability','technology']};
 for(let chapter=4;chapter<=11;chapter++){
  const stage=CHAPTER_STAGES[chapter],state=normalizeExploration({chapter,mode:'guided',scopeId:m.root,concern:stage.concern,selectedId,context:'functional'},m);
  const view=chapterArchitectureView(m,state),complete=architectureView(m,state),layout=layoutArchitecture(m,view,state,820);
  assert(view.objects.every(o=>stage.types.includes(o.type)),`Chapter ${chapter} leaked another stage's object type`);
  assert(view.objects.length<=complete.objects.length);assert(view.relationships.every(e=>view.objects.some(o=>o.id===e.from)&&view.objects.some(o=>o.id===e.to)));
  if(expected[chapter])assert.deepEqual([...new Set(view.objects.map(o=>o.type))].sort(),expected[chapter].sort());
  if(chapter>=5&&chapter<=7){assert.equal(layout.groups.length,2);assert(layout.width<=820);}
  if(chapter===9){assert(layout.groups.length<=3);assert(layout.width<=820);}
  if(chapter===10)assert(!layout.groups.some(g=>g.title==='Placement not modelled'&&!layout.occurrences.some(o=>o.x>=g.x&&o.x<g.x+g.width)));
  for(let i=0;i<layout.occurrences.length;i++)for(let j=i+1;j<layout.occurrences.length;j++){const a=layout.occurrences[i],b=layout.occurrences[j];assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),`Chapter ${chapter}: ${a.id} overlaps ${b.id}`);}
  const links=visibleRelationships(view,layout,{selectedId});assert(links.visible.length<=7);assert.equal(links.visible.length+links.hidden,view.relationships.length);
  const packet=explorationContext(m,state);assert.equal(packet.chapter,chapter);assert.equal(packet.mode,'guided');assert.deepEqual(packet.objects.map(o=>o.id),view.objects.slice(0,40).map(o=>o.id));
  const full=chapterArchitectureView(m,{...state,mode:'explore'});assert.equal(full.objects.length,complete.objects.length);
  if(chapter<11)selectedId=chapterNextSelection(m,selectedId,chapter+1,m.root);
  if(chapter>=4&&chapter<=8)assert(selectedId,`Chapter ${chapter} lost its connected selection`);
 }
 assert.equal(JSON.stringify(p),before);
});
await check('The chapter handoff returns from technology to the same payment component, contract and protection',()=>{
 const fourth=chapterArchitectureView(m,{chapter:4,mode:'guided',scopeId:'GRP-003',concern:'structure',context:'functional',selectedId:'hub'});
 const fourthLayout=layoutArchitecture(m,fourth,{chapter:4,mode:'guided',scopeId:'GRP-003',concern:'structure',context:'functional'},980);
 assert.deepEqual(fourthLayout.occurrences.map(o=>o.id),['ledger','hub','notify']);
 assert(fourthLayout.occurrences.every(o=>o.y===fourthLayout.occurrences[0].y));
 assert.equal(fourthLayout.groups[0].title,'Settlement · responsibilities');
 assert.equal(chapterNextSelection(m,'tr-005',8,m.root,'worker'),'network');
 assert.equal(chapterNextSelection(m,'network',9,m.root,'worker'),'audit');
 const saved=normalizeExploration({chapter:8,mode:'guided',scopeId:m.root,concern:'data',selectedId:'network',anchorId:'worker'},m);
 const eighth=chapterArchitectureView(m,saved);assert(eighth.objects.some(o=>o.id==='worker'));assert(eighth.objects.some(o=>o.id==='network'));assert(eighth.objects.some(o=>o.id==='settlement'));
 const eighthLayout=layoutArchitecture(m,eighth,saved,980);
 assert.equal(eighthLayout.groups.length,3);
 assert(eighthLayout.positions.get('instruction').x>eighthLayout.positions.get('network').x);
 assert(eighthLayout.positions.get('settlement').y<220,'Both exchanged records should start near the first viewport');
 const ninth=chapterArchitectureView(m,{...saved,chapter:9,concern:'security',selectedId:'audit'});
 assert(ninth.objects.some(o=>o.id==='worker'));assert(ninth.objects.some(o=>o.id==='network'));assert(ninth.objects.some(o=>o.id==='tb-002'));
 assert.deepEqual(new Set(ninth.objects.map(o=>o.id)),new Set(['worker','network','audit','thr-004','tb-002']));
 const ninthLayout=layoutArchitecture(m,ninth,{...saved,chapter:9,concern:'security'},980);
 assert(ninthLayout.positions.get('worker').x<ninthLayout.positions.get('network').x);
 assert(ninthLayout.positions.get('network').x<ninthLayout.positions.get('audit').x);
 assert.equal(ninthLayout.positions.get('worker').x,ninthLayout.positions.get('tb-002').x);
 const protection=visibleRelationships(ninth,layoutArchitecture(m,ninth,{...saved,chapter:9,concern:'security'},980),{selectedId:'audit',anchorId:'worker'}).visible;
 assert(protection.some(e=>e.from==='audit'&&e.to==='network'));
 assert(protection.some(e=>e.from==='worker'&&e.to==='network'));
 assert(protection.some(e=>e.from==='worker'&&e.to==='tb-002'));
 assert.equal(explorationContext(m,saved).anchorId,'worker');
 assert.equal(normalizeExploration({...saved,anchorId:'invented'},m).anchorId,null);
});
await check('View projection is deterministic and placement occurrences point back to their assets',()=>{
 for(const [concern] of CONCERNS){const state={scopeId:m.root,concern,context:'functional',detail:'expanded'},view=architectureView(m,state),layout=layoutArchitecture(m,view,state,1200);assert(layout.width>=780);assert(layout.occurrences.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.y)));assert.deepEqual(layoutArchitecture(m,view,state,1200),layout);if(concern==='deployment')assert(layout.occurrences.filter(o=>o.placement).every(o=>o.plan&&o.asset));}
});
await check('Smart arrangement respects manually sized anchors and reflows their neighbours without changing the model',()=>{
 const state={scopeId:m.root,concern:'realization',context:'functional',detail:'expanded',chapter:6,mode:'guided',selectedId:'gateway'};
 const v=chapterArchitectureView(m,state),automatic=layoutArchitecture(m,v,state,820),[first,second]=automatic.occurrences;
 assert(first&&second);const position=occurrenceBounds(first,{x:second.x,y:second.y,width:first.width+40,height:first.height+24});
 const moved=occurrenceBounds(first,{x:first.x+32});
 assert.equal(occurrenceBounds(first,moved).width,first.width,'Moving a card must not round its original width');
 assert(staysInArchitecturalGroup(automatic,first.id,position));
 const foreign=automatic.occurrences.find(item=>item.object.type==='capability');assert(foreign);
 assert(!staysInArchitecturalGroup(automatic,first.id,{...position,x:foreign.x,y:foreign.y}));
 const arrangement=smartArrangeArchitecture(m,v,state,820,{[first.id]:{...position,pinned:true}});
 assert.equal(arrangement[first.id].pinned,true);assert.equal(arrangement[first.id].width,position.width);
 const arranged=layoutArchitecture(m,v,{...state,positions:arrangement},820);
 assert.equal(arranged.positions.get(first.id).x,position.x);
 assert.equal(arranged.positions.get(first.id).height,position.height);
 assert.notDeepEqual([arranged.positions.get(second.id).x,arranged.positions.get(second.id).y],[second.x,second.y]);
 for(const item of arranged.occurrences)assert(canPlaceOccurrence(arranged,item.id,item),`${item.id} overlaps after reflow`);
 assert.equal(canPlaceOccurrence(arranged,second.id,{...arranged.positions.get(second.id),x:position.x,y:position.y}),false);
 assert.equal(JSON.stringify(p),before);
});
await check('The payment process branches are connected to the original journey identities and remain spatially legible',()=>{
 const routes=processPaths(p),v=architectureView(m,{scopeId:'GRP-003',concern:'process',selectedId:'JRN-002'}),layout=layoutArchitecture(m,v,{scopeId:'GRP-003',concern:'process',context:'functional'},1100);
 assert.deepEqual(routes.map(r=>r.id),['confirmed','held','uncertain']);
 assert.deepEqual(routes.map(r=>r.ids.at(-1)),['PROC-REF-DONE','PROC-REF-HELD','PROC-REF-PENDING']);
 assert.equal(v.objects.filter(o=>o.type==='journey').length,5);
 assert.equal(v.relationships.length,10);assert(v.relationships.every(e=>e.type==='sequence'));
 assert.equal(m.objects.get('JRN-002').record,p.artefacts.find(a=>a.id==='JRN-002'));
 for(let i=0;i<layout.occurrences.length;i++)for(let j=i+1;j<layout.occurrences.length;j++){
  const a=layout.occurrences[i],b=layout.occurrences[j];assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),`${a.id} overlaps ${b.id}`);
 }
 for(const [i,e] of v.relationships.entries()){const g=edgeGeometry(layout.positions.get(e.from),layout.positions.get(e.to),i,layout.width);let x=0,y=0;
  for(const token of g.d.match(/[MHV][^MHV]+/g)||[]){const op=token[0],n=token.slice(1).trim().split(/[ ,]+/).map(Number),next=op==='M'?[n[0],n[1]]:op==='H'?[n[0],y]:[x,n[0]];
   if(op!=='M')for(const other of layout.occurrences.filter(o=>o.id!==e.from&&o.id!==e.to)){
    const crossed=y===next[1]?y>other.y+2&&y<other.y+other.height-2&&Math.max(x,next[0])>other.x+2&&Math.min(x,next[0])<other.x+other.width-2:x>other.x+2&&x<other.x+other.width-2&&Math.max(y,next[1])>other.y+2&&Math.min(y,next[1])<other.y+other.height-2;
    assert(!crossed,`${e.id} passes through ${other.id}`);
   }[x,y]=next;
  }
 }
 assert.deepEqual(visibleRelationships(v,layout,{selectedId:'JRN-002'}).visible.map(e=>e.id),v.relationships.map(e=>e.id));
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
await check('Older frozen design sources do not acquire a new reference route when the application evolves',()=>{
 const old=structuredClone(p);delete old.processModel;assert(!architectureModel(old).objects.has('PROC-REF-START'));assert(architectureModel(p).objects.has('PROC-REF-START'));
});
await check('Dense canvas layout keeps cards apart and routes overview links outside unrelated objects',()=>{
 const segments=d=>{let x=0,y=0,out=[];for(const token of d.match(/[MHV][^MHV]+/g)||[]){const op=token[0],v=token.slice(1).trim().split(/[,\s]+/).map(Number),next=op==='M'?[v[0],v[1]]:op==='H'?[v[0],y]:[x,v[0]];if(op!=='M')out.push([x,y,...next]);[x,y]=next;}return out;};
 const crosses=([x1,y1,x2,y2],n)=>y1===y2?y1>n.y+2&&y1<n.y+n.height-2&&Math.max(x1,x2)>n.x+2&&Math.min(x1,x2)<n.x+n.width-2:x1>n.x+2&&x1<n.x+n.width-2&&Math.max(y1,y2)>n.y+2&&Math.min(y1,y2)<n.y+n.height-2;
 for(const width of [820,1200,1600])for(const [concern] of CONCERNS){
  const state={scopeId:m.root,concern,context:'functional',detail:'expanded'},view=architectureView(m,state),layout=layoutArchitecture(m,view,state,width);
  for(let i=0;i<layout.occurrences.length;i++)for(let j=i+1;j<layout.occurrences.length;j++){const a=layout.occurrences[i],b=layout.occurrences[j];assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),`${concern}: ${a.id} overlaps ${b.id}`);}
  const focuses=concern==='structure'?[null,...m.modules.map(o=>o.id)]:[null];
  for(const selectedId of focuses){const links=visibleRelationships(view,layout,{selectedId});assert.equal(links.visible.length+links.hidden,view.relationships.length);assert(links.visible.length<=18||concern!=='structure');
   if(concern!=='structure')continue;
   for(const [i,e] of links.visible.entries()){const geometry=edgeGeometry(layout.positions.get(e.from),layout.positions.get(e.to),i,layout.width);if(!geometry)continue;
    for(const n of layout.occurrences)if(n.id!==e.from&&n.id!==e.to)assert(!segments(geometry.d).some(segment=>crosses(segment,n)),`${e.id} crosses ${n.id} at ${width}px`);
   }
  }
 }
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
const root=await mkdtemp(path.join(tmpdir(),'aiw-model-test-')),env={DB:localDatabase(path.join(root,'db.sqlite')),FILES:localFiles(path.join(root,'files'))},origin='https://aiw.test';let project='bank-payment';
async function api(route,body,status=200){const res=await worker.fetch(new Request(origin+route+(route.includes('?')?'&':'?')+'project='+project,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'test-owner',Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;}
try{await check('Server import previews integrity, creates an isolated project and preserves semantic links',async()=>{
 await api('/api/project');const preview=await api('/api/recovery?action=preview',{package:pack});assert.equal(preview.objects,pack.semantic.objects.length);const restored=await api('/api/recovery?action=restore',{package:pack,hash:preview.hash,name:'Restored semantic model',reviewed:true},201);project=restored.id;const stored=await api('/api/project'),model=architectureModel(stored.document);assert.equal(model.issues.length,0);assert(model.objects.has('queue'));assert.deepEqual(model.relationships.filter(e=>e.type==='realizedBy').map(e=>[e.id,e.from,e.to]),m.relationships.filter(e=>e.type==='realizedBy').map(e=>[e.id,e.from,e.to]));assert.equal(stored.document.workbench.views[0].exploration.scopeId,'GRP-003');assert(restored.modelView);assert.equal(stored.document.workspace.initialModelViewId,restored.modelView);assert(stored.document.workbench.views.some(v=>v.id===restored.modelView&&v.exploration.scopeId==='GRP-003'));
 });}finally{env.DB.close();await rm(root,{recursive:true,force:true});}
const report={status:'passed',checks,limits:['Orbus uses a synthetic target mapping for deterministic preparation tests; no tenant import/update was performed.','No novice/practitioner study or live provider generation was run by these tests.','The scale fixture verifies projection for 2,000 requirements, not rendering or multi-user performance at 100,000 objects.']};
if(process.env.AIW_EXPLORER_OUTPUT)await writeFile(path.join(process.env.AIW_EXPLORER_OUTPUT,'AIW-v50-Model-Verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
