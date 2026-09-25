import {nativePackage} from '../public/model-exchange.js';
// A real source row, explicit design hypotheses, and the production domain
// pipeline. Output is a reviewable starter plus a hypothetical eleven-chapter
// preview. No real architect acceptance, provider call or measurement occurs.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createProject} from '../public/projects-domain.js';
import {openWorkbook,sha256} from '../public/workbook-reader.js';
import {guessHeader,sheetHeaders,suggestMapping,mapWorkbookRows,previewIntake,applyIntake} from '../public/intake-domain.js';
import {applyCanonical} from '../public/canonical-command.js';
import {applyArchitectureCaseCommand,caseContextBasis,evaluateArchitectureCase} from '../public/architecture-case.js';
import {applyArchitectureCommand} from '../public/architecture-design.js';
import {assessInteraction,architectureReasoningMarkdown} from '../public/architecture-knowledge.js';
import {previewAlternative,applyAlternativeCommand} from '../public/model-alternatives.js';
import {compileCreation} from '../public/guided-creation.js';
import {exportSDD,sddHTML} from '../public/review-domain.js';
import {logicalGraph} from '../public/logical-domain.js';
import {sourceAssurance} from '../public/assurance-domain.js';
import {intelligencePacket} from '../public/intelligence-context.js';
import {previewRecovery} from '../recovery-service.js';
import {deliveryJourney,objectReasoning} from '../public/architecture-journey.js';
import {architectureModel} from '../public/architecture-model.js';

const input=process.env.AIW_WORKBOOK,out=process.env.AIW_DESIGN_OUTPUT;
if(!input||!out)throw Error('Set AIW_WORKBOOK and AIW_DESIGN_OUTPUT. Generated files contain private workbook data.');
const at=new Date().toISOString(),bytes=new Uint8Array(await readFile(input)),hash=await sha256(bytes);
assert.equal(hash,'0cf67cb88fcf1232ac0fd2855c1b76bf2220b7b2fda595407e0f5cc202675b6c','Review a changed workbook before using this case.');
const book=await openWorkbook(bytes),sheet=await book.sheet('11 Requirement Detail'),headerRow=guessHeader(sheet),mapped=mapWorkbookRows(sheet,headerRow,suggestMapping(sheetHeaders(sheet,headerRow)));
const row=mapped.rows.find(r=>r.externalId==='PGL-066');assert.equal(row.sourceRow,1073);assert.equal(row.fields.description,'Notify customers with new repayment schedule after modification');
const source={...mapped,rows:[row],datasetId:'seabaas-notification-scope',revision:1,filename:path.basename(input),uploadId:'seabaas-original',workbookHash:hash,sheet:sheet.name,headerRow,snapshotKey:'seabaas-case/source-r1.json'};
let p=createProject({name:'SEABaaS · notification design exploration',template:'blank'},'seabaas-notification-exploration',at);
const intake=previewIntake(p,source,[]);p=applyIntake(p,source,intake,{reviewed:true,previewStamp:intake.stamp},at,'AIW case preparation').document;
const requirement=p.artefacts[0];assert.equal(requirement.confirmed,false);assert(sourceAssurance(p.artefacts).findings.some(f=>f.code==='source-conflict'));
const apply=(type,payload)=>{const result=applyCanonical(p,{type,payload},at);p=result.document;return result.selected;};
apply('brief',{problem:'Explore the obligation to notify customers after a repayment schedule changes. The workbook delivery assertion and completion comment require reconciliation.',goal:'Develop a reviewable notification design and its verification obligations.',source:requirement.source,confirmed:false});
apply('quality.driver',{title:'Recover notification intent after interruption · proposed',category:'recoverability',requirementIds:[requirement.id],stimulus:'Proposed failure case: publication is interrupted after a repayment schedule changes.',conditions:'Workload, outage duration and acceptable notification delay have not been agreed.',response:'Proposed: retain the original schedule-change identity and reconcile notification delivery after recovery.',metric:'Unreconciled committed schedule changes',operator:'At most',targetValue:'',unit:'changes',window:'To agree with Credit Operations',measurement:'Reconcile schedule revisions, publication intent, channel acknowledgements and customer-visible delivery. Inject failures at commit, publish and acknowledgement.',priority:'Important',rationale:'Explore the risk of an updated schedule without a corresponding notification; business priority requires confirmation.',owner:'Unassigned',confirmed:false,targetConfirmed:false});
p=applyArchitectureCaseCommand(p,{type:'case.save',payload:{title:'Repayment schedule change → customer notification',purpose:'Review PGL-066 and compare best-effort publication with durable intent. The design below is an AIW-authored hypothesis; delivery policy, owners, targets and implementation remain unconfirmed.',requirementIds:[requirement.id],basis:caseContextBasis(p)}},at,'AIW case preparation').document;
const arc=(type,payload={})=>{const t=p.coauthoring.designTasks?.at(-1),r=applyArchitectureCommand(p,{type,payload:{id:t?.id,taskRevision:t?.revision,...payload}},at);p=r.document;return r.selected;};
arc('architecture.start',{topic:'delivery',requirementId:requirement.id,driverId:p.quality.drivers[0].id});
arc('architecture.answers',{answers:{
 owner:'Unassigned',deliveryContract:'required',commitScope:'same-store',duplicates:'deduplicated',ordering:'per-key',
 information:'DESIGN HYPOTHESIS: the repayment-schedule authority owns the revision; notification workers record delivery state without rewriting financial terms.',
 commitPlan:'PROPOSED: commit the changed schedule revision and a publication intent with an immutable change ID in one local transaction. Validate that the actual write path supports this boundary.',
 relayPlan:'PROPOSED: claim committed intent, publish using the original change ID, acknowledge publication, and recover abandoned claims. A crash after publish can repeat delivery.',
 retentionPlan:'PROPOSED: retain pending intent, bound admission, isolate poison work and reconcile before replay. Retention and backlog limits require agreement.',
 lossPlan:'Best-effort publication is a credible simpler alternative only if stakeholders explicitly accept missed notifications and provide a reconciliation procedure.',
 failure:'PROPOSED: distinguish schedule modification, channel acceptance and customer receipt. Reconcile an uncertain outcome before replay; do not promise exactly-once customer delivery without channel evidence.',
 reason:'Explore durable intent under the explicit hypothesis that committed schedule changes require eventual notification. This adds relay, backlog and duplicate-handling work; no operating improvement is measured.',
 trustName:'Proposed loan notification boundary',trustPolicy:'PROPOSED: scoped service identities; only the schedule authority writes intent, the relay publishes, and the notification worker consumes. Review tenant and customer authorization.',
 processorTitle:'Repayment schedule authority',storeTitle:'Schedule and publication-intent store',relayTitle:'Notification publication relay',queueTitle:'Schedule-change delivery queue',consumerTitle:'Customer notification worker',
 dataScope:'Repayment schedule revision',classification:'Restricted',retention:'Proposed restricted retention; policy and deletion periods to be agreed.',isolation:'Proposed tenant/customer-scoped access; minimize event fields and logs.'
 }});
