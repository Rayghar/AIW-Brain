// Candidate-set import regression using the real knowledge command validator and an in-memory
// transport. Source text, accounts and product are synthetic; no repository, provider or human review.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProject} from './shared/projects-domain.js';
import {applyKnowledgeCommand,knowledgeEligibility,releasedClaims} from './public/knowledge-governance.js';
import {importCandidateSet} from './scripts/import-candidate-set.mjs';

const sha256=s=>createHash('sha256').update(s).digest('hex');
const body='A synthetic replicated worker preserves work while a majority remains available.\nDuplicate work still requires effect protection.';
const repository='synthetic/architecture-fixture',commit='a'.repeat(40),file='docs/worker.md';
let document=createProject({name:'Synthetic typed import regression',template:'blank'},'typed-import-regression');
document=applyKnowledgeCommand(document,{type:'knowledge.source',payload:{title:'Synthetic worker source',body,path:file,revision:commit,license:'Original synthetic fixture; internal test use.'}},'2026-10-12T12:00:00Z','fixture-author').document;
const source=document.knowledge.sources[0];
Object.assign(source,{origin:'repository-fetch',repository});
let revision=1;const calls=[];
const fetcher=async(url,options={})=>{
  const route=new URL(url);
  if(route.pathname==='/api/project')return Response.json({document,revision});
  if(route.pathname==='/api/knowledge/corpus')return Response.json({connected:true});
  assert.equal(route.pathname,'/api/commands','only existing project commands may be called');
  const request=JSON.parse(options.body);assert.equal(request.revision,revision);
  calls.push(request.command);
  try{document=applyKnowledgeCommand(document,request.command,'2026-10-12T12:00:00Z','fixture-author').document;revision++;return Response.json({document,revision});}
  catch(error){return Response.json({error:error.message},{status:400});}
};
const architectureUnit={kind:'product-mechanism',mechanism:'Synthetic majority acknowledgement preserves accepted work within its recorded failure assumptions.',scope:{capability:'background work',product:'Fixture Worker',version:'fixture-1',topology:'three nodes',tier:'synthetic',operatingModel:'test runner'},effects:[{quality:'reliability',direction:'supports',rationale:'Replicas preserve synthetic work while a majority survives.'},{quality:'availability',direction:'tradeoff',rationale:'A lost majority prevents accepting further work.'}],obligations:[{action:'Preserve the three-node placement and test a lost node.',evidence:'A synthetic node-loss trace.'},{action:'Protect business effects from duplicate work.',evidence:'A repeated-message test.'}],exclusions:['Failures remove a majority.']};
const claim=(assetId,extra={})=>({assetId,subjectId:'Fixture Worker',predicate:'has conditional mechanism',statement:'The synthetic worker can preserve accepted work within the fixture failure assumptions.',claimType:'applicability',polarity:'supports',conditions:['A majority remains available.'],limitations:['Synthetic example; no real runtime target is measured.'],tags:['candidate-set:fixture-import','asset:'+assetId],anchor:{sourceId:'fixture',lineStart:1,lineEnd:2,excerptSha256:sha256(body)},...extra});
const pack={schemaVersion:'aiw-candidate-set-v1',setId:'fixture-import',sources:[{id:'fixture',repository,commit,path:file,fileSha256:sha256(body),retrievable:true}],claims:[claim('typed',{architectureUnit}),claim('legacy')]};
const run=(input=pack,options={})=>importCandidateSet({base:'https://fixture.invalid',pack:input,fetcher,...options});

await run(pack,{dryRun:true});assert.equal(document.knowledge.claims.length,0);assert.equal(calls.length,0,'dry run must make no mutating call');
const result=await run();assert.equal(result.claimsCreated.length,2);assert.equal(result.sourcesReused.length,1);
const typed=document.knowledge.claims.find(c=>c.tags.includes('asset:typed')),legacy=document.knowledge.claims.find(c=>c.tags.includes('asset:legacy'));
assert.deepEqual(typed.architectureUnit,architectureUnit,'import must preserve mechanism, product version/topology, quality effects, obligations and exclusions');
assert.equal(Object.hasOwn(legacy,'architectureUnit'),false,'older untyped candidate sets remain importable');
assert.equal(typed.review,undefined);assert.equal(knowledgeEligibility(document,typed).eligible,false);assert.deepEqual(releasedClaims(document),[]);
assert.deepEqual(document.knowledge.releases,[]);assert.deepEqual(document.knowledge.pins,[],'import grants no release or activation');
assert(calls.every(c=>c.type==='knowledge.claim'),'import must not review, release or activate a candidate');
const again=await run();assert.equal(again.claimsCreated.length,0);assert.equal(document.knowledge.claims.length,2,'re-running must not duplicate claims');

for(const [id,unit,expected] of [
  ['invalid-effect',{...architectureUnit,effects:[{quality:'availability',direction:'guaranteed',rationale:'An invalid unbounded assertion.'}]},/supports, tradeoff or unknown/],
  ['missing-version',{...architectureUnit,scope:{product:'Fixture Worker'}},/documented version scope/],
  ['explicit-null',null,/Architecture unit must be an object/]
]){
  const before=document.knowledge.claims.length;
  await assert.rejects(run({...pack,claims:[claim(id,{architectureUnit:unit})]}),expected,'malformed typed input must be rejected rather than silently imported as prose');
  assert.equal(document.knowledge.claims.length,before);
}
const mismatch=await run({...pack,claims:[claim('changed-passage',{architectureUnit,anchor:{sourceId:'fixture',lineStart:1,lineEnd:2,excerptSha256:'b'.repeat(64)}})]});
assert.equal(mismatch.claimsCreated.length,0);assert.match(mismatch.skipped[0].reason,/passage no longer matches/);
console.log('PASS candidate import: typed mechanism/scope/effects/obligations preserved through real command validation; malformed units refused; original locator/hash, dry-run, idempotency, legacy compatibility and candidate-only authority retained. Synthetic fixture only.');
