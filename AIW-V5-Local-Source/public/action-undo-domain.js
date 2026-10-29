// Server-issued, latest-revision receipts for a bounded set of reversible working actions.
// No client supplies old review stamps, approvals or a replacement document.
import {digest} from './brain-integrity.js';
import {applyDecisionCommand} from './decisions-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
const TYPES=new Set(['quality.intake','quality.move','decision.intake','decision.choose','techrealisation.preference','techrealisation.clear-preference','technology.simulation','runtime.simulation','logical.scenario']);
const inner=c=>c?.type==='workspace.apply'&&c.payload?.commands?.length===1?c.payload.commands[0]:c;
const clone=v=>v==null?null:structuredClone(v);
function basis(p){const q={...p};delete q.changes;q.workbench={...p.workbench,history:(p.workbench?.history||[]).map(h=>h.undo?{...h,undo:{...h.undo,guard:undefined}}:h)};return digest(q);}
function priorValue(p,c){const raw=c.payload||{};
 if(c.type==='quality.intake')return {intake:clone(p.quality.intake)};
 if(c.type==='decision.intake')return {intake:clone(p.decisions.intake)};
 if(c.type==='quality.move')return {ranks:p.quality.drivers.map(d=>[d.id,d.rank])};
 if(c.type==='decision.choose')return {id:raw.id,alternativeId:p.decisions.records.find(d=>d.id===raw.id)?.selectedAlternativeId||null};
 if(c.type.startsWith('techrealisation.'))return {id:raw.id,optionId:p.technologyRealisation.records.find(r=>r.id===raw.id)?.selectedOptionId||null};
 if(c.type==='logical.scenario')return {scenario:raw.scenario,previous:clone(p.logical.scenarios[raw.scenario])};
 return {};
}
export function attachActionUndo(prior,result,command,{revision,actor,at}={}){
 const c=inner(command);if(!TYPES.has(c?.type)||!actor||!Number.isInteger(revision))return result;
 const p=result.document,previous=priorValue(prior,c),raw=c.payload||{};
 if(c.type==='technology.simulation'){const last=p.technology.simulations.at(-1);if(!last||last.at!==at)return result;previous.record=clone(last);}
 if(c.type==='runtime.simulation'){const last=p.runtime.simulations.at(-1);if(!last||last.at!==at)return result;previous.id=last.id;}
 if(c.type==='logical.scenario')previous.recorded=clone(p.logical.scenarios[raw.scenario]);
 p.workbench??={version:1,alternatives:[],analyses:[],catalogue:[],views:[],assignments:[]};p.workbench.history??=[];
 const undo={id:'UNDO-'+crypto.randomUUID(),type:c.type,previous,revision,actor,at,guard:'',used:null};
 p.workbench.history.push({at,actor,commands:[],changed:raw.id?[raw.id]:[],affected:[],reason:'Undo receipt for '+c.type,undo});undo.guard=basis(p);
 return result;
}
export function availableActionUndo(p,revision){const entry=(p?.workbench?.history||[]).at(-1),r=entry?.undo;return r&&!r.used&&r.revision===revision?{id:r.id,type:r.type,revision:r.revision}:null;}
export function applyActionUndoCommand(input,command,at=new Date().toISOString(),actor='',{revision}={}){
 if(command.type!=='action.undo')throw Error('Unknown reversible action.');
 const receipt=(input.workbench?.history||[]).at(-1)?.undo;
 if(!receipt||receipt.id!==command.payload?.receiptId||receipt.used||!TYPES.has(receipt.type))throw Error('Only the latest saved action can be undone.');
 if(!actor||actor!==receipt.actor)throw Error('Only the account that saved this action may undo it.');
 if(revision!==receipt.revision||basis(input)!==receipt.guard)throw Error('The project changed after this action. Review the current record instead.');
 let p=structuredClone(input),selected=null;const old=receipt.previous,type=receipt.type;
 if(type==='quality.intake'||type==='quality.move'){const q=p.quality;if(type==='quality.intake')q.intake=clone(old.intake);else{for(const [id,rank] of old.ranks){const d=q.drivers.find(x=>x.id===id);if(!d)throw Error('A driver changed after this action.');d.rank=rank;}}q.version++;q.review=null;q.handoff=null;}
 else if(type==='decision.intake'){p.decisions.intake=clone(old.intake);p.decisions.version++;p.decisions.review=null;p.decisions.handoff=null;}
 else if(type==='decision.choose'){const result=applyDecisionCommand(p,{type:old.alternativeId?'decision.choose':'decision.clear-choice',payload:{id:old.id,alternativeId:old.alternativeId}},at);p=result.document;selected=result.selected;}
 else if(type.startsWith('techrealisation.')){const result=applyTechnologyRealisationCommand(p,{type:old.optionId?'techrealisation.preference':'techrealisation.clear-preference',payload:{id:old.id,optionId:old.optionId}},at);p=result.document;selected=result.selected;}
 else if(type==='technology.simulation'){const record=p.technology.simulations.at(-1);if(digest(record)!==digest(old.record))throw Error('The walkthrough changed.');record.withdrawn={at,actor,reason:'Undone by its author; observation retained.'};p.technology.review=null;p.technology.handoff=null;selected=record.capabilityId;}
 else if(type==='runtime.simulation'){const record=p.runtime.simulations.find(x=>x.id===old.id);if(!record||record.withdrawn)throw Error('The walkthrough changed.');record.withdrawn={at,actor,reason:'Undone by its author; observation retained.'};p.runtime.evidenceVersion++;p.runtime.review=null;p.runtime.handoff=null;selected=record.zoneId;}
 else if(type==='logical.scenario'){if(digest(p.logical.scenarios[old.scenario])!==digest(old.recorded))throw Error('The walkthrough changed.');if(old.previous)p.logical.scenarios[old.scenario]=clone(old.previous);else delete p.logical.scenarios[old.scenario];p.logical.review=null;p.logical.handoff=null;}
 p.workbench.history.at(-1).undo.used={at,actor};p.workbench.history.push({at,actor,commands:[{type:'action.undo',payload:{receiptId:receipt.id}}],changed:selected?[selected]:[],affected:[],reason:'Undid '+type+'; earlier approvals and evidence were not restored.',undoOf:receipt.id});
 return {document:p,selected};
}
