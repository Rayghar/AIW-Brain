// Browser journey for a signed, project-scoped transfer of a synthetic original.
// No acquired third-party text or release authority is involved.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {generateKeyPairSync} from 'node:crypto';
import {rm} from 'node:fs/promises';
import net from 'node:net';
import {createFixture,texts} from './repository-service/fixture.mjs';
import {buildStore} from './repository-service/build.js';
import {openReader} from './repository-service/reader.js';
import {keyInfo} from './repository-service/sync.js';
import {signedSourceTransfer} from './repository-service/transfer.js';

const require=createRequire(import.meta.url),{chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const fixture=await createFixture('aiw-transfer-browser-');
await buildStore(fixture.config);
const reader=openReader(fixture.config),pair=generateKeyPairSync('ed25519'),key={...keyInfo(pair.privateKey),privateKey:pair.privateKey};
const revisionId=(await reader.search({q:'Circuit Breaker',retrievable:true})).results[0].revision.revisionId;
const port=await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const db='.aiw-local/transfer-browser-'+port+'.sqlite',base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,AIW_REPOSITORY_NOTICE_KEYS:JSON.stringify({[key.keyId]:key.publicKey})},stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('ready'))resolve();});server.on('exit',code=>reject(Error('server exited '+code)));});
 browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
 const page=await (await browser.newContext({viewport:{width:1280,height:850}})).newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?chapter=1&tab=work',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>!!window.aiwKnowledge&&!!window.aiwProjectStore);
 const scope=await (await page.request.get(base+'/api/knowledge/repository-packet')).json();
 assert.equal(scope.readOnly,true);
 const bundle=await signedSourceTransfer(reader,{tenantId:scope.tenantId,projectId:scope.projectId,revisionIds:[revisionId],purpose:'Evaluate queue protection patterns in this private architecture project.',rightsAcknowledged:true},key);
 await page.evaluate(()=>window.aiwKnowledge.openView('sources'));
 await page.waitForSelector('#brain-panel [data-view="sources"][aria-pressed="true"]');
 const transfer=page.locator('#brain-panel details.kw-offline').filter({has:page.locator('summary', {hasText:'Transfer selected originals'})});
 await transfer.locator('summary').click();
 await transfer.locator('[data-k-action="source-transfer-scope"]').click();
 await page.waitForFunction(()=>document.querySelector('#brain-panel .kw-offline')?.innerText.includes('--tenant'));
 assert.match(await transfer.innerText(),new RegExp('--tenant '+scope.tenantId+' --project '+scope.projectId));
 await transfer.locator('[data-k-source-transfer]').setInputFiles({name:'private-transfer.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
 await page.waitForSelector('#brain-panel [data-k-transfer-confirm]',{timeout:15000});
 assert.match(await transfer.innerText(),/1 unreviewed original/);
 assert.doesNotMatch(await transfer.innerText(),/A queue protects a slow dependency/);
 await transfer.locator('[data-k-transfer-confirm]').check();
 await transfer.locator('[data-k-action="source-transfer"]').click();
 await page.waitForFunction(()=>window.aiwProjectStore.value.document.knowledge?.sources?.some(s=>s.acquisition?.transport==='signed-transfer'),null,{timeout:15000});
 const source=await page.evaluate(()=>window.aiwProjectStore.value.document.knowledge.sources.find(s=>s.acquisition?.transport==='signed-transfer'));
 assert.equal(source.body,texts.queueGuard);assert.equal(source.acquisition.importerReview.actor,scope.tenantId);
 assert.match(await page.locator('#brain-panel .kw-source').textContent(),/Signed source transfer · unreviewed/);
 assert.equal((await page.evaluate(()=>window.aiwProjectStore.value.document.knowledge.claims)).length,0);
 await page.goto(base+'/?chapter=1&tab=work&resources=knowledge',{waitUntil:'networkidle'});
 await page.waitForSelector('.dr-dialog[open] .dr-body');
 assert.match(await page.locator('.dr-body').innerText(),/1\s+Originals in this project[\s\S]*0\s+Eligible signed repository claims[\s\S]*Guarding a work queue/);
 assert.deepEqual(errors,[]);
 console.log('PASS browser: authenticated scope → signed preview → rights confirmation → exact original saved unreviewed → resource posture 1 original/0 eligible claims → no page errors');
}finally{
 await browser?.close();server.kill();reader.close();await rm(fixture.root,{recursive:true,force:true});await rm(db,{force:true});await rm(db+'-wal',{force:true});await rm(db+'-shm',{force:true});
}
