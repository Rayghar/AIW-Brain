// Live acquisition of documentation from approved, registered GitHub repositories, after the governed
// acquisition. For each connector: resolve the branch to an immutable commit; if it moved, read the
// commit's tree, keep only documentation files inside the connector's allowed paths and size limit,
// reuse unchanged files by git blob hash, download changed ones and check each against the tree's blob
// hash before keeping it. The new snapshot is written beside the store (the original acquisition root
// is never modified) and the selection overlay points the connector at it. A refresh build then turns
// the change into revision and invalidation notices. Nothing is executed; credential-shaped files are
// quarantined without their bytes; a truncated tree or an oversized refresh fails closed.
import {mkdir,writeFile,readFile,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {loadRegistry,loadSelection,readOverlay,snapshotDirOf,bareHash} from './corpus.js';
import {readManifest} from './manifest-stream.js';
import {formatOf} from './passages.js';
import {sha256} from './ids.js';

export const GITHUB={api:'https://api.github.com',raw:'https://raw.githubusercontent.com'};
const MAX_TREE_BYTES=40_000_000,MAX_FILE_BYTES=1_000_000,DEFAULT_MAX_DOWNLOADS=400;
const gitBlobSha=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
const SAFE_PATH=p=>typeof p==='string'&&p.length>0&&p.length<=1000&&!p.startsWith('/')&&!p.split('/').some(s=>!s||s==='.'||s==='..')&&!/[\u0000-\u001f\\]/.test(p);
// Credential shapes and instruction-shaped text, as the governed acquisition screened them.
const BLOCKING=[['PRIVATE_KEY_MATERIAL',/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],['AWS_ACCESS_KEY_SHAPE',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],['CREDENTIAL_BEARING_DATABASE_URL',/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]{6,}@/i],['GITHUB_TOKEN_SHAPE',/\bgh[pousr]_[A-Za-z0-9]{36,}\b/]];
const ADVISORY=[['INSTRUCTION_SHAPED_CONTENT',/ignore (?:all |any )?(?:previous|prior|above) instructions|disregard (?:the )?system prompt|you are (?:now )?(?:chatgpt|an ai assistant)/i],['EMBEDDED_SCRIPT',/<script\b/i]];

// Registered path policy: allowed globs admit, denied globs win.
export function globMatcher(globs){
 const res=(globs||[]).map(g=>new RegExp('^'+String(g).split('**/').map(part=>part.split('**').map(seg=>seg.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'[^/]*').replace(/\?/g,'[^/]')).join('.*')).join('(?:.*/)?')+'$'));
 return p=>res.some(re=>re.test(p));
}
async function bounded(response,max){
 if(!response.ok)throw Object.assign(Error('GitHub answered '+response.status+'.'),{status:response.status});
 const reader=response.body?.getReader();if(!reader)throw Error('GitHub returned no body.');const parts=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Object.assign(Error('The response exceeded its limit.'),{code:'too-large'});}parts.push(value);}
 return Buffer.concat(parts.map(p=>Buffer.from(p)));
}
function client({fetcher=fetch,token=null,bases=GITHUB,timeoutMs=30000}={}){
 const get=async(url,accept,max)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{return await bounded(await fetcher(url,{redirect:'error',signal:c.signal,headers:{Accept:accept,'User-Agent':'AIW-knowledge-repository',...(token?{Authorization:'Bearer '+token}:{})}}),max);}
  catch(e){if(c.signal.aborted)throw Error('GitHub did not answer in time.');throw e;}finally{clearTimeout(t);}};
 return {
  commit:async(repo,ref)=>{const sha=(await get(`${bases.api}/repos/${repo}/commits/${encodeURIComponent(ref)}`,'application/vnd.github.sha',200)).toString('utf8').trim().toLowerCase();if(!/^[a-f0-9]{40}$/.test(sha))throw Error('GitHub did not resolve an immutable commit.');return sha;},
  tree:async(repo,sha)=>{const t=JSON.parse((await get(`${bases.api}/repos/${repo}/git/trees/${sha}?recursive=1`,'application/vnd.github+json',MAX_TREE_BYTES)).toString('utf8'));if(t.truncated)throw Error('GitHub truncated the tree; this repository needs the governed acquisition process.');if(!Array.isArray(t.tree))throw Error('GitHub returned no tree.');return t.tree;},
  raw:async(repo,sha,p,max)=>get(`${bases.raw}/${repo}/${sha}/${p.split('/').map(encodeURIComponent).join('/')}`,'application/octet-stream',max)
 };
}

