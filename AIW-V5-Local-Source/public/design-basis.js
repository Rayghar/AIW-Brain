// A design task's basis (audit F2-08): the requirement, drivers, decisions, contract, payload, security source and
// design context a task was drafted from, and its stamp. Moved out of design-task-state.js so that
// architecture-knowledge.js can read it without an import cycle (design-task-state.js imports architecture-knowledge.js);
// design-task-state.js re-exports both for its other importers and keeps designBasisCurrent, which also needs the
// Brain's generation check.
import {securityInputStamp,securityTargets,targetBoundaries,securityReading} from './security-domain.js';
import {changeFingerprint} from './changes-domain.js';
import {readingsDefinition,valueFingerprint} from './source-fingerprint.js';
import {copy} from './util.js';
import {designRequirementBasis} from './design-requirement-basis.js';
// What a security basis reads beyond the records it copies (readings definition 3, round 12 GR-STO-08): the threat's and
// the control's readings of what they read (security-domain.js securityReading), so a change elsewhere in Chapters 1-8
// leaves the basis current. Before definition 3 it read the versions of those chapters (securityInputStamp), so any
// change in them marked every security task (readings-upgrade.js converts a basis kept so).
export const securityBasisReading=(p,threat,control)=>readingsDefinition()<3?securityInputStamp(p):valueFingerprint([securityReading(p,threat),control?securityReading(p,control):null]);
export function designBasis(p,requirementId,contractId,payloadId,securityIds,contextIds){
 const {contextIds:ids,designContext,...basis}=designRequirementBasis(p,requirementId,contextIds);
 const c=contractId?p.interfaces.contracts.find(c=>c.id===contractId):null;if(contractId&&!c)throw Error('The source contract was removed.');
 if(payloadId&&!p.interfaces.data.some(d=>d.id===payloadId))throw Error('The selected payload definition was removed.');
 const st=securityIds?p.security.threats.find(t=>t.id===securityIds.threatId):null,sc=securityIds?.controlId?p.security.controls.find(c=>c.id===securityIds.controlId):null;
 if(securityIds&&!st)throw Error('The source threat was removed.');if(securityIds?.controlId&&!sc)throw Error('The selected control was removed.');
 const securitySource=st?{inputStamp:securityBasisReading(p,st,sc),threat:copy(st),control:sc?copy(sc):null,targets:securityTargets(p).filter(r=>[...st.targetIds,...(sc?.targetIds||[])].includes(r.id)).map(copy),boundaries:[...new Map(st.targetIds.flatMap(id=>targetBoundaries(p,id)).map(b=>[b.id,b])).values()].map(copy)}:null;
 if(securitySource&&securityIds.contextVersion===2){
  const all=[...securityTargets(p),...p.interfaces.parties,...p.logical.responsibilities],seen=new Set(securitySource.targets.map(r=>r.id)),queue=[...securitySource.targets],context=[];
  while(queue.length){const r=queue.shift(),links=[r.from,r.to,r.authorityId,r.boundaryId,...(r.exchanges||[]).map(x=>x.dataId),...(r.dataIds||[]),...p.logical.mappings.filter(m=>m.physicalId===r.id).map(m=>m.logicalId)];for(const id of links){const record=all.find(x=>x.id===id);if(!record||seen.has(id))continue;seen.add(id);context.push(copy(record));queue.push(record);}}
  securitySource.context=context;
 }
 return {...(ids?.length?{contextIds:ids,designContext}:{}),...(securityIds?{securityIds:copy(securityIds),securitySource}:{}),...(c?{contractId,...(payloadId?{payloadId}:{}),exchangeSource:{contract:copy(c),logical:p.logical.responsibilities.filter(r=>p.logical.mappings.some(m=>m.logicalId===r.id&&[c.from,c.to].includes(m.physicalId))).map(copy),participants:[...p.realisation.components,...p.technologyRealisation.records,...p.interfaces.parties].filter(r=>[c.from,c.to].includes(r.id)).map(copy),data:p.interfaces.data.filter(d=>d.id===payloadId||c.exchanges.some(x=>x.dataId===d.id)).map(copy)}}:{}),...basis};
}
export const designBasisStamp=b=>changeFingerprint(b);
