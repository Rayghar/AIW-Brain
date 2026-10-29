import {nodes,edges} from './model.js';
// Project-specific models include blank, imported and non-banking reference journeys.
export const isBlankProject=p=>!!p.workspace?.template&&p.workspace.template!=='bank-payment';
// Round 12 (GR-GOV-20): a person may switch AIW's seeding off for a project (workspace.seeding, reviewed): no need,
// trust boundary, contract, plan or path is proposed by AIW any more, and each chapter's findings ask the author.
export const seedingOff=p=>p?.workspace?.seeding?.state==='off';
export function projectNodes(p){
  if(!isBlankProject(p))return nodes;
  return p.artefacts.filter(a=>a.type==='journey').sort((a,b)=>a.order-b.order).map((a,i)=>({id:a.id,ref:a.id,layer:'process',col:i%5,title:a.title,sub:'Journey step · '+a.id,description:a.description,attrs:{Owner:a.owner||'Unassigned',Source:a.source||'Not recorded',Status:a.confirmed?'Confirmed':'Working draft'}}));
}
// Round 12 (E2, GR-REQ-19): the Chapter 1 step each process node stands for, by id. A blank or imported project draws its
// steps as themselves; the Bank Payment reference draws its five seeded steps (JRN-001 to JRN-005, in the order of its
// journey) as its own process nodes, whatever either is titled, so a connection drawn to a node is its step's.
export const REFERENCE_STEPS=Object.freeze({initiate:'JRN-001',screen:'JRN-002',post:'JRN-003',settle:'JRN-004',confirm:'JRN-005'});
export const stepOfNode=(p,id)=>isBlankProject(p)?id:REFERENCE_STEPS[id]||id;
export const projectEdges=p=>isBlankProject(p)?p.relationships.filter(r=>r.kind==='precedes'&&p.artefacts.some(a=>a.id===r.from&&a.type==='journey')&&p.artefacts.some(a=>a.id===r.to&&a.type==='journey')).map(r=>({...r,id:'journey-'+r.id,label:r.kind,kind:'flow'})):edges;

export function journeyStages(p){return p.artefacts.filter(a=>a.type==='journey').sort((a,b)=>a.order-b.order).map(a=>({name:a.title,node:p.logical.connections.find(e=>e.from===a.id&&p.logical.responsibilities.some(r=>r.id===e.to))?.to||a.id,text:a.description||'Describe the expected behaviour of this journey step.'}));}
export const projectScenarios=p=>isBlankProject(p)?['success']:['success','hold','timeout'];
export const scenarioSteps=(p,id)=>isBlankProject(p)?id==='success'?journeyStages(p).map((_,i)=>i):[]:id==='success'?[0,1,2,3,4]:id==='hold'?[0,1]:id==='timeout'?[0,1,2,3]:[];
