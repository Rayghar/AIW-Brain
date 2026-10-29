import {executionMethodCurrent} from './architecture-applicability.js';
import {EXECUTION_COMPOSITION} from './composition-manifest.js';
import {BRAIN_PLAYBOOK,knowledgeState,knowledgeStamp,releasedClaims,claimReceipt,claimReceiptCurrent,withdrawn,knowledgeFindings} from './knowledge-governance.js';
import {digest} from './brain-integrity.js';
import {catalogue} from './catalogue-store.js';
import {catalogueStructureSource} from './knowledge-structure.js';
import {CATALOGUE} from './catalogue-index.js';
import {BRAIN_TRADEOFFS} from './brain-tradeoffs.js';
import {CORE_BANKING_TERMS} from './lenses/core-banking-terms.js';
import {notForFinancialUse} from './catalogue-curation.js';
import {architectureKnowledgeForChoice,architectureClaimScope} from './architecture-knowledge.js';
export const BRAIN_ENGINE='architecture-brain-1';
export const BRAIN_POLICY='evidence-before-proposal-1';
// Round 12 (GR-DOM-01): the modal and counting words join the stop list (must, can, each, every …), as should and could
// did: a question that shares only them with a passage shares nothing.
const stop=new Set('the and for that this with from into its are was were have has what which should could would help explain review design recorded context model current using use system architecture must can will may shall might how each every'.split(' '));
export const brainTokens=s=>[...new Set((String(s).toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(x=>!stop.has(x)))];
const tokens=s=>new Set(brainTokens(s));
// ---------------------------------------------------------------- the domain's words (round 12, GR-DOM-01)
// A domain lens carries the words that name each of its concerns in a question, and the qualities each concern asks
// about (lenses/core-banking-terms.js). For a project that uses the lens, a question that names a term is read as
// naming the concern: the term's own words stop matching on their own (the "exchange" of "currency exchange" is not a
// token exchange, the "data" of "data residency" not a data lake), the concern's asks are asked with it (posting asks
// about consistency), and released claims are also matched on the concern's one-word terms. A project without the lens
// reads every question as before. The words choose what is shown, never what is true.
const LENS_TERMS={'core-banking':CORE_BANKING_TERMS};
const phraseOf=s=>' '+String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
const lensIndex=new Map();
function lensTerms(id){
 if(lensIndex.has(id))return lensIndex.get(id);
 const v=Object.hasOwn(LENS_TERMS,id)?LENS_TERMS[id]:null;
 const out=v?Object.entries(v).flatMap(([concern,c])=>{const single=c.terms.filter(t=>!t.includes(' ')).flatMap(brainTokens);return c.terms.map(term=>({concern,term,key:phraseOf(term),words:brainTokens(term),single,asks:c.asks}));}).sort((a,b)=>b.key.length-a.key.length||a.term.localeCompare(b.term)):null;
 lensIndex.set(id,out);return out;
}
// The domain terms a question names, longest first, each read once: {lensId, concerns, terms, consumed, asks, words}.
export function domainTerms(p,query){
 const id=p?.workspace?.domainLens?.lensId,index=typeof id==='string'?lensTerms(id):null;
 const out={lensId:index?id:null,concerns:[],terms:[],consumed:new Set(),asks:new Set(),words:new Set()};
 if(!index||!String(query||'').trim())return out;
 let phrase=phraseOf(query);
 for(const t of index){
  if(!phrase.includes(t.key))continue;
  phrase=phrase.split(t.key).join(' | ');out.terms.push(t.term);if(!out.concerns.includes(t.concern))out.concerns.push(t.concern);
  for(const w of t.words){out.consumed.add(w);out.words.add(w);}for(const w of t.single)out.words.add(w);for(const a of t.asks)out.asks.add(a);
 }
 return out;
}
// ---------------------------------------------------------------- the relevance margin (round 12, GR-DOM-01)
// What a hit must reach to be returned, so that a question with no real match returns nothing and records that tie on
// one shared word are not returned in alphabetical order as if they were relevant:
//   - a tie never decides: hits that tie with the first hit the result leaves out are left out too (every list);
//   - a concept, for a question, is named by it, or the question covers its name: every word of it, or two words;
//   - a Playbook passage also needs a subject match in the question or selected record; broad context orders it;
//   - a trade-off passage names a word in its title or at least two specific cues; its body orders matches.
// Browsing the catalogue by a word (the knowledge workspace) is a search, not a retrieval: there, only ties decide.
export const RELEVANCE_MARGIN=Object.freeze({concept:'named, or its name covered by the question',method:3,tradeoff:'a title word, a named cue phrase, two specific cues, or a domain-lens cue',ties:'a tie at the cut is left out'});
const FUNCTION_WORDS=new Set(['against','under','through','over','back','long','sent','out','into','with']);
export function aboveTie(hits,limit){const cut=hits.length>limit?hits[limit].relevance:-Infinity;return hits.filter(h=>h.relevance>cut).slice(0,limit);}
// A name's words are all its words, stop words included: "Model Gateway" is not covered by "gateway" alone.
const nameWords=new WeakMap();
export function coversName(record,asked){let w=nameWords.get(record);if(!w){w=[...new Set(String(record.name).toLowerCase().match(/[a-z0-9]{3,}/g)||[])];nameWords.set(record,w);}const hits=w.filter(t=>asked.has(t)).length;return hits>=2||(hits>=1&&hits===w.length);}
function namedConceptRelations(query){
 const phrase=' '+String(query).toLowerCase().replace(/[^a-z0-9]+/g,' ')+' ',relations=new Map();
 for(const record of catalogue().records){const names=[record.name,...record.aliases||[]];if(!names.some(n=>{const key=String(n).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();return key.length>=5&&phrase.includes(' '+key+' ');} ))continue;
  relations.set(record.id,{kind:'named concept',via:record.id});
  for(const [field,kind] of [['alternatives','alternative'],['complements','complement'],['conflicts','conflict']])for(const id of record[field]||[])if(!relations.has(id))relations.set(id,{kind,via:record.id});
 }
 return relations;
}
const indexed=new WeakMap();
function score(record,query,fields){let bag=indexed.get(record);if(!bag){bag=tokens(fields.join(' '));indexed.set(record,bag);}return [...query].filter(x=>bag.has(x)).length;}
const brief=n=>[n?.title,n?.record?.description,n?.record?.purpose,n?.record?.response,n?.record?.attribute,n?.record?.acceptance].filter(Boolean).join(' ');
// Workbook sheets repeat generic words across unrelated paragraphs. The first line of each passage names its
// actual subject (for example Facade or Secure Communication); the rest is useful to order a subject match, not
// to turn a payment product comparison into a Facade recommendation because both mention services and payments.
const METHOD_GENERIC=new Set('service services component components system systems architecture architectural design designs software application applications project projects requirement requirements pattern patterns approach approaches method methods quality attributes these those their our your they them other changes change make making use using used need needs keep not operating lack key keys independent independently test tests testing verification check checks'.split(' '));
const METHOD_BROAD=new Set('performance scalability reliability availability security maintainability consistency communication tactics'.split(' '));
const methodTopics=new WeakMap();
function methodRelevance(m,focus,terms,procedure){
 let lead=methodTopics.get(m);if(!lead){const first=m.text.split(/\n/)[0].slice(0,220),colon=first.indexOf(':');lead=tokens(colon>=0&&colon<80?first.slice(0,colon):first);methodTopics.set(m,lead);}
 const matched=[...focus].filter(t=>lead.has(t)&&!METHOD_GENERIC.has(t));
 const specific=matched.filter(t=>!METHOD_BROAD.has(t));
 if(!specific.length&&matched.length<2)return null;
 const relevance=score(m,terms,[m.title,m.text]) + matched.length*3 + specific.length*5 + score(m,focus,[m.text])*2 + (m.title===procedure.sheet?1:0);
 return {method:m,relevance};
}
// The trade-off passages (brain-tradeoffs.js, round 6 Contract K) are retrieved by lexical relevance beside the Playbook
// passages, and only when the question names one: a word of its title or two specific cue words. With
// no question, the selected record's own title and category stand for it, so a decision titled for a trade-off brings
// its passage and any other record brings none; the record's wider context (drivers, requirements) only orders the
// kept passages and never retrieves one. Each passage's title, cues and text are indexed once; the two best are returned.
const tradeoffIndex=new Map();
const tradeoffBags=m=>{let b=tradeoffIndex.get(m.id);if(!b){b={title:tokens(m.title),cues:tokens((m.cues||[]).join(' ')),text:tokens(m.text)};tradeoffIndex.set(m.id,b);}return b;};
// Round 12 (GR-DOM-01): a title hit keeps a passage only when it is a content word: the "under" of "consistency under
// partition" counts in its relevance, never alone ("data must remain under the rules" names no partition).
export function tradeoffRelevance(m,{explicit=new Set(),terms=new Set(),query='',domainAsks=new Set()}={}){const b=tradeoffBags(m),titles=[...explicit].filter(x=>b.title.has(x)),cues=[...explicit].filter(x=>b.cues.has(x)&&!FUNCTION_WORDS.has(x)&&!METHOD_GENERIC.has(x)),titleHits=titles.length,askedHits=[...explicit].filter(x=>b.text.has(x)).length,textHits=[...terms].filter(x=>b.text.has(x)).length;
 const phrase=phraseOf(query),namedCue=(m.cues||[]).some(c=>brainTokens(c).length>=2&&phrase.includes(phraseOf(c)));
 const relevance=titleHits*3+cues.length*2+askedHits*2+textHits;
 return {relevance,titleHits,askedHits,textHits,kept:titles.some(x=>!FUNCTION_WORDS.has(x))||cues.length>=2||namedCue||cues.some(x=>domainAsks.has(x))};}
export function tradeoffsFor(p,{explicit,terms,query='',domainAsks=new Set(),limit=2}={}){if(withdrawn(p,[BRAIN_TRADEOFFS.id]).length)return [];return aboveTie(BRAIN_TRADEOFFS.passages.map(m=>({tradeoff:m,...tradeoffRelevance(m,{explicit,terms,query,domainAsks})})).filter(h=>h.kept).sort((a,b)=>b.relevance-a.relevance||a.tradeoff.id.localeCompare(b.tradeoff.id)),limit);}
// The two method packs as brain-method sources, each passage with its receipt: what brainSources and the semantic
// retrieval (brain-retrieval.js) read, so there is one shape for a method source, not two.
export const playbookSource=m=>({id:'playbook:'+m.id,kind:'brain-method',objectId:m.id,title:m.title+' · '+m.locator,posture:BRAIN_PLAYBOOK.posture,receipt:{kind:'brain-method',packId:BRAIN_PLAYBOOK.id,file:BRAIN_PLAYBOOK.file,fileSha256:BRAIN_PLAYBOOK.fileSha256,passageId:m.id,locator:m.locator,excerptHash:m.sha256},excerpt:m.text,truncated:false});
export const tradeoffSource=m=>({id:'tradeoff:'+m.id,kind:'brain-method',objectId:m.id,title:'Trade-off · '+m.title,posture:BRAIN_TRADEOFFS.authority,receipt:{kind:'brain-method',packId:BRAIN_TRADEOFFS.id,packHash:BRAIN_TRADEOFFS.sha256,passageId:m.id,excerptHash:m.sha256,chapters:m.chapters,attribution:m.attribution.map(a=>({title:a.title,url:a.url,licence:a.licence})),scoring:false},excerpt:m.text,truncated:false});
export function methodSources(p){return [...(withdrawn(p,['SA-PLAYBOOK',BRAIN_PLAYBOOK.id]).length?[]:BRAIN_PLAYBOOK.passages.map(playbookSource)),...(withdrawn(p,[BRAIN_TRADEOFFS.id]).length?[]:BRAIN_TRADEOFFS.passages.map(tradeoffSource))];}
// Pattern DNA remains editorial research material. Its structural kit can help
// formulate and compare hypotheses, but cannot establish applicability or approve
// an option. Preserve valid structured excerpts instead of slicing JSON mid-field.
export const catalogueSource=catalogueStructureSource;
export function catalogueSources(p){return withdrawn(p,[catalogue().releaseId]).length?[]:catalogue().records.filter(r=>!notForFinancialUse(r)&&!withdrawn(p,[r.id]).length).map(catalogueSource);}
const procedureFor=chapter=>chapter<=2?{id:'frame-scenario',title:'Frame the need and quality scenario',questions:['What outcome must this requirement produce?','What stimulus, environment and response measure make the quality concern testable?','Which constraints or assumptions could change the answer?'],sheet:'Components GuideBook v2'}:chapter<=5?{id:'choose-structure',title:'Compare structure before choosing technology',questions:['What is the simplest viable structure?','Which responsibilities and information belong together?','What coupling, failure behaviour and operating obligations would each alternative introduce?'],sheet:'Arch Style Suitability Ass'}:chapter<=8?{id:'realise-contract',title:'Derive capabilities and contracts',questions:['Which required capability justifies each component?','Who owns the information and the interaction contract?','How will recovery, consistency, access and capacity be tested?'],sheet:'Components GuideBook v2'}:{id:'verify-design',title:'Verify the design and its obligations',questions:['Which evidence demonstrates the expected behaviour?','Which failure or abuse cases remain untested?','Who accepts the remaining risks and delivery obligations?'],sheet:'anti patterns'};
// Round 12 (GR-DOM-01): `browse` reads a question as a search of the catalogue (the knowledge workspace), where only ties
// decide; otherwise the relevance margin above applies. A question is read with the domain's words of the lens the
// project uses (domainTerms): `explicit` is what it asks, `terms` what it and its context share with a passage.
export function architectureBrain(p,c,{query='',limit=6,browse=false}={}){
 const domain=domainTerms(p,query),asked=tokens(query),questioned=asked.size>0||domain.terms.length>0;
 const explicit=new Set([...[...asked].filter(t=>!domain.consumed.has(t)),...domain.asks]),focusTerms=tokens([c.selected.title,c.selected.record?.category].filter(Boolean).join(' ')),terms=tokens([query,brief(c.selected),...c.drivers.map(brief),...c.requirements.slice(0,3).map(brief)].join(' '));
 for(const a of domain.asks)terms.add(a);
 const claimTerms=domain.words.size?new Set([...terms,...domain.words]):terms;
 const s=knowledgeState(p),contextIds=new Set([c.selected.id,...c.requirements.map(x=>x.id),...c.drivers.map(x=>x.id)]),conceptRelations=namedConceptRelations(query);
 const scopeLinks=s.links.filter(l=>l.status!=='retired'&&contextIds.has(l.objectId));
 const released=releasedClaims(p),reviewed=released.filter(h=>h.eligible&&h.claim.architectureUnit).map(h=>({claim:h.claim,release:h.release,receipt:claimReceipt(p,h.claim,h.release)})),scope=architectureClaimScope(p,{objectId:c.selected.id,query},reviewed);
 const claims=released.map(h=>{const relation=conceptRelations.get(h.claim.subjectId),unit=h.claim.architectureUnit;return {...h,relevance:score(h.claim,claimTerms,[h.claim.statement,h.claim.subjectId,h.claim.predicate,...h.claim.tags,...h.claim.conditions,...(unit?[unit.kind,unit.mechanism,...Object.values(unit.scope||{}),...unit.effects.map(e=>e.quality+' '+e.rationale),...unit.obligations.map(o=>o.action),...unit.exclusions]:[])]),graphRelation:relation||null,linked:scopeLinks.some(l=>l.receipt.claimId===h.claim.id&&l.receipt.releaseId===h.release.id),scopeStatus:scope.statuses.get(h.release.id+':'+h.claim.id)||null};});
 const selected=claims.filter(h=>h.eligible&&!scope.excluded.has(h.release.id+':'+h.claim.id)&&(h.relevance>0||h.graphRelation||h.linked)).sort((a,b)=>Number(b.linked)-Number(a.linked)||Number(b.graphRelation?.kind==='named concept')-Number(a.graphRelation?.kind==='named concept')||b.relevance-a.relevance||a.claim.id.localeCompare(b.claim.id)).slice(0,limit);
 const intent=' '+String(query).toLowerCase().replace(/[^a-z0-9]+/g,' ')+' ';
 const hits=catalogue().records.map(r=>{const titleTerms=tokens([r.name,...r.aliases||[],...r.tags||[]].join(' '));const named=[r.name,...r.aliases||[]].some(n=>String(n).length>=4&&!['component','boundary','service','pattern','architecture','domain','contract'].includes(String(n).toLowerCase())&&intent.includes(' '+String(n).toLowerCase().replace(/[^a-z0-9]+/g,' ')+' '))?2:0;return {record:r,relevance:score(r,terms,[r.name,r.summary,r.problem,...r.aliases||[],...r.tags||[]])+[...explicit].filter(t=>titleTerms.has(t)).length*8+(!questioned?[...focusTerms].filter(t=>titleTerms.has(t)).length*6:0)+named*5,named};}).filter(h=>h.relevance>=2);
 const concepts=aboveTie(hits.filter(h=>browse||!questioned||h.named>0||coversName(h.record,explicit)).sort((a,b)=>b.relevance-a.relevance||a.record.id.localeCompare(b.record.id)),limit);
 const procedure=procedureFor(c.chapter),methodFocus=questioned?explicit:focusTerms;
 const methods=withdrawn(p,['SA-PLAYBOOK',BRAIN_PLAYBOOK.id]).length?[]:aboveTie(BRAIN_PLAYBOOK.passages.map(m=>methodRelevance(m,methodFocus,terms,procedure)).filter(h=>h&&h.relevance>=RELEVANCE_MARGIN.method).sort((a,b)=>b.relevance-a.relevance||a.method.id.localeCompare(b.method.id)),3);
 const tradeoffs=tradeoffsFor(p,{explicit:questioned?explicit:focusTerms,terms,query,domainAsks:domain.asks});
 const mappings=(p.technologyRealisation?.mappings||[]).filter(m=>m.realizationId===c.selected.id),capabilities=(p.technology?.capabilities||[]).filter(cap=>mappings.some(m=>m.capabilityId===cap.id));
 const optionLinks=(c.selected.chapter===7&&Array.isArray(c.selected.record?.options)?c.selected.record.options:[]).flatMap(o=>{
  const reading=architectureKnowledgeForChoice(p,{...o,capabilities,tier:o.serviceTier},reviewed);
  return reading.matches.filter(h=>selected.some(s=>s.claim.id===h.receipt.claimId&&s.release.id===h.receipt.releaseId)).map(h=>({optionId:o.id,optionTitle:o.product||o.title,claimId:h.receipt.claimId,releaseId:h.receipt.releaseId,state:h.applicability.state}));
 }).slice(0,16);
 const optionNodes=[...new Map(optionLinks.map(h=>[h.optionId,{id:'option:'+c.selected.id+':'+h.optionId,kind:'technology-option',title:h.optionTitle}])).values()];
 const claimNode=(releaseId,claimId)=>'claim:'+releaseId+':'+claimId,sourceNode=(releaseId,sourceId)=>'source:'+releaseId+':'+sourceId;
 const nodes=[{id:'project:'+c.selected.id,kind:'project-object',title:c.selected.title},...c.drivers.slice(0,3).map(d=>({id:'project:'+d.id,kind:d.kind==='quality'||!d.kind?'quality-scenario':'architecture-driver',title:d.title})),...selected.map(h=>({id:claimNode(h.release.id,h.claim.id),kind:'claim',title:h.claim.statement,releaseId:h.release.id})),...selected.slice(0,2).map(h=>({id:sourceNode(h.release.id,h.claim.sourceId),kind:'original source',title:h.claim.sourceId})),...optionNodes,...concepts.slice(0,3).map(h=>({id:'concept:'+h.record.id,kind:h.record.recordType,title:h.record.name,authority:'descriptive'}))];
 const edges=[...c.drivers.slice(0,3).filter(d=>d.id!==c.selected.id).map(d=>({from:'project:'+c.selected.id,to:'project:'+d.id,relationship:'applicable architecture driver'})),...selected.map(h=>({from:claimNode(h.release.id,h.claim.id),to:'project:'+c.selected.id,relationship:h.linked?'informs recorded rationale':h.graphRelation?'related knowledge for consideration':'retrieved for consideration'})),...selected.slice(0,2).map(h=>({from:claimNode(h.release.id,h.claim.id),to:sourceNode(h.release.id,h.claim.sourceId),relationship:'supported by exact passage'})),...optionNodes.map(o=>({from:'project:'+c.selected.id,to:o.id,relationship:'compares option'})),...optionLinks.map(h=>({from:'option:'+c.selected.id+':'+h.optionId,to:claimNode(h.releaseId,h.claimId),relationship:h.state==='context-match'?'declared applicability matches; verification pending':h.state==='excluded'?'mechanism excluded by recorded configuration':'scope needs configuration detail'})),...concepts.slice(0,3).map(h=>({from:'project:'+c.selected.id,to:'concept:'+h.record.id,relationship:'exploration; suitability unassessed'}))];
 const findings=knowledgeFindings(p).filter(f=>contextIds.has(f.objectId));
 const receipt={ontology:'aiw-canonical-eleven-chapters-1',organizationPins:(p.workspace?.organizationPins||[]).map(r=>({id:r.releaseId,signature:r.signature})),engine:BRAIN_ENGINE,policy:BRAIN_POLICY,projectId:p.id,objectId:c.selected.id,graphFingerprint:digest(c.basis),knowledgeStamp:knowledgeStamp(p),catalogueRelease:catalogue().releaseId,playbookHash:BRAIN_PLAYBOOK.fileSha256,tradeoffsHash:BRAIN_TRADEOFFS.sha256,tradeoffIds:tradeoffs.map(h=>h.tradeoff.id),activeReleases:s.releases.filter(r=>s.pins.includes(r.id)).map(r=>({id:r.id,checksum:r.checksum})),claimIds:selected.map(h=>h.claim.id),claimRefs:selected.map(h=>h.release.id+':'+h.claim.id),graphLinks:selected.filter(h=>h.graphRelation).map(h=>({claimId:h.claim.id,releaseId:h.release.id,...h.graphRelation})),optionLinks,retrieval:'graph + lexical',scoring:false};
 // How thin the retrieval was, said plainly (round 2, I2-07): the terms, what each kept concept matched, and how many
 // records and claims were considered against how many were kept. Descriptive; it is not part of any receipt or stamp.
 // Round 12: the domain terms the question named (the lens in use, its concerns, the terms) and the concepts that
 // matched but stayed below the margin or in a tie.
 const trace={terms:[...terms].slice(0,24),domain:domain.lensId?{lensId:domain.lensId,concerns:domain.concerns,terms:domain.terms}:null,considered:catalogue().records.length,kept:concepts.length,belowMargin:hits.length-concepts.length,claimsConsidered:claims.length,claimsKept:selected.length,matched:concepts.map(h=>{const bag=indexed.get(h.record)||new Set();return {id:h.record.id,relevance:h.relevance,named:h.named>0,terms:[...terms].filter(t=>bag.has(t)).slice(0,8)};})};
 return {procedure,concepts,claims:selected,excluded:claims.filter(h=>(!h.eligible||scope.excluded.has(h.release.id+':'+h.claim.id))&&(h.relevance>0||h.graphRelation||h.linked)).map(h=>({id:h.claim.id,releaseId:h.release.id,reasons:[...h.reasons,...(scope.excluded.has(h.release.id+':'+h.claim.id)?[scope.excluded.get(h.release.id+':'+h.claim.id)]:[])]})),methods,tradeoffs,graph:{nodes:[...new Map(nodes.map(n=>[n.id,n])).values()],edges},findings,receipt,trace};
}
// Round 12 (GR-DOM-02): a catalogue record AIW marks not for financial use (catalogue-curation.js) is shown with its
// mark among the concepts, and never cited.
export function brainSources(p,brain){
 return [...brain.claims.map(h=>({id:'claim:'+h.release.id+':'+h.claim.id,kind:'governed-claim',objectId:h.claim.id,title:h.claim.subjectId+' · '+h.claim.claimType,posture:h.scopeStatus==='needs-context'?'Reviewed claim; product configuration is incomplete. Confirm scope, written conditions and tests before using it.':'Project-reviewed conditional claim; product scope, quality effects and written applicability require project judgement and tests',receipt:claimReceipt(p,h.claim,h.release),excerpt:JSON.stringify({statement:h.claim.statement,conditions:h.claim.conditions,limitations:h.claim.limitations,architectureUnit:h.claim.architectureUnit||null,scopeStatus:h.scopeStatus||'conditions-unassessed',sourcePassage:h.claim.excerpt,sourceLines:[h.claim.lineStart,h.claim.lineEnd],retrievalRelation:h.graphRelation,authority:'Reviewed interpretation, not a measured result or automatic product recommendation'}),truncated:false})),...brain.concepts.filter(h=>h.named>0&&!notForFinancialUse(h.record)&&!withdrawn(p,[catalogue().releaseId,h.record.id]).length).slice(0,2).map(({record:r})=>catalogueSource(r)),...brain.methods.map(({method:m})=>playbookSource(m)),...(brain.tradeoffs||[]).map(({tradeoff:m})=>tradeoffSource(m))];
}
// A catalogue receipt is checked against the index (catalogue-index.js: release, source hash and every record's hash),
// so the answer never depends on whether the full catalogue has loaded in this page (round 2, I2-20).
// The index stores each record's SHA-256 as 43 base64url characters in record order; a receipt names it in lowercase hex.
const indexedHash=id=>{const i=CATALOGUE.records.findIndex(r=>r.id===id);return i<0?null:CATALOGUE.recordHashes.slice(i*43,i*43+43);};
const hexToBase64url=hex=>typeof hex==='string'&&/^[0-9a-f]{64}$/.test(hex)?btoa(String.fromCharCode(...hex.match(/../g).map(b=>parseInt(b,16)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''):null;
export function brainSourceCurrent(p,s){if(s.kind==='catalogue-description'){if(withdrawn(p,[s.receipt?.releaseId,s.objectId]).length)return false;const h=indexedHash(s.objectId);return s.receipt.releaseId===CATALOGUE.releaseId&&s.receipt.sourceHash===CATALOGUE.sourceSha256&&!!h&&h===hexToBase64url(s.receipt.recordHash);}if(s.kind==='governed-claim')return claimReceiptCurrent(p,s.receipt);if(s.kind==='brain-method'){if(s.receipt?.packId===EXECUTION_COMPOSITION.id)return executionMethodCurrent(p,s);if(s.receipt?.packId===BRAIN_TRADEOFFS.id)return !withdrawn(p,[BRAIN_TRADEOFFS.id]).length&&s.receipt.packHash===BRAIN_TRADEOFFS.sha256&&BRAIN_TRADEOFFS.passages.some(m=>m.id===s.receipt.passageId&&m.sha256===s.receipt.excerptHash);return !withdrawn(p,['SA-PLAYBOOK',BRAIN_PLAYBOOK.id]).length&&s.receipt.fileSha256===BRAIN_PLAYBOOK.fileSha256&&BRAIN_PLAYBOOK.passages.some(m=>m.id===s.receipt.passageId&&m.sha256===s.receipt.excerptHash);}return true;}
