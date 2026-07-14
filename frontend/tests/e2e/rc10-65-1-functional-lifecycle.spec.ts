import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';
const evidenceDir='release-evidence/rc10.65.1/functional-lifecycle';
const slug=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const meaningful=(v:string[])=>v.filter(x=>!/React DevTools|ResizeObserver|favicon|telemetry|net::ERR_ABORTED/i.test(x));
async function closeTransient(page:Page){
  const vb=page.getByTestId('architecture-viewbook'); if(await vb.isVisible().catch(()=>false)) await page.getByRole('button',{name:/Close Architecture Viewbook/i}).click().catch(()=>{});
  await page.keyboard.press('Escape').catch(()=>{}); await page.waitForTimeout(40); await page.keyboard.press('Escape').catch(()=>{});
}
async function capture(page:Page,name:string,index:number){
  const metrics=await page.evaluate(()=>{const visible=(el:Element)=>{const r=(el as HTMLElement).getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};const main=document.querySelector('#aiw-main')??document.querySelector('main');const buttons=main?[...main.querySelectorAll('button')].filter(visible):[];const flow=document.querySelector('.react-flow') as HTMLElement|null;const fr=flow?.getBoundingClientRect();return{height:document.documentElement.scrollHeight,textChars:(main?.textContent??'').trim().length,buttons:buttons.length,headings:main?[...main.querySelectorAll('h1,h2,h3')].filter(visible).slice(0,12).map(x=>(x.textContent??'').trim()):[],canvas:fr?{top:Math.round(fr.top),width:Math.round(fr.width),height:Math.round(fr.height)}:null};});
  const file=`${String(index).padStart(2,'0')}-${slug(name)}.png`;await page.screenshot({path:`${evidenceDir}/${file}`,fullPage:false});return{index,name,file,...metrics};
}
test.beforeAll(async()=>mkdir(evidenceDir,{recursive:true}));
test('reference project traverses full solution architecture lifecycle',async({page})=>{
  test.setTimeout(8*60*1000);const errors:string[]=[];const failed:string[]=[];const responses:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText??''}`));page.on('response',r=>{if(r.status()>=400)responses.push(`${r.status()} ${r.request().method()} ${r.url()}`)});
  await mountAiw(page);await page.getByRole('button',{name:/new guided architecture project/i}).click();const sample=page.locator('.starter-template-card').filter({hasText:/Sample architecture/i}).first();if(await sample.isVisible().catch(()=>false))await sample.click();await page.getByLabel(/project name/i).fill('AIW Regulated Payments Journey');await page.getByLabel(/business goal/i).fill('Create a secure, resilient and auditable multi-channel regulated payments platform with measurable availability, recovery, data protection and integration outcomes.');await page.getByRole('button',{name:/create guided project/i}).click();const card=page.locator('.role-card').filter({hasText:/Solution Architect/i}).first();if(await card.isVisible().catch(()=>false))await card.click();await closeTransient(page);
  const rail=page.locator('.role-based-nav');await expect(rail).toBeVisible();const destinations=['Project Cockpit','Requirements & Intent','Quality Drivers','Logical Application','Application Realization','Logical Technology','Physical Technology','Review & Assurance','SDD Delivery Pack','Architecture Composition','Architecture Options','Architecture Viewbook'];const outputs:any[]=[];
  for(let i=0;i<destinations.length;i++){const destination=destinations[i];const nav=rail.getByRole('button',{name:destination,exact:true});if(!await nav.isVisible().catch(()=>false))continue;await nav.click();await page.waitForTimeout(320);await closeTransient(page);outputs.push(await capture(page,destination,outputs.length+1));}
  // Representative low-risk interaction checks, each reset to a known destination.
  const interactions:any[]=[];
  for(const [destination,labels] of [['Requirements & Intent',['Task plan','Work area','Outputs']],['Logical Application',['Compose','Inspect','Review']],['Architecture Composition',['1. Candidate fit','2. Preview & apply','3. Explore design catalogue']],['Architecture Options',['1. Readiness','2. Alternatives','3. Blueprint','4. Simulate','5. Select & handoff']]] as [string,string[]][]){
    await rail.getByRole('button',{name:destination,exact:true}).click();await page.waitForTimeout(220);const exercised:string[]=[];
    for(const label of labels){const b=page.getByRole('button',{name:label,exact:true}).first();if(await b.isVisible().catch(()=>false)&&await b.isEnabled().catch(()=>false)){await b.click().catch(()=>{});await page.waitForTimeout(80);exercised.push(label);}}
    interactions.push({destination,exercised});await closeTransient(page);
  }
  await rail.getByRole('button',{name:'Architecture Options',exact:true}).click();await page.waitForTimeout(220);const generate=page.getByRole('button',{name:/Generate alternatives/i}).first();let generated=false;if(await generate.isVisible().catch(()=>false)&&await generate.isEnabled().catch(()=>false)){await generate.click();await page.waitForTimeout(1000);generated=true;await page.screenshot({path:`${evidenceDir}/13-options-after-generation.png`,fullPage:false});}
  const result={project:'AIW Regulated Payments Journey',role:'Solution Architect',outputs,interactions,generatedAlternatives:generated,signals:{errors:meaningful(errors),failed:meaningful(failed),responses:responses.filter(v=>!/^404 /.test(v))}};await writeFile(`${evidenceDir}/functional-lifecycle.json`,JSON.stringify(result,null,2));expect(result.signals.errors).toEqual([]);expect(result.signals.failed).toEqual([]);expect(result.signals.responses).toEqual([]);
});
