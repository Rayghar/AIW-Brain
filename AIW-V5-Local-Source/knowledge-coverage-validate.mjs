// Exact knowledge coverage and the existing concept disclosure. Original synthetic
// sources, native lifecycle commands and a DOM harness; no external source/provider calls.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {knowledgeConceptCoverage} from './public/knowledge-coverage.js';
import {catalogueRecord,applyKnowledgeCommand,knowledgeStamp,knowledgeImpactStamp,claimReceiptCurrent} from './public/knowledge-governance.js';
import {architectureOptions,architectureSources} from './public/architecture-knowledge.js';

const at='2026-10-21T12:00:00.000Z',author='coverage-author',reviewer='coverage-independent-reviewer',subject='PAT-CACHE-ASIDE';
let p=createProject({name:'Synthetic museum reading evidence',template:'blank'},'coverage-museum',at);
const command=(type,payload,actor=author)=>{const r=applyKnowledgeCommand(p,{type:'knowledge.'+type,payload},at,actor);p=r.document;return r.selected;};
const review={reviewed:true,reviewer:'Synthetic independent curator',reason:'Checked the exact original, permission, interpretation and bounded conditions.',sourceChecked:true,rightsChecked:true,conditionsChecked:true,decision:'verified'};
const coverage=()=>knowledgeConceptCoverage(p,subject);
const mapped=[['PAT-CACHE-ASIDE','reads','cache-aside'],['PAT-TRANSACTIONAL-OUTBOX','delivery','transactional-outbox'],['PAT-CIRCUIT-BREAKER','resilience','protected-call'],['PAT-BULKHEAD','resilience','protected-call'],['PAT-RETRY-WITH-BACKOFF','resilience','bounded-call'],['PAT-SHARDING','partitioning','sharded'],['STYLE-LAYERED','structure','layered-module'],['PAT-LAYERED-ARCHITECTURE','structure','layered-module'],['STYLE-MODULAR-MONOLITH','structure','layered-module'],['PAT-MODULAR-MONOLITH','structure','layered-module'],['STYLE-MICROSERVICES','structure','service-boundaries'],['PAT-REQUEST-REPLY','interaction','request-reply'],['PAT-QUEUE-BASED-LOAD-LEVELING','interaction','durable-queue'],['ARCH-RELATIONAL-DATA-CAPABILITY','persistence','relational-transaction'],['PAT-DOCUMENT-STORE','persistence','aggregate-document'],['ARCH-DOCUMENT-DATA-CAPABILITY','persistence','aggregate-document']];
const before=JSON.stringify(p);
for(const [id,topic,optionId] of mapped){
 const C=knowledgeConceptCoverage(p,id),method=C.methods[0],sources=architectureSources(topic);
 assert(C.description,'The exact catalogue record must exist: '+id);assert.equal(C.description.authority.evaluateFit,false);
 assert.equal(C.methods.length,1);assert.equal(method.topic,topic);assert.equal(method.optionId,optionId);assert.equal(method.available,true);
 assert.equal(method.pattern,architectureOptions(topic).find(o=>o.id===optionId).pattern);
 assert.equal(method.packId,sources.id);assert.deepEqual(method.sourceIds,[sources.method.id,...sources.references.map(r=>r.id)]);
 assert.equal(C.reviewed.length,0,'Built-in methods cannot become independently reviewed project claims');
}
for(const id of ['PAT-IDENTITY-AWARE-PROXY','ANTI-RETRY-STORM','PAT-AGGREGATE','TPL-TRANSACTIONAL-OUTBOX-TOPOLOGY']){
 const C=knowledgeConceptCoverage(p,id);assert(C.description);assert.deepEqual(C.methods,[],'Related wording must not create a generic comparison mapping: '+id);
}
assert.deepEqual(knowledgeConceptCoverage(p,'invented interaction caching proxy concept').methods,[],'An unknown concept never defaults to interaction');
assert.equal(JSON.stringify(p),before,'Coverage reads do not change design or knowledge state');

