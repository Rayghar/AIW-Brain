import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {savedRecordSubject} from './public/shell-record-subject.js';
process.env.PORT=String(await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});}));
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aiw-work-route-'));process.env.AIW_LOCAL_DB=path.join(dir,'project.sqlite');process.env.OPENAI_API_KEY='';process.env.ANTHROPIC_API_KEY='';
const {server}=await import('./server.js');const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
const results=[],errors=[],base='http://127.0.0.1:'+process.env.PORT;
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/?chapter=4&tab=model&model=table',{waitUntil:'networkidle'});
const p=await page.evaluate(()=>window.aiwProjectStore.value.document);
const cases=[
{type:'actor',chapter:1,record:p.artefacts.find(x=>x.type==='actor'),section:'context',edit:'[data-r-edit]',form:'#r-artefact-form',field:'title'},
{type:'group',chapter:4,record:p.logical.groups[0],section:'groups',edit:'[data-l-action="edit-group"]',form:'#l-group-form',field:'title'},
{type:'need',chapter:6,record:p.technology.needs[0],section:'needs',edit:'[data-t-action="needs"]',form:'#t-needs-form'},
{type:'boundary',chapter:6,record:p.technology.boundaries[0],section:'dependencies',edit:'[data-t-action="boundary"]',form:'#t-boundary-form',field:'title'},
{type:'party',chapter:8,record:p.interfaces.parties[0],section:'parties',edit:'[data-i-action="party"]',form:'#i-party-form',field:'title'},
{type:'zone',chapter:10,record:p.runtime.zones[0],section:'placement',edit:'[data-rt-action="zone"]',form:'#rt-zone-form',field:'title'},
{type:'placement',chapter:10,record:p.runtime.placements[0],section:'placement',edit:'[data-rt-action="placement"]',form:'#rt-placement-form',field:'zoneId'},
{type:'path',chapter:10,record:p.runtime.paths[0],section:'operate',edit:'[data-rt-action="path"]',form:'#rt-path-form',field:'contractId'},
];
for(const c of cases){assert.ok(c.record,c.type+' fixture exists');assert.equal(savedRecordSubject(p,c.chapter,c.record.id)?.id,c.record.id);assert.equal(savedRecordSubject(p,c.chapter+1,c.record.id),null);
await page.evaluate(href=>window.aiwRoute(href),`/?chapter=${c.chapter}&tab=model&model=table`);await page.locator(`[data-nt-row="${c.record.id}"]`).click();
await page.locator('#inspector [data-cm-open-work]').first().click();
console.log('Opening',c.type,c.record.id,page.url());
await page.waitForFunction(({id,section})=>{const q=new URLSearchParams(location.search);return q.get('tab')==='work'&&q.get('object')===id&&q.get('section')===section;},{id:c.record.id,section:c.section});
const edit=page.locator('#inspector '+c.edit).first();await edit.waitFor();await edit.click();await page.locator(c.form).waitFor();
if(c.field)assert.equal(await page.locator(c.form+` [name="${c.field}"]`).inputValue(),String(c.record[c.field]||''),c.type+' opens the saved record');
if(c.type==='need')assert.ok(await page.locator(c.form+` input[name="keep"][value="${c.record.id}"]`).isChecked(),'need editor holds selected need');
results.push(`${c.type} ${c.record.id}: Table → Work (${c.section}) → correct saved editor`);
await page.locator('dialog[open] button').filter({hasText:/^Cancel$|^Close$/}).first().click();await page.locator(c.form).waitFor({state:'hidden'});
}
assert.deepEqual(errors,[]);await fs.mkdir('audit/round27/model',{recursive:true});await fs.writeFile('audit/round27/model/work-routes.json',JSON.stringify({results,errors},null,2)+'\n');console.log(results.join('\n'));console.log('Model Work routes: PASS');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});}
