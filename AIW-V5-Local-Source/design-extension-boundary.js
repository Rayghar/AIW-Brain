// The command boundary of the design packages (rc44, slice S0), a server module. A package states its command types
// with registerExtension (public/design-extensions.js: commands {type: {apply, staged, person, second, validate, undo,
// track, large}}); worker.js dispatches a type a package states through this module, and everything around the handler
// is the boundary every command has: the shape and size checks, the commit's author (authorship.js), the revision
// check, provenance and authorship stamps, the change trackers, the journal with actor, author kind and reason, the
// undo receipt, the activity row and the idempotency receipt. This module adds what a command type says of itself:
//   person   a person's step: a draft by Sol and an agent account are refused before the project is read
//            (authorship.js isReviewCommand, refuseUnreviewable), and an import is refused here;
//   second   a second person's step: person-only, and second(p, command) answers the record (or records) acted on, or
//            a projection of it the package builds, each {id, actor, history: [{revision, actor}], owner?}:
//            verifierRefusal (public/architecture-obligations.js), the one second-person rule, refuses whoever wrote
//            any revision of it, its owner, an agent, a request with no signed-in actor and a record that names no
//            author. Then two persons are asked for (the lead's ruling D1 of 2026-11-18): a person other than the actor
//            stands behind the record as it stands (personBehind below), read from the stored record's own stamps in
//            the collection the package states for the type (provenance.paths), or the step is refused with what must
//            happen first;
//   validate (p, command, {at, actor, author}) answers a refusal in words, or nothing: what the type refuses by who
//            writes the commit (its author: a person, an import, a draft by Sol; an agent account), which the handler
//            is not told when its command is applied inside a reviewed batch. It is asked before anything is applied,
//            for the command itself and for each command of the type a request carries in a batch (validateExtensions),
//            with the document as the request finds it; what depends on the document as earlier commands of a batch
//            leave it is refused by apply, which throws, as every built-in handler does;
//   track    (prior, next, command, at) adds the change events of the command (and of the same type inside a reviewed
//            batch), as the built-in trackers do; the boundary stamps them with who, of what kind and why;
//   undo     {previous(p, command), revert(p, previous, at, actor)}: the latest saved action is undone by its receipt
//            (public/action-undo-domain.js), by the account that saved it, while nothing else has changed;
//   staged   a plain design edit that a reviewed batch may carry (public/canonical-command.js); never with person or second;
//   large    the request may carry up to 500 KB, as the built-in prefixes that say so.
// A package only adds: a type a built-in handler takes is never a package's. The built-in handlers are asked once per
// type (builtInType): a type they refuse as unknown ("Unknown … action.") is free for a package.
import {EXTENSIONS} from './public/design-extensions.js';
import {verifierRefusal} from './public/architecture-obligations.js';
import {registerReviewTypes} from './authorship.js';
import {registerUndoExtensions} from './public/action-undo-domain.js';
import {innerCommands, listAt, reviewOf} from './public/provenance.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {extensionIssues as partIssues, extensionConflicts, COMMAND_TYPE, notePackages} from './public/design-extension-parts.js';
export {upgradeExtensions, extensionUpgradeNeeded, extensionUpgradeNotes, placeSections, extensionConflicts, WORKBENCH_KEYS, workbenchKey, packageCollections, PACKAGES_KEY, documentPackages, missingPackages, missingPackagesRefusal} from './public/design-extension-parts.js';

