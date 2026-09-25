import {BRAIN_CATALOGUE,knowledgeState,knowledgeEligibility,releasedClaims,withdrawn,claimReceiptCurrent} from './knowledge-governance.js';
import {sha256} from './brain-integrity.js';
import {organizationEntryCurrent} from './organization-knowledge.js';

// A read-only projection of exact project evidence and the descriptive AKR
// catalogue. No graph edge grants a claim authority or changes a design.
export function knowledgeGraph(project){
 const state=knowledgeState(project),nodes=[],edges=[],known=new Set(),seen=new Set(),catalogueIds=new Set(BRAIN_CATALOGUE.records.map(r=>r.id));
 const add=(id,kind,title,status,detail={},authority='discovery')=>{if(known.has(id))return;known.add(id);nodes.push({id,kind,title,status,authority,...detail});};
 const connect=(from,to,kind,status='recorded')=>{if(!known.has(from)||!known.has(to))return;const key=[from,to,kind].join('|');if(seen.has(key))return;seen.add(key);edges.push({from,to,kind,status});};
 for(const record of BRAIN_CATALOGUE.records)add('concept:'+record.id,'concept',record.name,'descriptive',{conceptId:record.id,recordType:record.recordType,summary:record.summary||record.problem,hash:record.recordSha256});
 for(const record of BRAIN_CATALOGUE.records){
  for(const [i,item] of (record.prerequisites||[]).slice(0,4).entries()){const id='precondition:'+record.id+':'+i;add(id,'precondition',item,'descriptive',{summary:item,conceptId:record.id},'editorial');connect('concept:'+record.id,id,'requires','descriptive');}
  for(const [i,item] of (record.risks||[]).slice(0,4).entries()){const id='risk:'+record.id+':'+i;add(id,'risk',item,'descriptive',{summary:item,conceptId:record.id},'editorial');connect('concept:'+record.id,id,'raises risk','descriptive');}
  for(const item of (record.obligations||[]).slice(0,5)){const id='obligation:'+record.id+':'+item.id;add(id,'obligation',item.title||item.description,'descriptive',{summary:item.description,conceptId:record.id,verificationHint:item.verificationHint,mandatory:item.mandatory},'editorial');connect('concept:'+record.id,id,'carries obligation','descriptive');}
  for(const item of (record.componentKit||[]).slice(0,5)){const id='component-role:'+record.id+':'+item.key;add(id,'component role',item.name,'illustrative',{summary:item.responsibility,conceptId:record.id,canonicalKind:item.canonicalKind,required:item.required},'editorial');connect('concept:'+record.id,id,'suggests component role','descriptive');}
  for(const item of (record.interfaceKit||[]).slice(0,5)){const id='interface-role:'+record.id+':'+item.key;add(id,'interface role',item.name,'illustrative',{summary:item.contractType,conceptId:record.id,protocol:item.protocol,required:item.required},'editorial');connect('concept:'+record.id,id,'suggests interface role','descriptive');}
 }
 for(const record of BRAIN_CATALOGUE.records){
  for(const [field,relation] of [['alternatives','alternative to'],['complements','complements'],['conflicts','conflicts with']])for(const id of record[field]||[])if(catalogueIds.has(id))connect('concept:'+record.id,'concept:'+id,relation,'descriptive');
 }
 const active=new Map(releasedClaims(project).map(h=>[h.claim.id,h]));
 for(const src of state.sources){
  const successor=state.sources.find(x=>x.supersedes===src.id&&x.hash!==src.hash),blocked=withdrawn(project,[src.id]).length>0;
  const status=blocked?'withdrawn':successor?'superseded':sha256(src.body)===src.hash?'source saved':'source changed';
  add('source:'+src.id,'source',src.title,status,{sourceId:src.id,repository:src.repository,revision:src.revision,path:src.path,url:src.url,hash:src.hash,successorId:successor?.id},'original evidence');
 }
 for(const src of state.sources)if(src.supersedes)connect('source:'+src.id,'source:'+src.supersedes,'supersedes');
 for(const passage of state.suggestions||[]){
  add('passage:'+passage.id,'passage',passage.heading||'Lines '+passage.lineStart+'–'+passage.lineEnd,passage.status,{sourceId:passage.sourceId,lineStart:passage.lineStart,lineEnd:passage.lineEnd,excerpt:passage.excerpt,excerptHash:passage.excerptHash});
  connect('source:'+passage.sourceId,'passage:'+passage.id,'contains passage');
  for(const id of passage.conceptIds||[])connect('passage:'+passage.id,'concept:'+id,'possible concept','unassessed');
 }
 for(const claim of state.claims){
  const eligibility=active.get(claim.id),checked=knowledgeEligibility(project,claim),status=eligibility?eligibility.eligible?'active':'support changed':claim.review?.decision==='verified'&&checked.eligible?'reviewed':claim.review?.decision||'candidate';
  add('claim:'+claim.id,'claim',claim.statement,status,{claimId:claim.id,subjectId:claim.subjectId,claimType:claim.claimType,polarity:claim.polarity,predicate:claim.predicate,conditions:claim.conditions,limitations:claim.limitations,sourceId:claim.sourceId,lineStart:claim.lineStart,lineEnd:claim.lineEnd,excerpt:claim.excerpt,excerptHash:claim.excerptHash,reviewer:claim.review?.reviewer,reasons:eligibility?.reasons||checked.reasons},status==='active'?'project-approved':'candidate');
  connect('claim:'+claim.id,'source:'+claim.sourceId,'supported by',status==='active'?'approved':'candidate');
  connect('claim:'+claim.id,'concept:'+claim.subjectId,'interprets',status==='active'?'approved':'candidate');
 }
 for(const passage of state.suggestions||[])if(passage.claimId)connect('passage:'+passage.id,'claim:'+passage.claimId,'interpreted as');
 for(const conflict of state.contradictions){
  add('conflict:'+conflict.id,'conflict','Possible contradiction '+conflict.id,conflict.status,{claimIds:conflict.claimIds,reason:conflict.reason||conflict.explanation,contexts:conflict.distinguishingContexts},'review required');
  for(const id of conflict.claimIds)connect('conflict:'+conflict.id,'claim:'+id,'compares');
 }
 for(const release of state.releases){
  add('release:'+release.id,'release',release.title,state.pins.includes(release.id)?'pinned':'available',{releaseId:release.id,checksum:release.checksum,reviewer:release.reviewer},'project-reviewed');
  for(const claim of release.claims)connect('release:'+release.id,'claim:'+claim.id,'includes',state.pins.includes(release.id)?'pinned':'available');
 }
 for(const link of state.links){
  add('object:'+link.objectId,'design object',link.objectId,'saved in project',{objectId:link.objectId},'design');
  connect('claim:'+link.receipt.claimId,'object:'+link.objectId,'informs',link.status==='retired'?'retired':claimReceiptCurrent(project,link.receipt)?'current':'support changed');
 }
 const shared=(project.workbench?.catalogue||[]).filter(x=>x.organization);
 for(const entry of shared){
  const org=entry.organization,eligible=organizationEntryCurrent(project,entry),revision=project.coauthoring?.sources?.find(x=>x.id===entry.sourceId)?.versions?.at(-1);
  add('org-release:'+org.releaseId,'organization release',org.title||org.releaseId,eligible?'signed guidance':'review required',{releaseId:org.releaseId,signature:org.signature},'independently reviewed');
  add('org-entry:'+entry.id,'organization guidance',entry.title,eligible?'verified':'support changed',{entryId:entry.id,content:entry.content,conditions:org.conditions,limitations:org.limitations,sourceId:entry.sourceId,sourcePassage:revision?.excerpt,sourceLocation:revision?.location,sourceRevision:revision?.revision||revision?.version},eligible?'organization-reviewed':'review required');
  add('org-source:'+entry.sourceId,'organization source',revision?.title||entry.sourceId,eligible?'exact snapshot':'support changed',{sourceId:entry.sourceId,sourcePassage:revision?.excerpt,sourceLocation:revision?.location,sourceRevision:revision?.revision||revision?.version},'recorded evidence');
  connect('org-release:'+org.releaseId,'org-entry:'+entry.id,'includes',eligible?'signed':'support changed');
  connect('org-entry:'+entry.id,'org-source:'+entry.sourceId,'supported by',eligible?'verified':'support changed');
 }
 return {nodes,edges,counts:{concepts:BRAIN_CATALOGUE.records.length,sources:state.sources.length,passages:(state.suggestions||[]).length,claims:state.claims.length,activeClaims:[...active.values()].filter(x=>x.eligible).length,organizationGuidance:shared.filter(x=>organizationEntryCurrent(project,x)).length,conflicts:state.contradictions.filter(x=>x.status==='open').length}};
}

