// A synthetic gate test for the payment candidate pack. No public page body,
// private project original, independent real review, signature or outcome is
// represented by this fixture. Run: node payment-knowledge-pilot-validate.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProject} from './shared/projects-domain.js';
import {applyKnowledgeCommand,knowledgeEligibility,knowledgeImpactStamp,knowledgeStamp,releasedClaims} from './public/knowledge-governance.js';
import {architectureKnowledgeForChoice} from './public/architecture-knowledge.js';
import {architectureBrain,brainSources} from './public/architecture-brain.js';
import {brainContext,knowledgeForContext} from './public/aiw-brain.js';
import {relevantKnowledge} from './public/knowledge-relevance.js';
import {architectureIntelligence} from './public/architecture-intelligence.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {prepareBrainPacket} from './brain-retrieval.js';
import {localDatabase} from './local-db.js';
import {technologyProductsMentioned} from './public/technology-catalogue.js';

const manifest=JSON.parse(readFileSync(new URL('./evaluation/payment-architecture-knowledge-pilot.json',import.meta.url),'utf8'));
const at='2026-10-11T10:00:00.000Z';
const author='synthetic-pilot-author',second='synthetic-pilot-second-actor';
const approved={reviewed:true,reviewer:'Synthetic second actor',reason:'Test-only interpretation and source-use checks; not a real release.'};
function fixture(){
 let p=createProject({name:'Synthetic payment knowledge gate',template:manifest.case.template},author,at);
 const command=(action,payload,actor=author)=>{const out=applyKnowledgeCommand(p,{type:'knowledge.'+action,payload},at,actor);p=out.document;return out.selected;};
 const claimIds={};
 for(const c of manifest.candidateClaims){
  // The body below is an authored test sentence. The manifest's official URLs
  // are locators only, and this sentence must not masquerade as their text.
  const sourceId=command('source',{title:`Synthetic fixture for ${c.id}`,body:`Fixture note for ${c.id}: a payment reference crosses a handoff boundary.\nThis is a fabricated test line, not an acquired source passage.`,revision:'synthetic-v1',path:`evaluation/${c.id}.fixture`,license:'Synthetic fixture; no public or private source rights are asserted.'});
  claimIds[c.id]=command('claim',{sourceId,lineStart:1,lineEnd:2,subjectId:c.subjectId,claimType:c.claimType,predicate:c.predicate,polarity:c.polarity,statement:c.statement,conditions:c.conditions,limitations:c.limitations,architectureUnit:c.architectureUnit});
 }
 return {get project(){return p;},command,claimIds};
}

test('pilot ties three requirements and drivers to both recorded technology options, while preserving candidate authority',()=>{
 const p=createProject({name:'Payment pilot reference',template:'bank-payment'},author,at);
 for(const id of manifest.case.requirements)assert(p.artefacts.some(x=>x.id===id&&x.type==='requirement'),id);
 for(const id of manifest.case.drivers)assert(p.quality.drivers.some(x=>x.id===id),id);
 assert(p.technology.capabilities.some(x=>x.id===manifest.case.capability.id&&x.ref===manifest.case.capability.ref));
 const r=p.technologyRealisation.records.find(x=>x.id===manifest.case.realization);
 assert(r);for(const option of manifest.case.options)assert(r.options.some(x=>x.id===option.id&&x.product.includes(option.product)),option.id);
 assert(p.technologyRealisation.mappings.some(x=>x.capabilityId===manifest.case.capability.id&&x.realizationId===r.id));
 assert.equal(manifest.sourcesToAcquire.every(s=>s.status!=='released'&&s.status!=='verified'),true);
 assert.match(manifest.authority,/not verified claims/);
 assert.equal(manifest.candidateClaims.every(c=>c.conditions.length&&c.limitations.length&&c.architectureUnit.effects.length&&c.architectureUnit.obligations.length),true);
});

