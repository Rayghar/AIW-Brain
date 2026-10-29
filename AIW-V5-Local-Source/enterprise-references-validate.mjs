// Declared shared-service dependencies travel the existing signed library,
// project adoption and guidance-use trail. These tests use the actual Worker.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {enterpriseDefinition,enterpriseReferences,enterpriseReferencePreview,enterpriseTargets} from './public/enterprise-references.js';
import {refreshOrganizationAssurance} from './organization-service.js';

const checks=[],pass=text=>{checks.push(text);console.log('PASS',text);};
const owner='service-author',editor='project-editor',reviewer='independent-reviewer',reader='project-viewer',member='private-project-owner';
const asset={type:'Shared API',owner:'Search platform',version:'1.0',lifecycle:'Active',boundary:'Query retained catalogue records.',interfaceReference:'GET /search version 1',failureDomain:'Shared search pool'};
const definition={kind:'standard',title:'Shared catalogue search',content:'The service returns a bounded page of permitted records.',conditions:'For authenticated service consumers.',limitations:'No availability or capacity is implied by this declaration.',lifecycle:'Retain the supported version during explicit consumer migration.',source:{location:'Search contract §2',passage:'Queries return at most 100 visible records per page.',revision:'contract-1',licence:'Internal use'},asset};
for(const change of [{conditions:'Only pre-production consumers.'},{limitations:'No confidential records.'},{lifecycle:'Migrate before November.'},{source:{...definition.source,hash:'different'}}])assert.notEqual(enterpriseDefinition({...definition,source:{...definition.source,hash:'original'}}),enterpriseDefinition({...definition,...change}),'source, applicability and limitations are part of the service contract basis');

const dir=await mkdtemp(tmpdir()+'/aiw-enterprise-references-'),env={DB:localDatabase(dir+'/test.sqlite'),FILES:localFiles(dir+'/files'),ASSETS:{fetch:()=>new Response('ok')}};
async function api(path,raw,actor=owner){const response=await worker.fetch(new Request('https://aiw.test'+path,{headers:{'oai-authenticated-user-id':actor,Origin:'https://aiw.test',...(raw?{'Content-Type':'application/json'}:{})},...(raw?{method:'POST',body:JSON.stringify(raw)}:{})}),env);return {status:response.status,data:await response.json()};}
const ok=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.data));return response.data;};
const load=async(id,actor=owner)=>ok(await api('/api/project?project='+id,null,actor));
async function command(id,type,payload,actor=owner){const state=await load(id,actor);return ok(await api('/api/commands?project='+id,{revision:state.revision,command:{type,payload}},actor));}
async function create(name,actor=owner){const state=ok(await api('/api/projects',{name,template:'blank'},actor),201),id=state.document.id;await command(id,'realisation.component',{title:name+' consumer',kind:'service',purpose:'Resolve a permitted search request.',boundary:'Consumer request coordination.',owner:'Consumer team',inputs:'Search expression',outputs:'Search results',rationale:'Use the signed shared search contract.',source:'Synthetic architecture workshop',technologyNeeds:'Request execution',decisionIds:[],dataIds:[],allocations:[]},actor);return id;}
let organization,base,entryId;
const library=async()=>ok(await api(base+'library')).entries.find(e=>e.id===entryId);
async function edit(changes){const e=await library();ok(await api(base+'library',{...e,...changes}));return library();}
async function review(outcome='approved'){const e=await library();ok(await api(base+'review',{id:entryId,revision:e.revision,outcome,reviewed:true,rationale:'Reviewed source and service applicability.',evidence:'Retained contract and ownership review.'},reviewer));}
async function release(title){await review();return ok(await api(base+'releases',{title,entryIds:[entryId],reviewed:true}),201).release;}
async function install(id,releaseId,actor=owner){const state=await load(id,actor);return api(base+'install&project='+id,{revision:state.revision,releaseId,reviewed:true},actor);}
function dependency(state,extra={}){const p=state.document,entry=p.workbench.catalogue.find(e=>e.organization?.entryId===entryId);return {entryId:entry.id,targetId:p.realisation.components[0].id,environmentId:'',expectedVersion:entry.asset?.version||'',scope:'Search the consumer’s permitted records.',contract:'GET /search; original caller identity; bounded page.',critical:true,...extra};}
async function link(id,extra={},actor=owner){const state=await load(id,actor),raw=dependency(state,extra),q=enterpriseReferencePreview(state.document,raw);return api(base+'dependency&project='+id,{...raw,revision:state.revision,stamp:q.stamp,reviewed:true,reason:'Reviewed this consumer against the retained signed service contract.'},actor);}

