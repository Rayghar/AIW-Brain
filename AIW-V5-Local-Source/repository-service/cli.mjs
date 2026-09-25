#!/usr/bin/env node
// Operator commands for the AIW knowledge repository service. Run from AIW-V5-Local-Source:
//   node repository-service/cli.mjs <init|build|status|search|withdraw|packet|serve> [options]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadConfig} from './corpus.js';
import {buildStore,withdrawRevision} from './build.js';
import {openReader} from './reader.js';
import {createNoticeKey,loadNoticeKey,candidatePacket} from './sync.js';
import {startService} from './server.js';

const here=path.dirname(fileURLToPath(import.meta.url)),argv=process.argv.slice(2),command=argv[0];
const opt=(name,fallback=null)=>{const i=argv.indexOf('--'+name);return i>0&&argv[i+1]!==undefined?argv[i+1]:fallback;};
const all=name=>argv.flatMap((a,i)=>a==='--'+name&&argv[i+1]?[argv[i+1]]:[]);
const config=await loadConfig(opt('config',path.join(here,'config.json')));
const tokenFile=path.join(config.secrets,'service-token'),keyFile=path.join(config.secrets,'notice-signing-key.pem');
const out=v=>console.log(typeof v==='string'?v:JSON.stringify(v,null,2));

async function token(){try{return (await readFile(tokenFile,'utf8')).trim();}catch(e){if(e.code==='ENOENT')throw Error('Run "init" first: no service token at '+tokenFile+'.');throw e;}}

if(command==='init'){
 await mkdir(config.secrets,{recursive:true});
 let created=false;try{await writeFile(tokenFile,randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:0o600});created=true;}catch(e){if(e.code!=='EEXIST')throw e;}
 const key=await loadNoticeKey(keyFile)||await createNoticeKey(keyFile);
 out({secrets:config.secrets,tokenCreated:created,noticeKey:{keyId:key.keyId,purpose:'notices-only'},
  siteSettings:{AIW_KNOWLEDGE_REPOSITORY_URL:'http://127.0.0.1:'+config.port,AIW_KNOWLEDGE_REPOSITORY_TOKEN_FILE:tokenFile,AIW_REPOSITORY_NOTICE_KEYS:JSON.stringify({[key.keyId]:key.publicKey})},
  next:['node repository-service/cli.mjs build','node repository-service/cli.mjs serve','Add the siteSettings to the Site .env (never commit it), then restart the Site.']});
}
else if(command==='build'){
 const only=opt('only')?opt('only').split(','):null,started=Date.now();
 const summary=await buildStore(config,{only,concurrency:Number(opt('concurrency',12)),log:r=>console.error(r.error?`FAIL ${r.connectorId}: ${r.error}`:`${r.connectorId} · ${r.documents} documents · +${r.added} new · ${r.verified} verified · ${r.passages} passages · ${r.invalidated} invalidated · ${r.notices} notices · ${r.ms} ms`)});
 const receipt={...summary,seconds:Math.round((Date.now()-started)/1000),connectors:summary.connectors};
 const file=path.join(path.dirname(config.store),'build-receipts','build-'+summary.finishedAt.replace(/[:.]/g,'-')+'.json');
 await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify(receipt,null,2)+'\n');
 out({complete:summary.complete,storeId:summary.storeId,cursor:summary.cursor,errors:summary.errors,receipt:file});
 if(summary.errors.length)process.exitCode=1;
}
else if(command==='status'){const r=openReader(config);try{out(r.status());}finally{r.close();}}
else if(command==='search'){
 const r=openReader(config);try{
  const res=await r.search({q:argv[1],connector:opt('connector'),concept:opt('concept'),retrievable:argv.includes('--retrievable'),page:Number(opt('page',1))});
  out(`${res.total} passages for ${res.match}`);for(const h of res.results)out(`- ${h.revision.repository}/${h.revision.path}#L${h.lineStart}-${h.lineEnd} · ${h.heading||h.revision.title}\n  ${h.snippet||h.status}\n  ${h.passageId} · ${h.revision.retrieval.retrievable?'retrievable':h.revision.retrieval.reason}`);
 }finally{r.close();}
}
else if(command==='withdraw'){const reason=opt('reason');if(!argv[1]||!reason)throw Error('Usage: withdraw <revisionId> --reason "why"');out(withdrawRevision(config,argv[1],reason));}
else if(command==='packet'){
 const r=openReader(config);try{
  const packet=candidatePacket(r,{tenantId:opt('tenant'),projectId:opt('project'),fromCursor:Number(opt('from',0)),revisionIds:all('revision'),passageIds:all('passage')});
  const file=opt('output');if(!file)throw Error('Choose --output for the packet JSON.');await writeFile(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  out({packet:file,sources:packet.sources.length,claims:packet.claims.length,notices:packet.notices.length,cursor:packet.cursor});
 }finally{r.close();}
}
else if(command==='serve'){
 const service=await startService(config,{token:await token(),key:await loadNoticeKey(keyFile),port:Number(opt('port',config.port)),log:e=>console.log(JSON.stringify({at:new Date().toISOString(),...e}))});
 console.log(`AIW knowledge repository service ready on ${service.url}`);
 const stop=()=>service.close().then(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
else{console.error('Usage: node repository-service/cli.mjs <init|build|status|search|withdraw|packet|serve> [--config file]');process.exitCode=2;}