const task=p.coauthoring.designTasks.at(-1),best=assessInteraction(p,task,'best-effort-publish'),direct=assessInteraction(p,task,'direct-delivery');assert(best.blockers.some(b=>b.id==='delivery-loss'));assert(direct.blockers.some(b=>b.id==='delivery-loss'));
arc('architecture.prepare',{optionId:'transactional-outbox'});
const alternative=p.modelAlternatives.records.at(-1),preview=previewAlternative(p,alternative),starter=structuredClone(p);
assert.equal(starter.realisation.components.length,0);assert.equal(starter.decisions.records.length,0);assert.equal(starter.finalReview.baselines.length,0);
const journey=deliveryJourney(starter,requirement.id);assert(journey.conflict);assert.deepEqual(journey.options.map(x=>x.option.id),['direct-delivery','best-effort-publish','transactional-outbox']);assert.equal(journey.report.eligibleSignedRepositoryClaims,0);
const packet=intelligencePacket(starter,{objectId:p.quality.drivers[0].id,chapter:2,mode:'mind',architectureTaskId:task.id,prompt:'Explain the publication alternatives, source uncertainty and unanswered design obligations.'});
assert(packet.sources.some(s=>s.kind==='workbook-row'&&s.location.endsWith('D1073')));assert(packet.sources.some(s=>s.kind==='architecture-case'));

