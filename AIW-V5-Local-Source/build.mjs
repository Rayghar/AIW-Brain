import './scripts/verify-reasoning-instructions.mjs';
import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {bundleClient} from './client-bundle.mjs';
import path from 'node:path';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server/public',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
// The browser client is the production bundle (client-bundle.mjs), not a copy of the source modules.
const client=await bundleClient('dist/client');
// The Worker package follows the import graph (round 2): every server module and, recursively, every relative module
// it imports (static imports, re-exports and literal dynamic imports) is copied with its path, so a module a domain
// starts to import is packaged without a hand-kept list. The packaged import check below fails on anything missed.
const IMPORTS=/(?:^|[\s;{}()])(?:import|export)\s*(?:[\w*${},\s]*?from\s*)?['"](\.{1,2}\/[^'"]+\.m?js)['"]|\bimport\(\s*['"](\.{1,2}\/[^'"]+\.m?js)['"]\s*\)/g;
async function copyImportGraph(entries){
 const seen=new Set(),queue=[...entries];
 while(queue.length){
  const file=path.normalize(queue.shift());if(seen.has(file))continue;seen.add(file);
  const source=await readFile(file,'utf8');await mkdir(path.dirname(path.join('dist/server',file)),{recursive:true});await cp(file,path.join('dist/server',file));
  for(const m of source.matchAll(IMPORTS))queue.push(path.join(path.dirname(file),m[1]||m[2]));
 }
 return seen;
}
const serverModules=await copyImportGraph(['worker.js','security-headers.js','retention.js']);
// A package a server module imports by name (round 5: the Anthropic SDK, intelligence-anthropic.js) is bundled once
// into vendor/ for a fetch-only runtime (no Node built-ins: the package's browser substitutes) and the import is
// rewritten to that file, so the Worker package carries no bare import. Only the packages named here are vendored;
// any other bare import fails the build.
const VENDORED={'@anthropic-ai/sdk':'vendor/anthropic-sdk.js'};
// Static imports start a line in the source modules. A looser expression also matched string literals such
// as `authorKind==='import'?'…'` and treated punctuation in that text as an unvendored package.
const BARE=/(^\s*(?:import|export)\s*(?:[\w*${},\s]*?from\s*)?['"])([^'".][^'"]*)(['"])|(\bimport\(\s*['"])([^'".][^'"]*)(['"]\s*\))/gm;
const vendored=new Map();
async function vendor(name){
 if(name.startsWith('node:'))throw Error(`A server module imports ${name}; the Worker has no Node built-ins.`);
 if(!VENDORED[name])throw Error(`A server module imports the package ${name}, which the Worker package does not vendor.`);
 if(!vendored.has(name)){
  const {build}=await import('esbuild'),out=path.join('dist/server',VENDORED[name]);
  const result=await build({stdin:{contents:`export * from '${name}';export {default} from '${name}';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof',logLevel:'error',metafile:true,outfile:out});
  // Every package the bundle took code from is named with its version and licence, and its licence text kept.
  const packages=[...new Set(Object.keys(result.metafile.inputs).map(k=>k.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//)?.[1]).filter(Boolean))].sort();
  const notices=await Promise.all(packages.map(async p=>{const j=JSON.parse(await readFile(path.join('node_modules',p,'package.json'),'utf8')),text=await readFile(path.join('node_modules',p,'LICENSE'),'utf8').catch(()=>'');return `${p} ${j.version} (${j.license||'see package'})${text?'\n'+text.trim():''}`;}));
  await writeFile(out,`/*! Bundled for the Worker by build.mjs from ${name}; it contains code from:\n\n${notices.join('\n\n').replace(/\*\//g,'* /')}\n*/\n`+await readFile(out,'utf8'));
  vendored.set(name,JSON.parse(await readFile(path.join('node_modules',name,'package.json'),'utf8')).version);
 }
}
for(const file of serverModules){
 const target=path.join('dist/server',file),source=await readFile(target,'utf8'),names=[...source.matchAll(BARE)].map(m=>m[2]||m[5]);
 if(!names.length)continue;
 for(const name of names)await vendor(name);
 const to=name=>{const r=path.relative(path.dirname(target),path.join('dist/server',VENDORED[name])).split(path.sep).join('/');return r.startsWith('.')?r:'./'+r;};
 await writeFile(target,source.replace(BARE,(all,a,name,b,c,dynamic,d)=>name?a+to(name)+b:c+to(dynamic)+d));
}
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.woff2':'font/woff2'};
// Each asset carries a build-time ETag, so browsers revalidate rather than re-download unchanged files. Assets are
// embedded gzip-compressed (round 2, B2-15): the module the Worker parses at a cold start is a third of the size, a
// browser that accepts gzip receives the stored bytes as they are, and any other client gets them decompressed.
const assets={},sources={};let plainBytes=0;for(const file of await readdir('dist/client',{recursive:true})){const name=String(file).split(path.sep).join('/');if(!mime[path.extname(name)])continue;const body=await readFile('dist/client/'+name);plainBytes+=body.length;sources['/'+name]=body;assets['/'+name]={type:mime[path.extname(name)],etag:'"'+createHash('sha256').update(body).digest('base64url').slice(0,27)+'"',immutable:name.startsWith('assets/'),bytes:body.length,gzip:gzipSync(body,{level:9}).toString('base64')}}
const assetModule='export default '+JSON.stringify(assets)+';\n';
await writeFile('dist/server/assets.js',assetModule);
// The hosted Worker serves the app page with the same security headers as the local server (security-headers.js).
await writeFile('dist/server/index.js',`import worker from './worker.js';
import assets from './assets.js';
import {APP_SECURITY_HEADERS} from './security-headers.js';
import {runRetention, retentionPolicy, retentionChanged} from './retention.js';
import {processDraftingQueue} from './drafting-service.js';

// The stored gzip bytes, decoded from the module once per asset and kept for the isolate's lifetime.
const decoded = new Map();
const gzipBytes = (name, asset) => { let bytes = decoded.get(name); if (!bytes) { const binary = atob(asset.gzip); bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); decoded.set(name, bytes); } return bytes; };
function serveAsset(req) {
  const url = new URL(req.url), name = url.pathname === '/' ? '/index.html' : url.pathname;
  const asset = assets[name];
  if (!asset) return new Response('Not found', {status: 404, headers: {'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff'}});
  // Content-hashed bundle files never change under their name; the page itself is always revalidated. The two
  // encodings are two representations, so each has its own validator.
  const gzip = /\\bgzip\\b/.test(req.headers.get('accept-encoding') || ''), etag = gzip ? asset.etag.slice(0, -1) + '-gz"' : asset.etag;
  const headers = {'Cache-Control': asset.immutable ? 'public, max-age=31536000, immutable' : 'no-cache', ETag: etag, Vary: 'Accept-Encoding', ...APP_SECURITY_HEADERS};
  if (req.headers.get('if-none-match') === etag) return new Response(null, {status: 304, headers});
  if (req.method === 'HEAD') return new Response(null, {headers: {'Content-Type': asset.type, ...headers}});
  const bytes = gzipBytes(name, asset);
  // encodeBody "manual": the bytes are already gzip; the runtime must send them as they are.
  if (gzip) return new Response(bytes, {headers: {'Content-Type': asset.type, 'Content-Encoding': 'gzip', ...headers}, encodeBody: 'manual'});
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')), {headers: {'Content-Type': asset.type, ...headers}});
}

export default {
  fetch(request, env, ctx) { return worker.fetch(request, {...env, ASSETS: {fetch: serveAsset}}, ctx); },
  // The platform's recurring trigger consumes one bounded drafting slice and applies the retention policy.
  // A browser session is not involved; every claim is fenced by its durable lease and original receipt.
  async scheduled(event, env, ctx) { const run = (async () => { try { const draft = await processDraftingQueue(env, {maxJobs: 1}); if (draft.dispatched) console.log(JSON.stringify({event: 'drafting-queue', trigger: 'scheduled', ...draft})); } catch (e) { console.error(JSON.stringify({event: 'drafting-queue-error', trigger: 'scheduled', message: String(e?.message || e)})); } const result = await runRetention(env, retentionPolicy(env)); if (retentionChanged(result)) console.log(JSON.stringify({event: 'retention', trigger: 'scheduled', ...result})); })(); if (ctx?.waitUntil) ctx.waitUntil(run); else await run; },
};
`);
// Resolve the packaged entry and its full import graph before a version can publish.
const packaged=await import('./dist/server/index.js');
if(typeof packaged.default?.fetch!=='function')throw Error('The packaged Worker has no fetch handler.');
if(typeof packaged.default?.scheduled!=='function')throw Error('The packaged Worker has no scheduled handler.');
// The vendored packages resolve inside the package (the provider module that imports the SDK is loaded on first use).
if(vendored.has('@anthropic-ai/sdk')&&typeof (await import('./dist/server/intelligence-anthropic.js')).anthropicCall!=='function')throw Error('The packaged Anthropic provider does not load.');
// Every embedded asset is served back byte for byte, gzip-encoded to a client that accepts it and plain otherwise.
for(const [name,body] of Object.entries(sources)){
 const fetchAsset=headers=>packaged.default.fetch(new Request('https://aiw.example'+name,{headers}),{});
 const zipped=await fetchAsset({'accept-encoding':'gzip, br'});if(zipped.headers.get('content-encoding')!=='gzip'||!gunzipSync(Buffer.from(await zipped.arrayBuffer())).equals(body))throw Error('The packaged Worker does not serve '+name+' gzip-encoded.');
 const plain=await fetchAsset({});if(plain.headers.get('content-encoding')||!Buffer.from(await plain.arrayBuffer()).equals(body))throw Error('The packaged Worker does not serve '+name+' plain.');
 if((await fetchAsset({'accept-encoding':'gzip','if-none-match':zipped.headers.get('etag')})).status!==304)throw Error('The packaged Worker does not revalidate '+name+'.');
}
const moduleBytes=Buffer.byteLength(assetModule);
console.log(`Built private project Worker, static assets, and D1 migrations; ${serverModules.size} server modules from the import graph${vendored.size?`, ${[...vendored].map(([n,v])=>n+' '+v).join(', ')} vendored`:''}; packaged imports and asset serving verified. Client: ${client.scripts} script files and one stylesheet (from ${client.stylesheets}); entry ${client.entry}. Embedded assets: ${(plainBytes/1048576).toFixed(2)} MB in a ${(moduleBytes/1048576).toFixed(2)} MB gzip module.`);
