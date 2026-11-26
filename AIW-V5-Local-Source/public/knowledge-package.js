// The design package of the knowledge register (rc44, wp1; audit/rc44/design/wp1-knowledge.md): what it adds to the
// shared machinery, stated once at the registration point (design-extensions.js; the contract is in
// audit/rc44/build-notes/s0-extensions.md). Its id is the lead's (rulings D8 and E5 of 2026-11-18): the concept register
// itself stays the built-in knowledge family's, and the package holds what it adds through the contract. Slice S2 adds
// the crosswalk (knowledge.crosswalk[], KA); slice S3 the concept pins, their type, their finding and their section.
// The browser registers it when the knowledge workspace's lazy entry arrives (knowledge-workspace-ui.js, the host the
// design names, ruling D7.6), which its route stub loads before a document that holds crosswalk rows or concept pins is
// first drawn (design-package-routes.js). The server registers the same object with the commands, the collections they
// write and the SDD's section (knowledge-package-server.js, the line of design-packages.js): the browser sends those
// commands and applies none, so the command module stays out of every client bundle.
//   objectTypes, records  a pin is an object of type `concept` (Chapter 11), and each link through a pin a relation
//                         `informs` from the pin to the record (knowledge-pins.js): no layer, no trail
//   (no checks)           the finding for each link whose pin is not current is the package's reader
//                         (knowledge-pins.js conceptLinkFindings) and Appendix E of the SDD: its check row of list 11
//                         is held back until slice S5's concept view offers relink, migration, repin and unpin in the
//                         browser (the lead's ruling X5 a, by J7: no finding before the surface that clears it)
//   design                what the crosswalk rows, the pins and the links say to the design fingerprint, in place of the
//                         raw keys (ruling J3): all but their history, review, confirmation and stamps, so no person's or
//                         second person's step moves a stamp; a migration is a proposal and says nothing (ruling L6)
//   evidenceKeys          (ruling B10) a library's concept register and topic register are knowledge beside the design
//                         (evidence: they move the evidence stamp), its mark and the pins' currency and the
//                         organisation's notices are bookkeeping (neither fingerprint reads them)
import {registerExtension} from './design-extensions.js';
import {crosswalkDesign} from './knowledge-crosswalk.js';
import {pinRecords,pinsDesign,linksDesign,migrationsDesign} from './knowledge-pins.js';
// (The keys are built from their names: a key of the knowledge workspace is no command type, which product scans read.)
const key=k=>'knowledge.'+k;
export const KNOWLEDGE_PACKAGE={id:'p10-knowledge',
 objectTypes:{concept:{label:'Knowledge concept',chapter:11,level:'intent',prefix:'KU'}},
 records:pinRecords,
 design:{[key('crosswalk')]:crosswalkDesign,[key('conceptPins')]:pinsDesign,[key('conceptLinks')]:linksDesign,[key('conceptMigrations')]:migrationsDesign},
 evidenceKeys:['concepts','topics','library','pinCurrency','organizationNotices'].map(key)};
registerExtension(KNOWLEDGE_PACKAGE);
// The package's steps write their lines into knowledge.history, each naming the package (the lead's ruling Y2, which
// turns back S3's quiet step): one trail holds every step, and the knowledge workspace's history panel draws it from the
// log alone, a line of the package's with who took it (rulings X4 and Y2). Whether a command type is one of them:
export const packageStep=type=>/^knowledge\.(crosswalk|concept-(pin|link|unlink|unpin|repin|migration))\b/.test(type||'');
