// The design package of applied mechanisms (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md): what it adds to
// the shared machinery, stated once at the registration point (design-extensions.js; the contract is in
// audit/rc44/build-notes/s0-extensions.md). Its id is the lead's (ruling D8). The browser registers it when the lazy
// entry that holds it arrives (architecture-task-ui.js, ruling D7.6), which its route stub loads before a document that
// holds adoptions is first drawn (design-package-routes.js). The server registers the same object with its read
// upgrade (adoption-server.js, the line of design-packages.js): the browser upgrades no document, so the upgrade and
// the built-in skeletons it reads stay out of the browser's entry (ruling J12).
//   prefixes  ADP, the id prefix the package mints for the built-in type `pattern` (ruling J10);
//   records   each adoption as one object of that type, from the package's own collection (ruling D7.2), with
//             addresses, assesses, binds {role, mode} and scopes, each only to an object of the graph (ruling J2);
//   layers    `mechanism`, of type pattern, after the built-in layers; its hops read only the relations of an applied
//             adoption (ruling D6.3) and are context: an adoption is on the trail of the requirement it addresses and
//             of the requirements its bound records serve, and on no spine, so no governance check reads it;
//   checks    the findings of the applied adoptions, with Chapter 5's, where the bound records are;
//   commands  three steps, each a signed-in person's; adoption.accept is a second person's, on the projection
//             acceptanceSubject answers (rulings D1, D7.1, J1). adoption.obligation and adoption.withdraw are held
//             back to the slices that move their readers (ruling J6);
//   track     the tracker (rulings D4, J5): a change of a record an applied adoption rests on is recorded in its
//             commit and journalled, with who sent the commit;
//   provenance the collection is read by the provenance reader and the SDD's reading of who wrote the records, under
//             the chapter of its object type (ruling J12); an adoption does not retire through the lifecycle family;
//   design    what an adoption says to the design fingerprint, in place of the raw key (ruling J3).
// Slice S5 adds the five steps of a component selection (adoption-selection.js): start and candidate may be a draft by
// Sol's proposal; judge, choose and instantiate are a signed-in person's. A selection is a Chapter 3 decision, written
// through the chapter's own handler; it has no accept step of its own: the profile it instantiates is an adoption,
// which a second person accepts (adoption.accept).
import {registerExtension} from './design-extensions.js';
import {applyAdoptionCommand,acceptanceOf,adoptionFindings,adoptionDesign,emitAdoptions,adoptionRelation,trackAdoptionChange} from './adoption-domain.js';
import {applySelectionCommand,selectionFindings} from './adoption-selection.js';
import './adoption-ui.js'; // the selection's surface, held in the same lazy entry; it opens through window.aiwSelection
const step={apply:applyAdoptionCommand,person:true},propose={apply:applySelectionCommand},choose={apply:applySelectionCommand,person:true};
export const ADOPTION_PACKAGE={
 id:'p40-adoption',
 prefixes:{pattern:'ADP'},
 records:emitAdoptions,
 layers:{mechanism:'pattern'},
 hops:[{layer:'mechanism',types:['addresses'],from:['requirement'],dir:'in',ctx:true,only:adoptionRelation},
  {layer:'mechanism',types:['binds','scopes'],from:['responsibility','component','capability','realization','contract','data','plan','control'],dir:'in',ctx:true,only:adoptionRelation}],
 checks:{3:selectionFindings,5:adoptionFindings}, // (S5: the selection's findings on its decision, ruling Q2)
 commands:{'adoption.reassess':step,'adoption.deviation':step,'adoption.accept':{apply:applyAdoptionCommand,second:acceptanceOf},
  'selection.start':propose,'selection.candidate':propose,'selection.judge':choose,'selection.choose':choose,'selection.instantiate':choose},
 track:trackAdoptionChange,
 // (S5: a selection writes the decision, and its instantiation a component and an adoption; the boundary stamps who wrote each)
 provenance:{nouns:{'adoptions.records':'applied mechanism'},paths:{adoption:['adoptions.records'],selection:['decisions.records','realisation.components','logical.assets','adoptions.records']},records:{'adoptions.records':3}},
 design:{adoptions:adoptionDesign}
};
registerExtension(ADOPTION_PACKAGE);
