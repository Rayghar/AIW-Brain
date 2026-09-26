import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
const args=process.argv.slice(2),port=Number(args[args.indexOf('--port')+1])||Number(process.env.PORT)||4173;
// Loopback only by default: without local accounts every request is served as the single development
// architect, so a network-reachable server would let anyone on the network edit projects and use the AI key.
const host=(args.includes('--host')?args[args.indexOf('--host')+1]:'')||process.env.AIW_HOST||'127.0.0.1';
const root=path.resolve('public'),DB=localDatabase(process.env.AIW_LOCAL_DB||'.aiw-local/project.sqlite'),FILES=localFiles();
// The laptop knowledge repository service: its token may be read from the service's own token file.
const repositoryToken=process.env.AIW_KNOWLEDGE_REPOSITORY_TOKEN||(process.env.AIW_KNOWLEDGE_REPOSITORY_TOKEN_FILE?(await readFile(process.env.AIW_KNOWLEDGE_REPOSITORY_TOKEN_FILE,'utf8').catch(()=>'')).trim():'');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const ASSETS={async fetch(req){const url=new URL(req.url);try{
  if(url.searchParams.get('preview')==='mobile')return new Response('<!doctype html><html><body style="margin:0;background:#dbe3d4"><iframe title="Mobile chapter preview" src="/?chapter='+(['1','2','3','4','5','6','7','8','9','10','11'].includes(url.searchParams.get('chapter'))?url.searchParams.get('chapter'):'1')+'&project='+encodeURIComponent(url.searchParams.get('project')||'bank-payment')+'&tab='+encodeURIComponent(url.searchParams.get('tab')||'work')+'&view='+encodeURIComponent(url.searchParams.get('view')||'')+'&preview=frame" style="display:block;width:390px;height:844px;border:0;margin:16px auto"></iframe></body></html>',{headers:{'Content-Type':'text/html'}});
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root+path.sep))throw Error();let data=await readFile(file);
  return new Response(data,{headers:{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}});
}catch{return new Response('Not found',{status:404})}}};

