import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
process.env.PORT=process.env.AIW_TEST_PORT||'8874';
const {server}=await import('./server.js');
if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const output=process.env.AIW_TEST_OUTPUT;
await fs.mkdir(output,{recursive:true});
const packet=JSON.parse(await fs.readFile(process.env.AIW_PACKET_PATH,'utf8'));
packet.tenantId='local-architect';packet.projectId='bank-payment';
const checks=[],errors=[];
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/?project=bank-payment&chapter=1');
 await page.waitForFunction(()=>document.body.innerText.length>200);
 checks.push('v44 application renders in Chromium');
 const before=await (await page.request.get(origin+'/api/project?project=bank-payment')).json();
 const post=(data,requestOrigin=origin)=>page.request.post(origin+'/api/knowledge/repository-packet?project=bank-payment',{headers:{Origin:requestOrigin},data});
 const response=await post(packet);assert.equal(response.status(),200,await response.text());
 const preview=await response.json();assert.equal(preview.counts.sources,24);assert.equal(preview.readOnly,true);assert.equal(preview.activation.allowed,false);
 checks.push('authenticated actual pilot preview returns 24 source locators');
 assert(preview.locators.every(x=>x.command?.type==='knowledge.fetch'));checks.push('preview maps sources to existing governed fetch commands');
 assert.equal((await post({...packet,tenantId:'other'})).status(),400);checks.push('tenant mismatch rejected over HTTP');
 assert.equal((await post(packet,'https://untrusted.example')).status(),403);checks.push('cross-origin submission rejected');
 const injected=structuredClone(packet);injected.sources[0].body='untrusted source text';assert.equal((await post(injected)).status(),400);checks.push('original text injection rejected');
 const after=await (await page.request.get(origin+'/api/project?project=bank-payment')).json();assert.deepEqual(after,before);checks.push('preview leaves the saved project unchanged');
 await page.screenshot({path:output+'/v44-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/v44-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);checks.push('no browser page errors');
 await fs.writeFile(output+'/browser-results.json',JSON.stringify({passed:checks.length,failed:0,checks,cloudDeployed:false},null,2));
 console.log(JSON.stringify({passed:checks.length,failed:0,checks}));
}catch(error){await fs.writeFile(output+'/browser-results.json',JSON.stringify({passed:checks.length,failed:1,checks,error:error.message},null,2));throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