test('candidate interpretations cannot appear as governed Brain or Chapter 7 choice authority',()=>{
 const f=fixture(),p=f.project,c=p.knowledge.claims.find(x=>x.id===f.claimIds['PILOT-KAFKA-1']);
 assert.equal(knowledgeEligibility(p,c).eligible,false);
 assert.equal(releasedClaims(p).length,0);
 const ctx=brainContext(p,{id:'REQ-004',chapter:7});
 assert.equal(architectureBrain(p,ctx,{query:'Kafka replay retained payment events'}).claims.length,0);
 assert.equal(architectureKnowledgeForChoice(p,{product:'Apache Kafka',version:'3.9',capabilities:[manifest.case.capability]}).matches.length,0);
 assert.throws(()=>f.command('review',{...approved,id:c.id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true},author),/Another authenticated person/);
 assert.throws(()=>f.command('release',{...approved,title:'Premature release',claimIds:[c.id]}),/has not passed/);
});

test('synthetic second-actor release exercises context, version, topology and withdrawal gates',()=>{
 const f=fixture(),ids=Object.values(f.claimIds);
 for(const id of ids)f.command('review',{...approved,id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true},second);
 const releaseId=f.command('release',{...approved,title:'Synthetic release gate',claimIds:ids},second);
 assert.equal(architectureKnowledgeForChoice(f.project,{product:'Apache Kafka',version:'3.9',capabilities:[manifest.case.capability]}).matches.length,0,'Unpinned release cannot inform a choice');
 f.command('activate',{...approved,id:releaseId,stamp:knowledgeStamp(f.project)},second);
 const capability=[manifest.case.capability],kafka={product:'Apache Kafka',version:'3.9',capabilities:capability};
 const matching=architectureKnowledgeForChoice(f.project,kafka);
 const kafkaMatch=matching.matches.find(x=>x.receipt.claimId===f.claimIds['PILOT-KAFKA-1']);
 assert(kafkaMatch);assert.equal(kafkaMatch.applicability.state,'context-match');
 assert.equal(kafkaMatch.receipt.architectureUnit.scope.version,'3.9');
 assert(kafkaMatch.conditions.some(x=>/Replay is a stated requirement/.test(x)));
 assert(kafkaMatch.unit.obligations.some(x=>/consumer crash/.test(x.action)));
 const unknown=architectureKnowledgeForChoice(f.project,{product:'Apache Kafka',capabilities:capability});
 assert.equal(unknown.matches.find(x=>x.receipt.claimId===f.claimIds['PILOT-KAFKA-1']).applicability.state,'needs-context');
 assert(!architectureKnowledgeForChoice(f.project,{...kafka,version:'4.0'}).matches.some(x=>x.receipt.claimId===f.claimIds['PILOT-KAFKA-1']));
 assert(!architectureKnowledgeForChoice(f.project,{...kafka,version:'39'}).matches.some(x=>x.receipt.claimId===f.claimIds['PILOT-KAFKA-1']),'Version punctuation is part of the documented scope.');
 assert(!architectureKnowledgeForChoice(f.project,{...kafka,product:'Kafka-compatible service'}).matches.some(x=>x.receipt.claimId===f.claimIds['PILOT-KAFKA-1']),'A product containing Kafka in its description is not Apache Kafka.');
 const rabbit=architectureKnowledgeForChoice(f.project,{product:'RabbitMQ',version:'4.0',capabilities:capability});
 assert.equal(rabbit.matches.find(x=>x.receipt.claimId===f.claimIds['PILOT-RABBIT-1']).applicability.state,'needs-context');
 const configured=architectureKnowledgeForChoice(f.project,{product:'RabbitMQ',version:'4.0',topology:'quorum queue',capabilities:capability});
 assert.equal(configured.matches.find(x=>x.receipt.claimId===f.claimIds['PILOT-RABBIT-1']).applicability.state,'context-match');
 assert(!configured.matches.some(x=>x.receipt.claimId===f.claimIds['PILOT-KAFKA-1']));
 const context=brainContext(f.project,{chapter:7,id:manifest.case.realization});
 const brain=architectureBrain(f.project,context,{query:'Kafka RabbitMQ payment handoff and retained event replay'});
 const kafkaLink=brain.receipt.optionLinks.find(x=>x.optionId==='TO-006'&&x.claimId===f.claimIds['PILOT-KAFKA-1']);
 assert(kafkaLink,'The released claim joins the saved Chapter 7 option in the Brain graph.');
 assert(brain.graph.edges.some(x=>x.from==='option:'+manifest.case.realization+':TO-006'&&x.to==='claim:'+kafkaLink.releaseId+':'+kafkaLink.claimId));
 assert(brainSources(f.project,brain).some(x=>x.receipt?.claimId===kafkaLink.claimId&&JSON.parse(x.excerpt).architectureUnit?.scope.version==='3.9'),'Sol reads the reviewed product scope and its obligations.');
 assert(!technologyProductsMentioned('Assess a Kafka-compatible service').has('kafka'));
 const qualified=architectureBrain(f.project,context,{query:'Assess a Kafka-compatible service for payment replay'});
 assert(!qualified.claims.some(x=>x.claim.id===f.claimIds['PILOT-KAFKA-1']),'A compatible service must not borrow the Apache Kafka claim.');
 f.command('withdraw',{...approved,id:f.claimIds['PILOT-KAFKA-1'],stamp:knowledgeImpactStamp(f.project,f.claimIds['PILOT-KAFKA-1'])},second);
 assert(!architectureKnowledgeForChoice(f.project,kafka).matches.some(x=>x.receipt.claimId===f.claimIds['PILOT-KAFKA-1']));
 assert.equal(releasedClaims(f.project).find(x=>x.claim.id===f.claimIds['PILOT-KAFKA-1']).eligible,false);
});

