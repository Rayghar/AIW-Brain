import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server/public',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await cp('public','dist/client',{recursive:true});
await cp('worker.js','dist/server/worker.js');
await cp('project-storage.js','dist/server/project-storage.js');
for(const file of ['operation-service.js','connection-adapters.js','recovery-service.js','organization-service.js','object-service.js','intake-service.js','requirement-storage.js','collaboration-service.js','project-lifecycle.js'])await cp(file,'dist/server/'+file);
await cp('intelligence-provider.js','dist/server/intelligence-provider.js');
await cp('brain-retrieval.js','dist/server/brain-retrieval.js');
await cp('knowledge-service.js','dist/server/knowledge-service.js');
await cp('knowledge-repository.js','dist/server/knowledge-repository.js');
await cp('repository-packet.js','dist/server/repository-packet.js');
await cp('repository-sync.js','dist/server/repository-sync.js');
await cp('intelligence-service.js','dist/server/intelligence-service.js');
await cp('public/intelligence-context.js','dist/server/public/intelligence-context.js');
for(const file of ['architecture-model.js','knowledge-stewardship.js','reasoning-record.js','deploy-model.js','stack-model.js','platform-model.js','realise-model.js','responsibility-model.js','utility-model.js','chapter-reasoning.js','model-exchange.js','architecture-case.js','architecture-drafting.js','case-guidance.js','reference-projects.js','organization-knowledge.js','object-graph.js','guided-creation.js','delivery-feedback.js','canonical-command.js','process-model.js','workbench-domain.js','architecture-analysis.js','standards-domain.js','chapter-guide.js','reasoning-contract.js','workbook-reader.js','intake-domain.js','assurance-domain.js','composition-knowledge.js','composition-design.js','quality-analysis.js','model-reversal.js','brain-catalogue.js','brain-playbook.js','playbook-knowledge.js','catalogue-index.js','design-reasoning.js','design-spec.js','desk-capacity.js','product-facts.js','product-knowledge.js','decision-impact.js','model-knowledge.js','brain-reasoning.js','desk-model.js','desk-vitals.js','desk-fixes.js','product-choice.js','threat-model.js','exchange-model.js','anatomy-model.js','anatomy-layout.js','brain-integrity.js','akr-discovery.js','knowledge-ingestion.js','knowledge-governance.js','architecture-brain.js','persistence-knowledge.js','persistence-design.js','read-design-knowledge.js','read-design.js','architecture-proposal.js','architecture-source-pack.js','architecture-knowledge.js','architecture-design.js','aiw-brain.js','brain-authoring.js','knowledge-pack.js','knowledge-relevance.js','security-design.js','exchange-design.js','design-planner.js','design-task-state.js','design-task-domain.js','model-alternatives.js','model-alternatives-state.js','model-impact.js','journey-context.js','evidence-domain.js','interface-impact.js','changes-domain.js','sdd-renderer.js','projects-domain.js','model-scope.js','requirements-domain.js','quality-domain.js','decisions-domain.js','logical-domain.js','realisation-domain.js','technology-model.js','technology-domain.js','technology-realisation-model.js','technology-realisation-domain.js','interfaces-domain.js','interfaces-model.js','security-domain.js','security-model.js','runtime-domain.js','runtime-model.js','review-domain.js','model.js'])await cp('public/'+file,'dist/server/public/'+file);
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8'};
const assets={};for(const file of await readdir('public')){if(!mime[path.extname(file)])continue;assets['/'+file]={type:mime[path.extname(file)],body:await readFile('public/'+file,'utf8')}}
await writeFile('dist/server/assets.js','export default '+JSON.stringify(assets)+';\n');
await writeFile('dist/server/index.js',`import worker from './worker.js';\nimport assets from './assets.js';\nexport default {fetch(request,env,ctx){return worker.fetch(request,{...env,ASSETS:{fetch(req){const url=new URL(req.url);const asset=assets[url.pathname==='/'?'/index.html':url.pathname];if(!asset)return new Response('Not found',{status:404});return new Response(req.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}})}}},ctx)}};\n`);
// Resolve the packaged entry and its full import graph before a version can publish.
const packaged=await import('./dist/server/index.js');
if(typeof packaged.default?.fetch!=='function')throw Error('The packaged Worker has no fetch handler.');
console.log('Built private project Worker, static assets, and D1 migrations; packaged imports verified.');
