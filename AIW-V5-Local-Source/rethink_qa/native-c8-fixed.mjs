// Regression: native interface proposals remain reviewable in the shared Data flow view.
// Required: AIW_QA_FIXTURE is a closed/checkpointed fixture directory containing
// project.sqlite + stored-objects; AIW_QA_PROJECT_ID identifies its authored project.
// Optional: AIW_QA_CLIENT (defaults to dist/client), AIW_QA_OUTPUT (defaults to
// the system scratch directory), AIW_BROWSER_EXECUTABLE (otherwise Playwright Chromium).
// The fixture is copied before launch. No approval or saved design change is performed.
import {spawn} from 'node:child_process';
import {mkdir,cp,writeFile,readFile,stat} from 'node:fs/promises';
import net from 'node:net';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const fixture=process.env.AIW_QA_FIXTURE && resolve(process.env.AIW_QA_FIXTURE);
const project=process.env.AIW_QA_PROJECT_ID?.trim();
if(!fixture||!project)throw Error('Set AIW_QA_FIXTURE and AIW_QA_PROJECT_ID. The fixture must be closed and checkpointed.');
const database=join(fixture,'project.sqlite'),objects=join(fixture,'stored-objects');
if(!(await stat(database)).isFile()||!(await stat(objects)).isDirectory())throw Error('AIW_QA_FIXTURE must contain project.sqlite and stored-objects.');
const wal=await stat(database+'-wal').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(wal?.size)throw Error('Fixture has a nonempty SQLite WAL. Close and checkpoint its database before copying it.');
const client=resolve(process.env.AIW_QA_CLIENT||join(root,'dist/client'));
const qa=resolve(process.env.AIW_QA_OUTPUT||join(tmpdir(),'aiw-qa'));
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),dir=join(qa,'native-c8-fixed-'+stamp);
const index=await readFile(join(client,'index.html'),'utf8');
const entry=index.match(/(?:src=["'])([^"']*app-[^"']+\.js)["']/)?.[1];
const entryPath=entry?join(client,entry.replace(/^\//,'')):null;
const result={stamp,dir,project,fixture,clientPath:client,build:entry?.split('/').pop(),clientEntrySHA256:entryPath?createHash('sha256').update(await readFile(entryPath)).digest('hex'):null,authority:'Isolated fixture copy; local proposal review/cancel/dismiss only; no external approval or provider request.',actions:[],families:[],errors:[],requestFailures:[],posts:[]};
await mkdir(dir,{recursive:true});await cp(database,join(dir,'project.sqlite'));await cp(objects,join(dir,'stored-objects'),{recursive:true});
const port=await new Promise((accept,reject)=>{const socket=net.createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const freePort=socket.address().port;socket.close(error=>error?reject(error):accept(freePort));});});
const base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.js','--port',String(port),'--client',client],{cwd:root,env:{...process.env,AIW_LOCAL_DB:join(dir,'project.sqlite'),AIW_LOCAL_FILES:join(dir,'stored-objects'),OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',GEMINI_API_KEY:''},stdio:['ignore','pipe','pipe']});
let logs='',browser,page;
const serverExited=new Promise(accept=>{server.once('exit',(code,signal)=>accept({code,signal}));server.once('error',error=>accept({error:error.message}));});
server.stderr.on('data',chunk=>{logs+=chunk;});
const killOnExit=()=>{if(server.exitCode===null&&server.signalCode===null)server.kill('SIGKILL');};
process.once('exit',killOnExit);
async function stopServer(){
 if(server.exitCode!==null||server.signalCode!==null)return;
 server.kill('SIGTERM');
 const force=setTimeout(()=>server.kill('SIGKILL'),5000);
 try{await serverExited;}finally{clearTimeout(force);}
}
async function waitForReady(){
 await new Promise((accept,reject)=>{
  const timeout=setTimeout(()=>finish(Error('Server startup timed out: '+logs)),20000);
  const onData=chunk=>{logs+=chunk;if(logs.includes('ready'))finish();};
  const onExit=code=>finish(Error('Server exited during startup: '+code+' '+logs));
  const onError=error=>finish(error);
  function finish(error){clearTimeout(timeout);server.stdout.off('data',onData);server.off('exit',onExit);server.off('error',onError);error?reject(error):accept();}
  server.stdout.on('data',onData);server.once('exit',onExit);server.once('error',onError);
 });
}
const visible=s=>page.locator(s).filter({visible:true}).first();
async function save(){await writeFile(dir+'/results.json',JSON.stringify(result,null,2));}
async function click(s){const l=visible(s);if(!await l.count())return false;if(!await l.isEnabled()){result.actions.push({chapter:new URL(page.url()).searchParams.get('chapter'),selector:s,outcome:'disabled'});return false;}const attrs=await l.evaluate(e=>Object.fromEntries([...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])));const tag=await l.evaluate(e=>e.tagName);const label=(await l.innerText()).trim().replace(/\s+/g,' ').slice(0,120);await l.click();await page.waitForTimeout(100);result.actions.push({chapter:new URL(page.url()).searchParams.get('chapter'),tab:new URL(page.url()).searchParams.get('tab'),selector:s,tag,attributes:attrs,label,outcome:'clicked'});return true;}
async function go(ch,tab='work',section=''){await page.goto(base+'/?'+new URLSearchParams({project,chapter:String(ch),tab,...(section?{section}:{})}),{waitUntil:'domcontentloaded'});await page.locator('#tab-'+tab).waitFor();await page.waitForFunction(()=>!!window.aiwProjectStore?.value?.document);}
async function doc(){return page.evaluate(()=>JSON.stringify(window.aiwProjectStore.value.document));}
async function close(){if(await visible('#brain-panel [data-brain-action="close"]').count())await click('#brain-panel [data-brain-action="close"]');await page.keyboard.press('Escape');for(const p of ['l','a','t','tr','i','sec','rt','rv'])if(await visible('dialog[open] [data-'+p+'-action="discard"]').count())await click('dialog[open] [data-'+p+'-action="discard"]');}
async function attempt(family,fn){const row={family,status:'running'};result.families.push(row);try{await fn(row);if(row.status==='running')row.status='passed';}catch(e){row.status='failed';row.error=e.message.split('\n')[0];row.url=page.url();row.visibleControls=await page.locator('button').evaluateAll(es=>es.filter(e=>e.checkVisibility()).map(e=>({text:e.textContent.trim().slice(0,90),attrs:Object.fromEntries([...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]))}))).catch(()=>[]);await page.screenshot({path:dir+'/failure-'+result.families.length+'.png',fullPage:true}).catch(()=>{});await close();}console.log(row.status.toUpperCase(),family,row.reason||row.error||'');await save();}

