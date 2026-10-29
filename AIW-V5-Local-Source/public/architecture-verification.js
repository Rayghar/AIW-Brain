// A typed check belongs to an existing delivery action. Observations stay in the
// existing assurance records; comparison never records approval or changes design.
import {digest} from './brain-integrity.js';
import {architectureObligationBasis,architectureActionStamp} from './architecture-obligation-basis.js';
import {readContent} from './source-fingerprint.js';

const list=v=>Array.isArray(v)?v:[],ids=v=>[...new Set(list(v))].sort(),same=(a,b)=>digest(a)===digest(b);
const text=(v,label,n=180)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>n)throw Error('Record '+label+' (1–'+n+' characters).');return v.trim();};
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15;
export const VERIFICATION_OPERATORS=Object.freeze({'at-most':'At most','at-least':'At least',equals:'Equals'});
export const VERIFICATION_LABELS=Object.freeze({pass:'Comparison passes',fail:'Comparison fails',unknown:'Comparison incomplete',stale:'Earlier basis — review needed'});
function definition(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||!['metric','assertion'].includes(raw.kind))throw Error('Choose a metric or a true/false assertion using check version 1.');
 const metric=text(raw.metric,'the metric or assertion',120),operator=raw.operator,expected=raw.expected;
 if(!Object.hasOwn(VERIFICATION_OPERATORS,operator))throw Error('Choose a supported comparison operator.');
 if(raw.kind==='metric'&&!finite(expected))throw Error('A metric threshold must be a finite number between −10¹⁵ and 10¹⁵.');
 if(raw.kind==='assertion'&&(typeof expected!=='boolean'||operator!=='equals'||raw.unit))throw Error('A true/false assertion uses Equals, a boolean expectation and no unit.');
 return {version:1,kind:raw.kind,metric,operator,expected,unit:raw.kind==='metric'?text(raw.unit,'the exact measurement unit',40):'',environmentId:text(raw.environmentId,'an existing environment ID',100),release:text(raw.release,'the implementation release'),procedure:text(raw.procedure,'the procedure and scope of this check',2000)};
}
export function normaliseVerificationContract(p,action,raw){
 if(raw==null||raw==='')return null;
 const c=definition(raw),basis=architectureObligationBasis(p,action?.architectureObligation);
 if(action?.state==='proposed'||!basis.ready||action?.architectureObligation?.basisStamp!==basis.stamp)throw Error('Link and review the current accepted architecture obligation before defining its check.');
 if(!list(p.runtime?.environments).some(e=>e.id===c.environmentId))throw Error('Choose an existing runtime environment for this check.');
 return c;
}
export function verificationContext(p,action){
 if(!action?.verificationContract)return {ready:false,reason:'No typed verification check is defined.',contract:null,receipt:null};
 try{
  const contract=normaliseVerificationContract(p,action,action.verificationContract),basis=architectureObligationBasis(p,action.architectureObligation),environment=list(p.runtime?.environments).find(e=>e.id===contract.environmentId);
  const solution=list(p.coauthoring?.designTasks).find(t=>t.id===action.architectureObligation.taskId)?.applied?.reasoningGraph?.solution;
  const objectIds=ids(action.objectIds),requirementIds=ids(solution?.requirementIds);
  if(!objectIds.length||!requirementIds.length||requirementIds.some(id=>!list(p.artefacts).some(r=>r.id===id&&r.type==='requirement')))throw Error('The accepted check needs its exact objects and requirements.');
  const actionStamp=architectureActionStamp(action),contractStamp=digest(contract),basisStamp=digest({projectId:p.id,obligation:basis.stamp,action:actionStamp,environment:readContent(environment),objectIds,requirementIds});
  const receipt={version:1,projectId:p.id,actionId:action.id,actionStamp,contractStamp,basisStamp,contract,objectIds,requirementIds,environmentId:environment.id,environmentName:environment.title,release:contract.release};
  return {ready:true,reason:'Explicit check against the accepted architecture and named implementation scope.',contract,receipt};
 }catch(e){return {ready:false,reason:e.message,contract:action.verificationContract,receipt:null};}
}
// A portable observation must carry the exported receipt. A stale receipt may
// be retained as historical evidence, but cannot become a current comparison.
export function normaliseVerificationObservation(p,record,raw){
 if(raw==null)return null;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||raw.projectId!==p.id)throw Error('The verification observation must name this exact project and supported receipt version.');
 if(!['test-result','observation'].includes(record.kind))throw Error('Only a test result or observation can carry a verification comparison.');
 const action=list(p.finalReview?.actions).find(a=>a.id===raw.actionId);
 if(!action?.architectureObligation||!action.verificationContract)throw Error('Choose an existing architecture delivery action with a typed check.');
 const contract=definition(raw.contract),objectIds=ids(raw.objectIds),requirementIds=ids(raw.requirementIds);
 if(!objectIds.length||!requirementIds.length||list(record.requirementGroupIds).length||!same(objectIds,ids(record.objectIds))||!same(requirementIds,ids(record.requirementIds)))throw Error('The observation must retain the check’s exact object and requirement scope.');
 if(raw.environmentId!==contract.environmentId||raw.release!==contract.release||record.release!==raw.release||![raw.environmentId,raw.environmentName].includes(record.environment))throw Error('The observation release and environment must match its captured check.');
 if(!list(p.runtime?.environments).some(e=>e.id===raw.environmentId))throw Error('The observed environment is unavailable in this project.');
 for(const k of ['actionStamp','contractStamp','basisStamp'])if(!/^[a-f0-9]{64}$/.test(raw[k]||''))throw Error('Retain the exact exported '+k+' of the check.');
 if(digest(contract)!==raw.contractStamp)throw Error('The captured check does not match its contract stamp.');
 const value=raw.value===undefined?null:raw.value,unit=typeof raw.unit==='string'?raw.unit.trim():'';
 if(value!==null&&(contract.kind==='metric'?!finite(value):typeof value!=='boolean'))throw Error('Supply an observed number or boolean matching the check type; leave an unknown value empty.');
 if(unit.length>40||contract.kind==='assertion'&&unit)throw Error('Use the exact metric unit, or no unit for a true/false assertion.');
 return {version:1,projectId:p.id,actionId:action.id,actionStamp:raw.actionStamp,contractStamp:raw.contractStamp,basisStamp:raw.basisStamp,contract,objectIds,requirementIds,environmentId:raw.environmentId,environmentName:text(raw.environmentName,'the captured environment name'),release:raw.release,value,unit};
}
export function verificationResult(p,record){
 const o=record?.verificationObservation;if(!o)return null;
 const action=list(p.finalReview?.actions).find(a=>a.id===o.actionId),context=verificationContext(p,action),c=o.contract||{};
 const result=(state,reason)=>({state,label:VERIFICATION_LABELS[state],reason,actionId:o.actionId,metric:c.metric||'Verification check',operator:c.operator,expected:c.expected,observed:o.value??null,unit:c.unit||'',observedUnit:o.unit||'',reviewed:record.reviewed===true,scope:{projectId:o.projectId,objectIds:o.objectIds,requirementIds:o.requirementIds,environmentId:o.environmentId,environment:o.environmentName,release:o.release,procedure:c.procedure},sourceId:record.sourceEvidence?.id||null});
 try{normaliseVerificationObservation(p,record,o);}catch(e){return result('stale',e.message);}
 if(!context.ready||!same({...context.receipt,value:o.value,unit:o.unit},o))return result('stale',context.ready?'The action, architecture, environment or captured check changed. Record a new observation against the current check.':context.reason);
 const source=record.sourceEvidence,version=list(p.coauthoring?.sources).find(s=>s.id===source?.id)?.versions?.at(-1);
 if(!source)return result('unknown','Attach the original evidence source before comparing this reported observation.');
 if(!version||version.revision!==source.revision||digest(version)!==source.hash)return result('stale','The original evidence source changed or is unavailable. The captured observation remains historical.');
 if(o.value===null)return result('unknown','The observation has no measured or asserted value.');
 if(c.kind==='metric'&&o.unit!==c.unit)return result('unknown','The observed unit differs from the expected unit. No implicit conversion is applied.');
 const pass=c.operator==='at-most'?o.value<=c.expected:c.operator==='at-least'?o.value>=c.expected:o.value===c.expected;
 return result(pass?'pass':'fail',c.metric+': expected '+VERIFICATION_OPERATORS[c.operator].toLowerCase()+' '+String(c.expected)+(c.unit?' '+c.unit:'')+'; observed '+String(o.value)+(o.unit?' '+o.unit:'')+'. This comparison does not approve the architecture or independently verify the supplied evidence.');
}
export function verificationForAction(p,action){
 if(!action?.verificationContract)return null;
 const records=list(p.assurance?.records).filter(r=>r.verificationObservation?.actionId===action?.id).map(r=>({id:r.id,...verificationResult(p,r)})),current=records.filter(r=>r.state!=='stale');
 const state=!verificationContext(p,action).ready?'stale':current.some(r=>r.state==='fail')?'fail':current.some(r=>r.state==='unknown')?'unknown':current.length?'pass':records.length?'stale':'unknown';
 return {state,label:VERIFICATION_LABELS[state],records,reasons:records.length?records.map(r=>r.reason):['No observation is linked to this check.']};
}
// Captured by the existing delivery review, never by a numerical comparison.
// A later edit, new current result or changed source reopens that review.
export function verificationEvidence(p,action){
 return list(p.assurance?.records).filter(r=>r.verificationObservation?.actionId===action.id&&verificationResult(p,r)?.state!=='stale').map(r=>({id:r.id,revision:r.revision,stamp:digest(r)})).sort((a,b)=>a.id.localeCompare(b.id));
}
export function verificationPackage(p){
 return {schema:'aiw.verification.v1',projectId:p.id,checks:list(p.finalReview?.actions).filter(a=>a.verificationContract&&a.state!=='proposed').map(a=>({id:a.id,title:a.title,owner:a.owner,...verificationContext(p,a)})),authority:'Reviewable expected checks. Return observations through aiw.delivery.v1; no tests, approvals or deployments are performed by this export.'};
}
