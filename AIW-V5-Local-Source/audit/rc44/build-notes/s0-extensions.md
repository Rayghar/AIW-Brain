# rc44 slice S0: shared registration — build notes

Branch `rc44/s0-extensions-c2` (continues `rc44/s0-extensions`, which a usage limit cut off), from `94dbd4f`.
Contract: `audit/rc44/BUILD-PLAN-2026-11-16.md` section 4. `productionAccepted` stays false.

## State

- **Done:** the registry, the hooks in the shared machinery, the server boundary, the two lists a package adds its line
  to, the suite (13 blocks, green), the size evidence, this contract. No package exists: the only extensions are the
  synthetic ones inside `rc44-s0-extensions-validate.mjs`.
- **In progress:** nothing.
- **Next (for the lead):** adversarial review, then merge. Section "Open questions" lists what the lead must rule on.

## What was built

| File | Where it runs | What it is |
|---|---|---|
| `public/design-extensions.js` | route (265 B) | The registry: `registerExtension`, `EXTENSIONS`, `extendTable`, `ensureExtensions`. Imports nothing, holds no project state. |
| `public/design-package-routes.js` | route (0 B today) | The browser's list of packages: one route stub a line. Empty. Imported by `project-store.js` only. |
| `design-packages.js` | server | The server's list of packages: one import a line. Empty. |
| `design-extension-boundary.js` | server | The command boundary of the packages (person-only, second-person, validate, undo, track, large), the built-in type probe, the start check. |
| `public/design-extension-parts.js` | server (in no client bundle) | The upgrade chain and its notes, the document sections, the conformance check and the clash check. |
| `rc44-s0-extensions-validate.mjs`, `rc44-s0-readings.mjs`, `rc44-s0-extensions-baseline.json` | suite | The eight cases of the contract and five more blocks; the readings compared byte for byte; their SHA-256 at `94dbd4f`. |
| `audit/rc44/build-notes/s0-size.json` | evidence | The route measurement, written by the suite from the build. |

Hooks in existing files (each a few lines, all commented "rc44, slice S0"): `public/record-graph.js` (types, the
emitter), `public/trace-kernel.js` (layers, hops), `public/document-memo.js` `sharedList` (checks), the ten chapter
domains (their findings list is named by its chapter number), `public/review-domain.js` (list 11, `hard`, evidence
keys), `public/canonical-command.js` (`stagedBy`), `public/workbench-ui.js` (reads `stagedBy`),
`public/record-lifecycle.js` and `public/provenance.js` (collections, nouns, paths), `public/review-plan.js` (nouns),
`public/project-store.js` (`ensureExtensions`), `public/readings-upgrade.js`, `storage-upgrade.js`,
`public/sdd-architecture.js`, `public/action-undo-domain.js`, `authorship.js`, `worker.js`.

## Contract for packages

A package is an optional part of the design model that lives in its own modules. It tells the shared machinery what it
adds by registering once. This section is the contract as built; the suite proves each line of it with a synthetic
package.

### The three things a package adds outside its own modules

1. **`design-packages.js`** (server): one line, `import './public/<package>.js';`. The server registers every package
   when it starts and then checks each one (`assertExtensions`). A package that does not conform stops the server, with
   every problem named in words.
2. **`public/design-package-routes.js`** (browser): one line, the route stub:
   `registerExtension({id: '<package>-route', needs: p => …, load: () => import(<the lazy entry that holds the package>)});`
   The stub has its own id. It is on the route and counts against the package's own route bytes.
3. **Its suite**, registered as `test:rc44-…` in `package.json`.

Nothing else in the shared machinery is edited to register a package. Edits of built-in behaviour are a different
matter: see "What the registry does not carry".

### `registerExtension(e)`

`e.id` is 2 to 61 lower-case letters, digits and hyphens, starting with a letter (not `constructor`). The first
registration under an id stands; registering it again changes nothing. Readers read the packages **sorted by id**, so
the order of registration never shows. The id therefore decides: the order of a package's layers after the built-in
ones, the order of its findings within a chapter, the order of its sections at one anchor, the order of its upgrade
step, and who keeps a row two packages both state (the earlier id). Choose it with that in mind.

Every part is optional.

