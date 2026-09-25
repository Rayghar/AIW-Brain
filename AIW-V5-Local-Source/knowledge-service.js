import {BRAIN_CATALOGUE,applyKnowledgeCommand} from './public/knowledge-governance.js';
import {sha256} from './public/brain-integrity.js';
import {AKR_DISCOVERY} from './public/akr-discovery.js';
// Fixed public origins, registered repositories, bounded text only. No source
// code is evaluated. A successful acquisition creates an unreviewed revision.
async function readBounded(response,max){
 if(!response.ok)throw Error('Repository access failed ('+response.status+'). The existing source is retained.');
 const reader=response.body?.getReader();if(!reader)throw Error('The repository returned no source body.');const parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('Choose a smaller source file.');}parts.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const b of parts){bytes.set(b,offset);offset+=b.length;}return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export async function acquireRepositorySource(p,raw,env,actor,at,{fetcher=fetch}={}){
 const repo=BRAIN_CATALOGUE.repositories.find(x=>x.connectorId===raw.connectorId);if(!repo||!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(repo.repository))throw Error('Choose a registered public repository.');
 const path=String(raw.path||'').trim(),ref=String(raw.ref||'main');
 if(!/^[\w./ -]{1,350}$/.test(path)||path.split('/').some(x=>x==='..'||x==='.')||path.startsWith('/')||!(/\.(md|mdx|txt|adoc|rst)$/i.test(path)))throw Error('Choose a repository documentation path in Markdown or text format.');
 if(!/^[a-z\d._/-]{1,100}$/i.test(ref)||ref.includes('..'))throw Error('Choose a commit or branch name.');
 const previous=raw.supersedes?p.knowledge?.sources?.find(x=>x.id===raw.supersedes):null;
 if(raw.supersedes&&(!previous||previous.connectorId!==repo.connectorId||previous.path!==path||previous.repository!==repo.repository))throw Error('A source refresh must retain its registered repository and exact file path.');
 if(previous&&p.knowledge.sources.some(x=>x.supersedes===previous.id))throw Error('Refresh the latest saved revision of this file.');
 const expectedHash=raw.expectedHash?String(raw.expectedHash).toLowerCase():'';
 if(expectedHash&&!/^[a-f\d]{64}$/.test(expectedHash))throw Error('Choose a valid SHA-256 source hash.');
 const lead=raw.discoveryId?AKR_DISCOVERY.leads.find(x=>x.id===raw.discoveryId):null;
 if(raw.discoveryId&&(!lead||lead.connectorId!==repo.connectorId||lead.path!==path||lead.commitSha!==ref.toLowerCase()||lead.contentSha256!==expectedHash))throw Error('The AKR locator differs from the selected archive record.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000),headers={'Accept':'application/vnd.github.sha','User-Agent':'AIW-knowledge-reader'};
 try{
  const info={sha:(await readBounded(await fetcher('https://api.github.com/repos/'+repo.repository+'/commits/'+encodeURIComponent(ref),{headers,redirect:'error',signal:controller.signal}),200)).trim()};
  if(!/^[a-f\d]{40}$/i.test(info.sha))throw Error('The repository did not provide an immutable revision.');
  if(/^[a-f\d]{40}$/i.test(ref)&&info.sha.toLowerCase()!==ref.toLowerCase())throw Error('The repository returned a different commit from the selected revision.');
  const url='https://raw.githubusercontent.com/'+repo.repository+'/'+info.sha+'/'+path.split('/').map(encodeURIComponent).join('/');
  const body=await readBounded(await fetcher(url,{redirect:'error',signal:controller.signal}),60000);if(body.includes('\u0000'))throw Error('The selected file is not plain text.');
  if(expectedHash&&sha256(body)!==expectedHash)throw Error('The retrieved file differs from the requested source hash.');
  if(previous&&previous.hash===sha256(body)&&sha256(previous.body)===previous.hash)return {document:p,selected:previous.id};
  const prior=!previous&&p.knowledge?.sources?.find(x=>x.connectorId===repo.connectorId&&x.revision===info.sha&&x.path===path&&x.hash===sha256(body)&&sha256(x.body)===x.hash);
  if(prior)return {document:p,selected:prior.id};
  const result=applyKnowledgeCommand(p,{type:'knowledge.source',payload:{title:raw.title||repo.name+' · '+path.split('/').at(-1),body,url,repository:repo.repository,revision:info.sha,path,license:repo.licence?.note||'Review permitted use before promotion.',supersedes:raw.supersedes}},at,actor);
  const source=result.document.knowledge.sources.find(x=>x.id===result.selected);source.origin='repository-fetch';source.connectorId=repo.connectorId;source.acquisition={status:'retrieved',at,revision:info.sha,hash:source.hash,bytes:new TextEncoder().encode(body).length,...(lead?{discoveryId:lead.id,archiveRelease:AKR_DISCOVERY.releaseId,archiveSha256:AKR_DISCOVERY.archiveSha256}:{})};return result;
 }catch(e){if(controller.signal.aborted)throw Error('Repository refresh timed out. No source revision was created.');throw e;}finally{clearTimeout(timer);}
}
