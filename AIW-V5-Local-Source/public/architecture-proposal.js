import {modelEditSnapshot,modelImpactSource,modelLinkedItems,modelFindingDelta} from './model-impact.js';
import {logicalGraph} from './logical-domain.js';
import {withInterfaces} from './interfaces-domain.js';
import {copy} from './util.js';
import {bindArchitectureSolution} from './architecture-solution.js';
import {applyDecisionCommand} from './decisions-domain.js';

const edgeIdentity=e=>e.id||[e.from,e.to,e.kind||e.interaction||'',e.label||e.title||''].join('|');
const edgeValue=e=>JSON.stringify(e);
function proposalRelationships(input,output){
 const edges=p=>[...logicalGraph(p).edges,...(p.realisation?.connections||[]),...(p.technology?.dependencies||[]),...(p.interfaces?.contracts||[])];
 const before=new Map(edges(input).map(e=>[edgeIdentity(e),e])),after=new Map(edges(output).map(e=>[edgeIdentity(e),e]));
 return {added:[...after].filter(([id])=>!before.has(id)).map(([,e])=>copy(e)),removed:[...before].filter(([id])=>!after.has(id)).map(([,e])=>copy(e)),modified:[...after].filter(([id,e])=>before.has(id)&&edgeValue(before.get(id))!==edgeValue(e)).map(([id,e])=>({before:copy(before.get(id)),after:copy(e)}))};
}

export function proposalEdgeChanged(edge,relationships,view='proposed'){
 if(!relationships)return false;
 const candidates=[...(view==='saved'?relationships.removed:relationships.added),...relationships.modified.map(x=>view==='saved'?x.before:x.after)];
 return candidates.some(e=>e.id&&edge.id===e.id||e.from===edge.from&&e.to===edge.to&&(e.label||e.title||'')===(edge.label||edge.title||'')&&(e.kind||e.interaction||'')===(edge.kind||edge.interaction||''));
}

export function architectureProposal(input,document,t,alternative,used,executed,decisionId,assessment,at=alternative.updatedAt||alternative.createdAt||t.updatedAt){
 let p=withInterfaces(document);
 const decision=p.decisions.records.find(d=>d.id===decisionId),driverIds=[...new Set([...(decision?.driverIds||[]),...(t.basis.drivers||[]).map(d=>d.id),t.driverId].filter(Boolean))];
 if(decision&&JSON.stringify(decision.driverIds)!==JSON.stringify(driverIds)){
  const payload={id:decisionId,driverIds};
  p=applyDecisionCommand(p,{type:'decision.save',payload},at).document;
  executed.push({type:'decision.save',payload});
 }
 // Inherited contracts are part of the reviewed change, not an invisible
 // addition when the accepted document is reopened in a later chapter.
 for(const c of p.interfaces.contracts.filter(c=>!input.interfaces.contracts.some(old=>old.id===c.id)))if(!used.some(x=>x.id===c.id))used.push({type:'interfaces.contract',id:c.id,slot:'inherited contract'});
 const special=(doc,type,id)=>type==='decision.save'?doc.decisions.records.find(d=>d.id===id):type==='technology.boundary'?doc.technology.boundaries.find(d=>d.id===id):type==='interfaces.data'?doc.interfaces.data.find(d=>d.id===id):type==='interfaces.lineage'?doc.interfaces.lineage.find(d=>d.id===id):type==='interfaces.contract'?doc.interfaces.contracts.find(d=>d.id===id):null;
 const snapshot=(doc,type,id)=>special(doc,type,id)?copy(special(doc,type,id)):modelEditSnapshot(doc,{type,payload:{id}})||{};
 const connections=(doc,id)=>doc.realisation.connections.filter(e=>e.from===id||e.to===id);
 const changes=used.map(({type,id,slot})=>{
  const command={type,payload:{id}},before=snapshot(input,type,id),after=snapshot(p,type,id),r=special(p,type,id);
  const source={...(modelImpactSource(p,command)||{id,ref:r?.ref||id,title:r?.title||r?.question,chapter:type==='decision.save'?3:type.startsWith('interfaces.')?8:6,kind:type==='decision.save'?'decision':type==='technology.boundary'?'boundary':type.split('.')[1]}),slot,isNew:!Object.keys(before).length};
  const fields=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(k=>({key:k,label:k,before:before[k],after:after[k]}));
  if(type==='realisation.component'&&JSON.stringify(connections(input,id))!==JSON.stringify(connections(p,id)))fields.push({key:'interactions',label:'Interactions',before:copy(connections(input,id)),after:copy(connections(p,id))});
  return {command,source,before,after,fields,signals:[]};
 });
 const items=[...new Map(changes.flatMap(c=>modelLinkedItems(input,p,c.source)).map(i=>[i.key,i])).values()],first=changes.find(c=>c.source.chapter===4)||changes[0],beforeGraph=logicalGraph(input),newEdges=logicalGraph(p).edges.filter(e=>!beforeGraph.edges.some(x=>x.from===e.from&&x.to===e.to&&x.label===e.label));
 const solution=bindArchitectureSolution(p,t,alternative,used,assessment,decisionId),relationships=proposalRelationships(input,p);
 return {document:p,commands:changes.map(c=>c.command),changes,source:first.source,command:first.command,before:first.before,after:first.after,fields:changes.flatMap(c=>c.fields.map(f=>({...f,source:c.source}))),items,findings:modelFindingDelta(input,p),signals:[{title:'Drivers and design obligations',detail:driverIds.join(', ')+' · '+solution.obligations.length+' implementation and verification obligations follow this proposal.'},{title:'Conditional quality effects',detail:assessment.effects.map(e=>e.quality+': '+e.why).join(' ')},{title:'Existing objects and routes',detail:'Saved definitions and existing routes remain. Review new allocations, contracts and route conditions alongside them.'},{title:'Decision and implementation review',detail:decisionId+' retains the compared approaches and a draft working choice. Chapter 3 acceptance, contract completion, implementation selection and verification remain separate.'}],conflicts:[],satisfied:[],selected:first.source.id,designTaskId:t.id,designAlternativeId:alternative.id,decisionId,executed,newEdges,relationships,solution,hasChanges:true,previewChapters:[3,4,5,6,7,8]};
}