| Part | Shape | Read by |
|---|---|---|
| `objectTypes` | `{type: {label, chapter, level, prefix}}` | `record-graph.js` `OBJECT_TYPES` |
| `records` | `(p, add, rel) => void` | `record-graph.js` `recordRelations`: the record graph and the connected model |
| `layers`, `hops` | `{layer: type}`, `[{layer, types, from, dir, ctx, only?}]` | `trace-kernel.js` |
| `checks` | `{chapter: p => [finding]}` | `document-memo.js` `sharedList`: the chapter's checks, the review, readiness |
| `commands` | `{type: {apply, staged?, person?, second?, validate?, undo?, track?, large?}}` | `design-extension-boundary.js` (server), `canonical-command.js` `stagedBy` |
| `lifecycle` | `{path: chapter}` | `record-lifecycle.js` `COLLECTIONS` |
| `provenance` | `{nouns: {path: noun}, paths: {type or prefix: [path]}, records: {path: chapter}}` | `provenance.js` |
| `designKeys`, `evidenceKeys` | `[key]` | `review-domain.js` `designOf` |
| `upgrade`, `upgradeNote` | `p => p`, one sentence | `readings-upgrade.js`, `storage-upgrade.js` (server) |
| `sections` | `[{document, after, markdown(p)}]` | the export routes of `worker.js`, `sdd-architecture.js` (server) |
| `needs`, `load` | `p => boolean`, `() => Promise` | `project-store.js` through `ensureExtensions` |

### The parts, one by one

**`objectTypes`.** A type name is letters and digits. `chapter` is 1 to 11. `level` is one of `context`, `logical`,
`intent`, `data`, `application`, `capability`, `protection`, `technology`, `interaction`, `deployment`. `prefix` is
the id prefix of the kind's records, 2 to 5 capitals; nothing reads it at run time, and the start check refuses two
packages that state the same one. A type that is built in, or that a package earlier by id states, stays as it is.

**`records(p, add, rel)`.** Called by the one emitter, after every built-in record and relation, for the record graph
and the connected model alike. It is not called for the driver-scope graph (`recordGraph(p, 'component')`).
- `add(record, type, source)` registers the record as an object. `source` names where it lives, by convention
  `'<path>.<id>'` (`'notes.records.NOTE-001'`). A record whose id something already holds is not registered: a package
  never stands in a built-in record's place.
- `rel(type, from, to, {source, id?, label?, attributes?, derived?, via?})` states a typed relation. It never replaces
  one. `source` names the field that states it (`'notes.records.componentId'`). State a relation only between records
  that exist: one with a missing end is left out of the record graph and is listed as unresolved in the connected model.
- **With none of the package's records in the document the emitter states nothing.** That holds for relations between
  two built-in records too (wp9a's `recovers` between environments): they are read from fields that exist only once
  the package wrote them.
- A relation of a type a built-in hop reads (`fulfils`, `constrains`, `justifies`, `realizedBy`, `hasNeed`, `metBy`,
  `implementedBy`, `provides`, `uses`, `exchanges`, `owns`, `operatedAs`, `placedAs`, `locatedIn`, `protects`,
  `enforces`, `threatens`, `mitigates`) between two **built-in** records would put a record on a built-in trail. The
  registry cannot tell that from an honest relation. Do not state one; the package's suite proves the reference trails
  are unchanged.
- `rel('fulfils', requirementId, record.id, …)` is how a requirement names the package's record.

**`layers`, `hops`.** `layers` is `{layer: object type}`: a type stands on one layer. A package's layers follow the
built-in eighteen, in id order and then in the order stated. A built-in type that stands on no built-in layer may be
given one (wp2's `mechanism` layer of type `pattern`); a type that already stands on a layer stays there.
A hop is `{layer, types, from, dir, ctx}`:
- `layer`: the layer the record joins. It must be a package's layer. **A hop onto a built-in layer is ignored** (and
  refused at start): a built-in layer reads the built-in hops and no other.
- `types`: the relation types that bring the record (`null` for any, then give `only: relation => boolean`).
- `from`: the layers of the record it comes from. Each is a built-in layer, an earlier layer of the same package, or a
  layer of a package **earlier by id**. The walk reads the layers in order, once.
- `dir`: `'out'` when the relation runs from the earlier record to this one, `'in'` when it runs to the earlier record.
- `ctx`: `false` for the requirement's own chain (its spine, which the governance checks read), `true` for context
  (on the trail, not on the spine). It must be stated.
- The hop from `requirement` whose types include `fulfils` is the layer's naming hop (`namedBy`,
  `namingRequirements`).
