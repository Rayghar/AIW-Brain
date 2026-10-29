// The module scope's lens (round 24, D-24-08): what a surface shows while a reader works in a module or sub-module of the
// project's structure (module-model.js). The lens of a scope is
//   - the scope's own records (module-scope.js moduleScope: its requirements, the records in it and, for a platform
//     module, the records whose requirements it serves): `core`;
//   - as context, the shared records within two links of them: a record in no module (a journey step, a party, a
//     contract, a zone), a platform module's records, and under a sub-module its module's records that no sub-module
//     holds. A contract is context only when both its ends are shown (and what only such a contract reached is not
//     shown); a shared container (an environment, a trust boundary, a responsibility group) is shown, but what else it
//     holds is not reached through it;
//   - never a requirement outside the scope, nor a record that only another business module (or another sub-module)
//     holds: `shows` is core and context.
// The registers filter by the lens (lensHolds). The Model tab reads the scope's projection of the saved document
// (scopedDocument): each record collection keeps the records the lens shows, a link row (a relationship, a connection,
// a mapping) the ones whose ends it shows. The projection is made once per saved document and scope and never changed,
// so every reading memoised on a document (the one model, the connected model and its cap, the Table, the Matrix) works
// on the scope before any cap. A projection's checks are the saved document's (baseOf, scopeFindings): a link to a
// record outside the scope is not a broken link.
// Everything here is a function of a saved document and a scope id, never of the browser's state (the scope the shell
// holds is read through project-context.js), so the chapter models the server also runs and the server's readers may use
// it too. Editors and commands always work on the saved document; nothing here changes the project.
//   scopeLens(p, id)       -> null (no id, or an id that names no module or sub-module) | {id, title, crumbs, module,
//                            sub, platform, core: Set, shows: Set, requirements: Set}
//   lensHolds(lens, x)     -> whether the lens shows x (a record, an id, a link row by its ends); without a lens, true
//   scopedDocument(p, id)  -> the scope's projection of p (p itself without a scope); baseOf(q), scopeFindings(q, list)
//   realisingGroups(p, id) -> the Chapter 4 responsibility groups that realise the scope (else its module's)
import {moduleScope, recordModules} from './module-scope.js';
import {moduleTree} from './module-model.js';
import {architectureModel} from './architecture-model.js';
import {remember, settleDocument} from './document-memo.js';

const SKIP = new Set(['system', 'view', 'baseline']), HUB = new Set(['environment', 'boundary', 'module']), ENDS = ['from', 'to', 'logicalId', 'physicalId', 'needId', 'capabilityId', 'realizationId'];
export function scopeLens(p, id) {
  if (!p || !id) return null;
  return remember(p, 'module-lens', id, () => {
    const S = moduleScope(p, id); if (!S) return null;
    const tree = moduleTree(p), R = recordModules(p), M = architectureModel(p), mod = S.module.id, sub = S.sub?.id || '';
    const platform = m => tree.byId.get(m)?.role === 'platform';
    const core = new Set([...S.requirements, ...S.records, ...S.served]);
    // A record another business module (or, under a sub-module, another sub-module) holds is not this scope's to show.
    const foreign = x => {
      if (core.has(x)) return false;
      if (M.objects.get(x)?.type === 'requirement') return true;
      const e = R.get(x); if (!e) return false;
      if (sub && e.subs.length) return true;
      return e.modules.some(m => !platform(m) && !(sub && m === mod));
    };
    // Within two links of the scope's own records, through records it may show (a shared container not crossed).
    const reach = may => {
      const out = new Set(core); let frontier = [...core];
      for (let depth = 0; depth < 2 && frontier.length; depth++) {
        const next = [];
        for (const x of frontier) for (const e of [...(M.outgoing.get(x) || []), ...(M.incoming.get(x) || [])]) {
          const y = e.from === x ? e.to : e.from; if (out.has(y) || !may(y)) continue;
          out.add(y); if (!HUB.has(M.objects.get(y).type)) next.push(y);
        }
        frontier = next;
      }
      return out;
    };
    const reached = reach(y => { const o = M.objects.get(y); return !!o && !SKIP.has(o.type) && !foreign(y); });
    // A contract is context only when both its ends are shown; what was reached only through one that is not goes with it.
    const ends = (x, held) => { const o = M.objects.get(x); return o?.type !== 'contract' || core.has(x) || [o.record?.from, o.record?.to].every(end => !end || held.has(end) || !M.objects.has(end)); };
    const shows = reach(y => reached.has(y) && ends(y, reached));
    for (const x of shows) if (!ends(x, shows)) shows.delete(x);
    return {id, title: S.title, crumbs: S.crumbs, module: S.module, sub: S.sub, platform: platform(mod), core, shows, requirements: S.requirements};
  });
}
export function lensHolds(lens, x) {
  if (!lens || x == null) return true;
  if (typeof x !== 'object') return lens.shows.has(x);
  if (x.id != null && lens.shows.has(x.id)) return true;
  const ends = ENDS.map(k => x[k]).filter(v => typeof v === 'string' && v);
  return ends.length > 1 && ends.every(v => lens.shows.has(v));
}
export function realisingGroups(p, id) {
  const g = moduleTree(p).byId.get(id); if (!g) return [];
  const of = x => (p?.logical?.groups || []).filter(r => Array.isArray(r.requirementGroupIds) && r.requirementGroupIds.includes(x)).map(r => r.id);
  const own = of(id);
  return own.length || g.kind !== 'sub-module' ? own : of(g.parentId);
}

// ---------------------------------------------------------------- the Model tab's projection
const SECTIONS = ['quality', 'decisions', 'logical', 'realisation', 'technology', 'technologyRealisation', 'interfaces', 'security', 'runtime'];
const REFS = ['from', 'to', 'logicalId', 'physicalId', 'needId', 'capabilityId', 'realizationId', 'sourceDataId', 'targetDataId'];
// A projection remembers the saved document it was made from (a saved document is its own).
const BASE = new WeakMap();
export const baseOf = q => BASE.get(q) || q;
// The saved document's findings kept to what a projection holds; a finding on no record of the model is the chapter's.
export function scopeFindings(q, list) {
  const p = BASE.get(q); if (!p || !Array.isArray(list)) return list;
  const here = architectureModel(q).objects, all = architectureModel(p).objects;
  return list.filter(f => { const id = f?.objectId || f?.artefactId || f?.driverId || f?.decisionId; return !id || !all.has(id) || here.has(id); });
}
function projection(p, lens) {
  const M = architectureModel(p), keep = x => lens.shows.has(x), known = x => typeof x === 'string' && M.objects.has(x);
  const row = r => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return true;
    if (known(r.id)) return keep(r.id);
    return REFS.every(k => !known(r[k]) || keep(r[k]));
  };
  const rows = v => (Array.isArray(v) && v.some(r => r && typeof r === 'object' && !Array.isArray(r)) ? v.filter(row) : v);
  const out = {...p, artefacts: rows(p.artefacts || []), relationships: rows(p.relationships || [])};
  for (const s of SECTIONS) if (p[s] && typeof p[s] === 'object') out[s] = Object.fromEntries(Object.entries(p[s]).map(([k, v]) => [k, rows(v)]));
  BASE.set(out, p);
  return settleDocument(out);
}
// The saved document under a scope: itself without one, or when the id names no module of this project.
export function scopedDocument(p, id) {
  const lens = p && id ? scopeLens(p, id) : null;
  return lens ? remember(p, 'module-view', id, () => projection(p, lens)) : p;
}
