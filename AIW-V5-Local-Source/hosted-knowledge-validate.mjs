// Exact saved originals through the same hosted API when no external corpus runs.
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {hostedKnowledgeCorpus,searchHostedKnowledge} from './hosted-knowledge-corpus.js';
import {sha256} from './public/brain-integrity.js';
import {knowledgeImpactStamp} from './public/knowledge-governance.js';
const files=new Map(),DB=localDatabase(':memory:'),env={DB,FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('')}},origin='https://aiw.test';
let project='',state;const api=async(path,body,status=200,actor='source-owner')=>{const u=new URL(path,origin);if(project)u.searchParams.set('project',project);const r=await worker.fetch(new Request(u,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':actor,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env),value=await r.json();assert.equal(r.status,status,JSON.stringify(value));return value;};
const command=async(type,payload)=>{state=await api('/api/commands',{revision:state.revision,command:{type,payload}});return state.selected;};
try{
 project=(await api('/api/projects',{name:'Saved knowledge originals',template:'blank'},201)).document.id;state=await api('/api/project');assert.equal((await api('/api/knowledge/corpus?view=status')).connected,false);
 const body='# Circuit breaker\nBound repeated calls at the caller boundary.\nA request timeout preserves an unresolved business outcome.\n\n# Measurement\nRecord actual waiting time and effects under repeated attempts.\n',source=await command('knowledge.source',{title:'Caller boundaries',body,repository:'Authored methodology',revision:'r1',path:'method/calls.md',license:'Project-authored acceptance fixture'});
 const before=state.revision,status=await api('/api/knowledge/corpus?view=status');assert.equal(status.transport,'project');assert.equal(status.counts.documents,1);assert.equal(status.authority,'discovery-only');assert.equal(status.productionAccepted,false);
 let result=await api('/api/knowledge/corpus?view=search&q=circuit%20breaker');assert.equal(result.transport,'project');assert.equal(result.results.length,1);let hit=result.results[0];assert.equal(hit.revision.savedSourceId,source);assert.equal(hit.revision.command,null);assert.equal(hit.revision.licence.clearance,'not-reviewed');assert.equal(hit.revision.retrieval.retrievable,false);
 const read=await api('/api/knowledge/corpus?view=passage&scope=project&id='+hit.passageId);assert.equal(read.passage.excerpt,body.split('\n').slice(hit.lineStart-1,hit.lineEnd).join('\n'));assert.equal(sha256(read.passage.excerpt),hit.excerptSha256);assert.equal((await api('/api/project')).revision,before,'Discovery reads never write or promote knowledge');
 await api('/api/knowledge/corpus?view=search&q=circuit',null,404,'unrelated-account');await api('/api/knowledge/corpus?view=passage&id='+hit.passageId,null,404,'unrelated-account');
 const first=hit.passageId,second=await command('knowledge.source',{title:'Caller boundaries',body:body.replace('Bound repeated','Bound and measure repeated'),repository:'Authored methodology',revision:'r2',path:'method/calls.md',supersedes:source});
 result=await api('/api/knowledge/corpus?view=search&q=circuit&scope=project');assert.equal(result.results.length,1);assert.equal(result.results[0].revision.sourceId,second);assert.notEqual(result.results[0].passageId,first);await api('/api/knowledge/corpus?view=passage&scope=project&id='+first,null,404);
 let damaged=structuredClone(state.document);damaged.knowledge.sources.find(s=>s.id===second).body+=' changed without receipt';assert.equal(hostedKnowledgeCorpus(damaged).files.length,0,'Hash mismatch is withheld');
 const unicode=structuredClone(state.document),s=unicode.knowledge.sources.find(s=>s.id===second);s.body='# Résilience\nPréserver les résultats.';s.hash=sha256(s.body);assert.equal(searchHostedKnowledge(hostedKnowledgeCorpus(unicode),{q:'résilience'}).results.length,1);
 await command('knowledge.withdraw',{id:second,stamp:knowledgeImpactStamp(state.document,second),reviewed:true,reviewer:'Synthetic source steward',reason:'This source revision was withdrawn after review.'});assert.equal((await api('/api/knowledge/corpus?view=search&scope=project&q=circuit')).results.length,0);
 // Search completion and passage reads must stay with their latest request/project.
 globalThis.location={origin,search:'?project='+project};const originalFetch=globalThis.fetch;try{
  const pending=[];globalThis.fetch=(url)=>new Promise(resolve=>pending.push({url:String(url),resolve}));const ui=await import('./public/repository-corpus-ui.js');ui.resetCorpus(project);ui.corpusState().status={connected:true,transport:'project'};
  const old=ui.searchCorpus(()=>{},{query:'old'}),latest=ui.searchCorpus(()=>{},{query:'new'});assert(pending[0].url.includes('scope=project'));
  pending[1].resolve(Response.json({query:'new',results:[],files:[]}));await latest;pending[0].resolve(Response.json({query:'old',results:[],files:[]}));await old;assert.equal(ui.corpusState().results.query,'new');
  const readPending=ui.readCorpusPassage(()=>{},'passage-'+'a'.repeat(32));ui.closeCorpusPassage(()=>{});pending[2].resolve(Response.json({passage:{passageId:'old'}}));await readPending;assert.equal(ui.corpusState().reading,null);
  const switched=ui.searchCorpus(()=>{},{query:'prior project'});ui.resetCorpus('different-project');pending[3].resolve(Response.json({query:'prior project',results:[{private:true}]}));await switched;assert.equal(ui.corpusState().results,null);
 }finally{globalThis.fetch=originalFetch;}
 console.log('PASS hosted saved-original discovery: owner isolation, exact lines/hash, no promotion or writes, supersession/withdrawal/hash failure, Unicode search, stale result/closed-reader/project-switch protection. Synthetic Worker/SQLite evidence.');
}finally{DB.close();}
