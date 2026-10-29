import {applyCanonical} from './canonical-command.js';
import {journeyIndex,journeyTargets} from './journey-context.js';
import {digest} from './brain-integrity.js';
import {baselineDiff,capacitySensitivity,comparativeCost,compareEnvironments,rolloutWalkthrough,normalizeAlternativeScenario,normalizeAlternativeComparison,alternativeMetrics} from './architecture-analysis.js';
import {inheritedFindings,applyFinalReviewCommand} from './review-domain.js';
import {architectureModel,normalizeExploration} from './architecture-model.js';
import {workingBasis,libraryCurrent,comparisonStamp} from './guidance-record.js';
import {COMPONENT_LIBRARY_KIND,readComponentSnapshot,snapshotText,SNAPSHOT_LIMIT} from './component-library.js';
import {documentCopy,handOver} from './document-memo.js';
// Moved to guidance-record.js (F2-08); importers of workbench-domain.js keep reading them here.
export {workingBasis,libraryCurrent,scenarioProjection,scenarioComparisonCurrent} from './guidance-record.js';
const text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'';
// at: the time the changes are applied at ('preview' when they are only shown); actor: who applies them, which the
// commands that record it keep (round 12, GR-GOV-22: a dismissal a reviewed change carries records its reviewer). The
// first command works on a copy of p; each later one on the document the command before it answered with, which nothing
// else holds, so it is handed over rather than copied again (round 12: a batch of 20 copied the whole project 60 times).
// selectedIds: the record each staged command created or selected, in the order of the commands (round 12, GR-GOV-16),
// beside `selected`, the last of them.
export function previewWorkingChange(p,commands,at='preview',actor=''){
 if(!Array.isArray(commands)||!commands.length||commands.length>20)throw Error('Stage 1–20 design changes.');
 let doc=p,selected=null;const selectedIds=[];for(const command of commands){const result=applyCanonical(doc===p?doc:handOver(doc),command,at,actor);doc=result.document;selectedIds.push(result.created??result.selected??null);selected=result.selected||selected;}
 const diff=baselineDiff(p,doc),index=journeyIndex(p),affected=new Map();
 for(const r of diff.records)for(let chapter=(r.chapter||1)+1;chapter<=11;chapter++)for(const target of journeyTargets(index,r.id,chapter))affected.set(target.node.id,{id:target.node.id,chapter,title:target.node.title});
 const fields=commands.map(c=>({type:c.type,id:c.payload?.id||selected||'project'}));
 return {document:doc,selected,selectedIds,diff,affected:[...affected.values()],fields,brief:p.brief&&digest(p.brief)!==digest(doc.brief)?{before:p.brief,after:doc.brief}:null,stamp:digest([workingBasis(p),commands]),basis:workingBasis(p)};
}
export function targetSnapshot(p,c){
 if(c.type==='brief')return p.brief;const id=c.payload?.id;if(!id)return null;
 if(c.type==='decision.alternative'){if(!c.payload.alternativeId)return null;const a=p.decisions.records.find(d=>d.id===id)?.alternatives.find(a=>a.id===c.payload.alternativeId);return a?{...a,id,alternativeId:a.id}:null;}
 if(c.type==='techrealisation.option'){if(!c.payload.option?.id)return null;const o=p.technologyRealisation.records.find(r=>r.id===id)?.options.find(o=>o.id===c.payload.option.id);return o?{id,option:o}:null;}
 const links={'runtime.path':p.runtime?.paths,'realisation.interaction':p.realisation?.connections,'logical.connection':p.logical?.connections,'logical.mapping':p.logical?.mappings,'technology.dependency':p.technology?.dependencies,'techrealisation.connection':p.technologyRealisation?.connections,'interfaces.invariant':p.interfaces?.invariants};
 const r=links[c.type]?.find(r=>r.id===id)||journeyIndex(p).nodes.get(id)?.record;if(!r)return null;
 // Allocation lists live beside their native record. They are part of its editable
 // specification and therefore part of the three-way basis as well.
 const map={'realisation.component':[p.logical.mappings,'allocations','physicalId','logicalId'],'technology.capability':[p.technology.mappings,'mappings','capabilityId','needId'],'techrealisation.plan':[p.technologyRealisation.mappings,'mappings','realizationId','capabilityId']}[c.type];
 return map?{...r,[map[1]]:map[0].filter(x=>x[map[2]]===id).map(x=>({[map[3]]:x[map[3]],scope:x.scope})).sort((a,b)=>a[map[3]].localeCompare(b[map[3]]))}:r;
}
const leaves=(v,path='')=>Object.entries(v||{}).flatMap(([k,x])=>{const name=path?path+'.'+k:k;return x&&typeof x==='object'&&!Array.isArray(x)?leaves(x,name):[[name,x]];});
const readPath=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
export function setChangeField(o,path,value){const keys=path.split('.');if(keys.some(k=>['__proto__','prototype','constructor'].includes(k)))throw Error('Invalid change field.');let at=o;for(const k of keys.slice(0,-1)){at[k]??={};at=at[k];}at[keys.at(-1)]=value;}
export function rebaseWorkingAlternative(p,a){
 const conflicts=[],commands=a.commands.map((c,i)=>{const base=a.targets[i],current=targetSnapshot(p,c);if((!c.payload?.id&&c.type!=='brief')||(c.type==='decision.alternative'&&!c.payload.alternativeId)||(c.type==='techrealisation.option'&&!c.payload.option?.id))return structuredClone(c);if(!current){conflicts.push({index:i,id:c.payload?.id,field:'record',before:base,current:null,proposed:c.payload});return structuredClone(c);}const payload=structuredClone(c.payload);for(const [key,value] of leaves(payload)){if(['id','alternativeId','revision','history','review','sourceSnapshot'].includes(key.split('.').at(-1)))continue;const before=readPath(base,key),now=readPath(current,key),same=(x,y)=>digest(x??null)===digest(y??null);if(same(value,before))setChangeField(payload,key,now);else if(!same(now,before)&&!same(now,value))conflicts.push({index:i,id:c.payload.id||'brief',field:key,before,current:now,proposed:value});}return {...c,payload};});
 return {commands,conflicts,stamp:digest([workingBasis(p),a.revision,commands,conflicts])};
}
export function previewScenarioAlternative(p,commands,raw){
 const q=previewWorkingChange(p,commands),scenario=normalizeAlternativeScenario(raw);
 if(scenario?.capacity&&!q.document.runtime.plans.some(r=>r.id===scenario.capacity.planId))throw Error('Choose a runtime plan in this proposed design.');
 if(scenario?.cost?.realizationIds.some(id=>!q.document.technologyRealisation.records.some(r=>r.id===id)))throw Error('Choose technology realizations in this proposed design.');
 return {...q,scenario,stamp:scenario?digest([q.stamp,scenario]):q.stamp};
}
export function compareWorkingAlternatives(p,raw){
 const inputs=normalizeAlternativeComparison(raw),basis=workingBasis(p),rows=inputs.alternativeIds.map(id=>{
  const a=p.workbench?.alternatives.find(a=>a.id===id);if(!a||a.status!=='draft')throw Error('Choose saved draft alternatives; accepted or set-aside proposals remain in their recorded comparisons.');
  const r=rebaseWorkingAlternative(p,a),row={id:a.id,title:a.title,revision:a.revision,basis:a.basis,currentness:a.basis===basis?'current':'rebased preview',conflicts:r.conflicts};
  if(r.conflicts.length)return {...row,currentness:'conflict',reason:'Resolve overlapping or removed specifications before estimating this alternative.'};
  try{const q=previewWorkingChange(p,r.commands);return {...row,diff:q.diff,affected:q.affected,metrics:alternativeMetrics(q.document,a.scenario,inputs)};}catch(e){return {...row,currentness:'invalid',reason:e.message};}
 });
 return {kind:'alternatives',inputs,modelBasis:basis,stamp:comparisonStamp(p,inputs),rows,limits:'Design estimates from declared specifications and user-supplied evidence. Capacity assumes evenly distributable independent work and stable rates; headroom does not prove latency or availability. Costs cover the named realizations and stated transition costs only; no live prices, currency conversion, growth pricing, taxes or labour are inferred.'};
}
// Small, durable projection for the SDD and contextual reasoning. Saved numerical
// results retain their original evidence and are explicitly marked when superseded.
export function previewGuidanceTemplate(p,id,at='preview'){
 const entry=p.workbench?.catalogue.find(e=>e.id===id);if(!entry||entry.status!=='approved'||!libraryCurrent(p,entry))throw Error('Review current source-backed guidance before using a template.');let fields;try{fields=JSON.parse(entry.content);}catch{throw Error('This template must contain the chapter fields as a JSON object.');}if(!fields||Array.isArray(fields)||typeof fields!=='object')throw Error('Use a chapter field object.');
 const type={'requirement-template':'artefact','scenario-template':'quality.driver','decision-template':'decision.save','document-template':'review.narrative'}[entry.kind];if(!type)throw Error('Choose a chapter template.');const payload={...fields,confirmed:false,targetConfirmed:false,origin:'suggestion',...(type==='artefact'?{type:'requirement',source:'Project template '+entry.id+' revision '+entry.revision}:{} )};delete payload.id;
 if(type==='review.narrative'){const result=applyFinalReviewCommand(p,{type,payload:{...p.finalReview.narrative,...Object.fromEntries(['title','owner','audience','summary','scope','approach'].filter(k=>k in fields).map(k=>[k,fields[k]])),confirmed:false}},at);return {...result,diff:baselineDiff(p,result.document),affected:[],documentChange:{before:p.finalReview.narrative,after:result.document.finalReview.narrative},stamp:digest([workingBasis(p),p.finalReview.narrative,entry])};}
 const q=previewWorkingChange(p,[{type,payload}]);return {...q,command:{type,payload},stamp:digest([q.stamp,entry])};
}
export function previewGuidanceUse(p,raw){
 const entry=p.workbench?.catalogue.find(e=>e.id===raw.entryId);if(!entry||entry.status!=='approved'||!libraryCurrent(p,entry))throw Error('Use current reviewed guidance. Review the source or organisation release first.');
 if(!text(raw.adaptation,2400)||!text(raw.owner,180)||!text(raw.reason))throw Error('Adapt the guidance to this object, assign its owner and explain applicability.');
 let command;if(entry.kind==='runbook'){const r=p.runtime.plans.find(r=>r.id===raw.targetId);if(!r)throw Error('Choose an operating plan.');command={type:'runtime.plan',payload:{...r,runbook:text(raw.adaptation,2400),owner:text(raw.owner,180),assumptionsResolved:false}};}
 else if(entry.kind==='control'){if(!p.security.threats.some(t=>t.id===raw.threatId&&t.targetIds.includes(raw.targetId)))throw Error('Choose a threat against the protected object.');command={type:'security.control',payload:{title:raw.title||entry.title,category:raw.category,purpose:raw.reason,mechanism:raw.adaptation,enforcement:raw.enforcement,verificationPlan:raw.verificationPlan,owner:raw.owner,targetIds:[raw.targetId],threatIds:[raw.threatId],failureMode:'Unspecified',assumptionsResolved:false,origin:'suggestion'}};}
 else if(entry.kind==='technology'){if(!p.technologyRealisation.records.some(r=>r.id===raw.targetId))throw Error('Choose a technology realization.');command={type:'techrealisation.option',payload:{id:raw.targetId,option:{title:raw.title||entry.title,product:raw.product,version:raw.version,vendor:raw.vendor,operatingModel:raw.operatingModel,benefits:raw.adaptation,drawbacks:raw.drawbacks,evidence:'Guidance '+entry.id+' revision '+entry.revision+'. '+raw.reason}}};}
 else throw Error('Use this entry through its chapter template or architectural reasoning workflow.');
 const q=previewWorkingChange(p,[command]);return {...q,commands:[command],entryId:entry.id,entryRevision:entry.revision,stamp:digest([q.stamp,entry,Object.fromEntries(Object.entries(raw).filter(([k])=>!['stamp','reviewed'].includes(k)))])};
}
export function previewLifecyclePlan(p,raw){
 const r=p.technologyRealisation.records.find(r=>r.id===raw.targetId);if(!r||!['Migration','Exit'].includes(raw.phase))throw Error('Choose a technology realization and transition type.');const source=p.coauthoring?.sources?.find(s=>s.id===raw.sourceId)?.versions.at(-1);if(!source)throw Error('Attach a dated source for the migration or exit procedure.');
 const labels={trigger:'Entry and readiness conditions',sequence:'Transition sequence',dataPlan:'Data and state continuity',stopConditions:'Stop criteria',fallback:'Fallback and reconciliation',verification:'Verification and evidence',decommission:'Retirement, retention and disposal'};for(const key of ['title','owner',...Object.keys(labels)])if(!text(raw[key],key==='title'?180:800))throw Error('Complete the owned transition procedure, including '+(labels[key]||key)+'.');
 const lifecycle=[raw.phase+' · '+text(raw.title,180),'Owner: '+text(raw.owner,180),...Object.entries(labels).map(([k,l])=>l+': '+text(raw[k],800)),'Source: '+raw.sourceId+' revision '+source.revision].join('\n');if(lifecycle.length>4000)throw Error('Keep the transition procedure below 4,000 characters; retain longer detail in its source.');
 const command={type:'techrealisation.plan',payload:{...r,lifecyclePlan:lifecycle,assumptionsResolved:false,mappings:p.technologyRealisation.mappings.filter(m=>m.realizationId===r.id).map(m=>({capabilityId:m.capabilityId,scope:m.scope}))}},q=previewWorkingChange(p,[command]);return {...q,commands:[command],sourceHash:digest(source),stamp:digest([q.stamp,source])};
}
export function previewQualityWorkshop(p,raw){
 if(!Array.isArray(raw.rows)||!raw.rows.length||raw.rows.length>20||new Set(raw.rows.map(r=>r.id)).size!==raw.rows.length)throw Error('Compare 1–20 distinct quality scenarios in this session.');
 const ranks=new Set(),commands=raw.rows.map(row=>{const d=p.quality.drivers.find(d=>d.id===row.id);if(!d)throw Error('Choose current quality scenarios.');if(!Number.isInteger(row.rank)||row.rank<1||row.rank>10000||ranks.has(row.rank)||!text(row.rationale)||!text(row.conditions)||!text(row.measurement))throw Error('Give each scenario a distinct order, business rationale, workload and measurement plan.');ranks.add(row.rank);const changed=['targetValue','conditions','measurement'].some(k=>String(row[k]??'')!==String(d[k]??''));return {type:'quality.driver',payload:{...d,...row,confirmed:changed?false:d.confirmed,targetConfirmed:changed?false:d.targetConfirmed}};});
 const q=previewWorkingChange(p,commands);return {...q,commands};
}
export function workQueue(p){return inheritedFindings(p).map(f=>({...f,assignment:p.workbench?.assignments?.find(a=>a.findingId===f.id)||null}));}
// Diagram arrangements (round 2, requested by the diagrams workstream): a person's pinned layout of one chapter
// picture, the positions of its nodes in one scene and arrangement. A workspace preference, not a design change:
// it is stored under workspace.diagramArrangements['chapter|scene|arrangement'], never enters the canonical graph,
// the working basis or the change review (it is not a staged command), and is saved compare-and-swap on its own
// revision. The scene and arrangement ids are those of notation-model.js (SCENES, ARRANGEMENTS; the diagram
// arrangement suite holds the two lists equal). Whether a node exists is asked of the diagram itself through
// options.diagramNodes(p, scene) → nodes (notationDiagram), which the server passes in; without it the command is
// refused, so an unchecked pin can never be stored.
export const DIAGRAM_SCENES=['process','context','motivation','drivers','decisions','rationale','logical','application','container','cooperation','solution','stack','usage','integration','data','lineage','security','deployment','sequence','lifecycle','module-map'];
export const DIAGRAM_ARRANGEMENTS=['tree','radial','orthogonal','layered','grouped','lanes','sequence'];
export const DIAGRAM_PIN_LIMIT=200,DIAGRAM_COORDINATE_MAX=20000;
export const diagramArrangementKey=(chapter,scene,arrangement)=>chapter+'|'+scene+'|'+arrangement;
function applyDiagramArrangement(p,raw,at,actor,diagramNodes){
 const chapter=Number(raw.chapter);
 if(!Number.isInteger(chapter)||chapter<1||chapter>11)throw Error('Choose a chapter from 1 to 11.');
 if(!DIAGRAM_SCENES.includes(raw.scene))throw Error('Choose a picture this workbench draws.');
 if(!DIAGRAM_ARRANGEMENTS.includes(raw.arrangement))throw Error('Choose an arrangement this workbench offers.');
 if(!raw.pins||typeof raw.pins!=='object'||Array.isArray(raw.pins))throw Error('Send the pinned positions as an object keyed by node.');
 const entries=Object.entries(raw.pins);
 if(entries.length>DIAGRAM_PIN_LIMIT)throw Error('Pin at most '+DIAGRAM_PIN_LIMIT+' nodes in one arrangement.');
 if(typeof diagramNodes!=='function')throw Error('Diagram arrangements need the diagram model to check their nodes.');
 const nodes=diagramNodes(p,raw.scene);if(!Array.isArray(nodes))throw Error('This picture has no nodes in this project.');
 const known=new Set(nodes.map(n=>n?.id).filter(id=>typeof id==='string'));
 const coordinate=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=DIAGRAM_COORDINATE_MAX;
 const pins={};
 for(const [id,pin] of entries){
  if(!known.has(id))throw Error('Pin only nodes of this picture; '+String(id).slice(0,80)+' is not one of them.');
  if(!pin||typeof pin!=='object'||Array.isArray(pin)||Object.keys(pin).some(k=>!['x','y','group','dx','dy'].includes(k)))throw Error('A pin holds x and y, and optionally group, dx and dy.');
  if(!coordinate(pin.x)||!coordinate(pin.y)||['dx','dy'].some(k=>pin[k]!==undefined&&!coordinate(pin[k])))throw Error('Pin positions are finite numbers from 0 to '+DIAGRAM_COORDINATE_MAX+'.');
  if(pin.group!==undefined&&(typeof pin.group!=='string'||!pin.group||pin.group.length>200))throw Error('A pin\'s group names a group of the picture.');
  pins[id]={x:pin.x,y:pin.y,...(pin.group!==undefined?{group:pin.group}:{}),...(pin.dx!==undefined?{dx:pin.dx}:{}),...(pin.dy!==undefined?{dy:pin.dy}:{})};
 }
 const key=diagramArrangementKey(chapter,raw.scene,raw.arrangement);
 p.workspace??={};p.workspace.diagramArrangements??={};
 const saved=p.workspace.diagramArrangements[key]?.revision||0;
 if(Number(raw.revision??0)!==saved)throw Error('This arrangement was changed elsewhere. Reload the picture, then arrange it again.');
 p.workspace.diagramArrangements[key]={chapter,scene:raw.scene,arrangement:raw.arrangement,pins,revision:saved+1,at,actor:actor||null};
 return {document:p,selected:null};
}
// Round 12 (GR-GOV-20): AIW's seeding, switched off or on again for the project by a person who reviewed what it does
// (no need, boundary, contract, plan or path proposed from then on; what AIW proposed before stays to keep or dismiss),
// with who, when and why. model-scope.js seedingOff reads it.
function applySeeding(p,raw,at,actor){if(!['off','on'].includes(raw.state))throw Error('Choose whether AIW proposes records for this project: on or off.');if(raw.reviewed!==true)throw Error('Review what switching AIW\'s seeding '+raw.state+' does before saving it.');
 const rationale=text(raw.rationale,600);if(raw.state==='off'&&!rationale)throw Error('Say why AIW\'s seeding is switched off.');if((p.workspace?.seeding?.state||'on')===raw.state)throw Error('AIW\'s seeding is already '+raw.state+'.');
 p.workspace={...(p.workspace||{}),seeding:{state:raw.state,at,actor:actor||null,rationale}};return {document:p,selected:null};}
