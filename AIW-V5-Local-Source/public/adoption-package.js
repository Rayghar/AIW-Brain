// The design package of applied mechanisms (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md): what it adds to
// the shared machinery, stated once at the registration point (design-extensions.js; the contract is in
// audit/rc44/build-notes/s0-extensions.md). Its id is the lead's (ruling D8). The server registers it when it starts
// (design-packages.js); the browser when the lazy entry that holds it arrives (architecture-task-ui.js, ruling D7.6),
// which its route stub loads before a document that holds adoptions is first drawn (design-package-routes.js).
//   records   each applied adoption as one object of the built-in type `pattern`, from the package's own collection
//             (ruling D7.2), with addresses, assesses, binds {role, mode} and scopes;
//   layers    `mechanism`, of type pattern, after the built-in layers; its hops read only the package's own relations
//             (ruling D6.3) and are context: an adoption is on the trail of the requirement it addresses and of the
//             requirements its bound records serve, and on no spine, so no governance check reads it;
//   checks    the findings of the applied adoptions, with Chapter 5's;
//   commands  five steps, each a signed-in person's; adoption.accept is a second person's, on the projection
//             acceptanceSubject answers (rulings D1, D7.1);
//   track     the tracker (ruling D4): a change of a record an applied adoption rests on is recorded in its commit;
//   provenance the collection is read by the provenance reader and the SDD's reading of who wrote the records; an
//             adoption leaves through adoption.withdraw, not through the lifecycle family;
//   upgrade   applied guided design tasks become adoptions (design §e.3).
import {registerExtension} from './design-extensions.js';
import {applyAdoptionCommand,acceptanceOf,adoptionFindings,emitAdoptions,adoptionRelation,trackAdoptionChange} from './adoption-domain.js';
import {upgradeAdoptions} from './adoption-upgrade.js';
const step={apply:applyAdoptionCommand,person:true};
registerExtension({
 id:'p40-adoption',
 records:emitAdoptions,
 layers:{mechanism:'pattern'},
 hops:[{layer:'mechanism',types:['addresses'],from:['requirement'],dir:'in',ctx:true,only:adoptionRelation},
  {layer:'mechanism',types:['binds','scopes'],from:['responsibility','component','capability','realization','contract','data','plan','control'],dir:'in',ctx:true,only:adoptionRelation}],
 checks:{5:adoptionFindings},
 commands:{'adoption.reassess':step,'adoption.deviation':step,'adoption.obligation':step,'adoption.withdraw':step,'adoption.accept':{apply:applyAdoptionCommand,second:acceptanceOf}},
 track:trackAdoptionChange,
 provenance:{nouns:{'adoptions.records':'applied mechanism'},paths:{adoption:['adoptions.records']},records:{'adoptions.records':5}},
 designKeys:['adoptions'],
 upgrade:upgradeAdoptions,
 upgradeNote:'Guided designs that were applied are now kept as adoption records, each applied and not yet accepted by a second person.'
});