// Exercise acceptance only in a disposable hypothetical projection. The
// downloadable starter retains the unaccepted alternative and original source.
p=applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Offline scenario runner (hypothetical)',reason:'Verify the domain transition only. This is not an architect decision or production evidence.'}},at).document;
const applied=p.coauthoring.designTasks.at(-1),find=title=>p.realisation.components.find(c=>c.title===title),processor=find('Repayment schedule authority'),consumer=find('Customer notification worker'),queue=find('Schedule-change delivery queue');assert(processor&&consumer&&queue);
assert.equal(p.decisions.records[0].alternatives.length,3);assert(objectReasoning(p,deliveryJourney(p,queue.id),queue.id,queue).decision);assert(architectureModel(p).relationships.some(e=>e.type==='scopes'&&e.to===queue.id));
const compile=(chapter,answers)=>{const q=compileCreation(p,chapter,answers,at);p=q.document;return q;};
const cap=p.technology.capabilities.find(c=>c.category==='messaging');
compile(7,{capabilityId:cap.id,title:'Notification transport implementation comparison',operationsPlan:'Compare managed and operated messaging against retention, recovery, identity and workload evidence. No vendor has been selected.',lifecyclePlan:'Require schema compatibility, replay tests, export/reconciliation and a reversible cutover before migration.',optionA:'Provider-managed durable messaging · product unselected',operatingA:'Provider managed',optionB:'Team-operated durable messaging · product unselected',operatingB:'Self managed',owner:'Unassigned'});
compile(8,{from:queue.id,to:consumer.id,title:'Repayment schedule change notification',kind:'event',purpose:'PROPOSED: deliver a schedule-change reference and retrieve authorized current details without exposing unnecessary financial terms.',operation:'schedule.changed',dataTitle:'Schedule-change notification envelope',authorityId:processor.id,classification:'Restricted',failurePolicy:'Retain the original change ID, reconcile uncertain channel acceptance and control duplicate customer notifications; investigate poison entries.',authorization:'Authorize the consumer for the tenant and customer. Establish channel permissions and credential scope.',owner:'Unassigned'});
const contract=p.interfaces.contracts.at(-1);
compile(9,{targetId:contract.id,title:'Schedule information reaches the wrong customer',category:'Data disclosure',scenario:'Threat hypothesis: a forged, replayed or incorrectly routed event selects another customer or tenant.',consequence:'Unauthorized disclosure of repayment details and misleading customer communication.',priority:'High',priorityBasis:'Proposed severity based on confidentiality and incorrect-recipient consequences; risk owner must assess likelihood and treatment.',controlTitle:'Validate recipient authority before delivery',controlCategory:'Identity & access',mechanism:'Bind the immutable change identity to tenant, schedule revision and authorized customer. Resolve recipient details through the authoritative service and reject mismatches.',verificationPlan:'Test wrong-tenant, wrong-customer, altered revision and repeated identity cases. Retain rejected examples and authorized delivery evidence.',owner:'Unassigned'});
compile(10,{assetId:consumer.id,title:'Notification recovery exercise · proposed',stage:'Pre-production design',zone:'Proposed application zone',failureDomain:'Unverified test failure domain',replicas:'1',minReady:'1',readiness:'Only admit delivery with valid scoped credentials, reachable authoritative lookup and available bounded queue consumption.',rollback:'Stop consumption and preserve intent on recipient mismatch, reconciliation failure or incompatible schema. Restore the last compatible worker and reconcile before resuming.',runbook:'PROPOSED: pause delivery, preserve original IDs, investigate uncertain channel results, repair the fault and replay with authorization and duplicate controls. Owner and rehearsal remain open.',owner:'Unassigned'});
compile(11,{summary:'HYPOTHETICAL DESIGN PREVIEW for one SEABaaS source requirement, PGL-066. No real architect acceptance, independent knowledge release, production deployment or quality measurement is represented.',scope:'Repayment schedule-change notification only. The workbook says Delivered and also says the notification fix is yet to be completed. Reconcile release, scope and evidence before treating either assertion as current delivery proof.',approach:'Compare best-effort publication with a local transaction retaining notification intent. Durable intent is explored under an unconfirmed required-delivery hypothesis; typed choices, data classification, owners and replica count are proposals for review. Reuse actual existing services if their authority and contracts fit.',audience:'Credit Operations, solution architects, security and operations reviewers',owner:'Unassigned'});
p=applyCanonical(p,{type:'logical.group',payload:{title:'Notification scope · proposed',purpose:'PROPOSED boundary for this review case. The workbook does not establish the actual production module boundary.'}},at).document;const proposedGroup=p.logical.groups.at(-1);for(const r of [...p.logical.responsibilities])p=applyCanonical(p,{type:'logical.responsibility',payload:{...r,groupId:proposedGroup.id}},at).document;
const hypothetical=evaluateArchitectureCase(p,{requirementIds:[requirement.id]}),rowReport=hypothetical.rows[0];
for(const key of ['quality','decisions','logicalApplication','applicationRealization','logicalTechnology','technologyRealization','interfaces','data','security','runtime'])assert(rowReport.linkedStages[key].length>0,key+' must be connected to the source requirement');
assert.equal(p.artefacts[0].confirmed,false);assert.equal(p.quality.drivers[0].targetConfirmed,false);assert.equal(p.finalReview.baselines.length,0);assert.equal(p.decisions.records[0].status,'draft');
const changed=structuredClone(starter);changed.artefacts[0].description+=' Changed source.';assert.throws(()=>previewAlternative(changed,changed.modelAlternatives.records[0]),/changed|source|current/i);
const withdrawn=structuredClone(starter);withdrawn.knowledge??={};withdrawn.knowledge.withdrawals??=[];withdrawn.knowledge.withdrawals.push({targetId:task.methodReceipt.packId,reason:'Synthetic withdrawal check',at});assert.throws(()=>previewAlternative(withdrawn,withdrawn.modelAlternatives.records[0]),/changed|source|current|withdrawn/i);

