import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {logicalGraph,logicalProposal,scenarioCurrent} from './public/logical-domain.js';
import {withFinalReview,chapterSummaries,reviewTrace,reviewDesignStamp} from './public/review-domain.js';
import {freezeBaseline} from './scripts/freeze-baseline.mjs';
import {createProject} from './shared/projects-domain.js';
import {QUALITY_TYPES} from './public/quality-domain.js';
import {interpretBrief,briefCounts,BRIEF_LIMIT} from './shared/brief-interpreter.js';
import {interpretModel,modelCounts,MODEL_LIMIT} from './shared/model-interpreter.js';
import {readFileSync} from 'node:fs';
import {PROJECT_BODY_LIMIT} from './worker.js';
import {createHash} from 'node:crypto';
import {REFERENCE_PROJECTS} from './public/reference-projects.js';
import {isArchitectureEdition} from './public/sdd-document.js';
const preview=process.argv.includes('--preview'),DB=localDatabase(preview?'.aiw-local/project.sqlite':':memory:'),objects=new Map();
const FILES=preview?localFiles():{async put(k,v){objects.set(k,v)},async get(k){return objects.has(k)?{text:async()=>objects.get(k)}:null},async delete(k){objects.delete(k)}};
const owner=preview?'local-architect':'journey-author',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=async(path,method='GET',body,as=owner,origin='https://aiw.test')=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{...(as?{'oai-authenticated-user-id':as}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
let state,id;
// A baseline is frozen as a job (round 12, GR-STO-02): the baseline it froze is read back whole (frozenWhole).
let frozenWhole=null;
async function command(type,payload={}){if(type==='review.baseline'){const f=await freezeBaseline((path,body)=>api(path,body?'POST':'GET',body),{...payload,project:id});assert(!f.error,f.error);state=f.state;frozenWhole=f.baseline;return frozenWhole.id;}const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,type+': '+await r.clone().text());state=await r.json();return state.selected;}
try{
 assert.equal((await api('/api/projects','GET',null,null)).status,401);
 assert.equal((await api('/api/projects','POST',{name:'Wrong origin',template:'blank'},owner,'https://other.test')).status,403);
 assert.equal((await api('/api/projects','POST',{name:'',template:'blank'})).status,400);
 const r=await api('/api/projects','POST',{name:'Customer onboarding validation',template:'blank',brief:'Customers need one traceable application with an accountable outcome.'});assert.equal(r.status,201);state=await r.json();id=state.document.id;
 assert.equal(state.document.artefacts.length,0);assert.equal(logicalGraph(state.document).nodes.length,0);assert.equal(logicalGraph(withFinalReview(state.document)).nodes.length,0);
 assert(chapterSummaries(state.document).every(c=>c.done===0),'No empty chapter counts as complete');
 assert.equal((await api('/api/project?project='+id,'GET',null,'unrelated-owner')).status,404);
 assert.equal((await api('/api/commands?project='+id,'POST',{revision:1,command:{type:'review'}},'unrelated-owner')).status,404);
 assert.equal((await api('/api/export?project='+id,'GET',null,'unrelated-owner')).status,404);
 assert.equal((await api('/api/project?project=missing-project')).status,404);
 const reference=await (await api('/api/projects','POST',{name:'Fresh bank reference validation',template:'bank-payment'})).json();assert.equal(reference.document.artefacts.filter(a=>a.type==='requirement').length,5);assert(reference.document.artefacts.every(a=>a.origin==='reference'&&!a.confirmed));assert(reference.document.quality.drivers.every(d=>!d.targetConfirmed));
 await command('brief',{problem:state.document.brief.problem,goal:'Applicants can see the recorded outcome of one submitted application.',source:'Synthetic validation brief',confirmed:true});
 const common={owner:'Onboarding team',source:'Synthetic validation brief',priority:'Must',confirmed:true};
 const out=await command('artefact',{...common,type:'outcome',title:'One traceable application',description:'The applicant can follow the recorded application outcome.'});
 const actor=await command('artefact',{...common,type:'actor',title:'Applicant',description:'Submits the onboarding application.'});
 const journey=await command('artefact',{...common,type:'journey',title:'Submit an application',description:'Accept a complete application and return its stable reference.',order:1});
 const requirement=await command('artefact',{...common,type:'requirement',title:'Accept a traceable application',description:'The service shall accept a complete application once and return its stable reference.',acceptance:'Given a complete application, when the applicant submits it, then one reference and its current status are returned.'});
 assert.equal(requirement,'REQ-001');
 for(const [from,kind,to] of [[actor,'participates in',journey],[journey,'requires',requirement],[requirement,'delivers',out]])await command('relationship',{from,kind,to});
 await command('review');await command('handoff',{acknowledge:true});await command('quality.intake');
 const driver=await command('quality.driver',{...common,title:'Acknowledge the application',category:'performance',stimulus:'Applicant submits a complete application',conditions:'Normal workload; 20 concurrent fictional applicants',response:'Return the recorded reference and status',metric:'95th percentile response time',operator:'At most',targetValue:'2',unit:'seconds',window:'A ten-minute validation sample',measurement:'Time each simulated request from receipt to response.',requirementIds:[requirement],responsibilityIds:[],rationale:'Applicants need an immediate reference.',targetConfirmed:false});
 await command('quality.review');await command('quality.handoff',{acknowledge:true});await command('decision.intake');
 const decision=await command('decision.save',{...common,question:'Where should acknowledgement be recorded?',topic:'custom',context:'The application requires a stable reference before further checks.',rationale:'Keep the acknowledgement and application state together.',requirementIds:[requirement],driverIds:[driver],risks:'The shared write path needs capacity evidence.'});
 for(const title of ['Record before background validation','Complete validation before acknowledgement'])await command('decision.alternative',{id:decision,title,summary:title,benefits:'A clear acknowledgement boundary.',costs:'Additional state or caller latency.',consequences:'The timing and retry contract must match the chosen boundary.',responsibilityIds:[],relationships:[],assessments:{[driver]:{effect:'unknown',reason:'Measure the proposed path.',evidence:'Synthetic test plan'}}});
 await command('decision.choose',{id:decision,alternativeId:state.document.decisions.records[0].alternatives[0].id});await command('decision.record',{id:decision});
 const group=await command('logical.group',{title:'Application intake',purpose:'Capture accountable onboarding requests.',owner:'Onboarding team'});
 const q=logicalProposal(state.document,'review');assert(q.title.includes('traceable application'));assert(!q.reason.includes('payment'));assert.equal(q.requirementIds[0],requirement);
 const logical=await command('logical.candidate',{key:q.key,reviewed:true,title:'Application intake',purpose:'Accept an application and issue its stable reference.',boundary:'Own acknowledgement and stable application identity.',owner:'Onboarding team',source:'Synthetic validation brief',groupId:group,requirementIds:[requirement],decisionIds:[decision],confirmed:true});
 assert(state.document.logical.connections.some(e=>e.from===journey&&e.to===logical),'Accepted ghost connects to the actual project journey');
 assert.equal(state.document.logical.responsibilities[0].origin,'suggestion');
 assert.equal(logicalProposal(state.document,'review').existingId,logical,'Covered requirements lead to the saved responsibility instead of another ghost');
 await command('logical.scenario',{scenario:'success',visited:[0]});assert(scenarioCurrent(state.document,'success'));
 await command('logical.review');await command('logical.handoff',{acknowledge:true});
 const app=await command('realisation.component',{title:'Onboarding service',kind:'service',purpose:'Persist applications and acknowledge their reference.',boundary:'Application intake and status.',owner:'Onboarding team',inputs:'Application request',outputs:'Application reference and status',rationale:'Implements the acknowledgement boundary.',source:'Synthetic validation ADR',technologyNeeds:'Execution and transactional persistence',decisionIds:[decision],dataIds:[],allocations:[{logicalId:logical,scope:'Accept and identify the application'}]});
 assert.equal(state.document.technology.needs.some(n=>n.applicationId===app),true,'Created component carries its needs into Chapter 6');
 const need=state.document.technology.needs.find(n=>n.applicationId===app&&n.category==='compute');assert(need);
 const capability=await command('technology.capability',{title:'Application execution',category:'compute',purpose:'Execute the onboarding service.',boundary:'Run request handling and controlled background tasks.',owner:'Platform team',source:'Synthetic model',rationale:'Required by the service.',driverIds:[driver],decisionIds:[decision],mappings:[{needId:need.id,scope:'Execute the request boundary'}]});
 const realization=await command('techrealisation.plan',{title:'Onboarding execution service',purpose:'Provide an operated execution boundary.',owner:'Platform team',operationsPlan:'Owned monitoring and recovery.',rationale:'A dedicated boundary for application execution.',mappings:[{capabilityId:capability,scope:'Realize application execution'}]});
 const data=await command('interfaces.data',{title:'Onboarding application',purpose:'Authoritative application state.',owner:'Onboarding team',classification:'Confidential',authorityId:app,retentionPolicy:'Confirm a purpose-bound period.',protection:'Restrict access to the application owner and authorised reviewers.'});
 await command('interfaces.field',{id:data,field:{name:'applicationReference',type:'string',classification:'Inherited',key:true,required:true,description:'Stable request reference.',example:'APP-FICTIONAL-001'}});
 const party=await command('interfaces.party',{title:'Applicant channel',purpose:'Submits the onboarding request.',owner:'Channels team'});
 const contract=await command('interfaces.contract',{title:'Submit application',kind:'request',from:party,to:app,purpose:'Accept the request and return its reference.',owner:'Onboarding team',protocol:'HTTPS',operation:'POST /applications',contractVersion:'1',correlationKey:'applicationReference',idempotencyKey:'applicationReference',duplicatePolicy:'Return the original result.',exchanges:[{dataId:data,role:'request'}]});
 const threat=await command('security.threat',{title:'Another applicant reads an application',category:'Unauthorised action',priority:'High',actor:'An authenticated applicant without ownership',scenario:'Uses another application reference',consequence:'Disclosure of application data',owner:'Onboarding team',targetIds:[contract,data]});
 const control=await command('security.control',{title:'Application ownership check',category:'Identity & access',failureMode:'Deny or contain',purpose:'Limit application access to its authorised owner.',owner:'Onboarding team',enforcement:'Onboarding request boundary',mechanism:'Bind authenticated identity to the application owner.',failureResponse:'Reject the request without returning application data.',targetIds:[contract,data],threatIds:[threat]});
 const environment=await command('runtime.environment',{title:'Onboarding pre-production',stage:'Pre-production design',purpose:'Exercise the designed flow using fictional applications.',owner:'Platform team',assetIds:[app,realization],basis:'Synthetic QA environment'});
 const zone=await command('runtime.zone',{environmentId:environment,title:'Validation zone',owner:'Platform team',failureDomain:'QA domain',isolation:'A declared boundary requiring evidence.'});
 const runtime=state.document.runtime.plans.find(r=>r.assetId===app);assert(runtime);
 await command('runtime.placement',{planId:runtime.id,zoneId:zone,role:'active',replicas:1,basis:'Illustrative QA capacity',confirmed:false});
 await command('review.intake');await command('review.narrative',{title:'Customer onboarding — Solution Design',owner:'QA architect',audience:'Design reviewers',summary:'A connected synthetic walkthrough from brief to runtime.',scope:'Application acknowledgement, state, and access.',approach:'One intake boundary with explicit references and review obligations.',confirmed:true});
 const trace=reviewTrace(state.document,requirement);for(const key of ['drivers','decisions','logical','applications','capabilities','realizations','contracts','data','controls','runtime'])assert(trace[key].length>0,'Chapter trace reaches '+key);
 await command('review.checks');await command('review.baseline',{title:'Synthetic walkthrough snapshot',stamp:reviewDesignStamp(state.document),reviewed:true});
 // A baseline keeps the architecture edition for everyone (round 12, F): its section 5 draws the connected model, which the
 // baseline keeps whole beside it (frozen.model); the model register itself is the review registers annex of the working SDD.
 // It is frozen as a job and read back whole (round 12, A3: frozenWhole).
 const frozen=frozenWhole;assert.equal(frozen.id,state.document.finalReview.baselines[0].id);assert(isArchitectureEdition(frozen.markdown)&&frozen.markdown.includes('# 5. Architecture models'));assert(frozen.model.nodes.some(n=>n.id===app));
 const preEditRevision=state.revision;
 await command('artefact',{...state.document.artefacts.find(a=>a.id===requirement),acceptance:'Given a complete application, when it is submitted twice, then both responses return the same reference and a single application is retained.'});
 assert.equal(state.document.workspace.lastImpact.requirements[0].id,requirement);assert.equal(state.document.workspace.lastImpact.groups.length,9);
 assert(!scenarioCurrent(state.document,'success'),'Changing the recorded journey context invalidates the logical trace review');
 assert.equal((await api('/api/commands?project='+id,'POST',{revision:preEditRevision,command:{type:'review'}})).status,409);
 const reopened=await (await api('/api/project?project='+id)).json();assert.equal(reopened.document.finalReview.baselines[0].model,undefined,'a read carries a baseline\'s metadata, not its parts');assert.deepEqual(await(await api('/api/baselines?project='+id+'&action=open&part=model&id='+frozen.id)).json(),frozen.model);assert.equal(reopened.document.workspace.lastImpact.groups.length,9);
 assert.equal((await (await api('/api/project?project='+reference.document.id)).json()).revision,1,'Other project unchanged');
 for(let chapter=1;chapter<=11;chapter++){
  const exportResponse=await api('/api/export?project='+id+'&chapter='+chapter+'&format=md');assert.equal(exportResponse.status,200);assert(exportResponse.headers.get('Content-Disposition').includes('Customer_onboarding_validation'));const text=await exportResponse.text();assert(text.includes(chapter===11?'Customer onboarding':'Customer onboarding validation'));assert(!text.includes('# AIW V5 · Bank Payment Journey'));
 }
 const htmlResponse=await api('/api/export?project='+id+'&chapter=11&format=html&view=1');const html=await htmlResponse.text();for(const token of ['<table>','<svg','Architecture figures','Figure 1','Document contents','REQ-001','Application intake'])assert(html.includes(token),token);assert(!html.includes('<script'));
 // Every record with every field (the Chapter 9 control among them) is in the SDD's review registers annex (Appendix D;
 // round 12, F): the architecture edition prints what SDD-SPEC lists.
 const registers=await(await api('/api/export?project='+id+'&chapter=11&annex=registers&format=html&view=1')).text();assert(registers.includes('Application ownership check'),'the control, in the registers annex');assert(!registers.includes('<script'));
 assert.equal(await(await api('/api/export?project='+id+'&chapter=11&format=md&baseline='+frozen.id)).text(),frozen.markdown);
 const hostile=createProject({name:'<img src=x onerror=alert(1)>',template:'blank'},'safe-test');assert.equal(hostile.name,'<img src=x onerror=alert(1)>');
 // A project started from a brief (round 4, Contract 1): the text is brief.problem and is kept whole, with the SHA-256 the
 // server works out, as evidence source SRC-001; the interpretation is kept as counts only; nothing is drafted.
 const sha=t=>createHash('sha256').update(t).digest('hex');
 const BRIEF='Clinic appointment scheduling\n\nThe clinic wants patients to book appointments online so that the reception desk spends less time on the phone.\n\n## Requirements\n- Patients must be able to see free slots for the next four weeks\n- Receptionists should be able to move a booking when a clinician is ill\n\nOut of scope: billing.\n\nThe service must comply with GDPR. Who owns the booking rules?';
 const typed=await api('/api/projects','POST',{name:'Clinic from a typed brief',template:'blank',brief:'  '+BRIEF+'\n'});assert.equal(typed.status,201);const t=(await typed.json()).document;
 assert.equal(t.brief.problem,BRIEF);assert.equal(t.brief.source,'','a typed brief names no file');assert.equal(t.brief.confirmed,false);
 assert.equal(t.brief.goal,'The clinic wants patients to book appointments online so that the reception desk spends less time on the phone.','the goal is the first outcome the brief states, in its own words');assert.equal(t.brief.goal,interpretBrief(BRIEF).outcomes.find(o=>o.confidence==='stated').description);
 const kept=t.coauthoring.sources[0];assert.equal(t.coauthoring.sources.length,1);
 assert.deepEqual([kept.id,kept.kind,kept.name,kept.text,kept.hash,kept.addedAt],['SRC-001','brief','Opening brief',BRIEF,sha(BRIEF),t.workspace.createdAt],'the whole text, hashed on the server');
 assert.equal(kept.versions.length,1);assert.equal(kept.versions[0].status,'Unconfirmed');assert.equal(kept.versions[0].excerpt,BRIEF);assert.match(kept.versions[0].location,new RegExp('typed at project creation · text SHA-256 '+sha(BRIEF)));
 const expected=briefCounts(interpretBrief(BRIEF,{name:'Clinic from a typed brief'}));
 assert.deepEqual(t.brief.interpreted,{rules:'brief-rules-1',at:t.workspace.createdAt,sourceId:'SRC-001',textHash:sha(BRIEF),...expected});
 assert.deepEqual([expected.requirements,expected.outcomes,expected.scope,expected.constraints],[2,1,1,1]);
 assert(!JSON.stringify(t.brief.interpreted).includes('"title"'),'counts only, never the proposals');
 assert.equal(t.artefacts.length,0,'interpreting is not drafting: no record is created');
 for(const p of interpretBrief(kept.text).passages)assert.equal(kept.text.slice(p.start,p.end),p.text,'passages resolve in the kept text');
 // From a file the browser read: its name, its hash and its kind; the text is hashed again here.
 const fileHash=sha('the bytes of brief.docx'),fromFile=await api('/api/projects','POST',{name:'Clinic from a file',template:'blank',brief:BRIEF,briefFile:{name:'Clinic brief.docx',hash:fileHash,kind:'docx',bytes:4321,edited:false}});assert.equal(fromFile.status,201);const f=(await fromFile.json()).document;
 assert.equal(f.brief.problem,BRIEF);assert.equal(f.brief.source,'Clinic brief.docx · file SHA-256 '+fileHash);
 assert.deepEqual(f.coauthoring.sources[0].file,{name:'Clinic brief.docx',hash:fileHash,kind:'docx',bytes:4321,edited:false});assert.equal(f.coauthoring.sources[0].hash,sha(BRIEF));assert.equal(f.coauthoring.sources[0].name,'Clinic brief.docx');
 assert.match(f.coauthoring.sources[0].versions[0].location,/read from Clinic brief\.docx in the browser \(file SHA-256 [0-9a-f]{64}\) · text SHA-256 [0-9a-f]{64}$/);
 const edited=(await (await api('/api/projects','POST',{name:'Edited file brief',template:'blank',brief:BRIEF+' Patients must be able to cancel online.',briefFile:{name:'b.md',hash:fileHash,kind:'md',bytes:10,edited:true}})).json()).document;assert.match(edited.brief.source,/edited after it was read$/);
 // The brief survives the store: reopened, saved through a command (which moves the evidence into private storage), read back.
 let fid=f.id,fr=(await (await api('/api/project?project='+fid)).json());assert.deepEqual(fr.document.coauthoring.sources[0],f.coauthoring.sources[0]);
 let saved=await api('/api/commands?project='+fid,'POST',{revision:fr.revision,command:{type:'brief',payload:{problem:BRIEF,goal:'Patients book without phoning.',source:f.brief.source,confirmed:true}}});assert.equal(saved.status,200,await saved.clone().text());fr=await saved.json();
 assert.deepEqual(fr.document.brief.interpreted,f.brief.interpreted,'confirming the brief keeps its interpretation');
 fr=(await (await api('/api/project?project='+fid)).json());assert.equal(fr.document.coauthoring.sources[0].text,BRIEF);assert.equal(sha(fr.document.coauthoring.sources[0].text),fr.document.coauthoring.sources[0].hash,'the kept text still matches its hash after a save');
 saved=await (await api('/api/commands?project='+fid,'POST',{revision:fr.revision,command:{type:'brief',payload:{problem:BRIEF+' Clinicians must see their day.',goal:'',source:'',confirmed:false}}})).json();
 assert.equal(saved.document.brief.interpreted,undefined,'a changed problem drops counts read from the old text');assert.equal(saved.document.coauthoring.sources[0].text,BRIEF,'the kept source text stays as it was read');
 const long='Residents must report potholes. '.repeat(600).slice(0,BRIEF_LIMIT-2)+' .';fr=(await (await api('/api/project?project='+fid)).json());
 saved=await (await api('/api/commands?project='+fid,'POST',{revision:fr.revision,command:{type:'brief',payload:{problem:long,goal:'',source:'',confirmed:false}}})).json();assert.equal(saved.document.brief.problem,long.trim(),'the brief command keeps a 20,000-character problem whole');
 // Bounds and shapes.
 const atLimit=await api('/api/projects','POST',{name:'Brief at the limit',template:'blank',brief:'x'.repeat(BRIEF_LIMIT)});assert.equal(atLimit.status,201);const limited=(await atLimit.json()).document;assert.equal(limited.brief.problem.length,BRIEF_LIMIT);assert.equal(limited.brief.goal,'','a brief that states no outcome leaves the goal empty');
 const over=await api('/api/projects','POST',{name:'Brief over the limit',template:'blank',brief:'x'.repeat(BRIEF_LIMIT+1)});assert.equal(over.status,400);assert.match((await over.json()).error,/20,000 characters/);
 // The body bound (round 6): a brief of 20,000 and a model of 2,000,000 characters, each escaped once, and the descriptions: 4,044,000 bytes.
 assert.equal(PROJECT_BODY_LIMIT,2*BRIEF_LIMIT+2*MODEL_LIMIT+4000);assert.equal(PROJECT_BODY_LIMIT,4044000);
 assert.equal((await api('/api/projects','POST',{name:'Too large',template:'blank',brief:'x',pad:'x'.repeat(PROJECT_BODY_LIMIT)})).status,413,'a body above the bound is refused before it is read');
 assert.equal((await api('/api/projects','POST',{name:'Model of quotes',template:'blank',brief:'x',model:{text:'"\n'.repeat(MODEL_LIMIT/2),name:'q.dsl',kind:'dsl'}})).status,400,'a model of quotes and newlines at the limit fits the body bound (and is then refused as no model, not as too large)');
 assert.equal((await api('/api/projects','POST',{name:'Escaped brief',template:'blank',brief:'"\n'.repeat(BRIEF_LIMIT/2)})).status,201,'a brief of quotes and newlines at the limit fits the body bound');
 for(const [body,message] of [[{name:'Ref with file',template:'bank-payment',brief:'',briefFile:{name:'b.txt',hash:fileHash,kind:'txt',bytes:3}},/starts a blank project/],[{name:'Empty with file',template:'blank',brief:'  ',briefFile:{name:'b.txt',hash:fileHash,kind:'txt',bytes:3}},/starts a blank project/],[{name:'PDF',template:'blank',brief:'x',briefFile:{name:'b.pdf',hash:fileHash,kind:'pdf',bytes:3}},/\.txt, \.md or \.docx/],[{name:'No hash',template:'blank',brief:'x',briefFile:{name:'b.txt',hash:'abc',kind:'txt',bytes:3}},/SHA-256/],[{name:'Extra',template:'blank',brief:'x',briefFile:{name:'b.txt',hash:fileHash,kind:'txt',bytes:3,text:'smuggled'}},/unsupported shape/],[{name:'Huge',template:'blank',brief:'x',briefFile:{name:'b.txt',hash:fileHash,kind:'txt',bytes:13*1024*1024}},/12 MB/],[{name:'Not text',template:'blank',brief:{text:'x'}},/20,000/]]){const r=await api('/api/projects','POST',body);assert.equal(r.status,400,JSON.stringify(body).slice(0,60));assert.match((await r.json()).error,message);}
 const pathName=(await (await api('/api/projects','POST',{name:'Path name',template:'blank',brief:'x',briefFile:{name:'C:\\Users\\me\\brief.txt',hash:fileHash,kind:'txt',bytes:3}})).json()).document;assert.equal(pathName.coauthoring.sources[0].name,'brief.txt','a path never reaches the project');
 const reference2=(await (await api('/api/projects','POST',{name:'Reference ignores a brief',template:'bank-payment'})).json()).document;assert.equal(reference2.brief.interpreted,undefined);assert(!reference2.coauthoring?.sources?.some(x=>x.kind==='brief'));
 // The reference journeys (round 4; shared/reference-journeys.js): each template id creates its project from its own
 // brief, kept first and drafted through all eleven chapters; a brief typed beside it is not read. The SDD carries the
 // project's own name; reference-projects-validate.mjs asserts the rest.
 for(const r of REFERENCE_PROJECTS){
  const res=await api('/api/projects','POST',{name:r.title+' validation',template:r.id,brief:'A typed brief beside a reference is not read.'});assert.equal(res.status,201,r.id+': '+await res.clone().text());const d=(await res.json()).document;
  assert.deepEqual(d.workspace.reference,{id:r.id,authority:'AIW authored illustration',drafted:'journey-rules-1 from the brief',verified:false});assert.equal(d.workspace.template,r.id);
  assert.equal(d.finalReview.narrative.title,r.title+' validation — Solution Design');assert.notEqual(d.finalReview.narrative.title,'Bank Payment Journey — Solution Design');
  const kept=d.coauthoring.sources[0];assert.deepEqual([kept.id,kept.kind,kept.text.split('\n')[0],kept.hash],['SRC-001','brief',r.brief,sha(kept.text)]);assert.equal(d.brief.problem,kept.text);assert.equal(d.brief.interpreted.sourceId,'SRC-001');
  assert.equal(d.brief.goal,interpretBrief(kept.text).outcomes.find(o=>o.confidence==='stated').description);assert.equal(d.brief.confirmed,false);
  assert(d.artefacts.length&&d.quality.drivers.length&&d.runtime.plans.length&&d.interfaces.data.every(x=>x.fields.some(f=>f.key&&f.required)));assert(d.artefacts.every(a=>!a.confirmed&&a.provenance?.journey));
  const reopened=(await (await api('/api/project?project='+d.id)).json()).document;assert.deepEqual(reopened.workspace.reference,d.workspace.reference);
  const listed=(await (await api('/api/projects')).json()).projects.find(x=>x.id===d.id);assert.equal(listed.template,r.id);assert.equal(listed.confirmedRequirements,0);assert(listed.counts.requirements>0);
 }
 // A project started from a model file (round 6, Contract I; shared/model-interpreter.js): the text the browser read is
 // kept whole as evidence source SRC-nnn of kind model, hashed on the server, the format detected again from the text,
 // model.interpreted keeping the counts only; nothing is drafted; a brief may stand beside it (then the brief is SRC-001).
 const DSL=readFileSync('evaluation/model-fixtures/bike-share.dsl','utf8');
 const fromModel=await api('/api/projects','POST',{name:'Bikes from a model',template:'blank',brief:'',model:{text:DSL,name:'bike-share.dsl',kind:'dsl'}});assert.equal(fromModel.status,201,await fromModel.clone().text());const m=(await fromModel.json()).document;
 const src=m.coauthoring.sources.find(s=>s.kind==='model');
 assert.deepEqual([m.coauthoring.sources.length,src.id,src.kind,src.name,src.format,src.hash,src.text===DSL,src.addedAt],[1,'SRC-001','model','bike-share.dsl','structurizr',sha(DSL),true,m.workspace.createdAt],'the whole model text, hashed on the server, its format detected');
 assert.equal(src.versions[0].status,'Unconfirmed');assert.equal(src.versions[0].title,'Model · bike-share.dsl');assert.equal(src.versions[0].location,'Model file bike-share.dsl read in the browser · structurizr · text SHA-256 '+sha(DSL));assert(DSL.startsWith(src.versions[0].excerpt.slice(0,200)));
 assert.deepEqual(m.model.interpreted,{rules:'model-rules-1',at:m.workspace.createdAt,sourceId:'SRC-001',textHash:sha(DSL),...modelCounts(interpretModel(DSL,{name:'bike-share.dsl',format:'dsl'}))},'model.interpreted keeps the counts of the reading');
 assert.deepEqual([m.model.interpreted.elements,m.model.interpreted.relationships,m.model.interpreted.kinds.container],[26,13,7]);assert(!JSON.stringify(m.model.interpreted).includes('"Trip service"'),'counts only, never the elements');
 assert.equal(m.artefacts.length,0,'interpreting is not drafting: no record is created');assert.equal(m.brief.problem,'');assert.equal(m.brief.interpreted,undefined);
 const both=(await (await api('/api/projects','POST',{name:'Bikes from both',template:'blank',brief:BRIEF,model:{text:DSL,name:'bike-share.dsl',kind:'dsl',format:'structurizr'}})).json()).document;
 assert.deepEqual(both.coauthoring.sources.map(s=>[s.id,s.kind]),[['SRC-001','brief'],['SRC-002','model']],'the brief first, the model beside it');assert.deepEqual([both.brief.interpreted.sourceId,both.model.interpreted.sourceId],['SRC-001','SRC-002']);
 let mr=await (await api('/api/project?project='+m.id)).json();assert.equal(mr.document.coauthoring.sources[0].text,DSL,'the model text survives the store');
 const savedM=await api('/api/commands?project='+m.id,'POST',{revision:mr.revision,command:{type:'brief',payload:{problem:'A brief written later.',goal:'',source:'',confirmed:false}}});assert.equal(savedM.status,200,await savedM.clone().text());
 mr=await (await api('/api/project?project='+m.id)).json();assert.equal(sha(mr.document.coauthoring.sources[0].text),mr.document.coauthoring.sources[0].hash,'the kept model still matches its hash after a save');assert.deepEqual(mr.document.model.interpreted,m.model.interpreted,'a brief written later leaves the model as it was read');
 for(const [body,message] of [[{name:'Ref with model',template:'bank-payment',model:{text:DSL,name:'b.dsl',kind:'dsl'}},/starts a blank project/],[{name:'Not a model',template:'blank',model:{text:'Just some notes about bikes.',name:'notes.txt',kind:'txt'}},/not read as a model/],[{name:'Nothing in it',template:'blank',model:{text:'workspace {\n model {\n }\n}\n',name:'empty.dsl',kind:'dsl'}},/no element was read/],[{name:'Empty model',template:'blank',model:{text:'  ',name:'b.dsl',kind:'dsl'}},/holds text/],[{name:'No name',template:'blank',model:{text:DSL,name:'',kind:'dsl'}},/Name the model file/],[{name:'PDF model',template:'blank',model:{text:DSL,name:'b.pdf',kind:'pdf'}},/\.dsl, \.xml/],[{name:'Extra key',template:'blank',model:{text:DSL,name:'b.dsl',kind:'dsl',hash:'smuggled'}},/unsupported shape/],[{name:'Not an object',template:'blank',model:DSL},/unsupported shape/],[{name:'Over the limit',template:'blank',model:{text:'x'.repeat(MODEL_LIMIT+1),name:'b.dsl',kind:'dsl'}},/2,000,000 characters/]]){const r=await api('/api/projects','POST',body);assert.equal(r.status,400,JSON.stringify(body).slice(0,60));assert.match((await r.json()).error,message);}
 const modelPath=(await (await api('/api/projects','POST',{name:'Model path name',template:'blank',model:{text:DSL,name:'C:\\Users\\me\\bike-share.dsl',kind:'dsl'}})).json()).document;assert.equal(modelPath.coauthoring.sources[0].name,'bike-share.dsl','a path never reaches the project');
 const madrText=readFileSync('evaluation/model-fixtures/bike-share-decision.md','utf8'),madrP=(await (await api('/api/projects','POST',{name:'From a decision record',template:'blank',model:{text:madrText,name:'decision.md',kind:'md'}})).json()).document;assert.deepEqual([madrP.model.interpreted.format,madrP.model.interpreted.kinds],['madr',{alternative:3,decision:1}],'a .md is read as MADR');
 const list=await(await api('/api/projects')).json();assert(list.projects.some(p=>p.id===id));assert(!JSON.stringify(list).includes('baselines'));
 if(preview){await mkdir('.aiw-local',{recursive:true});await writeFile('.aiw-local/journey-qa.json',JSON.stringify({projectId:id,referenceId:reference.document.id,requirement,app,logical,driver,decision,environment},null,2));console.log('Preview fixture project: '+id);}
 console.log('PASS Projects: authenticated creation/listing, owner and project isolation, blank and fresh reference semantics, the three reference journeys created from their template ids (each drafted from its own kept brief, titled with its own name, nothing confirmed), a project started from a typed or file brief (the text kept whole as SRC-001 with its server-side SHA-256, the goal the first outcome the brief states in its own words or empty, the file named with its hash, counts of the interpretation kept and nothing drafted, kept through saves; 20,000-character limit and the 4,044,000-byte body bound; brief file shapes refused), a project started from a model file (the text kept whole as a model source with its server-side SHA-256 and detected format, counts kept and nothing drafted, beside a brief or alone, kept through saves; a file that is no model, a reference template, bad shapes and 2,000,000+ characters refused; a MADR .md read), zero false progress, a saved authoring path through all 11 chapters, current-reference handoffs, 9 downstream impact groups, CAS protection, frozen model snapshots, named Markdown/HTML exports, and formatted model/traceability output.');
}finally{DB.close();}
