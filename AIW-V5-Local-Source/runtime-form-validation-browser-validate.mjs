import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import net from 'node:net';
import {chromium} from 'playwright';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aiw-form-error-'));
process.env.AIW_LOCAL_DB=path.join(dir,'project.sqlite');process.env.OPENAI_API_KEY='';process.env.ANTHROPIC_API_KEY='';
process.env.PORT=String(await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});}));
const {server}=await import('./server.js');// rc38+ (rc41 W4): a record's requirement grounds are a picker (record-fields.js pickHTML): the value is a hidden input
// (data-pick-value) and a person can only add records the picker lists. setGrounds(): when the field is the picker, the
// typed path is checked first — the bad reference, searched in the picker's own Find box, offers nothing to add — and the
// stale value (a reference already in the draft that no longer resolves, as a retired or foreign requirement would) is set
// on the hidden field the way a restored draft carries it, with a change event; the form's validation is then pinned as
// before. A plain text field is filled as before.
const setGrounds = async (page, grounds, value, {probe = false} = {}) => {
  const picker = await grounds.evaluate(e => e.type === 'hidden' && e.hasAttribute('data-pick-value'));
  if (!picker) { await grounds.fill(value); return; }
  if (probe) {
    const box = grounds.locator('xpath=ancestor::*[@data-pick][1]'), find = box.locator('[data-pick-find]');
    await find.fill(value); await page.waitForTimeout(150);
    if (await box.locator('[data-pick-add]').count()) throw Error('the picker offers a record to add for ' + value);
    const none = (await box.locator('.l-pick-results').innerText()).trim();
    if (none !== 'Nothing else matches this search.') throw Error('the picker does not say nothing matches ' + value + ': ' + none);
    await find.fill('');
  }
  await grounds.evaluate((e, v) => { e.value = v; e.closest('[data-pick]').dispatchEvent(new Event('change', {bubbles: true})); }, value);
};
const browser=await chromium.launch({headless:true,executablePath:process.env.AIW_BROWSER_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+process.env.PORT+'/?chapter=10&tab=work',{waitUntil:'networkidle'});
 const coach=page.locator('[data-coach=close]');if(await coach.count())await coach.click();
 await page.locator('[data-rt-action="edit-plan"]').filter({visible:true}).first().click();
 await setGrounds(page,page.locator('#rt-editor [name=grounds]'),'not-a-requirement',{probe:true});
 const before=await page.evaluate(()=>window.aiwProjectStore.value.revision);
 await page.locator('#rt-editor button[type=submit]').click();
 await page.locator('#rt-dialog-error').filter({hasText:'Choose existing requirements'}).waitFor();
 assert.equal(await page.locator('#rt-editor [name=grounds]').inputValue(),'not-a-requirement');
 assert.equal(await page.evaluate(()=>window.aiwProjectStore.value.revision),before);
 assert.deepEqual(errors,[]);
 console.log('PASS: Invalid runtime requirement reference stays a contained form error, preserves the draft, performs no save and raises no page error.');
}finally{await browser.close();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
