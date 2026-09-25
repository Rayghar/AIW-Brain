import {llmEndpoint} from './intelligence-provider.js';
import {BRAIN_PLAYBOOK,releasedClaims,claimReceipt,knowledgeStamp,withdrawn} from './public/knowledge-governance.js';
import {brainTokens} from './public/architecture-brain.js';
import {digest} from './public/brain-integrity.js';
import {changeFingerprint} from './public/changes-domain.js';
import {intelligencePacket,maskContactText} from './public/intelligence-context.js';

const DIMENSIONS=256,MODEL='text-embedding-3-small';
const vectorOK=v=>Array.isArray(v)&&v.length===DIMENSIONS&&v.every(x=>typeof x==='number'&&Number.isFinite(x))&&v.some(x=>x!==0);
export const cosine=(a,b)=>{if(!vectorOK(a)||!vectorOK(b))throw Error('Embedding dimensions or values are invalid.');let dot=0,x=0,y=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];x+=a[i]*a[i];y+=b[i]*b[i];}return dot/Math.sqrt(x*y);};
export async function embedTexts(env,texts,{fetcher=fetch}={}){
 if(!env.OPENAI_API_KEY)throw Error('Semantic retrieval is not configured.');if(!texts.length||texts.length>64||texts.some(s=>!s||s.length>6000))throw Error('Embedding input is outside the bounded retrieval contract.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetcher(llmEndpoint(env,'embeddings'),{method:'POST',redirect:'error',signal:controller.signal,headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,dimensions:DIMENSIONS,encoding_format:'float',input:texts})});
  if(!response.ok)throw Error('Embedding provider unavailable ('+response.status+').');
  const reader=response.body?.getReader();if(!reader)throw Error('Empty embedding response.');let body='',size=0;const decode=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2200000){await reader.cancel();throw Error('Embedding response exceeded its limit.');}body+=decode.decode(value,{stream:true});}body+=decode.decode();
  const data=JSON.parse(body);if(data.model!==MODEL||!Array.isArray(data.data)||data.data.length!==texts.length)throw Error('Embedding model or result count does not match.');
  const vectors=new Array(texts.length);for(const d of data.data){if(!Number.isInteger(d.index)||d.index<0||d.index>=texts.length||vectors[d.index]||!vectorOK(d.embedding))throw Error('Embedding index, dimensions or values do not match.');vectors[d.index]=d.embedding;}
  return {vectors,model:data.model,dimensions:DIMENSIONS,tokens:Number(data.usage?.total_tokens)||0};
 }finally{clearTimeout(timer);}
}
function corpus(p){
 const methods=withdrawn(p,['SA-PLAYBOOK',BRAIN_PLAYBOOK.id]).length?[]:BRAIN_PLAYBOOK.passages.map(m=>({id:'playbook:'+m.id,kind:'brain-method',objectId:m.id,title:m.title+' · '+m.locator,posture:BRAIN_PLAYBOOK.posture,receipt:{kind:'brain-method',packId:BRAIN_PLAYBOOK.id,file:BRAIN_PLAYBOOK.file,fileSha256:BRAIN_PLAYBOOK.fileSha256,passageId:m.id,locator:m.locator,excerptHash:m.sha256},excerpt:m.text,truncated:false}));
 const claims=releasedClaims(p).filter(h=>h.eligible).map(h=>({id:'claim:'+h.release.id+':'+h.claim.id,kind:'governed-claim',objectId:h.claim.id,title:h.claim.subjectId+' · '+h.claim.claimType,posture:'Project-reviewed conditional claim; applicability requires judgement',receipt:claimReceipt(p,h.claim,h.release),excerpt:JSON.stringify({statement:h.claim.statement,conditions:h.claim.conditions,limitations:h.claim.limitations,sourcePassage:h.claim.excerpt}),truncated:false}));
 return [...claims,...methods].map(s=>p.workspace?.aiPolicy?.redactContacts?{...s,title:maskContactText(s.title),excerpt:maskContactText(s.excerpt)}:s).map(s=>({...s,embeddingText:(s.title+'\n'+s.excerpt).slice(0,6000)}));
}
export async function semanticKnowledge(env,owner,p,query,{fetcher=fetch}={}){
 if(!env.FILES)throw Error('Private retrieval storage is unavailable.');const entries=corpus(p),scope=digest({project:p.id,knowledge:knowledgeStamp(p),playbook:BRAIN_PLAYBOOK.fileSha256,model:MODEL,dimensions:DIMENSIONS,entries:entries.map(e=>[e.id,digest(e.embeddingText)])});
 const key='brain-index/'+encodeURIComponent(owner)+'/'+p.id+'/'+scope+'.json';let index=null;const file=await env.FILES.get(key);if(file)try{const saved=JSON.parse(await file.text());if(saved.scope===scope&&saved.model===MODEL&&saved.dimensions===DIMENSIONS&&saved.vectors?.length===entries.length&&saved.vectors.every(vectorOK))index=saved;}catch{}
 let tokensUsed=0;if(!index){const batches=[];for(let i=0;i<entries.length;i+=64)batches.push(entries.slice(i,i+64));const vectors=[];for(let i=0;i<batches.length;i+=3){const results=await Promise.all(batches.slice(i,i+3).map(batch=>embedTexts(env,batch.map(e=>e.embeddingText),{fetcher})));for(const result of results){vectors.push(...result.vectors);tokensUsed+=result.tokens;}}index={scope,model:MODEL,dimensions:DIMENSIONS,vectors};await env.FILES.put(key,JSON.stringify(index),{httpMetadata:{contentType:'application/json'}});}
 if(!entries.length)return {sources:[],receipt:{mode:'graph + lexical',reason:'No eligible source material',indexScope:scope}};
 const q=await embedTexts(env,[query.slice(0,6000)],{fetcher});tokensUsed+=q.tokens;const terms=new Set(brainTokens(query));
 const semantic=entries.map((e,i)=>({id:e.id,score:cosine(q.vectors[0],index.vectors[i])})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));const lexical=entries.map(e=>({id:e.id,score:brainTokens(e.embeddingText).filter(w=>terms.has(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const ranking=entries.map(e=>({source:e,score:1/(60+semantic.findIndex(x=>x.id===e.id)+1)+(lexical.some(x=>x.id===e.id)?1/(60+lexical.findIndex(x=>x.id===e.id)+1):0)})).sort((a,b)=>b.score-a.score||a.source.id.localeCompare(b.source.id));
 return {sources:ranking.slice(0,6).map(({source:{embeddingText,...s}})=>s),receipt:{mode:'graph + lexical + semantic',model:MODEL,dimensions:DIMENSIONS,indexScope:scope,eligibleRecords:entries.length,tokensUsed,ranking:'reciprocal rank fusion; relevance only',sourceIds:ranking.slice(0,6).map(x=>x.source.id)}};
}
function mergePacket(packet,result){
 const original=packet.sources.filter(s=>!['governed-claim','brain-method'].includes(s.kind)),sources=[];let size=0;const ordered=[original[0],...packet.sources.filter(s=>s.kind==='governed-claim'),...result.sources,...original.slice(1)];
 for(const source of ordered){if(!source||sources.some(x=>x.id===source.id))continue;let s=source;if(s.excerpt.length>6500&&['governed-claim','brain-method'].includes(s.kind))s={...s,excerpt:s.excerpt.slice(0,6500),truncated:true};if(sources.length>=22||size+s.excerpt.length>28000)continue;size+=s.excerpt.length;sources.push({...s,ref:'S'+(sources.length+1)});}
 // An active composition packet is indispensable. Do not silently substitute
 // general retrieval for the specific task's conditions and topology.
 if(original.some(x=>x.kind==='architecture-knowledge'&&!sources.some(s=>s.id===x.id))){const retained={...packet,retrieval:{...result.receipt,mode:'graph + lexical',reason:'The active composition uses the context budget; semantic hits were not substituted.'}};delete retained.stamp;retained.stamp=changeFingerprint(retained);return retained;}
 const out={...packet,sources,retrieval:result.receipt,brainReceipt:{...packet.brainReceipt,retrieval:result.receipt.mode,claimIds:sources.filter(s=>s.kind==='governed-claim').map(s=>s.objectId)}};delete out.stamp;out.stamp=changeFingerprint(out);return out;
}
export async function prepareBrainPacket(env,owner,p,request,{forGeneration=false,expectedStamp='',fetcher=fetch}={}){
 const base=intelligencePacket(p,request);if(!request.semantic)return base;
 const input=digest([base.stamp,MODEL,DIMENSIONS,knowledgeStamp(p)]),row=await env.DB.prepare("SELECT * FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND input_hash=? AND status='completed' ORDER BY created_at DESC LIMIT 1").bind(owner,p.id,input).first();
 if(row){const file=await env.FILES?.get(row.storage_key);if(file){const packet=JSON.parse(await file.text());if(packet.input===input&&(!forGeneration||packet.packet.stamp===expectedStamp))return packet.packet;}}
 if(forGeneration)throw Error('The reviewed retrieval context changed or expired. Find sources again before sending.');
 const id=crypto.randomUUID(),at=new Date().toISOString(),key='brain-packets/'+encodeURIComponent(owner)+'/'+p.id+'/'+id+'.json';
 const reserve=new TextEncoder().encode(corpus(p).map(e=>e.embeddingText).join('\n')+'\n'+base.request.prompt+'\n'+base.selectedTitle).length+5000;const policy=p.workspace?.aiPolicy||{};
 const inserted=await env.DB.prepare("INSERT INTO brain_retrieval_runs (owner_id,id,project_id,input_hash,status,storage_key,created_at,reserved_tokens) SELECT ?,?,?,?,'pending',?,?,? WHERE (SELECT COUNT(*) FROM brain_retrieval_runs WHERE owner_id=? AND created_at>?)<20 AND (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND created_at>?) + (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND created_at>?) + ? <= ? AND NOT EXISTS (SELECT 1 FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,id,p.id,input,key,at,reserve,owner,new Date(Date.now()-3600000).toISOString(),owner,p.id,new Date(Date.now()-86400000).toISOString(),owner,p.id,new Date(Date.now()-86400000).toISOString(),reserve,policy.dailyTokens??1000000,owner,p.id,new Date(Date.now()-120000).toISOString()).run();
 if(!inserted.meta?.changes)throw Error('A source search is running or the hourly search limit has been reached. Text retrieval remains available.');
 try{let packet;try{const result=await semanticKnowledge(env,owner,p,base.request.prompt+'\n'+base.selectedTitle,{fetcher});packet=mergePacket(base,result);}catch{packet={...base,retrieval:{mode:'graph + lexical',reason:'Semantic retrieval is unavailable; eligible text and graph sources retained.'}};delete packet.stamp;packet.stamp=changeFingerprint(packet);}
  await env.FILES.put(key,JSON.stringify({input,packet}),{httpMetadata:{contentType:'application/json'}});await env.DB.prepare("UPDATE brain_retrieval_runs SET status='completed',used_tokens=? WHERE owner_id=? AND id=?").bind(packet.retrieval?.tokensUsed??null,owner,id).run();return packet;
 }catch(e){await env.DB.prepare("UPDATE brain_retrieval_runs SET status='failed' WHERE owner_id=? AND id=?").bind(owner,id).run();throw e;}
}
