import {readStoredProject,saveStoredProject} from './project-storage.js';
import {withFinalReview} from './public/review-domain.js';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function instantiateTemplate(source,id,name,at){
 const p=structuredClone(source);p.id=id;p.name=name;p.workspace={template:'custom',createdAt:at,templateOrigin:{projectId:source.id,name:source.name,at},status:'active'};
 for(const key of ['intake','assurance','guidance','knowledge','changes','modelAlternatives','coauthoring','requirementsStorage','collaborationEvidence'])delete p[key];
 function reset(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(reset);return;}for(const key of Object.keys(value)){if(['review','handoff','intake','recorded','applied','sourceReview','generation','selection','approval'].includes(key))value[key]=null;else if(['confirmed','targetConfirmed','targetsConfirmed','capacityConfirmed','timeoutConfirmed','retentionConfirmed','assumptionsResolved','reviewed'].includes(key))value[key]=false;else if(['history','evidence','simulations','checks','governance','reviews'].includes(key)&&Array.isArray(value[key]))value[key]=[];else reset(value[key]);}}
 reset(p);p.artefacts.forEach(a=>{delete a.provenance;delete a.assessment;delete a.sourceMissing;a.origin='reference';a.source='Template definition from '+source.name+'; validate for this project.';});
 for(const r of p.decisions.records)r.status='draft';
 p.finalReview={...p.finalReview,version:1,deliveryVersion:1,narrative:{...p.finalReview.narrative,title:name+' — Solution Design',confirmed:false},baselines:[],reviews:[],governance:[],actions:[],dispositions:[],traces:[],handoff:null,checks:null};
 if(p.workbench)p.workbench={version:1,alternatives:[],analyses:[],catalogue:p.workbench.catalogue.map(e=>({...e,status:'draft',sourceId:'',sourceHash:null,history:[]})),views:[],assignments:[]};
 if(p.interfaces){p.interfaces.specifications=[];p.interfaces.schemaChecks=[];p.interfaces.fieldLineage=[];for(const d of p.interfaces.data){delete d.schemaSource;delete d.schemaRoot;delete d.schema;}}
 return withFinalReview(p);
}
export async function handleLifecycle(request,env,identity,project){
 const {owner,actor,role}=identity,url=new URL(request.url);if(role!=='owner')return json({error:'Only the project owner can manage its lifecycle.'},403);if(request.headers.get('Origin')!==url.origin)return json({error:'Use lifecycle actions from the project workspace.'},403);
 try{const raw=await request.json(),row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,project).first();if(!row)return json({error:'Project unavailable.'},404);if(raw.revision!==row.revision)return json({error:'The project changed. Reload its latest revision.',conflict:true},409);const stored=await readStoredProject(env,owner,row.document),p=withFinalReview(stored.document),at=new Date().toISOString();p.workspace??={};
 if(raw.action==='rename'){if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100)throw Error('Use a project name of 1–100 characters.');p.name=raw.name.trim();}
 else if(raw.action==='archive')p.workspace.status='archived';else if(raw.action==='restore')p.workspace.status='active';else if(raw.action==='template')p.workspace.reusableTemplate=raw.enabled===true;else throw Error('Unknown project lifecycle action.');
 p.workspace.lifecycle??=[];p.workspace.lifecycle.push({action:raw.action,at,actor});const result=await saveStoredProject(env,owner,project,p,row.revision,at,stored.keys);if(!result.meta?.changes)return json({error:'The project changed while saving.',conflict:true},409);return json({document:p,revision:row.revision+1,updatedAt:at});
 }catch(e){return json({error:e.message},400);}
}