test('Chapter 7 packets do not borrow Kafka 3.9 support from a different saved option or version',async()=>{
 const f=fixture(),ids=Object.values(f.claimIds);
 for(const id of ids)f.command('review',{...approved,id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true},second);
 const releaseId=f.command('release',{...approved,title:'Synthetic source-scope gate',claimIds:ids},second);
 f.command('activate',{...approved,id:releaseId,stamp:knowledgeStamp(f.project)},second);
 const kafkaId=f.claimIds['PILOT-KAFKA-1'],question='How does Kafka replay retained payment events for reliability?';
 const request={chapter:7,objectId:manifest.case.realization,mode:'mind',prompt:question};
 const files=new Map(),env={DB:localDatabase(':memory:'),OPENAI_API_KEY:'synthetic-only',FILES:{async get(key){return files.has(key)?{text:async()=>files.get(key)}:null;},async put(key,value){files.set(key,value);}}};
 const fetcher=async(url,init)=>{
  assert.equal(url,'https://api.openai.com/v1/embeddings');
  const body=JSON.parse(init.body);
  return Response.json({model:body.model,usage:{total_tokens:body.input.length},data:body.input.map((value,index)=>({index,embedding:Array.from({length:256},(_,n)=>n===0?1:n===1?value.length%17/17:0)}))});
 };
 const sourcesFor=p=>{
  const ctx=brainContext(p,{chapter:7,id:manifest.case.realization});
  const brain=architectureBrain(p,ctx,{query:question});
  const lexical=brainSources(p,brain).filter(s=>s.kind==='governed-claim');
  const prepared=intelligencePacket(p,request).sources.filter(s=>s.kind==='governed-claim');
  return {brain,lexical,prepared};
 };
 try{
  const both=sourcesFor(f.project),bothSemantic=await prepareBrainPacket(env,'synthetic-owner',f.project,{...request,semantic:true},{fetcher});
  assert(both.lexical.some(s=>s.receipt.claimId===kafkaId),'Comparison with the saved Kafka 3.9 alternative may read its candidate-supported claim after synthetic release.');
  assert(both.prepared.some(s=>s.receipt.claimId===kafkaId));
  assert(bothSemantic.sources.some(s=>s.receipt?.claimId===kafkaId),'Semantic preparation preserves the in-scope alternative.');
  for(const [label,configure] of [
   ['RabbitMQ only',r=>{r.options=r.options.filter(o=>o.id==='TO-005');}],
   ['Kafka 4.0 only',r=>{r.options=r.options.filter(o=>o.id==='TO-006');r.options[0].version='4.0';}]
  ]){
   const p=structuredClone(f.project),r=p.technologyRealisation.records.find(x=>x.id===manifest.case.realization);configure(r);
   const result=sourcesFor(p),semantic=await prepareBrainPacket(env,'synthetic-owner',p,{...request,semantic:true},{fetcher});
   assert(!result.lexical.some(s=>s.receipt.claimId===kafkaId),`${label} cannot contribute Kafka 3.9 to brainSources.`);
   assert(!result.prepared.some(s=>s.receipt.claimId===kafkaId),`${label} cannot contribute Kafka 3.9 to Sol's lexical packet.`);
   assert(!semantic.sources.some(s=>s.receipt?.claimId===kafkaId),`${label} cannot reintroduce Kafka 3.9 through semantic preparation.`);
   assert(!result.brain.receipt.claimIds.includes(kafkaId),`${label} cannot put Kafka 3.9 in the Brain receipt.`);
  }
 }finally{env.DB.close();}
});

