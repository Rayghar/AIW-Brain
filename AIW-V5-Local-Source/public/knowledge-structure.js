// A read-only interpretation of the existing catalogue and project releases.
// Editorial relations help ask and compare; only independently reviewed typed
// conditions can be evaluated. Neither a word match nor a catalogue rating is fit.
import {catalogue} from './catalogue-store.js';
import {catalogueMark,catalogueRelation} from './catalogue-curation.js';
import {releasedClaims,claimReceipt,withdrawn} from './knowledge-governance.js';

export const KNOWLEDGE_STRUCTURE_VERSION='aiw-knowledge-structure-1';
const list=value=>Array.isArray(value)?value:[];
const clone=value=>structuredClone(value);
const relationFields=[['complements','complement'],['conflicts','conflict'],['alternatives','alternative']];
const sourceId=record=>record.origin==='catalogue'?'catalogue:'+record.id:record.id;
const field=(record,key,index)=>record.origin==='catalogue'?record.receipt.sourcePointer+'/'+key+(index===undefined?'':'/'+index):'/claims/'+record.claimId+'/'+key+(index===undefined?'':'/'+index);
const statements=(record,key,values)=>list(values).flatMap((text,index)=>typeof text==='string'&&text.trim()?[{id:record.id+':'+key+':'+index,text,sourceField:field(record,key,index),receipt:record.receipt}]:[]);
const items=(record,key,values)=>list(values).map((value,index)=>({...clone(value),sourceField:field(record,key,index),receipt:record.receipt}));
const catalogueReceipt=(record,C)=>({kind:'catalogue-description',releaseId:C.releaseId,sourceFile:C.sourceFile,sourceHash:C.sourceSha256,manifestHash:C.manifestSha256,recordHash:record.recordSha256,sourcePointer:record.sourcePointer});

function descriptiveRecord(raw,C){
 const record={id:raw.id,conceptId:raw.id,title:raw.name,kind:raw.recordType,category:raw.category||'',applicableStages:clone(raw.applicableStages||[]),origin:'catalogue',status:'descriptive',record:raw,receipt:catalogueReceipt(raw,C)};
 record.authority={kind:raw.knowledgeAuthority?.reasoningReady?'controlled-pilot-seed':'editorial',questions:true,evaluateFit:false,scoring:false,automaticMutation:false,declared:clone(raw.knowledgeAuthority||{}),lineage:clone(raw.lineageSummary||{})};
 record.context=statements(record,'context',raw.context);
 record.conditions=statements(record,'applicabilityRules',raw.applicabilityRules);
 record.prerequisites=statements(record,'prerequisites',raw.prerequisites);
 record.exclusions=statements(record,'exclusions',raw.exclusions);
 record.risks=statements(record,'risks',raw.risks);
 record.failureModes=statements(record,'failureModes',raw.failureModes);
 record.obligations=items(record,'obligations',raw.obligations).map(item=>({...item,text:item.description||item.title,verification:item.verificationHint||'',status:'unassessed'}));
 record.componentRoles=items(record,'componentKit',raw.componentKit);
 record.interfaceRoles=items(record,'interfaceKit',raw.interfaceKit);
 // Preserve the source's qualitative statement and its conditions. Its uncalibrated
 // magnitude is deliberately absent from this interpretation and from Sol's excerpt.
 record.effects=list(raw.qualityImpacts).map((effect,index)=>({quality:effect.attributeId,direction:effect.direction,rationale:effect.rationale,conditions:clone(effect.conditions||[]),evaluated:false,sourceField:field(record,'qualityImpacts',index),receipt:record.receipt}));
 record.verificationHints=statements(record,'fitnessTests',raw.fitnessTests);
 record.counterfactual=raw.counterfactualExplanation||'';
 return record;
}

function reviewedRecord(p,hit){
 const raw=hit.claim,unit=raw.architectureUnit,record={id:'claim:'+hit.release.id+':'+raw.id,conceptId:raw.subjectId,claimId:raw.id,releaseId:hit.release.id,sourceId:raw.sourceId,title:raw.subjectId,kind:unit?.kind||raw.claimType,origin:'governed-claim',status:'reviewed',record:raw,receipt:claimReceipt(p,raw,hit.release)};
 record.authority={kind:'project-reviewed',questions:true,evaluateFit:!!unit?.applicability,scoring:false,automaticMutation:false,declared:{reviewDecision:raw.review.decision,sourceChecked:raw.review.sourceChecked,rightsChecked:raw.review.rightsChecked,conditionsChecked:raw.review.conditionsChecked}};
 record.conditions=statements(record,'conditions',raw.conditions);
 record.prerequisites=[];record.context=[];
 record.limitations=statements(record,'limitations',raw.limitations);
 record.exclusions=statements(record,'architectureUnit/exclusions',unit?.exclusions);
 record.obligations=items(record,'architectureUnit/obligations',unit?.obligations).map((item,index)=>({...item,id:record.id+':obligation:'+index,text:item.action,verification:item.evidence,status:'unassessed'}));
 record.effects=items(record,'architectureUnit/effects',unit?.effects).map(item=>({...item,evaluated:false}));
 record.componentRoles=[];record.interfaceRoles=[];record.verificationHints=[];
 record.risks=raw.claimType==='risk'?[{id:record.id+':risk',text:raw.statement,sourceField:field(record,'statement'),receipt:record.receipt}]:[];record.failureModes=[];
 record.scope=clone(unit?.scope||{});record.mechanism=unit?.mechanism||raw.statement;
 if(unit?.applicability)record.applicability=clone(unit.applicability);
 if(unit?.placement)record.placement=clone(unit.placement);
 return record;
}

