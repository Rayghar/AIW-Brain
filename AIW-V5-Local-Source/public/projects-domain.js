import {REFERENCE_PROJECTS,populateReference} from './reference-projects.js';
import {seedProject} from './requirements-domain.js';
import {withFinalReview,reviewTrace} from './review-domain.js';
import {changedRequirementIds} from './changes-domain.js';

export function createProject({name,template,brief=''},id,at=new Date().toISOString()){
  if(typeof name!=='string'||!name.trim()||name.trim().length>100)throw Error('Give the project a name of 1–100 characters.');
  if(!['blank','bank-payment',...REFERENCE_PROJECTS.map(r=>r.id)].includes(template))throw Error('Choose a blank project or an available reference journey.');
  if(typeof brief!=='string'||brief.length>6000)throw Error('Keep the opening brief under 6,000 characters.');
  let p=withFinalReview(seedProject());
  p.id=id;p.name=name.trim();p.workspace={template,createdAt:at};
  if(template!=='bank-payment'){
    p.brief={problem:brief.trim(),goal:'',source:'',confirmed:false};p.artefacts=[];p.relationships=[];
    for(const key of Object.keys(p.counters))p.counters[key]=0;
    for(const key of ['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime','finalReview']){
      const domain=p[key];
      for(const [field,value] of Object.entries(domain)){
        if(Array.isArray(value))domain[field]=[];
        else if(['intake','review','handoff','checks'].includes(field))domain[field]=null;
        else if(['scenarios','applicationBoundaries'].includes(field))domain[field]={};
        else if(field==='counters')for(const counter of Object.keys(value))value[counter]=0;
      }
    }
  }
  if(REFERENCE_PROJECTS.some(r=>r.id===template))return populateReference(p,template);
  p.finalReview.narrative={title:p.name+' — Solution Design',owner:'',audience:'',summary:'',scope:'',approach:'',confirmed:false};
  return p;
}

export function projectSummary(row){
  const p=JSON.parse(row.document),counts={requirements:p.requirementsStorage?.requirementCount??p.artefacts.filter(a=>a.type==='requirement').length,drivers:p.quality?.drivers.length||0,decisions:p.decisions?.records.length||0,responsibilities:p.logical?.responsibilities.length||0};
  return {status:p.workspace?.status||'active',reusableTemplate:p.workspace?.reusableTemplate===true,id:p.id,name:p.name,template:p.workspace?.template||'bank-payment',updatedAt:row.updated_at,revision:row.revision,counts,confirmedRequirements:p.requirementsStorage?.confirmedRequirements??p.artefacts.filter(a=>a.type==='requirement'&&a.confirmed).length};
}

// A trace-based review route, not a claim that every dependent record is invalid.
export function requirementImpact(before,after,at,requirementId){
  const ids=changedRequirementIds(before,after).filter(id=>!requirementId||id===requirementId);
  const changed=after.artefacts.filter(a=>ids.includes(a.id));
  const removed=before.artefacts.filter(a=>ids.includes(a.id)&&!after.artefacts.some(b=>b.id===a.id));
  if(!changed.length&&!removed.length)return null;
  const groups=new Map();
  for(const r of [...changed,...removed]){
    for(const p of [after,before]){const t=reviewTrace(p,r.id);if(!t)continue;
    for(const [chapter,title,records] of [[2,'Quality drivers',t.drivers],[3,'Decisions',t.decisions],[4,'Logical application',t.logical],[5,'Application realisation',t.applications],[6,'Logical technology',t.capabilities],[7,'Technology realization',t.realizations],[8,'Interfaces & Data',[...t.contracts,...t.data]],[9,'Security',t.controls],[10,'Deployment / Runtime',t.runtime]]){
      if(!records.length)continue;const group=groups.get(chapter)||{chapter,title,objects:[]};
      for(const o of records)if(!group.objects.some(v=>v.id===o.id))group.objects.push({id:o.id,ref:o.ref||o.id,title:o.title||o.question||o.name||o.id,via:impactVia(p,t,chapter,o)});
      groups.set(chapter,group);
    }
    }
  }
  return {at,requirements:[...changed,...removed].map(r=>({id:r.id,title:r.title,removed:removed.includes(r)})),groups:[...groups.values()],message:'A requirement changed. Follow its saved relationships and review whether the dependent design still satisfies it. Earlier evidence and frozen baselines remain available.'};
}

function impactVia(p,t,chapter,o){
  const refs=xs=>xs.map(r=>r.ref||r.id);
  if(chapter===3)return refs(t.drivers.filter(d=>o.driverIds.includes(d.id)));
  if(chapter===5)return refs(t.logical.filter(r=>p.logical.mappings.some(m=>m.logicalId===r.id&&m.physicalId===o.id)));
  if(chapter===6){const needs=p.technology.mappings.filter(m=>m.capabilityId===o.id).map(m=>p.technology.needs.find(n=>n.id===m.needId));return refs(t.applications.filter(a=>needs.some(n=>n?.applicationId===a.id)));}
  if(chapter===7)return refs(t.capabilities.filter(c=>p.technologyRealisation.mappings.some(m=>m.realizationId===o.id&&m.capabilityId===c.id)));
  if(chapter===8&&!o.exchanges)return refs(t.contracts.filter(c=>c.exchanges.some(e=>e.dataId===o.id)));
  if(chapter===9)return refs([...t.applications,...t.capabilities,...t.realizations,...t.contracts,...t.data].filter(r=>o.targetIds.includes(r.id)));
  if(chapter===10)return refs([...t.applications,...t.realizations].filter(r=>r.id===o.assetId));
  return [];
}
