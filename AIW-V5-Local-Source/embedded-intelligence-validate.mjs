// Cross-surface architecture context and exact-source contracts. Pure project
// fixtures and provider output validators; no live LLM, browser or network call.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {loadCatalogue} from './public/catalogue-store.js';
import {intelligencePacket,reviewPacket,journeyPacket,packArchitectureIntelligence,discloseIntelligenceValue,generationReceipt,reviewFindingBasis} from './public/intelligence-context.js';
import {architectureIntelligence,architectureIntelligenceCurrent} from './public/architecture-intelligence.js';
import {brainContext,generationCurrent} from './public/aiw-brain.js';
import {architectureBrain,brainSources,brainSourceCurrent,methodSources} from './public/architecture-brain.js';
import {fieldPacket} from './intelligence-service.js';
import {reasoningPacket} from './public/brain-reasoning.js';
import {validateJourneyDraft,journeyDraftSchema,guardJourneyDraft,validateReviewDraft} from './intelligence-provider.js';
import {applyKnowledgeCommand,knowledgeStamp,knowledgeImpactStamp} from './public/knowledge-governance.js';

await loadCatalogue();
const at='2026-10-20T12:00:00.000Z',checks=[];
const pass=message=>{checks.push(message);console.log('PASS',message);};
const base=(name,template='blank')=>createProject({name,template},name.toLowerCase().replaceAll(' ','-'),at);
const requirement=(p,title,description)=>applyCommand(p,{type:'artefact',payload:{type:'requirement',title,description,acceptance:'The externally observable contract is preserved during the change.',source:'Synthetic design workshop'}},at).document;
const request=(id='REQ-001',chapter=1,prompt='Examine Strangler Fig conditions and alternatives.')=>({objectId:id,chapter,mode:'mind',prompt});
const derived=packet=>packet.sources.filter(s=>s.kind==='architecture-intelligence');
function sourceClosure(packet,maxCharacters,maxSources=Infinity){
 assert(packet.sources.length<=maxSources);
 assert(packet.sources.reduce((n,s)=>n+s.excerpt.length,0)<=maxCharacters);
 const ids=new Set(packet.sources.map(s=>s.id).filter(Boolean));
 assert.equal(ids.size,packet.sources.filter(s=>s.id).length,'Each canonical source uses one slot');
 assert.equal(new Set(packet.sources.map(s=>s.ref)).size,packet.sources.length,'Every source has its own visible citation');
 for(const source of derived(packet)){
  const body=JSON.parse(source.excerpt);assert(body.insights.length,'A derived source contains an actual insight');
  assert(source.receipt.sourceRefs.every(id=>ids.has(id)),'A deduction retains its complete disclosed basis');
  for(const insight of body.insights)assert(insight.sourceRefs.every(id=>ids.has(id)));
 }
}

