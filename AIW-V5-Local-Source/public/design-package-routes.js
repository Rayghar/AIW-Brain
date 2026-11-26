// The design packages the browser can load (rc44, slice S0; audit/rc44/BUILD-PLAN-2026-11-16.md §4): the browser's
// counterpart of design-packages.js, which the server reads. Each package is one line here: its route stub, which says
// whether a document holds the package's records (needs) and how the browser loads the package (load), so that the
// project store has it loaded before such a document is first drawn (design-extensions.js ensureExtensions). The stub
// has an id of its own, apart from the package's (which the lazily loaded module registers when it arrives):
//   registerExtension({id: 'example-route', needs: p => !!p.example, load: () => import(<the shared entry>)});
// with registerExtension imported from design-extensions.js above the first such line. The line is on the route.
// `needs` reads only the document and is cheap (it is asked at every read and every save); it holds for a document with
// any of the package's records, a step the package keeps on a built-in record among them (ruling U6: wp2's selection on
// a Chapter 3 decision). `load` is the one dynamic import of the one shared lazy entry of the packages' first-draw
// readers, design-package-readers.js, which registers every package (the lead's ruling Y1, built by S0-D10: before it,
// each stub loaded the lazy entry of its package's surface, so that a document with deployment records loaded the
// Chapter 10 Model view, 855 KB, before its first draw). project-store.js imports this file and nothing else does: it
// must stay out of the entry script (entry.js), whose own dynamic imports are measured as the route (client-bundle.mjs
// sizeReport), or the packages would be counted there.
//
// A slice that adds a package adds its line below and its line in design-packages.js and design-package-readers.js.
import {registerExtension} from './design-extensions.js';
// p30-deployment (wp9a): its surface in the lazy entry of the Chapter 10 Model view.
registerExtension({id:'p30-deployment-route',needs:p=>p.runtime?.topology,load:()=>import('./design-package-readers.js')});
// p40-adoption (wp2): its surface in the lazy entry of the comparison tools; a selection is its step on a Chapter 3 decision (U6).
registerExtension({id:'p40-adoption-route',needs:p=>p.adoptions||p.decisions?.records?.some?.(d=>d?.selection),load:()=>import('./design-package-readers.js')});
// p10-knowledge (wp1): its surface in the lazy entry of the knowledge workspace.
registerExtension({id:'p10-knowledge-route',needs:p=>p.knowledge?.crosswalk||p.knowledge?.conceptPins,load:()=>import('./design-package-readers.js')});
