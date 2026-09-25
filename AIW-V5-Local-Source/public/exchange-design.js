import {applyInterfacesCommand,interfaceSources,participant,FIELD_TYPES,CLASSIFICATIONS} from './interfaces-domain.js';
import {interfaceSnapshot,interfaceDifferences,interfaceLinkedItems,interfaceFindingDelta} from './interface-impact.js';
import {designTask,designTasks,withDesignTasks,designBasis,designBasisCurrent} from './design-task-state.js';
import {modelAlternative,modelAlternatives,withModelAlternatives} from './model-alternatives-state.js';
import {changeFingerprint} from './changes-domain.js';

const copy=x=>structuredClone(x),text=(v,n=2400)=>typeof v==='string'?v.trim().slice(0,n):'';
export const EXCHANGE_STEPS=[
 {title:'Complete the exchange agreement',why:'The participants and interaction style come from the saved design.',fields:['title','purpose','owner','protocol','operation','contractVersion','evidence']},
 {title:'Define the information and its authority',why:'Reuse the data dictionary where the meaning and authoritative owner already match.',fields:['reuseDataId','dataTitle','dataPurpose','dataOwner','authorityId','classification','keyName','keyType','keyMeaning','protection','retentionPolicy']},
 {title:'Make repetition and uncertainty explicit',why:'Specify what both participants must do when delivery repeats or the outcome is unknown.',fields:['correlationKey','idempotencyKey','duplicatePolicy','timeoutPolicy','retryPolicy','failurePolicy']},
 {title:'Record protection and compatibility',why:'Keep access, version evolution, assumptions and the design rationale together.',fields:['authorization','transport','compatibility','assumptions','rationale']}
];
export const EXCHANGE_LABELS={title:'Contract name',purpose:'Purpose and expected outcome',owner:'Accountable contract owner',protocol:'Protocol / exchange format',operation:'Operation, endpoint or topic',contractVersion:'Contract version',evidence:'Source or provider / consumer agreement reference',reuseDataId:'Payload data definition',dataTitle:'Data definition name',dataPurpose:'Business meaning',dataOwner:'Accountable data owner',authorityId:'Authoritative system',classification:'Classification',keyName:'Stable key field',keyType:'Key type',keyMeaning:'Meaning and uniqueness of the key',protection:'Access, storage and masking obligations',retentionPolicy:'Retention, deletion and legal-hold policy',correlationKey:'Correlation key field',idempotencyKey:'Repeat / idempotency key field',duplicatePolicy:'Repeated delivery policy',timeoutPolicy:'Missing or late acknowledgement',retryPolicy:'Retry, enquiry or redelivery policy',failurePolicy:'Rejection and failure response',authorization:'Caller authority and access enforcement',transport:'Transport protection',compatibility:'Versioning and compatibility policy',assumptions:'Open questions and assumptions',rationale:'Why this contract and payload fit the required outcome'};
const contractKeys=['title','purpose','owner','protocol','operation','contractVersion','evidence','correlationKey','idempotencyKey','duplicatePolicy','timeoutPolicy','retryPolicy','failurePolicy','authorization','transport','compatibility','assumptions'];
export const exchangeAnswers=raw=>Object.fromEntries(EXCHANGE_STEPS.flatMap(s=>s.fields).map(k=>[k,text(raw?.[k],['title','dataTitle'].includes(k)?160:2400)]));
export const exchangeTasks=p=>designTasks(p).filter(t=>t.kind==='exchange');
export const exchangeStamp=(p,a)=>changeFingerprint([p.contentVersion,...['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime'].map(k=>p[k]?.version),a.design,a.designBasis,a.revision]);
export function exchangeMissing(p,answers){const optional=['assumptions','idempotencyKey'],hidden=answers.reuseDataId?EXCHANGE_STEPS[1].fields.filter(k=>k!=='reuseDataId'):['reuseDataId'];return EXCHANGE_STEPS.map((s,i)=>({step:i,fields:s.fields.filter(k=>!optional.includes(k)&&!hidden.includes(k)&&!answers[k])})).filter(s=>s.fields.length);}
export function previewExchange(input,alternative,at=new Date().toISOString()){
 const task=designTask(input,alternative.taskId);if(!task||task.kind!=='exchange')throw Error('The exchange task is unavailable.');
 if(task.status==='applied')return {document:input,commands:[],changes:[],fields:[],items:[],findings:{introduced:[],resolved:[],existing:0},signals:[],conflicts:[],satisfied:[],appliedTask:true};
 if(!designBasisCurrent(input,{...task,basis:alternative.designBasis,sourceReview:null}))throw Error('The source contract, participants or requirements changed. Review the source in Sol first.');
 const answers=exchangeAnswers(alternative.design.answers),missing=exchangeMissing(input,answers);if(missing.length)throw Error('Complete '+missing[0].fields.map(k=>EXCHANGE_LABELS[k]).join(', ')+'.');
 let p=copy(input),dataId=answers.reuseDataId,oldData=p.interfaces.data.find(d=>d.id===dataId);const contractId=alternative.designBasis.contractId,c=p.interfaces.contracts.find(c=>c.id===contractId);
 if(dataId&&!oldData)throw Error('The selected data definition was removed. Choose a current dictionary entry.');
 const run=(type,payload)=>{const r=applyInterfacesCommand(p,{type,payload},at);p=r.document;return r.selected;};
 if(!dataId){
  if(p.interfaces.data.some(d=>d.title.toLowerCase()===answers.dataTitle.toLowerCase()))throw Error('A data definition with this name exists. Reuse it or choose a distinct name.');
  if(!participant(p,answers.authorityId)||!CLASSIFICATIONS.includes(answers.classification)||answers.classification==='Unclassified')throw Error('Choose the data authority and an explicit classification.');
  if(!FIELD_TYPES.includes(answers.keyType))throw Error('Choose a supported key type.');
  dataId=run('interfaces.data',{title:answers.dataTitle,purpose:answers.dataPurpose,owner:answers.dataOwner,authorityId:answers.authorityId,classification:answers.classification,protection:answers.protection,retentionPolicy:answers.retentionPolicy,evidence:answers.evidence,assumptions:answers.assumptions,origin:'suggestion',retentionDays:'',retentionConfirmed:false,assumptionsResolved:false});
  run('interfaces.field',{id:dataId,field:{name:answers.keyName,type:answers.keyType,description:answers.keyMeaning,required:true,key:true,classification:'Inherited',example:'',enumeration:'',constraints:''}});
 }
 const exchanges=copy(c.exchanges).map(x=>({dataId:x.dataId,role:x.role}));if(!exchanges.some(x=>x.dataId===dataId&&x.role==='request'))exchanges.push({dataId,role:'request'});
 const fields=exchanges.filter(x=>x.role==='request').flatMap(x=>p.interfaces.data.find(d=>d.id===x.dataId).fields);
 for(const key of ['correlationKey','idempotencyKey'])if(answers[key]&&!fields.some(f=>f.name===answers[key]))throw Error(EXCHANGE_LABELS[key]+' must exist in the request or published dictionary.');
 const names=new Map();for(const f of fields){const old=names.get(f.name);if(old&&JSON.stringify([old.type,old.required,old.enumeration])!==JSON.stringify([f.type,f.required,f.enumeration]))throw Error('Payload dictionaries disagree about '+f.name+'. Resolve the schema conflict before previewing.');names.set(f.name,f);}
 run('interfaces.contract',{...c,...Object.fromEntries(contractKeys.map(k=>[k,answers[k]])),id:contractId,exchanges,timeoutMs:c.timeoutMs,timeoutBasis:c.timeoutBasis,timeoutConfirmed:c.timeoutConfirmed,assumptionsResolved:false});
 const changes=[['contract',contractId,'contract'],['data',dataId,'data']].map(([slot,id,kind])=>{const r=kind==='contract'?p.interfaces.contracts.find(c=>c.id===id):p.interfaces.data.find(d=>d.id===id),source={chapter:8,id,ref:r.ref,title:r.title,kind,slot,isNew:kind==='data'&&!oldData},before=interfaceSnapshot(input,source)||{},after=interfaceSnapshot(p,source);return {command:{type:'interfaces.'+kind,payload:{id}},source,before,after,fields:interfaceDifferences(before,after),signals:[]};});
 const items=[...new Map(changes.flatMap(c=>interfaceLinkedItems(input,p,c.source)).map(i=>[i.key,i])).values()],findings=interfaceFindingDelta(input,p),signals=[{title:'Contract and dictionary are a working agreement',detail:'Provider/consumer agreement, complete schema coverage, sample checks, security enforcement and operational evidence remain separate.'},{title:oldData?'Existing dictionary reused':'New dictionary starts with its declared stable key',detail:oldData?'The authoritative definition and its fields are unchanged. Review its meaning for this exchange.':'Add further business fields through the existing dictionary editor. A stable key alone is not a complete business payload.'}];
 return {document:p,commands:changes.map(c=>c.command),changes,source:changes[0].source,command:changes[0].command,before:changes[0].before,after:changes[0].after,fields:changes.flatMap(c=>c.fields.map(f=>({...f,source:c.source}))),items,findings,signals,stamp:exchangeStamp(input,alternative),selected:contractId,designTaskId:task.id,designAlternativeId:alternative.id,previewChapters:[8],conflicts:[],satisfied:[],hasChanges:true};
}
export function applyExchangeTask(input,command,at=new Date().toISOString()){
 const p=withDesignTasks(copy(input)),raw=command.payload||{};let task;
 if(command.type==='exchange.start'){
  const c=p.interfaces.contracts.find(c=>c.id===raw.contractId);if(!c)throw Error('Choose an inherited or saved contract.');
  const sources=interfaceSources(p,c);if(!sources.requirements.some(r=>r.id===raw.requirementId))throw Error('Choose a requirement traced through this contract’s participants.');
  if(designTasks(p).length>=60)throw Error('This project has reached its guided-task limit.');const basis=designBasis(p,raw.requirementId,c.id),existing=c.exchanges.find(x=>x.role==='request');
  task={id:'DES-'+String(++p.coauthoring.counters.design).padStart(3,'0'),kind:'exchange',revision:1,title:c.title,requirementId:raw.requirementId,basis,initialBasis:copy(basis),status:'questions',createdAt:at,updatedAt:at,answers:exchangeAnswers({...c,reuseDataId:existing?.dataId||'',keyType:'string'}),alternativeIds:[],considerations:[],history:[{at,event:'Started from '+c.ref,basis:copy(basis)}]};p.coauthoring.designTasks.push(task);return {document:p,selected:task.id};
 }
 task=designTask(p,raw.id);if(!task||task.kind!=='exchange')throw Error('Choose an exchange task.');if(task.revision!==raw.taskRevision)throw Error('This task changed. Reopen it before saving your preserved input.');if(['applied','dismissed'].includes(task.status))throw Error('This task has an accepted design. Start another task for further changes.');
 if(!designBasisCurrent(p,task))throw Error('The source contract or its context changed. Review it in Sol before continuing.');
 if(command.type==='exchange.answers'){
  const answers=exchangeAnswers({...task.answers,...raw.answers});if(JSON.stringify(answers)!==JSON.stringify(task.answers)){task.history.push({at,event:'Saved exchange answers',answers:copy(answers)});task.answers=answers;task.basis=designBasis(p,task.requirementId,task.basis.contractId,answers.reuseDataId||undefined);for(const a of modelAlternatives(p).filter(a=>a.taskId===task.id&&a.status==='draft')){a.status='archived';a.revision++;a.archived={at,reason:'Exchange answers revised; earlier proposal retained.'};a.history.push({at,event:'Set aside',note:a.archived.reason});}task.alternativeIds=[];task.status='questions';}
 }else if(command.type==='exchange.prepare'){
  withModelAlternatives(p);if(!task.alternativeIds.some(id=>modelAlternative(p,id)?.status==='draft')){if(p.modelAlternatives.records.length>=60)throw Error('This project has reached its saved-alternative limit.');
   const a={id:'ALT-'+String(++p.modelAlternatives.counter).padStart(3,'0'),kind:'design',taskId:task.id,status:'draft',revision:1,name:task.id+' · '+task.answers.title,rationale:task.answers.rationale,createdAt:at,updatedAt:at,design:{family:'exchange',approach:'contract-and-payload',answers:copy(task.answers)},designBasis:copy(task.basis),designAnswers:copy(task.answers),changes:[],history:[]},q=previewExchange(p,a,at);a.changes=copy(q.changes);a.history.push({at,event:'Prepared contract and payload',note:a.rationale,changes:copy(q.changes)});p.modelAlternatives.records.push(a);task.alternativeIds=[a.id];task.history.push({at,event:'Prepared '+a.id,note:a.rationale});
  }task.status='proposed';
 }else throw Error('Choose a supported exchange task action.');
 task.revision++;task.updatedAt=at;return {document:p,selected:task.id};
}
