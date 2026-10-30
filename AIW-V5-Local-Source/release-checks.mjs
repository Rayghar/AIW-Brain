import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const scripts=Object.entries(pkg.scripts).filter(([name])=>name==='test'||name.startsWith('test:'));
const results=[],queue=[...scripts];
// Slower workstations (e.g. Windows laptops running Chromium suites) may need more time or less concurrency.
const timeout=Number(process.env.AIW_REGRESSION_TIMEOUT_MS)||360000,workers=Math.max(1,Number(process.env.AIW_REGRESSION_CONCURRENCY)||3);
// A timed-out or crashed suite must not leave its local server or browser running, and an orphan must not stall the run:
// each suite runs in its own process group (POSIX) so the whole tree can be ended, and a suite is settled on its own exit
// rather than when every inherited pipe closes (a server a dead suite left behind would otherwise hold the pipe open for ever).
const detached=process.platform!=='win32';
const stopTree=child=>{try{if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});else process.kill(-child.pid,'SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}};
const active=new Set();
// A suite that measures budgets against the machine (EXCLUSIVE) runs with the machine to itself: once it is next, the
// other workers finish what they run and wait while it runs, so a browser suite's load never counts against a budget.
// test:notation-layout times each chapter's Layers layout against its control and a 900 ms bound (rc41 close: it failed by 3 ms
// beside two browser suites and passes alone).
// test:sdd-size builds the SDD editions cold against a 2 s bound (2026-10-30: 2,083 ms beside two browser suites; passes alone).
const EXCLUSIVE=new Set(['test:scale','test:size-speed','test:baseline-size','test:recovery-size','test:notation-layout','test:sdd-size']);
let running=0,wanted=0,exclusive=false;const waiters=[];
const claim=ex=>new Promise(res=>{if(ex)wanted++;const tryClaim=()=>{if(ex?running===0:(!wanted&&!exclusive)){running++;if(ex){wanted--;exclusive=true;}res();return true;}return false;};if(!tryClaim())waiters.push(tryClaim);});
const release=ex=>{running--;if(ex)exclusive=false;for(const w of waiters.splice(0))if(!w())waiters.push(w);};
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const child of active)stopTree(child);process.exit(130);});
// The report path belongs to the runner: suites that also honour AIW_REPORT would overwrite it mid-run.
// Suites start their own servers: the provider is the one each suite configures, never the shell's keys (round 5).
const childEnv={...process.env};for(const k of ['AIW_REPORT','ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','AIW_LLM_PROVIDER'])delete childEnv[k];
function run(args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env:childEnv,stdio:['ignore','pipe','pipe'],detached});active.add(child);let out='',err='',timedOut=false,settled=false;child.stdout.on('data',d=>{if(out.length<4000000)out+=d;});child.stderr.on('data',d=>{if(err.length<4000000)err+=d;});const timer=setTimeout(()=>{timedOut=true;stopTree(child);},timeout);// Settle on exit, end whatever the suite left running, then give the pipes a moment to deliver trailing output.
const settle=code=>{if(settled)return;settled=true;clearTimeout(timer);active.delete(child);stopTree(child);setTimeout(()=>{code===0&&!timedOut?resolve():reject(Object.assign(Error((timedOut?'Timed out after '+timeout+' ms: ':'Command failed: ')+args.join(' ')),{stdout:out,stderr:err}));},100);};child.on('error',e=>{err+=String(e?.message||e);settle(1);});child.on('exit',code=>settle(code??1));});}
// A script is one or more `node file [arguments]` commands joined by &&, run in turn.
async function runScript(cmd){for(const part of cmd.split('&&')){const [bin,...args]=part.trim().split(/\s+/);if(bin!=='node')throw Error('Only node scripts run here: '+part.trim());await run(args);}}
await Promise.all(Array.from({length:workers},async()=>{while(queue.length){const [name,cmd]=queue.shift(),ex=EXCLUSIVE.has(name);await claim(ex);const start=Date.now();try{await runScript(cmd);results.push({name,status:'passed',ms:Date.now()-start});}catch(e){results.push({name,status:'failed',ms:Date.now()-start,error:(e.message+'\n'+(e.stderr||e.stdout||'')).slice(0,2600)});}finally{release(ex);}}}));
results.sort((a,b)=>a.name.localeCompare(b.name));await writeFile(process.env.AIW_REPORT||'/tmp/aiw-release-regressions.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status!=='passed')},null,2));
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
