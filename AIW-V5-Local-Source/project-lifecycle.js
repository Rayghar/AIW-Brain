import {readStoredProject,saveStoredProject} from './project-storage.js';
import {missingPackages,extensionUpgradeNeeded} from './public/design-extension-parts.js';
import {EXTENSIONS} from './public/design-extensions.js';
import {errorResponse} from './error-message.js';
import {withFinalReview} from './public/review-domain.js';
import {json} from './http.js';

// Whether a document holds a record of a registered design package (rc44; the lead's ruling P2 of 2026-11-22): a value
// under a key the package states as its own (its design, designKeys, evidenceKeys, lifecycle, provenance.records and
// the collections of provenance.paths), a list only when it is not empty.
const own=e=>[...Object.keys(Object(e.design)),...(e.designKeys||[]),...(e.evidenceKeys||[]),...Object.keys(Object(e.lifecycle)),...Object.keys(Object(e.provenance?.records)),...Object.values(Object(e.provenance?.paths)).flat()];
const holds=(p,e)=>own(e).some(path=>{const [a,b]=String(path).split('.'),v=b?p?.[a]?.[b]:p?.[a];return v!=null&&(!Array.isArray(v)||v.length>0);});
export function instantiateTemplate(source,id,name,at){
 // The copy names the packages whose records it keeps (rc44, slice S0; the lead's rulings D2 and P2:
 // workspace.packages, public/design-extension-parts.js): a package this build registers stays named only when the
 // copy holds a record of it (a library's crosswalk goes with its knowledge); a name this build does not register is
 // copied as stored (K2). A copy that names none has no key.
 // A template row an earlier build stored, whose design package upgrade is due, is copied as the read that opens it
 // would store it (the lead's ruling K2 of 2026-11-20): a copy is the same whether or not anyone opened the template
 // on this build first. A template no package must upgrade is copied as it is stored, as on rc.10.73.42.
 if(!missingPackages(source).length&&extensionUpgradeNeeded(source))source=withFinalReview(source);
 const p=structuredClone(source),packages=source.workspace?.packages;p.id=id;p.name=name;p.workspace={template:'custom',createdAt:at,templateOrigin:{projectId:source.id,name:source.name,at},status:'active',...(Array.isArray(packages)&&packages.length?{packages:[...packages]}:{})};
 for(const key of ['intake','assurance','guidance','knowledge','changes','modelAlternatives','coauthoring','requirementsStorage','collaborationEvidence'])delete p[key];
 // Every review, confirmation and person's declaration is reset, a retired copy's too: a contract's 'read-only, safe to
 // repeat' declaration (rc.10.73.42, D20) is a person's reviewed statement on the source project, not on this one.
 function reset(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(reset);return;}for(const key of Object.keys(value)){if(['review','handoff','intake','recorded','applied','sourceReview','generation','selection','approval','readOnlyDeclaration'].includes(key))value[key]=null;else if(['confirmed','targetConfirmed','targetsConfirmed','capacityConfirmed','timeoutConfirmed','retentionConfirmed','assumptionsResolved','reviewed'].includes(key))value[key]=false;else if(['history','evidence','simulations','checks','governance','reviews'].includes(key)&&Array.isArray(value[key]))value[key]=[];else reset(value[key]);}}
 reset(p);p.artefacts.forEach(a=>{delete a.provenance;delete a.assessment;delete a.sourceMissing;a.origin='reference';a.source='Template definition from '+source.name+'; validate for this project.';});
 for(const r of p.decisions.records)r.status='draft';
 p.finalReview={...p.finalReview,version:1,deliveryVersion:1,narrative:{...p.finalReview.narrative,title:name+' — Solution Design',confirmed:false},baselines:[],reviews:[],governance:[],actions:[],dispositions:[],traces:[],handoff:null,checks:null};
 if(p.workbench)p.workbench={version:1,alternatives:[],analyses:[],catalogue:p.workbench.catalogue.map(e=>({...e,status:'draft',sourceId:'',sourceHash:null,history:[]})),views:[],assignments:[]};
 if(p.interfaces){p.interfaces.specifications=[];p.interfaces.schemaChecks=[];p.interfaces.fieldLineage=[];for(const d of p.interfaces.data){delete d.schemaSource;delete d.schemaRoot;delete d.schema;}}
 if(p.workspace.packages){const named=p.workspace.packages.filter(x=>{const e=EXTENSIONS.find(y=>y.id===x);return !e||holds(p,e);});if(named.length)p.workspace.packages=named;else delete p.workspace.packages;}
 return withFinalReview(p);
}
// A project that names a design package this build does not register (rc44, slice S0; the lead's rulings D2 and F2) is
// renamed, archived and restored as it is stored: the name, the status and this log change, and no read upgrade of a
// design this build cannot read in full is stored with them.
// So is a project whose design package upgrade is due (the lead's ruling K1): the read that opens it stores that upgrade,
// with its recovery point; a rename from the project list does not.
export async function handleLifecycle(request,env,identity,project){
 const {owner,actor,role}=identity,url=new URL(request.url);if(role!=='owner')return json({error:'Only the project owner can manage its lifecycle.'},403);if(request.headers.get('Origin')!==url.origin)return json({error:'Use lifecycle actions from the project workspace.'},403);
 try{const raw=await request.json(),row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,project).first();if(!row)return json({error:'Project unavailable.'},404);if(raw.revision!==row.revision)return json({error:'The project changed. Reload its latest revision.',conflict:true},409);const stored=await readStoredProject(env,owner,row.document),missing=missingPackages(stored.document).length>0||!!env.FILES&&extensionUpgradeNeeded(stored.document),p=missing?structuredClone(stored.document):withFinalReview(stored.document),at=new Date().toISOString();p.workspace??={};
 if(raw.action==='rename'){if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100)throw Error('Use a project name of 1–100 characters.');p.name=raw.name.trim();}
 else if(raw.action==='archive')p.workspace.status='archived';else if(raw.action==='restore')p.workspace.status='active';else if(raw.action==='template')p.workspace.reusableTemplate=raw.enabled===true;else throw Error('Unknown project lifecycle action.');
 p.workspace.lifecycle??=[];p.workspace.lifecycle.push({action:raw.action,at,actor});const result=await saveStoredProject(env,owner,project,p,row.revision,at,stored.keys,()=>[],{allowMissing:true});if(!result.meta?.changes)return json({error:'The project changed while saving.',conflict:true},409);return json({document:missing?withFinalReview(p):p,revision:row.revision+1,updatedAt:at});
 }catch(e){return errorResponse(e,400,{route:'/api/lifecycle',owner,project});}
}