try{
 organization=ok(await api('/api/organizations?action=create',{title:'Shared service practice',purpose:'Retain reviewed service contracts.'}),201).id;base='/api/organizations?organization='+organization+'&action=';
 for(const [actorId,role]of [[reviewer,'reviewer'],[editor,'editor'],[reader,'reader'],[member,'editor']])ok(await api(base+'members',{actorId,role}));
 entryId=ok(await api(base+'library',definition)).id;
 const initial=await library();assert.equal(initial.status,'draft');assert.equal((await api(base+'review',{id:entryId,revision:initial.revision,outcome:'approved',reviewed:true,rationale:'Self review',evidence:'Claim'})).status,403);
 assert.equal((await api(base+'releases',{title:'Unreviewed',entryIds:[entryId],reviewed:true})).status,400);
 const first=await release('Search contract 1');assert.match(first.signature,/^[a-f0-9]{64}$/);
 const project=await create('Visible consumer'),privateProject=await create('PRIVATE PROJECT MUST STAY PRIVATE',member),editorProject=await create('Editor adoption');
 for(const [actorId,role]of [[editor,'editor'],[reader,'viewer']])ok(await api('/api/access?project='+project,{actorId,role}));
 ok(await api('/api/access?project='+editorProject,{actorId:editor,role:'editor'}));
 const before=await load(project);assert.equal((await api(base+'install&project='+project,{revision:before.revision,releaseId:first.id,reviewed:false})).status,400);
 ok(await install(project,first.id));ok(await install(privateProject,first.id,member));ok(await install(editorProject,first.id,editor));
 const adopted=await load(project),pin=adopted.document.workbench.catalogue.find(e=>e.organization?.entryId===entryId);
 assert.deepEqual(adopted.document.realisation,before.document.realisation,'install creates guidance and evidence only');assert.equal(pin.organization.assurance.eligible,true);assert.equal(pin.organization.lifecycle,definition.lifecycle);assert.equal(enterpriseDefinition(pin),enterpriseDefinition(await library()));
 assert.equal((await api(base+'install&project='+project,{revision:before.revision,releaseId:first.id,reviewed:true})).status,409);
 const latest=await load(project);assert.equal((await api(base+'install&project='+project,{revision:latest.revision,releaseId:first.id,reviewed:true},reader)).status,403);
 assert.equal((await api(base+'library',null,'outsider')).status,404);assert.equal((await api('/api/project?project='+project,null,'outsider')).status,404);
 pass('real Worker requires independent exact-entry review, signed release, deliberate CAS adoption and project/org edit access; adoption changes no native consumer');

 const raw=dependency(adopted),preview=enterpriseReferencePreview(adopted.document,raw);
 assert.equal((await api(base+'dependency&project='+project,{...raw,revision:adopted.revision,stamp:preview.stamp,reviewed:false,reason:'Not reviewed'})).status,400);
 assert.equal((await api(base+'dependency&project='+project,{...raw,revision:adopted.revision,stamp:'wrong',reviewed:true,reason:'Wrong stamp'})).status,400);
 assert.equal((await api(base+'dependency&project='+project,{...raw,revision:adopted.revision,stamp:preview.stamp,reviewed:true,reason:'Reader must not write'},reader)).status,403);
 ok(await link(project,{},editor));ok(await link(privateProject,{},member));
 let current=await load(project),refs=enterpriseReferences(current.document),useId=refs[0].id;
 assert.equal(refs.length,1);assert.equal(refs[0].current,true);assert.equal(refs[0].actor,editor);assert.equal(refs[0].expectedVersion,'1.0');assert.equal(current.document.realisation.components.length,1);
 assert.deepEqual(enterpriseReferences((await load(project)).document),refs,'a durable read preserves the declaration');
 assert.throws(()=>enterpriseReferencePreview(current.document,dependency(current)),/already names/);
 const proposed=structuredClone(current.document);proposed.realisation.components[0].state='proposed';assert(!enterpriseTargets(proposed).some(t=>t.id===raw.targetId));
 const changedSnapshot=structuredClone(current.document);changedSnapshot.workbench.guidanceUses[0].entry.asset.version='fabricated';assert.equal(enterpriseReferences(changedSnapshot)[0].current,false,'a modified captured dependency cannot inherit signed authority');
 const impact=ok(await api(base+'dependencies&entry='+entryId));assert.deepEqual(impact.projects.map(p=>p.projectId),[project]);assert(!JSON.stringify(impact).includes(privateProject));assert(!JSON.stringify(impact).includes('PRIVATE PROJECT MUST STAY PRIVATE'));
 assert.deepEqual(ok(await api(base+'dependencies&entry='+entryId,null,reader)).projects.map(p=>p.projectId),[project]);
 ok(await api('/api/access?project='+privateProject,{actorId:owner,role:'viewer'},member));assert(ok(await api(base+'dependencies&entry='+entryId)).projects.some(p=>p.projectId===privateProject));
 ok(await api('/api/access?project='+privateProject,{actorId:owner,role:'remove'},member));assert(!ok(await api(base+'dependencies&entry='+entryId)).projects.some(p=>p.projectId===privateProject));
 pass('explicit consumer dependencies survive reload, retain authenticated authors and exact scope, reject forged/stale previews, and disclose only explicitly accessible projects');

 const open=await load(project),openRaw=dependency(open,{usageId:useId}),openPreview=enterpriseReferencePreview(open.document,openRaw);
 const consumer=open.document.realisation.components[0];await command(project,'realisation.component',{...consumer,boundary:'Changed consumer request boundary.',allocations:[]});
 assert.equal((await api(base+'dependency&project='+project,{...openRaw,revision:open.revision,stamp:openPreview.stamp,reviewed:true,reason:'Stale revision'},editor)).status,409);
 current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,false);
 assert.equal((await api(base+'dependency&project='+project,{...openRaw,revision:current.revision,stamp:openPreview.stamp,reviewed:true,reason:'Stale preview'},editor)).status,400);
 ok(await link(project,{usageId:useId},editor));current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,true);assert.equal(current.document.workbench.guidanceUses[0].history.length,1);
 // A byte-valid signed pin must still preserve its source and applicability locally.
 for(const mutate of [p=>{p.workbench.catalogue[0].organization.conditions='Invented permission';},p=>{const e=p.workbench.catalogue[0];p.coauthoring.sources.find(s=>s.id===e.sourceId).versions.at(-1).location='Different source';},p=>{const e=p.workbench.catalogue[0];p.coauthoring.sources.find(s=>s.id===e.sourceId).versions.at(-1).version='different-revision';}]){const changed=structuredClone(current.document);mutate(changed);await refreshOrganizationAssurance(env,owner,changed);assert.equal(changed.workbench.catalogue[0].organization.assurance.eligible,false,'local provenance drift cannot remain signed');assert.equal(enterpriseReferences(changed)[0].current,false);}
 const source=current.document.coauthoring.sources.find(s=>s.id===current.document.workbench.catalogue[0].sourceId),v=source.versions.at(-1);
 await command(project,'evidence.source',{...v,id:source.id,location:'Different source',status:'Unconfirmed'});current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,false);
 await command(project,'evidence.source',{...v,id:source.id,status:'Unconfirmed'});assert.equal(enterpriseReferences((await load(project)).document)[0].current,true,'exact source restoration is distinguishable from changed content');
 pass('native consumer edits reopen a dependency, stale CAS and stale retained previews are rejected, and local source/applicability drift loses signed authority');

 await edit({conditions:'Only pre-production with pseudonymous records.'});current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,false,'applicability change reopens the consumer even when prose/asset are unchanged');
 assert.throws(()=>enterpriseReferencePreview(current.document,dependency(current,{usageId:useId})),/changed|current|Adopt/);
 const second=await release('Search contract 1 revised applicability');ok(await install(project,second.id));current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,false,'adoption does not review an existing dependency');
 ok(await install(project,first.id));current=await load(project);assert.equal(current.document.workbench.catalogue[0].organization.releaseId,first.id,'a historical pin is not mistaken for the currently adopted release');assert.equal(enterpriseReferences(current.document)[0].current,false);ok(await install(project,second.id));
 ok(await link(project,{usageId:useId}));assert.equal(enterpriseReferences((await load(project)).document)[0].current,true);
 await edit({asset:{...asset,version:'2.0'},content:'The service now returns cursor-based search pages.'});const third=await release('Search contract 2');ok(await install(project,third.id));
 current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,false);assert.throws(()=>enterpriseReferencePreview(current.document,dependency(current,{usageId:useId,expectedVersion:'1.0'})),/expected service version/);
 ok(await link(project,{usageId:useId}));assert.equal(enterpriseReferences((await load(project)).document)[0].expectedVersion,'2.0');
 await edit({asset:{...asset,version:'2.0',lifecycle:'Retired'}});const retired=await release('Search retirement');ok(await install(project,retired.id));current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,false);assert.throws(()=>enterpriseReferencePreview(current.document,dependency(current,{usageId:useId})),/[Rr]etired/);
 assert.equal((await api(base+'dependency&project='+project,{revision:current.revision-1,usageId:useId,retire:true,reviewed:true,reason:'Removed from consumer'})).status,409);
 ok(await api(base+'dependency&project='+project,{revision:current.revision,usageId:useId,retire:true,reviewed:true,reason:'Consumer no longer uses the retired service.'}));current=await load(project);assert.equal(enterpriseReferences(current.document).length,0);assert.equal(current.document.workbench.guidanceUses[0].retired.actor,owner);assert(current.document.workbench.guidanceUses[0].history.length>=3);
 pass('applicability, contract version and lifecycle changes reopen declarations; new release adoption never reapproves a consumer; deliberate CAS retirement preserves the trail');

 // Removing the shared identity turns the same library entry into guidance.
 await edit({asset:null});const guidance=await release('Reference guidance only');ok(await install(project,guidance.id));current=await load(project);const removed=current.document.workbench.catalogue.find(e=>e.organization?.entryId===entryId);assert.equal(removed.asset,undefined);assert.equal(removed.organization.assurance.eligible,true,'a removed asset must not survive from the previous pin');const previousImpact=ok(await api(base+'dependencies&entry='+entryId,null,member));assert.equal(previousImpact.projects[0].projectId,privateProject);assert.equal(previousImpact.projects[0].dependencies[0].current,false,'removing a shared asset leaves its dependent consumers visible for review');
 await edit({asset});const restored=await release('Restored service contract');ok(await install(project,restored.id));ok(await link(project));
 await review('withdrawn');current=await load(project);assert.equal(enterpriseReferences(current.document)[0].current,false);assert.equal(current.document.workbench.catalogue.find(e=>e.organization?.entryId===entryId).organization.assurance.eligible,false);
 assert.equal((await install(editorProject,restored.id,editor)).status,400);assert.equal((await install(project,restored.id)).status,400,'an already adopted but withdrawn release cannot be re-adopted as unchanged');assert.throws(()=>enterpriseReferencePreview(current.document,dependency(current,{usageId:enterpriseReferences(current.document)[0].id})),/Adopt/);
 ok(await api(base+'members',{actorId:editor,role:'remove'}));assert.equal((await api(base+'dependencies&entry='+entryId,null,editor)).status,404);assert.equal((await api(base+'dependency&project='+project,{revision:current.revision,reviewed:true,reason:'Former member'},editor)).status,404);
 pass('removing shared identity clears old asset metadata, withdrawal invalidates retained consumers and blocks adoption, and removed membership grants no enterprise access');
 console.log(JSON.stringify({suite:'enterprise references',passed:checks.length,checks},null,2));
}finally{env.DB.close();await rm(dir,{recursive:true,force:true});}