test('scoped and disclosure-excluded knowledge is removed before embedding provider input',async()=>{
 const f=fixture(),ids=Object.values(f.claimIds);
 for(const id of ids)f.command('review',{...approved,id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true},second);
 const releaseId=f.command('release',{...approved,title:'Synthetic embedding disclosure gate',claimIds:ids},second);
 f.command('activate',{...approved,id:releaseId,stamp:knowledgeStamp(f.project)},second);
 const kafkaId=f.claimIds['PILOT-KAFKA-1'],kafkaClaim=f.project.knowledge.claims.find(c=>c.id===kafkaId),sourceId=kafkaClaim.sourceId;
 const request={chapter:7,objectId:manifest.case.realization,mode:'mind',prompt:'Explain the durable payment handoff and replay obligations.',semantic:true};
 async function probe(p){
  const inputs=[],files=new Map(),env={DB:localDatabase(':memory:'),OPENAI_API_KEY:'synthetic-only',FILES:{async get(key){return files.has(key)?{text:async()=>files.get(key)}:null;},async put(key,value){files.set(key,value);}}};
  const fetcher=async(url,init)=>{
   assert.equal(url,'https://api.openai.com/v1/embeddings');
   const body=JSON.parse(init.body);inputs.push(...body.input);
   return Response.json({model:body.model,usage:{total_tokens:body.input.length},data:body.input.map((value,index)=>({index,embedding:Array.from({length:256},(_,n)=>n===0?1:n===1?value.length%17/17:0)}))});
  };
  try{return {packet:await prepareBrainPacket(env,'synthetic-owner',p,request,{fetcher}),inputs};}finally{env.DB.close();}
 }
 const control=await probe(f.project);
 assert(control.inputs.some(x=>x.includes(kafkaClaim.statement)),'The synthetic control proves this claim would otherwise be sent for embedding.');
 const rabbitOnly=structuredClone(f.project),r=rabbitOnly.technologyRealisation.records.find(x=>x.id===manifest.case.realization);r.options=r.options.filter(o=>o.id==='TO-005');
 const scoped=await probe(rabbitOnly);
 assert(!scoped.inputs.some(x=>x.includes(kafkaClaim.statement)||x.includes('PILOT-KAFKA-1')),'An out-of-scope Kafka claim and its fabricated source text must not enter the embedding request.');
 assert(!scoped.packet.sources.some(s=>s.receipt?.claimId===kafkaId));
 for(const [label,excludedId] of [['claim',kafkaId],['source',sourceId]]){
  const excluded=structuredClone(f.project);
  excluded.workspace.aiPolicy={...excluded.workspace.aiPolicy,excludedObjectIds:[excludedId]};
  const privateRun=await probe(excluded);
  assert(!privateRun.inputs.some(x=>x.includes(kafkaClaim.statement)||x.includes('PILOT-KAFKA-1')),`Explicitly excluded ${label} content must not enter the embedding request.`);
  assert(!privateRun.packet.sources.some(s=>s.receipt?.claimId===kafkaId||s.receipt?.sourceId===sourceId),`A ${label} exclusion must also remove the governed claim from the prepared packet.`);
 }
});

