import {applyCanonical,STAGED_COMMANDS} from './canonical-command.js';
import {journeyIndex,journeyTargets} from './journey-context.js';
import {digest} from './brain-integrity.js';
import {baselineDiff,capacitySensitivity,comparativeCost,compareEnvironments,rolloutWalkthrough} from './architecture-analysis.js';
import {inheritedFindings,applyFinalReviewCommand} from './review-domain.js';
import {architectureModel,normalizeExploration} from './architecture-model.js';
const text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'';
const keys=['brief','artefacts','relationships','processModel','quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime'];
export const workingBasis=p=>digest(keys.map(k=>p[k]));
export function previewWorkingChange(p,commands){
 if(!Array.isArray(commands)||!commands.length||commands.length>20)throw Error('Stage 1–20 design changes.');
 let document=p,selected=null;for(const command of commands){const result=applyCanonical(document,command,'preview');document=result.document;selected=result.selected||selected;}
 const diff=baselineDiff(p,document),index=journeyIndex(p),affected=new Map();
 for(const r of diff.records)for(let chapter=(r.chapter||1)+1;chapter<=11;chapter++)for(const target of journeyTargets(index,r.id,chapter))affected.set(target.node.id,{id:target.node.id,chapter,title:target.node.title});
 const fields=commands.map(c=>({type:c.type,id:c.payload?.id||selected||'project'}));
 return {document,selected,diff,affected:[...affected.values()],fields,brief:p.brief&&digest(p.brief)!==digest(document.brief)?{before:p.brief,after:document.brief}:null,stamp:digest([workingBasis(p),commands]),basis:workingBasis(p)};
}
export function targetSnapshot(p,c){
 if(c.type==='brief')return p.brief;const id=c.payload?.id;if(!id)return null;
 if(c.type==='decision.alternative'){if(!c.payload.alternativeId)return null;const a=p.decisions.records.find(d=>d.id===id)?.alternatives.find(a=>a.id===c.payload.alternativeId);return a?{...a,id,alternativeId:a.id}:null;}
 if(c.type==='techrealisation.option'){if(!c.payload.option?.id)return null;const o=p.technologyRealisation.records.find(r=>r.id===id)?.options.find(o=>o.id===c.payload.option.id);return o?{id,option:o}:null;}
 return journeyIndex(p).nodes.get(id)?.record||null;
}
const leaves=(v,path='')=>Object.entries(v||{}).flatMap(([k,x])=>{const name=path?path+'.'+k:k;return x&&typeof x==='object'&&!Array.isArray(x)?leaves(x,name):[[name,x]];});
const readPath=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
export function setChangeField(o,path,value){const keys=path.split('.');if(keys.some(k=>['__proto__','prototype','constructor'].includes(k)))throw Error('Invalid change field.');let at=o;for(const k of keys.slice(0,-1)){at[k]??={};at=at[k];}at[keys.at(-1)]=value;}
export function rebaseWorkingAlternative(p,a){
 const conflicts=[],commands=a.commands.map((c,i)=>{const base=a.targets[i],current=targetSnapshot(p,c);if((!c.payload?.id&&c.type!=='brief')||(c.type==='decision.alternative'&&!c.payload.alternativeId)||(c.type==='techrealisation.option'&&!c.payload.option?.id))return structuredClone(c);if(!current){conflicts.push({index:i,id:c.payload?.id,field:'record',before:base,current:null,proposed:c.payload});return structuredClone(c);}const payload=structuredClone(c.payload);for(const [key,value] of leaves(payload)){if(['id','alternativeId','revision','history','review','sourceSnapshot'].includes(key.split('.').at(-1)))continue;const before=readPath(base,key),now=readPath(current,key),same=(x,y)=>digest(x??null)===digest(y??null);if(same(value,before))setChangeField(payload,key,now);else if(!same(now,before)&&!same(now,value))conflicts.push({index:i,id:c.payload.id||'brief',field:key,before,current:now,proposed:value});}return {...c,payload};});
 return {commands,conflicts,stamp:digest([workingBasis(p),a.revision,commands,conflicts])};
}
export function libraryCurrent(p,entry){const source=p.coauthoring?.sources?.find(s=>s.id===entry.sourceId)?.versions.at(-1),live=p.workbench?.catalogue.find(e=>e.id===entry.id);return !!source&&digest(source)===entry.sourceHash&&!!live&&live.revision===entry.revision&&live.content===entry.content&&live.status!=='deprecated'&&(!entry.organization||live.organization?.assurance?.eligible===true&&live.organization?.signature===entry.organization.signature)&&(!entry.reviewAfter||entry.reviewAfter>=new Date().toISOString().slice(0,10));}
export function guidanceFindings(p){return (p.workbench?.guidanceUses||[]).filter(u=>!libraryCurrent(p,u.entry)).map(u=>({id:'guidance:'+u.id,chapter:journeyIndex(p).nodes.get(u.createdId||u.targetId)?.chapter||11,objectId:u.createdId||u.targetId,level:'warning',title:'Review changed reusable guidance',detail:u.entry.title+' revision '+u.entry.revision+' is no longer current or eligible. Its original adapted model and source receipt remain available.'}));}
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
export function applyWorkbenchCommand(input,command,at,actor){
 const raw=command.payload||{};let p=structuredClone(input);p.workbench??={version:1,alternatives:[],analyses:[],catalogue:[],views:[],assignments:[]};const m=p.workbench;let selected;
 if(command.type==='workspace.apply'||command.type==='workspace.alternative'){
  const q=previewWorkingChange(p,raw.commands);if(raw.stamp!==q.stamp)throw Error('The design changed. Refresh the change preview.');
  if(command.type==='workspace.alternative'){
   if(!text(raw.title,180)||!text(raw.reason)||m.alternatives.length>=60)throw Error('Name the alternative and its rationale (maximum 60).');
   m.alternatives.push({id:'WA-'+crypto.randomUUID(),revision:1,title:text(raw.title,180),reason:text(raw.reason),commands:structuredClone(raw.commands),targets:raw.commands.map(c=>structuredClone(targetSnapshot(p,c))),basis:q.basis,status:'draft',at,actor});
  }else{
   if(raw.reviewed!==true)throw Error('Review the changed objects and downstream obligations.');
   for(const c of raw.commands)p=applyCanonical(p,c,at).document;selected=q.selected;
   p.workbench.history??=[];p.workbench.history.push({at,actor,commands:raw.commands,changed:q.diff.records.map(r=>r.id),affected:q.affected,reason:text(raw.reason),stamp:q.stamp});
  }
 }else if(command.type==='workspace.revise-alternative'){
  const a=m.alternatives.find(a=>a.id===raw.id);if(!a||a.status!=='draft'||a.revision!==raw.revision)throw Error('Reopen the current draft alternative before revising it.');
  if(!Array.isArray(raw.commands)||raw.commands.length!==a.commands.length||raw.commands.some((c,i)=>c.type!==a.commands[i].type||c.payload?.id!==a.commands[i].payload?.id||c.payload?.alternativeId!==a.commands[i].payload?.alternativeId||c.payload?.option?.id!==a.commands[i].payload?.option?.id))throw Error('Revise the same proposed objects; stage additional changes as a separate alternative.');
  const q=previewWorkingChange(p,raw.commands);if(q.stamp!==raw.stamp||raw.reviewed!==true||!text(raw.title,180)||!text(raw.reason))throw Error('Review this revised alternative and explain the change.');
  a.history??=[];a.history.push({revision:a.revision,title:a.title,reason:a.reason,commands:a.commands,at:a.at,actor:a.actor});a.commands=structuredClone(raw.commands);a.title=text(raw.title,180);a.reason=text(raw.reason);a.revision++;a.at=at;a.actor=actor;
 }else if(command.type==='workspace.merge'){
  const a=m.alternatives.find(a=>a.id===raw.id);if(!a||a.status!=='draft')throw Error('Choose a draft alternative.');const r=rebaseWorkingAlternative(p,a);if(raw.stamp!==r.stamp)throw Error('The alternative or current design changed. Compare again.');
  for(const f of r.conflicts){const choice=raw.resolutions?.[f.index+':'+f.field];if(!['current','proposed'].includes(choice)||f.field==='record')throw Error('Resolve every changed field explicitly. Removed records require a new alternative.');if(choice==='current')setChangeField(r.commands[f.index].payload,f.field,f.current);}
  if(raw.reviewed!==true||!text(raw.reason))throw Error('Review the merge and record its rationale.');
  for(const c of r.commands)p=applyCanonical(p,c,at).document;const saved=p.workbench.alternatives.find(x=>x.id===a.id);saved.status='accepted';saved.revision++;saved.accepted={at,actor,reason:text(raw.reason),commands:r.commands};
 }else if(command.type==='workspace.set-aside'){
  const a=m.alternatives.find(a=>a.id===raw.id);if(!a||a.status!=='draft'||!text(raw.reason))throw Error('Choose a draft alternative and explain why it is not selected.');a.status='not selected';a.revision++;a.disposition={at,actor,reason:text(raw.reason)};
 }else if(command.type==='workspace.analysis'){
  if(!text(raw.title,180)||!text(raw.basis))throw Error('Name the analysis and record its assumptions and evidence basis.');
  const results={capacity:()=>capacitySensitivity(raw.inputs),cost:()=>comparativeCost(raw.inputs.options,raw.inputs.months),environments:()=>compareEnvironments(p,raw.inputs.leftId,raw.inputs.rightId),rollout:()=>rolloutWalkthrough(p,raw.inputs.planId)};
  if(!results[raw.kind])throw Error('Choose a supported analysis.');const result=results[raw.kind]();
  m.analyses.push({id:'AN-'+crypto.randomUUID(),title:text(raw.title,180),kind:raw.kind,inputs:raw.inputs,result,basis:text(raw.basis),modelBasis:workingBasis(p),at,actor});if(m.analyses.length>120)throw Error('Export earlier analyses before adding more than 120.');
 }else if(command.type==='workspace.catalogue'){
  if(!['technology','control','runbook','requirement-template','scenario-template','decision-template','document-template','standard','pattern','reference-architecture'].includes(raw.kind))throw Error('Choose a library type.');
  if(!text(raw.title,180)||!text(raw.content,12000)||!text(raw.owner,180))throw Error('Name the entry, content and accountable owner.');
  const old=raw.id?m.catalogue.find(e=>e.id===raw.id):null;if(raw.id&&!old)throw Error('Choose an existing library entry.');if(old&&old.kind!==raw.kind)throw Error('Library entries retain their type.');
  const source=p.coauthoring?.sources?.find(s=>s.id===raw.sourceId)?.versions.at(-1);if(raw.status==='approved'&&(!source||!text(raw.reviewNote)||raw.reviewed!==true))throw Error('An approved entry needs a project source, rationale and explicit review.');
  const entry={id:old?.id||'LIB-'+crypto.randomUUID(),revision:(old?.revision||0)+1,kind:raw.kind,title:text(raw.title,180),content:text(raw.content,30000),owner:text(raw.owner,180),status:['draft','approved','deprecated'].includes(raw.status)?raw.status:'draft',sourceId:text(raw.sourceId,100),sourceHash:source?digest(source):null,reviewNote:text(raw.reviewNote),reviewAfter:text(raw.reviewAfter,30),scope:'Project library',at,actor,history:old?[...(old.history||[]),(({history,...v})=>v)(old)]:[]};if(old)m.catalogue[m.catalogue.indexOf(old)]=entry;else m.catalogue.push(entry);
 }else if(command.type==='workspace.template'){
  const q=previewGuidanceTemplate(p,raw.entryId,at);if(raw.reviewed!==true||raw.stamp!==q.stamp)throw Error('Review the current template draft and its source.');const entry=m.catalogue.find(e=>e.id===raw.entryId);if(q.command){const r=applyCanonical(p,q.command,at);p=r.document;selected=r.selected;}else p=q.document;
  p.workbench.guidanceUses??=[];if(p.workbench.guidanceUses.length>=400)throw Error('Export earlier adaptations before recording more than 400.');p.workbench.guidanceUses.push({id:'USE-'+crypto.randomUUID(),entry:structuredClone(entry),targetId:selected||'project',createdId:selected,reason:'Drafted from reviewed chapter template',at,actor});
 }else if(command.type==='workspace.guidance'){
  const q=previewGuidanceUse(p,raw);if(raw.stamp!==q.stamp||raw.reviewed!==true)throw Error('Review the current guidance, adapted definition and source impact.');const entry=m.catalogue.find(e=>e.id===raw.entryId);for(const c of q.commands){const r=applyCanonical(p,c,at);p=r.document;selected=r.selected;}
  p.workbench.guidanceUses??=[];if(p.workbench.guidanceUses.length>=400)throw Error('Export earlier guidance adaptations before recording more than 400.');p.workbench.guidanceUses.push({id:'USE-'+crypto.randomUUID(),entry:structuredClone(entry),targetId:raw.targetId,createdId:selected,reason:text(raw.reason),adaptation:text(raw.adaptation,2400),owner:text(raw.owner,180),at,actor});
 }else if(command.type==='workspace.lifecycle'){
  const q=previewLifecyclePlan(p,raw);if(raw.reviewed!==true||raw.stamp!==q.stamp)throw Error('Review the current transition procedure and source.');for(const c of q.commands)p=applyCanonical(p,c,at).document;
  p.workbench.transitions??=[];if(p.workbench.transitions.length>=100)throw Error('Export earlier transition records before adding more than 100.');p.workbench.transitions.push({id:'TRANS-'+crypto.randomUUID(),targetId:raw.targetId,phase:raw.phase,title:text(raw.title,180),owner:text(raw.owner,180),sourceId:raw.sourceId,sourceHash:q.sourceHash,procedure:Object.fromEntries(['trigger','sequence','dataPlan','stopConditions','fallback','verification','decommission'].map(k=>[k,text(raw[k],800)])),status:'Draft operating procedure; execution evidence required',at,actor});selected=raw.targetId;
 }else if(command.type==='workspace.quality-workshop'){
  const q=previewQualityWorkshop(p,raw);if(raw.reviewed!==true||raw.stamp!==q.stamp||!text(raw.title,180)||!text(raw.participants)||!text(raw.reason))throw Error('Review the proposed priorities and record the session participants and rationale.');
  for(const c of q.commands)p=applyCanonical(p,c,at).document;p.workbench.qualitySessions??=[];if(p.workbench.qualitySessions.length>=100)throw Error('Export earlier sessions before recording more than 100.');p.workbench.qualitySessions.push({id:'QS-'+crypto.randomUUID(),title:text(raw.title,180),participants:text(raw.participants),reason:text(raw.reason),rows:raw.rows,basis:q.basis,changed:q.diff.records.map(r=>r.id),affected:q.affected,at,actor,authority:'Facilitated architecture judgement; participant names do not establish independent approval.'});
 }else if(command.type==='workspace.view'){
  if(!text(raw.title,100)||!Number.isInteger(raw.chapter)||raw.chapter<1||raw.chapter>11||!['work','model','validate','output'].includes(raw.tab))throw Error('Name the perspective and choose an existing chapter and view.');
  let exploration;
  if(raw.exploration){const baseline=raw.exploration.baselineId&&p.finalReview?.baselines.find(b=>b.id===raw.exploration.baselineId);if(raw.exploration.baselineId&&!baseline?.source)throw Error('Choose an existing frozen baseline.');const model=architectureModel(baseline?.source||p);if(raw.objectId&&!model.objects.has(raw.objectId))throw Error('Choose an existing model object.');exploration={...normalizeExploration(raw.exploration,model),modelSignature:model.signature};}
  else if(raw.objectId&&!journeyIndex(p).nodes.has(raw.objectId))throw Error('Choose an existing model object.');
  let layout;
  if(raw.layout){if(!exploration||!raw.layout.positions||typeof raw.layout.positions!=='object'||Array.isArray(raw.layout.positions)||Object.keys(raw.layout.positions).length>150)throw Error('Save a bounded layout for an existing model view.');
   const known=architectureModel(exploration.baselineId?p.finalReview.baselines.find(b=>b.id===exploration.baselineId).source:p).objects;
   const positions={};for(const [id,rect] of Object.entries(raw.layout.positions)){
    if(!known.has(id)||!rect||!['x','y','width','height'].every(k=>Number.isFinite(rect[k])&&rect[k]>=0&&rect[k]<=6000)||rect.width<64||rect.width>720||rect.height<64||rect.height>720)throw Error('A saved view layout contains an unknown object or invalid size.');
    positions[id]={x:rect.x,y:rect.y,width:rect.width,height:rect.height,pinned:rect.pinned===true};
   }layout={positions};
  }
  m.views.push({id:crypto.randomUUID(),title:text(raw.title,100),purpose:text(raw.purpose,1600),chapter:raw.chapter,tab:raw.tab,objectId:text(raw.objectId,100),domain:text(raw.domain,180),...(exploration?{exploration}:{}),...(layout?{layout}:{}),at,actor});if(m.views.length>60)m.views.shift();
 }else if(command.type==='workspace.assign'){
  if(!workQueue(p).some(f=>f.id===raw.findingId)||!text(raw.owner,180)||!text(raw.next))throw Error('Choose a current finding, accountable owner and next action.');
  const assignment={findingId:raw.findingId,owner:text(raw.owner,180),next:text(raw.next),due:text(raw.due,30),at,actor};m.assignments=m.assignments.filter(a=>a.findingId!==raw.findingId);m.assignments.push(assignment);
 }else throw Error('Unknown workspace action.');
 p.workbench.version++;return {document:p,selected};
}
export function workbenchMarkdown(p){const m=p.workbench;if(!m)return '';return '\n## Recorded comparisons and reusable guidance\n\n'+m.analyses.map(a=>`### ${a.title}\n\n${a.kind}; ${a.modelBasis===workingBasis(p)?'Current model basis':'Model changed since this analysis'}. ${a.basis}\n\n\`\`\`json\n${JSON.stringify(a.result,null,2)}\n\`\`\`\n`).join('\n')+m.alternatives.map(a=>`- Alternative ${a.title}: ${a.status}. ${a.accepted?.reason||a.disposition?.reason||a.reason}`).join('\n')+'\n\n'+(m.guidanceUses||[]).map(u=>`- Guidance ${u.entry.title} r${u.entry.revision} applied to ${u.createdId||u.targetId}: ${u.reason}. ${libraryCurrent(p,u.entry)?'Source current':'Source changed or withdrawn; review required'}.`).join('\n')+'\n'+(m.qualitySessions||[]).map(q=>`- Priority session ${q.title}: ${q.reason}. Facilitated by ${q.actor}; declared participants ${q.participants}.`).join('\n')+'\n'+m.catalogue.map(e=>`- ${e.kind}: ${e.title}, revision ${e.revision}, ${e.status}, ${libraryCurrent(p,e)?'source current':'source missing or changed'}. Owner ${e.owner}.`).join('\n')+'\n';}