const original='Synthetic FixtureCache 2.0 keeps museum label copies only for reads that permit one second of age. It has no authority over collection-loan outcomes.';
const sourceId=command('source',{title:'Synthetic museum label cache',body:original,path:'synthetic/museum-label-cache.txt',revision:'fixture-1',license:'Original synthetic fixture material.'});
const unit={kind:'product-mechanism',mechanism:'Reuse permitted museum label copies within the declared age bound.',scope:{capability:'Museum label reads',product:'FixtureCache',version:'2.0',topology:'One disposable cache beside the authoritative catalogue',tier:'Synthetic test edition',operatingModel:'Museum operations'},effects:[{quality:'latency',direction:'supports',rationale:'Avoid a remote lookup for a permitted copy; no measurement has been made.'}],obligations:[{action:'Exercise expiration around an authoritative update.',evidence:'Source version, observed age and returned label.'}],exclusions:['Collection-loan outcomes.'],applicability:{requires:[{id:'age',fact:'museum.allowedAgeMs',op:'gte',value:1000,label:'Read permits at least one second of source-value age'}],excludes:[{id:'outcome',fact:'museum.loanOutcome',op:'eq',value:true,label:'The response is an authoritative loan outcome'}]},placement:[{target:'caller',reason:'The reading path enforces its permitted age.'}]};
const claimId=command('claim',{sourceId,lineStart:1,lineEnd:1,subjectId:subject,predicate:'bounded-label-copy',statement:'FixtureCache 2.0 can hold permitted museum label copies under the declared read conditions.',claimType:'applicability',polarity:'supports',conditions:['The read permits one second of age.'],limitations:['No product performance or outcome correctness has been verified.'],architectureUnit:unit});
assert.equal(coverage().reviewed.length,0);assert.equal(coverage().inactiveCount,1,'Candidate remains outside active coverage');
assert.throws(()=>command('review',{...review,id:claimId}),/Another|author|different|own/i,'The author cannot supply independent review');
command('review',{...review,id:claimId},reviewer);assert.equal(coverage().reviewed.length,0,'Review alone is not activation');
const releaseId=command('release',{...review,title:'Synthetic museum label policy',claimIds:[claimId]});
assert.equal(coverage().reviewed.length,0,'An unpinned release does not supply coverage');
command('activate',{...review,id:releaseId,stamp:knowledgeStamp(p)});
let C=coverage();assert.equal(C.reviewed.length,1);assert.equal(C.inactiveCount,0);assert(C.reviewed[0].structured);
assert.deepEqual(C.reviewed[0].scope,unit.scope);assert.deepEqual(C.reviewed[0].applicability,unit.applicability);assert(claimReceiptCurrent(p,C.reviewed[0].receipt));
assert.equal(knowledgeConceptCoverage(p,'PAT-BULKHEAD').reviewed.length,0,'Reviewed claims never leak through related words or neighbouring concepts');

const definitionSource=command('source',{title:'Synthetic pattern terminology',body:'A disposable copy does not become the authoritative writer.',path:'synthetic/copy-terminology.txt',revision:'fixture-1',license:'Original synthetic fixture material.'});
const definitionId=command('claim',{sourceId:definitionSource,lineStart:1,lineEnd:1,subjectId:subject,predicate:'copy-terminology',statement:'A disposable copy retains no business-write authority.',claimType:'definition',polarity:'neutral',conditions:[],limitations:['A terminology statement, without executable applicability conditions.']});
command('review',{...review,id:definitionId},reviewer);
const definitionRelease=command('release',{...review,title:'Synthetic terminology',claimIds:[definitionId]});command('activate',{...review,id:definitionRelease,stamp:knowledgeStamp(p)});
const eligible=structuredClone(p);C=coverage();assert.equal(C.reviewed.length,2);assert.equal(C.reviewed.find(c=>c.claimId===definitionId).structured,false);assert.equal(C.reviewed.find(c=>c.claimId===definitionId).applicability,null);
command('withdraw',{...review,id:sourceId,stamp:knowledgeImpactStamp(p,sourceId)});
assert(!coverage().reviewed.some(c=>c.claimId===claimId));assert(coverage().unavailable.some(c=>c.claimId===claimId&&/withdrawn/.test(c.reason)));
assert(coverage().methods[0].available,'Withdrawing a project source does not withdraw an independent built-in comparison');
p=structuredClone(eligible);command('source',{title:'Changed museum policy',body:'The synthetic cache no longer permits label reuse in the amended policy.',path:'synthetic/museum-label-cache.txt',revision:'fixture-2',supersedes:sourceId,license:'Original synthetic fixture material.'});
assert(!coverage().reviewed.some(c=>c.claimId===claimId));assert(coverage().unavailable.some(c=>c.claimId===claimId&&/superseded/.test(c.reason)));
const revised=structuredClone(p);
p=structuredClone(eligible);command('deactivate',{...review,id:releaseId,stamp:knowledgeStamp(p)});assert(!coverage().reviewed.some(c=>c.claimId===claimId));assert.equal(coverage().inactiveCount,1);
p=structuredClone(eligible);command('withdraw',{...review,id:'MS-CACHE-ASIDE',stamp:knowledgeImpactStamp(p,'MS-CACHE-ASIDE')});assert.equal(coverage().methods[0].available,false);assert.equal(coverage().reviewed.length,2,'Independent reviewed claims retain their own source lifecycle');
const methodWithdrawn=structuredClone(p);
p=structuredClone(eligible);command('withdraw',{...review,id:subject,stamp:knowledgeImpactStamp(p,subject)});assert.equal(coverage().description,null);assert(coverage().unavailable.some(x=>x.id===subject));
assert.equal(coverage().methods[0].available,true,'A catalogue withdrawal is not silently treated as withdrawal of another source pack');
p=structuredClone(eligible);p.knowledge.sources.find(s=>s.id===sourceId).body+=' Unreviewed mutation.';assert(!coverage().reviewed.some(c=>c.claimId===claimId),'Changed exact source content cannot retain coverage');
p=structuredClone(eligible);p.knowledge.releases.find(r=>r.id===releaseId).claims[0].architectureUnit.scope.version='3.0';assert(!coverage().reviewed.some(c=>c.claimId===claimId),'Changing a released version invalidates its existing review and release checksum');