function seedReviewLead(raw,C,all){
 const receipt={kind:'repository-seed',releaseId:C.releaseId,sourceFile:C.knowledgeObjects.sourceFile,sourceHash:C.knowledgeObjects.sourceSha256,manifestHash:C.manifestSha256,objectHash:raw.objectSha256,sourcePointer:raw.sourcePointer};
 const statements=key=>list(raw[key]).map((text,index)=>({text,sourceField:raw.sourcePointer+'/'+key+'/'+index,receipt}));
 return {id:raw.objectId,claimId:raw.claimId,subjectId:raw.subjectId,title:raw.subjectName||raw.subjectId,kind:raw.claimType,origin:'repository-seed',status:'discovery-only',
  statement:raw.statement,polarity:raw.polarity,conditions:statements('conditions'),limitations:statements('limitations'),contextTags:clone(raw.contextTags||[]),
  provenance:clone(raw.provenance),receipt,
  linkedDnaIds:all.filter(r=>r.id===raw.subjectId||list(r.lineageSummary?.claimIds).includes(raw.claimId)).map(r=>r.id),
  authority:{kind:'controlled-pilot-seed',discovery:true,questions:false,evaluateFit:false,scoring:false,automaticMutation:false,declared:clone(raw.authority)},
  acquisition:{connectorId:raw.provenance?.connectorId||'',repository:raw.provenance?.repository||'',path:raw.provenance?.path||'',immutableRevision:null,passageHash:null},
  limitation:'The archive records a seed assertion, not a retrieved original at an immutable revision. Resolve and retrieve its source, check reuse rights and independently review its conditions before any project release.'};
}

// Omit conceptIds to inspect the loaded supply; pass exact ids to obtain those
// subjects and, optionally, their explicitly declared one-hop relations. This
// function does no lexical retrieval and never walks neighbouring project intent.
export function knowledgeStructures(p={}, {conceptIds=null,includeRelated=true}={}){
 const C=catalogue(),all=list(C.records),byId=new Map(all.map(r=>[r.id,r])),anchors=conceptIds===null?null:new Set(list(conceptIds).filter(id=>typeof id==='string')),wanted=anchors?new Set(anchors):null;
 if(wanted&&includeRelated)for(const id of [...wanted])for(const [key] of relationFields)for(const target of list(byId.get(id)?.[key]))wanted.add(target);
 const selected=id=>!wanted||wanted.has(id),records=[],unavailable=[],relations=[],states=new Map();
 const releaseWithdrawn=withdrawn(p,[C.releaseId]).length>0;
 for(const raw of all){
  const mark=catalogueMark(raw),revoked=releaseWithdrawn||withdrawn(p,[raw.id]).length>0;
  states.set(raw.id,revoked?'withdrawn':mark?'marked':'available');
  if(!selected(raw.id))continue;
  if(revoked||mark){unavailable.push({id:raw.id,conceptId:raw.id,title:raw.name,state:revoked?'withdrawn':'marked',reason:revoked?'The catalogue release or record has been withdrawn.':mark.why,receipt:catalogueReceipt(raw,C)});continue;}
  records.push(descriptiveRecord(raw,C));
 }
 for(const record of records){
  if(anchors&&!anchors.has(record.id))continue;
  for(const [key,kind] of relationFields)for(const [index,to] of list(record.record[key]).entries()){
   const target=catalogueRelation(to,C),state=states.get(to)||(target?.stub?'stub':'unavailable');
   relations.push({from:record.id,to,kind,sourceField:field(record,key,index),receipt:record.receipt,targetState:state,authority:'editorial',evaluated:false});
   if(selected(to)&&!byId.has(to)&&!unavailable.some(x=>x.id===to))unavailable.push({id:to,conceptId:to,title:target?.name||to,state,reason:'The archive names this relationship target but contains no record for it.',namedBy:record.id});
  }
 }
 for(const hit of releasedClaims(p)){
  if(!selected(hit.claim.subjectId)&&!selected('claim:'+hit.release.id+':'+hit.claim.id))continue;
  if(!hit.eligible){unavailable.push({id:'claim:'+hit.release.id+':'+hit.claim.id,conceptId:hit.claim.subjectId,claimId:hit.claim.id,releaseId:hit.release.id,title:hit.claim.subjectId,state:'ineligible',reason:hit.reasons.join(' ')});continue;}
  records.push(reviewedRecord(p,hit));
 }
 // Atomic seeds have useful conditions and exact archive provenance, but their
 // original source revisions and passage hashes are not immutable. Keep them in
 // the existing discovery lifecycle, outside the records used by reasoning.
 const reviewLeads=[];
 for(const raw of list(C.knowledgeObjects?.seedLeads)){
  const lead=seedReviewLead(raw,C,all);
  if(wanted&&!selected(lead.id)&&!selected(lead.claimId)&&!selected(lead.subjectId)&&!lead.linkedDnaIds.some(selected))continue;
  if(releaseWithdrawn||withdrawn(p,[lead.id,lead.claimId,lead.subjectId]).length){unavailable.push({id:lead.id,conceptId:lead.subjectId,title:lead.title,state:'withdrawn',reason:'This archive release or subject was withdrawn.',receipt:lead.receipt});continue;}
  reviewLeads.push(lead);
 }
 for(const record of records)if(record.origin==='catalogue')record.reviewLeadIds=reviewLeads.filter(lead=>lead.linkedDnaIds.includes(record.id)).map(lead=>lead.id);
 const counts=C.knowledgeObjects?.coverage||{};
 const coverage={dnaRecords:all.length,availableDnaRecords:records.filter(r=>r.origin==='catalogue').length,totalKnowledgeObjects:counts.total||0,duplicateDnaProjections:counts.dnaProjections||0,editorialLineageClaims:counts.editorialLineageClaims||0,atomicSeedLeads:counts.atomicSeedLeads||0,availableReviewLeads:reviewLeads.length,posture:C.knowledgeObjects?.posture||'The catalogue has not loaded.'};
 return {version:KNOWLEDGE_STRUCTURE_VERSION,catalogueLoaded:C.loaded!==false,releaseId:C.releaseId,records,relations,reviewLeads,coverage,unavailable};
}

