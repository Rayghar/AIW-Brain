// Retrieval over the supplied repository, not a list of favoured patterns. A
// lexical signal identifies a question to examine; it never establishes fit.
import {knowledgeStructures,knowledgeStructureSource} from './knowledge-structure.js';
import {architectureClaimScope} from './architecture-knowledge.js';

const list=value=>Array.isArray(value)?value:[];
const fields=['title','description','purpose','summary','approach','scope','acceptance','scenario','consequence','stimulus','conditions','response','rationale','question','context','boundary','information','policy','enforcement','failureMode','failureResponse','recoveryStrategy','isolation','retryPolicy','idempotencyPolicy','deliverySemantics','orderingPolicy','impact','technologyNeeds','need','mechanism'];
const stop=new Set('the and for that this with from into its are was were have has what which should could would help explain review design recorded context model current using use system architecture must can will may shall might how each every needs need requires required requirement application component pattern style quality scenario relevant selected scope validate against project source conditions operational operating architecture support supports supported information behaviour approach when where before after about under over only other then than their there these those such through within without'.split(' '));
const words=value=>[...new Set((String(value||'').toLowerCase().match(/[a-z0-9]{3,}/g)||[]).map(s=>s.length>4&&s.endsWith('s')&&!s.endsWith('ss')?s.slice(0,-1):s).filter(s=>!stop.has(s)))];
const phrase=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const records=new WeakMap();
function indexed(record){
 const raw=record.record||record;let item=records.get(raw);if(item)return item;
 const names=[record.title,...list(raw.aliases)].map(phrase).filter(Boolean),nameTerms=new Set(names.flatMap(words));
 const text=[raw.summary,raw.problem,raw.statement,record.mechanism,...['context','conditions','prerequisites','risks','failureModes'].flatMap(k=>list(record[k]).map(x=>x.text)),...list(record.effects).map(x=>x.rationale)].filter(Boolean).join(' ');
 item={names,nameTerms,terms:new Set([...nameTerms,...words(text)]),text};records.set(raw,item);return item;
}

function passages(c,prompt){
 const nodes=[c.selected,...list(c.requirements),...list(c.drivers),...list(c.decisions)],seen=new Set(),out=[];
 for(const node of nodes){
  if(!node||seen.has(node.id))continue;seen.add(node.id);
  for(const field of fields){const value=field==='title'?node.title:node.record?.[field];if(typeof value!=='string')continue;
   for(const excerpt of value.split(/[.!?;\n]+/).map(s=>s.trim()).filter(Boolean))out.push({objectId:node.id,title:node.title,field,excerpt:excerpt.slice(0,600),origin:'saved-model'});
  }
 }
 if(prompt)for(const excerpt of prompt.split(/[.!?;\n]+/).map(s=>s.trim()).filter(Boolean))out.push({objectId:null,title:'Your exploration question',field:'prompt',excerpt:excerpt.slice(0,600),origin:'request'});
 return out;
}

// The scope gate (rc41 close, W4-kafka-scope): a reviewed claim enters a reading only inside its reviewed scope, by the
// one gate Sol's governed retrieval applies (architecture-knowledge.js architectureClaimScope: the claim's product,
// version, topology and capability against the saved options of the record in context, and the product the question
// names). A claim outside it is withheld before anything is ranked: it adds no weight to a term, takes no place, asks
// no question and supplies no insight, source or packet passage. The result lists those the question or the context
// would otherwise have brought on its `withheld`, each with the gate's reason ({id, releaseId, reasons}, the shape of
// architectureBrain's excluded list), so a packet can say what was held back and why.
function outsideScope(c,prompt,project,items){
 if(!project||!items.some(r=>r.origin==='governed-claim'))return new Map();
 return architectureClaimScope(project,{objectId:c.selected?.id||'',query:prompt}).excluded;
}

