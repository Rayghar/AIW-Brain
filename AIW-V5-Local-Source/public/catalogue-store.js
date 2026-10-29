// The 1.5 MB pattern catalogue (brain-catalogue.js) as a lazily loaded store (round 2, I2-20, F2-19). In the browser
// it is fetched only when something that shows catalogue content asks for it: Sol's panel and the knowledge
// workspace call loadCatalogue() when they open, so the Projects page and Chapters 1–3 never load it unless Sol or
// the knowledge view opens. Until then catalogue() is a well-formed empty catalogue marked `loaded: false`, and the
// views that read it draw again once it arrives.
// What must not depend on the load (whether a catalogue receipt is current, the concepts a source passage names) reads
// the small index (catalogue-index.js) instead, which carries every record's id, names and hash.
// The server and the node runners always have it: worker.js installs it at start-up, and under Node it is installed
// synchronously when this module loads.
const PENDING = Object.freeze({releaseId: null, manifestSha256: null, sourceFile: null, sourceSha256: null, records: Object.freeze([]), repositories: Object.freeze([]), loaded: false});
let current = null, loading = null;
const waiting = new Set();

export const catalogue = () => current || PENDING;
export const catalogueLoaded = () => current !== null;
export function installCatalogue(value) {
  if (!value || !Array.isArray(value.records)) throw Error('Not a pattern catalogue.');
  current = value;
  for (const fn of [...waiting]) { waiting.delete(fn); try { fn(current); } catch (e) { console.warn('A catalogue reader failed after the load.', e?.message || e); } }
  return current;
}
// Loads the catalogue once; resolves with it. A failed load can be retried by calling again.
export function loadCatalogue() {
  if (current) return Promise.resolve(current);
  return (loading ??= import('./brain-catalogue.js').then((m) => installCatalogue(m.BRAIN_CATALOGUE), (e) => { loading = null; throw e; }));
}
// Calls fn once the catalogue is installed (at once when it already is).
export function whenCatalogue(fn) { if (current) fn(current); else waiting.add(fn); }

// Node (the local server, the suites and the scripts) reads the file synchronously, so code there never sees the
// empty catalogue. A browser has no `process`; the hosted Worker installs it from worker.js.
if (typeof process !== 'undefined' && process.versions?.node && typeof process.getBuiltinModule === 'function') {
  try { const load = process.getBuiltinModule('node:module').createRequire(import.meta.url); installCatalogue(load('./brain-catalogue' + '.js').BRAIN_CATALOGUE); } catch { /* worker.js installs it */ }
}
