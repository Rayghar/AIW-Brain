import {acceptedObligationFixture,linkedAction,reviewCommand,verificationPayload,obligationAt} from './architecture-obligation-fixtures.mjs';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {architectureObligationsFor,architectureEvidenceSources} from './public/architecture-obligations.js';
import {verificationContext,verificationEvidence} from './public/architecture-verification.js';
import {digest} from './public/brain-integrity.js';
export {obligationAt};
export const verificationSource={title:'Synthetic timed exercise',location:'fixture://verification/deadline',excerpt:'Synthetic observation: the caller deadline was measured under the declared test load. These fixtures establish no production result.',status:'Confirmed',confirmedBy:'Synthetic evidence reviewer',reviewed:true};
export function verificationFixture({action=true,kind='metric',expected=250,unit='ms'}={}){
 let p=acceptedObligationFixture();
 p=applyRuntimeCommand(p,{type:'runtime.environment',payload:{title:'Synthetic acceptance environment',assetIds:[p.realisation.components[0].id],purpose:'Synthetic typed-check verification',owner:'Synthetic operator'}},obligationAt).document;
 p=applyEvidenceCommand(p,{type:'evidence.source',payload:verificationSource},obligationAt,'synthetic-operator').document;
 const contract={version:1,kind,metric:kind==='metric'?'95th percentile caller duration':'Original operation identity retained',operator:kind==='metric'?'at-most':'equals',expected,unit:kind==='metric'?unit:'',environmentId:p.runtime.environments.at(-1).id,release:'synthetic-release-1',procedure:'Run the declared workload and retain the original observation with its release, environment and procedure.'};
 if(action)p=reviewCommand(p,'action',{...linkedAction(p,architectureObligationsFor(p)[0]),verificationContract:contract});
 return {p,contract};
}
export function observationPayload(p,value=200,overrides={}){
 const a=p.finalReview.actions.at(-1),receipt=verificationContext(p,a).receipt,source=p.coauthoring.sources[0],version=source.versions.at(-1);
 return {kind:'test-result',title:'Synthetic caller exercise',statement:'Recorded synthetic observation for command and UI verification.',status:'Source says passed',owner:'Synthetic operator',release:receipt.release,environment:receipt.environmentName,cycle:'Synthetic retained exercise',observedAt:obligationAt,requirementIds:receipt.requirementIds,objectIds:receipt.objectIds,sourceId:source.id,verificationSource:{id:source.id,revision:version.revision,hash:digest(version)},verificationObservation:{...receipt,value,unit:receipt.contract.unit},verificationCurrent:true,reviewed:false,reviewer:'',reviewNote:'',...overrides};
}
export function comparisonReviewPayload(p){
 const a=p.finalReview.actions.at(-1),ids=[...new Set((p.assurance?.records||[]).filter(r=>r.verificationObservation?.actionId===a.id).map(r=>r.sourceEvidence?.id).filter(Boolean))],sources=architectureEvidenceSources(p,ids.map(id=>({sourceId:id,revision:p.coauthoring.sources.find(s=>s.id===id).versions.at(-1).revision})));
 return {...verificationPayload(p,a.id,sources),verificationEvidence:verificationEvidence(p,a)};
}
