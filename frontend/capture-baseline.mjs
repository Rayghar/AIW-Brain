import { chromium } from '@playwright/test';
import fs from 'node:fs';
const out='/mnt/data/aiw_work/baseline-shots'; fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
const consoleErrors=[]; const failed=[];
page.on('console',m=>{ if(m.type()==='error') consoleErrors.push(m.text()); });
page.on('pageerror',e=>consoleErrors.push('PAGEERROR '+e.message));
page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.screenshot({path:`${out}/01-project-hub.png`,fullPage:true});
const newBtn=page.getByRole('button',{name:/new guided architecture project/i});
if(await newBtn.count()){await newBtn.click(); await page.waitForTimeout(300); await page.screenshot({path:`${out}/02-create-project.png`,fullPage:true});}
const name=page.getByLabel(/project name/i); if(await name.count()){await name.fill('Global Payments Architecture');}
const goal=page.getByLabel(/business goal/i); if(await goal.count()){await goal.fill('Deliver a resilient, compliant multi-channel payment platform with faster change and controlled operating cost.');}
await page.screenshot({path:`${out}/03-create-ready.png`,fullPage:true});
const create=page.getByRole('button',{name:/create guided project/i}); if(await create.count()){await create.click(); await page.waitForTimeout(600); await page.screenshot({path:`${out}/04-cockpit.png`,fullPage:true});}
for (const [nameRe,file] of [[/quality drivers/i,'05-quality.png'],[/logical app|logical application/i,'06-logical.png'],[/review|assurance/i,'07-review.png'],[/sdd pack|generate sdd/i,'08-sdd.png']]) {
 const b=page.getByRole('button',{name:nameRe}).first(); if(await b.count() && await b.isVisible()){await b.click(); await page.waitForTimeout(500); await page.screenshot({path:`${out}/${file}`,fullPage:true});}
}
fs.writeFileSync(`${out}/runtime.json`,JSON.stringify({consoleErrors,failed,url:page.url()},null,2));
await browser.close();