let fresh=requirement(base('Warehouse migration'),'Replace a legacy stock service gradually','A Strangler Fig transition and Anti-Corruption Layer preserve the public stock contract during migration.');
const pristine=JSON.stringify(fresh),originalFetch=globalThis.fetch;
let externalCalls=0;globalThis.fetch=async()=>{externalCalls++;throw Error('No network is allowed in these projection checks.');};
try{
 for(const [topic,id] of [['Strangler Fig','PAT-STRANGLER-FIG'],['Anti-Corruption Layer','PAT-ANTI-CORRUPTION-LAYER'],['CQRS','PAT-CQRS']]){
  const packet=intelligencePacket(fresh,request('REQ-001',1,'Which conditions and obligations govern '+topic+' here?'));
  const source=packet.sources.find(s=>s.objectId===id&&s.kind==='catalogue-description');assert(source,topic+' is retrieved beyond the old six topics');
  assert(source.receipt.sourceHash&&source.receipt.recordHash&&brainSourceCurrent(fresh,source));
  assert(derived(packet).length);sourceClosure(packet,28000,22);
  assert.equal(intelligencePacket(fresh,packet.request).stamp,packet.stamp,'The disclosed context is deterministic');
 }
 const field=fieldPacket(fresh,{command:'artefact',field:'description',recordId:'REQ-001',values:{title:'Replace the stock service gradually'},links:{type:'requirement'}});
 assert.equal(field.sources[0].kind,'record');assert.match(field.sources[0].posture,/open form/);
 assert(field.sources.some(s=>s.kind==='catalogue-description'));assert(derived(field).length);sourceClosure(field,12000,10);
 assert.equal(JSON.stringify(fresh),pristine);assert.equal(externalCalls,0);
 pass('Unfamiliar migration patterns reach object guidance and field drafting through native exact-source receipts without network calls or model mutation');

 const bank=base('Bank Payment intelligence','bank-payment');
 for(const [id,chapter] of [['REQ-001',1],['api-pod',5],['tr-001',7]]){
  const packet=intelligencePacket(bank,request(id,chapter,'Review circuit breaker, retry and cache conditions at this boundary.'));
  assert(derived(packet).length,id+' retains a useful deduction before optional retrieval fills the budget');sourceClosure(packet,28000,22);
 }
 for(const chapter of [2,4,5,7]){
  const packet=reviewPacket(bank,{chapter});sourceClosure(packet,48000);
  assert(packet.sources.some(s=>['catalogue-description','governed-claim'].includes(s.kind)),'Chapter '+chapter+' includes architecture knowledge');
  assert(derived(packet).length,'Chapter '+chapter+' includes a complete contextual deduction');
  assert.equal(packet.sources.at(-1).kind,'connected-model');
  const scoped=derived(packet)[0],owner=scoped.applicableTo[0],other=packet.elementIds.find(id=>!scoped.applicableTo.includes(id));
  const finding=elementId=>({elementId,severity:'note',title:'Review the recorded conditions',reason:'Check whether the stated source conditions apply at this boundary.',sourceRefs:[scoped.ref]});
  assert.equal(validateReviewDraft({findings:[finding(owner)]},packet).findings.length,1);
  if(other){const bad=validateReviewDraft({findings:[finding(other)]},packet);assert.equal(bad.findings.length,0);assert.match(bad.setAside[0].reason,/scope/);}
  assert(reviewFindingBasis(bank,{packet,request:{chapter}}).current);
 }
 pass('Bank Payment reasoning and chapter reviews retain complete source bundles within the original budgets and reject citations from another object’s scope');

 const nested=structuredClone(bank),parent=nested.technologyRealisation.records[0],secret='ExcludedNestedOptionSecretText';
 parent.options[0].rationale=secret;parent.options[0].product=secret;nested.workspace.aiPolicy={excludedObjectIds:[parent.options[0].id]};
 for(const packet of [intelligencePacket(nested,request(parent.id,7,'Review recorded option conditions.')),reviewPacket(nested,{chapter:7}),fieldPacket(nested,{command:'techrealisation.plan',field:'purpose',recordId:parent.id,values:{},links:{}})]){
  assert(!JSON.stringify(packet).includes(secret),'An excluded child is absent inside an allowed parent');
  assert(!JSON.stringify(packet).includes(parent.options[0].id));
 }
 assert.throws(()=>reasoningPacket(nested,{task:'decisions',ids:['M:7:'+parent.id],prompt:'Review recorded option conditions.'}),/excluded|narrower|disclosure/,'A derived comparison cannot send its excluded child’s product label disguised as prose');
 const safe=discloseIntelligenceValue({sources:[{id:'parent-source',excerpt:JSON.stringify({id:'allowed',children:[{id:'private-child',text:secret},{id:'public-child',text:'Visible'}]})}]},{excludedObjectIds:['private-child']});
 assert(!JSON.stringify(safe).includes(secret));assert(JSON.stringify(safe).includes('Visible'));
 pass('Disclosure removes an excluded nested record’s content, and dependent deductions cannot survive merely by losing the excluded identifier');

 const reading=architectureIntelligence(fresh,{chapter:1,id:'REQ-001'},{prompt:'Strangler Fig'});
 const packed=packArchitectureIntelligence([{id:'component-view',reading,applicableTo:['component-view']},{id:'security-view',reading,applicableTo:['security-view']}],{maxCharacters:28000,maxSources:22});
 assert(packed.sources.some(s=>s.kind==='architecture-intelligence'&&s.applicableTo.includes('component-view')&&s.applicableTo.includes('security-view')),'A shared subject retains both explicit item scopes');
 const withheld=packArchitectureIntelligence([reading],{maxCharacters:28000,maxSources:22,excluded:new Set(['REQ-001'])});
 assert(!withheld.sources.some(s=>s.kind==='architecture-intelligence'));
 const packet=intelligencePacket(fresh,request()),source=derived(packet)[0];assert(architectureIntelligenceCurrent(fresh,source));
 const changed=structuredClone(fresh);changed.artefacts[0].acceptance+=' The migration must also preserve the historical stock ledger.';
 assert(!architectureIntelligenceCurrent(changed,source));
 const run={id:'synthetic-run',provider:'Synthetic',model:'no-model',updatedAt:at,packet,result:{sourceRefs:[source.ref],assumptions:[],questions:[]}};
 assert(generationCurrent(fresh,generationReceipt(run)));assert(!generationCurrent(changed,generationReceipt(run)));
 const catalogueSource=packet.sources.find(s=>s.kind==='catalogue-description');
 const revoked=applyKnowledgeCommand(fresh,{type:'knowledge.withdraw',payload:{id:catalogueSource.objectId,reviewed:true,reviewer:'Synthetic independent reviewer',reason:'Synthetic withdrawal verifies that an earlier recommendation becomes historical.',stamp:knowledgeImpactStamp(fresh,catalogueSource.objectId)}},at,'synthetic-curator').document;
 assert(!brainSourceCurrent(revoked,catalogueSource));assert(!architectureIntelligenceCurrent(revoked,source));assert(!generationCurrent(revoked,generationReceipt(run)));
 pass('Saved reasoning becomes historical after changed requirements or source withdrawal; multiple native item scopes are preserved');
}finally{globalThis.fetch=originalFetch;}