- A trail lists a package's layer only when it holds a record: read `T.layers.note || []`.

**`checks`.** `{chapter: p => [finding]}`. For chapters 1 to 10 the findings follow the chapter's own, in every reader
of the chapter's checks: its Validate, the review's inherited findings (`C<chapter>:<id>`), readiness, the blockers.
For `11` they join the review's own list (`EVIDENCE:<id>`); such a finding states its `chapter` and `chapterTitle`
itself, as `knowledgeFindings` does.
- A finding is `{id, code, title, detail, level, objectId, hard?}`. `id` is unique in the chapter, by convention
  `'<code>:<record id>'`. `level` is `'error'` or `'warning'`.
- `objectId` names the record the finding is about. When that record is in a collection the provenance reader reads
  (`lifecycle` or `provenance.records`), a treatment of the finding holds until **that record** changes; otherwise it
  holds until anything in the design changes.
- `hard: true`: the finding takes no treatment at all. `review.disposition` refuses every treatment and
  `treatmentsFor` offers none. Give it `level: 'error'`, so that it blocks until the design changes.
- The function answers `[]` for a document without the package's records, is pure, and is cheap: it runs wherever the
  chapter's checks are read (kept per settled document on the client).
- No candidate or unreleased knowledge reaches a check (ruling 6). The package's suite proves it.

**`commands`.** The type is `prefix.name`. **A type a built-in handler takes is never a package's**: the server asks
the built-in handler once per type, and only a type it refuses as unknown is free. Free today: every new prefix, and
unknown names under `requirements`, `quality`, `decision`, `logical`, `realisation`, `technology`, `techrealisation`,
`interfaces`, `security`, `runtime`, `review`, `process`, `record`, `change`, `workspace`, `knowledge`, `action`,
`validation`, `lens`, `coauthor`, `case`, `standards`, `assurance`, `alternative`, `model`. Closed (their handler does
not answer "Unknown … action."): `guide`, `brain`, `protection`, `exchange`, `architecture`, `design`, `evidence`,
`intelligence`. The types of the four designs (`knowledge.concept-pin`, `adoption.apply`, `selection.judge`,
`workload.model`, `runtime.node`, `runtime.failure-accept`, `technology.domain-evidence`, …) are free; the suite
asserts it.
- `apply(document, command, at, actor, {author, revision})` answers `{document, selected?, created?}`. It works on the
  copy it is handed and throws `Error(words)` to refuse. Everything around it is the boundary every command has: shape
  and size checks, the commit's author, the revision check, provenance and authorship stamps, the journal with actor,
  author kind and reason, the activity row, the idempotency receipt.
- `staged: true`: an ordinary design edit. A reviewed batch may carry it (`workspace.apply`, an alternative, the
  workbench's change review), and a single edit of an existing record is reviewed as a built-in design edit is. In a
  batch the handler is called with four arguments: **it is not told the author there.** Never with `person` or
  `second`.
- `person: true`: a signed-in person's step. An agent account and a draft by Sol are refused before the project is
  read (`authorship.js` `refuseUnreviewable`); an import is refused by the boundary.
- `second: (p, command) => record | [records] | null`: a second person's step. It is person-only, and the function
  answers the record acted on, as `{id, actor, history: [{revision, actor}], owner?}`. The one rule,
  `verifierRefusal` (`public/architecture-obligations.js`), refuses whoever wrote any revision of it, its owner, an
  agent, a request with no signed-in actor, and a record that names no author. So the record must keep `actor` and a
  `history` entry with `revision` and `actor` for every save. No package writes its own check (ruling 5).
- `validate(p, command, {at, actor, author})` answers a refusal in words, or nothing. It is for what the type refuses
  **by who writes the commit** (wp3: a draft by Sol states no figure). The server asks it before anything is applied,
  for the command sent on its own and for each command of the type inside a batch a request carries, with the document
  as the request finds it. Everything else is refused by `apply`, which sees the document as the earlier commands of a
  batch left it. The browser's previews do not ask it.
- `undo: {previous(p, command), revert(p, previous, at, actor)}`: the latest saved action is undone by its receipt, by
  the account that saved it, while nothing else has changed. Not for a staged type.
- `track(prior, next, command, at)`: adds the command's change events to `next.changes.events` (and is called for the
  type inside a reviewed batch). The boundary stamps them with who, of what kind and why.