// Compatible with brainSourceCurrent without importing the Brain and its graph.
// Source passages and reviewed interpretations remain distinguishable; catalogue
// excerpts contain no numerical ratings, executable rules or invented evidence.
export function knowledgeStructureSource(record){
 if(!record?.receipt||!record.authority?.questions)return null;
 if(record.origin==='governed-claim'){
  const claim=record.record;
  return {id:sourceId(record),kind:'governed-claim',objectId:record.claimId,title:record.title+' · '+record.kind,posture:'Independently reviewed conditional interpretation; project applicability and verification remain to be established.',receipt:clone(record.receipt),excerpt:JSON.stringify({statement:claim.statement,conditions:claim.conditions,limitations:claim.limitations,architectureUnit:claim.architectureUnit||null,sourcePassage:claim.excerpt,sourceLines:[claim.lineStart,claim.lineEnd],authority:'Reviewed interpretation, not a measured outcome or automatic recommendation'}),truncated:false};
 }
 if(record.origin!=='catalogue')return null;
 let truncated=false;
 const bounded=(value,depth=0)=>{
  if(typeof value==='string'){if(value.length>480)truncated=true;return value.slice(0,480);}
  if(Array.isArray(value)){if(value.length>3)truncated=true;return value.slice(0,3).map(v=>bounded(v,depth+1));}
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['receipt','magnitude','sourceField','record'].includes(key)).map(([key,v])=>[key,depth<4?bounded(v,depth+1):typeof v==='string'?bounded(v,depth+1):null]));
  return value;
 };
 const raw=record.record,content=bounded({name:record.title,kind:record.kind,category:record.category,applicableStages:record.applicableStages,problem:raw.problem,context:raw.context,prerequisites:raw.prerequisites,applicabilityRules:raw.applicabilityRules,exclusions:raw.exclusions,qualityConsiderations:record.effects,obligations:raw.obligations,verificationHints:raw.fitnessTests,componentKit:raw.componentKit,interfaceKit:raw.interfaceKit,alternatives:raw.alternatives,complements:raw.complements,conflicts:raw.conflicts,counterfactual:raw.counterfactualExplanation});
 // Relation identifiers are exact source evidence for the derived relationship
 // reading. Keep their complete short lists even when narrative arrays are cut.
 for(const [key] of relationFields)content[key]=clone(raw[key]||[]);
 const posture='Editorial Pattern DNA for questions and comparison; its relations, roles and quality considerations do not establish project fit, an executable rule or a verified outcome.';
 let excerpt=JSON.stringify({authority:posture,...content});
 if(excerpt.length>6500){truncated=true;for(const key of ['context','componentKit','interfaceKit','qualityConsiderations'])if(Array.isArray(content[key]))content[key]=content[key].slice(0,1);excerpt=JSON.stringify({authority:posture,...content});}
 return {id:sourceId(record),kind:'catalogue-description',objectId:record.id,title:record.title,posture,receipt:clone(record.receipt),excerpt,truncated};
}

export const catalogueStructureSource=raw=>knowledgeStructureSource(descriptiveRecord(raw,catalogue()));
