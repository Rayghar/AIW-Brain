// Imports a candidate set (candidate-sets/*.json, made by build-candidate-set.mjs) into a project of a
// running workbench, as the signed-in person, through the project's own commands: each source's exact
// original is retrieved from the knowledge repository (knowledge.fetch through the corpus), and each asset
// becomes a candidate claim on its exact lines (knowledge.claim). Nothing is reviewed, released or
// activated: a different signed-in person must verify each claim. Re-running skips what is already there.
// Usage: node scripts/import-candidate-set.mjs [--set candidate-sets/bk-p2-20260911.json]
//        [--base http://127.0.0.1:4173] [--project <id>] [--account <id> --secret-env <VAR>] [--dry-run]
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const sha256=s=>createHash('sha256').update(s).digest('hex');
const excerptOf=(text,start,end)=>text.split('\n').slice(start-1,end).join('\n');

// Signs in to a workbench with local accounts and returns the session cookie.
export async function signIn(base,account,secret,{fetcher=fetch}={}){
  const r=await fetcher(base+'/local/sign-in',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:base},body:new URLSearchParams({account,secret})});
  if(r.status!==303)throw Error('Sign-in failed for '+account+'.');
  return String(r.headers.get('set-cookie')||'').split(';')[0];
}

export async function importCandidateSet({base,pack,projectId=null,cookie='',dryRun=false,fetcher=fetch,log=()=>{}}){
  if(pack?.schemaVersion!=='aiw-candidate-set-v1')throw Error('Choose a candidate set made by build-candidate-set.mjs.');
  const headers={Origin:base,...(cookie?{Cookie:cookie}:{})};
  const call=async(route,body)=>{
    const r=await fetcher(base+route,{method:body?'POST':'GET',headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(data.error||('The workbench answered '+r.status+'.')),{status:r.status});return data;
  };
  let current=await call('/api/project'+(projectId?'?project='+encodeURIComponent(projectId):''));
  const project=current.document.id,q='?project='+encodeURIComponent(project);
  const status=await call('/api/knowledge/corpus'+q+'&view=status');
  if(!status.connected)throw Error('The knowledge repository is not connected to this workbench: '+(status.reason||'start it and configure the workbench.'));
  let revision=current.revision,doc=current.document;
  const command=async cmd=>{const r=await call('/api/commands'+q,{revision,command:cmd});revision=r.revision;doc=r.document;return r;};
  const summary={setId:pack.setId,project,dryRun,sourcesRetrieved:[],sourcesReused:[],claimsCreated:[],skipped:[],notImported:pack.notImported||[]};
  const sourceIds=new Map(),bySource=new Map(pack.sources.map(s=>[s.id,s]));
  const saved=s=>(doc.knowledge?.sources||[]).find(x=>x.origin==='repository-fetch'&&x.repository===s.repository&&x.revision===s.commit&&x.path===s.path&&x.hash===s.fileSha256&&sha256(x.body)===x.hash);
  for(const sid of [...new Set(pack.claims.map(c=>c.anchor.sourceId))]){
    const s=bySource.get(sid);if(!s?.retrievable){summary.skipped.push({sourceId:sid,reason:'The knowledge repository cannot supply this source.'});continue;}
    const have=saved(s);if(have){sourceIds.set(sid,have.id);summary.sourcesReused.push(s.path);continue;}
    if(dryRun){summary.sourcesRetrieved.push(s.path+' (would retrieve)');continue;}
    await command({type:'knowledge.fetch',payload:{transport:'corpus',revisionId:s.revisionId,connectorId:s.connectorId,path:s.path,ref:s.commit,expectedHash:s.fileSha256}});
    const got=saved(s);if(!got)throw Error('The exact original of '+s.path+' was not saved.');
    sourceIds.set(sid,got.id);summary.sourcesRetrieved.push(s.path);log('retrieved '+s.path);
  }
  for(const c of pack.claims){
    const tagged=(doc.knowledge?.claims||[]).find(x=>(x.tags||[]).includes('candidate-set:'+pack.setId)&&(x.tags||[]).includes('asset:'+c.assetId));
    if(tagged){summary.skipped.push({assetId:c.assetId,reason:'Already imported as '+tagged.id+'.'});continue;}
    const sourceId=sourceIds.get(c.anchor.sourceId),src=(doc.knowledge?.sources||[]).find(x=>x.id===sourceId);
    if(dryRun){summary.claimsCreated.push({assetId:c.assetId,claimId:'(would create)'});continue;}
    if(!src){summary.skipped.push({assetId:c.assetId,reason:'Its source was not retrieved.'});continue;}
    if(sha256(excerptOf(src.body,c.anchor.lineStart,c.anchor.lineEnd))!==c.anchor.excerptSha256){summary.skipped.push({assetId:c.assetId,reason:'Its passage no longer matches the retrieved original.'});continue;}
    await command({type:'knowledge.claim',payload:{sourceId,lineStart:c.anchor.lineStart,lineEnd:c.anchor.lineEnd,subjectId:c.subjectId,predicate:c.predicate,statement:c.statement,claimType:c.claimType,polarity:c.polarity,conditions:c.conditions,limitations:c.limitations,tags:c.tags}});
    const made=doc.knowledge.claims.at(-1);summary.claimsCreated.push({assetId:c.assetId,claimId:made.id});log('claimed '+c.assetId+' as '+made.id);
  }
  summary.awaiting='Each created claim is a candidate authored by the importing account. A different signed-in person must verify it before it can be released, activated and read by Sol.';
  return summary;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:d;};
  const base=opt('base','http://127.0.0.1:4173'),pack=JSON.parse(readFileSync(opt('set','candidate-sets/bk-p2-20260911.json'),'utf8'));
  const account=opt('account',null),secretVar=opt('secret-env',null);
  if(account&&!(secretVar&&process.env[secretVar]))throw Error('Pass --secret-env naming an environment variable that holds the account secret.');
  const cookie=account?await signIn(base,account,process.env[secretVar]):'';
  console.log(JSON.stringify(await importCandidateSet({base,pack,projectId:opt('project',null),cookie,dryRun:args.includes('--dry-run'),log:m=>console.error(m)}),null,2));
}
