// The one registration point of the optional design packages (rc44, slice S0; audit/rc44/BUILD-PLAN-2026-11-16.md §4).
// A package tells the shared machinery what it adds with registerExtension({id, …parts}); the record graph, the trace
// kernel, the chapter checks, the command boundary, the lifecycle, the provenance reader, the design fingerprint, the
// read upgrade, the SDD and ARS assembly and the project store read it from here. It imports nothing and holds no
// project state. The parts (each optional; audit/rc44/build-notes/s0-extensions.md states the contract in full, under
// "Contract for packages", with a worked example):
//   objectTypes {type: {label, chapter, level, prefix}}        record-graph.js OBJECT_TYPES
//   records(p, add, rel)                                        record-graph.js recordRelations (the one emitter)
//   layers {layer: type}, hops [{layer, types, from, dir, ctx}] trace-kernel.js
//   checks {chapter: p => [finding]}                            document-memo.js sharedList (each chapter's findings; 11: the review's own)
//   commands {type: {apply, staged, person, second, validate, undo, track, large}}
//                                                               the server's boundary (design-extension-boundary.js); canonical-command.js stagedBy
//   lifecycle {path: chapter}                                   record-lifecycle.js COLLECTIONS (and so provenance.js RECORD_PATHS)
//   provenance {nouns: {path: noun}, paths: {type or prefix: [path]}, records: {path: chapter}}
//                                                               provenance.js RECORD_NOUNS, pathsOf, RECORD_PATHS
//   designKeys [key], evidenceKeys [key]                        review-domain.js designOf
//   upgrade(p), upgradeNote                                     readings-upgrade.js, storage-upgrade.js (server)
//   sections [{document, after, markdown(p)}]                   the registers, ARS and chapter register exports, sdd-architecture.js (server)
//   needs(p), load()                                            project-store.js (ensureExtensions), from design-package-routes.js
// Rules. Registering is by id: the first registration under an id stands, and registering it again changes nothing (a
// package's route stub {id, needs, load} has an id of its own, apart from the lazily loaded module it loads). Readers
// read the packages in id order, so the order of registration never shows. A package only adds: a type, a collection,
// a noun, a command type or a layer that is built in, or that a package earlier by id states, is left as it is
// (extendTable), and with none of a package's records in a document every reading is what it was. The server registers
// every package when it starts (design-packages.js) and checks each there against this contract
// (design-extension-boundary.js assertExtensions); the browser registers a package when its module loads.
const E={},tables=[];
// The registered packages, in id order.
export let EXTENSIONS=[];
export function registerExtension(e){
 E[e.id]??=e;
 EXTENSIONS=Object.keys(E).sort().map(k=>E[k]);
 tables.map(fill=>fill());
}
// An object table of the shared machinery kept as what is built in and what the packages state, in id order: a
// package's entry joins it unless its key is taken. It is filled now and again at every registration, and what an
// earlier fill added is taken out first, so the result never depends on the order of registration; `then` runs after
// each fill, for what is derived from the table.
export function extendTable(table,read,then){
 const added=[],fill=()=>{
  for(const k of added.splice(0))delete table[k];
  for(const e of EXTENSIONS){const x=read(e);for(const k in x)if(!(k in table)){table[k]=x[k];added.push(k);}}
  then?.();
 };
 tables.push(fill);fill();
}
// The packages a project as read ({document, …}) needs, loaded before its document is first drawn: answers the project
// once they have loaded (project-store.js, where it reads a project and where a save answers). A document says which
// packages have written into it (workspace.packages, written by the server's boundary: the lead's ruling D2 of
// 2026-11-18): one that names a package this browser has no route stub of (the stub of `id` is registered as
// `id-route`) is not opened as if those records were not there. That, a package that does not load and a module that
// throws while loading (the browser's or the module's own words are not the reader's) are refused in one sentence
// that names the package. The packages are loaded one after another, so the one named is the one that failed; a
// stub that is not there fails as a load does (reading its id throws).
export const ensureExtensions=async project=>{
 let d=project.document,id;
 try{
  for(id of d.workspace?.packages||[])E[id+'-route'].id;
  for(const e of EXTENSIONS)id=e.id,e.needs?.(d)&&await e.load();
 }catch{throw Error('Design package '+id+' did not load.')}
 return project;
};
