// A review desk switch point opened in Proposals: the options of one Chapter 7 realisation side by
// side, weighed against the drivers they carry, with what each product is documented to do and the
// project's governed claims about it. Claims come only from active, eligible project releases — those
// linked to the realisation or an option, or naming the product — and ineligible ones are listed with
// their reasons. Nothing here chooses a product: the choice is Chapter 7's, framed in Chapter 3.
import {knowledgeState,releasedClaims,claimReceipt} from './knowledge-governance.js';
import {traitsFor,playbookNames,operatingTrait,ceilingOf} from './product-knowledge.js';
import {productsAvailable,playbookAvailable} from './model-knowledge.js';
import {choiceForDesign,describeChoice} from './product-choice.js';
import {list} from './util.js';

const names=product=>{const n=String(product||'').trim(),res=traitsFor(n).map(t=>t.product),plain=n.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 return value=>{const v=String(value||'');return res.some(re=>re.test(v))||(plain.length>=4&&(' '+v.toLowerCase().replace(/[^a-z0-9]+/g,' ')+' ').includes(' '+plain+' '));};};

export function productComparison(p,realisationId){
 const C=choiceForDesign(p,realisationId);if(!C)return null;
 const s=knowledgeState(p),released=releasedClaims(p),mechanisms=productsAvailable(p),playbook=playbookAvailable(p);
 const framing=list(p?.decisions?.records).find(d=>String(d.source||'').startsWith('Review desk switch point · '+(C.record.ref||C.record.id)));
 const options=C.options.map(o=>{
  const product=o.option.product||o.option.title,named=names(product);
  const linkIds=new Set(s.links.filter(l=>l.status!=='retired'&&[C.record.id,o.option.id].includes(l.objectId)).map(l=>l.receipt.releaseId+':'+l.receipt.claimId));
  const hits=released.filter(h=>linkIds.has(h.release.id+':'+h.claim.id)||[h.claim.subjectId,h.claim.statement,h.claim.predicate,...list(h.claim.tags)].some(named));
  const unique=[...new Map(hits.map(h=>[h.release.id+':'+h.claim.id,h])).values()];
  const scope=o.claims;
  const allowed=new Map(scope.matches.map(h=>[h.receipt.releaseId+':'+h.receipt.claimId,h]));
  const inScope=h=>!h.claim.architectureUnit||allowed.has(h.release.id+':'+h.claim.id);
  // Round 25 (D-25-11): on the recorded judgements, the range the unjudged criteria could move the total to, and the
  // option that dominates this one (named), as the comparison table shows them (choice-ui.js).
  const by=o.dominatedBy&&C.options.find(x=>x.option.id===o.dominatedBy)?.option;
  return {option:o.option,product,reading:o.reading,lean:C.leanAll===o.option.id,score:o.score,recordedScore:o.recordedScore,bounds:o.bounds,applicability:o.applicability,dominatedBy:by?{id:by.id,product:by.product||by.title}:null,
   mechanisms:o.mechanisms.map(t=>({id:t.id,effect:t.effect,attrs:t.attrs,text:t.text,src:t.src,applicability:t.applicability,sourceKind:t.sourceKind,receipt:t.receipt,obligations:t.obligations,placement:t.placement})),
   playbook:playbook?playbookNames(product):[],operating:operatingTrait(o.option.operatingModel),ceiling:o.mechanisms.some(m=>m.effect==='ceiling'&&m.applicability.state==='context-match')?ceilingOf(product):null,
   claims:unique.filter(h=>h.eligible&&inScope(h)).map(h=>({claim:h.claim,release:h.release,receipt:claimReceipt(p,h.claim,h.release),applicability:allowed.get(h.release.id+':'+h.claim.id)?.applicability,linked:linkIds.has(h.release.id+':'+h.claim.id)})),
   excluded:unique.filter(h=>!h.eligible||!inScope(h)).map(h=>({id:h.claim.id,release:h.release.id,reasons:[...h.reasons,...(!inScope(h)?['Outside the saved product, capability or configuration scope.']:[])]}))};
 });
 return {C,record:C.record,reading:describeChoice(C),switchPoint:!!C.revisit,framing:framing?{id:framing.id,question:framing.question}:null,options,mechanismsWithdrawn:!mechanisms,playbookWithdrawn:!playbook};
}
