import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),pkg=JSON.parse(await readFile('package.json','utf8'));
const scripts=Object.entries(pkg.scripts).filter(([name])=>name==='test'||name.startsWith('test:')&&!['test:browser'].includes(name));
const results=[],queue=[...scripts];
await Promise.all(Array.from({length:3},async()=>{while(queue.length){const [name,cmd]=queue.shift(),start=Date.now();try{const {stdout,stderr}=await exec(process.execPath,[cmd.replace(/^node /,'')],{timeout:180000,maxBuffer:4000000});results.push({name,status:'passed',ms:Date.now()-start});}catch(e){results.push({name,status:'failed',ms:Date.now()-start,error:(e.stderr||e.stdout||e.message).slice(0,2600)});}}}));
results.sort((a,b)=>a.name.localeCompare(b.name));await writeFile(process.env.AIW_REPORT||'/tmp/aiw-release-regressions.json',JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status!=='passed')},null,2));
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