const binary=(kind,key,data,extra={})=>({kind,key,...extra,hash:null,bytes:data.length,body:Buffer.from(data).toString('base64')});
const snapshot=new TextEncoder().encode(JSON.stringify(source)),files=[binary('workbook','seabaas-case/original.xlsx',bytes,{metadata:{id:source.uploadId,filename:source.filename,sha256:hash,bytes:bytes.length,created_at:at}}),binary('snapshot',source.snapshotKey,snapshot,{originalKey:source.snapshotKey})];
for(const f of files)f.hash=await sha256(Buffer.from(f.body,'base64'));
const pack={schema:'aiw.recovery.v1',at,project:starter,revision:1,files,audit:{},authority:'AIW-authored exploratory case. Imported source assertions and proposed conditions are unconfirmed. No real architecture acceptance or verified measurement.'};
pack.checksum=await sha256(new TextEncoder().encode(JSON.stringify(pack)));const recovery=await previewRecovery(pack);assert.equal(recovery.files,2);
const report={at,status:'passed',scope:'One real requirement; hypothetical design transitions, not independent architectural validation',source:{hash,sheet:sheet.name,row:row.sourceRow,externalId:row.externalId,cell:'D1073'},sourceQuestion:{delivery:row.fields.delivery,comments:row.fields.comments},starter:{requirements:1,confirmed:0,proposedAlternatives:starter.modelAlternatives.records.length,components:0,acceptedDecisions:0,baselines:0},preview:{linkedStages:Object.fromEntries(Object.entries(rowReport.linkedStages).map(([k,v])=>[k,v.length])),components:p.realisation.components.length,relationships:logicalGraph(p).edges.length,baseline:null,eligibleSignedClaims:hypothetical.eligibleSignedRepositoryClaims},checks:['Original workbook and selected row retained with hashes and cell address','Source delivery/comment inconsistency remains unresolved','Direct and queued delivery are distinct and conflict with the declared required-delivery hypothesis','Outbox model, rationale and cross-chapter links preview through Chapter 11','Downloadable starter leaves the model alternative unaccepted','Changed source and withdrawn method block old model preview','Recovery package validates both original files'],limits:['No live Sol/OpenAI call; hypotheses authored by Codex through the existing domain engine','No independently approved repository claims','No actual measured quality result','Replica count, ownership, typed conditions and implementation require architect review']};
await mkdir(out,{recursive:true});
await writeFile(path.join(out,'AIW-SEABaaS-Hypothetical-Model.json'),JSON.stringify(await nativePackage({...p,name:'SEABaaS · hypothetical notification design'}, {scopeId:proposedGroup.id,concern:'realization'})));
await writeFile(path.join(out,'AIW-SEABaaS-Notification-Starter.json'),JSON.stringify(pack));
const intro='# Hypothetical SEABaaS design preview\n\nThis is a projected design for review. The downloadable AIW starter preserves the unaccepted alternative. No real architect approval, achieved target or production implementation is asserted.\n\n';
const markdown=intro+architectureReasoningMarkdown(applied)+exportSDD(p);
await writeFile(path.join(out,'AIW-SEABaaS-Design-Preview.html'),sddHTML(markdown,logicalGraph(p)));
await writeFile(path.join(out,'AIW-v53-SEABaaS-Design-Verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