// Native concept card and source-reader behaviour. The model and evidence remain
// separate; changing an available method only changes the existing comparison action.
const {Window}=await import('happy-dom');
const w=new Window({url:'https://aiw.test/?project=coverage-museum'});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
globalThis.fetch=async()=>assert.fail('Coverage must not fetch a source or invoke a provider');
const {conceptEvidencePostureHTML,knowledgeWorkspace,mountKnowledge}=await import('./public/knowledge-workspace-ui.js');
const {brainContext}=await import('./public/aiw-brain.js');
const store={value:{document:eligible,revision:1}};window.aiwProjectStore=store;
const q=s=>document.querySelector(s),open=[];window.aiwArchitectureTask={openConcern:topic=>open.push(topic)};
const context=()=>brainContext(store.value.document,{chapter:1,tab:'work',id:'project'});
const render=()=>{document.body.innerHTML='<div id="brain-panel">'+knowledgeWorkspace(store.value.document,context())+'</div>';};
try{
 render();mountKnowledge(eligible,context(),{open:render});window.aiwKnowledge.openReference('catalogue:'+subject);
 assert(q('[data-k-evidence="'+subject+'"]'),'Coverage lives within the existing concept Evidence posture disclosure');
 assert.equal(q('[data-k-evidence]').open,false,'Evidence detail is progressively disclosed');
 assert(q('[data-k-action="compose"][data-topic="reads"]'));q('[data-k-action="compose"]').click();assert.deepEqual(open,['reads']);
 const evidence=q('[data-k-evidence]').textContent;assert.match(evidence,/Bounded design comparison/);assert.match(evidence,/FixtureCache/);assert.match(evidence,/2\.0/);assert.match(evidence,/museum.allowedAgeMs/);assert.match(evidence,/No machine-checkable conditions/);assert.match(evidence,/Accepted design support/);assert.match(evidence,/verification records/);
 const sourceButton=q('[data-k-action="coverage-claim"][data-id="'+claimId+'"]');sourceButton.focus();sourceButton.click();
 assert(q('.ak-source-dialog[open]'));assert(q('.ak-source-dialog pre').textContent.includes(original));q('.ak-source-dialog [data-dialog-close]').click();assert.equal(document.activeElement,sourceButton,'Exact source review returns focus to the same concept');
 window.aiwKnowledge.openReference('catalogue:PAT-IDENTITY-AWARE-PROXY');assert(!q('[data-k-action="compose"]'));assert.match(q('[data-k-evidence]').textContent,/No built-in comparison is mapped to this exact concept/);
 store.value.document=methodWithdrawn;window.aiwKnowledge.openReference('catalogue:'+subject);assert(!q('[data-k-action="compose"]'));assert.match(q('[data-k-evidence]').textContent,/Supporting method or reference withdrawn/);
 const html=conceptEvidencePostureHTML(catalogueRecord(subject),knowledgeConceptCoverage(revised,subject));assert.match(html,/superseded/);assert(!html.includes('data-id="'+claimId+'"'),'An ineligible claim cannot keep its active claim control');
 const malicious=knowledgeConceptCoverage(eligible,subject);malicious.reviewed[0].scope.product='<script>unsafe</script>';assert(!conceptEvidencePostureHTML(catalogueRecord(subject),malicious).includes('<script>'),'Claim scope is escaped');
 assert.equal(store.value.document.coauthoring?.designTasks?.length||0,0,'Coverage and source inspection cannot accept a design');
 console.log('PASS exact concept coverage: existing comparison mappings and source IDs; candidate/review/release/activation; typed versus descriptive claims; version/configuration scope; unrelated/withdrawn/revised/tampered support; native disclosure, guarded comparison and exact-source focus return. No design adoption, runtime verification or live external calls.');
}finally{await w.happyDOM.abort();w.close();}
