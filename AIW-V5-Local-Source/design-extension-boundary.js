// The command boundary of the design packages (rc44, slice S0), a server module. A package states its command types
// with registerExtension (public/design-extensions.js: commands {type: {apply, staged, person, second, validate, undo,
// large}}, and one tracker, track); worker.js dispatches a type a package states through this module, and everything around the handler
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
//   undo     {previous(p, command), revert(p, previous, at, actor)}: the latest saved action is undone by its receipt
//            (public/action-undo-domain.js), by the account that saved it, while nothing else has changed;
//   staged   a plain design edit that a reviewed batch may carry (public/canonical-command.js); never with person or second;
//   large    the request may carry up to 500 KB, as the built-in prefixes that say so.
// and what a package says of itself: track(prior, next, command, at), its one tracker (the lead's ruling D4 of
// 2026-11-18), called after the built-in trackers for every command and for each command a batch carries
// (trackExtensions below), with trackPaths, the built-in collections it mends, each with the content fields it may
// change there (ruling T1: an allow-list), whose records the boundary stamps as the commit's where a call changed them
// (ruling O2, which retired the tracker's answer of ruling M1: a tracker answers nothing, and an answer is ignored); a
// command type states no tracker of its own.
// A package only adds: a type a built-in handler takes is never a package's. The built-in handlers are asked once per
// type (builtInType): a type they refuse as unknown ("Unknown … action.") is free for a package.
import {EXTENSIONS} from './public/design-extensions.js';
import {workbenchKey as onWorkbenchKey} from './public/design-extension-parts.js';
import {verifierRefusal} from './public/architecture-obligations.js';
import {registerReviewTypes} from './authorship.js';
import {registerUndoExtensions} from './public/action-undo-domain.js';
import {innerCommands, listAt, reviewOf, stampChanged, stampTracked} from './public/provenance.js';
import {isRetiredCommand, LIFECYCLE_RULES} from './public/canonical-command.js';
import {inheritedFindings, findingCause} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {UPGRADE_DUE} from './error-message.js';
import {extensionIssues as partIssues, extensionConflicts, COMMAND_TYPE, notePackages, extensionUpgradeNeeded, trackedFields} from './public/design-extension-parts.js';
export {TRACKED_STANDING, TRACK_REFUSED_PATHS, trackFieldRefused, upgradeExtensions, extensionUpgradeNeeded, extensionUpgradeNotes, placeSections, extensionConflicts, WORKBENCH_KEYS, WORKBENCH_PREFIXES, workbenchKey, packageCollections, PACKAGES_KEY, documentPackages, missingPackages, missingPackagesRefusal, UNREADABLE_PACKAGES} from './public/design-extension-parts.js';

