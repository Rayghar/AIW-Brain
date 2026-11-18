// The design packages the browser can load (rc44, slice S0; audit/rc44/BUILD-PLAN-2026-11-16.md §4): the browser's
// counterpart of design-packages.js, which the server reads. Each package is one line here: its route stub, which says
// whether a document holds the package's records (needs) and how the browser loads the package (load), so that the
// project store has it loaded before such a document is first drawn (design-extensions.js ensureExtensions). The stub
// has an id of its own, apart from the package's (which the lazily loaded module registers when it arrives):
//   registerExtension({id:'example-route',needs:p=>!!p.example,load:()=>import('./example.js')});
// with `import {registerExtension} from './design-extensions.js';` above the first such line. The line is on the route:
// it is the package's own route bytes. `needs` reads only the document and is cheap (it is asked at every read and
// every save); `load` is the one dynamic import of the package's lazy entry (or of the existing lazy entry that hosts
// it). project-store.js imports this file and nothing else does: it must stay out of the entry script (entry.js), whose
// own dynamic imports are measured as the route (client-bundle.mjs sizeReport), or the package would be counted there.
//
// No package exists yet. A slice that adds one adds its line below, and nothing else in the shared machinery.