// The built-in handler of a type, as worker.js resolves it: a function, or true for a type the Worker handles itself.
let builtInHandler = null;
export function installBuiltInCommands(resolve) { builtInHandler = typeof resolve === 'function' ? resolve : null; }
const UNKNOWN = /^(?:Unknown .* action\.|Choose a supported .* action\.)$/, PROBE_AT = '2026-01-01T00:00:00.000Z';
const probes = new Map();
let blank = null;
// Whether a built-in handler takes the type: asked of the handler itself, once, on a blank project it may change.
export function builtInType(type) {
  if (!builtInHandler) return false;
  if (!probes.has(type)) {
    const handler = builtInHandler(type); let known = handler === true;
    if (typeof handler === 'function') {
      blank ??= JSON.stringify(withFinalReview(createProject({name: 'Probe', template: 'blank'}, 'probe', PROBE_AT)));
      try { const r = handler(JSON.parse(blank), {type, payload: {}}, PROBE_AT, 'probe', {}); known = true; if (typeof r?.then === 'function') r.then(null, () => {}); }
      catch (e) { known = !UNKNOWN.test(String(e?.message || '')); }
    }
    probes.set(type, known);
  }
  return probes.get(type);
}
// The command a package states for a type, of the first package by id that states it, with that package ([package,
// command]); null for a type no package states and for one a built-in handler takes.
function statedBy(type) {
  if (typeof type !== 'string' || !COMMAND_TYPE.test(type)) return null;
  for (const e of EXTENSIONS) { const c = e.commands; if (c && Object.hasOwn(c, type) && typeof c[type]?.apply === 'function') return builtInType(type) ? null : [e, c[type]]; }
  return null;
}
export const extensionCommand = type => statedBy(type)?.[1] || null;
// Whether a person other than the actor stands behind a record as it stands (ruling D1): the server's stamp of the
// commit that last wrote what the record says is a person's (provenance.author, public/provenance.js stampAuthorship:
// an agent account never writes as a person, and a draft by Sol and an import are stamped as what they are), or a
// person has confirmed or kept the record as it now reads (provenance.reviewed, or a review plan judgement that kept
// it: reviewOf). A record with no stamp has no person behind it (one a merge wrote, ruling D12), and neither has one
// whose stamp was made before the project was restored here: that is history from elsewhere, as a restored review is.
function personBehind(p, record, actor) {
  if (!record || typeof record !== 'object') return false;
  const a = record.provenance?.author, restored = p?.finalReview?.imported?.at, review = reviewOf(p, record);
  if (a?.kind === 'person' && a.by && a.by !== actor && !(restored && !(a.at > restored))) return true;
  return !!review?.by && review.by !== actor && (review.how === 'confirmed' || review.how === 'kept' || review.how === 'judgement' && review.outcome === 'kept');
}
// The stored record a second person's step acts on, by its id, in the collections the package states for the type
// or for its prefix (provenance.paths): `second` may answer a projection, and the stamps are the stored record's.
function storedRecord(p, e, type, id) {
  const paths = e.provenance?.paths || {};
  for (const path of [paths[type], paths[type.split('.')[0]]].find(Array.isArray) || []) { const r = listAt(p, path).find(x => x?.id === id); if (r) return r; }
  return null;
}
// The handler worker.js calls for a package's type, (document, command, at, actor, {author, revision}) as every
// handler is called, or null. It refuses what the type says of itself, then applies.
export function extensionHandler(type) {
  const [e, c] = statedBy(type) || [];
  if (!c) return null;
  return (p, command, at, actor, options = {}) => {
    const author = options.author || null;
    if (c.person || c.second) {
      if (!actor) throw Error('Sign in: ' + type + ' is a signed-in person\'s step.');
      if (author?.kind !== 'person' || author.account === 'agent') throw Error(type + ' is a signed-in person\'s step: an import, a draft by Sol and an agent account review, accept and approve nothing.');
    }
    if (c.second) {
      const subject = c.second(p, command), records = (Array.isArray(subject) ? subject : [subject]).filter(r => r && typeof r === 'object');
      if (!records.length) throw Error(type + ' names no record a second person could act on.');
      for (const r of records) {
        const refusal = verifierRefusal(r, actor, author.account); if (refusal) throw Error(refusal);
        if (!personBehind(p, storedRecord(p, e, type, r.id), actor)) throw Error('A second person\'s step needs two persons: no person other than ' + actor + ' stands behind ' + r.id + ' as it stands (it was written by an agent account, drafted by Sol, imported or restored, or it names no author). A second signed-in person saves or confirms ' + r.id + ' first.');
      }
    }
    const refusal = c.validate?.(p, command, {at, actor, author});
    if (refusal) throw Error(String(refusal));
    return c.apply(p, command, at, actor, options);
  };
}
// The commands a request applies to the design beside itself: the ones it carries (a reviewed batch's, an applied
// impact's: provenance.js innerCommands) and, for a merge, the commands of the alternative it names, which the merge
// applies (workbench-domain.js).
const plainList = v => (Array.isArray(v) ? v.filter(c => c && typeof c === 'object') : []);
function appliedWith(p, command) {
  const out = innerCommands(command).filter(c => c !== command);
  if (command?.type === 'workspace.merge') out.push(...plainList(plainList(p?.workbench?.alternatives).find(a => a.id === command.payload?.id)?.commands));
  return out;
}
// What the packages' types refuse inside what a request carries, each asked with the commit's author before anything
// is applied; the command sent on its own is asked by its handler above (worker.js, before the command is dispatched).
export function validateExtensions(p, command, context) {
  for (const c of appliedWith(p, command)) { const refusal = extensionCommand(c?.type)?.validate?.(p, c, context); if (refusal) throw Error(String(refusal)); }
}
// The packages whose commands a commit applied are named in the document it wrote (ruling D2: workspace.packages,
// public/design-extension-parts.js notePackages): the command of the commit and every command it applied with it.
// worker.js calls it on the copy the command worked on, with the document as the request found it.
export function markPackages(prior, next, command) {
  const ids = [command, ...appliedWith(prior, command)].map(c => statedBy(c?.type)?.[0].id).filter(Boolean);
  return ids.length ? notePackages(next, ids) : next;
}
// The packages' trackers (ruling D4; worker.js trackCommandChanges calls this after the built-in trackers): each
// package's track(prior, next, command, at), in the packages' id order, for the command of the commit, a built-in one
// too, and then for each command it carries (a reviewed batch's, an applied impact's: provenance.js innerCommands). A
// tracker writes nothing for a document without its package's records. What it writes into `next` is part of the same
// commit: the events it adds to next.changes.events are journalled and stamped with who, of what kind and why, as the
// built-in trackers' are, and listed in the commit's activity row.
export function trackExtensions(prior, next, command, at) {
  const inner = innerCommands(command);
  for (const c of inner.includes(command) ? inner : [command, ...inner]) for (const e of EXTENSIONS) if (typeof e.track === 'function') e.track(prior, next, c, at);
}
// Whether a request of this type may be large (worker.js, beside LARGE_COMMAND_PREFIXES).
export const extensionLarge = type => extensionCommand(type)?.large === true;
// A package's person-only and second-person types are review commands to authorship.js, and a type that states an
// undo is reversible to action-undo-domain.js: both read the admitted command from here.
registerReviewTypes(type => { const c = extensionCommand(type); return !!c && !!(c.person || c.second); });
registerUndoExtensions(type => { const c = extensionCommand(type); return c?.undo && !c.staged ? c.undo : null; });

// What a package states that the contract does not allow (public/design-extension-parts.js, which also refuses a
// lifecycle path, a provenance.records path and an evidence key on a key the workbench itself writes: its one
// statement of those keys, WORKBENCH_KEYS, ruling D3), with the command types a built-in handler takes; and the check
// the server makes when it starts: a package that does not conform stops it.
export function extensionIssues(e) {
  const out = partIssues(e), name = /^(?!constructor$)[a-z][a-z0-9-]{1,60}$/.test(String(e?.id || '')) ? e.id : 'A design package';
  for (const type of Object.keys(e?.commands && typeof e.commands === 'object' ? e.commands : {})) if (COMMAND_TYPE.test(type) && builtInType(type)) out.push(name + ': command “' + type + '” is built in; it stays the chapter\'s own.');
  return out;
}
export function assertExtensions() {
  const problems = [...EXTENSIONS.flatMap(extensionIssues), ...extensionConflicts()];
  if (problems.length) throw Error('The design packages do not conform to the registration contract (audit/rc44/build-notes/s0-extensions.md):\n- ' + problems.join('\n- '));
}
