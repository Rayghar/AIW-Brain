import {llmEndpoint} from './intelligence-provider.js';
import {redactSecretsDeep} from './public/secret-redaction.js';
import {BRAIN_PLAYBOOK,BRAIN_TRADEOFFS,releasedClaims,claimReceipt,knowledgeStamp} from './public/knowledge-governance.js';
import {brainTokens,methodSources,catalogueSources} from './public/architecture-brain.js';
import {architectureClaimScope,architectureKnowledgeSnapshot} from './public/architecture-knowledge.js';
import {digest} from './public/brain-integrity.js';
import {changeFingerprint} from './public/changes-domain.js';
import {disclosureSourceExcluded,discloseIntelligenceValue,intelligencePacket} from './public/intelligence-context.js';
import {reasoningPacket} from './public/brain-reasoning.js';

const DIMENSIONS=256,MODEL='text-embedding-3-small';
const disclosed=(value,p)=>discloseIntelligenceValue(value,p.workspace?.aiPolicy||{});
const vectorOK=v=>Array.isArray(v)&&v.length===DIMENSIONS&&v.every(x=>typeof x==='number'&&Number.isFinite(x))&&v.some(x=>x!==0);
export const cosine=(a,b)=>{if(!vectorOK(a)||!vectorOK(b))throw Error('Embedding dimensions or values are invalid.');let dot=0,x=0,y=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];x+=a[i]*a[i];y+=b[i]*b[i];}return dot/Math.sqrt(x*y);};
export async function embedTexts(env,texts,{fetcher=fetch}={}){
 if(!env.OPENAI_API_KEY)throw Error('Semantic retrieval is not configured.');if(!texts.length||texts.length>64||texts.some(s=>!s||s.length>6000))throw Error('Embedding input is outside the bounded retrieval contract.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetcher(llmEndpoint(env,'embeddings'),{method:'POST',redirect:'error',signal:controller.signal,headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,dimensions:DIMENSIONS,encoding_format:'float',input:redactSecretsDeep(texts)})});
  if(!response.ok)throw Error('Embedding provider unavailable ('+response.status+').');
  const reader=response.body?.getReader();if(!reader)throw Error('Empty embedding response.');let body='',size=0;const decode=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2200000){await reader.cancel();throw Error('Embedding response exceeded its limit.');}body+=decode.decode(value,{stream:true});}body+=decode.decode();
  const data=JSON.parse(body);if(data.model!==MODEL||!Array.isArray(data.data)||data.data.length!==texts.length)throw Error('Embedding model or result count does not match.');
  const vectors=new Array(texts.length);for(const d of data.data){if(!Number.isInteger(d.index)||d.index<0||d.index>=texts.length||vectors[d.index]||!vectorOK(d.embedding))throw Error('Embedding index, dimensions or values do not match.');vectors[d.index]=d.embedding;}
  return {vectors,model:data.model,dimensions:DIMENSIONS,tokens:Number(data.usage?.total_tokens)||0};
 }finally{clearTimeout(timer);}
}
function corpus(p){
 // The Playbook and the trade-off passages, each with its receipt, as architecture-brain.js shapes them (round 6).
 const methods=methodSources(p);
 const excluded=new Set(p.workspace?.aiPolicy?.excludedObjectIds||[]);
 const claims=releasedClaims(p).filter(h=>h.eligible&&!disclosureSourceExcluded({id:'claim:'+h.release.id+':'+h.claim.id,objectId:h.claim.id,receipt:{claimId:h.claim.id,sourceId:h.claim.sourceId,subjectId:h.claim.subjectId,releaseId:h.release.id}},excluded)).map(h=>({id:'claim:'+h.release.id+':'+h.claim.id,kind:'governed-claim',objectId:h.claim.id,title:h.claim.subjectId+' · '+h.claim.claimType,posture:'Project-reviewed conditional claim; verify product scope, conditions and quality effects against this design',receipt:claimReceipt(p,h.claim,h.release),excerpt:JSON.stringify({statement:h.claim.statement,conditions:h.claim.conditions,limitations:h.claim.limitations,architectureUnit:h.claim.architectureUnit||null,sourcePassage:h.claim.excerpt,authority:'Reviewed interpretation; no achieved target asserted'}),truncated:false}));
 return [...claims,...catalogueSources(p),...methods].filter(s=>!disclosureSourceExcluded(s,excluded)).map(s=>disclosed(s,p)).map(s=>{
  let body=s.excerpt;if(s.kind==='catalogue-description'){const d=JSON.parse(s.excerpt);body=[d.problem,d.summary,JSON.stringify(d.componentKit||[]),JSON.stringify(d.interfaceKit||[]),JSON.stringify(d.prerequisites||[]),JSON.stringify(d.obligations||[])].map(v=>String(v||'').slice(0,140)).join('\n');}
  // Index compact projections; retained LLM sources keep the complete bounded
  // mechanism/conditions/obligations. This fits the default disclosure budget.
  return {...s,embeddingText:(s.title+'\n'+(s.kind==='catalogue-description'?'Editorial Pattern DNA; unreviewed\n':'')+body).slice(0,900)};
 });
}
function retrievalPlan(p,choiceScope=null){
 // Apply the active product/capability boundary before sending text to the
 // embedding provider or caching vectors, not merely when ranking results.
 const contexts=(Array.isArray(choiceScope)?choiceScope:choiceScope?[choiceScope]:[]),snapshot=architectureKnowledgeSnapshot(p),scopes=contexts.map(c=>({context:c,...architectureClaimScope(p,c,snapshot)})),excluded=new Map();
 const entries=corpus(p).filter(e=>{if(e.kind!=='governed-claim'||!scopes.length)return true;const key=e.receipt.releaseId+':'+e.receipt.claimId;if(scopes.every(s=>s.excluded.has(key))){excluded.set(key,'Outside every selected decision scope.');return false;}return true;}).map(e=>({...e,...(scopes.some(s=>s.context.itemId)?{applicableTo:scopes.filter(s=>e.kind!=='governed-claim'||!s.excluded.has(e.receipt.releaseId+':'+e.receipt.claimId)).map(s=>s.context.itemId).filter(Boolean)}:{})}));
 const scope=digest({project:p.id,knowledge:knowledgeStamp(p),playbook:BRAIN_PLAYBOOK.fileSha256,tradeoffs:BRAIN_TRADEOFFS.sha256,model:MODEL,dimensions:DIMENSIONS,entries:entries.map(e=>[e.id,digest(e.embeddingText)])});
 return {entries,scope,excluded};
}
const indexKey=(owner,p)=>'brain-index/'+encodeURIComponent(owner)+'/'+encodeURIComponent(p.id)+'/index.json';
async function existingIndex(env,key,scope,length){const file=await env.FILES?.get(key);if(file)try{const saved=JSON.parse(await file.text());if(saved.scope===scope&&saved.model===MODEL&&saved.dimensions===DIMENSIONS&&saved.vectors?.length===length&&saved.vectors.every(vectorOK))return saved;}catch{/* an unreadable index is rebuilt */}return null;}
export async function semanticKnowledge(env,owner,p,query,{fetcher=fetch,scope:choiceScope=null}={}){
 if(!env.FILES)throw Error('Private retrieval storage is unavailable.');
 const {entries,scope,excluded}=retrievalPlan(p,choiceScope);
 // One index object per project (round 2, B2-04): a new scope overwrites it instead of leaving the previous scope's
 // vectors behind; the saved scope is checked before reuse, so a stale index is never used.
 const key=indexKey(owner,p);let index=await existingIndex(env,key,scope,entries.length);
 let tokensUsed=0;if(!index){const batches=[];for(let i=0;i<entries.length;i+=64)batches.push(entries.slice(i,i+64));const vectors=[];for(let i=0;i<batches.length;i+=3){const results=await Promise.all(batches.slice(i,i+3).map(batch=>embedTexts(env,batch.map(e=>e.embeddingText),{fetcher})));for(const result of results){vectors.push(...result.vectors);tokensUsed+=result.tokens;}}index={scope,model:MODEL,dimensions:DIMENSIONS,vectors};await env.FILES.put(key,JSON.stringify(index),{httpMetadata:{contentType:'application/json'}});}
 if(!entries.length)return {sources:[],receipt:{mode:'graph + lexical',reason:'No eligible source material',indexScope:scope}};
 const q=await embedTexts(env,[query.slice(0,6000)],{fetcher});tokensUsed+=q.tokens;const terms=new Set(brainTokens(query));
 const semantic=entries.map((e,i)=>({id:e.id,score:cosine(q.vectors[0],index.vectors[i])})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));const lexical=entries.map(e=>({id:e.id,score:brainTokens(e.embeddingText).filter(w=>terms.has(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const ranking=entries.map(e=>({source:e,similarity:semantic.find(x=>x.id===e.id).score,score:1/(60+semantic.findIndex(x=>x.id===e.id)+1)+(lexical.some(x=>x.id===e.id)?1/(60+lexical.findIndex(x=>x.id===e.id)+1):0)})).filter(x=>x.similarity>=0.25).sort((a,b)=>b.score-a.score||a.source.id.localeCompare(b.source.id));
 return {sources:ranking.slice(0,6).map(({source:{embeddingText,...s}})=>s),receipt:{mode:'graph + lexical + semantic',model:MODEL,dimensions:DIMENSIONS,indexScope:scope,eligibleRecords:entries.length,scopeExcluded:excluded.size,tokensUsed,minimumCosine:0.25,thresholdStatus:'Uncalibrated retrieval heuristic; not an architectural quality or suitability score',ranking:'reciprocal rank fusion with minimum similarity; relevance only, not architectural suitability',sourceIds:ranking.slice(0,6).map(x=>x.source.id),editorialGuidance:ranking.slice(0,6).filter(x=>x.source.kind==='catalogue-description').length}};
}
function mergePacket(packet,result){
 // The sources behind an evaluated reading travel with that reading. Semantic
 // discovery may fill spare context; it cannot detach a conclusion from its basis.
 const grounded=new Set(packet.sources.filter(s=>s.kind==='architecture-intelligence').flatMap(s=>s.receipt?.sourceRefs||[]));
 const optional=new Set(['governed-claim','brain-method','catalogue-description','playbook-entry','product-mechanism']),original=packet.sources.filter(s=>!optional.has(s.kind)||grounded.has(s.id)),sources=[],omissions=[...(packet.omissions||[])];let size=0;
 const ordered=[...original,...packet.sources.filter(s=>s.kind==='governed-claim'),...result.sources,...packet.sources.filter(s=>optional.has(s.kind))];
 for(const source of ordered){if(!source)continue;const duplicate=sources.find(x=>x.id===source.id);if(duplicate){if(source.applicableTo)duplicate.applicableTo=[...new Set([...(duplicate.applicableTo||[]),...source.applicableTo])];continue;}const s=source;if(sources.length>=22||size+s.excerpt.length>28000){omissions.push({id:s.id,title:s.title,reason:'context budget'});continue;}size+=s.excerpt.length;sources.push({...s,ref:'S'+(sources.length+1)});}
 const required=packet.criticalContext?.sourceIds||[];
 if(required.some(id=>!sources.some(s=>s.id===id))){const retained={...packet,retrieval:{...result.receipt,mode:'graph + lexical',reason:'Critical requirement, constraint or quality context occupies the bounded packet; semantic hits were not substituted.'}};delete retained.stamp;retained.stamp=packet.task==='decisions'?digest(retained):changeFingerprint(retained);return retained;}
 // An active composition packet is indispensable. Do not silently substitute
 // general retrieval for the specific task's conditions and topology.
 if(original.some(x=>x.kind==='architecture-knowledge'&&!sources.some(s=>s.id===x.id))){const retained={...packet,retrieval:{...result.receipt,mode:'graph + lexical',reason:'The active composition uses the context budget; semantic hits were not substituted.'}};delete retained.stamp;retained.stamp=changeFingerprint(retained);return retained;}
 const claimRefs=sources.filter(s=>s.kind==='governed-claim').map(s=>s.receipt.releaseId+':'+s.receipt.claimId);const out={...packet,sources,omissions,coverage:{...packet.coverage,characters:size,sourceCount:sources.length},retrieval:{...result.receipt,retainedSourceIds:result.sources.filter(s=>sources.some(x=>x.id===s.id)).map(s=>s.id)},brainReceipt:{...packet.brainReceipt,retrieval:result.receipt.mode,claimIds:sources.filter(s=>s.kind==='governed-claim').map(s=>s.objectId),claimRefs,graphLinks:(packet.brainReceipt.graphLinks||[]).filter(x=>claimRefs.includes(x.releaseId+':'+x.claimId)),optionLinks:(packet.brainReceipt.optionLinks||[]).filter(x=>claimRefs.includes(x.releaseId+':'+x.claimId))}};
 if(packet.items){out.items=packet.items.map(it=>({...it,ref:sources.find(s=>s.id==='reading:'+it.id)?.ref||it.ref}));out.knowledgeCoverage=out.items.map(it=>({itemId:it.id,sourceRefs:sources.filter(s=>(s.applicableTo||[]).includes(it.id)).map(s=>s.ref),reviewedClaims:sources.filter(s=>s.kind==='governed-claim'&&(s.applicableTo||[]).includes(it.id)).length}));}
 if(packet.criticalContext)out.criticalContext={...packet.criticalContext,sourceRefs:sources.filter(s=>required.includes(s.id)).map(s=>s.ref)};
 if(packet.architectureOperations)out.architectureOperations={...packet.architectureOperations,requirementRefs:packet.architectureOperations.requirementRefs.map(r=>({...r,ref:sources.find(s=>s.kind==='model'&&s.objectId===r.id)?.ref||r.ref}))};
 delete out.stamp;out.stamp=packet.task==='decisions'?digest(out):changeFingerprint(out);return out;
}
export async function prepareBrainPacket(env,owner,p,request,{forGeneration=false,expectedStamp='',fetcher=fetch}={}){
 const base=request.task==='decisions'?reasoningPacket(p,request):intelligencePacket(p,request);if(!request.semantic)return base;
 if(p.workspace?.aiPolicy?.enabled===false)throw Error('The project owner has disabled external AI processing.');
 // The private cache key binds the actual policy IDs, not only the redacted
 // public count: replacing one excluded object must invalidate old packets.
 const policyIdentity={excludedObjectIds:[...new Set(p.workspace?.aiPolicy?.excludedObjectIds||[])].sort(),redactContacts:!!p.workspace?.aiPolicy?.redactContacts,enabled:p.workspace?.aiPolicy?.enabled!==false};
 const input=digest([base.stamp,MODEL,DIMENSIONS,knowledgeStamp(p),policyIdentity]),row=await env.DB.prepare("SELECT * FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND input_hash=? AND status='completed' ORDER BY created_at DESC LIMIT 1").bind(owner,p.id,input).first();
 if(row){const file=await env.FILES?.get(row.storage_key);if(file){const packet=JSON.parse(await file.text());if(packet.input===input&&(!forGeneration||packet.packet.stamp===expectedStamp))return packet.packet;}}
 if(forGeneration)throw Error('The reviewed retrieval context changed or expired. Find sources again before sending.');
 const id=crypto.randomUUID(),at=new Date().toISOString(),key='brain-packets/'+encodeURIComponent(owner)+'/'+p.id+'/'+id+'.json';
 const query=[base.request.prompt,base.selectedTitle||'',...(base.items||[]).map(it=>it.title+' '+(base.sources.find(s=>s.ref===it.ref)?.excerpt||'').slice(0,1800))].join('\n').slice(0,6000);
 const scopes=base.items?base.items.map(it=>({itemId:it.id,objectId:it.objectId||it.id.slice(2),query:[base.request.prompt,it.title,base.sources.find(s=>s.ref===it.ref)?.excerpt||''].join(' ').slice(0,2400)})):{objectId:base.context.id,query:base.request.prompt};
 const plan=retrievalPlan(p,scopes),cachedIndex=await existingIndex(env,indexKey(owner,p),plan.scope,plan.entries.length);
 const reserve=new TextEncoder().encode((cachedIndex?'':plan.entries.map(e=>e.embeddingText).join('\n'))+'\n'+query).length+5000;const policy=p.workspace?.aiPolicy||{};
 const inserted=await env.DB.prepare("INSERT INTO brain_retrieval_runs (owner_id,id,project_id,input_hash,status,storage_key,created_at,reserved_tokens) SELECT ?,?,?,?,'pending',?,?,? WHERE (SELECT COUNT(*) FROM brain_retrieval_runs WHERE owner_id=? AND created_at>?)<20 AND (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND created_at>?) + (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND created_at>?) + ? <= ? AND NOT EXISTS (SELECT 1 FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,id,p.id,input,key,at,reserve,owner,new Date(Date.now()-3600000).toISOString(),owner,p.id,new Date(Date.now()-86400000).toISOString(),owner,p.id,new Date(Date.now()-86400000).toISOString(),reserve,policy.dailyTokens??1000000,owner,p.id,new Date(Date.now()-120000).toISOString()).run();
 if(!inserted.meta?.changes)throw Error('A source search is running, or the search frequency or project daily token limit would be exceeded. Text retrieval remains available.');
 try{let packet;try{const result=await semanticKnowledge(env,owner,p,query,{fetcher,scope:scopes});packet=mergePacket(base,result);}catch{packet={...base,retrieval:{mode:'graph + lexical',reason:'Semantic retrieval is unavailable; eligible text and graph sources retained.'}};delete packet.stamp;packet.stamp=base.task==='decisions'?digest(packet):changeFingerprint(packet);}
  // Receipts contain human-entered statements and review notes too. Sanitize
  // every nested string before stamping, caching, preview or either model pass.
  packet=disclosed(packet,p);delete packet.stamp;packet.stamp=base.task==='decisions'?digest(packet):changeFingerprint(packet);
  await env.FILES.put(key,JSON.stringify({input,packet}),{httpMetadata:{contentType:'application/json'}});await env.DB.prepare("UPDATE brain_retrieval_runs SET status='completed',used_tokens=? WHERE owner_id=? AND id=?").bind(packet.retrieval?.tokensUsed??null,owner,id).run();return packet;
 }catch(e){await env.DB.prepare("UPDATE brain_retrieval_runs SET status='failed' WHERE owner_id=? AND id=?").bind(owner,id).run();throw e;}
}
