import {readyComposition,arc} from './composition-fixtures.mjs';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {applyFinalReviewCommand} from './public/review-domain.js';
import {architectureObligationAction,architectureActionStamp} from './public/architecture-obligations.js';
export const obligationAt='2026-10-20T18:00:00.000Z';
export const reviewCommand=(p,type,payload,actor='synthetic-reviewer')=>applyFinalReviewCommand(p,{type:'review.'+type,payload},obligationAt,actor).document;
export function acceptedObligationFixture(){
 const prepared=arc(readyComposition('resilience'),'architecture.prepare',{optionId:'protected-call'}),alternative=prepared.document.modelAlternatives.records.find(a=>a.id===prepared.selected),preview=previewAlternative(prepared.document,alternative);
 let p=applyAlternativeCommand(prepared.document,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Synthetic architect',reason:'Exercise an accepted caller policy and exact verification duties.'}},obligationAt).document;
 const id=p.technologyRealisation.records[0].id,tech=(type,payload)=>{p=applyTechnologyRealisationCommand(p,{type:'techrealisation.'+type,payload:{id,...payload}},obligationAt).document;};
 for(const label of ['A','B'])tech('option',{option:{title:'Synthetic implementation '+label,product:'Synthetic fixture '+label,version:'1',operatingModel:'Self managed',replicaCount:'2',configurationFacts:{'fixture.protected':true}}});
 tech('plan',{owner:'Synthetic service owner',purpose:'Provide the protected caller policy.',rationale:'Synthetic currentness test only; no claim of product suitability.'});
 tech('preference',{optionId:p.technologyRealisation.records[0].options[0].id});tech('record',{reviewed:true});
 return p;
}
export function linkedAction(p,obligation){return {...architectureObligationAction(p,obligation.reference),owner:'Synthetic delivery owner',due:'2026-11-01'};}
export function verificationPayload(p,id,evidenceSources=[]){const a=p.finalReview.actions.find(a=>a.id===id);return {id,status:'Verified',progress:'Synthetic exercise: original identity retained and one authoritative effect observed.',reviewer:'Synthetic evidence reviewer',reference:'fixture://observations/original-identity',reviewed:true,architectureObligation:a.architectureObligation,actionStamp:architectureActionStamp(a),evidenceSources};}