// rc41 close (W4-kafka-scope): the gate holds on every reading a packet is built from, not only on the Brain's own
// retrieval. The question's knowledge (knowledgeForContext over relevantKnowledge) and the contextual reading
// (architectureIntelligence: its insights and their sources, which the Sol, field-draft and review packets carry) read
// the released claims too; a claim outside the saved options' scope is withheld there with its reason, and the Sol packet
// records that reason. The question below names no product, so the option scope alone must hold Kafka 3.9 back.
test('every reading a packet is built from withholds an out-of-scope claim and the packet records why',()=>{
 const f=fixture(),ids=Object.values(f.claimIds);
 for(const id of ids)f.command('review',{...approved,id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true},second);
 const releaseId=f.command('release',{...approved,title:'Synthetic reading-scope gate',claimIds:ids},second);
 f.command('activate',{...approved,id:releaseId,stamp:knowledgeStamp(f.project)},second);
 const kafkaId=f.claimIds['PILOT-KAFKA-1'],prompt='How do independent consumers revisit retained event records for reliability?';
 const carries=(value,id)=>{const text=JSON.stringify(value);return text.includes('"'+id+'"')||text.includes(':'+id+'"');};
 const readings=p=>{
  const selection={chapter:7,id:manifest.case.realization},c=brainContext(p,selection);
  return {relevant:relevantKnowledge(c,{prompt,project:p}),knowledge:knowledgeForContext(c,{prompt,project:p}),intelligence:architectureIntelligence(p,selection,{context:c,prompt}),packet:intelligencePacket(p,{chapter:7,objectId:manifest.case.realization,mode:'mind',prompt})};
 };
 const both=readings(f.project);
 assert(both.relevant.some(h=>h.structure.claimId===kafkaId),'In scope (the Kafka 3.9 option saved), the question still finds the claim.');
 assert(both.packet.sources.some(s=>s.kind==='governed-claim'&&s.receipt.claimId===kafkaId),'In scope, the packet carries it.');
 for(const [label,configure] of [
  ['RabbitMQ only',r=>{r.options=r.options.filter(o=>o.id==='TO-005');}],
  ['Kafka 4.0 only',r=>{r.options=r.options.filter(o=>o.id==='TO-006');r.options[0].version='4.0';}]
 ]){
  const p=structuredClone(f.project);configure(p.technologyRealisation.records.find(x=>x.id===manifest.case.realization));
  const r=readings(p);
  assert(!r.relevant.some(h=>h.structure.claimId===kafkaId),`${label}: relevantKnowledge does not rank Kafka 3.9.`);
  assert.deepEqual(r.relevant.withheld.filter(w=>w.id===kafkaId).map(w=>[w.releaseId,w.reasons.length]),[[releaseId,1]],`${label}: relevantKnowledge lists Kafka 3.9 as withheld, once, with one reason.`);
  assert.match(r.relevant.withheld.find(w=>w.id===kafkaId).reasons[0],/No saved option matches this claim/,`${label}: the reason is the option scope.`);
  assert(!r.knowledge.some(k=>k.structure.claimId===kafkaId),`${label}: the question's knowledge does not carry Kafka 3.9.`);
  assert.deepEqual(r.knowledge.withheld,r.relevant.withheld,`${label}: knowledgeForContext hands on what was withheld.`);
  assert(!r.intelligence.insights.some(i=>carries(i,kafkaId)),`${label}: no contextual insight rests on Kafka 3.9.`);
  assert(!r.intelligence.sources.some(s=>s.receipt?.claimId===kafkaId),`${label}: no contextual source is Kafka 3.9.`);
  assert(!r.packet.sources.some(s=>s.receipt?.claimId===kafkaId||carries(s.excerpt,kafkaId)),`${label}: no passage of Sol's packet carries Kafka 3.9.`);
  assert(!r.packet.brainReceipt.claimIds.includes(kafkaId),`${label}: the packet's receipt does not name it.`);
  const recorded=r.packet.excludedKnowledge.filter(x=>x.id===kafkaId&&x.releaseId===releaseId);
  assert.equal(recorded.length,1,`${label}: the packet records Kafka 3.9 as withheld, once.`);
  assert(recorded[0].reasons.some(x=>/No saved option matches this claim/.test(x)),`${label}: with the gate's reason.`);
 }
 assert(Array.isArray(both.relevant.withheld)&&!both.relevant.withheld.some(w=>w.id===kafkaId),'In scope, nothing is withheld for it.');
 assert(!both.packet.excludedKnowledge.some(x=>x.id===kafkaId),'In scope, the packet records nothing withheld for it.');
});