try{
 await waitForReady();
 browser=await chromium.launch({...(process.env.AIW_BROWSER_EXECUTABLE?{executablePath:resolve(process.env.AIW_BROWSER_EXECUTABLE)}:{}),headless:true,args:['--no-sandbox','--no-zygote','--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(4000);
 page.on('pageerror',error=>result.errors.push(error.message));
 page.on('requestfailed',request=>result.requestFailures.push({url:request.url(),error:request.failure()?.errorText}));
 page.on('request',request=>{if(request.method()==='POST')result.posts.push({url:request.url(),body:request.postData()?.slice(0,300)});});
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort('blockedbyclient'));
 await go(8);const before=await doc();result.beforeHash=createHash('sha256').update(before).digest('hex');
 async function mind(ch){await go(ch);await click('[data-workspace-sol]');await click('#brain-panel [data-brain-action="mind"]');}
 async function rules(ch){await mind(ch);await click('#brain-panel [data-brain-suggestions] > summary');await page.locator('#brain-panel [data-proposals-summary]').waitFor();await click('#brain-panel .pp-advanced > summary');await click('#brain-panel .pp-source-filter > summary');await click('#brain-panel [data-proposal-act="scope"][data-scope="all"]');await click('#brain-panel [data-proposal-act="filter"][data-source="rule"]');}
 await attempt('C8 native proposal in Data flow: review, cancel and dismiss',async row=>{
  await rules(8);
  if(!await click('#brain-panel [data-i-action="ghost"][data-i-key="reference"]'))throw Error('Native reference proposal action absent');
  await click('#brain-panel [data-brain-action="close"]');
  await page.waitForFunction(()=>!!window.aiwLogicalStudio?.proposal);
  row.preview={url:page.url(),hasProposal:await page.evaluate(()=>!!window.aiwLogicalStudio?.proposal)};
  if(new URL(page.url()).searchParams.get('model')!=='data'){
   if(!await click('[data-ex="view"][data-id="data"]'))throw Error('Cannot select Data flow view');
  }
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('model')==='data');
  row.dataView=true;row.panelBefore=await page.evaluate(()=>document.body.dataset.panel);
  if(row.panelBefore!=='open')if(!await click('.workspace-tools [data-panel-toggle]'))throw Error('Details open action absent');
  await visible('#inspector [data-i-action="edit-ghost"]').waitFor();
  row.nativeReviewVisible=true;
  if(!await click('#inspector [data-i-action="edit-ghost"]'))throw Error('Native review action not clickable');
  await page.locator('dialog[open] #i-editor').waitFor();row.editorOpened=true;
  await page.screenshot({path:dir+'/proposal-editor.png',fullPage:true});
  if(!await click('dialog[open] [data-i-action="close"]'))throw Error('Cancel action absent');
  await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  row.cancelRetainsProposal=await page.evaluate(()=>!!window.aiwLogicalStudio?.proposal);
  if(!row.cancelRetainsProposal)throw Error('Cancel unexpectedly discarded preview');
  if(!await click('#inspector [data-i-action="dismiss"]'))throw Error('Native dismiss action absent');
  await page.waitForFunction(()=>!window.aiwLogicalStudio?.proposal);
  row.dismissed=true;row.projectUnchanged=(await doc())===before;
  if(!row.projectUnchanged)throw Error('Preview/cancel/dismiss changed saved project');
  row.finalURL=page.url();await page.screenshot({path:dir+'/dismissed.png',fullPage:true});
 });
 const after=await doc();result.afterHash=createHash('sha256').update(after).digest('hex');result.projectUnchanged=after===before;result.summary={families:result.families.length,passed:result.families.filter(x=>x.status==='passed').length,unavailable:result.families.filter(x=>x.status==='unavailable').length,failed:result.families.filter(x=>x.status==='failed').length,actualClicks:result.actions.filter(x=>x.outcome==='clicked').length,errors:result.errors.length};await save();console.log(JSON.stringify({dir,summary:result.summary,projectUnchanged:result.projectUnchanged}));if(result.summary.failed||result.errors.length||!result.projectUnchanged)process.exitCode=1;
}finally{
 try{await save();}finally{
  try{await browser?.close();}finally{await stopServer();process.off('exit',killOnExit);}
 }
}
