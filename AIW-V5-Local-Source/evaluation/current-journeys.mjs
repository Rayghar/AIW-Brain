// Authored evaluation fixtures. They use the native commands and make no claim about
// a customer deployment, product benchmark, confirmed target or production evidence.
import {frozenReference} from './reference-fixtures.mjs';
import {applyCommand} from '../public/requirements-domain.js';
import {applyTechnologyRealisationCommand} from '../public/technology-realisation-domain.js';

export function mysqlMigrationFixture(){
 const at='2026-10-20T00:00:00.000Z';
 let p=frozenReference('service-permits',{name:'Evaluation · existing MySQL service',id:'eval-mysql-migration',at});
 p=applyCommand(p,{type:'brief',payload:{problem:'An existing service uses MySQL. The team is considering PostgreSQL but has not supplied a workload comparison, required extension or failed database capability.',goal:'Assess a proposed database migration against actual architecture drivers and the operating cost of change.',source:'AIW authored regression scenario; no customer or measured production facts.',confirmed:false}},at).document;
 const req=p.artefacts.find(x=>x.type==='requirement');
 p=applyCommand(p,{type:'artefact',payload:{type:'constraint',title:'Justify database migration before replacing the current service',description:'Retain the existing MySQL service until an identified architecture driver or required capability justifies migration and a data conversion, rollback and operational ownership plan is reviewed.',owner:'Evaluation scenario architect',source:'AIW authored migration scenario',priority:'Must',confirmed:false,links:req?[['new','constrains',req.id]]:[]}},at).document;
 const r=p.technologyRealisation.records[0];
 for(const [i,product] of ['MySQL','PostgreSQL'].entries())p=applyTechnologyRealisationCommand(p,{type:'techrealisation.option',payload:{id:r.id,option:{id:r.options[i].id,title:i?'Evaluate PostgreSQL migration':'Retain existing MySQL service',product,version:'',evidence:'Version, topology, service configuration and project workload evidence are not supplied.',benefits:i?'Any proposed capability advantage must be linked to a recorded requirement.':'Preserves the current operating boundary in this authored scenario.',drawbacks:i?'Migration, data conversion, rollback and operating ownership require explicit review.':'Existing capability limits and workload measurements remain to be established.'}}},at).document;
 p=applyTechnologyRealisationCommand(p,{type:'techrealisation.plan',payload:{id:r.id,purpose:'Compare retaining MySQL with a justified PostgreSQL migration.',requirementIds:req?[req.id]:[],rationale:'No database choice is approved in this fixture. Evaluate the recorded constraint and missing evidence.'}},at).document;
 return p;
}
