import {prepareRepositoryPacket} from './repository-packet.js';
import {handleRepositorySync,repositorySyncRequest,refreshRepositoryAssurance} from './repository-sync.js';
import {handleOperations} from './operation-service.js';
import {handleRecovery} from './recovery-service.js';
import {handleOrganizations,refreshOrganizationAssurance} from './organization-service.js';
import {handleObjects,activityStatement} from './object-service.js';
import {handleLifecycle,instantiateTemplate} from './project-lifecycle.js';
import {applyFeedbackCommand,deliveryExchange} from './public/delivery-feedback.js';
import {applyProcessCommand} from './public/process-model.js';
import {projectIdentity,handleCollaboration,reviewRecords} from './collaboration-service.js';
import {applyArchitectureCaseCommand} from './public/architecture-case.js';
import {applyWorkbenchCommand} from './public/workbench-domain.js';
import {applyStandardsCommand,exportSpecification} from './public/standards-domain.js';
import {applyGuideCommand} from './public/chapter-guide.js';
import {handleIntake} from './intake-service.js';
import {queryRequirements} from './requirement-storage.js';
import {applyAssuranceCommand} from './public/assurance-domain.js';
import {acquireRepositorySource} from './knowledge-service.js';
import {applyKnowledgeCommand} from './public/knowledge-governance.js';
import {journeyIndex} from './public/journey-context.js';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {handleIntelligence,adoptSavedIntelligence} from './intelligence-service.js';
import {intelligenceStatus} from './intelligence-provider.js';
import {applyBrainCommand} from './public/brain-authoring.js';
import {applySecurityDesignTask} from './public/security-design.js';
import {applyExchangeTask} from './public/exchange-design.js';
import {applyDesignCommand} from './public/design-task-domain.js';
import {applyAlternativeCommand} from './public/model-alternatives.js';
import {applyModelImpact,trackModelChange} from './public/model-impact.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {applyInterfaceImpact,trackInterfaceChange} from './public/interface-impact.js';
import {applyChangeCommand,trackRequirementChanges} from './public/changes-domain.js';
import {trackDecisionChange} from './public/decision-impact.js';
import {createProject,projectSummary,requirementImpact} from './public/projects-domain.js';
import {withFinalReview,applyFinalReviewCommand,exportReviewPackage,exportSDD,sddHTML,summarySDD} from './public/review-domain.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {withRuntime,applyRuntimeCommand,runtimeFindings,runtimeReviewCurrent,exportRuntimeMarkdown} from './public/runtime-domain.js';
import {withSecurity,applySecurityCommand,securityFindings,securityReviewCurrent,exportSecurityMarkdown} from './public/security-domain.js';
import {withInterfaces,applyInterfacesCommand,interfaceFindings,interfaceReviewCurrent,exportInterfacesMarkdown} from './public/interfaces-domain.js';
import {withTechnologyRealisation,applyTechnologyRealisationCommand,technologyRealisationFindings,realizationReviewCurrent,exportTechnologyRealisationMarkdown} from './public/technology-realisation-domain.js';
import {withTechnology,applyTechnologyCommand,technologyFindings,technologyReviewCurrent,exportTechnologyMarkdown} from './public/technology-domain.js';
import {withRealisation,applyRealisationCommand,realisationFindings,realisationReviewCurrent,exportRealisationMarkdown} from './public/realisation-domain.js';
import {seedProject,applyCommand,PROJECT_ID,findings,exportMarkdown} from './public/requirements-domain.js';
import {withQuality,applyQualityCommand,qualityFindings,qualityReviewCurrent,exportQualityMarkdown} from './public/quality-domain.js';
import {withDecisions,applyDecisionCommand,decisionFindings,decisionReviewCurrent,exportDecisionsMarkdown} from './public/decisions-domain.js';
import {withLogical,applyLogicalCommand,logicalGraph,logicalFindings,logicalReviewCurrent,exportLogicalMarkdown} from './public/logical-domain.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const actor=request.headers.get('oai-authenticated-user-id');let owner=actor;
  if(!owner)return json({error:'Sign in to open your private project.'},401);
  if(!env.DB)return json({error:'Project storage is unavailable. Your input has not been discarded.'},503);
  const projectId=url.searchParams.get('project')||PROJECT_ID;
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(projectId))return json({error:'Choose a valid project.'},400);
  try{
    if(url.pathname==='/api/organizations')return await handleOrganizations(request,env,actor,projectId);
    const identity=await projectIdentity(env,actor,projectId);owner=identity.owner;
    if(['/api/connections','/api/jobs','/api/operations'].includes(url.pathname))return await handleOperations(request,env,identity,projectId,ctx);
    if(url.pathname==='/api/recovery')return await handleRecovery(request,env,identity,projectId);
    if(['/api/discussions','/api/activity','/api/graph'].includes(url.pathname))return await handleObjects(request,env,identity,projectId);
    if(url.pathname==='/api/lifecycle')return await handleLifecycle(request,env,identity,projectId);
    if(['/api/access','/api/reviews','/api/attachments'].includes(url.pathname))return await handleCollaboration(request,env,identity,projectId);
    if(!['owner','editor'].includes(identity.role)&&request.method!=='GET')return json({error:'This project role permits reading and assigned reviews only.'},403);
    if(url.pathname==='/api/intake')return await handleIntake(request,env,owner,projectId);
    if(url.pathname==='/api/requirements'&&request.method==='GET'){
      const row=await env.DB.prepare('SELECT index_stamp,document FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'This project is unavailable.'},404);
      return json(await queryRequirements(env,owner,projectId,url.searchParams,row.index_stamp?null:(await readStoredProject(env,owner,row.document)).document));
    }
    if(url.pathname.startsWith('/api/intelligence/'))return await handleIntelligence(request,env,owner,projectId);
    if(url.pathname==='/api/projects'&&request.method==='GET'){
      const rows=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? ORDER BY updated_at DESC').bind(actor).all();
      const shared=await env.DB.prepare('SELECT p.document,p.revision,p.updated_at,a.role FROM projects p JOIN project_access a ON p.owner_id=a.owner_id AND p.id=a.project_id WHERE a.actor_id=? ORDER BY p.updated_at DESC').bind(actor).all();
      return json({projects:[...rows.results.map(r=>({...projectSummary(r),role:'owner'})),...shared.results.map(r=>({...projectSummary(r),role:r.role}))]});
    }
    if(url.pathname==='/api/projects'&&request.method==='POST'){
      if(request.headers.get('Origin')!==url.origin)return json({error:'Create projects from your private workspace.'},403);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected project details.'},415);
      const body=await request.text();if(body.length>10000)return json({error:'Shorten the project brief and retry.'},413);
      let input;try{input=JSON.parse(body)}catch{return json({error:'The project details could not be read.'},400)}
      const id='project-'+crypto.randomUUID(),at=new Date().toISOString();let document;
      try{if(input?.sourceProjectId){const template=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(actor,input.sourceProjectId).first();if(!template)throw Error('Choose your own saved template.');const source=(await readStoredProject(env,actor,template.document)).document;if(!source.workspace?.reusableTemplate)throw Error('Mark the project as a reusable template first.');if(typeof input.name!=='string'||!input.name.trim()||input.name.length>100)throw Error('Give the project a name of 1–100 characters.');document=instantiateTemplate(source,id,input.name.trim(),at);}else document=createProject(input||{},id,at)}catch(e){return json({error:e.message},400)}
      await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(actor,id,JSON.stringify(document),at).run();
      return json({document,revision:1,updatedAt:at},201);
    }
    if(url.pathname==='/api/project'&&request.method==='GET'){
      if(projectId===PROJECT_ID)await env.DB.prepare('INSERT OR IGNORE INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner,PROJECT_ID,JSON.stringify(withFinalReview(seedProject())),new Date().toISOString()).run();
      const row=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'This project is unavailable for your account. Return to Projects to choose another.'},404);
      return json({document:await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview((await readStoredProject(env,owner,row.document)).document))),revision:row.revision,updatedAt:row.updated_at});
    }
    if(url.pathname==='/api/export'&&request.method==='GET'){
      const row=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'Open your project before exporting.'},404);
      const project=await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview((await readStoredProject(env,owner,row.document)).document))),markdown=url.searchParams.get('format')==='md',quality=url.searchParams.get('chapter')==='2',decisions=url.searchParams.get('chapter')==='3',logical=url.searchParams.get('chapter')==='4',realisation=url.searchParams.get('chapter')==='5',technology=url.searchParams.get('chapter')==='6',technologyRealisation=url.searchParams.get('chapter')==='7',interfaces=url.searchParams.get('chapter')==='8',security=url.searchParams.get('chapter')==='9',runtime=url.searchParams.get('chapter')==='10';
      const filename='AIW_'+project.name.replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,100);
      if(url.searchParams.get('format')==='delivery')return new Response(JSON.stringify(deliveryExchange(project),null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="'+filename+'_Delivery.json"','Cache-Control':'no-store'}});
      if(url.searchParams.get('chapter')==='8'&&['openapi','asyncapi','original-spec'].includes(url.searchParams.get('format'))){const spec=exportSpecification(project,url.searchParams.get('format'),url.searchParams.get('source'));return new Response(JSON.stringify(spec,null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="'+filename+'_Contract.json"','Cache-Control':'no-store'}});}
      if(url.searchParams.get('chapter')==='11'){
        const format=url.searchParams.get('format')||'md',baselineId=url.searchParams.get('baseline')||null;
        if(!['md','json','html'].includes(format))return json({error:'Choose Markdown, JSON, or HTML.'},400);
        if(baselineId&&!project.finalReview.baselines.some(b=>b.id===baselineId))return json({error:'The selected baseline does not exist.'},404);
        const summary=url.searchParams.get('detail')==='summary';if(summary&&(baselineId||format==='json'))return json({error:'The summary view is available for the working SDD as Markdown or HTML.'},400);
        const body=summary?(format==='html'?sddHTML(summarySDD(project),logicalGraph(project)):summarySDD(project)):format==='json'?JSON.stringify(exportReviewPackage(project,baselineId),null,2):format==='html'?sddHTML(exportSDD(project,baselineId),baselineId?(project.finalReview.baselines.find(b=>b.id===baselineId).model||logicalGraph(project.finalReview.baselines.find(b=>b.id===baselineId).source)):logicalGraph(project)):exportSDD(project,baselineId);
        return new Response(body,{headers:{'Content-Type':format==='json'?'application/json; charset=utf-8':format==='html'?'text/html; charset=utf-8':'text/markdown; charset=utf-8','Content-Disposition':(format==='html'&&url.searchParams.get('view')==='1'?'inline':'attachment')+'; filename="'+filename+'_'+(baselineId||'Working_SDD')+(summary?'_Summary':'')+'.'+format+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'"}});
      }
      const body=markdown?(runtime?exportRuntimeMarkdown(project):security?exportSecurityMarkdown(project):interfaces?exportInterfacesMarkdown(project):technologyRealisation?exportTechnologyRealisationMarkdown(project):technology?exportTechnologyMarkdown(project):realisation?exportRealisationMarkdown(project):logical?exportLogicalMarkdown(project):decisions?exportDecisionsMarkdown(project):quality?exportQualityMarkdown(project):exportMarkdown(project)):JSON.stringify({exportedAt:new Date().toISOString(),project,validation:{reviewedForCurrentRevision:project.review?.contentVersion===project.contentVersion,findings:findings(project)},qualityValidation:{reviewedForCurrentRevision:qualityReviewCurrent(project),findings:qualityFindings(project)},decisionValidation:{reviewedForCurrentRevision:decisionReviewCurrent(project),findings:decisionFindings(project)},logicalValidation:{reviewedForCurrentRevision:logicalReviewCurrent(project),findings:logicalFindings(project)},realisationValidation:{reviewedForCurrentRevision:realisationReviewCurrent(project),findings:realisationFindings(project)},technologyValidation:{reviewedForCurrentRevision:technologyReviewCurrent(project),findings:technologyFindings(project)},technologyRealisationValidation:{reviewedForCurrentRevision:realizationReviewCurrent(project),findings:technologyRealisationFindings(project)},interfacesValidation:{reviewedForCurrentRevision:interfaceReviewCurrent(project),findings:interfaceFindings(project)},securityValidation:{reviewedForCurrentRevision:securityReviewCurrent(project),findings:securityFindings(project)},runtimeValidation:{reviewedForCurrentRevision:runtimeReviewCurrent(project),findings:runtimeFindings(project)},connectedModel:logicalGraph(project),guidance:'Project rules and reviewed proposals; generated records retain their drafting origin',intelligence:intelligenceStatus(env)},null,2);
      return new Response(body,{headers:{'Content-Type':markdown?'text/markdown; charset=utf-8':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="'+(markdown?(runtime?'AIW_Bank_Payment_Deployment_Runtime.md':security?'AIW_Bank_Payment_Security.md':interfaces?'AIW_Bank_Payment_Interfaces_Data.md':technologyRealisation?'AIW_Bank_Payment_Technology_Realization.md':technology?'AIW_Bank_Payment_Logical_Technology.md':realisation?'AIW_Bank_Payment_Application_Realisation.md':logical?'AIW_Bank_Payment_Logical_Model.md':decisions?'AIW_Bank_Payment_Decisions.md':quality?'AIW_Bank_Payment_Quality_Drivers.md':'AIW_Bank_Payment_Requirements.md'):'AIW_Bank_Payment_Project.json').replace('AIW_Bank_Payment',filename)+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(url.pathname==='/api/knowledge/repository-packet'&&request.method==='GET'){
      if(!['owner','editor'].includes(identity.role))return json({error:'A project editor is required to preview repository packets.'},403);
      const row=await env.DB.prepare('SELECT id FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'Project not found.'},404);
      return json({schemaVersion:'aiw-repository-packet-v1',tenantId:owner,projectId,readOnly:true});
    }
    if(url.pathname==='/api/knowledge/repository-packet'&&request.method==='POST'){
      if(request.headers.get('Origin')!==url.origin)return json({error:'Use your private workspace origin.'},403);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected JSON.'},415);
      const raw=await request.text();if(new TextEncoder().encode(raw).length>8000000)return json({error:'Packet exceeds 8 MB.'},413);
      const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'Project not found.'},404);
      try{const stored=await readStoredProject(env,owner,row.document);return json(prepareRepositoryPacket(stored.document,JSON.parse(raw),{tenantId:owner,projectId}));}
      catch(e){return json({error:e.message},400);}
    }
    if(url.pathname==='/api/knowledge/repository-sync'&&request.method==='GET'){
      if(!['owner','editor'].includes(identity.role))return json({error:'A project editor is required.'},403);
      const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();if(!row)return json({error:'Project not found.'},404);
      try{return json(repositorySyncRequest((await readStoredProject(env,owner,row.document)).document,{tenantId:owner,projectId,releaseId:url.searchParams.get('release')}));}
      catch(e){return json({error:e.message},400)}
    }
    if(url.pathname==='/api/knowledge/repository-sync'&&request.method==='POST')return await handleRepositorySync(request,env,identity,projectId);
    if(url.pathname==='/api/commands'&&request.method==='POST'){
      if(request.headers.get('Origin')!==url.origin)return json({error:'This action must originate from your private workspace.'},403);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a project action.'},415);
      const body=await request.text();if(body.length>500000)return json({error:'This change is too large. Shorten the fields and try again.'},413);
      let input;try{input=JSON.parse(body)}catch{return json({error:'The project action could not be read.'},400)}
      if(!input||typeof input!=='object'||!Number.isInteger(input.revision)||!input.command||typeof input.command.type!=='string')return json({error:'The project action is incomplete.'},400);
      if(body.length>40000&&!input.command.type.startsWith('alternative.')&&!input.command.type.startsWith('design.')&&!input.command.type.startsWith('exchange.')&&!input.command.type.startsWith('protection.')&&!input.command.type.startsWith('architecture.')&&!input.command.type.startsWith('knowledge.')&&!input.command.type.startsWith('standards.')&&!input.command.type.startsWith('workspace.')&&input.command.type!=='feedback.import')return json({error:'This change is too large. Shorten the fields and try again.'},413);
      const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'Open the project before saving changes.'},404);
      if(row.revision!==input.revision)return json({error:'This project changed in another tab or session. Reload the latest project, then apply your preserved changes.',conflict:true},409);
      const stored=await readStoredProject(env,owner,row.document);stored.document=await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview(stored.document)));if(stored.document.workspace?.status==='archived')return json({error:'Restore this project before changing its design.'},409);let result;const at=new Date().toISOString();try{if(input.command.type==='knowledge.link'&&!journeyIndex(withFinalReview(stored.document)).nodes.has(input.command.payload?.objectId))throw Error('Choose an existing object in this project.');result=input.command.type==='knowledge.fetch'?await acquireRepositorySource(withFinalReview(stored.document),input.command.payload||{},env,actor,at):input.command.type.startsWith('knowledge.')?applyKnowledgeCommand(withFinalReview(stored.document),input.command,at,actor):input.command.type==='intelligence.adopt'?await adoptSavedIntelligence(env,owner,projectId,withFinalReview(stored.document),input.command.payload||{},at):(input.command.type==='feedback.import'?applyFeedbackCommand:input.command.type.startsWith('workspace.')?applyWorkbenchCommand:input.command.type.startsWith('case.')?applyArchitectureCaseCommand:input.command.type.startsWith('standards.')?applyStandardsCommand:input.command.type.startsWith('guide.')?applyGuideCommand:input.command.type.startsWith('assurance.')?applyAssuranceCommand:input.command.type.startsWith('brain.')?applyBrainCommand:input.command.type.startsWith('protection.')?applySecurityDesignTask:input.command.type.startsWith('exchange.')?applyExchangeTask:input.command.type.startsWith('architecture.')?applyArchitectureCommand:input.command.type.startsWith('design.')?applyDesignCommand:input.command.type.startsWith('alternative.')?applyAlternativeCommand:input.command.type==='model.apply-impact'?applyModelImpact:input.command.type.startsWith('evidence.')?applyEvidenceCommand:input.command.type==='interfaces.apply-impact'?applyInterfaceImpact:input.command.type.startsWith('change.')?applyChangeCommand:input.command.type.startsWith('review.')?applyFinalReviewCommand:input.command.type.startsWith('process.')?applyProcessCommand:input.command.type.startsWith('runtime.')?applyRuntimeCommand:input.command.type.startsWith('security.')?applySecurityCommand:input.command.type.startsWith('interfaces.')?applyInterfacesCommand:input.command.type.startsWith('techrealisation.')?applyTechnologyRealisationCommand:input.command.type.startsWith('technology.')?applyTechnologyCommand:input.command.type.startsWith('realisation.')?applyRealisationCommand:input.command.type.startsWith('logical.')?applyLogicalCommand:input.command.type.startsWith('decision.')?applyDecisionCommand:input.command.type.startsWith('quality.')?applyQualityCommand:applyCommand)(withFinalReview(stored.document),input.command,at,actor);result.document=withFinalReview(result.document)}catch(e){return json({error:e.message},400)}
      const prior=withFinalReview(stored.document),impact=requirementImpact(prior,result.document,at);
      trackRequirementChanges(prior,result.document,at,requirementImpact);
      trackInterfaceChange(prior,result.document,input.command,at);
      trackModelChange(prior,result.document,input.command,at);
      trackDecisionChange(prior,result.document,input.command,at);
      if(input.command.type==='workspace.apply')for(const c of input.command.payload.commands){trackModelChange(prior,result.document,c,at);trackInterfaceChange(prior,result.document,c,at);}
      if(impact)result.document.workspace={...result.document.workspace,lastImpact:impact};
      const change=await saveStoredProject(env,owner,projectId,result.document,input.revision,at,stored.keys,stamp=>[activityStatement(env,identity,projectId,{at,kind:'model',title:input.command.type,objectId:result.selected||input.command.payload?.id||null,revision:input.revision+1},stamp)]);
      if(!change.meta?.changes)return json({error:'The project changed while saving. Reload and apply your preserved changes.',conflict:true},409);
      return json({...result,revision:input.revision+1,updatedAt:at});
    }
    return json({error:'Project route not found.'},404);
  }catch(e){console.error('Project storage error',e?.message);return json({error:'We could not reach project storage. Your input is still here; please retry.'},503)}
}};
