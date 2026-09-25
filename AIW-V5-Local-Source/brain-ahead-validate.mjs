// The Brain's "Ahead" items: the desk and Sol in the SDD (the architecture reasoning record), Mind
// Factory opened from a desk switch point (product comparison with governed claims), switch-point
// recall anchored on the realisation, and repository leads worded from what Sol reads.
// Run: npm run test:brain-ahead
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview,exportSDD,applyFinalReviewCommand} from './public/review-domain.js';
import {applyKnowledgeCommand,knowledgeStamp,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {productComparison} from './public/product-comparison.js';
import {decisionPoints,reasoningPacket} from './public/brain-reasoning.js';
import {leadQuery} from './public/brain-reasoning-ui.js';
import {brainContext} from './public/aiw-brain.js';

const checks=[],started=Date.now();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const at='2026-09-26T10:00:00.000Z',review={reviewed:true,reviewer:'Architecture reviewer',reason:'Checked against the original passage and conditions.'};
const k=(p,type,payload)=>applyKnowledgeCommand(p,{type,payload},at,'local-architect');

// A governed claim that names RabbitMQ, taken through source, interpretation, review, release and activation.
function governed(p){
 const body='Quorum queues in RabbitMQ replicate each message to a majority of nodes.\nA minority of failed nodes does not stop the queue.\nThe queue stops accepting writes without a majority.';
 let r=k(p,'knowledge.source',{title:'Team operating note on RabbitMQ',body,path:'notes/rabbitmq.md',revision:'2026-09-01',license:'Project-authored note.'});p=r.document;const sourceId=r.selected;
 r=k(p,'knowledge.claim',{sourceId,lineStart:1,lineEnd:3,subjectId:'RabbitMQ quorum queues',predicate:'tolerates',statement:'RabbitMQ quorum queues keep working while a majority of nodes is available.',claimType:'applicability',polarity:'supports',conditions:'Three or more nodes across failure domains',limitations:'Writes stop without a majority'});p=r.document;const claimId=r.selected;
 p=k(p,'knowledge.review',{id:claimId,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true,...review}).document;
 r=k(p,'knowledge.release',{claimIds:[claimId],title:'Messaging operations',...review});p=r.document;const releaseId=r.selected;
 p=k(p,'knowledge.activate',{id:releaseId,stamp:knowledgeStamp(p),...review}).document;
 return {p,claimId,releaseId};
}

await check('SDD: the architecture reasoning record carries the vitals, product choices, Sol’s advice with outcomes and what the project learned',async()=>{
 let p=withFinalReview(seedProject());const {p:q,claimId}=governed(p);p=q;
 p.coauthoring={...(p.coauthoring||{}),assessments:[
  {id:'SA-001',runId:'run-1',itemId:'F:capacity:run-001',title:'Let RUN-001 grow to 24 replicas',kind:'fix',chapter:10,verdict:'refine',headline:'Keep the draft with 26 replicas.',outcome:'used',at,provider:'OpenAI',model:'gpt-test',packetStamp:'abc123def4567890',sources:[{ref:'S1',kind:'instrument-reading',title:'RUN-001 capacity reading'},{ref:'S3',kind:'product-mechanism',objectId:'AIW-PRODUCT-MECHANISMS-1',title:'Kubernetes · documented mechanism',receipt:{packId:'AIW-PRODUCT-MECHANISMS-1'}}]},
  {id:'SA-002',runId:'run-2',itemId:'M:8:if-004',title:'IF-004 Check',kind:'record',chapter:8,verdict:'reconsider',headline:'Record a timeout.',outcome:'dismissed',reason:'The partner contract fixes the timeout.',at,provider:'OpenAI',model:'gpt-test',packetStamp:'fff0001112223334',sources:[{ref:'S1',kind:'chapter-reading',title:'IF-004 reading'}]}]};
 p.knowledge.stewardship=[{id:'KD-0101',key:'dismissal:SA-002',assessmentId:'SA-002',decision:'captured',claimId,objectId:'if-004',at,actor:'local-architect',reviewer:'Knowledge steward',reason:'The partner contract governs this timeout.'}];
 p=k(p,'knowledge.withdraw',{id:'AIW-PRODUCT-MECHANISMS-1',stamp:knowledgeImpactStamp(p,'AIW-PRODUCT-MECHANISMS-1'),...review,reason:'Vendor pages under review.'}).document;
 const md=exportSDD(withFinalReview(p)),i=md.indexOf('## Architecture reasoning record'),section=md.slice(i,md.indexOf('## Delivery and verification obligations'));
 assert(i>0&&i<md.indexOf('## Delivery and verification obligations'));
 assert.match(section,/### Vitals at review/);assert.match(section,/\| Capacity \| Critical \|/);assert.match(section,/design arithmetic, not measurement/);
 assert.match(section,/### Product choices/);assert.match(section,/TR-003 Durable work handoff realization/);assert.match(section,/Switch point, not yet framed/);
 assert.match(section,/2 records: 1 taken, 0 applied, 1 disagreed with/);assert.match(section,/\*\*SA-002\*\*.*the architect disagreed: The partner contract fixes the timeout/);
 assert.match(section,/\*\*SA-001\*\*.*\*\*since withdrawn:\*\* Kubernetes · documented mechanism/);
 assert.match(section,/### What the project learned from its disagreements/);assert.match(section,/KD-0101 · from SA-002 on if-004 → KC-\d+: Captured · reviewed · released · active/);
 assert.match(section,/### Knowledge withdrawn and what it reached/);assert.match(section,/AIW-PRODUCT-MECHANISMS-1 · 2026-09-26 · Vendor pages under review\. — reached Sol assessment SA-001/);
});

await check('the reasoning record escapes table and list text, and stays inert in the HTML SDD',async()=>{
 let p=withFinalReview(seedProject());
 p.coauthoring={...(p.coauthoring||{}),assessments:[{id:'SA-001',runId:'r',itemId:'F:x',title:'<script>alert(1)</script> pipe | test',kind:'fix',chapter:10,verdict:'apply',headline:'Fine',outcome:'used',at,provider:'OpenAI',model:'m',packetStamp:'x',sources:[]}]};
 const md=exportSDD(p);assert.match(md,/pipe \\\| test/,'table and list text escape the pipe');
 const {sddHTML}=await import('./public/review-domain.js'),{logicalGraph}=await import('./public/logical-domain.js');
 assert(!sddHTML(md,logicalGraph(p)).includes('<script>alert(1)</script>'));
});

await check('Mind Factory from the desk: each product with its documented mechanisms and the governed claims that name it',async()=>{
 const {p}=governed(withFinalReview(seedProject()));
 const X=productComparison(p,'tr-003');assert(X);assert.equal(X.switchPoint,true);
 const rabbit=X.options.find(o=>/rabbitmq/i.test(o.product)),kafka=X.options.find(o=>/kafka/i.test(o.product));
 assert.equal(rabbit.reading,true);assert(rabbit.mechanisms.length>=2);assert(kafka.mechanisms.some(m=>m.id==='kafka-replay'));
 assert.equal(rabbit.claims.length,1);assert.equal(rabbit.claims[0].receipt.scoring,false);assert.equal(kafka.claims.length,0,'a claim is attached only where it names the product');
 const w=k(p,'knowledge.withdraw',{id:'AIW-PRODUCT-MECHANISMS-1',stamp:knowledgeImpactStamp(p,'AIW-PRODUCT-MECHANISMS-1'),...review}).document;
 const Y=productComparison(w,'tr-003');assert.equal(Y.mechanismsWithdrawn,true);assert(Y.options.every(o=>o.mechanisms.length===0));
 assert.equal(productComparison(p,'no-such-realisation'),null);
});

await check('the comparison renders in Mind Factory, opened by the desk’s public entry point',async()=>{
 const {p}=governed(withFinalReview(seedProject()));
 globalThis.window=globalThis;globalThis.location={origin:'https://aiw.test',search:''};
 const {knowledgeWorkspace,mountKnowledge}=await import('./public/knowledge-workspace-ui.js');
 const c=brainContext(p,{chapter:7,id:'tr-003'});let opened=0;mountKnowledge(p,c,{open(){opened++;},changed(){}});
 window.aiwKnowledge.compareProducts('tr-003');assert.equal(opened,1);
 const html=knowledgeWorkspace(p,c);assert.match(html,/Product choice · TR-003/);assert.match(html,/RabbitMQ quorum queues keep working/);assert.match(html,/No active, reviewed claim in this project names Apache Kafka/);assert.match(html,/Find repository passages about Apache Kafka/);assert.match(html,/A lean is not a decision/);
});

await check('Sol at a switch point: recall anchors on the Chapter 7 realisation; leads are worded from what Sol reads',async()=>{
 const {p}=governed(withFinalReview(seedProject()));
 const {items}=decisionPoints(p,{ids:['F:switch:tr-003'],values:{}});assert.equal(items[0].objectId,'tr-003');assert.equal(items[0].objectChapter,7);
 const packet=reasoningPacket(p,{task:'decisions',ids:['F:switch:tr-003'],scope:'desk:test'});
 assert(packet.sources.some(s=>s.kind==='governed-claim'&&/RabbitMQ/.test(s.excerpt)),'the reviewed claim about the product reaches Sol through the realisation');
 const q=leadQuery(packet);assert(q.split(' ').length>=3&&q.split(' ').length<=12);assert(!/\b(the|chapter|decision|draft)\b/.test(q));
});
console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:Math.round((Date.now()-started)/1000),checksRun:checks},null,2));
