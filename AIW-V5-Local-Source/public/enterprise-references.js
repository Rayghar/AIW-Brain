// Shared dependencies are uses of signed organisation entries, not copied local services.
// The existing workbench guidance-use trail owns the link; this is a read projection.
import {digest} from './brain-integrity.js';
const paths=['artefacts','logical.responsibilities','realisation.components','technology.capabilities','technologyRealisation.records','interfaces.contracts','interfaces.data','runtime.plans'];
export const SHARED_ASSET_TYPES=['Shared service','Shared API','Data platform','Enterprise capability'];
export const enterpriseIdentity=(organizationId,entryId)=>'enterprise:'+organizationId+':'+entryId;
export function enterpriseTargets(p){return paths.flatMap(path=>{const [a,b]=path.split('.');return (b?p[a]?.[b]:p[a]||[])?.filter?.(r=>r.state!=='proposed'&&r.state!=='retired').map(r=>({id:r.id,title:r.title||r.id,path,record:r}))||[];});}
export function enterpriseTargetStamp(record){const {history,provenance,sourceSnapshot,revision,...definition}=record||{};return digest(definition);}
export function enterpriseDefinition(entry){const org=entry?.organization;return digest({kind:entry?.kind||'',content:entry?.content||'',asset:entry?.asset||null,conditions:org?.conditions??entry?.conditions??'',limitations:org?.limitations??entry?.limitations??'',lifecycle:org?.lifecycle??entry?.lifecycle??'',sourceHash:org?.sourceHash??entry?.source?.hash??'',reviewDue:org?.reviewDue??entry?.reviewDue??''});}
export function enterpriseReferences(p){const targets=new Map(enterpriseTargets(p).map(t=>[t.id,t]));return (p.workbench?.guidanceUses||[]).filter(u=>u.kind==='shared-dependency'&&!u.retired).map(u=>{
 const ref=u.dependency||{},org=u.entry?.organization||{},entry=p.workbench?.catalogue?.find(e=>e.organization?.id===org.id&&e.organization?.entryId===org.entryId),target=targets.get(u.targetId),a=entry?.organization?.assurance,asset=u.entry?.asset;
 const reasons=[];if(!target)reasons.push('The consuming record is missing or no longer authored.');else if(enterpriseTargetStamp(target.record)!==ref.targetStamp)reasons.push('The consuming definition changed after this dependency was reviewed.');
 if(ref.environmentId&&!p.runtime?.environments?.some(e=>e.id===ref.environmentId))reasons.push('The declared environment is unavailable.');
 if(!a?.eligible)reasons.push(a?.status||'The signed organisation source is unavailable.');
 if(ref.identity!==enterpriseIdentity(org.id,org.entryId)||org.releaseId!==ref.releaseId||enterpriseDefinition(u.entry)!==ref.definitionHash)reasons.push('The captured dependency differs from its reviewed service definition.');
 if(entry?.organization?.releaseId!==ref.releaseId)reasons.push('The project adopted a different release; review the dependency against it.');
 if(a?.latestDefinitionHash&&a.latestDefinitionHash!==ref.definitionHash)reasons.push('The shared service contract has changed in the organisation library.');
 if(a?.latestStatus==='withdrawn')reasons.push('The shared service was withdrawn.');
 if(asset?.lifecycle==='Retired')reasons.push('The pinned service contract is retired.');
 return {id:u.id,identity:ref.identity||enterpriseIdentity(org.id,org.entryId),title:u.entry?.title||org.entryId,organizationId:org.id,entryId:org.entryId,organizationTitle:org.title||'',targetId:u.targetId,targetTitle:target?.title||u.targetId,environmentId:ref.environmentId||'',releaseId:ref.releaseId,expectedVersion:ref.expectedVersion||'',critical:ref.critical===true,scope:ref.scope||'',contract:ref.contract||'',asset,definitionHash:ref.definitionHash,current:reasons.length===0&&!!a?.latestDefinitionHash,state:reasons.length?'Review required':a?.latestDefinitionHash?'Current declaration':'Source currentness unknown',reasons,at:u.at,actor:u.actor,source:'workbench.guidanceUses',authority:'Declared enterprise dependency; no live connection, capacity reservation or service health is inferred.'};
 });}
export function enterpriseReferencePreview(p,{entryId,targetId,environmentId='',expectedVersion='',scope='',contract='',critical=false,usageId=''}={}){
 const entry=p.workbench?.catalogue?.find(e=>e.id===entryId),org=entry?.organization,target=enterpriseTargets(p).find(t=>t.id===targetId),old=usageId?p.workbench?.guidanceUses?.find(u=>u.id===usageId&&u.kind==='shared-dependency'&&!u.retired):null;
 if(!entry?.asset||!org||!org.assurance?.eligible||entry.status!=='approved')throw Error('Adopt a verified signed release of this shared service first.');
 if(entry.asset.lifecycle==='Retired')throw Error('This shared service is retired. Review or retire its existing consumers.');
 if(org.assurance.latestDefinitionHash!==enterpriseDefinition(entry)||org.assurance.latestStatus==='withdrawn')throw Error('The shared service contract changed or its current source is unavailable. Adopt the current reviewed release before linking a consumer.');
 if(!target)throw Error('Choose an authored consuming object in this project.');
 if(environmentId&&!p.runtime?.environments?.some(e=>e.id===environmentId))throw Error('Choose an existing environment or leave the dependency at design scope.');
 if(!String(scope).trim()||!String(contract).trim())throw Error('State the dependency scope and the service contract this consumer relies on.');
 if(usageId&&(!old||old.entry?.organization?.id!==org.id||old.entry?.organization?.entryId!==org.entryId))throw Error('Choose the existing dependency on this shared service.');
 const identity=enterpriseIdentity(org.id,org.entryId);if((p.workbench?.guidanceUses||[]).some(u=>u.kind==='shared-dependency'&&!u.retired&&u.id!==usageId&&u.targetId===targetId&&u.dependency?.identity===identity&&u.dependency?.environmentId===environmentId))throw Error('This consumer already names the shared service in this environment. Revise that dependency.');
 const dep={identity,releaseId:org.releaseId,definitionHash:enterpriseDefinition(entry),targetStamp:enterpriseTargetStamp(target.record),environmentId,expectedVersion:String(expectedVersion).trim().slice(0,160),scope:String(scope).trim().slice(0,2000),contract:String(contract).trim().slice(0,2000),critical:critical===true};
 if(dep.expectedVersion&&dep.expectedVersion!==entry.asset.version)throw Error('The expected service version must match the adopted contract. Adopt the intended release before linking it.');
 return {entry,target,old,dependency:dep,stamp:digest([p.id,entry,old||null,target.record,dep])};
}
