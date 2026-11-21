// The design packages the browser can load (rc44, slice S0; audit/rc44/BUILD-PLAN-2026-11-16.md §4): the browser's
// counterpart of design-packages.js, which the server reads. Each package is one line here: its route stub, which says
// whether a document holds the package's records (needs) and how the browser loads the package (load), so that the
// project store has it loaded before such a document is first drawn (design-extensions.js ensureExtensions). The stub
// has an id of its own, apart from the package's (which the lazily loaded module registers when it arrives):
//   registerExtension({id: 'example-route', needs: p => !!p.example, load: () => import(<the package's lazy entry>)});
// with registerExtension imported from design-extensions.js above the first such line. The line is on the route: it is
// the package's own route bytes. `needs` reads only the document and is cheap (it is asked at every read and every
// save); `load` is the one dynamic import of the lazy entry that holds the package: an existing lazy entry that imports
// the package statically (measured at S0: about 0.2 KB on the route for the first package, no new script file), or an
// entry of its own (measured: 0.8 to 1.2 KB on the route in chunk glue and two more script files, because the shared
// chunks split again). project-store.js imports this file and nothing else does: it must stay out of the entry script
// (entry.js), whose own dynamic imports are measured as the route (client-bundle.mjs sizeReport), or the package
// would be counted there.
//
// A slice that adds a package adds its line below, and nothing else in the shared machinery.
import {registerExtension} from './design-extensions.js';
// p40-adoption (wp2): held in the lazy entry of the comparison tools (ruling D7.6), which imports adoption-package.js.
registerExtension({id:'p40-adoption-route',needs:p=>p.adoptions,load:()=>import('./architecture-task-ui.js')});
