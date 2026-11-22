// The server's registration of the design package of the knowledge register, p10-knowledge (rc44, wp1 slices S2 and S3),
// the line of design-packages.js. The package registers itself where it is stated (public/knowledge-package.js, which the
// browser's lazy entry imports too); the server adds to that same object, before worker.js checks the packages when it
// starts, the command types, the collections they write and the SDD's section, so that the command module
// (public/knowledge-concept-commands.js) is in no client bundle. Whichever of the two modules a process imports first,
// the registered package is one object, and on the server it has its commands.
//   commands    the crosswalk (S2): knowledge.crosswalk (anyone: a proposal or an edit; never a review),
//               knowledge.crosswalk-confirm and knowledge.crosswalk-retire (a signed-in person's steps; the confirmation is
//               the person-only step that puts a person behind a row only an import, a draft by Sol or an agent account
//               wrote: ruling F4), and knowledge.crosswalk-review (a second person's step, on the projection of the row:
//               rulings D1 and D7.1);
//               the pins (S3): knowledge.concept-pin, -link, -unlink and -unpin (a signed-in person's steps),
//               knowledge.concept-migration (anyone: a proposal), knowledge.concept-migration-confirm (the person-only step
//               that puts a person behind a proposal no person wrote, ruling F4) and knowledge.concept-repin (a second
//               person's step, on the projection of the proposal: whoever wrote it is refused);
//   provenance  the collections those types write, so that the boundary stamps who wrote and who confirmed each record
//               and reads those stamps for the second person's step (ruling D1);
//   sections    Appendix E of the SDD: the knowledge versions the design rests on (after "## E. Provenance").
import {KNOWLEDGE_PACKAGE} from './public/knowledge-package.js';
import {applyCrosswalkCommand,crosswalkSubject,applyPinCommand,migrationSubject} from './public/knowledge-concept-commands.js';
import {knowledgeBasisMarkdown} from './public/knowledge-concepts.js';
const rows=['knowledge.crosswalk'],person={apply:applyCrosswalkCommand,person:true};
const pins=['conceptPins','conceptLinks','conceptMigrations'].map(k=>'knowledge.'+k),pinPerson={apply:applyPinCommand,person:true};
const PIN_TYPES={'knowledge.concept-pin':pinPerson,'knowledge.concept-link':pinPerson,'knowledge.concept-unlink':pinPerson,'knowledge.concept-migration':{apply:applyPinCommand},'knowledge.concept-migration-confirm':pinPerson,'knowledge.concept-repin':{apply:applyPinCommand,second:migrationSubject},'knowledge.concept-unpin':pinPerson};
Object.assign(KNOWLEDGE_PACKAGE,{
 commands:{'knowledge.crosswalk':{apply:applyCrosswalkCommand},'knowledge.crosswalk-confirm':person,'knowledge.crosswalk-review':{apply:applyCrosswalkCommand,second:crosswalkSubject},'knowledge.crosswalk-retire':person,...PIN_TYPES},
 provenance:{paths:{'knowledge.crosswalk':rows,'knowledge.crosswalk-confirm':rows,'knowledge.crosswalk-review':rows,'knowledge.crosswalk-retire':rows,...Object.fromEntries(Object.keys(PIN_TYPES).map(t=>[t,pins]))}},
 sections:[{document:'sdd',after:'## E. Provenance',markdown:knowledgeBasisMarkdown}]
});