// Local accounts (opt-in). AIW_LOCAL_ACCOUNTS is a JSON object of account ID → secret of at least 16
// characters. Each person signs in with their own secret and every request carries that identity, so a
// claim can pass four eyes on one machine. Without it, every request is the single development architect,
// as before. Two accounts are two people only when two different people hold them.
const ACCOUNTS=(()=>{
 const raw=process.env.AIW_LOCAL_ACCOUNTS;if(!raw)return null;let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error('AIW_LOCAL_ACCOUNTS must be a JSON object of account ID → secret.');}
 const entries=Object.entries(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{});
 if(!entries.length||entries.some(([id,secret])=>!/^[A-Za-z0-9_@.\-]{1,180}$/.test(id)||typeof secret!=='string'||secret.length<16))throw Error('Each local account needs an ID of letters, digits and _ @ . - and a secret of at least 16 characters.');
 return new Map(entries);
})();
const SESSION_KEY=randomBytes(32),SESSION_SECONDS=12*3600,COOKIE='aiw_local';
const mac=payload=>createHmac('sha256',SESSION_KEY).update(payload).digest();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function session(id){const payload=Buffer.from(id).toString('base64url')+'.'+(Date.now()+SESSION_SECONDS*1000);return payload+'.'+mac(payload).toString('base64url');}
function signedIn(cookie){
 const m=new RegExp('(?:^|;\\s*)'+COOKIE+'=([^;]+)').exec(cookie||'');if(!m)return null;
 const [id64,expires,sig]=m[1].split('.');if(!id64||!expires||!sig)return null;
 const given=Buffer.from(sig,'base64url'),good=mac(id64+'.'+expires);
 if(given.length!==good.length||!timingSafeEqual(given,good)||!(Number(expires)>Date.now()))return null;
 const id=Buffer.from(id64,'base64url').toString('utf8');return ACCOUNTS.has(id)?id:null;
}
function secretMatches(id,secret){const want=ACCOUNTS.get(id);if(typeof want!=='string'||typeof secret!=='string')return false;return timingSafeEqual(createHash('sha256').update(want).digest(),createHash('sha256').update(secret).digest());}
const sameSitePath=v=>typeof v==='string'&&v.startsWith('/')&&!v.startsWith('//')&&!v.startsWith('/\\')?v:'/';
function signInPage(res,{status=200,message='',current='',next='/'}={}){
 res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});
 res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · AIW local workbench</title><style>body{font:15px/1.5 system-ui,sans-serif;max-width:26rem;margin:4rem auto;padding:0 16px;color:#1d2a24;background:#f7f5ef}label{display:block;margin:.8rem 0 .2rem}input{width:100%;padding:.5rem;font:inherit;box-sizing:border-box}button{margin-top:1rem;padding:.5rem 1rem;font:inherit}.m{color:#8a2d1c}.n{color:#55635b;font-size:13px}</style></head><body><h1>Sign in to this workbench</h1>${current?`<p>Signed in as <b>${esc(current)}</b>. <a href="/local/sign-out">Sign out</a> to switch accounts.</p>`:''}${message?`<p class="m" role="alert">${esc(message)}</p>`:''}<form method="post" action="/local/sign-in"><input type="hidden" name="next" value="${esc(next)}"><label for="account">Account</label><input id="account" name="account" autocomplete="username" required><label for="secret">Secret</label><input id="secret" name="secret" type="password" autocomplete="current-password" required><button type="submit">Sign in</button></form><p class="n">Each person signs in with their own account from this workbench's settings. A claim's author cannot verify it: a second person signs in with their own account to review it.</p></body></html>`);
}
// Sign-in and sign-out pages, and whose request this is. Returns the account, or null once it has answered.
function localAccount(req,res,url,body){
 const current=signedIn(req.headers.cookie);
 if(url.pathname==='/local/sign-in'&&req.method==='GET'){signInPage(res,{current,next:sameSitePath(url.searchParams.get('next'))});return null;}
 if(url.pathname==='/local/sign-in'&&req.method==='POST'){
  if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host){res.writeHead(403,{'Content-Type':'text/plain'});res.end('Sign in from this workbench.');return null;}
  const form=new URLSearchParams(body.toString('utf8')),id=form.get('account')||'',next=sameSitePath(form.get('next'));
  if(!secretMatches(id,form.get('secret')||'')){signInPage(res,{status:401,message:'That account and secret do not match.',next});return null;}
  res.writeHead(303,{Location:next,'Set-Cookie':`${COOKIE}=${session(id)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`,'Cache-Control':'no-store'});res.end();return null;
 }
 if(url.pathname==='/local/sign-out'){res.writeHead(303,{Location:'/local/sign-in','Set-Cookie':`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,'Cache-Control':'no-store'});res.end();return null;}
 if(current)return current;
 if(url.pathname.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'Sign in to this workbench first.',signIn:'/local/sign-in'}));return null;}
 if(req.method==='GET'){res.writeHead(303,{Location:'/local/sign-in?next='+encodeURIComponent(url.pathname+url.search),'Cache-Control':'no-store'});res.end();return null;}
 res.writeHead(401,{'Content-Type':'text/plain'});res.end('Sign in to this workbench first.');return null;
}

export const server=http.createServer(async(req,res)=>{try{
 const data=[];for await(const c of req)data.push(c);const body=Buffer.concat(data);
 const url=new URL(req.url,'http://'+req.headers.host);
 const actor=ACCOUNTS?localAccount(req,res,url,body):'local-architect';if(!actor)return;
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id',actor);
 const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers,...(body.length?{body,duplex:'half'}:{})});
 const response=await worker.fetch(request,{DB,FILES,ASSETS,...Object.fromEntries(Object.entries(process.env).filter(([key])=>/^AIW_CONNECTION(?:S_JSON|_TOKEN_[A-Z0-9_]+)$/.test(key))),OPENAI_API_KEY:process.env.OPENAI_API_KEY,AIW_LLM_MODEL:process.env.AIW_LLM_MODEL,AIW_LLM_BASE_URL:process.env.AIW_LLM_BASE_URL,AIW_REPOSITORY_SYNC_KEYS:process.env.AIW_REPOSITORY_SYNC_KEYS,AIW_REPOSITORY_NOTICE_KEYS:process.env.AIW_REPOSITORY_NOTICE_KEYS,AIW_KNOWLEDGE_REPOSITORY_URL:process.env.AIW_KNOWLEDGE_REPOSITORY_URL,AIW_KNOWLEDGE_REPOSITORY_TOKEN:repositoryToken,AIW_REPOSITORY_SYNC_INTERVAL_MS:process.env.AIW_REPOSITORY_SYNC_INTERVAL_MS});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch(e){console.error(e);if(!res.headersSent)res.writeHead(500);res.end('Preview could not respond')}}).listen(port,host,()=>{
 console.log(`AIW preview ready on ${port} (http://${host.includes(':')?'['+host+']':host}:${port})${ACCOUNTS?` · ${ACCOUNTS.size} local accounts: sign in at /local/sign-in`:''}`);
 if(!['127.0.0.1','::1','localhost'].includes(host))console.warn(ACCOUNTS?`Warning: listening on ${host}. Anyone who can reach this address and holds a local account secret can open and change your projects${process.env.OPENAI_API_KEY?' and use your OpenAI key':''}.`:`Warning: listening on ${host}. Anyone who can reach this address can open and change your projects as the local architect${process.env.OPENAI_API_KEY?' and use your OpenAI key':''}.`);
});
server.on('close',()=>DB.close());
