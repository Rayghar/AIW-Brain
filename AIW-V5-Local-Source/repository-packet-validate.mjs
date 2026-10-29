import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareRepositoryPacket} from './repository-packet.js';
import {releasedClaims} from './public/knowledge-governance.js';
import {sha256} from './public/brain-integrity.js';
import {CATALOGUE} from './public/catalogue-index.js';
const packet=JSON.parse(fs.readFileSync(process.env.AIW_PACKET_PATH,'utf8'));
const project={id:packet.projectId},scope={tenantId:packet.tenantId,projectId:packet.projectId};
const results=[];
function test(name,fn){fn();results.push({name,passed:true});}
const mutate=fn=>{const p=structuredClone(packet);fn(p);return p;};
test('actual 24-file metadata packet accepted',()=>{const result=prepareRepositoryPacket(project,packet,scope);assert.equal(result.counts.sources,24);assert.equal(result.readOnly,true);assert.equal(result.activation.allowed,false);assert(result.locators.every(x=>x.command));});
test('exact candidate passages and lexical cues survive as review leads',()=>{
 const result=prepareRepositoryPacket(project,packet,scope);assert.equal(result.candidates.length,packet.claims.length);
 for(const candidate of result.candidates){
  const claim=packet.claims.find(c=>c.claimId===candidate.claimId),source=packet.sources.find(s=>s.revisionId===claim.revisionId),passage=source.passages.find(p=>p.passageId===claim.passageId);
  assert.equal(candidate.authority,'candidate');assert.equal(candidate.eligible,false);assert.equal(candidate.reviewState,'unreviewed');assert.equal(candidate.releaseState,'unreleased');
  assert.deepEqual([candidate.lineStart,candidate.lineEnd,candidate.excerptHash],[passage.lineStart,passage.lineEnd,passage.excerptHash]);
  assert.equal(candidate.source.hash,source.hash);assert.equal(candidate.source.commit,source.commit);assert.equal(candidate.source.manifestHash,source.manifestHash);
  assert.deepEqual(candidate.cues.map(({catalogueId,targetState,...cue})=>cue),claim.edges);assert(!('statement' in candidate),'A placeholder is not emitted as an architectural fact');
  assert.deepEqual(result.locators.find(l=>l.revisionId===source.revisionId).passages,source.passages);
 }
});
test('cue resolution uses exact catalogue identity, never its display label',()=>{
 const record=CATALOGUE.records[0],known='concept-'+sha256(JSON.stringify(['catalogue',record.id])).slice(0,32),unknown='concept-'+sha256('synthetic-unregistered-cue').slice(0,32);
 const candidatePacket=mutate(p=>{p.claims[0].edges=[
  {type:'concept',target:known,label:'Synthetic unrelated display label',status:'suggestion',inference:'lexical-cue-only; applicability and semantics unverified'},
  {type:'concept',target:unknown,label:record.name.slice(0,60),status:'suggestion',inference:'lexical-cue-only; applicability and semantics unverified'}
 ];});
 const lead=prepareRepositoryPacket(project,candidatePacket,scope).candidates[0];
 assert.equal(lead.cues[0].catalogueId,record.id);assert.equal(lead.cues[0].targetState,'catalogued');
 assert.equal(lead.cues[1].catalogueId,null);assert.equal(lead.cues[1].targetState,'unresolved');
 assert.equal(lead.eligible,false);assert.equal(lead.authority,'candidate');
});
test('no project mutation or approved retrieval',()=>{const before=JSON.stringify(project);prepareRepositoryPacket(project,packet,scope);assert.equal(JSON.stringify(project),before);assert.deepEqual(releasedClaims(project),[]);});
test('tenant boundary',()=>assert.throws(()=>prepareRepositoryPacket(project,packet,{...scope,tenantId:'other'})));
test('project boundary',()=>assert.throws(()=>prepareRepositoryPacket(project,packet,{...scope,projectId:'other'})));
test('source body injection rejected',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.sources[0].body='private text'),scope)));
test('approval injection rejected',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.claims[0].eligible=true),scope)));
test('release injection rejected',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.release.status='signed'),scope)));
test('source identity tampering rejected',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.sources[0].hash='0'.repeat(64)),scope)));
test('passage tampering rejected',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.sources[0].passages[0].lineStart++),scope)));
test('path traversal rejected',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.sources[0].path='../private'),scope)));
test('source cap enforced',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.sources=Array(101).fill(p.sources[0])),scope)));
test('claim cap enforced',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.claims=Array(251).fill(p.claims[0])),scope)));
test('cursor rollback rejected',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.cursor=-1),scope)));
test('descriptive edges cannot claim approval',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.claims.find(c=>c.edges.length).edges[0].status='approved'),scope)));
test('revision notices require successor metadata',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>delete p.notices[0].supersedes),scope)));
test('notice range cannot silently omit the high-water event',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.notices.pop()),scope)));
test('notice range cannot omit an intermediate invalidation position',()=>assert.throws(()=>prepareRepositoryPacket(project,mutate(p=>p.notices.splice(1,1)),scope)));
console.log(JSON.stringify({suite:'v44-repository-adapter',passed:results.length,failed:0,results},null,2));
