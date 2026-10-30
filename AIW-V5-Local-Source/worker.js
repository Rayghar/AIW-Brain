import {prepareRepositoryPacket} from './repository-packet.js';
import {publicMessage,isIntegrityError,isInternalError} from './error-message.js';
import {handleRepositorySync,repositorySyncRequest,refreshRepositoryAssurance} from './repository-sync.js';
import {handleOperations} from './operation-service.js';
import {handleRecovery} from './recovery-service.js';
import {handleOrganizations,refreshOrganizationAssurance} from './organization-service.js';
import {handleObjects,activityStatement} from './object-service.js';
import {handleLifecycle,instantiateTemplate} from './project-lifecycle.js';
import {applyFeedbackCommand,deliveryExchange} from './public/delivery-feedback.js';
import {applyProcessCommand} from './public/process-model.js';
import {projectIdentity,handleCollaboration} from './collaboration-service.js';
import {applyArchitectureCaseCommand} from './public/architecture-case.js';
import {attachActionUndo,applyActionUndoCommand} from './public/action-undo-domain.js';
import {applyValidationConfirmationCommand} from './public/validation-confirmation-domain.js';
import {applyWorkbenchCommand} from './public/workbench-domain.js';
import {notationDiagram,CHAPTER_SCENES} from './public/notation-model.js';
import {sddFigures} from './public/sdd-figures.js';
import {appDate} from './public/util.js';
import {applyStandardsCommand,exportSpecification} from './public/standards-domain.js';
import {applyGuideCommand} from './public/chapter-guide.js';
import {handleIntake} from './intake-service.js';
import {queryRequirements} from './requirement-storage.js';
import {applyAssuranceCommand} from './public/assurance-domain.js';
import {acquireRepositorySource} from './knowledge-service.js';
import {handleRepositoryCorpus} from './knowledge-repository.js';
import {handleRepositoryTransfer} from './repository-transfer.js';
import {applyKnowledgeCommand} from './public/knowledge-governance.js';
import {journeyIndex} from './public/journey-context.js';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {applyLensCommand} from './public/domain-lens.js';
import {handleIntelligence,adoptSavedIntelligence,savedRun} from './intelligence-service.js';
import {handleDrafting} from './drafting-service.js';
import {handleBaselines} from './baseline-service.js';
import {RECORD_COLLECTIONS,supported,sparkFields,recordOf,refExists,commandsOfPrefix,SUGGESTION_SOURCES,MAX_SUGGESTIONS,applyCoauthorCommand,carriedRecordId,singletonId,addedRecordId} from './public/field-suggestions.js';
import {intelligenceStatus} from './intelligence-provider.js';
import {applyBrainCommand} from './public/brain-authoring.js';
import {applySecurityDesignTask} from './public/security-design.js';
import {applyExchangeTask} from './public/exchange-design.js';
import {applyDesignCommand} from './public/design-task-domain.js';
import {applyAlternativeCommand} from './public/model-alternatives.js';
import {applyModelImpact,trackModelChange} from './public/model-impact.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {applyModelReconciliation} from './public/model-reconciliation.js';
import {applyInterfaceImpact,trackInterfaceChange} from './public/interface-impact.js';
import {applyChangeCommand,trackRequirementChanges,changedRequirementIds,quietChanges,JOURNAL_PAGE,journalView,withJournalView} from './public/changes-domain.js';
import {changeJournalPage,changeJournalMarkdown,changeJournalCSV} from './change-journal.js';
import {hydrateEvents,foldChange} from './journal-archive.js';
import {storageUpgradeNeeded,storeStorageUpgrade} from './storage-upgrade.js';
// Who or what wrote each commit and record (round 12, D-06): the commit's author, what a draft or an agent may not do,
// and the records the commit wrote, stamped as its (authorship.js, public/provenance.js).
import {commitAuthor,accountKind,refuseUnreviewable,activityTitle,versionBrief} from './authorship.js';
import {stampAuthorship,innerCommands,attachProvenanceBlocks} from './public/provenance.js';
import {cachedBuild,exportKey} from './export-cache.js';
import {documentCopy,handOver,memoPass} from './public/document-memo.js';
// The server's fast paths (journal sharing in documentCopy, the runtime's SHA-256) and sameJSON (round 12).
import {sameJSON} from './server-runtime.js';
import {trackDecisionChange} from './public/decision-impact.js';
import {createProject,requirementImpact} from './shared/projects-domain.js';
import {BRIEF_LIMIT} from './shared/brief-interpreter.js';
import {MODEL_LIMIT} from './shared/model-interpreter.js';
import {sha256} from './public/workbook-reader.js';
import {withFinalReview,applyFinalReviewCommand,exportReviewPackage,exportSDD,sddHTML,sddTitle} from './public/review-domain.js';
import {arsMarkdown,arsJSON} from './public/ars-document.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {sddDocument,sddEdition,sddPackage,frozenFigureSet,figuresAnnex} from './public/sdd-document.js';
import {zipFiles} from './public/model-exchange.js';
import {requirementRegisterMarkdown,requirementRegisterCSV,requirementRegisterPage,traceabilityMatrixCSV,traceabilityMatrix,ANNEXES} from './public/sdd-annexes.js';
import {componentSpecsAnnex} from './public/component-spec-document.js';
import {makeReviewDOCX,vectorFigures} from './public/review-documents.js';
import {makeReviewPDF,pdfPageNumbers} from './public/review-pdf.js';
import {readStoredProject,saveStoredProject,storedSummary,listedProject,openBaseline,wholeProject,withLastBaselineSource,BASELINE_PARTS} from './project-storage.js';
import {applyRuntimeCommand,runtimeFindings,runtimeReviewCurrent,exportRuntimeMarkdown} from './public/runtime-domain.js';
import {applySecurityCommand,securityFindings,securityReviewCurrent,exportSecurityMarkdown} from './public/security-domain.js';
import {applyInterfacesCommand,interfaceFindings,interfaceReviewCurrent,exportInterfacesMarkdown} from './public/interfaces-domain.js';
import {applyTechnologyRealisationCommand,technologyRealisationFindings,realizationReviewCurrent,exportTechnologyRealisationMarkdown} from './public/technology-realisation-domain.js';
import {applyTechnologyCommand,technologyFindings,technologyReviewCurrent,exportTechnologyMarkdown} from './public/technology-domain.js';
import {applyRealisationCommand,realisationFindings,realisationReviewCurrent,exportRealisationMarkdown} from './public/realisation-domain.js';
import {seedProject,applyCommand,PROJECT_ID,findings,exportMarkdown} from './public/requirements-domain.js';
import {applyRequirementsCommand,journalBase} from './public/requirement-commands.js';
import {applyRecordCommand} from './public/canonical-command.js';
import {resolveGroupAliases} from './public/requirement-groups.js';
import {applyQualityCommand,qualityFindings,qualityReviewCurrent,exportQualityMarkdown} from './public/quality-domain.js';
import {applyDecisionCommand,decisionFindings,decisionReviewCurrent,exportDecisionsMarkdown} from './public/decisions-domain.js';
import {applyLogicalCommand,logicalGraph,logicalFindings,logicalReviewCurrent,exportLogicalMarkdown} from './public/logical-domain.js';
import {json} from './http.js';
// The pattern catalogue is a lazily loaded store in the browser (public/catalogue-store.js, round 2 I2-20); the
// server always has it, installed here when the Worker starts.
import {BRAIN_CATALOGUE} from './public/brain-catalogue.js';
import {installCatalogue} from './public/catalogue-store.js';
// Documents whose records keep copies of what they read are upgraded to fingerprints on read (round 12, D-04): the
// upgrade registers itself with withFinalReview here, on the server only.
import './public/readings-upgrade.js';
installCatalogue(BRAIN_CATALOGUE);
const log=(event,details)=>console.error(JSON.stringify({at:new Date().toISOString(),event,...details}));
// Command types reach their domain module by prefix (round 2, B2-05): one registry instead of a ternary chain, and
// a type whose prefix no module owns is refused before the project is loaded. A domain still refuses an unknown
// type within its prefix, and the payload must be an object (or absent, for parameterless actions) so that a
// malformed request can never blank fields through a domain's defaults.
// Every handler is called (document, command, at, actor, {author}): the commit's author (authorship.js) for the handlers
// that record it (a reviewed workspace change keeps it in its history); the others take the first four.
const COMMAND_HANDLERS=[['action.',applyActionUndoCommand],['validation.',applyValidationConfirmationCommand],['lens.',applyLensCommand],['feedback.import',applyFeedbackCommand],['coauthor.',applyCoauthorCommand],['workspace.diagram-arrangement',(p,c,at,actor,options)=>applyWorkbenchCommand(p,c,at,actor,{...options,diagramNodes:(doc,scene)=>notationDiagram(doc,scene)?.nodes})],['workspace.',applyWorkbenchCommand],['case.',applyArchitectureCaseCommand],['standards.',applyStandardsCommand],['guide.',applyGuideCommand],['assurance.',applyAssuranceCommand],['brain.',applyBrainCommand],['protection.',applySecurityDesignTask],['exchange.',applyExchangeTask],['architecture.',applyArchitectureCommand],['design.',applyDesignCommand],['alternative.',applyAlternativeCommand],['model.apply-impact',applyModelImpact],['evidence.model-bind',applyModelReconciliation],['evidence.model-reconcile',applyModelReconciliation],['evidence.',applyEvidenceCommand],['interfaces.apply-impact',applyInterfaceImpact],['change.',applyChangeCommand],['review.',applyFinalReviewCommand],['process.',applyProcessCommand],['runtime.',applyRuntimeCommand],['security.',applySecurityCommand],['interfaces.',applyInterfacesCommand],['techrealisation.',applyTechnologyRealisationCommand],['technology.',applyTechnologyCommand],['realisation.',applyRealisationCommand],['logical.',applyLogicalCommand],['decision.',applyDecisionCommand],['quality.',applyQualityCommand],['requirements.',applyRequirementsCommand],['record.',applyRecordCommand]];
const COMMAND_PREFIXES=new Set([...COMMAND_HANDLERS.map(([key])=>key.split('.')[0]),'knowledge','intelligence']);
// Round 12 (GR-GOV-17): a record that links requirements by id (a driver, a decision, a responsibility, a component) is
// bounded by how many it links, refused past its domain's limit with the limit named (5,000 requirements), never by the
// characters of the ids; the whole request stays within 500 KB.
const LARGE_COMMAND_PREFIXES=['evidence.model-reconcile','alternative.','design.','exchange.','protection.','architecture.','knowledge.','standards.','workspace.','requirements.','quality.','decision.','logical.','realisation.'];
export function commandHandler(type){for(const [key,handler] of COMMAND_HANDLERS)if(key.endsWith('.')?type.startsWith(key):type===key)return handler;return applyCommand;}
export function commandShape(command){
  if(!command||typeof command!=='object'||typeof command.type!=='string'||!/^[A-Za-z][A-Za-z0-9-]{0,60}(?:\.[A-Za-z][A-Za-z0-9-]{0,60})?$/.test(command.type))return {error:'The project action is incomplete.',code:'invalid_command'};
  if(command.payload!==undefined&&(!command.payload||typeof command.payload!=='object'||Array.isArray(command.payload)))return {error:'The project action payload must be an object.',code:'invalid_payload'};
  // A prefixed type whose prefix no module owns is refused here; an unprefixed type is the requirements domain's to
  // accept or refuse, as before (its refusal is answered with the same code).
  const dot=command.type.indexOf('.');if(dot>=0&&!COMMAND_PREFIXES.has(command.type.slice(0,dot)))return {error:'Unknown project action.',code:'unknown_command'};
  return null;
}
// ---------------------------------------------------------------- accepted field suggestions (round 2, I2-12)
// A command that saves a record may carry `solSuggestions`: the field spark's and the Co-author panel's offers the
// person accepted in the form ({field, source: 'project'|'confirm'|'sol', runId?, suggestionId?, ref?, acceptedBy,
// acceptedAt, edited}). They are checked here, never trusted: the field must be a free-text field of that record type,
// a 'project' or 'confirm' offer must cite a record the project holds, a 'sol' draft must name a completed Sol run of
// this owner and project drafted for that field (or, from Ask Sol, an answer about that record); acceptedBy and
// acceptedAt are the server's, and whether a Sol draft was edited is worked out from the saved run. They are kept on
// the record as provenance.suggestions[] with a history event, and survive later edits (marked superseded when the
// field changes by hand). A form sends them as a JSON string; an array is accepted too.
const SUGGESTION_KEYS=new Set(['field','source','runId','suggestionId','ref','acceptedBy','acceptedAt','edited']);
const NESTED_COMMANDS=new Set(['workspace.apply','alternative.apply','interfaces.apply-impact']);
// The record types a command saves: its own, or for a reviewed proposal or candidate those of its chapter.
export const suggestionTypes=type=>/\.(?:proposal|candidate)$/.test(type)?commandsOfPrefix(type.split('.')[0]):supported(type)?[type]:[];
// Where a command carries suggestions: its payload, a proposal's record, or (stamped, left in place) a reviewed
// change's inner commands. The record is the payload's id (an alternative's is its alternativeId: carriedRecordId).
export function suggestionCarriers(command){
  const out=[],payload=command?.payload;
  if(!payload||typeof payload!=='object')return out;
  if(Object.hasOwn(payload,'solSuggestions'))out.push({type:command.type,recordId:carriedRecordId(command.type,payload),raw:payload.solSuggestions,holder:payload,strip:true,nested:false});
  if(payload.record&&typeof payload.record==='object'&&Object.hasOwn(payload.record,'solSuggestions'))out.push({type:command.type,recordId:carriedRecordId(command.type,payload.record),raw:payload.record.solSuggestions,holder:payload.record,strip:true,nested:false});
  if(command.type==='interfaces.field'&&payload.field&&typeof payload.field==='object'&&Object.hasOwn(payload.field,'solSuggestions'))out.push({type:command.type,recordId:carriedRecordId(command.type,payload),raw:payload.field.solSuggestions,holder:payload.field,strip:true,nested:false});
  if(NESTED_COMMANDS.has(command.type))for(const c of command.type==='interfaces.apply-impact'?[payload.command]:Array.isArray(payload.commands)?payload.commands:[])if(c?.payload&&typeof c.payload==='object'&&Object.hasOwn(c.payload,'solSuggestions'))out.push({type:String(c.type||''),recordId:carriedRecordId(String(c.type||''),c.payload),raw:c.payload.solSuggestions,holder:c.payload,strip:false,nested:true});
  return out.map(c=>({...c,types:suggestionTypes(c.type)}));
}
// The shape of one carrier's entries (pure): refused unless every entry is well formed.
export function suggestionEntries(raw,types){
  let entries=raw;
  if(typeof raw==='string'){if(raw.length>20000)throw Error('This change carries too many suggestions.');try{entries=JSON.parse(raw);}catch{throw Error('The suggestions this change carries could not be read.');}}
  if(!Array.isArray(entries))throw Error('The suggestions this change carries must be a list.');
  if(!entries.length)return [];
  if(!types.length)throw Error('This action does not carry field suggestions.');
  if(entries.length>MAX_SUGGESTIONS)throw Error(`A change carries at most ${MAX_SUGGESTIONS} accepted suggestions.`);
  const fields=new Set(types.flatMap(t=>sparkFields(t).map(d=>d.name))),seen=new Set();
  return entries.map(e=>{
    if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).some(k=>!SUGGESTION_KEYS.has(k)))throw Error('A suggestion this change carries has an unsupported shape.');
    if(typeof e.field!=='string'||!fields.has(e.field))throw Error(`“${String(e.field).slice(0,60)}” is not a free-text field of this record.`);
    if(seen.has(e.field))throw Error('A field carries one accepted suggestion at a time.');seen.add(e.field);
    if(!SUGGESTION_SOURCES.includes(e.source))throw Error('A suggestion comes from your project, a confirmation or a Sol draft.');
    if(e.edited!==undefined&&typeof e.edited!=='boolean')throw Error('A suggestion says whether it was edited with true or false.');
    for(const k of ['acceptedBy','acceptedAt'])if(e[k]!==undefined&&(typeof e[k]!=='string'||e[k].length>200))throw Error('A suggestion this change carries has an unsupported shape.');
    if(e.suggestionId!==undefined&&(typeof e.suggestionId!=='string'||!/^[\w:.-]{1,160}$/.test(e.suggestionId)))throw Error('A suggestion this change carries has an unsupported identifier.');
    if(e.source==='sol'){if(typeof e.runId!=='string'||!/^[a-f0-9-]{36}$/.test(e.runId))throw Error('A Sol draft names the run it came from.');if(e.ref!==undefined)throw Error('A Sol draft cites its run, not a record.');}
    else{if(e.runId!==undefined)throw Error('Only a Sol draft names a run.');if(typeof e.ref!=='string'||!e.ref.trim()||e.ref.length>160)throw Error('A suggestion from your project names the record it came from.');}
    return {field:e.field,source:e.source,...(e.runId?{runId:e.runId}:{}),...(e.suggestionId?{suggestionId:e.suggestionId}:{}),...(e.ref?{ref:e.ref.trim()}:{}),edited:e.edited===true};
  });
}
// Against the project and its saved runs: a cited record must exist; a Sol draft must be a completed run of this owner
// and project, accepted by its source checks, for that field (or an Ask Sol answer about this record). Each Sol entry
// learns the run's text.
export async function checkSuggestions(env,owner,projectId,doc,carriers){
  for(const c of carriers)for(const e of c.entries){
    if(e.source!=='sol'){if(!refExists(doc,e.ref))throw Error(`The suggestion for “${e.field}” cites ${String(e.ref).slice(0,60)}, which this project does not hold.`);continue;}
    const run=await savedRun(env,owner,projectId,e.runId);
    if(!run)throw Error('A Sol draft in this change names no completed Sol run of this project.');
    if(run.mode==='field'){
      if(run.request?.field!==e.field||!c.types.includes(run.request?.command))throw Error(`The Sol draft named for “${e.field}” was drafted for another field.`);
      if(c.recordId&&run.request.recordId&&run.request.recordId!==c.recordId)throw Error(`The Sol draft named for “${e.field}” was drafted for another record.`);
      if(run.result?.withheld||!run.result?.value||run.groundingReview?.accepted!==true)throw Error('That Sol draft was withheld by its checks; it cannot be accepted.');
      e.drafts=[run.result.value];
    }else if(['design','author','mind','challenge'].includes(run.mode)){
      if(!c.recordId||run.objectId!==c.recordId)throw Error('A Sol answer fills a field only of the record it was about.');
      // rc41: a withheld answer's text is AIW's own fallback (intelligence-provider.js groundedFallback), not Sol's.
      if(run.groundingReview?.accepted!==true)throw Error('That Sol answer was withheld by its source checks. The text it shows is AIW’s own fallback, not a Sol draft, so it cannot be saved as one.');
      e.drafts=[run.result?.summary,run.result?.passage].filter(v=>typeof v==='string'&&v.trim());
    }else throw Error('This kind of Sol run does not fill a field.');
  }
}
// After a command: a record's accepted suggestions (provenance.suggestions and .history) are the server's alone. A record
// keeps the ones it had before the command (a chapter's save rebuilds the record without them), one whose field has
// since changed by hand is marked superseded, and any a payload tried to bring in are dropped; recordSuggestions then
// adds this command's. Other provenance a domain keeps on a record (an intake row's lineage) is left as it is.
const otherProvenance=v=>{if(!v||typeof v!=='object'||Array.isArray(v))return null;const {suggestions,history,...rest}=v;return Object.keys(rest).length?rest:null;};
// Where the journey drafted a record from (provenance.journey, round 4; written by guide.commit-draft) is the server's
// too: a chapter's save that rebuilds the record keeps it, as it stood before the save (never a payload's copy), and a
// save that changes the record's own fields marks it edited, naming those fields, the way a suggestion is marked
// superseded. Confirming a record, and the bookkeeping a domain does on save, are not edits.
const NOT_EDITS=new Set(['provenance','history','sourceSnapshot','revision','review','reviews','updatedAt','at','stamp','sourceStamp','origin','state','confirmed','targetConfirmed','solSuggestions']);
export function editedFields(old,now){return [...new Set([...Object.keys(old||{}),...Object.keys(now||{})])].filter(k=>!NOT_EDITS.has(k)&&JSON.stringify(old?.[k]??null)!==JSON.stringify(now?.[k]??null)).sort();}
// Round 12 (D-10): where Sol's architecture draft came from (provenance.draft, architecture-drafter.js) is carried the
// same way: a save keeps it; a person's save makes the record the person's (its proposal state goes with the save), and
// the record still says Sol drafted it. A person's change to it is recorded on the mark (edited, the fields, when) by the
// authorship stamp, which knows who sent the change (provenance.js stampAuthorship, for every record kind): a draft Sol
// saves again within its session is not a person's edit (round 12, GR-GOV-25).
function carryJourney(old,now,at){
  for(const key of ['journey','draft']){
    const kept0=old?.provenance?.[key];if(!kept0||typeof kept0!=='object'||Array.isArray(kept0))continue;
    const changed=key==='draft'?[]:editedFields(old,now),kept=changed.length?{...kept0,edited:true,editedFields:[...new Set([...(Array.isArray(kept0.editedFields)?kept0.editedFields:[]),...changed])].slice(0,60),editedAt:at}:kept0;
    now.provenance={...(now.provenance&&typeof now.provenance==='object'&&!Array.isArray(now.provenance)?now.provenance:{}),[key]:kept};
  }
}
// Records the journey drafts but the spark never fills (technology needs) carry their journey provenance the same
// way; they have no suggestions to carry. (A placement is sparked since round 11 and is read with the other records.)
const JOURNEY_ONLY_COLLECTIONS={'technology.needs':p=>p?.technology?.needs};
export function carryProvenance(prior,next,at){
  for(const [,get] of Object.entries(JOURNEY_ONLY_COLLECTIONS)){
    const before=new Map((get(prior)||[]).filter(r=>r&&typeof r==='object'&&r.id).map(r=>[r.id,r]));
    for(const now of get(next)||[]){if(!now||typeof now!=='object'||!now.id)continue;const old=before.get(now.id);if(old&&old!==now)carryJourney(old,now,at);}
  }
  for(const [type,get] of Object.entries(RECORD_COLLECTIONS)){
    const before=new Map((get(prior)||[]).filter(r=>r&&typeof r==='object').map(r=>[singletonId(type)||r.id,r]));
    for(const now of get(next)||[]){
      if(!now||typeof now!=='object')continue;
      const old=before.get(singletonId(type)||now.id);
      if(old===now)continue;
      const rest=otherProvenance(now.provenance),had=old?.provenance&&(Array.isArray(old.provenance.suggestions)||Array.isArray(old.provenance.history));
      if(!had){if(rest)now.provenance=rest;else delete now.provenance;}
      else now.provenance={...rest,suggestions:(old.provenance.suggestions||[]).map(x=>!x.superseded&&String(old[x.field]??'')!==String(now[x.field]??'')?{...x,superseded:true,supersededAt:at}:x),history:old.provenance.history||[]};
      carryJourney(old,now,at);
    }
  }
}
// Stores the accepted suggestions on the records they were accepted for: the record the payload names, else the one
// the command selected (not for a reviewed change's inner command), the single record of its type (the SDD narrative,
// the brief), or the one record of its type the change added (a new conflict or alternative, whose command selects
// nothing or the decision; none when it added several).
export function recordSuggestions(next,carriers,{actor,at,selected=null,prior=null}){
  for(const c of carriers){
    if(!c.entries.length)continue;
    const held=x=>x&&c.types.some(t=>recordOf(next,t,x));
    const id=c.recordId||[c.nested?null:selected,...c.types.map(singletonId),prior?addedRecordId(prior,next,c.types):null].find(held)||null;
    const hit=id?c.types.map(t=>({type:t,record:recordOf(next,t,id)})).find(x=>x.record):null;
    // A reviewed ghost saved as an asset (not a record type the spark serves) keeps no provenance.
    if(!hit){if(c.nested||/\.candidate$/.test(c.type))continue;throw Error('The record these suggestions were accepted for could not be found after saving.');}
    const fields=new Set(sparkFields(hit.type).map(d=>d.name));
    for(const e of c.entries)if(!fields.has(e.field))throw Error(`“${e.field}” is not a free-text field of this record.`);
    delete hit.record.solSuggestions;
    const kept=c.entries.map(e=>({e,value:String(hit.record[e.field]??'').trim()})).filter(x=>x.value);
    if(!kept.length)continue;
    const prov=hit.record.provenance&&typeof hit.record.provenance==='object'?hit.record.provenance:{},fieldsNow=new Set(kept.map(x=>x.e.field));
    const entries=kept.map(({e,value})=>({field:e.field,source:e.source,...(e.ref?{ref:e.ref}:{}),...(e.runId?{runId:e.runId}:{}),...(e.suggestionId?{suggestionId:e.suggestionId}:{}),command:hit.type,acceptedBy:actor,acceptedAt:at,edited:e.source==='sol'?!(e.drafts||[]).some(d=>d.trim()===value):e.edited}));
    hit.record.provenance={...prov,suggestions:[...(prov.suggestions||[]).map(x=>fieldsNow.has(x.field)&&!x.superseded?{...x,superseded:true,supersededAt:at}:x),...entries].slice(-200),history:[...(prov.history||[]),{at,actor,event:'Accepted suggestions',fields:entries.map(x=>x.field),sources:[...new Set(entries.map(x=>x.source))]}].slice(-50)};
  }
}
// The journal and impact records a command's change leaves, and the impact notice it answers with (round 12). The
// requirements are compared once (the impact and the journal used to compare them apart, every requirement each time),
// and only when the command changed what a requirement's comparison reads: its records or the relationships. prior is
// read in one pass, so each of its records is looked up once; next is changed only by the trackers' own additions. The
// same notice and the same journal events, in the same order, as the trackers called one by one
// (command-equivalence-validate.mjs holds the two to each other).
// author: the commit's (authorship.js): completing AIW's proposal, or saving again within one Sol-draft session, opens no
// affected review (changes-domain.js quietChanges, round 12, GR-GOV-11).
export function trackCommandChanges(prior,next,command,at,{author=null}={}){
  const already=next.changes?.events?.length||0;
  // A bulk confirmation journals itself once (requirement-commands.js); its confirmations are not each a change, so the
  // requirements are compared with the project as the journal should see it (journalBase: prior, but for that step).
  const base=journalBase(prior,next,command.type);
  return memoPass(prior,()=>memoPass(base,()=>{
    const changed=sameJSON(base.artefacts,next.artefacts)&&sameJSON(base.relationships,next.relationships)?[]:changedRequirementIds(base,next);
    // The changed requirements are traced in a pass over the changed document too (round 12, PS-03): its records'
    // sources are worked out once, not once per requirement and record.
    const impact=changed.length?memoPass(next,()=>requirementImpact(base,next,at,undefined,changed)):null;
    trackRequirementChanges(base,next,at,requirementImpact,changed);
    trackInterfaceChange(prior,next,command,at);
    trackModelChange(prior,next,command,at);
    trackDecisionChange(prior,next,command,at);
    if(command.type==='workspace.apply')for(const c of Array.isArray(command.payload?.commands)?command.payload.commands:[]){trackModelChange(prior,next,c,at);trackInterfaceChange(prior,next,c,at);}
    quietChanges(prior,(next.changes?.events||[]).slice(already),author);
    return impact;
  }));
}
const RECENT_EVENTS=25;
// The change journal in a sectioned answer (round 12, PS-07): what the command did to it, applied by the client to the
// journal it holds (project-store.js journalAfter) — the changes it removed by their position (the changes the save
// archived, which the journal a client holds leaves out: GR-PERF-13, changes-domain.js journalView), the changes replaced
// by their position after those (a review recorded on its change) and the changes added — rather than the whole journal,
// which at the size of a drafted design was 74 M characters on every answer that touched it. A journal changed otherwise
// is answered whole.
export function journalDelta(before,after){
  const a=before?.events||[],b=after?.events;
  if(!after||!Array.isArray(b))return after;
  const ids=new Set(a.map(e=>e?.id));if(ids.size!==a.length)return after;
  const removed=[],replaced=[];let j=0;
  for(let i=0;i<a.length;i++){if(j<b.length&&a[i]?.id===b[j]?.id){if(a[i]!==b[j]&&!sameJSON(a[i],b[j]))replaced.push([j,b[j]]);j++;}else removed.push(i);}
  const added=b.slice(j);if(added.some(e=>ids.has(e?.id)))return after;
  const {events:_events,...rest}=after;
  return {...rest,delta:{since:a.length,...(removed.length?{removed}:{}),replaced,added}};
}
// Save answers by record (round 12, A3: GR-PERF-12). A section the command changed was answered whole: a batch's answer
// carried the whole workbench with the history of every batch (1.87 M characters on the drafted design) and a requirement
// edit the whole artefacts section (3.5 M). The sections that hold records (DELTA_SECTIONS) are answered as what changed
// in them (`deltas`), applied by the client to the section it holds (project-store.js sectionAfter):
//   {rec: {n, del?, at?, add?}}  an array of records (plain objects, each with its own id): the ids it removed, the
//                                records it replaced (by position, after the removals) and the records it appended; or,
//                                when its order changed otherwise, {rec: {n, ids, put?}}: the ids in order and the
//                                records new or changed;
//   {grow: {since, add}}         an array that only grew (a history): the entries it appended;
//   {obj: {set, del?, keys?}}    an object: each key that changed, as its own delta, the keys it lost, and the order of
//                                its keys when that is not the order the client would make;
//   {val: value}                 anything else, whole.
// A record is sent whole. The client checks what it applies (lengths, ids) and reads the project again when the section
// it holds is not the one the delta was made from. A small section (the brief, the workspace) is answered whole.
const DELTA_SECTIONS=new Set(['artefacts','relationships','workbench','guidance','intake','quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime','finalReview','knowledge','coauthoring']);
const plainValue=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const recordIds=xs=>{const ids=[];for(const x of xs){if(!plainValue(x)||typeof x.id!=='string')return null;ids.push(x.id);}return new Set(ids).size===ids.length?ids:null;};
const writtenKeys=o=>Object.keys(o).filter(k=>o[k]!==undefined&&typeof o[k]!=='function');
// undefined when a and b write the same JSON. Each part of a section is compared once (the route asks no other
// comparison of a section it answers this way).
export function sectionDelta(a,b,depth=0){
  if(a===b)return undefined;
  if(depth<3&&Array.isArray(a)&&Array.isArray(b)){
    const ai=a.length?recordIds(a):null,bi=ai&&b.length?recordIds(b):null;
    if(ai&&bi){const d=recordsDelta(a,b,ai,bi);return d?{rec:d}:undefined;}
    if(b.length>a.length&&a.every((x,i)=>sameJSON(x,b[i])))return {grow:{since:a.length,add:b.slice(a.length)}};
    return sameJSON(a,b)?undefined:{val:b};
  }
  if(depth<3&&plainValue(a)&&plainValue(b)&&typeof a.toJSON!=='function'&&typeof b.toJSON!=='function'){
    const ak=writtenKeys(a),bk=writtenKeys(b),inA=new Set(ak),inB=new Set(bk),set={},del=ak.filter(k=>!inB.has(k));
    for(const k of bk){const d=inA.has(k)?sectionDelta(a[k],b[k],depth+1):{val:b[k]};if(d!==undefined)set[k]=d;}
    const order=[...ak.filter(k=>inB.has(k)),...bk.filter(k=>!inA.has(k))],moved=order.some((k,i)=>bk[i]!==k);
    if(!Object.keys(set).length&&!del.length&&!moved)return undefined;
    return {obj:{set,...(del.length?{del}:{}),...(moved?{keys:bk}:{})}};
  }
  return sameJSON(a,b)?undefined:{val:b};
}
function recordsDelta(a,b,ai,bi){
  const inB=new Set(bi),at=new Map(ai.map((id,i)=>[id,i])),kept=ai.filter(id=>inB.has(id)),del=ai.filter(id=>!inB.has(id));
  if(kept.every((id,i)=>bi[i]===id)&&bi.slice(kept.length).every(id=>!at.has(id))){
    const set=[];for(let i=0;i<kept.length;i++)if(!sameJSON(a[at.get(kept[i])],b[i]))set.push([i,b[i]]);
    if(!del.length&&!set.length&&b.length===kept.length)return null;
    return {n:b.length,...(del.length?{del}:{}),...(set.length?{at:set}:{}),...(b.length>kept.length?{add:b.slice(kept.length)}:{})};
  }
  const put=[];for(const [i,id] of bi.entries()){const j=at.get(id);if(j===undefined||!sameJSON(a[j],b[i]))put.push([id,b[i]]);}
  return {n:b.length,ids:bi,...(put.length?{put}:{})};
}
// A brief of 20,000 characters and a model of 2,000,000 (round 6), each escaped once in JSON (a newline or a quote takes
// two), plus the name and the files' descriptions: 4,044,000 bytes. createProject holds each text to its own limit.
export const PROJECT_BODY_LIMIT=2*BRIEF_LIMIT+2*MODEL_LIMIT+4000;
// Opt-in (round 2, B2-03): ?changes=recent answers with the newest journal events only; the full journal stays the
// default until the client adopts GET /api/changes for older pages. The server always reasons over the whole journal.
// A project answered (a read, a save's whole answer) carries the journal without its archived changes (round 12, GR-PERF-13:
// changes-domain.js journalView); ?changes=recent trims it further to its newest changes.
const recentJournal=(view,url)=>{const document=withJournalView(view),events=document.changes?.events;if(url.searchParams.get('changes')!=='recent'||!Array.isArray(events)||events.length<=RECENT_EVENTS)return document;return {...document,changes:{...document.changes,events:events.slice(-RECENT_EVENTS),eventCount:events.length,truncated:true}};};
async function health(env){const checks={};try{const row=await env.DB.prepare('SELECT 1 AS ok').first();checks.database=row?.ok===1?'ok':'failed';}catch{checks.database='failed';}checks.files=env.FILES?'ok':'missing';const ok=Object.values(checks).every(v=>v==='ok');return json({status:ok?'ok':'degraded',checks,provider:{configured:intelligenceStatus(env).configured},at:new Date().toISOString()},ok?200:503);}
// The SDD (round 12, workstream F; audit/round12/SDD-SPEC.md): edition=architecture|executive (default architecture; a link
// that asks for the retired full edition opens the architecture edition), audience=all|delivery|review, format=md|html|
// json|docx|pdf (view=1 opens the HTML, and is the HTML when no format is named), figures=svg (the default)|none|mermaid
// (Markdown only). Word and PDF are built here from the same Markdown, as the browser builds them: Word embeds each figure
// as its vector SVG, the PDF names each figure where it stands (it draws no SVG). JSON carries the edition's structure,
// figures, open items, provenance and status, and the project document only when asked (embed=project). annex=
// requirements|matrix|specifications|registers serves the registers Appendix D lists, page= a page of the register. A
// frozen baseline is served as it was frozen, for everyone. Nothing here changes the project or approves anything.
// Round 12 (D-11, A2): an edition, its HTML, Word and PDF and each annex are built once per project revision and kept
// (export-cache.js: the local server's export thread keeps them; elsewhere each request builds). `key(parts)` names the
// project revision; the parts name what was asked: the baseline, the edition and audience, the figures (svg, none or
// Mermaid each kept apart), the format, the annex and its page. JSON is written per request: it says when it was exported.
const SDD_TYPES={md:'text/markdown; charset=utf-8',html:'text/html; charset=utf-8',json:'application/json; charset=utf-8',csv:'text/csv; charset=utf-8',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pdf:'application/pdf',zip:'application/zip'};
// The figures annex (round 12, the lead's decision on figure heights): every figure of section 5, drawn in HTML, as SVG files
// with their manifest in a zip (each file at the top of the zip, under the name its manifest entry gives), and in
// Markdown; its PDF names each figure where the server cannot draw it, and the browser's PDF draws them
// (review-documents.js).
const ANNEX_FORMATS={requirements:['md','csv','json','html'],matrix:['csv','json'],specifications:['md','html'],registers:['md','html'],figures:['md','html','zip','pdf']},ANNEX_FILES={requirements:'Requirement_Register',matrix:'Traceability_Matrix',specifications:'Component_Specifications',registers:'Review_Registers',figures:'Figures_Annex'};
// A project read carries a frozen baseline's metadata, not its parts (round 12, A3: GR-STO-02, GR-PERF-13): open(entry,
// names) reads the parts a format needs, each checked against its SHA-256 (project-storage.js openBaseline); lastSource(p)
// reads the last baseline's design source for "changes since the last baseline" when an edition is built; whole() is the
// project with its journal and its baselines whole, for a JSON that carries the project (embed=project).
async function sddExport(project,url,filename,{env=null,key=()=>null,open=null,whole=null,lastSource=null}={}){
  const q=k=>url.searchParams.get(k),view=q('view')==='1',annex=q('annex'),format=q('format')||(view?'html':annex==='matrix'?'csv':'md'),baselineId=q('baseline')||null,
    kept=(parts,build)=>cachedBuild(env,key([baselineId,...parts]),build),
    keptAsync=async(parts,build)=>{const cache=env?.EXPORT_CACHE,k=key([baselineId,...parts]);if(!cache)return build();if(cache.has(k))return cache.get(k,()=>null);const value=await build();return cache.get(k,()=>value);},headers=(type,name,inline=false)=>({headers:{'Content-Type':type,'Content-Disposition':(inline?'inline':'attachment')+'; filename="'+name+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'"}});
  if(annex){
    if(!ANNEXES.includes(annex))return json({error:'Choose an annex: requirements, matrix, specifications, registers or figures.'},400);
    if(!ANNEX_FORMATS[annex].includes(format))return json({error:'This annex is served as '+ANNEX_FORMATS[annex].join(', ')+'.'},400);
    const page=Math.max(1,Number(q('page'))||1),paged=annex==='requirements'&&format!=='csv';
    if(annex==='figures'){
      const A=kept(['annex','figures'],()=>figuresAnnex(project)),file=filename+'_'+ANNEX_FILES.figures+'.'+format;
      if(format==='zip'){const base=path=>String(path).split('/').pop();const zip=zipFiles([...A.figures.figures.map(f=>({name:base(f.path),text:f.svg})),{name:'manifest.json',text:JSON.stringify({schema:A.figures.schema,documentFingerprint:A.figures.documentFingerprint,figures:A.figures.manifest.map(m=>({...m,path:base(m.path)}))},null,2)}]);return new Response(await zip.arrayBuffer(),headers(SDD_TYPES.zip,file));}
      const body=format==='md'?A.markdown:format==='html'?kept(['annex','figures','html'],()=>sddHTML(A.markdown,null,{figures:A.figures})):kept(['annex','figures','pdf'],()=>makeReviewPDF(A.markdown,project.name+' Solution Design — figures annex'));
      return new Response(body,headers(SDD_TYPES[format],file,format==='html'&&view));
    }
    const md=()=>annex==='requirements'?requirementRegisterMarkdown(project,{page}):annex==='specifications'?componentSpecsAnnex(project):exportSDD(project,null);
    const body=format==='csv'?kept(['annex',annex,'csv'],()=>annex==='matrix'?traceabilityMatrixCSV(project):requirementRegisterCSV(project)):format==='json'?JSON.stringify(annex==='matrix'?{exportedAt:new Date().toISOString(),document:'traceability-matrix',project:{id:project.id,name:project.name},rows:traceabilityMatrix(project)}:{exportedAt:new Date().toISOString(),document:'requirement-register',...requirementRegisterPage(project,{page})},null,2):kept(['annex',annex,format,paged?page:null],()=>format==='html'?sddHTML(md(),null,{figures:{figures:[],manifest:[],omitted:[]}}):md());
    return new Response(body,headers(SDD_TYPES[format],filename+'_'+ANNEX_FILES[annex]+(paged?'_p'+page:'')+'.'+format,format==='html'&&view));
  }
  const figures=q('figures')||null;
  if(figures&&!['svg','none','mermaid'].includes(figures))return json({error:'Figures are drawn as SVG (figures=svg), left out (figures=none), or written as Mermaid (figures=mermaid).'},400);
  if(figures==='mermaid'&&(format!=='md'||baselineId))return json({error:'Mermaid figures are for the Markdown edition of the working SDD (format=md).'},400);
  if(!SDD_TYPES[format]||format==='csv')return json({error:'Choose Markdown, HTML, JSON, Word (docx) or PDF.'},400);
  let choice;try{choice=sddEdition(url.searchParams);}catch(e){return json({error:e.message},400);}
  const {edition,audience}=choice;let frozen=baselineId?project.finalReview.baselines.find(b=>b.id===baselineId):null;
  if(baselineId&&!frozen)return json({error:'The selected baseline does not exist.'},404);
  if(frozen&&(edition!=='architecture'||audience!=='all'))return json({error:'A frozen baseline is kept as it was frozen, for everyone. Choose the working SDD for another edition or audience.'},400);
  const suffix=(edition==='executive'?'_Executive':'')+(audience==='delivery'?'_Delivery':audience==='review'?'_Review':'')+(figures==='mermaid'?'_Mermaid':''),title=project.name+' Solution Design'+(edition==='executive'?' — executive edition':'');
  const name=filename+'_'+(baselineId||'Working_SDD')+suffix+'.'+format;
  const mode=figures==='mermaid'?'mermaid':figures==='none'?'none':'svg',asked=frozen?['frozen']:[edition,audience,mode];
  // A frozen baseline's parts are read when it is exported, only those its format needs: its frozen SDD, and for its HTML
  // the model and design source its figures are drawn from again; its JSON carries the baseline whole.
  let held=project;
  if(frozen?.frozen&&open){frozen=await open(frozen,format==='json'?BASELINE_PARTS:format==='html'?['markdown','model','source']:['markdown']);held={...project,finalReview:{...project.finalReview,baselines:project.finalReview.baselines.map(b=>b.id===baselineId?frozen:b)}};}
  let markdown,doc=null;
  if(frozen)markdown=exportSDD(held,baselineId);
  else{const built=env?.EXPORT_CACHE?.has(key([baselineId,...asked]))||!lastSource?project:await lastSource(project);doc=kept(asked,()=>sddDocument(built,{edition,audience,figures:mode==='mermaid'?'mermaid':mode==='svg'}));markdown=doc.markdown;}
  let body;
  if(format==='md')body=markdown;
  else if(format==='html')body=kept([...asked,'html'],()=>sddHTML(markdown,frozen?frozen.model||logicalGraph(frozen.source):logicalGraph(project),{figures:(frozen?frozen.source?frozenFigureSet(frozen.source,frozen):null:doc.figures)||{figures:[],manifest:[],omitted:[]}}));
  else if(format==='json')body=JSON.stringify(frozen?exportReviewPackage(held,baselineId):{exportedAt:new Date().toISOString(),title:sddTitle(project),...sddPackage(project,doc),markdown,...(q('embed')==='project'?{project:await whole(),connectedModel:logicalGraph(project),guidance:'An edition of the working SDD with the project document it was assembled from and its connected model; no independent evidence verification.'}:{guidance:'An edition of the working SDD, assembled by rule from the saved records; the project document travels only when asked (embed=project). No independent evidence verification.'})},null,2);
  else if(format==='docx')body=await keptAsync([...asked,'docx'],()=>makeReviewDOCX(markdown,title,{figures:mode==='none'?new Map():vectorFigures(markdown),pages:pdfPageNumbers(markdown,title)}));
  else body=kept([...asked,'pdf'],()=>makeReviewPDF(markdown,title));
  return new Response(body,headers(SDD_TYPES[format],name,format==='html'&&view));
}
// Round 26 (D-26-13): a chapter register's Markdown by chapter, the file name each is served under, the first line every
// register, the ARS and a specification carry after their title (the project revision and the date, appDate), and the
// chapter's own picture for a register's HTML view (its first scene, drawn by sdd-figures.js within the figure budget;
// a chapter whose picture cannot be drawn gets none, and the view says so).
const REGISTER_FILES={1:'Requirements',2:'Quality_Drivers',3:'Decisions',4:'Logical_Model',5:'Application_Realisation',6:'Logical_Technology',7:'Technology_Realization',8:'Interfaces_Data',9:'Security',10:'Deployment_Runtime'};
function registerMarkdown(project,chapter){switch(chapter){case 2:return exportQualityMarkdown(project);case 3:return exportDecisionsMarkdown(project);case 4:return exportLogicalMarkdown(project);case 5:return exportRealisationMarkdown(project);case 6:return exportTechnologyMarkdown(project);case 7:return exportTechnologyRealisationMarkdown(project);case 8:return exportInterfacesMarkdown(project);case 9:return exportSecurityMarkdown(project);case 10:return exportRuntimeMarkdown(project);default:return exportMarkdown(project);}}
export function stampDocument(markdown,revision,at=new Date()){const line='Project revision '+(revision??'not recorded')+' · '+appDate(at)+' · a working snapshot of the saved records; nothing here is approved by being written down.';const lines=String(markdown??'').split('\n'),i=lines.findIndex(l=>/^# /.test(l));if(i<0)return line+'\n\n'+lines.join('\n');lines.splice(i+1,0,'',line);return lines.join('\n').replace(/\n{3,}/g,'\n\n');}
function registerFigures(project,chapter){const scene=CHAPTER_SCENES[chapter]?.[0];if(!scene)return {figures:[],manifest:[],omitted:[]};try{return sddFigures(project,{chapters:[chapter],scenes:[scene]});}catch(e){console.warn('The register\'s picture could not be drawn.',e?.message);return {figures:[],manifest:[],omitted:[{chapter,scene,title:scene,reason:'The picture could not be drawn: '+(e?.message||'unknown')}]};}}
async function route(request,env,ctx){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(url.pathname==='/api/health'&&request.method==='GET'){if(!env.DB)return json({status:'degraded',checks:{database:'missing'}},503);return health(env);}
  const actor=request.headers.get('oai-authenticated-user-id');let owner=actor;
  if(!owner)return json({error:'Sign in to open your private project.'},401);
  if(!env.DB)return json({error:'Project storage is unavailable. Your input has not been discarded.',code:'storage_unavailable'},503);
  const projectId=url.searchParams.get('project')||PROJECT_ID;
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(projectId))return json({error:'Choose a valid project.'},400);
  try{
    // An agent or service account reviews and approves nothing (round 12, GR-GOV-12): not an organisation library entry,
    // not a release of one.
    if(url.pathname==='/api/organizations'&&request.method==='POST'&&['review','releases'].includes(url.searchParams.get('action'))&&accountKind(env,actor)==='agent')return json({error:'An agent or service account does not review or release library entries. A person signs in to do that.',code:'authorship'},403);
    if(url.pathname==='/api/organizations')return await handleOrganizations(request,env,actor,projectId);
    const identity=await projectIdentity(env,actor,projectId);owner=identity.owner;
    // An agent or service account is never a person (round 12, GR-GOV-12): its account kind travels with its identity.
    identity.account=accountKind(env,actor);
    if(['/api/connections','/api/jobs','/api/operations'].includes(url.pathname))return await handleOperations(request,env,identity,projectId,ctx);
    if(url.pathname==='/api/recovery')return await handleRecovery(request,env,identity,projectId);
    if(['/api/discussions','/api/activity','/api/graph'].includes(url.pathname))return await handleObjects(request,env,identity,projectId);
    if(url.pathname==='/api/lifecycle')return await handleLifecycle(request,env,identity,projectId);
    if(['/api/access','/api/reviews','/api/attachments'].includes(url.pathname))return await handleCollaboration(request,env,identity,projectId);
    // Due signed repository notices are applied before a workbench reads the project (throttled). Applying them
    // writes a project revision, so only an owner's or editor's workbench asks for it (round 2, B2-08); a reader's
    // request is answered without a write and the client reads on regardless.
    if(url.pathname==='/api/knowledge/corpus'&&request.method==='POST'&&url.searchParams.get('view')==='notices'){if(!['owner','editor'].includes(identity.role))return json({status:'not-applied',reason:'Repository notices are applied by the project owner or an editor.',code:'role'},403);return await handleRepositoryCorpus(request,env,identity,projectId);}
    if(!['owner','editor'].includes(identity.role)&&request.method!=='GET')return json({error:'This project role permits reading and assigned reviews only.',code:'role'},403);
    if(url.pathname==='/api/intake')return await handleIntake(request,env,identity,projectId);
    // Sol's architecture draft as a job with a receipt, previewed and applied as one reviewed step (round 12, D-10).
    if(url.pathname==='/api/drafting')return await handleDrafting(request,env,identity,projectId,ctx);
    // A baseline frozen as a job with a receipt, and its parts read when it is opened (round 12, GR-STO-02).
    if(url.pathname==='/api/baselines')return await handleBaselines(request,env,identity,projectId,ctx);
    if(url.pathname==='/api/requirements'&&request.method==='GET'){
      const row=await env.DB.prepare('SELECT index_stamp,document FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'This project is unavailable.'},404);
      return json(await queryRequirements(env,owner,projectId,url.searchParams,row.index_stamp?null:(await readStoredProject(env,owner,row.document)).document));
    }
    if(url.pathname.startsWith('/api/intelligence/'))return await handleIntelligence(request,env,owner,projectId);
    if(url.pathname==='/api/projects'&&request.method==='GET'){
      // The stored summary (round 2, B2-19); a row written before it has none, and only then is its document read.
      const rows=await env.DB.prepare('SELECT summary,CASE WHEN summary IS NULL THEN document END AS document,revision,updated_at FROM projects WHERE owner_id=? ORDER BY updated_at DESC').bind(actor).all();
      const shared=await env.DB.prepare('SELECT p.summary,CASE WHEN p.summary IS NULL THEN p.document END AS document,p.revision,p.updated_at,a.role FROM projects p JOIN project_access a ON p.owner_id=a.owner_id AND p.id=a.project_id WHERE a.actor_id=? ORDER BY p.updated_at DESC').bind(actor).all();
      return json({projects:[...rows.results.map(r=>({...listedProject(r),role:'owner'})),...shared.results.map(r=>({...listedProject(r),role:r.role}))]});
    }
    if(url.pathname==='/api/projects'&&request.method==='POST'){
      if(request.headers.get('Origin')!==url.origin)return json({error:'Create projects from your private workspace.'},403);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected project details.'},415);
      // A brief of up to 20,000 characters (round 4) and a model of up to 2,000,000 (round 6; the text the browser read,
      // hashed again in createProject). createProject holds each to its own limit.
      const body=await request.text();if(body.length>PROJECT_BODY_LIMIT)return json({error:'Shorten the project brief or model and retry.'},413);
      let input;try{input=JSON.parse(body)}catch{return json({error:'The project details could not be read.'},400)}
      const id='project-'+crypto.randomUUID(),at=new Date().toISOString();let document;
      // The brief text is hashed here, so the evidence source that keeps it carries a hash the server worked out.
      const brief=typeof input?.brief==='string'&&input.brief.length<=BRIEF_LIMIT?input.brief.trim():'',briefHash=brief?await sha256(new TextEncoder().encode(brief)):'';
      try{if(input?.sourceProjectId){const template=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(actor,input.sourceProjectId).first();if(!template)throw Error('Choose your own saved template.');const source=(await readStoredProject(env,actor,template.document)).document;if(!source.workspace?.reusableTemplate)throw Error('Mark the project as a reusable template first.');if(typeof input.name!=='string'||!input.name.trim()||input.name.length>100)throw Error('Give the project a name of 1–100 characters.');document=instantiateTemplate(source,id,input.name.trim(),at);}else document=createProject(input||{},id,at,{briefHash,author:commitAuthor({actor,account:accountKind(env,actor)},input||{})})}catch(e){return json({error:publicMessage(e)},400)}
      const serialized=JSON.stringify(document);await env.DB.prepare('INSERT INTO projects (owner_id,id,document,summary,revision,updated_at) VALUES (?,?,?,?,1,?)').bind(actor,id,serialized,storedSummary(serialized,document,{at}),at).run();
      return json({document,revision:1,updatedAt:at},201);
    }
    if(url.pathname==='/api/project'&&request.method==='GET'){
      // A read never changes a project. The one write here materialises the fixed reference example the first
      // time an account opens it (INSERT OR IGNORE: it cannot alter an existing row). Signed repository
      // revocations are applied by the client's POST ?view=notices just before it reads (knowledge-repository.js).
      if(projectId===PROJECT_ID&&!await env.DB.prepare('SELECT 1 AS found FROM projects WHERE owner_id=? AND id=?').bind(owner,PROJECT_ID).first()){const seedDocument=withFinalReview(seedProject()),seed=JSON.stringify(seedDocument);await env.DB.prepare('INSERT OR IGNORE INTO projects (owner_id,id,document,summary,revision,updated_at) VALUES (?,?,?,?,1,?)').bind(owner,PROJECT_ID,seed,storedSummary(seed,seedDocument,{}),new Date().toISOString()).run();}
      let row=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'This project is unavailable for your account. Return to Projects to choose another.'},404);
      // A project stored before round 12 is stored again, upgraded, the first time it is read (storage-upgrade.js: a
      // storage upgrade, recorded in its activity, its previous version kept for recovery); the reads after it are
      // answered from the upgraded row. A project changed meanwhile by another request is read again as it now is.
      let stored=await readStoredProject(env,owner,row.document);
      if(storageUpgradeNeeded(stored)){
        const upgraded=withFinalReview(stored.document),saved=await storeStorageUpgrade(env,identity,projectId,row,stored,upgraded);
        if(saved){log('storage-upgrade',{owner,project:projectId,from:row.revision,to:saved.revision});return json({document:recentJournal(await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,upgraded)),url),revision:saved.revision,updatedAt:saved.updatedAt});}
        row=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
        if(!row)return json({error:'This project is unavailable for your account. Return to Projects to choose another.'},404);
        stored=await readStoredProject(env,owner,row.document);
      }
      return json({document:recentJournal(await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview(stored.document))),url),revision:row.revision,updatedAt:row.updated_at});
    }
    if(url.pathname==='/api/changes'&&request.method==='GET'){
      // Older journal pages, newest first, keyed by event id (round 2, B2-03): the companion of ?changes=recent.
      const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'This project is unavailable.'},404);
      const stored=await readStoredProject(env,owner,row.document),events=stored.document.changes?.events||[],limit=Math.max(1,Math.min(200,Number(url.searchParams.get('limit'))||50)),before=url.searchParams.get('before');
      let end=events.length;if(before){end=events.findIndex(e=>e.id===before);if(end<0)return json({error:'Choose an existing change event.'},400);}
      // Earlier changes kept in the journal's archive are answered whole (journal-archive.js).
      const start=Math.max(0,end-limit),page=(await hydrateEvents(env,stored.keys.get('__change_journal')?.archive||[],events,start,end)).slice(start,end).reverse();
      return json({events:page,eventCount:events.length,revision:row.revision,next:start>0?page.at(-1).id:null});
    }
    if(url.pathname==='/api/export'&&request.method==='GET'){
      const row=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'Open your project before exporting.'},404);
      // The journal's archive pages (journal-archive.js): read back whole by the annex and by every export a project can be
      // restored from, never by the SDD itself.
      const stored=await readStoredProject(env,owner,row.document),archive=stored.keys.get('__change_journal')?.archive||[];
      const project=await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview(stored.document)));
      const filename='AIW_'+project.name.replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,100);
      if(url.searchParams.get('format')==='delivery')return new Response(JSON.stringify(deliveryExchange(project),null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="'+filename+'_Delivery.json"','Cache-Control':'no-store'}});
      if(url.searchParams.get('chapter')==='8'&&['openapi','asyncapi','schemas','original-spec'].includes(url.searchParams.get('format'))){const kind=url.searchParams.get('format'),spec=exportSpecification(project,kind,url.searchParams.get('source')),suffix={openapi:'OpenAPI',asyncapi:'AsyncAPI',schemas:'Data_Schemas','original-spec':'Original_Specification'}[kind];return new Response(JSON.stringify(spec,null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="'+filename+'_'+suffix+'.json"','Cache-Control':'no-store'}});}
      // Round 11: the documents a chapter produces besides its register, named by document=: the Architecture requirements
      // specification (chapter 2, ars) and one component's specification (chapter 5, spec&id=), as Markdown, HTML (view=1
      // opens it in the browser) or JSON. Read by rule from the saved records; nothing is changed and nothing is approved.
      const named=url.searchParams.get('document');
      // Round 12 (D-05): the change journal, an annex to the SDD (chapter 11, document=changes), a page of 100 changes at a
      // time in the order they were recorded (page=, from 1), as Markdown, CSV or JSON. The SDD prints its summary.
      if(named==='changes'&&url.searchParams.get('chapter')==='11'){
        const format=url.searchParams.get('format')||'md',asked=url.searchParams.get('page');
        if(!['md','csv','json'].includes(format))return json({error:'Choose Markdown, CSV, or JSON.'},400);
        if(asked!==null&&!/^[1-9][0-9]{0,6}$/.test(asked))return json({error:'Choose a page of the change journal by its number, from 1.'},400);
        const count=project.changes?.events?.length||0,pages=Math.max(1,Math.ceil(count/JOURNAL_PAGE)),n=Math.min(Number(asked||1),pages);
        const page=changeJournalPage({...project,changes:{...project.changes,events:await hydrateEvents(env,archive,project.changes?.events||[],(n-1)*JOURNAL_PAGE,n*JOURNAL_PAGE)}},{page:Number(asked||1)});
        if(asked!==null&&Number(asked)>page.pages)return json({error:'The change journal has '+page.pages+' page'+(page.pages===1?'':'s')+'.',pages:page.pages},404);
        const body=format==='json'?JSON.stringify(page,null,2):format==='csv'?changeJournalCSV(page):changeJournalMarkdown(page);
        return new Response(body,{headers:{'Content-Type':format==='json'?'application/json; charset=utf-8':format==='csv'?'text/csv; charset=utf-8':'text/markdown; charset=utf-8','Content-Disposition':'attachment; filename="'+filename+'_Change_Journal_page_'+page.page+'_of_'+page.pages+'.'+format+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
      }
      if(named){
        const view=url.searchParams.get('view')==='1',format=url.searchParams.get('format')||(view?'html':'md');
        if(!['md','json','html'].includes(format))return json({error:'Choose Markdown, JSON, or HTML.'},400);
        let built=null;
        if(named==='ars')built={markdown:()=>arsMarkdown(project),data:()=>arsJSON(project),file:'Architecture_Requirements_Specification'};
        else if(named==='spec'){const doc=componentSpecDocument(project,url.searchParams.get('id')||'');if(!doc)return json({error:'Choose an existing application component (id=).'},404);built={markdown:()=>doc.markdown,data:()=>doc.json,file:'Component_Specification_'+doc.ref.replace(/[^A-Za-z0-9_-]+/g,'_')};}
        if(!built)return json({error:'Choose the requirements specification (document=ars) or a component specification (document=spec&id=).'},400);
        // Round 26 (D-26-13): the first line after the title carries the project revision and the date; the JSON names the revision.
        const body=format==='json'?JSON.stringify({projectRevision:row.revision,...built.data()},null,2):format==='html'?sddHTML(stampDocument(built.markdown(),row.revision),logicalGraph(project)):stampDocument(built.markdown(),row.revision);
        return new Response(body,{headers:{'Content-Type':format==='json'?'application/json; charset=utf-8':format==='html'?'text/html; charset=utf-8':'text/markdown; charset=utf-8','Content-Disposition':(format==='html'&&view?'inline':'attachment')+'; filename="'+filename+'_'+built.file+'.'+format+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'"}});
      }
      // Round 12 (D-11): the SDD's builds are kept per project revision (export-cache.js), keyed by what was asked.
      // A frozen baseline's parts, the last baseline's design source and the project whole are read for it only when
      // asked (round 12, A3: project-storage.js openBaseline, withLastBaselineSource, wholeProject).
      if(url.searchParams.get('chapter')==='11')return await sddExport(project,url,filename,{env,key:parts=>exportKey(owner,projectId,row,project,parts),open:(entry,names)=>openBaseline(env,owner,projectId,entry,names),whole:()=>wholeProject(env,owner,projectId,project,stored.keys),lastSource:p=>withLastBaselineSource(env,owner,projectId,p)});
      // Round 26 (D-26-13): a chapter register comes as Markdown (format=md) or HTML (format=html; view=1 opens it in the
      // browser, as the ARS and the specifications open), its first line after the title carrying the project revision and
      // the date; the HTML view draws the chapter's own picture (sdd-figures.js). Any other format is the whole saved
      // project as JSON, which every Output page offers once without a chapter. Nothing here changes the project.
      const format=url.searchParams.get('format')||'json',chapterN=Number(url.searchParams.get('chapter'))||(format==='md'||format==='html'?1:0);
      if(REGISTER_FILES[chapterN]&&(format==='md'||format==='html')){
        const view=url.searchParams.get('view')==='1',md=stampDocument(registerMarkdown(project,chapterN),row.revision),name=filename+'_'+REGISTER_FILES[chapterN]+'.'+format;
        if(format==='md')return new Response(md,{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':'attachment; filename="'+name+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
        return new Response(sddHTML(md,null,{figures:registerFigures(project,chapterN)}),{headers:{'Content-Type':'text/html; charset=utf-8','Content-Disposition':(view?'inline':'attachment')+'; filename="'+name+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'"}});
      }
      const body=JSON.stringify({exportedAt:new Date().toISOString(),projectRevision:row.revision,project:await wholeProject(env,owner,projectId,project,stored.keys),validation:{reviewedForCurrentRevision:project.review?.contentVersion===project.contentVersion,findings:findings(project)},qualityValidation:{reviewedForCurrentRevision:qualityReviewCurrent(project),findings:qualityFindings(project)},decisionValidation:{reviewedForCurrentRevision:decisionReviewCurrent(project),findings:decisionFindings(project)},logicalValidation:{reviewedForCurrentRevision:logicalReviewCurrent(project),findings:logicalFindings(project)},realisationValidation:{reviewedForCurrentRevision:realisationReviewCurrent(project),findings:realisationFindings(project)},technologyValidation:{reviewedForCurrentRevision:technologyReviewCurrent(project),findings:technologyFindings(project)},technologyRealisationValidation:{reviewedForCurrentRevision:realizationReviewCurrent(project),findings:technologyRealisationFindings(project)},interfacesValidation:{reviewedForCurrentRevision:interfaceReviewCurrent(project),findings:interfaceFindings(project)},securityValidation:{reviewedForCurrentRevision:securityReviewCurrent(project),findings:securityFindings(project)},runtimeValidation:{reviewedForCurrentRevision:runtimeReviewCurrent(project),findings:runtimeFindings(project)},connectedModel:logicalGraph(project),guidance:'Project rules and reviewed proposals; generated records retain their drafting origin',intelligence:intelligenceStatus(env)},null,2);
      return new Response(body,{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="'+filename+'_Project.json"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(url.pathname==='/api/knowledge/corpus')return await handleRepositoryCorpus(request,env,identity,projectId);
    if(url.pathname==='/api/knowledge/repository-transfer'&&request.method==='POST')return await handleRepositoryTransfer(request,env,identity,projectId);
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
      catch(e){return json({error:publicMessage(e)},400);}
    }
    if(url.pathname==='/api/knowledge/repository-sync'&&request.method==='GET'){
      if(!['owner','editor'].includes(identity.role))return json({error:'A project editor is required.'},403);
      const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();if(!row)return json({error:'Project not found.'},404);
      try{return json(repositorySyncRequest((await readStoredProject(env,owner,row.document)).document,{tenantId:owner,projectId,releaseId:url.searchParams.get('release')}));}
      catch(e){return json({error:publicMessage(e)},400)}
    }
    if(url.pathname==='/api/knowledge/repository-sync'&&request.method==='POST')return await handleRepositorySync(request,env,identity,projectId);
    if(url.pathname==='/api/commands'&&request.method==='POST'){
      if(request.headers.get('Origin')!==url.origin)return json({error:'This action must originate from your private workspace.'},403);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a project action.'},415);
      const body=await request.text();if(body.length>4500000)return json({error:'This change is too large. Shorten the fields and try again.',code:'too_large'},413);
      let input;try{input=JSON.parse(body)}catch{return json({error:'The project action could not be read.',code:'invalid_command'},400)}
      if(!input||typeof input!=='object'||!Number.isInteger(input.revision)||!input.command||typeof input.command.type!=='string')return json({error:'The project action is incomplete.',code:'invalid_command'},400);
      const shape=commandShape(input.command);if(shape)return json(shape,400);
      const type=input.command.type;
      if(body.length>500000&&type!=='evidence.model-reconcile')return json({error:'This change is too large. Shorten the fields and try again.',code:'too_large'},413);
      // A baseline is frozen as a job with a receipt and its progress (baseline-service.js), never on a save's request.
      if(type==='review.baseline')return json({error:'A baseline is frozen as a job that reports its progress: freeze it from the review desk.',code:'freeze_job',route:'/api/baselines?action=freeze'},400);
      if(body.length>40000&&!LARGE_COMMAND_PREFIXES.some(prefix=>type.startsWith(prefix))&&type!=='feedback.import')return json({error:'This change is too large. Shorten the fields and try again.',code:'too_large'},413);
      // Who or what writes this commit (round 12, D-06): a person, an import or a draft by Sol, from the signed-in account
      // and what the request says of itself. A draft by Sol and an agent account review, confirm and approve nothing.
      let author;try{author=commitAuthor({actor,account:identity.account},input,input.command);refuseUnreviewable(input.command,author);}catch(e){return json({error:publicMessage(e),code:'authorship'},400);}
      const row=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
      if(!row)return json({error:'Open the project before saving changes.'},404);
      // Idempotency (audit C-27): a retried request carries the same Idempotency-Key. If its first attempt was
      // saved, the retry returns that outcome with the current project instead of a conflict or a second change.
      const idempotencyKey=request.headers.get('Idempotency-Key')||'';
      if(idempotencyKey&&!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey))return json({error:'The request key is not valid. Retry the change from the workbench.'},400);
      const requestHash=idempotencyKey?[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))].map(b=>b.toString(16).padStart(2,'0')).join(''):'';
      if(idempotencyKey){
        const receipt=await env.DB.prepare('SELECT request_hash,revision,selected FROM command_receipts WHERE owner_id=? AND project_id=? AND key=?').bind(owner,projectId,idempotencyKey).first();
        if(receipt){
          if(receipt.request_hash!==requestHash)return json({error:'This request key was already used for a different change. Retry the change from the workbench.'},422);
          const current=await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview((await readStoredProject(env,owner,row.document)).document)));
          return json({document:recentJournal(current,url),selected:JSON.parse(receipt.selected??'null'),revision:row.revision,updatedAt:row.updated_at,replayed:true,savedRevision:receipt.revision});
        }
      }
      if(row.revision!==input.revision)return json({error:'This project changed in another tab or session. Reload the latest project, then apply your preserved changes.',conflict:true,code:'conflict'},409);
      const stored=await readStoredProject(env,owner,row.document);stored.document=await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview(stored.document)));if(stored.document.workspace?.status==='archived')return json({error:'Restore this project before changing its design.',code:'archived'},409);let result;const at=new Date().toISOString();
      // The document as it was, completed once (round 12): what the checks, the provenance and the trackers read, and
      // never change. The command works on its own copy of it (document-memo.js documentCopy: the journal's recorded
      // events are shared, everything else is copied), where each of these used to complete a fresh copy.
      const prior=withFinalReview(stored.document);
      // Round 12 (GR-REQ-18): a group link sent by a legacy GRP id is stored as the RG id it reads as; a batch's staged
      // commands are read so where they are applied (canonical-command.js), under the stamp the person reviewed.
      input.command=resolveGroupAliases(prior,input.command,{skip:['commands']});
      // Accepted field suggestions are checked before the change is applied, and the copies the chapter does not read
      // are taken off the payload (a reviewed change's inner commands keep theirs: their review stamp covers them).
      let carriers;
      try{carriers=suggestionCarriers(input.command).map(c=>({...c,entries:suggestionEntries(c.raw,c.types)}));await checkSuggestions(env,owner,projectId,prior,carriers);}
      catch(e){return json({error:publicMessage(e),code:'invalid_suggestions'},400);}
      for(const c of carriers)if(c.strip)delete c.holder.solSuggestions;
      // A perspective saved on a frozen baseline reads that baseline's design source, read here for the command (a project
      // read carries a baseline's metadata, not its parts: project-storage.js openBaseline).
      const frozenSources=new Map(),viewed=type==='workspace.view'?input.command.payload?.exploration?.baselineId:null,viewedEntry=typeof viewed==='string'?prior.finalReview?.baselines?.find(b=>b.id===viewed):null;
      if(viewedEntry?.frozen)frozenSources.set(viewed,(await openBaseline(env,owner,projectId,viewedEntry,['source'])).source);
      try{if(type==='knowledge.link'&&!journeyIndex(prior).nodes.has(input.command.payload?.objectId))throw Error('Choose an existing object in this project.');const own=documentCopy(prior);result=type==='knowledge.fetch'?await acquireRepositorySource(own,input.command.payload||{},env,actor,at):type.startsWith('knowledge.')?applyKnowledgeCommand(own,input.command,at,actor):type==='intelligence.adopt'?await adoptSavedIntelligence(env,owner,projectId,own,input.command.payload||{},at):type==='workspace.view'?applyWorkbenchCommand(own,input.command,at,actor,{baselineSource:id=>frozenSources.get(id)||null}):commandHandler(type)(own,input.command,at,actor,{author,revision:input.revision});result.document=withFinalReview(result.document===prior?result.document:handOver(result.document));carryProvenance(prior,result.document,at);recordSuggestions(result.document,carriers,{actor,at,selected:result.selected??null,prior});
        // The records the commit wrote are stamped as its, and a brief it changed is kept as a new version of its source.
        stampAuthorship(prior,result.document,type==='evidence.model-reconcile'?{type:'workspace.apply',payload:{commands:result.appliedCommands||[]}}:input.command,result,author,at,{fourEyes:prior.workspace?.governance?.fourEyes===true});attachProvenanceBlocks(prior,result.document,input.command,result);versionBrief(prior,result.document,author,at)}catch(e){const message=publicMessage(e);return json({error:message,...(/^Unknown .* action\.$/.test(message)?{code:'unknown_command'}:{})},400)}
      let impact;
      // The trackers derive journal and impact records from the change; a fault in them is a programming fault
      // (answered as such, round 2, B2-06), never a storage outage.
      try{impact=trackCommandChanges(prior,result.document,type==='evidence.model-reconcile'?{type:'workspace.apply',payload:{commands:result.appliedCommands||[]}}:input.command,at,{author});delete result.appliedCommands;}
      catch(e){log('command-fault',{owner,project:projectId,type,message:String(e?.message||e),stack:typeof e?.stack==='string'?e.stack.split('\n').slice(0,6).join(' | '):null});return json({error:'This action could not be completed. Your input is kept; reload the project and try again.',code:'fault'},500);}
      if(impact)result.document.workspace={...result.document.workspace,lastImpact:impact};
      // Consecutive saves of one record's fields by one person fold into one change (round 12, GR-STO-07: journal-archive.js
      // foldChange), never across author kinds; the activity row names the change they make.
      const folded=foldChange(prior,result.document,actor,at,author.kind);
      // The change journal records who made each change (audit B-18), and since round 12 of what kind and why (GR-GOV-08):
      // the author kind, whether a person stood behind it, and the reason the commit gave; the activity row says the same.
      const journal=folded?[folded]:(result.document.changes?.events||[]).slice(prior.changes?.events?.length||0);
      for(const event of journal){event.actor??=actor;event.authorKind??=author.kind;event.reviewed??=author.reviewed;if(author.reason)event.reason??=author.reason;if(author.account==='agent')event.account??='agent';if(author.session)event.session??=author.session;}
      result=attachActionUndo(prior,result,input.command,{revision:input.revision+1,actor,at});
      const summary=String(input.command.payload?.title||input.command.payload?.name||'').slice(0,160);
      const receipt=stamp=>idempotencyKey?[
        env.DB.prepare('INSERT INTO command_receipts (owner_id,project_id,key,request_hash,revision,selected,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE owner_id=? AND id=? AND index_stamp=?)').bind(owner,projectId,idempotencyKey,requestHash,input.revision+1,JSON.stringify(result.selected??null),at,owner,projectId,stamp),
        env.DB.prepare('DELETE FROM command_receipts WHERE owner_id=? AND project_id=? AND created_at<?').bind(owner,projectId,new Date(Date.now()-86400000).toISOString())]:[];
      const change=await saveStoredProject(env,owner,projectId,result.document,input.revision,at,stored.keys,stamp=>[activityStatement(env,identity,projectId,{at,kind:'model',title:activityTitle(type,author,{count:innerCommands(input.command).length}),command:type,authorKind:author.kind,account:author.account,reviewed:author.reviewed,...(author.reason?{reason:author.reason}:{}),...(summary?{summary}:{}),objectId:result.selected||input.command.payload?.id||null,revision:input.revision+1,...(journal.length?{changeIds:journal.map(e=>e.id)}:{})},stamp),...receipt(stamp)]);
      if(!change.meta?.changes)return json({error:'The project changed while saving. Reload and apply your preserved changes.',conflict:true,code:'conflict'},409);
      // Opt-in (round 2, B2-13): ?response=sections answers with the top-level sections the command changed, for a
      // client that merges them into the document it holds. The full document stays the default response shape.
      // The sections that hold records answer what changed in them (round 12, GR-PERF-12: sectionDelta, `deltas`).
      if(url.searchParams.get('response')==='sections'){const sections={},deltas={};for(const key of new Set([...Object.keys(prior),...Object.keys(result.document)])){if(DELTA_SECTIONS.has(key)&&key in prior&&key in result.document){const d=sectionDelta(prior[key],result.document[key]);if(d===undefined)continue;if(Object.hasOwn(d,'val'))sections[key]=result.document[key];else deltas[key]=d;}else if(!sameJSON(prior[key],result.document[key]))sections[key]=result.document[key];}for(const key of Object.keys(prior))if(!(key in result.document))sections[key]=null;if(sections.changes)sections.changes=journalDelta(journalView(prior.changes),journalView(result.document.changes));return json({selected:result.selected??null,...(result.selectedIds?{selectedIds:result.selectedIds}:{}),sections,...(Object.keys(deltas).length?{deltas}:{}),revision:input.revision+1,updatedAt:at});}
      return json({...result,document:recentJournal(result.document,url),revision:input.revision+1,updatedAt:at});
    }
    return json({error:'Project route not found.'},404);
  }catch(e){
    // Integrity faults are permanent and precise (round 2, B2-06); programming faults are faults; only an adapter that
    // could not be reached is the transient outage the client may retry.
    const base={owner,project:projectId,route:url.pathname,method:request.method,message:String(e?.message||e)};
    if(isIntegrityError(e)){log('integrity-fault',{...base,key:e.key||null});return json({error:e.message,code:'integrity'},422);}
    if(isInternalError(e)){log('fault',{...base,stack:typeof e?.stack==='string'?e.stack.split('\n').slice(0,6).join(' | '):null});return json({error:'This action could not be completed. Your input is kept; reload the project and try again.',code:'fault'},500);}
    log('storage-unavailable',base);return json({error:'We could not reach project storage. Your input is still here; please retry.',code:'storage_unavailable'},503);
  }
}

// Idempotency beyond /api/commands (round 2, B2-20). A POST to one of these routes that carries an Idempotency-Key is
// claimed in route_receipts before it runs, scoped to the caller, the project and the route. A retry of a request that
// succeeded returns the saved answer (header Idempotency-Replayed: true) instead of acting twice; a retry while the
// first is still running is told so (409, code in_progress); the same key for a different request is refused (422). A
// request that fails releases its claim, so it can be retried. A claim left by a server that stopped mid-request is
// taken over after two minutes. /api/commands keeps its own receipts, written in the same batch as the change.
const RECEIPT_ROUTES=new Set(['/api/reviews','/api/discussions','/api/attachments','/api/lifecycle','/api/operations','/api/connections','/api/jobs','/api/intake','/api/access','/api/organizations','/api/recovery']);
const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function withRouteReceipt(request,env,ctx,url){
  const key=request.headers.get('Idempotency-Key'),actor=request.headers.get('oai-authenticated-user-id'),projectId=url.searchParams.get('project')||PROJECT_ID;
  if(!/^[A-Za-z0-9_-]{16,100}$/.test(key))return json({error:'The request key is not valid. Retry from the workbench.',code:'invalid_key'},400);
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(projectId))return route(request,env,ctx);
  const bytes=new Uint8Array(await request.arrayBuffer()),query=new TextEncoder().encode(url.search+'\n'),signed=new Uint8Array(query.length+bytes.length);signed.set(query);signed.set(bytes,query.length);
  const hash=hex(await crypto.subtle.digest('SHA-256',signed)),at=new Date().toISOString(),scope=[actor,projectId,url.pathname,key];
  const claimed=await env.DB.prepare('INSERT OR IGNORE INTO route_receipts (actor_id,project_id,route,key,request_hash,status,response,created_at) VALUES (?,?,?,?,?,0,NULL,?)').bind(...scope,hash,at).run();
  if(!claimed.meta?.changes){
    const receipt=await env.DB.prepare('SELECT request_hash,status,response,created_at FROM route_receipts WHERE actor_id=? AND project_id=? AND route=? AND key=?').bind(...scope).first();
    if(receipt){
      if(receipt.request_hash!==hash)return json({error:'This request key was already used for a different request. Retry from the workbench.',code:'key_reused'},422);
      if(receipt.status===0){
        const abandoned=Date.now()-Date.parse(receipt.created_at)>120000&&(await env.DB.prepare('UPDATE route_receipts SET created_at=? WHERE actor_id=? AND project_id=? AND route=? AND key=? AND status=0 AND created_at=?').bind(at,...scope,receipt.created_at).run()).meta?.changes;
        if(!abandoned)return json({error:'This request is still being processed. Reload to see its outcome before sending it again.',code:'in_progress',conflict:true},409);
      }else{const saved=JSON.parse(receipt.response);return new Response(saved.body,{status:receipt.status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...saved.headers,'Idempotency-Replayed':'true'}});}
    }else if(!(await env.DB.prepare('INSERT OR IGNORE INTO route_receipts (actor_id,project_id,route,key,request_hash,status,response,created_at) VALUES (?,?,?,?,?,0,NULL,?)').bind(...scope,hash,at).run()).meta?.changes)return json({error:'This request is still being processed. Reload to see its outcome before sending it again.',code:'in_progress',conflict:true},409);
  }
  const release=()=>env.DB.prepare('DELETE FROM route_receipts WHERE actor_id=? AND project_id=? AND route=? AND key=? AND status=0').bind(...scope).run();
  let response;
  try{response=await route(new Request(request.url,{method:request.method,headers:request.headers,body:bytes}),env,ctx);}catch(e){await release();throw e;}
  if(response.status<200||response.status>=300){await release();return response;}
  const body=await response.text(),headers={};for(const name of ['content-type','content-disposition'])if(response.headers.get(name))headers[name]=response.headers.get(name);
  await env.DB.prepare('UPDATE route_receipts SET status=?,response=? WHERE actor_id=? AND project_id=? AND route=? AND key=?').bind(response.status,JSON.stringify({headers,body}),...scope).run();
  return new Response(body,{status:response.status,headers:response.headers});
}
export default {async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==='POST'&&RECEIPT_ROUTES.has(url.pathname)&&request.headers.has('Idempotency-Key')&&env.DB&&request.headers.get('oai-authenticated-user-id'))return withRouteReceipt(request,env,ctx,url);
  return route(request,env,ctx);
}};
