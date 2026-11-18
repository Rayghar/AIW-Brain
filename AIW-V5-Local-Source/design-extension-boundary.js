// The command boundary of the design packages (rc44, slice S0), a server module. A package states its command types
// with registerExtension (public/design-extensions.js: commands {type: {apply, staged, person, second, validate, undo,
// track, large}}); worker.js dispatches a type a package states through this module, and everything around the handler
// is the boundary every command has: the shape and size checks, the commit's author (authorship.js), the revision
// check, provenance and authorship stamps, the change trackers, the journal with actor, author kind and reason, the
// undo receipt, the activity row and the idempotency receipt. This module adds what a command type says of itself:
//   person   a person's step: a draft by Sol and an agent account are refused before the project is read
//            (authorship.js isReviewCommand, refuseUnreviewable), and an import is refused here;
//   second   a second person's step: person-only, and second(p, command) answers the record (or records) acted on,
//            each {id, actor, history: [{revision, actor}], owner?}: verifierRefusal (public/architecture-obligations.js),
//            the one second-person rule, refuses whoever wrote any revision of it, an agent, a request with no
//            signed-in actor and a record that names no author;
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
import {COLLECTIONS} from './public/record-lifecycle.js';
import {innerCommands} from './public/provenance.js';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {extensionIssues as partIssues, extensionConflicts, COMMAND_TYPE} from './public/design-extension-parts.js';
export {upgradeExtensions, extensionUpgradeNeeded, extensionUpgradeNotes, placeSections, extensionConflicts} from './public/design-extension-parts.js';

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
// The command a package states for a type, of the first package by id that states it; null for a type no package
// states and for one a built-in handler takes.
export function extensionCommand(type) {
  if (typeof type !== 'string' || !COMMAND_TYPE.test(type)) return null;
  for (const e of EXTENSIONS) { const c = e.commands; if (c && Object.hasOwn(c, type) && typeof c[type]?.apply === 'function') return builtInType(type) ? null : c[type]; }
  return null;
}
// The handler worker.js calls for a package's type, (document, command, at, actor, {author, revision}) as every
// handler is called, or null. It refuses what the type says of itself, then applies.
export function extensionHandler(type) {
  const c = extensionCommand(type);
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
      for (const r of records) { const refusal = verifierRefusal(r, actor, author.account); if (refusal) throw Error(refusal); }
    }
    const refusal = c.validate?.(p, command, {at, actor, author});
    if (refusal) throw Error(String(refusal));
    return c.apply(p, command, at, actor, options);
  };
}
// What the packages' types refuse inside a batch a request carries (a reviewed change, an applied alternative: the
// commands provenance.js innerCommands reads), each asked with the commit's author before the batch is applied; the
// command sent on its own is asked by its handler above (worker.js, before the command is dispatched).
export function validateExtensions(p, command, context) {
  for (const c of innerCommands(command)) { if (c === command) continue; const refusal = extensionCommand(c?.type)?.validate?.(p, c, context); if (refusal) throw Error(String(refusal)); }
}
// The change events of a package's command, and of its types inside a reviewed batch (worker.js trackCommandChanges).
export function trackExtensions(prior, next, command, at) {
  const inner = command?.type === 'workspace.apply' && Array.isArray(command.payload?.commands) ? command.payload.commands : [];
  for (const c of [command, ...inner]) extensionCommand(c?.type)?.track?.(prior, next, c, at);
}
// Whether a request of this type may be large (worker.js, beside LARGE_COMMAND_PREFIXES).
export const extensionLarge = type => extensionCommand(type)?.large === true;
// A package's person-only and second-person types are review commands to authorship.js, and a type that states an
// undo is reversible to action-undo-domain.js: both read the admitted command from here.
registerReviewTypes(type => { const c = extensionCommand(type); return !!c && !!(c.person || c.second); });
registerUndoExtensions(type => { const c = extensionCommand(type); return c?.undo && !c.staged ? c.undo : null; });

// The keys the workbench itself keeps, read from the documents it makes (a blank project and the reference, as a read
// completes them) and from the built-in collections: a package leaves only its own keys out of the design
// (evidenceKeys), never one of these, or a change to a requirement would no longer move the design fingerprint.
let made = null;
function builtInKey(key) {
  made ??= ['blank', 'bank-payment'].map(template => withFinalReview(createProject({name: 'Probe', template}, 'probe', PROBE_AT)));
  const [a, b] = String(key).split('.'), stated = path => EXTENSIONS.some(e => e.lifecycle && Object.hasOwn(e.lifecycle, path));
  return made.some(p => (b ? !!p[a] && typeof p[a] === 'object' && b in p[a] : a in p)) || COLLECTIONS.some(([path]) => !stated(path) && (path === key || !b && path.split('.')[0] === a));
}
// What a package states that the contract does not allow (public/design-extension-parts.js), with the command types a
// built-in handler takes and the built-in keys it would leave out of the design; and the check the server makes when it
// starts: a package that does not conform stops it.
export function extensionIssues(e) {
  const out = partIssues(e), name = /^(?!constructor$)[a-z][a-z0-9-]{1,60}$/.test(String(e?.id || '')) ? e.id : 'A design package';
  for (const type of Object.keys(e?.commands && typeof e.commands === 'object' ? e.commands : {})) if (COMMAND_TYPE.test(type) && builtInType(type)) out.push(name + ': command “' + type + '” is built in; it stays the chapter\'s own.');
  for (const key of Array.isArray(e?.evidenceKeys) ? e.evidenceKeys : []) if (typeof key === 'string' && builtInKey(key)) out.push(name + ': evidence key “' + key + '” is a key the workbench keeps: a package leaves only its own keys out of the design.');
  return out;
}
export function assertExtensions() {
  const problems = [...EXTENSIONS.flatMap(extensionIssues), ...extensionConflicts()];
  if (problems.length) throw Error('The design packages do not conform to the registration contract (audit/rc44/build-notes/s0-extensions.md):\n- ' + problems.join('\n- '));
}