// One connector. dryRun resolves and plans without downloading or writing.
export async function acquireConnector(config,connectorId,{fetcher=fetch,token=null,bases=GITHUB,maxDownloads=null,dryRun=false,now=()=>new Date().toISOString()}={}){
 const registry=await loadRegistry(config),connector=registry.connectors.get(connectorId);
 if(!connector)throw Error(connectorId+' is not a registered connector.');
 if(connector.lifecycle!=='approved')return {connectorId,status:'skipped',reason:'Only approved connectors are acquired; '+connectorId+' is '+connector.lifecycle+'.'};
 const selection=await loadSelection(config),current=selection.snapshots.find(s=>s.connectorId===connectorId);
 if(!current||current.repository!==connector.repository)throw Error(connectorId+' has no pinned snapshot for '+connector.repository+'.');
 const previous=new Map();
 const {header:head}=await readManifest(current.manifestFile,e=>{if(e.status==='accepted'&&formatOf(e.path))previous.set(e.path,e);});
 const branch=connector.defaultBranch||head.branch||'main',gh=client({fetcher,token,bases}),commit=await gh.commit(connector.repository,branch);
 if(commit===current.commit)return {connectorId,status:'unchanged',commit,branch};
 const allowed=globMatcher(connector.allowedPaths),denied=globMatcher(connector.deniedPaths),limit=Math.min(connector.maxFileBytes||MAX_FILE_BYTES,MAX_FILE_BYTES);
 const blobs=(await gh.tree(connector.repository,commit)).filter(x=>x.type==='blob'&&SAFE_PATH(x.path)&&formatOf(x.path));
 const plan=blobs.map(x=>{
  const base={path:x.path,sha:String(x.sha||'').toLowerCase(),sizeBytes:Number(x.size)||0};
  if(!/^[a-f0-9]{40}$/.test(base.sha))return {...base,status:'rejected',dispositionReason:'tree-entry-without-blob-sha'};
  if(!allowed(x.path)||denied(x.path))return {...base,status:'policy-excluded',dispositionReason:'outside-allowed-paths-or-denied-by-precedence'};
  if(base.sizeBytes>limit)return {...base,status:'rejected',dispositionReason:'governed-file-size-limit'};
  const prior=previous.get(x.path);
  return {...base,status:'pending',reuse:prior&&prior.sha===base.sha?prior:null};
 });
 const downloads=plan.filter(x=>x.status==='pending'&&!x.reuse),cap=maxDownloads??connector.maxFilesPerRefresh??DEFAULT_MAX_DOWNLOADS;
 const summary={connectorId,repository:connector.repository,branch,from:current.commit,commit,documents:plan.filter(x=>x.status==='pending').length,reused:plan.filter(x=>x.reuse).length,downloads:downloads.length,excluded:plan.filter(x=>x.status==='policy-excluded').length,rejected:plan.filter(x=>x.status==='rejected').length};
 if(downloads.length>cap)throw Object.assign(Error(`${connectorId}: ${downloads.length} changed documentation files exceed this refresh's limit of ${cap}; raise it deliberately (--max) or use the governed acquisition process.`),{summary});
 if(dryRun)return {...summary,status:'planned'};
 const snapshotId='KSNAP-'+connectorId+'-'+commit.slice(0,12),dir=snapshotDirOf(config,connectorId,snapshotId,true),staging=dir+'.partial';
 await rm(staging,{recursive:true,force:true});await mkdir(staging,{recursive:true});
 const store=async(bytes)=>{const h=sha256(bytes),rel='objects/sha256/'+h.slice(0,2)+'/'+h;await mkdir(path.join(staging,'objects','sha256',h.slice(0,2)),{recursive:true});await writeFile(path.join(staging,...rel.split('/')),bytes);return {h,rel};};
 const files=[];
 try{
  for(const x of plan){
   if(x.status!=='pending'){files.push({path:x.path,sha:x.sha,sizeBytes:x.sizeBytes,status:x.status,dispositionReason:x.dispositionReason});continue;}
   let bytes;
   if(x.reuse){bytes=await readFile(path.join(current.snapshotDir,...String(x.reuse.contentAddressedObject).split('/')));if(sha256(bytes)!==bareHash(x.reuse.contentSha256))throw Error('The pinned copy of '+x.path+' no longer matches its manifest.');}
   else{try{bytes=await gh.raw(connector.repository,commit,x.path,limit);}catch(e){files.push({path:x.path,sha:x.sha,sizeBytes:x.sizeBytes,status:'rejected',dispositionReason:e.code==='too-large'?'governed-file-size-limit':'unavailable-at-commit'});continue;}}
   if(gitBlobSha(bytes)!==x.sha)throw Error(x.path+' does not match the tree\'s blob hash at '+commit+'.');
   const text=bytes.toString('utf8'),blocking=BLOCKING.filter(([,re])=>re.test(text)).map(([code])=>code);
   if(blocking.length||bytes.includes(0)){files.push({path:x.path,sha:x.sha,sizeBytes:bytes.length,status:'quarantined',contentSha256:'sha256:'+sha256(bytes),findings:[...blocking,...(bytes.includes(0)?['BINARY_OR_MALFORMED_TEXT']:[])].map(code=>({severity:'blocking',code,detail:'Held out of the corpus; bytes not kept.'}))});continue;}
   const {h,rel}=await store(bytes);
   files.push({path:x.path,sha:x.sha,sizeBytes:bytes.length,mediaType:'text/'+formatOf(x.path),sourceFormat:x.path.split('.').at(-1),status:'accepted',findings:ADVISORY.filter(([,re])=>re.test(text)).map(([code])=>({severity:'warning',code,detail:'Read as untrusted text.'})),contentSha256:'sha256:'+h,contentAddressedObject:rel,securityDisposition:'safe-bounded-parser-input',reused:!!x.reuse});
  }
  const accepted=files.filter(f=>f.status==='accepted');
  const manifest={schemaVersion:'aiw-github-docs-refresh-v1',connectorId,repository:connector.repository,branch,commitSha:commit,snapshotId,acquiredAt:now(),supersedesSnapshot:current.snapshotId,
   repositoryMetadata:{htmlUrl:'https://github.com/'+connector.repository},api:{base:bases.api,contentTransport:'raw-immutable',authenticated:!!token},
   policy:{allowedPaths:connector.allowedPaths,deniedPaths:connector.deniedPaths,maxFileBytes:limit,scope:'documentation files only'},
   licenceEvidence:{...(head.licenceEvidence||{}),carriedFrom:current.snapshotId,note:'Licence evidence carried from the previous snapshot; it was not reviewed again for this commit.'},
   files,snapshotChecksum:'sha256:'+sha256(accepted.map(f=>f.path+'\n'+f.contentSha256).join('\n')),
   coverage:{treeDocumentationFiles:plan.length,acceptedFiles:accepted.length,reusedFiles:accepted.filter(f=>f.reused).length,downloadedFiles:accepted.filter(f=>!f.reused).length,quarantinedFiles:files.filter(f=>f.status==='quarantined').length,policyExclusions:files.filter(f=>f.status==='policy-excluded').length,rejectedFiles:files.filter(f=>f.status==='rejected').length}};
  manifest.manifestSha256='sha256:'+sha256(JSON.stringify(manifest));
  await writeFile(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,1));
  await rm(dir,{recursive:true,force:true});await mkdir(path.dirname(dir),{recursive:true});await rename(staging,dir);
  // The overlay changes last, atomically: until then the store keeps reading the pinned snapshot.
  const overlay=await readOverlay(config),next={schema:'aiw-selection-overlay-v1',snapshots:[...overlay.snapshots.filter(o=>o.connectorId!==connectorId),{connectorId,repository:connector.repository,immutableCommit:commit,snapshotId,manifestChecksum:manifest.manifestSha256,snapshotChecksum:manifest.snapshotChecksum,acquiredAt:manifest.acquiredAt,supersedesSnapshot:current.snapshotId,source:'aiw-live-documentation-refresh'}]};
  await mkdir(path.dirname(config.overlay),{recursive:true});await writeFile(config.overlay+'.tmp',JSON.stringify(next,null,2));await rename(config.overlay+'.tmp',config.overlay);
  return {...summary,status:'acquired',snapshotId,accepted:accepted.length,quarantined:manifest.coverage.quarantinedFiles,rejected:manifest.coverage.rejectedFiles};
 }catch(e){await rm(staging,{recursive:true,force:true});throw e;}
}

export async function acquireAll(config,{only=null,...options}={}){
 const registry=await loadRegistry(config),ids=[...registry.connectors.values()].filter(c=>c.lifecycle==='approved'&&(!only||only.includes(c.connectorId))).map(c=>c.connectorId).sort();
 const results=[];for(const id of ids){try{results.push(await acquireConnector(config,id,options));}catch(e){results.push({connectorId:id,status:'failed',error:e.message,...(e.summary?{plan:e.summary}:{})});}}
 return results;
}
