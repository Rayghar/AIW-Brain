// Builds a candidate set for import from a candidate corpus of the earlier AIW backend
// (aiw-evidence-candidate-corpus-v1, e.g. data/candidate-knowledge/BK-P2-20260911/corpus.json).
// Each curated asset becomes one candidate claim anchored on an exact passage of a file the knowledge
// repository can retrieve. The anchor is checked here against the verified original from the laptop's
// corpus. The pack holds locators, hashes, licences and the curator's own interpretations — no
// third-party text: an import reads the passages from the corpus again.
// Usage: node scripts/build-candidate-set.mjs <corpus.json> [--config repository-service/config.json]
//        [--out candidate-sets/<set>.json] [--archive <name>] [--archive-sha256 <hex>]
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {loadConfig} from '../repository-service/corpus.js';
import {openReader} from '../repository-service/reader.js';
import {revisionId,excerptOf,sha256} from '../repository-service/ids.js';
import {BRAIN_CATALOGUE} from '../public/knowledge-governance.js';

const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:d;};
const corpusFile=args.find(a=>!a.startsWith('--')&&!args[args.indexOf(a)-1]?.startsWith('--'));
if(!corpusFile)throw Error('Name the candidate corpus JSON.');
const raw=readFileSync(corpusFile),corpus=JSON.parse(raw.toString('utf8'));
if(corpus.schemaVersion!=='aiw-evidence-candidate-corpus-v1')throw Error('Unsupported candidate corpus '+corpus.schemaVersion);
const config=await loadConfig(opt('config','repository-service/config.json')),reader=openReader(config);
const catalogue=new Set(BRAIN_CATALOGUE.records.map(r=>r.id));
// How each kind of curated asset reads as a claim.
const KIND={pattern:['applicability','supports','applies when'],tactic:['mitigation','supports','mitigates'],contract:['obligation','requires','requires'],'anti-pattern':['anti-pattern-signal','limits','signals'],'verification-recipe':['obligation','requires','is verified by']};
try{
  const sources=[],originals=new Map();
  for(const s of corpus.sources){
    const id=revisionId(s.repository,s.commitSha,s.relativePath,s.contentSha256),rev=reader.revision(id);
    let retrievable=false,reason=rev?rev.retrieval?.reason||null:'not a documentation file in the knowledge repository';
    if(rev?.retrieval?.retrievable){const o=await reader.original(id);if(o.status===200&&o.body.fileSha256===s.contentSha256&&sha256(o.body.text)===s.contentSha256){retrievable=true;reason=null;originals.set(s.id,o.body.text);}else reason='the verified original could not be read';}
    sources.push({id:s.id,connectorId:s.connectorId,repository:s.repository,commit:s.commitSha,path:s.relativePath,fileSha256:s.contentSha256,gitBlobSha1:s.gitBlobSha1,bytes:s.byteLength,revisionId:id,retrievable,...(reason?{reason}:{}),licence:{spdxDetected:s.licence?.recordedSpdxId||null,usePolicy:s.licence?.recordedUsePolicy||null,reviewStatus:s.licence?.reviewStatus||'pending',redistribution:s.licence?.redistributionApproval||'not-granted'}});
  }
  const byId=new Map(corpus.passages.map(p=>[p.id,p])),sourceOf=new Map(sources.map(s=>[s.id,s]));
  // A passage is a usable anchor when its source is retrievable and its exact lines are the curator's passage.
  function anchor(pid){
    const p=byId.get(pid),text=p&&originals.get(p.sourceId);if(!text)return null;
    const excerpt=excerptOf(text,p.startLine,p.endLine),same=excerpt===p.text||excerpt===p.text.replace(/\r?\n$/,'')||excerpt+'\n'===p.text;
    return same?{passageId:p.id,sourceId:p.sourceId,lineStart:p.startLine,lineEnd:p.endLine,excerptSha256:sha256(excerpt),candidatePassageSha256:p.sha256,role:p.role}:null;
  }
  const claims=[],notImported=[];
  for(const a of corpus.assets){
    const cited=[...new Set(JSON.stringify(a).match(/"passageIds":\[[^\]]*\]/g).flatMap(m=>JSON.parse(m.slice(13))))];
    const at=a.mechanism.passageIds.map(anchor).find(Boolean);
    if(!at){notImported.push({assetId:a.id,title:a.title,reason:'Its mechanism rests only on passages the knowledge repository cannot retrieve as project sources ('+a.mechanism.passageIds.map(id=>{const s=sourceOf.get(byId.get(id)?.sourceId);return id+': '+(s?.reason||'unknown source');}).join('; ')+').'});continue;}
    const [claimType,polarity,predicate]=KIND[a.kind]||['applicability','neutral','describes'],src=sourceOf.get(at.sourceId);
    claims.push({assetId:a.id,title:a.title,kind:a.kind,family:a.family,subjectId:(a.relatedPatternIds||[]).find(id=>catalogue.has(id))||a.id,predicate,claimType,polarity,
      statement:(a.title+': '+a.mechanism.text).slice(0,2000),
      conditions:a.conditions.map(c=>c.explanation).filter(Boolean),
      limitations:[...a.exclusions.map(x=>x.text),...a.tradeoffs.map(x=>x.text)].filter(Boolean),
      anchor:at,
      tags:[`candidate-set:${corpus.corpusId}`,`asset:${a.id}`,`kind:${a.kind}`,`family:${a.family}`,'basis:curator-interpretation',`anchor:${at.passageId}`,`cites:${cited.join(',')}`,`licence:${src.licence.spdxDetected||'unknown'} detected, review ${src.licence.reviewStatus}`],
      citedPassages:cited.map(id=>{const p=byId.get(id),s=sourceOf.get(p?.sourceId);return {passageId:id,sourceId:p?.sourceId,lineStart:p?.startLine,lineEnd:p?.endLine,role:p?.role,retrievable:!!(s&&s.retrievable&&anchor(id))};})});
  }
  const pack={schemaVersion:'aiw-candidate-set-v1',setId:corpus.corpusId,
    title:'Phase 2 candidate architecture knowledge, from the earlier AIW backend',
    origin:{archive:opt('archive',null),archiveSha256:opt('archive-sha256',null),corpusFile:'data/candidate-knowledge/'+corpus.corpusId+'/corpus.json',corpusSha256:sha256(raw),corpusFingerprint:corpus.fingerprint,baseRuntimeRelease:corpus.baseRuntimeRelease,candidateAuthority:corpus.authority},
    authority:'Candidate only. Importing creates candidate claims authored by the person who imports them; a different signed-in person must verify each one, and nothing is released or activated by the import.',
    builtAgainst:{storeId:reader.status().storeId,builtAt:new Date().toISOString()},
    counts:{sources:sources.length,retrievableSources:sources.filter(s=>s.retrievable).length,assets:corpus.assets.length,claims:claims.length,notImported:notImported.length},
    sources,claims,notImported};
  const out=opt('out','candidate-sets/'+corpus.corpusId.toLowerCase()+'.json');mkdirSync(path.dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(pack,null,2)+'\n');
  console.log(JSON.stringify({out,counts:pack.counts,notImported:notImported.map(x=>x.assetId+': '+x.reason)},null,2));
}finally{reader.close();}
