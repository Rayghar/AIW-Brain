import {applyCommand} from './requirements-domain.js';
import {applyQualityCommand} from './quality-domain.js';
import {applyDecisionCommand} from './decisions-domain.js';
import {applyLogicalCommand} from './logical-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {applyTechnologyCommand} from './technology-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {applyInterfacesCommand} from './interfaces-domain.js';
import {applySecurityCommand} from './security-domain.js';
import {applyRuntimeCommand} from './runtime-domain.js';
import {withFinalReview} from './review-domain.js';
import {applyProcessCommand} from './process-model.js';

// Only ordinary design edits can be staged. Review, approval, adoption and
// evidence commands retain their own explicit authority and validation gates.
export const STAGED_COMMANDS=new Set(['brief','artefact','relationship','deleteRelationship','process.element','process.transition','process.claim','quality.driver','decision.save','decision.alternative','logical.responsibility','logical.group','logical.connection','logical.mapping','realisation.component','realisation.interaction','technology.needs','technology.capability','technology.dependency','technology.boundary','techrealisation.plan','techrealisation.option','techrealisation.connection','interfaces.contract','interfaces.data','interfaces.field','interfaces.party','interfaces.lineage','security.threat','security.control','runtime.environment','runtime.zone','runtime.plan','runtime.placement','runtime.path']);
export function applyCanonical(input,command,at=new Date().toISOString()){
 if(!STAGED_COMMANDS.has(command?.type))throw Error('This action must use its chapter review workflow.');
 const handlers={process:applyProcessCommand,quality:applyQualityCommand,decision:applyDecisionCommand,logical:applyLogicalCommand,realisation:applyRealisationCommand,technology:applyTechnologyCommand,techrealisation:applyTechnologyRealisationCommand,interfaces:applyInterfacesCommand,security:applySecurityCommand,runtime:applyRuntimeCommand};
 const result=(handlers[command.type.split('.')[0]]||applyCommand)(structuredClone(input),command,at);
 result.document=withFinalReview(result.document);return result;
}
