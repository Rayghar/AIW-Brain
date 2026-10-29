import {applyCommand} from './requirements-domain.js';
import {applyQualityCommand} from './quality-domain.js';
import {applyDecisionCommand} from './decisions-domain.js';
import {applyLogicalCommand} from './logical-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {applyTechnologyCommand,TECHNOLOGY_LIFECYCLE} from './technology-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {applyInterfacesCommand,INTERFACES_LIFECYCLE} from './interfaces-domain.js';
import {applySecurityCommand} from './security-domain.js';
import {applyRuntimeCommand,RUNTIME_LIFECYCLE} from './runtime-domain.js';
import {applyRecordLifecycleCommand} from './record-lifecycle.js';
import {withFinalReview,applyFinalReviewCommand} from './review-domain.js';
import {applyProcessCommand} from './process-model.js';
import {documentCopy,handOver} from './document-memo.js';
import {resolveGroupAliases} from './requirement-groups.js';
// The roadmap's commands (round 6, Contract S): review.plateau, review.plateau-remove and review.plateau-assign, with
// review.action carrying plateauId. They are registered here with the rest and are not staged: each is applied through
// review-domain.js's command path (applyFinalReviewCommand), where its checks live, under the worker's revision check,
// like every other review.* command. applyCanonical refuses them, as it refuses every review command but the SDD
// narrative and a delivery action, which are authoring and are staged since round 12 (GR-GOV-16), through the same
// command path and its checks.
export {ROADMAP_COMMANDS} from './roadmap-domain.js';

// Only ordinary design edits can be staged. Review, approval, adoption and
// evidence commands retain their own explicit authority and validation gates.
// Round 12 (GR-GOV-16): seven authoring commands a drafted design needs in one reviewed change are staged too: a quality
// conflict, the SDD narrative, a decision's working choice and its conflict, a realisation's draft preference and an
// option's assessment, and a delivery action. Each keeps the gates of its own command path; none approves or accepts.
const BATCHED=['quality.conflict','review.narrative','decision.choose','decision.conflict','techrealisation.preference','techrealisation.assessment','review.action'];
export const STAGED_COMMANDS=new Set([...BATCHED,'brief','artefact','relationship','deleteRelationship','process.element','process.transition','process.claim','process.remove','quality.driver','decision.save','decision.alternative','logical.responsibility','logical.group','logical.connection','logical.mapping','realisation.component','realisation.interaction','technology.needs','technology.capability','technology.dependency','technology.boundary','techrealisation.plan','techrealisation.option','techrealisation.connection','interfaces.contract','interfaces.data','interfaces.field','interfaces.party','interfaces.lineage','interfaces.invariant','security.threat','security.control','runtime.environment','runtime.zone','runtime.plan','runtime.placement','runtime.path',
 // Round 12 (D-13, GR-GOV-23): retiring a record of any chapter, restoring it, and keeping or dismissing AIW's proposals
 // are design edits too, through the one lifecycle family.
 'record.retire','record.restore','record.keep']);
// The rules each chapter gives the one lifecycle family (record-lifecycle.js), by collection: what a keep records, what
// leaves the scope with a plan, what may stop a restore. The family's one entry point, for the Worker and for staging.
// Sent on their own, the seven keep the path their pages always gave them (no change review before the save); the
// workbench asks for a person's change review of a single edit only for the other staged commands, as before.
export const BATCH_ONLY=new Set(BATCHED);
export const reviewsOnItsOwn=type=>STAGED_COMMANDS.has(type)&&!BATCH_ONLY.has(type);
export const LIFECYCLE_RULES=Object.freeze({...TECHNOLOGY_LIFECYCLE,...INTERFACES_LIFECYCLE,...RUNTIME_LIFECYCLE});
export const applyRecordCommand=(input,command,at=new Date().toISOString(),actor='')=>applyRecordLifecycleCommand(input,command,at,actor,LIFECYCLE_RULES);
// The per-chapter commands round 12 first gave AIW's proposals (D2) and retired for the one family (GR-GOV-23). Nothing
// writes them now and a request that names one is refused as an unknown action; a stored journal that names one (a
// staged alternative saved before, merged later) is read as the family's command: a keep, a retirement with its reason
// and its chapter, or a restore.
const RETIRED_COMMANDS=Object.freeze({'technology.keep-seed':['record.keep',6],'technology.dismiss-seed':['record.retire',6],'technology.restore-seed':['record.restore',6],'interfaces.keep-seed':['record.keep',8],'interfaces.dismiss-seed':['record.retire',8],'interfaces.restore-seed':['record.restore',8],'interfaces.remove-contract':['record.retire',8],'runtime.keep-seed':['record.keep',10],'runtime.dismiss-seed':['record.retire',10],'runtime.restore-seed':['record.restore',10],'runtime.remove-plan':['record.retire',10],'runtime.remove-path':['record.retire',10]});
export const isRetiredCommand=type=>Object.hasOwn(RETIRED_COMMANDS,type);
export function migrateCommand(command){
 if(!command||!isRetiredCommand(command.type))return command;
 const [type,chapter]=RETIRED_COMMANDS[command.type],raw=command.payload||{},ids=Array.isArray(raw.ids)?raw.ids:raw.id!==undefined?[raw.id]:[];
 return {type,payload:{ids,chapter,...(type==='record.retire'?{reason:raw.reason}:{})}};
}
// `actor`: who asks, kept by the commands that record it (round 12: a retirement keeps who retired the record).
// A staged command a stored journal names in its retired form is read as the lifecycle family (migrateCommand).
export function applyCanonical(input,raw,at=new Date().toISOString(),actor=''){
 // A group link sent by a legacy GRP id is stored as the RG id it reads as (round 12, GR-REQ-18).
 const command=resolveGroupAliases(input,migrateCommand(raw));
 if(!STAGED_COMMANDS.has(command?.type))throw Error('This action must use its chapter review workflow.');
 const handlers={process:applyProcessCommand,quality:applyQualityCommand,decision:applyDecisionCommand,logical:applyLogicalCommand,realisation:applyRealisationCommand,technology:applyTechnologyCommand,techrealisation:applyTechnologyRealisationCommand,interfaces:applyInterfacesCommand,security:applySecurityCommand,runtime:applyRuntimeCommand,record:applyRecordCommand,review:applyFinalReviewCommand};
 // One copy per command (round 12): the handler changes it in place and the review sections are completed on it in place,
 // where the handler and withFinalReview each copied it again after a structured clone; the journal's recorded events are
 // shared with the input (document-memo.js documentCopy). Every handler copies its input before it changes anything and
 // never reads the input after, so a document handed over (handOver) is the copy, and one the caller handed over is not
 // copied at all. A handler that answers with another document (one that copies by other means) has it completed on a
 // copy, as before.
 const own=handOver(documentCopy(input));
 const result=(handlers[command.type.split('.')[0]]||applyCommand)(own,command,at,actor);
 if(result.document===own)handOver(own);
 result.document=withFinalReview(result.document);return result;
}
