// The design package of the knowledge register (rc44, wp1; audit/rc44/design/wp1-knowledge.md): what it adds to the
// shared machinery, stated once at the registration point (design-extensions.js; the contract is in
// audit/rc44/build-notes/s0-extensions.md). Its id is the lead's (rulings D8 and E5 of 2026-11-18): the concept register
// itself stays the built-in knowledge family's, and the package holds what it adds through the contract. Slice S2 adds
// the crosswalk (knowledge.crosswalk[], KA); slice S3 the concept pins, their type, their finding and their section.
// The browser registers it when the knowledge workspace's lazy entry arrives (knowledge-workspace-ui.js, the host the
// design names, ruling D7.6), which its route stub loads before a document that holds crosswalk rows is first drawn
// (design-package-routes.js). The server registers the same object with the commands and the collection they write
// (knowledge-package-server.js, the line of design-packages.js): the browser sends those commands and applies none, so
// the command module stays out of every client bundle.
//   design  what the crosswalk rows say to the design fingerprint, in place of the raw key (ruling J3): all of a row
//           but its history, review, confirmation and stamps, so no person's or second person's step moves a stamp.
import {registerExtension} from './design-extensions.js';
import {crosswalkDesign} from './knowledge-crosswalk.js';
export const KNOWLEDGE_PACKAGE={id:'p10-knowledge',design:{'knowledge.crosswalk':crosswalkDesign}};
registerExtension(KNOWLEDGE_PACKAGE);