export function knowledgeNeighbourhood(graph,focusId,{depth=2,limit=24}={}){
 const byId=new Map(graph.nodes.map(n=>[n.id,n])),focus=byId.get(focusId);if(!focus)return {focus:null,nodes:[],edges:[],backlinks:[]};
 const adjacent=new Map();for(const edge of graph.edges){for(const id of [edge.from,edge.to]){if(!adjacent.has(id))adjacent.set(id,[]);adjacent.get(id).push(edge);}}
 const selected=new Set([focusId]),queue=[{id:focusId,level:0}];while(queue.length&&selected.size<limit){const {id,level}=queue.shift();if(level>=depth)continue;
  const ordered=(adjacent.get(id)||[]).slice().sort((a,b)=>priority(b)-priority(a)||a.kind.localeCompare(b.kind));
  for(const edge of ordered){const other=edge.from===id?edge.to:edge.from;if(selected.has(other)||!byId.has(other))continue;selected.add(other);queue.push({id:other,level:level+1});if(selected.size>=limit)break;}
 }
 const nodes=[focus,...[...selected].filter(id=>id!==focusId).map(id=>byId.get(id))];
 const edges=graph.edges.filter(e=>selected.has(e.from)&&selected.has(e.to)).slice(0,80);
 const backlinks=(adjacent.get(focusId)||[]).map(e=>({edge:e,node:byId.get(e.from===focusId?e.to:e.from),direction:e.to===focusId?'incoming':'outgoing'})).filter(x=>x.node);
 return {focus,nodes,edges,backlinks};
}

function priority(edge){return edge.status==='approved'||edge.status==='current'?5:edge.kind==='supported by'||edge.kind==='interprets'?4:edge.kind==='includes'?3:edge.status==='candidate'?2:1;}