// The built-in handler of a type, as worker.js resolves it: a function, or true for a type the Worker handles itself.
let builtInHandler = null;
export function installBuiltInCommands(resolve) { builtInHandler = typeof resolve === 'function' ? resolve : null; }
const UNKNOWN = /^(?:Unknown .* action\.|Choose a supported .* action\.)$/, PROBE_AT = '2026-01-01T00:00:00.000Z';
const probes = new Map();
let blank = null;
// Whether a built-in handler takes the type: asked of the handler itself, once, on a blank project it may change. A
// retired name the workbench still reads (canonical-command.js migrateCommand: sent alone it would reach a package,
// inside a batch it is read as the lifecycle family's) is taken too. Until the server has installed its resolver no
// type is free: a package's command is then unknown, never applied in a built-in command's place (assertExtensions
// says so when the server starts).
export function builtInType(type) {
  if (!builtInHandler || isRetiredCommand(type)) return true;
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
// whose stamp was made before the project was restored here or copied from a template: that is history from
// elsewhere, as a restored review is.
function personBehind(p, record, actor) {
  if (!record || typeof record !== 'object') return false;
  // (ruling F3: a project copied from a template carries the template's stamps; they were made in another project)
  const a = record.provenance?.author, review = reviewOf(p, record), from = [p?.finalReview?.imported?.at, p?.workspace?.templateOrigin?.at].filter(Boolean).sort().pop(), here = at => !(from && !(at > from));
  if (a?.kind === 'person' && a.by && a.by !== actor && here(a.at)) return true;
  // (rulings Y3 and Z7: a merge is the merger's reviewed step, so the person who merged the record stands behind it as it
  // reads; it is no review of the record's words, which reviewOf reads, so it is read from its stamp)
  const merged = record.provenance?.reviewed?.how === 'merged' ? record.provenance.reviewed : null;
  if (merged?.by && merged.by !== actor && here(merged.at)) return true;
  return !!review?.by && review.by !== actor && here(review.at) && (review.how === 'confirmed' || review.how === 'kept' || review.how === 'judgement' && review.outcome === 'kept');
}
// Who a merge's stamp names while what it wrote stands (the lead's rulings Y3 and Z1 of 2026-11-22; public/provenance.js
// mergeStamper): whoever prepared the command in the alternative and the person who merged it, on the author stamp of a
// record the merge wrote, or beside a keep or a confirmation it applied (worded as kept or confirmed: ruling Z6). Neither
// is the second person; a third signed-in person takes the step. A later change of what the record says is stamped as any
// save is, and the stamp then names its writer only (who wrote any revision stays named by the record's own history:
// the preparer is the domain's actor in a merge, ruling Z1).
function mergedRefusal(record, actor) {
  const pv = record?.provenance, a = pv?.author, v = pv?.reviewed;
  const by = a?.mergedBy && (a.by === actor || a.mergedBy === actor) ? [a.by, a.mergedBy, 'prepared'] : v?.mergedBy === actor ? [v.by, v.mergedBy, v.how === 'kept' ? 'kept' : 'confirmed'] : v?.how === 'merged' && v.by === actor ? [a?.by, v.by, 'prepared'] : null;
  return by && 'A second person\'s step needs two persons: ' + record.id + ' reads as ' + by[0] + ' ' + by[2] + ' it in an alternative and ' + by[1] + ' merged it. A signed-in person who neither ' + by[2] + ' nor merged ' + record.id + ' takes this step.';
}
// The stored record a second person's step acts on, by its id, in the collections the package states for the type
// or for its prefix (provenance.paths): `second` may answer a projection, and the stamps are the stored record's.
function storedRecord(p, e, type, id) {
  const paths = e.provenance?.paths || {};
  for (const path of [paths[type], paths[type.split('.')[0]]].find(Array.isArray) || []) { const r = listAt(p, path).find(x => x?.id === id); if (r) return r; }
  return null;
}
// Every collection the registered packages state as their own, by any part (lifecycle, provenance.records and the
// lists of provenance.paths), never one on a key the workbench itself writes.
const ownCollections = () => [...new Set(EXTENSIONS.flatMap(e => [...Object.keys(plainPart(e.lifecycle)), ...Object.keys(plainPart(e.provenance?.records)), ...Object.values(plainPart(e.provenance?.paths)).flatMap(v => (Array.isArray(v) ? v : []))]))].filter(path => typeof path === 'string' && !onWorkbenchKey(path));
const plainPart = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
// What worker.js calls after the commit's own stamping (stampAuthorship): the stamp of every package record the
// commit changed is the commit's (ruling D1; provenance.js stampChanged). So a person's record that an agent account
// or a draft by Sol changes, by a type whose prefix states no paths or by a command that names no record, no longer
// reads as a person's, and a second person's step on it is refused until a person saves or confirms it.
export const stampExtensions = (prior, next, author, at) => (EXTENSIONS.length ? stampChanged(prior, next, ownCollections(), author, at) : next);
// The same collections, for the stamping of a merge's commands one by one (ruling Y3; provenance.js mergeStamper).
export const stampedCollections = () => (EXTENSIONS.length ? ownCollections() : []);
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
        // (ruling Z1) a merge's stamp is read first, in its own words: the preparer is also the record's writer to the domain
        const refusal = mergedRefusal(storedRecord(p, e, type, r.id), actor) || verifierRefusal(r, actor, author.account); if (refusal) throw Error(refusal);
        if (!personBehind(p, storedRecord(p, e, type, r.id), actor)) throw Error('A second person\'s step needs two persons: no person other than ' + actor + ' stands behind ' + r.id + ' as it stands (it was written by an agent account, drafted by Sol, imported or restored, or it names no author). A second signed-in person saves or confirms ' + r.id + ' first.');
      }
    }
    const refusal = c.validate?.(p, command, {at, actor, author});
    if (refusal) throw Error(String(refusal));
    const from = eventsOf(p).length, result = c.apply(p, command, at, actor, options);
    unstated(result?.document, from);
    return result;
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
// An event a package's staged handler adds inside a reviewed batch or a merge states no author fields (the lead's rulings
// H3 and Y3 of 2026-11-22): there the handler is called by the staged path (canonical-command.js applyCanonical) with
// four arguments, where this boundary does not wrap it. worker.js calls this after the command is applied and before the
// trackers run: when the request applies a package's command beside itself, every event the apply added states none of
// the fields the server stamps (no built-in staged handler journals; the built-in trackers and the packages' run later),
// so the commit's stamp is the only one, as for a tracker and for a package's command sent on its own.
export function unstatedStaged(prior, next, command) {
  if (EXTENSIONS.length && appliedWith(prior, command).some(c => extensionCommand(c?.type))) unstated(next, eventsOf(prior).length);
  return next;
}
// The commands a request keeps for later: the ones an alternative holds when it is saved or revised, which a merge
// then applies.
const heldBy = command => (command?.type === 'workspace.alternative' || command?.type === 'workspace.revise-alternative' ? plainList(command.payload?.commands) : []);
// What worker.js asks before any command is applied, with the document as the request finds it and the commit's
// author ({at, actor, author}); a refusal is thrown in words.
// - What the packages' types refuse by their author, for every command the request carries: a reviewed batch's, and an
//   alternative's when it is saved, when it is revised and when it is merged (ruling D6.2). The command sent on its own
//   is asked by its handler above.
// - The undo of a person-only or second-person step is itself a signed-in person's step (ruling D6.1): an agent
//   account, a draft by Sol, an import and a request with no signed-in actor are refused; that it stays with the
//   account that saved the step is the receipt's own rule (public/action-undo-domain.js).
// - A treatment of a finding whose id two findings share is refused: a treatment is kept by finding id, so it would
//   cover both. A package's finding under an id that is taken (a built-in finding's, another package's) is a fault of
//   the package, which its suite catches (rc44-s0-readings.mjs assertFindingIdsUnique); this keeps it from waiving
//   anything meanwhile.
export function validateExtensions(p, command, context) {
  for (const c of [...appliedWith(p, command), ...heldBy(command)]) { const refusal = extensionCommand(c?.type)?.validate?.(p, c, context); if (refusal) throw Error(String(refusal)); }
  if (command?.type === 'action.undo') {
    const receipt = plainList(p?.workbench?.history).at(-1)?.undo, c = receipt && receipt.id === command.payload?.receiptId ? extensionCommand(receipt.type) : null, author = context?.author;
    if (c && (c.person || c.second) && (!context?.actor || author?.kind !== 'person' || author.account === 'agent')) throw Error('Undoing a signed-in person\'s step is a signed-in person\'s step: an import, a draft by Sol and an agent account undo no review, acceptance or approval. The person who saved it signs in to undo it.');
  }
  if (command?.type === 'review.disposition' && EXTENSIONS.some(e => e.checks)) {
    const raw = command.payload || {}, all = inheritedFindings(p), ids = raw.scope === 'cause' ? all.filter(f => findingCause(f).key === String(raw.cause || '')).map(f => f.id) : [raw.findingId];
    const shared = ids.find(id => all.filter(f => f.id === id).length > 1);
    if (shared) throw Error('Two findings share the id “' + shared + '”: a treatment would cover both, so none is recorded. A design package states a finding under an id that is taken; it is the package that changes.');
  }
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
// Who wrote a change, of what kind and why is what the server says of the commit (worker.js), never what a package
// says: an event a tracker or a handler of a package adds states none of it, so the server's stamp is the only one.
// The boundary, not the package, says what a tracker changed of a built-in collection (the lead's rulings H2 and O2 of
// 2026-11-21): a package whose tracker mends records of a built-in collection (wp9a's mend of a zone or a placement
// that names a record no longer there) states those collections as trackPaths. Before each call of a tracker the
// boundary copies the records of those paths, and after it stamps as the commit's each record whose content the call
// changed (provenance.js stampTracked, with the copy as `was`), as it stamps a package's own records: its stamp says who
// sent the commit that changed it, never who wrote it before, and a stamp or a review the tracker writes is not kept.
// What a tracker answers is ignored. That a tracker changes no other built-in collection, and inside its trackPaths adds
// and removes no record, changes no field a path does not list and moves a revision only forward by one with a listed
// field, is held by each package's suite (rc44-s0-readings.mjs assertTrackerStaysInPaths).
// A tracker mends content; it decides nothing and makes nothing (the lead's rulings R2 and T1 of 2026-11-22), and it
// changes only what it lists. trackPaths is an allow-list, {'chapter.collection': [field, …]}: the content fields the
// mend may change in that collection (the start check refuses a field that is a record's identity, revision or history
// or says whether and how it stands, and a collection whose records a chapter accepts, approves or marks reviewed:
// design-extension-parts.js trackFieldRefused, TRACK_REFUSED_PATHS). For each record of a path that a call changed, the
// boundary puts back from its copy every field the path does not list, in the record's own order, so that whatever a
// tracker writes of a state, an acceptance, governance, a recording, an approval, a review, a confirmation, a snapshot, a
// history or the provenance, which is the server's, does not stand; its revision moves only forward, by exactly one, and
// only where a listed field changed in that call, and is otherwise put back. Then it stamps the content change as the
// commit's. A call that adds a record to such a path, or removes one, is refused, and so is one whose change of a listed
// field moves the chapter's reading of whether the record is AIW's proposal (canonical-command.js LIFECYCLE_RULES seed,
// as record-lifecycle.js reads it), which no copy can put back without undoing the mend: the commit is not stored, and
// the answer names the package (worker.js answers isTrackerRefusal in its words, 500 with code fault: the package is at
// fault, not the request).
const TRACKER_REFUSAL = 'package_tracker';
export const isTrackerRefusal = error => error?.code === TRACKER_REFUSAL;
const refuseTracker = (e, what) => { throw Object.assign(Error('This action could not be completed: the design package ' + e.id + '\'s tracker ' + what + '. A tracker mends the records of the collections it states (trackPaths); it decides nothing and makes nothing, so nothing was saved.'), {code: TRACKER_REFUSAL, package: e.id}); };
const proposalOf = (p, path, r) => !!(typeof LIFECYCLE_RULES[path]?.seed === 'function' ? LIFECYCLE_RULES[path].seed(p, r) : r?.state === 'proposed');
const refOf = r => (r && typeof r === 'object' ? r.ref || r.code || r.id : null) || 'a record';
const AUTHOR_FIELDS = ['actor', 'authorKind', 'reviewed', 'account', 'session', 'reason'];
const eventsOf = p => (Array.isArray(p?.changes?.events) ? p.changes.events : []);
function unstated(next, from) { for (const event of eventsOf(next).slice(from)) if (event && typeof event === 'object') for (const k of AUTHOR_FIELDS) delete event[k]; }
// The records of a package's trackPaths in `p`, by id, each as a copy in its JSON text (a document is JSON; in the order
// they stand, should an id stand twice), read back as a record only where a call changed it; an entry with no id is
// kept by its text alone.
const tracked = (p, paths) => paths.map(([path]) => { const out = new Map(), loose = []; for (const r of listAt(p, path)) if (r && typeof r === 'object' && r.id != null) out.set(r.id, [...out.get(r.id) || [], JSON.stringify(r)]); else loose.push(JSON.stringify(r)); return [path, out, loose]; });
// What a call may leave of a record it changed (ruling T1): the fields the path lists as the call left them; every other
// field as the boundary's copy (`old`, the record's text before the call) had it, in the copy's order; the revision moved
// forward by one where a listed field changed, else as it was. `now` is the record in the document, changed in place.
// The fields are kept as [key, value] entries and written back as the record's own (defineProperty), never by
// assignment, so a field of any name (one named "__proto__" included) is put back as the record held it.
function keepListed(old, now, listed) {
  const copy = JSON.parse(old), was = copy.revision ?? 0, out = new Map(), own = (o, k) => Object.getOwnPropertyDescriptor(o, k)?.value;
  const mended = [...listed].some(k => JSON.stringify(own(now, k)) !== JSON.stringify(own(copy, k)));
  for (const k of Object.keys(copy)) if (!listed.has(k)) out.set(k, own(copy, k)); else if (Object.hasOwn(now, k)) out.set(k, own(now, k));
  for (const k of Object.keys(now)) if (listed.has(k) && !out.has(k)) out.set(k, own(now, k));
  if (mended && Number.isInteger(was) && now.revision === was + 1) out.set('revision', now.revision);
  for (const k of Object.keys(now)) delete now[k];
  for (const [k, value] of out) Object.defineProperty(now, k, {value, enumerable: true, writable: true, configurable: true});
}
export function trackExtensions(prior, next, command, at, {author = null} = {}) {
  const inner = innerCommands(command);
  for (const c of inner.includes(command) ? inner : [command, ...inner]) for (const e of EXTENSIONS) if (typeof e.track === 'function') {
    const paths = trackedFields(e), before = tracked(next, paths), from = eventsOf(next).length;
    e.track(prior, next, c, at); unstated(next, from);
    before.forEach(([path, was, loose], i) => {
      const listed = new Set(paths[i][1]);
      for (const now of listAt(next, path)) {
        const id = now && typeof now === 'object' ? now.id : null, old = id != null ? was.get(id)?.shift() : undefined;
        if (old === undefined) { const n = id == null ? loose.indexOf(JSON.stringify(now)) : -1; if (n < 0) refuseTracker(e, 'added ' + refOf(now) + ' to ' + path); loose.splice(n, 1); continue; }
        if (old === JSON.stringify(now)) continue;
        keepListed(old, now, listed);
        if (JSON.stringify(now) === old) continue;
        const copy = JSON.parse(old);
        if (proposalOf(next, path, copy) !== proposalOf(next, path, now)) refuseTracker(e, 'would change whether ' + refOf(copy) + ' in ' + path + ' is AIW\'s proposal');
        stampTracked(copy, now, author, at);
      }
      const gone = [...was.values()].flat()[0] ?? loose[0];
      if (gone !== undefined) refuseTracker(e, 'removed ' + refOf(JSON.parse(gone)) + ' from ' + path);
    });
  }
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
// A package's upgrade is stored by a read, not inside a command (the lead's ruling J8 of 2026-11-19). A row whose
// package upgrade is due is one an earlier build stored; the read that finds it stores the upgrade as a storage
// upgrade, with a recovery point and its sentence in the activity (storage-upgrade.js). A command that reaches such a
// row first (a tab left open across the deploy) would write the upgrade into its own commit, as a design change and
// with no recovery point: worker.js asks this before it applies a command and answers the words with a reload (409, a
// conflict to the browser, which offers the latest project). The built-in read upgrades are as on rc.10.73.42.
export const upgradeDueRefusal = document => (extensionUpgradeNeeded(document) ? UPGRADE_DUE : null);
export function assertExtensions() {
  if (!builtInHandler) throw Error('The design packages cannot be checked: the built-in commands are not installed (worker.js installBuiltInCommands), so no command type is known to be free.');
  const problems = [...EXTENSIONS.flatMap(extensionIssues), ...extensionConflicts()];
  if (problems.length) throw Error('The design packages do not conform to the registration contract (audit/rc44/build-notes/s0-extensions.md):\n- ' + problems.join('\n- '));
}
