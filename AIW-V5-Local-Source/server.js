import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
const args=process.argv.slice(2),port=Number(args[args.indexOf('--port')+1])||Number(process.env.PORT)||4173;
// Loopback only by default: every request is served as the single development architect,
// so a network-reachable server would let anyone on the network edit projects and use the AI key.
const host=(args.includes('--host')?args[args.indexOf('--host')+1]:'')||process.env.AIW_HOST||'127.0.0.1';
const root=path.resolve('public'),DB=localDatabase(process.env.AIW_LOCAL_DB||'.aiw-local/project.sqlite'),FILES=localFiles();
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const ASSETS={async fetch(req){const url=new URL(req.url);try{
  if(url.searchParams.get('preview')==='mobile')return new Response('<!doctype html><html><body style="margin:0;background:#dbe3d4"><iframe title="Mobile chapter preview" src="/?chapter='+(['1','2','3','4','5','6','7','8','9','10','11'].includes(url.searchParams.get('chapter'))?url.searchParams.get('chapter'):'1')+'&project='+encodeURIComponent(url.searchParams.get('project')||'bank-payment')+'&tab='+encodeURIComponent(url.searchParams.get('tab')||'work')+'&view='+encodeURIComponent(url.searchParams.get('view')||'')+'&preview=frame" style="display:block;width:390px;height:844px;border:0;margin:16px auto"></iframe></body></html>',{headers:{'Content-Type':'text/html'}});
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root+path.sep))throw Error();let data=await readFile(file);
  return new Response(data,{headers:{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}});
}catch{return new Response('Not found',{status:404})}}};
export const server=http.createServer(async(req,res)=>{try{const data=[];for await(const c of req)data.push(c);const body=Buffer.concat(data);const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-architect');const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers,...(body.length?{body,duplex:'half'}:{})});const response=await worker.fetch(request,{DB,FILES,ASSETS,...Object.fromEntries(Object.entries(process.env).filter(([key])=>/^AIW_CONNECTION(?:S_JSON|_TOKEN_[A-Z0-9_]+)$/.test(key))),OPENAI_API_KEY:process.env.OPENAI_API_KEY,AIW_LLM_MODEL:process.env.AIW_LLM_MODEL,AIW_LLM_BASE_URL:process.env.AIW_LLM_BASE_URL,AIW_REPOSITORY_SYNC_KEYS:process.env.AIW_REPOSITORY_SYNC_KEYS});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){console.error(e);res.writeHead(500);res.end('Preview could not respond')}}).listen(port,host,()=>{console.log(`AIW preview ready on ${port} (http://${host.includes(':')?'['+host+']':host}:${port})`);if(!['127.0.0.1','::1','localhost'].includes(host))console.warn(`Warning: listening on ${host}. Anyone who can reach this address can open and change your projects as the local architect${process.env.OPENAI_API_KEY?' and use your OpenAI key':''}.`);});
server.on('close',()=>DB.close());