// baselineSource(id): a frozen baseline's design source, which the server reads for a perspective saved on that baseline
// (round 12, GR-PERF-13: a project read carries a baseline's metadata, not its parts); without it, the source the
// document holds.
// author: the commit's author (worker.js, authorship.js commitAuthor), when the server applies the command. A reviewed
// change is applied by a person who reviewed its changes (reviewed:true); a governed batch drafted by Sol (author kind
// sol-draft, D-06) is applied as what it is, unreviewed (reviewed:false), and never has to claim a review nobody made.
// Its history entry keeps who sent it, of what kind, whether a person reviewed it, and why.
export function applyWorkbenchCommand(input,command,at,actor,{diagramNodes=null,baselineSource=null,author=null}={}){
 if(command.type==='workspace.diagram-arrangement')return applyDiagramArrangement(structuredClone(input),command.payload||{},at,actor,diagramNodes);
 if(command.type==='workspace.seeding')return applySeeding(documentCopy(input),command.payload||{},at,actor);
 const raw=command.payload||{};let p=documentCopy(input);p.workbench??={version:1,alternatives:[],analyses:[],catalogue:[],views:[],assignments:[]};const m=p.workbench;let selected,selectedIds;
 if(command.type==='workspace.apply'||command.type==='workspace.alternative'){
  // Applied changes are previewed at the time they are applied, and the preview's document is the applied one (round
  // 12): the same commands on the same document, applied once rather than twice.
  const applying=command.type==='workspace.apply',q=applying?previewWorkingChange(p,raw.commands,at===undefined?new Date().toISOString():at,actor):previewScenarioAlternative(p,raw.commands,raw.scenario);if(raw.stamp!==q.stamp)throw Error('The design changed. Refresh the change preview.');
  if(command.type==='workspace.alternative'){
   if(!text(raw.title,180)||!text(raw.reason)||m.alternatives.length>=60)throw Error('Name the alternative and its rationale (maximum 60).');
   m.alternatives.push({id:'WA-'+crypto.randomUUID(),revision:1,title:text(raw.title,180),reason:text(raw.reason),commands:structuredClone(raw.commands),targets:raw.commands.map(c=>structuredClone(targetSnapshot(p,c))),basis:q.basis,scenario:q.scenario,status:'draft',at,actor});
  }else{
   const draft=author?.kind==='sol-draft';
   if(draft&&raw.reviewed===true)throw Error('A draft by Sol is applied unreviewed (reviewed:false); a person reviews its records through the review plan.');
   if(!draft&&raw.reviewed!==true)throw Error('Review the changed objects and downstream obligations.');
   p=q.document;selected=q.selected;selectedIds=q.selectedIds;
   p.workbench.history??=[];p.workbench.history.push({at,actor,commands:raw.commands,changed:q.diff.records.map(r=>r.id),affected:q.affected,reason:text(raw.reason),stamp:q.stamp,...(author?{author:{kind:author.kind,account:author.account,reviewed:!draft&&raw.reviewed===true,...(author.session?{session:author.session}:{})}}:{})});
  }
 }else if(command.type==='workspace.revise-alternative'){
  const a=m.alternatives.find(a=>a.id===raw.id);if(!a||a.status!=='draft'||a.revision!==raw.revision)throw Error('Reopen the current draft alternative before revising it.');
  if(!Array.isArray(raw.commands)||!raw.commands.length||raw.commands.length>20)throw Error('Retain 1–20 native specifications in the alternative.');
  const r=rebaseWorkingAlternative(p,a);if(a.basis!==workingBasis(p)&&raw.basisStamp!==r.stamp)throw Error('The working design changed. Review the rebased alternative before revising it.');
  for(const f of r.conflicts){const choice=raw.resolutions?.[f.index+':'+f.field],old=a.commands[f.index],next=raw.commands?.find(c=>c.type===old.type&&c.payload?.id===old.payload?.id&&c.payload?.alternativeId===old.payload?.alternativeId&&c.payload?.option?.id===old.payload?.option?.id);if(!next&&choice==='remove')continue;if(!['current','proposed'].includes(choice)||f.field==='record'||(choice==='current'&&digest(readPath(next?.payload,f.field)??null)!==digest(f.current??null)))throw Error('Resolve every overlapping field explicitly before saving this revision.');}
  const q=previewScenarioAlternative(p,raw.commands,raw.scenario===undefined?a.scenario:raw.scenario);if(q.stamp!==raw.stamp||raw.reviewed!==true||!text(raw.title,180)||!text(raw.reason))throw Error('Review this revised alternative and explain the change.');
  a.history??=[];a.history.push({revision:a.revision,title:a.title,reason:a.reason,commands:a.commands,targets:a.targets,basis:a.basis,scenario:a.scenario||null,at:a.at,actor:a.actor});a.commands=structuredClone(raw.commands);a.targets=raw.commands.map(c=>structuredClone(targetSnapshot(p,c)));a.basis=q.basis;a.scenario=q.scenario;a.title=text(raw.title,180);a.reason=text(raw.reason);a.revision++;a.at=at;a.actor=actor;
 }else if(command.type==='workspace.merge'){
  const a=m.alternatives.find(a=>a.id===raw.id);if(!a||a.status!=='draft')throw Error('Choose a draft alternative.');const r=rebaseWorkingAlternative(p,a);if(raw.stamp!==r.stamp)throw Error('The alternative or current design changed. Compare again.');
  for(const f of r.conflicts){const choice=raw.resolutions?.[f.index+':'+f.field];if(!['current','proposed'].includes(choice)||f.field==='record')throw Error('Resolve every changed field explicitly. Removed records require a new alternative.');if(choice==='current')setChangeField(r.commands[f.index].payload,f.field,f.current);}
  if(raw.reviewed!==true||!text(raw.reason))throw Error('Review the merge and record its rationale.');
  for(const c of r.commands)p=applyCanonical(p,c,at,actor).document;const saved=p.workbench.alternatives.find(x=>x.id===a.id);saved.status='accepted';saved.revision++;saved.accepted={at,actor,reason:text(raw.reason),commands:r.commands,basis:workingBasis(input),resolutions:raw.resolutions||{}};
 }else if(command.type==='workspace.set-aside'){
  const a=m.alternatives.find(a=>a.id===raw.id);if(!a||a.status!=='draft'||!text(raw.reason))throw Error('Choose a draft alternative and explain why it is not selected.');a.status='not selected';a.revision++;a.disposition={at,actor,reason:text(raw.reason)};
 }else if(command.type==='workspace.analysis'){
  if(!text(raw.title,180)||!text(raw.basis))throw Error('Name the analysis and record its assumptions and evidence basis.');
  const results={capacity:()=>capacitySensitivity(raw.inputs),cost:()=>comparativeCost(raw.inputs.options,raw.inputs.months),environments:()=>compareEnvironments(p,raw.inputs.leftId,raw.inputs.rightId),rollout:()=>rolloutWalkthrough(p,raw.inputs.planId),alternatives:()=>compareWorkingAlternatives(p,raw.inputs)};
  if(!results[raw.kind])throw Error('Choose a supported analysis.');const result=results[raw.kind]();
  if(raw.kind==='alternatives'&&raw.stamp!==result.stamp)throw Error('The design, alternatives or shared assumptions changed. Compare again before recording the result.');
  m.analyses.push({id:'AN-'+crypto.randomUUID(),title:text(raw.title,180),kind:raw.kind,inputs:raw.kind==='alternatives'?result.inputs:raw.inputs,result,basis:text(raw.basis),modelBasis:workingBasis(p),at,actor});if(m.analyses.length>120)throw Error('Export earlier analyses before adding more than 120.');
 }else if(command.type==='workspace.catalogue'){
  if(!['technology','control','runbook','requirement-template','scenario-template','decision-template','document-template','standard','pattern','reference-architecture',COMPONENT_LIBRARY_KIND].includes(raw.kind))throw Error('Choose a library type.');
  if(!text(raw.title,180)||!text(raw.content,12000)||!text(raw.owner,180))throw Error('Name the entry, content and accountable owner.');
  const old=raw.id?m.catalogue.find(e=>e.id===raw.id):null;if(raw.id&&!old)throw Error('Choose an existing library entry.');if(old&&old.kind!==raw.kind)throw Error('Library entries retain their type.');
  const source=p.coauthoring?.sources?.find(s=>s.id===raw.sourceId)?.versions.at(-1);if(raw.status==='approved'&&(!source||!text(raw.reviewNote)||raw.reviewed!==true))throw Error('An approved entry needs a project source, rationale and explicit review.');
  // Round 11: a component entry holds a component specification snapshot (component-library.js): checked, bounded and
  // redacted before it is kept, whole or not at all.
  let content=text(raw.content,30000);if(raw.kind===COMPONENT_LIBRARY_KIND){content=snapshotText(readComponentSnapshot(raw.content));if(content.length>SNAPSHOT_LIMIT)throw Error('This component snapshot is too long for the library. Shorten its texts first.');}
  const entry={id:old?.id||'LIB-'+crypto.randomUUID(),revision:(old?.revision||0)+1,kind:raw.kind,title:text(raw.title,180),content,owner:text(raw.owner,180),status:['draft','approved','deprecated'].includes(raw.status)?raw.status:'draft',sourceId:text(raw.sourceId,100),sourceHash:source?digest(source):null,reviewNote:text(raw.reviewNote),reviewAfter:text(raw.reviewAfter,30),scope:'Project library',at,actor,history:old?[...(old.history||[]),(({history,...v})=>v)(old)]:[]};if(old)m.catalogue[m.catalogue.indexOf(old)]=entry;else m.catalogue.push(entry);
 }else if(command.type==='workspace.template'){
  const q=previewGuidanceTemplate(p,raw.entryId,at);if(raw.reviewed!==true||raw.stamp!==q.stamp)throw Error('Review the current template draft and its source.');const entry=m.catalogue.find(e=>e.id===raw.entryId);if(q.command){const r=applyCanonical(p,q.command,at,actor);p=r.document;selected=r.selected;}else p=q.document;
  p.workbench.guidanceUses??=[];if(p.workbench.guidanceUses.length>=400)throw Error('Export earlier adaptations before recording more than 400.');p.workbench.guidanceUses.push({id:'USE-'+crypto.randomUUID(),entry:structuredClone(entry),targetId:selected||'project',createdId:selected,reason:'Drafted from reviewed chapter template',at,actor});
 }else if(command.type==='workspace.guidance'){
  const q=previewGuidanceUse(p,raw);if(raw.stamp!==q.stamp||raw.reviewed!==true)throw Error('Review the current guidance, adapted definition and source impact.');const entry=m.catalogue.find(e=>e.id===raw.entryId);for(const c of q.commands){const r=applyCanonical(p,c,at,actor);p=r.document;selected=r.selected;}
  p.workbench.guidanceUses??=[];if(p.workbench.guidanceUses.length>=400)throw Error('Export earlier guidance adaptations before recording more than 400.');p.workbench.guidanceUses.push({id:'USE-'+crypto.randomUUID(),entry:structuredClone(entry),targetId:raw.targetId,createdId:selected,reason:text(raw.reason),adaptation:text(raw.adaptation,2400),owner:text(raw.owner,180),at,actor});
 }else if(command.type==='workspace.lifecycle'){
  const q=previewLifecyclePlan(p,raw);if(raw.reviewed!==true||raw.stamp!==q.stamp)throw Error('Review the current transition procedure and source.');for(const c of q.commands)p=applyCanonical(p,c,at,actor).document;
  p.workbench.transitions??=[];if(p.workbench.transitions.length>=100)throw Error('Export earlier transition records before adding more than 100.');p.workbench.transitions.push({id:'TRANS-'+crypto.randomUUID(),targetId:raw.targetId,phase:raw.phase,title:text(raw.title,180),owner:text(raw.owner,180),sourceId:raw.sourceId,sourceHash:q.sourceHash,procedure:Object.fromEntries(['trigger','sequence','dataPlan','stopConditions','fallback','verification','decommission'].map(k=>[k,text(raw[k],800)])),status:'Draft operating procedure; execution evidence required',at,actor});selected=raw.targetId;
 }else if(command.type==='workspace.quality-workshop'){
  const q=previewQualityWorkshop(p,raw);if(raw.reviewed!==true||raw.stamp!==q.stamp||!text(raw.title,180)||!text(raw.participants)||!text(raw.reason))throw Error('Review the proposed priorities and record the session participants and rationale.');
  for(const c of q.commands)p=applyCanonical(p,c,at,actor).document;p.workbench.qualitySessions??=[];if(p.workbench.qualitySessions.length>=100)throw Error('Export earlier sessions before recording more than 100.');p.workbench.qualitySessions.push({id:'QS-'+crypto.randomUUID(),title:text(raw.title,180),participants:text(raw.participants),reason:text(raw.reason),rows:raw.rows,basis:q.basis,changed:q.diff.records.map(r=>r.id),affected:q.affected,at,actor,authority:'Facilitated architecture judgement; participant names do not establish independent approval.'});
 }else if(command.type==='workspace.view'){
  if(!text(raw.title,100)||!Number.isInteger(raw.chapter)||raw.chapter<1||raw.chapter>11||!['work','model','validate','output'].includes(raw.tab))throw Error('Name the perspective and choose an existing chapter and view.');
  let exploration;
  const frozenSource=id=>{const b=id&&p.finalReview?.baselines.find(b=>b.id===id);return b?(b.source||baselineSource?.(id)||null):null;};
  if(raw.exploration){const source=raw.exploration.baselineId?frozenSource(raw.exploration.baselineId):null;if(raw.exploration.baselineId&&!source)throw Error('Choose an existing frozen baseline.');const model=architectureModel(source||p);if(raw.objectId&&!model.objects.has(raw.objectId))throw Error('Choose an existing model object.');exploration={...normalizeExploration(raw.exploration,model),modelSignature:model.signature};}
  else if(raw.objectId&&!journeyIndex(p).nodes.has(raw.objectId))throw Error('Choose an existing model object.');
  let layout;
  if(raw.layout){if(!exploration||!raw.layout.positions||typeof raw.layout.positions!=='object'||Array.isArray(raw.layout.positions)||Object.keys(raw.layout.positions).length>150)throw Error('Save a bounded layout for an existing model view.');
   const known=architectureModel(exploration.baselineId?frozenSource(exploration.baselineId):p).objects;
   const positions={};for(const [id,rect] of Object.entries(raw.layout.positions)){
    if(!known.has(id)||!rect||!['x','y','width','height'].every(k=>Number.isFinite(rect[k])&&rect[k]>=0&&rect[k]<=6000)||rect.width<64||rect.width>720||rect.height<64||rect.height>720)throw Error('A saved view layout contains an unknown object or invalid size.');
    positions[id]={x:rect.x,y:rect.y,width:rect.width,height:rect.height,pinned:rect.pinned===true};
   }layout={positions};
  }
  m.views.push({id:crypto.randomUUID(),title:text(raw.title,100),purpose:text(raw.purpose,1600),chapter:raw.chapter,tab:raw.tab,objectId:text(raw.objectId,100),domain:text(raw.domain,180),...(exploration?{exploration}:{}),...(layout?{layout}:{}),at,actor});if(m.views.length>60)m.views.shift();
 }else if(command.type==='workspace.assign'){
  if(!workQueue(p).some(f=>f.id===raw.findingId)||!text(raw.owner,180)||!text(raw.next))throw Error('Choose a current finding, accountable owner and next action.');
  const assignment={findingId:raw.findingId,owner:text(raw.owner,180),next:text(raw.next),due:text(raw.due,30),at,actor};m.assignments=m.assignments.filter(a=>a.findingId!==raw.findingId);m.assignments.push(assignment);
 }else if(command.type==='workspace.governance'){
  // Four eyes below governance (round 12, GR-GOV-12): with it on, no review, confirmation or judgement of this project is
  // recorded by the person who wrote what it judges (changes-domain.js fourEyesOn reads it). Who set it, when and why is
  // kept; a draft or an agent account cannot change it (authorship.js).
  if(typeof raw.fourEyes!=='boolean'||!text(raw.reason))throw Error('Say whether four eyes apply to this project\'s reviews (fourEyes true or false), and why.');
  p.workspace={...(p.workspace||{}),governance:{fourEyes:raw.fourEyes,at,actor,reason:text(raw.reason,600)}};
 }else throw Error('Unknown workspace action.');
 p.workbench.version++;return {document:p,selected,...(selectedIds?{selectedIds}:{})};
}
