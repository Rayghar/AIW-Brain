import {captureReversal,applyReversal} from './model-reversal.js';
import {interactionContext} from './architecture-knowledge.js';
import {previewDesignAlternative,designPreviewStamp} from './design-planner.js';
import {designTask,designBasis} from './design-task-state.js';
import {modelImpactSource,modelEditSnapshot,modelImpactStamp,previewModelChange,rebaseModelChange,trackModelChange,modelLinkedItems,modelFindingDelta} from './model-impact.js';
import {changeFingerprint,changeTargetStamp,withChanges} from './changes-domain.js';
import {modelAlternative,modelAlternatives,withModelAlternatives} from './model-alternatives-state.js';
import {reviewGeneration} from './aiw-brain.js';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export const modelCommandKey=c=>c.type+':'+c.payload?.id;
export const bundleStamp=(p,commands)=>changeFingerprint([modelImpactStamp(p,commands[0]),commands]);
export function previewModelBundle(input,commands,at=new Date().toISOString()){
 if(!Array.isArray(commands)||!commands.length||commands.length>12)throw Error('A proposal must contain between 1 and 12 existing model records.');
 const keys=new Set(),steps=[];let document=input;
 for(const c of commands){const key=modelCommandKey(c);if(keys.has(key))throw Error('Edit each proposed record once in the combined change.');keys.add(key);if(!modelImpactSource(input,c))throw Error('Coordinated alternatives support existing records in Chapters 4–7.');const q=previewModelChange(document,c,at);steps.push(q);document=q.document;}
 const changes=steps.map(q=>({command:q.command,source:q.source,before:modelEditSnapshot(input,q.command),after:modelEditSnapshot(document,q.command),fields:q.fields,signals:q.signals}));
 const linked=new Map();for(const c of changes)for(const item of modelLinkedItems(input,document,c.source)){const old=linked.get(item.key);if(old){old.via=[...new Set([...old.via,...item.via])];old.causes.push(c.source.ref);old.why+=' '+item.why;}else linked.set(item.key,{...item,causes:[c.source.ref]});}
 const items=[...linked.values()].sort((a,b)=>a.chapter-b.chapter||a.ref.localeCompare(b.ref)).map(i=>({...i,capturedStamp:changeTargetStamp(document,i)}));
 return {commands:changes.map(c=>c.command),changes,source:changes[0].source,command:changes[0].command,before:changes[0].before,after:changes[0].after,fields:changes.flatMap(c=>c.fields.map(f=>({...f,source:c.source}))),items,findings:modelFindingDelta(input,document),signals:changes.flatMap(c=>c.signals.map(s=>({...s,title:c.source.ref+' · '+s.title}))),stamp:bundleStamp(input,commands),document,selected:changes[0].source.id};
}
export function rebaseModelBundle(p,changes){
 const commands=[],conflicts=[],satisfied=[];
 for(const change of changes){const rebased=rebaseModelChange(p,change);const snapshot=modelEditSnapshot(p,rebased.command),proposed={...rebased.command.payload};delete proposed.id;
  if(same(snapshot,proposed)){satisfied.push(change.source);continue;}
  commands.push(rebased.command);conflicts.push(...rebased.conflicts.map(c=>({...c,source:change.source,label:change.source.ref+' · '+c.label})));
 }
 return {commands,conflicts,satisfied};
}
export function previewAlternative(p,alternative){
 if(!alternative)throw Error('Choose a saved alternative.');
 if(alternative.kind==='design')return previewDesignAlternative(p,alternative);
 const rebased=rebaseModelBundle(p,alternative.changes);
 if(!rebased.commands.length)return {...rebased,document:p,changes:[],fields:[],items:[],findings:{introduced:[],resolved:[],existing:0},signals:[]};
 return {...previewModelBundle(p,rebased.commands),...rebased};
}
export function compareModelAlternatives(p,left,right){
 if(!left||!right||left.id===right.id)throw Error('Choose two different saved alternatives.');
 const captured=x=>x.kind==='design'&&designTask(p,x.taskId)?.status==='applied';
 const retained=captured(left)||captured(right),get=x=>captured(x)?{document:p,commands:[],changes:x.changes,fields:x.changes.flatMap(c=>c.fields||[]),items:[],findings:{introduced:[],resolved:[],existing:0},signals:[],conflicts:[],satisfied:[]}:previewAlternative(p,x);
 const a=get(left),b=get(right);
 if(left.kind==='design'||right.kind==='design'){
  const key=c=>c.source.slot||modelCommandKey(c.command),x=new Map(a.changes.map(c=>[key(c),c])),y=new Map(b.changes.map(c=>[key(c),c]));
  const records=[...new Set([...x.keys(),...y.keys()])].map(k=>{const l=x.get(k),r=y.get(k),lv=l?{...l.after,connections:l.fields?.find(f=>f.key==='connections')?.after}:null,rv=r?{...r.after,connections:r.fields?.find(f=>f.key==='connections')?.after}:null;return {source:(l||r).source,fields:[...new Set([...Object.keys(lv||{}),...Object.keys(rv||{})])].filter(f=>!same(lv?.[f],rv?.[f])).map(key=>({key,left:lv?.[key],right:rv?.[key]}))};}).filter(r=>r.fields.length);
  return {left:{alternative:left,...a},right:{alternative:right,...b},records,retained};
 }
 const targets=new Map([...left.changes,...right.changes].map(c=>[modelCommandKey(c.command),c]));
 const records=[...targets.values()].map(c=>{const x=modelEditSnapshot(a.document,c.command),y=modelEditSnapshot(b.document,c.command);return {source:c.source,fields:[...new Set([...Object.keys(x||{}),...Object.keys(y||{})])].filter(k=>!same(x?.[k],y?.[k])).map(key=>({key,left:x?.[key],right:y?.[key]}))};}).filter(r=>r.fields.length);
 return {left:{alternative:left,...a},right:{alternative:right,...b},records,retained};
}
function requireAlternative(p,raw){const a=modelAlternative(p,raw.id);if(!a)throw Error('This saved alternative is unavailable.');if(a.revision!==raw.alternativeRevision)throw Error('The saved alternative changed. Reopen it before updating or applying.');if(a.status!=='draft')throw Error('This alternative is retained as '+a.status+'. Create a new alternative to continue exploring.');return a;}
function canonicalChanges(q){return q.changes.map(({command,source,before,after,fields})=>({command,source,before,after,...(q.designTaskId?{fields}: {})}));}
export function applyAlternativeCommand(input,command,at=new Date().toISOString()){
 if(command.type==='alternative.rollback')return applyReversal(input,command.payload||{},at);
 const raw=command.payload||{};let p=withModelAlternatives(structuredClone(input)),m=p.modelAlternatives;
 if(command.type==='alternative.archive'){
  const a=requireAlternative(p,raw),reason=text(raw.reason,4000);if(!reason)throw Error('Record why this alternative is being set aside.');a.status='archived';a.archived={at,reason};a.updatedAt=at;a.revision++;a.history.push({at,event:'Set aside',note:reason});return {document:p,selected:a.id};
 }
 if(!['alternative.save','alternative.apply'].includes(command.type))throw Error('Unknown alternative action.');
 if(raw.id&&modelAlternative(p,raw.id)?.kind==='design')return applyDesignAlternative(p,command,at);
 if(raw.previewStamp!==bundleStamp(p,raw.commands||[]))throw Error('The model or proposal changed. Refresh the combined preview first.');
 const q=previewModelBundle(p,raw.commands,at);let a=raw.id?requireAlternative(p,raw):null;
 if(command.type==='alternative.save'){
  const name=text(raw.name,160),rationale=text(raw.rationale,4000);if(!name||!rationale)throw Error('Name the alternative and record the reasoning behind it.');
  if(modelAlternatives(p).some(x=>x.id!==a?.id&&x.status!=='archived'&&x.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('Use a distinct alternative name so comparisons stay clear.');
  if(!a){if(m.records.length>=60)throw Error('This project has reached its saved-alternative limit.');a={id:'ALT-'+String(++m.counter).padStart(3,'0'),revision:0,createdAt:at,status:'draft',history:[]};m.records.push(a);}
  a.name=name;a.rationale=rationale;a.changes=canonicalChanges(q);a.revision++;a.updatedAt=at;a.history.push({at,event:a.revision===1?'Saved draft':'Updated draft',note:rationale,revision:a.revision,changes:structuredClone(a.changes)});
  return {document:p,selected:a.id};
 }
 const reviewer=text(raw.reviewer,180),reason=text(raw.reason,4000);if(raw.reviewed!==true||!reviewer||!reason)throw Error('Review the whole proposal, name the reviewer and record why it is accepted.');
 p=q.document;withModelAlternatives(p);a=raw.id?modelAlternative(p,raw.id):null;
 const changeIds=[];
 for(const c of q.changes){trackModelChange(input,p,{type:'model.apply-impact',payload:{command:c.command}},at);const event=p.changes.events.at(-1);event.proposal={alternativeId:a?.id||null,name:a?.name||'Coordinated model change',reviewer,reason,recordCount:q.changes.length};changeIds.push(event.id);}
 if(a){a.changes=canonicalChanges(q);a.status='applied';a.revision++;a.updatedAt=at;a.applied={at,reviewer,reason,changeIds};a.history.push({at,event:'Applied working design',note:reason,reviewer,changeIds,revision:a.revision});}
 return {document:p,selected:q.selected,changeIds};
}

function applyDesignAlternative(input,command,at){
 const raw=command.payload||{},a=requireAlternative(input,raw);
 if(raw.previewStamp!==designPreviewStamp(input,a))throw Error('The model or design proposal changed. Refresh the preview first.');
 const q=previewDesignAlternative(input,a,at);
 if(q.appliedTask)throw Error('This task already has an accepted design. Start a new task to continue.');
 if(command.type==='alternative.save'){
  const name=text(raw.name,160),rationale=text(raw.rationale,4000);if(!name||!rationale)throw Error('Name the alternative and record its reasoning.');
  if(modelAlternatives(input).some(x=>x.id!==a.id&&x.status!=='archived'&&x.name.toLowerCase()===name.toLowerCase()))throw Error('Use a distinct alternative name.');
  a.name=name;a.rationale=rationale;a.changes=canonicalChanges(q);a.revision++;a.updatedAt=at;a.history.push({at,event:'Updated design reasoning',note:rationale,revision:a.revision});return {document:input,selected:a.id};
 }
 const reviewer=text(raw.reviewer,180),reason=text(raw.reason,4000);
 if(raw.reviewed!==true||!reviewer||!reason)throw Error('Review every new and reused record, name the reviewer and record the acceptance rationale.');
 const p=q.document,accepted=modelAlternative(p,a.id),t=designTask(p,a.taskId);withChanges(p);const changeIds=[];
 for(const c of q.changes.filter(c=>c.fields.length)){
  const id='CHG-'+String(++p.changes.counter).padStart(3,'0');changeIds.push(id);
  p.changes.events.push({id,source:c.source,title:c.source.title,at,before:c.source.isNew?null:c.before,after:c.after,fields:c.fields,items:q.items.filter(i=>i.id!==c.source.id).map(i=>({...i,reviews:[]})),preview:{reviewed:true,findings:q.findings,signals:q.signals},proposal:{alternativeId:a.id,taskId:t.id,name:a.name,reviewer,reason,recordCount:q.changes.length}});
 }
 accepted.changes=canonicalChanges(q);accepted.status='applied';accepted.revision++;accepted.updatedAt=at;accepted.applied={at,reviewer,reason,changeIds,previewStamp:q.stamp,reversal:captureReversal(input,p)};accepted.history.push({at,event:'Applied working design',note:reason,reviewer,changeIds,revision:accepted.revision});
 t.status='applied';t.revision++;t.updatedAt=at;t.applied={at,alternativeId:a.id,reviewer,reason,changeIds,records:q.changes.map(c=>c.source)};t.history.push({at,event:'Accepted '+a.id,note:reason,reviewer,changeIds});if(t.generation)reviewGeneration(p,t.generation);if(t.kind==='exchange')t.sourceReview={at,basis:designBasis(p,t.requirementId,t.basis.contractId),reviewer,reason:'Accepted the reviewed contract and payload. '+reason};
 if(t.kind==='architecture'){
  t.applied.decisionId=q.decisionId;t.applied.reasoningGraph=structuredClone(a.reasoningGraph);t.applied.methodReceipt=structuredClone(a.methodReceipt);
  // Pin every newly created role, not only persistence objects, so a later
  // component, data or support edit invalidates its accepted reasoning.
  t.applied.designAnswers=structuredClone(t.answers);
  const roles=['caller','processor','secondary','queue','store','relay','consumer','router','cache','recovery'];
  for(const slot of roles){const record=q.changes.find(c=>c.source.slot===slot);if(record)t.answers[slot+'Id']=record.source.id;}
  if(t.topic==='structure'&&a.design.approach==='layered-module')t.answers.secondaryId=t.answers.processorId;
  for(const [key,slot] of [['dataId','authoritative data'],['boundaryId','trust boundary'],...(t.topic==='persistence'?[['capabilityId','transactional support'],['backupCapabilityId','backup support'],['recoveryCapabilityId','recovery support']]:[])]){const record=q.changes.find(c=>c.source.slot===slot);if(record)t.answers[key]=record.source.id;}
  if(t.answers.compositionTopic)for(const category of ['compute','transactional','messaging','connectivity','observability','backup','recovery']){const record=q.changes.find(c=>c.source.slot===category+' support');if(record)t.answers['support_'+category+'Id']=record.source.id;}
  t.sourceReview={at,basis:designBasis(p,t.requirementId),reviewer,reason:'Accepted the reviewed architecture design. '+reason};t.architectureBasis=interactionContext(p,t.answers);
 }
 if(t.kind==='security')t.sourceReview={at,basis:designBasis(p,t.requirementId,undefined,undefined,{...t.basis.securityIds,controlId:q.selected}),reviewer,reason:'Accepted the reviewed threat and control design. '+reason};
 for(const other of modelAlternatives(p).filter(x=>x.taskId===t.id&&x.id!==a.id&&x.status==='draft')){other.status='archived';other.revision++;other.updatedAt=at;other.archived={at,reason:'Alternative '+a.id+' was accepted. '+reason};other.history.push({at,event:'Not selected',note:other.archived.reason});t.considerations.push({at,approach:other.design.approach,outcome:'Not selected',reason,alternativeId:other.id});}
 if(p.finalReview){p.finalReview.version++;p.finalReview.checks=null;p.finalReview.handoff=null;}
 return {document:p,selected:q.selected,changeIds};
}
