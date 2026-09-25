// Loopback HTTP service for the AIW server. It is not a browser API: requests carrying an Origin are
// refused, the Host must be this loopback address and port, and a bearer token is required.
import http from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {openReader} from './reader.js';
import {signedNoticeUpdate,candidatePacket} from './sync.js';

const LOOPBACK=['127.0.0.1','::1','localhost'];
async function readBody(req,max){let size=0;const parts=[];for await(const c of req){size+=c.length;if(size>max)throw Object.assign(Error('The request body is too large.'),{status:413});parts.push(c);}return Buffer.concat(parts).toString('utf8');}

export async function startService(config,{token,key=null,port=config.port,host='127.0.0.1',log=()=>{}}={}){
 if(!LOOPBACK.includes(host))throw Error('The repository service listens on loopback only.');
 if(typeof token!=='string'||token.length<32)throw Error('A service token of at least 32 characters is required.');
 const reader=openReader(config),expected=createHash('sha256').update(token).digest();let bound=0;
 const authorised=req=>{const m=/^Bearer (\S+)$/.exec(req.headers.authorization||'');return !!m&&timingSafeEqual(createHash('sha256').update(m[1]).digest(),expected);};
 const hostOk=req=>[`127.0.0.1:${bound}`,`localhost:${bound}`,`[::1]:${bound}`].includes(String(req.headers.host||'').toLowerCase());
 const server=http.createServer(async(req,res)=>{
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  try{
   if(!hostOk(req))return send(421,{error:'This service answers only on its loopback address.'});
   if(req.headers.origin)return send(403,{error:'Browsers cannot call the repository service; the AIW server does.'});
   if(!authorised(req))return send(401,{error:'A valid service token is required.'});
   const url=new URL(req.url,'http://127.0.0.1'),q=k=>url.searchParams.get(k);let m;
   if(req.method==='GET'){
    if(url.pathname==='/v1/status')return send(200,{...reader.status(),signing:key?{keyId:key.keyId,publicKey:key.publicKey,purpose:'notices-only'}:null});
    if(url.pathname==='/v1/search')return send(200,await reader.search({q:q('q'),connector:q('connector'),concept:q('concept'),retrievable:q('retrievable')==='1',page:Number(q('page'))||1,mode:q('mode')==='any'?'any':'all'}));
    if((m=/^\/v1\/passages\/(passage-[a-f0-9]{32})$/.exec(url.pathname))){const p=await reader.passage(m[1]);return p?send(200,p):send(404,{error:'No such passage.'});}
    if((m=/^\/v1\/revisions\/(revision-[a-f0-9]{32})$/.exec(url.pathname))){const r=reader.revision(m[1]);return r?send(200,r):send(404,{error:'No such revision.'});}
    if((m=/^\/v1\/revisions\/(revision-[a-f0-9]{32})\/original$/.exec(url.pathname))){const o=await reader.original(m[1]);log({event:'original',revisionId:m[1],status:o.status});return o.status===200?send(200,o.body):send(o.status,{error:o.error,reason:o.reason});}
    if(url.pathname==='/v1/concepts')return send(200,{concepts:reader.concepts(q('q')||'')});
    if(url.pathname==='/v1/notices')return send(200,{storeId:reader.store.storeId,cursor:reader.store.cursor(),notices:reader.notices(Number(q('from'))||0,500)});
   }
   if(req.method==='POST'&&(url.pathname==='/v1/sync'||url.pathname==='/v1/packets')){
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(415,{error:'Expected JSON.'});
    const input=JSON.parse(await readBody(req,65536));
    const out=url.pathname==='/v1/sync'?signedNoticeUpdate(reader,input,key):candidatePacket(reader,input);
    log({event:url.pathname==='/v1/sync'?'sync':'packet',projectId:input.projectId,fromCursor:input.fromCursor,notices:out.notices?.length});
    return send(200,out);
   }
   return send(404,{error:'Route not found.'});
  }catch(e){const status=e.status||(e instanceof SyntaxError?400:500);return send(status,{error:status===500?'The repository service could not complete the request.':e.message});}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{bound=server.address().port;resolve();});});
 server.on('close',()=>reader.close());
 return {server,port:bound,url:`http://${host==='::1'?'[::1]':host}:${bound}`,close:()=>new Promise(r=>server.close(()=>r()))};
}
