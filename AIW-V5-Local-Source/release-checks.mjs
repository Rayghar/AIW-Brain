import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const scripts=Object.entries(pkg.scripts).filter(([name])=>name==='test'||name.startsWith('test:')&&!['test:browser'].includes(name));
const results=[],queue=[...scripts];
// Slower workstations (e.g. Windows laptops running Chromium suites) may need more time or less concurrency.
const timeout=Number(process.env.AIW_REGRESSION_TIMEOUT_MS)||180000,workers=Math.max(1,Number(process.env.AIW_REGRESSION_CONCURRENCY)||3);
// A timed-out suite must not leave its local server or browser running: end the whole process tree.
const stopTree=child=>{if(process.platform==='win32')spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill('SIGKILL');};
// The report path belongs to the runner: suites that also honour AIW_REPORT would overwrite it mid-run.
const childEnv={...process.env};delete childEnv.AIW_REPORT;
function run(file){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[file],{env:childEnv,stdio:['ignore','pipe','pipe']});let out='',err='',timedOut=false;child.stdout.on('data',d=>{if(out.length<4000000)out+=d;});child.stderr.on('data',d=>{if(err.length<4000000)err+=d;});const timer=setTimeout(()=>{timedOut=true;stopTree(child);},timeout);child.on('close',code=>{clearTimeout(timer);code===0&&!timedOut?resolve():reject(Object.assign(Error((timedOut?'Timed out after '+timeout+' ms: ':'Command failed: ')+file),{stdout:out,stderr:err}));});});}
await Promise.all(Array.from({length:workers},async()=>{while(queue.length){const [name,cmd]=queue.shift(),start=Date.now();try{await run(cmd.replace(/^node /,''));results.push({name,status:'passed',ms:Date.now()-start});}catch(e){results.push({name,status:'failed',ms:Date.now()-start,error:(e.message+'\n'+(e.stderr||e.stdout||'')).slice(0,2600)});}}}));
results.sort((a,b)=>a.name.localeCompare(b.name));await writeFile(process.env.AIW_REPORT||'/tmp/aiw-release-regressions.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status!=='passed')},null,2));
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
