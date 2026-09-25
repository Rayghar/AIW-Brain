// Read operations over the store. Every excerpt is re-read from the content-addressed original and
// verified against the file hash and the stored excerpt hash at request time; a mismatch is reported,
// never repaired silently. All results are discovery material, not approved knowledge.
import path from 'node:path';
import {openStore} from './store.js';
import {readAccepted,decodeText,RETRIEVAL_REASONS} from './corpus.js';
import {excerptOf,sha256} from './ids.js';

export const AUTHORITY='discovery-only';
const MAX_QUERY=300,MAX_TERMS=12,PAGE=20;
const json=v=>{try{return JSON.parse(v||'[]');}catch{return [];}};

// User text becomes a safe FTS5 expression: quoted terms and phrases, all required, last term as prefix.
export function ftsQuery(input){
 const text=String(input||'').slice(0,MAX_QUERY),parts=[];let last=null;
 for(const m of text.matchAll(/"([^"]{1,120})"|([\p{L}\p{N}][\p{L}\p{N}_'-]*)/gu)){
  if(parts.length>=MAX_TERMS)break;
  if(m[1]){const words=m[1].match(/[\p{L}\p{N}]+/gu);if(words?.length){parts.push('"'+words.join(' ')+'"');last=null;}}
  else{const words=m[2].match(/[\p{L}\p{N}]+/gu)||[];if(!words.length)continue;parts.push('"'+words.join(' ')+'"');last=words.length===1&&words[0].length>=3?parts.length-1:null;}
 }
 if(!parts.length)return null;
 if(last!==null)parts[last]+='*';
 return parts.join(' AND ');
}
const terms=q=>[...String(q||'').toLowerCase().matchAll(/[\p{L}\p{N}]{3,}/gu)].map(m=>m[0]).slice(0,MAX_TERMS);

function snippetOf(excerpt,q){
 const flat=excerpt.replace(/\s+/g,' ').trim(),lower=flat.toLowerCase();let at=-1;
 for(const t of terms(q)){const i=lower.indexOf(t.slice(0,Math.max(3,Math.min(t.length,6))));if(i>=0&&(at<0||i<at))at=i;}
 const start=Math.max(0,(at<0?0:at)-120);return (start?'…':'')+flat.slice(start,start+360)+(start+360<flat.length?'…':'');
}

