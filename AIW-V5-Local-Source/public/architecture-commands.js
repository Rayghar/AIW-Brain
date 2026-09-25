import {architectureModel} from './architecture-model.js';
export const ARCHITECTURE_EDIT_TYPES={requirement:'artefact',outcome:'artefact',actor:'artefact',journey:'artefact',constraint:'artefact',assumption:'artefact',context:'artefact',task:'process.element',gateway:'process.element',event:'process.element',account:'process.element',quality:'quality.driver',decision:'decision.save',module:'logical.group',responsibility:'logical.responsibility',component:'realisation.component',capability:'technology.capability',technology:'techrealisation.plan',contract:'interfaces.contract',data:'interfaces.data',party:'interfaces.party',threat:'security.threat',control:'security.control',environment:'runtime.environment',zone:'runtime.zone',runtime:'runtime.plan',instance:'runtime.placement'};
// Quick edits keep the domain command's complete allocation set. Missing arrays
// mean removal in those domain commands, so a generic record spread is unsafe.
export function architectureEditCommand(p,id,fields){
 const o=architectureModel(p).objects.get(id),type=ARCHITECTURE_EDIT_TYPES[o?.type];if(!type)throw Error('Edit this specialised object in its chapter.');
 const allowed=new Set(['title','question','purpose','description','context','rationale','scenario','owner','groupId']);if(Object.keys(fields).some(k=>!allowed.has(k)))throw Error('Use the chapter editor for structural or review attributes.');
 const payload={...structuredClone(o.record),...fields};
 if(type==='realisation.component')payload.allocations=p.logical.mappings.filter(m=>m.physicalId===id).map(m=>({logicalId:m.logicalId,scope:m.scope}));
 if(type==='technology.capability')payload.mappings=p.technology.mappings.filter(m=>m.capabilityId===id).map(m=>({needId:m.needId,scope:m.scope}));
 if(type==='techrealisation.plan')payload.mappings=p.technologyRealisation.mappings.filter(m=>m.realizationId===id).map(m=>({capabilityId:m.capabilityId,scope:m.scope}));
 return {type,payload};
}