// A real native source→claim→independent review→release→activation fixture.
let governed=requirement(base('Conditional source test'),'Read descriptive catalogue data','Repeated catalogue reads tolerate a bounded old description; writes use the current authority.');
const review={reviewed:true,reviewer:'Synthetic independent reviewer',reason:'Synthetic conditions and source identity test; this is not a production knowledge approval.'};
function knowledge(type,payload){const r=applyKnowledgeCommand(governed,{type:'knowledge.'+type,payload},at,type==='review'?'independent-reviewer':'synthetic-author');governed=r.document;return r.selected;}
const sourceId=knowledge('source',{title:'Synthetic cache conditions',path:'synthetic/cache.md',revision:'fixture-v1',body:'A cached description may lag its authority only when bounded staleness is acceptable.\nNever authorise a conflicting write from that stale description.\n'});
const claimId=knowledge('claim',{sourceId,lineStart:1,lineEnd:2,subjectId:'PAT-CACHE-ASIDE',claimType:'applicability',predicate:'permits bounded older descriptions',polarity:'supports',statement:'A cached copy can serve descriptive reads under declared staleness tolerance.',conditions:['The read explicitly tolerates bounded older descriptions.'],limitations:['Does not establish write correctness or a measured latency result.'],tags:['cache','catalogue','read']});
knowledge('review',{...review,id:claimId,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true});
const releaseId=knowledge('release',{...review,title:'Synthetic conditional release',claimIds:[claimId]});knowledge('activate',{...review,id:releaseId,stamp:knowledgeStamp(governed)});
const c=brainContext(governed,{chapter:1,id:'REQ-001'}),claim=brainSources(governed,architectureBrain(governed,c,{query:'Cache-aside for descriptive catalogue reads'})).find(s=>s.kind==='governed-claim');assert(claim);
const method=methodSources(governed)[0];
const draft={chapter:4,title:'Logical design',records:[{key:'R1',kind:'guided',title:'Serve descriptive reads',fields:[{key:'purpose',label:'Purpose',value:'',basis:'requirement'},{key:'target',label:'Target',value:'',basis:'requirement',numeric:true}],provenance:{upstream:['REQ-001'],claimIds:[claimId]}},{key:'R2',kind:'guided',title:'Authorise writes',fields:[{key:'purpose',label:'Purpose',value:'',basis:'requirement'}],provenance:{upstream:['REQ-001'],claimIds:[]}}],citations:[claim,method].map(s=>({...s,excerpt:'Short display summary',reasoningExcerpt:s.excerpt}))};
const journey=journeyPacket(governed,{chapter:4},draft,{passages:[{id:'P1',text:'Use current authoritative state to authorise writes.'}]});
const k=journey.sources.find(s=>s.kind==='governed-claim');assert(k);assert.match(k.excerpt,/bounded older descriptions/);assert.match(k.excerpt,/Does not establish write correctness/);assert.notEqual(k.excerpt,'Short display summary');
assert(journeyDraftSchema(journey).properties.answers.items.properties.sourceRefs.items.enum.includes(k.ref));
const answer={record:'R1',field:'purpose',value:'Serve descriptive reads only within the declared staleness tolerance.',passages:[],sourceRefs:['REQ-001',k.ref]};
assert.equal(validateJourneyDraft({answers:[answer]},journey).answers.length,1);
assert.throws(()=>validateJourneyDraft({answers:[{...answer,sourceRefs:[k.ref]}]},journey),/project passage or upstream record/);
assert.throws(()=>validateJourneyDraft({answers:[{...answer,record:'R2'}]},journey),/scope/);
const numbers={...journey,sources:journey.sources.map(s=>({...s,excerpt:s.excerpt+' Example from a generic source: 999999.'}))};
assert(guardJourneyDraft(numbers,{answers:[{...answer,field:'target',value:'999999'}]}).length,'A source example number cannot become a project target');
const old=journeyPacket(governed,{chapter:4},{...draft,citations:draft.citations.map(({reasoningExcerpt,...s})=>s)},{passages:[]});assert.equal(old.sources.length,0,'Legacy clipped claim summaries cannot impersonate full conditions');
pass('Journey drafting carries the complete current reviewed claim, requires project evidence, rejects cross-record citations and cannot copy generic example numbers as targets');

console.log(`${checks.length}/${checks.length} embedded intelligence contracts passed.`);
