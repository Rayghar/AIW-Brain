// The one registration point of the optional design packages (rc44, slice S0; audit/rc44/BUILD-PLAN-2026-11-16.md §4).
// A package tells the shared machinery what it adds with registerExtension({id, …parts}); the record graph, the trace
// kernel, the chapter checks, the command boundary, the lifecycle, the provenance reader, the design fingerprint, the
// read upgrade, the SDD and ARS assembly and the project store read it from here. It imports nothing and holds no
// project state. The parts (each optional; audit/rc44/build-notes/s0-extensions.md states the contract in full):
//   objectTypes {type: {label, chapter, level, prefix}}       record-graph.js OBJECT_TYPES
//   records(p, add, rel, objects)                              record-graph.js recordRelations (the one emitter)
//   layers [{id, type}], hops [{layer, types, from, dir, own}] trace-kernel.js
//   checks {chapter: p => [finding]}                           document-memo.js sharedList (each chapter's findings); 11: the review's
//   commands {type: {apply, staged, person, second, undo, track, large}}  canonical-command.js, worker.js
//   lifecycle [[path, chapter]]                                record-lifecycle.js COLLECTIONS, provenance.js RECORD_PATHS
//   provenance {nouns: {path: noun}, paths: {type or prefix: [path]}}     provenance.js
//   designKeys [key], evidenceKeys [key]                       review-domain.js designOf
//   upgrade(p)                                                 readings-upgrade.js (server)
//   sections [{document, after, markdown(p)}]                  review-domain.js assembleSDD, sdd-architecture.js, the ARS export
//   needs(p), load()                                           project-store.js (ensureExtensions)
// Rules. Registering is by id: a second registration under an id adds the parts the first did not state and replaces
// none (so a package's route stub {id, needs, load} is completed by its lazily loaded module, and registering twice
// changes nothing). Readers read the packages in id order, so the order of registration never shows. A package only
// adds: a type, a collection, a noun, a command type or a layer that is built in, or that a package earlier by id
// states, is left as it is (extendTable), and with none of a package's records in a document every reading is what it
// was. The server registers every package when it starts (design-packages.js) and checks it there
// (design-extension-boundary.js extensionIssues); the browser registers a package when its module loads.
const E={},watchers=[];
// The registered packages, in id order.
export let EXTENSIONS=[];
// f runs now and after every registration: a table derived from the packages is rebuilt there.
export function watchExtensions(f){watchers.push(f);f();}
export function registerExtension(e){
 E[e.id]={...e,...E[e.id]};
 EXTENSIONS=Object.keys(E).sort().map(k=>E[k]);
 for(const f of watchers)f();
}
// An object table of the shared machinery kept as what is built in and what the packages state, in id order: a
// package's entry joins it unless its key is taken. What an earlier registration added is taken out first, so the
// result never depends on the order of registration.
export function extendTable(table,read){
 const added=[];
 watchExtensions(()=>{
  for(const k of added.splice(0))delete table[k];
  for(const e of EXTENSIONS){const x=read(e);for(const k in x)if(!(k in table)){table[k]=x[k];added.push(k);}}
 });
}
// The packages a document needs, loaded before the document is first drawn (project-store.js).
export const ensureExtensions=p=>Promise.all(EXTENSIONS.map(e=>e.needs?.(p)&&e.load()));
// The findings the packages state for a chapter (1 to 10; 11: the review's own list), in id order.
export const extensionChecks=(p,chapter)=>EXTENSIONS.flatMap(e=>e.checks?.[chapter]?.(p)||[]);