export function relevantKnowledge(c,{prompt='',project=null,supply=null,limit=6}={}){
 const provided=supply||knowledgeStructures(project||{}),all=list(provided.records),inputs=passages(c,prompt);
 if(!inputs.length||c.selected?.id==='project'&&!prompt)return Object.assign([],{withheld:[]});
 const excluded=outsideScope(c,prompt,project,all),outside=r=>r.origin==='governed-claim'?excluded.get(r.releaseId+':'+r.claimId)||null:null,items=all.filter(r=>!outside(r)),withheld=[];
 const ids=new Set([c.selected?.id,c.selected?.parentId,...list(c.requirements).map(n=>n.id),...list(c.drivers).map(n=>n.id),...list(c.decisions).map(n=>n.id)]),linked=new Set();
 for(const link of list(project?.knowledge?.links))if(link.status!=='retired'&&ids.has(link.objectId)){if(link.receipt?.claimId)linked.add(link.receipt.claimId);if(link.receipt?.subjectId)linked.add(link.receipt.subjectId);}
 for(const node of [c.selected,...list(c.decisions)])for(const key of ['catalogueId','patternId','conceptId'])if(node?.record?.[key])linked.add(node.record[key]);
 const frequency=new Map();for(const record of items)for(const term of indexed(record).terms)frequency.set(term,(frequency.get(term)||0)+1);
 const weight=term=>Math.log((items.length+1)/((frequency.get(term)||0)+1));
 const hits=[];
 for(const structure of all){
  const idx=indexed(structure),signals=[];let relevance=linked.has(structure.id)||linked.has(structure.claimId)||linked.has(structure.conceptId)?100:0;
  for(const input of inputs){
   const normalized=phrase(input.excerpt),terms=words(input.excerpt),named=idx.names.some(n=>n.length>2&&(' '+normalized+' ').includes(' '+n+' '));
   const negated=named&&idx.names.some(n=>new RegExp('\\b(?:no|never|avoid|without|do not|does not|must not)\\s+(?:(?:use|need|require|implement|using)\\s+)?'+escapeRegExp(n)+'\\b|\\b'+escapeRegExp(n)+'\\s+(?:(?:is|are)\\s+)?(?:not needed|not required|forbidden|out of scope)\\b').test(normalized));
   if(negated)continue;
   const matched=terms.filter(t=>idx.terms.has(t)),namedTerms=matched.filter(t=>idx.nameTerms.has(t)),specific=matched.filter(t=>weight(t)>.8);
   const score=matched.reduce((n,t)=>n+weight(t),0);
   if(!named&&!(namedTerms.length&&specific.length>=2)&&!(specific.length>=3&&score>=5))continue;
   const value=(named?35:0)+namedTerms.length*3+score+(input.origin==='request'?12:0)+(input.objectId===c.selected?.id?3:0);
   relevance=Math.max(relevance,value);signals.push({...input,matchedTerms:matched,named,value});
  }
  if(!relevance)continue;
  {const reason=outside(structure);if(reason){withheld.push({id:structure.claimId,releaseId:structure.releaseId,reasons:[reason]});continue;}}
  signals.sort((a,b)=>b.value-a.value||a.field.localeCompare(b.field));
  const explicit=linked.has(structure.id)||linked.has(structure.claimId)||linked.has(structure.conceptId),signal=signals[0];
  const source=knowledgeStructureSource(structure),condition=[...list(structure.prerequisites),...list(structure.conditions)][0];
  hits.push({id:structure.id,conceptId:structure.conceptId,kind:explicit?'linked':'context',structure,record:structure.record,source,receipt:structure.receipt,
   relevance,signals:signals.slice(0,3).map(({value,...s})=>s),
   why:explicit?'A current design record explicitly links this repository subject.':(signal?.origin==='request'?'Your question':signal?.objectId+' · '+signal?.title)+' shares '+(signal?.named?'the named subject':list(signal?.matchedTerms).slice(0,4).join(', '))+'. This identifies a consideration; applicability is not established.',
   question:condition?'Does this scope satisfy the recorded condition: '+condition.text:'Which recorded driver requires '+structure.title+', and what evidence would distinguish it from the available alternatives?',
   limit:structure.authority.evaluateFit?'Only the reviewed typed predicates can establish a context match; implementation outcomes still require evidence.':'This repository record supplies questions and comparison material. Project suitability remains unassessed.'});
 }
 hits.sort((a,b)=>b.relevance-a.relevance||a.id.localeCompare(b.id));
 const bounded=Math.max(1,Math.min(16,Number(limit)||6));
 return Object.assign(hits.slice(0,bounded),{withheld});
}
