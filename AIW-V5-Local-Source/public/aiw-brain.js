import {architectureModel} from './architecture-model.js';
import {relatedCaseContext,caseContextSourceCurrent} from './case-guidance.js';
import {organizationSourceCurrent} from './organization-knowledge.js';
import {architectureBrain,brainSourceCurrent,BRAIN_ENGINE,BRAIN_POLICY} from './architecture-brain.js';
import {interactionGroundingCurrent,refreshInteractionGrounding} from './architecture-knowledge.js';
import {decisionCurrent} from './decisions-domain.js';
import {journeyIndex,journeyTargets,journeyStatus} from './journey-context.js';
import {changeFingerprint} from './changes-domain.js';
import {KNOWLEDGE_PACK} from './knowledge-pack.js';
import {relevantKnowledge} from './knowledge-relevance.js';

const list=x=>Array.isArray(x)?x:[];
// Some journey neighbours are derived graph nodes without a backing record.
// Their receipt fingerprints the node itself, so freshness must use the same
// projection until a real object record is supplied.
const modelSourceRecord=(p,id)=>{const node=journeyIndex(p).nodes.get(id);return node?.record||node||null;};
const copy=x=>structuredClone(x);
const unique=items=>[...new Map(items.map(x=>[x.id,x])).values()];
export {KNOWLEDGE_PACK};
export const knowledgeRecord=id=>KNOWLEDGE_PACK.records.find(r=>r.id===id);
export function knowledgeReceipt(id){
 const r=knowledgeRecord(id);if(!r)return null;
 return {packId:KNOWLEDGE_PACK.id,releaseId:KNOWLEDGE_PACK.releaseId,patternId:id,title:r.name,sourceFile:KNOWLEDGE_PACK.sourceFile,sourcePointer:r.sourcePointer,sourceSha256:KNOWLEDGE_PACK.sourceSha256,recordSha256:r.recordSha256,posture:r.claims.length?'Seed claim · controlled pilot':'Editorial synthesis · descriptive',liveSource:false,scoring:false,claims:copy(r.claims),content:copy({problem:r.problem,context:r.context,prerequisites:r.prerequisites,applicabilityRules:r.applicabilityRules,risks:r.risks,failureModes:r.failureModes,counterfactualExplanation:r.counterfactualExplanation,obligations:r.obligations})};
}
export const receiptCurrent=r=>!!r&&knowledgeRecord(r.patternId)?.recordSha256===r.recordSha256&&knowledgeRecord(r.patternId)?.sourcePointer===r.sourcePointer&&KNOWLEDGE_PACK.sourceSha256===r.sourceSha256&&r.packId===KNOWLEDGE_PACK.id&&r.releaseId===KNOWLEDGE_PACK.releaseId&&r.sourceFile===KNOWLEDGE_PACK.sourceFile;
const projectNode=p=>({id:'project',ref:'Project',title:p.name,chapter:1,record:{title:p.name,description:p.brief?.summary||p.brief?.problem||''}});