export function openReader(config){
 const store=openStore(config.store),{db}=store;
 const snapshotDir=r=>path.join(config.snapshotRoot,'snapshots',r.connector_id,r.snapshot_id);
 const connectorRow=id=>db.prepare('SELECT * FROM connectors WHERE connector_id=?').get(id);
 const licence=c=>c?{usePolicy:c.use_policy,reviewStatus:c.review_status,finalDisposition:c.final_disposition,spdx:c.spdx,note:c.licence_note,clearance:'not-reviewed'}:null;
 const revisionOut=(r,c=connectorRow(r.connector_id))=>({revisionId:r.revision_id,connectorId:r.connector_id,repository:r.repository,commit:r.commit_sha,path:r.path,fileSha256:r.file_sha256,bytes:r.bytes,format:r.format,title:r.title,state:r.state,supersedes:r.supersedes,passages:r.passages,bodyIndexed:!!r.body_indexed,findings:json(r.findings),
  retrieval:{retrievable:!!r.retrievable&&r.state==='current',reason:r.state==='current'?r.retrieval_reason:'revision-not-current',explanation:RETRIEVAL_REASONS[r.state==='current'?r.retrieval_reason:'revision-not-current']||null},
  connector:c?{name:c.name,lifecycle:c.lifecycle,trustTier:c.trust_tier}:null,licence:licence(c),
  receipt:{storeId:store.storeId,snapshotId:r.snapshot_id,object:r.object,rawManifestSha256:c?.raw_manifest_sha256||null,manifestSha256:c?.manifest_sha256||null,acquiredAt:c?.acquired_at||null,verifiedAt:r.verified_at}});
 // Verified text of one revision, cached per request.
 async function readOriginal(r,cache){
  if(cache?.has(r.rowid))return cache.get(r.rowid);
  const load=(async()=>{const bytes=await readAccepted(snapshotDir(r),{status:'accepted',contentSha256:r.file_sha256,contentAddressedObject:r.object});const d=decodeText(bytes);if(!d.ok)throw Error('The original is not text.');return d.text;})();
  cache?.set(r.rowid,load);return load;
 }
 async function excerpt(r,p,cache){
  try{const text=await readOriginal(r,cache),e=excerptOf(text,p.line_start,p.line_end);if(sha256(e)!==p.excerpt_sha256)return {ok:false,status:'excerpt-changed'};return {ok:true,text:e};}
  catch(err){return {ok:false,status:'source-unverifiable',detail:err.message};}
 }
 const cuesFor=rowid=>db.prepare('SELECT c.concept_id,c.catalogue_id,c.name,c.record_type FROM passage_concepts pc JOIN concepts c ON c.concept_id=pc.concept_id WHERE pc.passage_rowid=? ORDER BY c.name').all(rowid).map(c=>({conceptId:c.concept_id,catalogueId:c.catalogue_id,name:c.name,recordType:c.record_type}));
 const passageOut=(p,r,x,q)=>({passageId:p.passage_id,lineStart:p.line_start,lineEnd:p.line_end,heading:p.heading,excerptSha256:p.excerpt_sha256,verified:x.ok,status:x.ok?'verified':x.status,
  excerpt:x.ok?x.text:null,snippet:x.ok?snippetOf(x.text,q):null,concepts:cuesFor(p.rowid),revision:revisionOut(r),authority:AUTHORITY});

 return {store,
  status(){
   const one=sql=>db.prepare(sql).get(),c=one("SELECT COUNT(*) connectors,COALESCE(SUM(files),0) files,COALESCE(SUM(documents),0) documents FROM connectors");
   const r=one("SELECT COUNT(*) revisions,COALESCE(SUM(body_indexed),0) \"indexedDocuments\",COALESCE(SUM(retrievable),0) retrievable,COALESCE(SUM(passages),0) passages FROM revisions WHERE state='current'");
   return {service:'aiw-knowledge-repository',storeId:store.storeId,schema:store.get('schemaVersion'),cursor:store.cursor(),baselineAt:store.get('baselineAt'),builtAt:store.get('builtAt'),
    selection:json(store.get('selection')||'null'),registry:json(store.get('registry')||'null'),counts:{...c,...r},authority:AUTHORITY,productionAccepted:false,
    connectors:db.prepare('SELECT connector_id,repository,name,lifecycle,use_policy,spdx,review_status,final_disposition,documents,"indexed" AS indexed_documents,passages,commit_sha FROM connectors ORDER BY connector_id').all().map(x=>({connectorId:x.connector_id,repository:x.repository,name:x.name,lifecycle:x.lifecycle,usePolicy:x.use_policy,spdx:x.spdx,reviewStatus:x.review_status,finalDisposition:x.final_disposition,commit:x.commit_sha,documents:x.documents,indexedDocuments:x.indexed_documents,passages:x.passages}))};
  },
  async search({q,connector=null,concept=null,retrievable=false,page=1}={}){
   const match=ftsQuery(q);if(!match)return {query:String(q||''),total:0,page:1,results:[],files:[],authority:AUTHORITY};
   const where=["passage_search MATCH ?","r.state='current'"],args=[match];
   if(connector){where.push('r.connector_id=?');args.push(String(connector));}
   if(retrievable)where.push('r.retrievable=1');
   if(concept){where.push('p.rowid IN (SELECT passage_rowid FROM passage_concepts WHERE concept_id=?)');args.push(String(concept));}
   const from='FROM passage_search JOIN passages p ON p.rowid=passage_search.rowid JOIN revisions r ON r.rowid=p.revision_rowid WHERE '+where.join(' AND ');
   const total=Number(db.prepare('SELECT COUNT(*) n '+from).get(...args).n),n=Math.max(1,Math.min(20,Number(page)||1)),offset=(n-1)*PAGE;
   // Two passages per file at most, so one long document cannot fill a page.
   const rows=db.prepare('SELECT p.rowid prow,p.*,r.*,r.rowid rrow,bm25(passage_search,4.0,2.0,1.0,1.5) score '+from+' ORDER BY score LIMIT ?').all(...args,Math.min(1200,(offset+PAGE)*6));
   const perFile=new Map(),picked=[];for(const x of rows){const k=x.rrow,c=perFile.get(k)||0;if(c<2){perFile.set(k,c+1);picked.push(x);}}
   const cache=new Map(),results=[];
   for(const x of picked.slice(offset,offset+PAGE)){const p={rowid:x.prow,passage_id:x.passage_id,line_start:x.line_start,line_end:x.line_end,excerpt_sha256:x.excerpt_sha256,heading:x.heading},r={...x,rowid:x.rrow};results.push({...passageOut(p,r,await excerpt(r,p,cache),q),score:Number(x.score.toFixed(4))});}
   const files=db.prepare("SELECT r.*,r.rowid rrow FROM file_search JOIN revisions r ON r.rowid=file_search.rowid WHERE file_search MATCH ? AND r.state='current'"+(connector?' AND r.connector_id=?':'')+(retrievable?' AND r.retrievable=1':'')+' ORDER BY bm25(file_search,3.0,1.0,0.5) LIMIT 8').all(...[match,...(connector?[String(connector)]:[])]).map(r=>revisionOut(r));
   return {query:String(q||''),match,total,page:n,pageSize:PAGE,results,files,authority:AUTHORITY};
  },
  async passage(id){
   const p=db.prepare('SELECT rowid,* FROM passages WHERE passage_id=?').get(String(id));if(!p)return null;
   const r=db.prepare('SELECT rowid,* FROM revisions WHERE rowid=?').get(p.revision_rowid),out=passageOut(p,r,await excerpt(r,p,new Map()),'');
   const around=db.prepare('SELECT passage_id,ordinal FROM passages WHERE revision_rowid=? AND ordinal IN (?,?) ORDER BY ordinal').all(p.revision_rowid,p.ordinal-1,p.ordinal+1);
   return {...out,previous:around.find(x=>x.ordinal<p.ordinal)?.passage_id||null,next:around.find(x=>x.ordinal>p.ordinal)?.passage_id||null};
  },
  revision(id){
   const r=db.prepare('SELECT rowid,* FROM revisions WHERE revision_id=?').get(String(id));if(!r)return null;
   return {...revisionOut(r),passageList:db.prepare('SELECT passage_id,ordinal,line_start,line_end,heading,excerpt_sha256 FROM passages WHERE revision_rowid=? ORDER BY ordinal').all(r.rowid).map(p=>({passageId:p.passage_id,ordinal:p.ordinal,lineStart:p.line_start,lineEnd:p.line_end,heading:p.heading,excerptSha256:p.excerpt_sha256})),authority:AUTHORITY};
  },
  // The exact original for a governed project retrieval. Refused unless the revision is retrievable.
  async original(id){
   const r=db.prepare('SELECT rowid,* FROM revisions WHERE revision_id=?').get(String(id));if(!r)return {status:404,error:'No such revision.'};
   const out=revisionOut(r);if(!out.retrieval.retrievable)return {status:409,error:out.retrieval.explanation||'This revision cannot be retrieved.',reason:out.retrieval.reason};
   let text;try{text=await readOriginal(r);}catch(e){return {status:409,error:'The original could not be verified: '+e.message,reason:'source-unverifiable'};}
   if(sha256(text)!==r.file_sha256)return {status:409,error:'The decoded original does not reproduce its file hash.',reason:'source-unverifiable'};
   return {status:200,body:{...out,text,verifiedAt:new Date().toISOString(),authority:AUTHORITY}};
  },
  concepts(q='',limit=40){
   const like='%'+String(q).toLowerCase().slice(0,80)+'%';
   return db.prepare("SELECT c.concept_id,c.catalogue_id,c.name,c.record_type,COUNT(pc.passage_rowid) passages FROM concepts c JOIN passage_concepts pc ON pc.concept_id=c.concept_id JOIN passages p ON p.rowid=pc.passage_rowid JOIN revisions r ON r.rowid=p.revision_rowid AND r.state='current' WHERE lower(c.name) LIKE ? OR lower(c.catalogue_id) LIKE ? GROUP BY c.concept_id ORDER BY passages DESC,c.name LIMIT ?").all(like,like,Math.min(200,limit)).map(c=>({conceptId:c.concept_id,catalogueId:c.catalogue_id,name:c.name,recordType:c.record_type,passages:c.passages}));
  },
  notices(from=0,limit=500){return db.prepare('SELECT * FROM notices WHERE cursor>? ORDER BY cursor LIMIT ?').all(Math.max(0,Number(from)||0),Math.min(5000,limit)).map(n=>({cursor:n.cursor,kind:n.kind,revisionId:n.revision_id,supersedes:n.supersedes,reason:n.reason,repository:n.repository,commit:n.commit_sha,path:n.path,hash:n.file_sha256,at:n.at}));},
  close(){store.close();}
 };
}
