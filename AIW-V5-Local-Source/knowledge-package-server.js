// The server's registration of the design package of the knowledge register, p10-knowledge (rc44, wp1 slice S2), the
// line of design-packages.js. The package registers itself where it is stated (public/knowledge-package.js, which the
// browser's lazy entry imports too); the server adds to that same object, before worker.js checks the packages when it
// starts, the command types of the crosswalk and the collection they write, so that the command module
// (public/knowledge-concept-commands.js) is in no client bundle. Whichever of the two modules a process imports first,
// the registered package is one object, and on the server it has its commands.
//   commands    knowledge.crosswalk (anyone: a proposal or an edit; never a review), knowledge.crosswalk-confirm and
//               knowledge.crosswalk-retire (a signed-in person's steps; the confirmation is the person-only step that
//               puts a person behind a row only an import, a draft by Sol or an agent account wrote: ruling F4), and
//               knowledge.crosswalk-review (a second person's step, on the projection of the row: rulings D1 and D7.1);
//   provenance  the collection those types write, so that the boundary stamps who wrote and who confirmed each row and
//               reads those stamps for the second person's step (ruling D1).
import {KNOWLEDGE_PACKAGE} from './public/knowledge-package.js';
import {applyCrosswalkCommand,crosswalkSubject} from './public/knowledge-concept-commands.js';
const rows=['knowledge.crosswalk'],person={apply:applyCrosswalkCommand,person:true};
Object.assign(KNOWLEDGE_PACKAGE,{
 commands:{'knowledge.crosswalk':{apply:applyCrosswalkCommand},'knowledge.crosswalk-confirm':person,'knowledge.crosswalk-review':{apply:applyCrosswalkCommand,second:crosswalkSubject},'knowledge.crosswalk-retire':person},
 provenance:{paths:{'knowledge.crosswalk':rows,'knowledge.crosswalk-confirm':rows,'knowledge.crosswalk-review':rows,'knowledge.crosswalk-retire':rows}}
});