// Every assistant reads this same saved-model projection. Walking upstream is
// chapter-directed so shared infrastructure cannot import a neighbour's intent.
export function brainContext(p,selection={}){
 const index=journeyIndex(p),selected=index.nodes.get(selection.id)||projectNode(p);
 const recordsFor=chapter=>journeyTargets(index,selected.id,chapter).map(x=>x.node);
 const requirements=recordsFor(1).filter(n=>n.record?.type==='requirement');
 const drivers=unique([...recordsFor(2),...requirements.flatMap(n=>journeyTargets(index,n.id,2).map(x=>x.node))]);
 const decisions=unique([...recordsFor(3),...requirements.flatMap(n=>journeyTargets(index,n.id,3).map(x=>x.node))]);
 const links=index.edges.filter(e=>e.from===selected.id||e.to===selected.id);
 const neighbours=unique(links.map(e=>index.nodes.get(e.from===selected.id?e.to:e.from)).filter(Boolean));
 const constraints=list(p.artefacts).filter(r=>r.type==='constraint');
 const ids=new Set([selected.id,...requirements.map(r=>r.id),...drivers.map(r=>r.id),...decisions.map(r=>r.id)]);
 const tasks=list(p.coauthoring?.designTasks).filter(t=>ids.has(t.requirementId)||t.applied?.records?.some(r=>r.id===selected.id)||t.basis?.securityIds?.threatId===selected.id||t.basis?.contractId===selected.id);
 const evidenceTasks=list(p.coauthoring?.tasks).filter(t=>t.applied&&Object.values(t.applied.ids).some(id=>ids.has(id)));
 const sourceIds=new Set(evidenceTasks.map(t=>t.sourceId));
 const sources=list(p.coauthoring?.sources).filter(s=>sourceIds.has(s.id)).map(s=>({id:s.id,...copy(s.versions.at(-1))}));
 const missing=[];
 if(selected.id==='project')missing.push('Select an object or capture the first requirement.');
 else {
  if(!requirements.length)missing.push('Connect the design to a source requirement.');
  if(!selected.record?.owner)missing.push('Name the accountable owner.');
  if(!drivers.length)missing.push('Link a measurable quality scenario.');
  if(drivers.some(d=>!d.record.targetConfirmed))missing.push('Confirm the quality targets that are still assumptions.');
  if(!decisions.some(d=>decisionCurrent(p,d.record)))missing.push('Record the reasoning for the chosen approach.');
 }
 const basis={projectId:p.id,projectName:p.name,selected:{id:selected.id,chapter:selected.chapter,record:copy(selected.record||{title:selected.title,description:selected.description})},requirements:requirements.map(n=>copy(n.record)),drivers:drivers.map(n=>copy(n.record)),decisions:decisions.map(n=>copy(n.record)),neighbours:neighbours.map(n=>({id:n.id,chapter:n.chapter,record:copy(n.record||{title:n.title,description:n.description})})),links:copy(links),constraints:copy(constraints),sources};
 const cases=relatedCaseContext(p,requirements.map(r=>r.id));if(cases.length)basis.architectureCases=cases;
 const result={cases,chapter:Number(selection.chapter)||selected.chapter,tab:selection.tab||'work',selected,status:journeyStatus(selected),requirements,drivers,decisions,neighbours,links,constraints,sources,tasks,evidenceTasks,missing,basis,stamp:changeFingerprint(basis)};
 result.knowledge=knowledgeForContext(result);result.governed=architectureBrain(p,result);return result;
}
export function knowledgeForContext(c,options){
 return relevantKnowledge(c,options).map(x=>({...x,record:knowledgeRecord(x.id),receipt:knowledgeReceipt(x.id)})).filter(x=>x.record);
}
export const brainNotes=p=>list(p.coauthoring?.narratives);
export const brainNote=(p,id)=>brainNotes(p).find(n=>n.id===id);
export function generationCurrent(p,g){try{if(!g)return true;if(g.brainReceipt&&(g.brainReceipt.engine!==BRAIN_ENGINE||g.brainReceipt.policy!==BRAIN_POLICY))return false;return brainContext(p,g.context).stamp===(g.reviewed?.basisStamp||g.basisStamp)&&(g.reviewed?.sources||g.sources).every(s=>s.kind==='model'&&s.versionStamp?(s.versionStamp===changeFingerprint(modelSourceRecord(p,s.objectId))):s.kind==='architecture-exploration'?s.versionStamp===architectureModel(p).signature:s.kind==='architecture-case'?caseContextSourceCurrent(p,s):s.kind==='organization-guidance'?organizationSourceCurrent(p,s):['governed-claim','brain-method','catalogue-description'].includes(s.kind)?brainSourceCurrent(p,s):s.kind==='architecture-knowledge'?interactionGroundingCurrent(p,s):s.kind==='knowledge'?receiptCurrent(s.receipt):s.kind==='workbook-row'?(s.versionStamp===p.artefacts.find(a=>a.id===s.objectId)?.provenance?.rowHash&&s.workbookHash===p.artefacts.find(a=>a.id===s.objectId)?.provenance?.workbookHash):s.kind==='project-source'?(s.versionStamp===changeFingerprint(p.coauthoring?.sources?.find(x=>x.id===s.objectId)?.versions?.at(-1)||null)):true);}catch{return false;}}
export function generationMarkdown(g){if(!g)return '';return '\n\nDrafting origin: '+g.provider+' · '+g.model+' · Request '+g.runId+' · '+g.at+(g.brainReceipt?'\n\nBrain receipt: '+g.brainReceipt.engine+' · '+g.brainReceipt.policy+' · Graph '+g.brainReceipt.graphFingerprint+' · '+(g.retrieval?.mode||g.brainReceipt.retrieval):'')+'\n\nArchitect request: '+g.request.prompt+'\n\nCited context:\n'+g.sources.filter(s=>g.sourceRefs.includes(s.ref)).map(s=>'- '+s.ref+' · '+s.title+' · '+s.posture+(s.revision?' · Revision '+s.revision:'')+(s.receipt?' · '+[s.receipt.releaseId||s.receipt.packId,s.receipt.path||s.receipt.locator||s.receipt.sourcePointer,s.receipt.revision].filter(Boolean).join(' · '):'')).join('\n')+'\n\nGenerated interpretations required human review. Source references do not independently verify a claim.\n\n';}
export function reviewGeneration(p,g){if(!g)return;g.reviewed={at:new Date().toISOString(),basisStamp:brainContext(p,g.context).stamp,sources:g.sources.map(s=>s.kind==='model'?{...s,versionStamp:changeFingerprint(modelSourceRecord(p,s.objectId)),excerpt:JSON.stringify(modelSourceRecord(p,s.objectId)).slice(0,2600)}:s.kind==='workbook-row'?{...s,versionStamp:p.artefacts.find(a=>a.id===s.objectId)?.provenance?.rowHash,workbookHash:p.artefacts.find(a=>a.id===s.objectId)?.provenance?.workbookHash}:s.kind==='architecture-knowledge'?refreshInteractionGrounding(p,s):s.kind==='project-source'?{...s,versionStamp:changeFingerprint(p.coauthoring?.sources?.find(x=>x.id===s.objectId)?.versions?.at(-1)||null)}:s.kind==='knowledge'?{...s,receipt:knowledgeReceipt(s.objectId)}:s)};}
export function noteCurrent(p,n){try{return brainContext(p,n.context).stamp===n.basisStamp&&list(n.knowledge).every(receiptCurrent)&&generationCurrent(p,n.generation);}catch{return false;}}
export function draftNarrative(c){
 const r=c.selected.record||{},out=[c.selected.title,r.purpose||r.description||r.policy||'Purpose remains to be defined.'];
 if(r.owner)out.push('Recorded owner: '+r.owner+'.');
 if(r.boundary)out.push('Boundary: '+r.boundary);
 if(c.requirements.length)out.push('Required behaviour\n'+c.requirements.map(n=>n.id+' — '+n.record.description+(n.record.acceptance?'\nAcceptance: '+n.record.acceptance:'\nAcceptance remains to be defined.')).join('\n\n'));
 if(c.drivers.length)out.push('Quality expectations\n'+c.drivers.map(n=>n.id+' — '+n.title+'\n'+[n.record.stimulus,n.record.conditions,n.record.response].filter(Boolean).join(' ')+'\n'+(n.record.targetValue!==null&&n.record.targetValue!==undefined&&n.record.targetValue!==''?'Recorded target: '+[n.record.operator,n.record.targetValue,n.record.unit,n.record.window].filter(Boolean).join(' ')+' ('+(n.record.targetConfirmed?'user confirmed':'assumption; confirmation required')+').':'A measurable target remains to be defined.')).join('\n\n'));
 if(c.decisions.length)out.push('Design reasoning\n'+c.decisions.map(n=>n.id+' — '+n.title+' ['+(n.record.status||'draft')+']\n'+(n.record.rationale||'A selection rationale has not been recorded.')).join('\n\n'));
 if(c.links.length)out.push('Connected design\n'+c.links.map(e=>e.from+' — '+e.label+' — '+e.to).join('\n'));
 if(c.sources.length)out.push('Project sources\n'+c.sources.map(s=>s.id+' revision '+s.revision+' — '+s.title+(s.location?' · '+s.location:'')).join('\n'));
 if(c.missing.length)out.push('Open design work\n'+c.missing.map(s=>'• '+s).join('\n'));
 out.push('This passage describes the recorded design. Implementation and verification evidence are assessed separately.');
 return out.filter(Boolean).join('\n\n').slice(0,16000);
}