- `large: true`: the request may carry up to 500 KB.

**`lifecycle`.** `{path: chapter}`, the path a key of the document or `chapter.list`, the chapter 1 to 10. The
collection's records retire, restore and keep through `record.retire`, `record.restore` and `record.keep`, with who,
when and why. Consequences to know: a record of such a collection that names another record's id stops that record's
retirement ("still named by"), and the other way round; a retirement moves the owning container's `version` and clears
its `review` and `handoff` (for a top-level container those two keys are written as `null`). The provenance reader
reads a lifecycle collection without being told.

**`provenance`.**
- `nouns: {path: noun}`: the singular noun of a collection ("Review 3 design notes drafted by Sol").
- `paths: {command type or prefix: [path]}`: the collections the commands of that type or prefix write, so that the
  boundary stamps who wrote and who confirmed each record. Under a built-in prefix (`runtime`, `technology`) they are
  read with the built-in ones, never in their place.
- `records: {path: chapter}` (chapter 1 to 11): a collection the provenance reader reads that does **not** retire
  through the lifecycle family (wp2's adoption records, which have their own withdraw). Its records are counted by
  author, listed in the review plan and found by `findRecord`; they stop no retirement.

**`designKeys`, `evidenceKeys`.** A key is a key of the document or `chapter.key`. Every key a package writes is
design, as any key is: the design fingerprint reads it, and the first record written moves the fingerprint.
`designKeys` declares them; the start check refuses one that lies where the fingerprint does not read.
`evidenceKeys` leave the design: a **list** is evidence beside the design (it moves `evidenceStamp`, not the design
stamp); an **object** is bookkeeping beside the design, which neither fingerprint reads (as `dataOwnership` is: wp3's
`workloadMigration`). The registry converts no stored stamp: an upgrade step that adds a design key to an old document
moves that document's design stamps, and handling that is the package's (as D14 did in `readings-upgrade.js`).

**`upgrade(p)`, `upgradeNote`.** An idempotent step for documents written before the package. It answers `p` itself
when it has nothing to do (that is how "needs an upgrade" is read, on every read of a project, so the no-op path must
be cheap), and a **new** document when it changes something; it never changes the one it is handed. It works on a
document as stored, which may lack any chapter, and also on the output of the built-in upgrades. A stored row the step
changes is stored again on its next read, with a recovery point. `upgradeNote` is one sentence that says what the step
did; it follows the storage upgrade's own words in the project's activity, only for a document the step changed.

**`sections`.** `{document, after, markdown(p)}`. `document` is `'registers'` (the working registers), `'sdd'` (the
architecture edition, every audience), `'ars'`, or `'chapter-1'` to `'chapter-10'` (that chapter's own register).
`after` is a heading line exactly as the document prints it (`'## Performance specification'`). The section stands at
the end of the section that heading opens, before the next heading of the same or a higher level; sections at one
anchor follow each other in id order. A section that answers no text is not printed, and neither is one whose anchor
the document or edition does not print. A package places a section; it does not replace built-in text. Documents are
assembled on the server only.

**`needs(p)`, `load()`.** Stated together, by the route stub. `needs` says whether a document holds the package's
records; it is asked at every read and every save and reads only the document. `load` loads the package. The project
store awaits `ensureExtensions(project)` where it reads a project and where a save answers, before the document is
settled and drawn; `ensureExtensions` takes the project as read (`{document, …}`) and answers it.

### Loading on the client (measured at S0)

`load` is one dynamic import. Where it points decides the cost. Measured with a 30 KB example package and a stub line
of 90 to 97 B (scratch builds, not kept):

| How the package is held | Chapters route | Script files |
|---|---|---|
| Statically imported by an **existing lazy entry**, `load` imports that entry | +217 B for the first package (stub and the first use of `registerExtension`) | 148, unchanged |
| A lazy entry of its own that imports only the registry | +784 B | 150 (+2), and one more file under 10 KB |
| A lazy entry of its own that imports `record-graph.js` | +1,157 B | 150 (+2) |

A new entry makes esbuild split the shared chunks again: the modules the package shares with the route move to a new
chunk, and every chunk that uses them pays an import statement. So: **hold the package in an existing lazy entry.** A
package that needs an entry of its own needs the lead's ruling on both the bytes and the two script files.

### What the registry does not carry

An extension only adds. These items of the four designs are not registration rows; each stays an edit of built-in code
by its package, inside the package's own allowance:

- **wp2:** the built-in emitter skipping a task that has `adoptionId`; `architectureSolutionsFor`,
  `acceptedObligation`, `design-task-state.js`, `design-questions.js`, `model-reversal.js`, `component-library.js`,
  `normaliseOption`; the "Alternatives considered" text of the SDD; the design fingerprint 3 conversion.
- **wp3:** the kernel moves and the branches in `desk-capacity.js`, `quality-analysis.js`,
  `architecture-analysis.js`; the new refusal in `review.objective`. `registerPerformanceSection` as designed
  **replaces** built-in text, which the registry does not do: place a section after `## Performance specification`, or
  change `performanceMarkdown` itself.
- **wp9a:** H1, H4, H5, H11 (a refusal inside `workspace.merge`), H13 to H16. H3, H6 to H10 and H12 are registration
  rows here.
- **wp1:** the changes inside `knowledge-governance.js` and `architecture-knowledge-unit.js`, and wrapping
  `applyKnowledgeCommand`. Its new `knowledge.*` types, the `concept` type, the pins' emitter, the list-11 finding and
  the Appendix E section are registration rows.

Limits of what is carried:

- **Staging of a built-in type.** The staged path cannot tell a built-in type that is not staged (`decision.accept`)
  from a package's type: the list of built-in types is the server's. A package that states such a type as staged is
  refused by the start check, not by construction. Dispatch (`POST /api/commands`) is by construction.
- **Evidence keys.** A package leaves only its own keys out of the design. An evidence key that names a key the
  workbench keeps (`artefacts`, `quality.drivers`, `runtime`, …) is refused by the start check, not by construction:
  the design fingerprint has no list of built-in keys on the route.
- **What a package's functions do is the package's.** The tables are extended by construction (a built-in row always
  stands). `records`, `apply`, `upgrade` and `track` are code: the registry cannot stop one from writing a built-in
  key or stating a relation between built-in records. The start check reads what a package states, not what its
  functions do; the package's own suite and its review cover that.
- **A package's records are not in a chapter's "N records" count** (`chapter-records.js` reads
  `RECORD_COLLECTION_PATHS`) and are not typed for recorded relationships (`recordTypes`): a connection a person draws
  to a package's record would read as a broken link.
- **Views.** No view knows a package's type or layer: there is no ink, icon or column for it. No browser suite was
  run for this slice, because no package exists to draw.
- **The browser stages only what it has loaded.** A package's staged command previews on the client once the package
  is loaded, which is where its surface lives.

### Proving the old-document rule in a package's suite

`rc44-s0-readings.mjs` gives the ten readings as text (`readings(p)`) and as SHA-256 (`digests(p)`) for
`REFERENCES` (`bank-payment`, `clinic-appointments`, `parcel-lockers`): graph, connected model, trails and spines,
findings with stamps, fingerprints, readiness, provenance, registers, SDD, ARS. Capture the goldens from an unchanged
checkout of the slice's base: `node rc44-s0-readings.mjs --capture <sha> > rc44-<slice>-baseline.json`. Then compare
with the package registered. Do not reuse S0's golden file once built-in behaviour has moved.

### A minimal worked example

This package was run against the registry as it stands here (conformance, save through `POST /api/commands`, the
trail, the finding, the author refused and a second person accepted, retire); it is not in the repository.

```js
// public/example-notes.js — imported by design-packages.js (server) and by an existing lazy entry (browser)
import {registerExtension} from './design-extensions.js';
const notes = p => p.notes?.records || [];
function applyNote(p, command, at, actor) {
  const raw = command.payload || {}, s = p.notes ??= {version: 0, counter: 0, records: []};   // the key is created when first written
  const find = () => { const r = s.records.find(x => x.id === raw.id); if (!r) throw Error('Choose a design note.'); return r; };
  if (command.type === 'note.save') {
    if (typeof raw.title !== 'string' || !raw.title.trim()) throw Error('Name the design note.');
    let r = raw.id ? find() : null;
    if (!r) { r = {id: 'NOTE-' + String(++s.counter).padStart(3, '0'), revision: 0, history: []}; r.ref = r.id; s.records.push(r); }
    Object.assign(r, {title: raw.title.trim(), requirementIds: Array.isArray(raw.requirementIds) ? raw.requirementIds : [], componentId: raw.componentId || '', revision: r.revision + 1, actor});
    r.history.push({revision: r.revision, actor, at});   // who wrote each revision: what the second-person rule reads
    s.version++; return {document: p, selected: r.id};
  }
  if (command.type === 'note.accept') { const r = find(); r.acceptance = {actor, at, revision: r.revision}; s.version++; return {document: p, selected: r.id}; }
  throw Error('Unknown note action.');
}
registerExtension({
  id: 'example-notes',
  objectTypes: {note: {label: 'Design note', chapter: 3, level: 'intent', prefix: 'NOTE'}},
  records(p, add, rel) {
    for (const r of notes(p)) {
      add(r, 'note', 'notes.records.' + r.id);
      for (const id of r.requirementIds || []) rel('fulfils', id, r.id, {source: 'notes.records.requirementIds'});
      if (r.componentId) rel('annotates', r.id, r.componentId, {source: 'notes.records.componentId'});
    }
  },
  layers: {note: 'note'},
  hops: [{layer: 'note', types: ['fulfils'], from: ['requirement'], dir: 'out', ctx: false},
         {layer: 'note', types: ['annotates'], from: ['component'], dir: 'in', ctx: true}],
  checks: {3: p => notes(p).filter(r => !r.acceptance || r.acceptance.revision !== r.revision).map(r => ({id: 'note-unaccepted:' + r.id, code: 'note-unaccepted', title: 'Have the design note accepted', detail: r.id + ' is not accepted by a second person at its current revision.', level: 'warning', objectId: r.id}))},
  commands: {
    'note.save': {apply: applyNote, staged: true},
    'note.accept': {apply: applyNote, second: (p, command) => notes(p).find(r => r.id === command.payload?.id) || null}
  },
  lifecycle: {'notes.records': 3},
  provenance: {nouns: {'notes.records': 'design note'}, paths: {note: ['notes.records']}},
  designKeys: ['notes']
});
```

```js
// design-packages.js (server): one line
import './public/example-notes.js';
// public/design-package-routes.js (browser): one line, with registerExtension imported from design-extensions.js
registerExtension({id: 'example-notes-route', needs: p => !!p.notes, load: () => import(<the lazy entry that imports example-notes.js>)});
```

With that: `NOTE-001` is in `recordGraph(p)` and the connected model; `requirementTrace(p, requirementId).layers.note`
holds it; `linkedVia(p, 'NOTE-001', 'annotates')` is its component; Chapter 3's checks hold `note-unaccepted:NOTE-001`;
`note.accept` by its author answers "A second signed-in person, who did not write or own the action, verifies it.
architect-a wrote NOTE-001." and by another person is recorded; `record.retire` retires it.

## Deviations from the contract and the designs

1. **`ensureExtensions(project)` takes the project as read (`{document, …}`) and answers it**, where the contract
   writes `ensureExtensions(p)`. It saves about 25 B on the route, and the store no longer holds a saved document it
   has not yet loaded the packages for.
2. **Parts beyond the contract's table**, each asked for by a hook list of the four designs: `provenance.records`
   (wp2: adoption records read by provenance, not retired by the family), `upgradeNote` (wp3: the clause in the
   storage upgrade's activity), `chapter-n` documents for `sections` (wp9a H12, wp3's register), `large` (wp3) and
   `track` (wp2, wp3: the server's change trackers). `validate` is in the contract's row; here it is a function of
   its own only for what the handler is not told inside a batch (the commit's author), and every other refusal is
   the handler's, as in built-in commands.
3. **A package's layers stand after the built-in ones**, where wp3 writes its layers between built-in ones
   (`… 'driver', 'service', 'workload', 'objective', 'decision' …`). Its hops are all context hops from built-in layers
   and from its own earlier layer, so they work unchanged; only the listed order differs.
4. **`hard` means no treatment at all**, as the contract's test 3 says. wp2 (`waivable: false`) and wp3
   (`C10:limit-breach` in the non-waivable class) ask for the rc.10.73.42 class, which may still be fixed before
   review or carried as an action. See open question 2.
5. **First registration under an id stands.** An earlier state of this slice merged a second registration under the
   same id (so that the route stub and the module shared one id). The stub now has its own id; registration is simpler
   and idempotent in the plain sense.
6. **The registry, 265 B, is under the 700 B allowance, but the whole slice is 686 B**: the hooks are the larger part.
7. **Chapter findings lists are named by their chapter number** in `sharedList` (they were named by strings such as
   `'decisions:findings'`), so that one place adds the packages' findings for every reader.
8. **The review's own list** (`inheritedSupplement`) is kept by `sharedList` as list 11 and is the one statement of
   that list (`evidenceRaw` reads it), where it was written out twice.
9. `RECORD_NOUNS` and `COLLECTIONS` are no longer frozen: they are the tables the packages' rows join. Nothing read
   their frozenness.

No existing assertion was deleted, loosened or replaced.

## Measurements

Baseline built from an archive of `94dbd4f` in this session (`node build.mjs`): chapters route 3,228,863 B, projects
route 506,102 B, 148 script files, 53 under 10 KB, stylesheet 901,873 B. The golden digests in
`rc44-s0-extensions-baseline.json` were captured again from that tree and are byte-identical to the committed file.

| | Baseline | S0 | Cap |
|---|---|---|---|
| Chapters route (code) | 3,228,863 B | 3,229,549 B (**+686 B**, allowance 700) | 3,233,792 B (unchanged; 4,243 B left) |
| Projects route (code) | 506,102 B | 506,599 B (+497 B) | 1,242,112 B (unchanged) |
| Script files | 148 | 148 | 148 (unchanged) |
| Files under 10 KB | 53 | 53 | 61 (unchanged) |
| Stylesheet | 901,873 B | 901,873 B | 902,144 B (unchanged) |
| The registry module | — | 265 B | — |

`audit/rc44/build-notes/s0-size.json` holds the same figures; `node rc44-s0-extensions-validate.mjs --measure` rewrites it
from the build and `AIW_S0_MEASURE=1` makes the suite compare its own build with it.

Lint: 162 problems, 162 baseline, 0 new. `node check-syntax.mjs` passes.

## Suites

On the baseline tree the suite's block 6a passes and the twelve other blocks fail ("the registration point exists").
On this branch all thirteen pass. Mutation checks made while building, each seen to fail and then restored: the
emitter's guard removed (blocks 6b, only adds, 7 fail); a built-in layer reading the packages' hops (only adds
fails); the provenance reader's own collections not deduplicated (6b, 7 fail).

The existing suites that import the changed modules were run two at a time (the list and each result are in the
slice's result). Three of them are red, each with the failure it has on the baseline tree, run in this session:
`test:command-equivalence`, `test:chapter-reasoning`, `test:sol-disclosure`. `test:scale` was not run (15 minutes,
red at the baseline for this machine's speed).

## Open questions (for the lead)

1. **A package's own lazy entry costs 0.8 to 1.2 KB of route bytes and two script files** (the table above). Ruling 3
   counts one script per entry and ruling 2 allows 600 B a package. wp3 asks for `workload-engine.js` as an entry.
   Either it is held in an existing lazy entry, or it needs a larger grant.
2. **`hard` or the non-waivable class.** If a package's finding should be non-waivable yet still be carried as an
   action, the registry needs a second flag (about 40 B on the route), or the finding's code joins `NON_WAIVABLE` by
   an edit of `review-domain.js`.
3. **The second-person refusal's words** are the delivery action's ("…verifies it. X wrote NOTE-001."). They are
   reused as ruling 5 says. Words that fit every accept step would be a change to `verifierRefusal` itself.
4. **A package's records in a chapter's record count and in views** (above, "Limits"). wp7 owns the views; the count
   would cost about 50 B on the route.
5. **Ids order the layers.** A hop comes from a layer of a package earlier by id. If wp2's `mechanism` must later be
   reached from wp9a's layers, the ids of the two packages decide whether that is a hop of wp2 or of wp9a.
6. **Route headroom after S0 is 4,243 B.** At 600 B a package that is seven packages, not eleven.
7. **A directory named `evidence/` is not committed in this repository**: `.git/info/exclude` of the main checkout
   ignores every `evidence/`. The slice's measurement is therefore kept in `audit/rc44/build-notes/s0-size.json`.
   The wp1 and wp4 designs name `audit/rc44/evidence/…` for their evidence files; written there they would stay
   out of every commit without a word.
8. **Source scanners read comments.** `rc42-g1-tech-approval-validate.mjs` (D3) follows every import-shaped text in
   `public/*.js`, comments included. A comment that shows an import of a file that does not exist turns that suite
   red (it did here, once). Write examples in comments without a quoted path.
