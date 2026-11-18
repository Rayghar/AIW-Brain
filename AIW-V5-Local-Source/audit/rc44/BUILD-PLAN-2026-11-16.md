# AIW rc44 upgrade: build plan and baseline checkpoint

**Date:** 2026-11-16
**Baseline:** AIW v0.10.0-rc.10.73.42+integrity.20261116 (release tree `2f685b3`, merged at `84c2c83`).
**Proposed release:** AIW v0.10.0-rc.10.73.44. The owner has not confirmed the number; .43 belongs to the other line of work.
**Owner's instruction (2026-11-16):** "use your current version. proceed." The upgrade is built on this repository's source line.
**productionAccepted** stays false.

This file supersedes sections 5 and 8 of `UPGRADE-PLAN-2026-11-16.md` where they say work waits for the RC43 source. Everything else in that plan stands.

**Amended 2026-11-18** by `RULINGS-2026-11-18.md`: section 2 items 2 and 3 (allowances after S0) and section 4 test 3 (`hard` means no waiver, not no disposition).

## 1. What exists at this checkpoint

| Item | State |
|---|---|
| rc.10.73.42 (integrity fixes D1–D20) | Closed. Evidence in `audit/rc42/`. |
| Owner's target description | `inputs/OWNER-TARGET-DESCRIPTION-2026-11-16.md` |
| Designs written against the rc.10.73.42 code | `design/wp1-knowledge.md`, `design/wp2-adoption.md`, `design/wp3-workload.md`, `design/wp4-behaviour.md`, `design/wp9a-deployment.md` |
| Designs not yet written | change plans (wp5), evidence (wp6), views (wp7), guided modelling (wp8), governance (wp9b), contexts and operations design (wp9c). They are written just before their build, so they describe the code as it then is. |
| Second review of the designs | Not done: the reviewing agents were stopped by the usage limit three times. Each build slice is reviewed adversarially instead, and that reviewer is asked to challenge the design as well as the code. |
| The four document sets (Master Course, Explained Reference, Illustrated Compendium, Expanded SA Playbook) | Not in this session. Knowledge intake starts from the 27 reviewed handbooks. The four sets go through the same intake when they arrive. |

Each design states what it cannot honestly deliver yet. Three limits recur and are not engineering problems:
- Handbook content can be imported only as **candidates**. A second authorised person must release each decision-bearing form. That person is not assigned.
- Licence counsel has not reviewed the owner's statement of permitted use.
- Capabilities the target description attributes to RC43 (thirty design methods, `design-contracts.js`) do not exist here. The designs build on what this code has.

## 2. Rulings by the lead

1. **One registration point (slice S0, built first).** Four designs each need to add record kinds, relations, trace layers, checks, command handlers, lifecycle rows and document sections to the same shared modules. Done separately that costs about 4.4 KB of the 4.9 KB left on the chapters route, and every package would edit the same lines. S0 adds one small on-route registry that the shared machinery reads; each package registers there from its own lazily loaded module. The server installs every package at start.
2. **Chapters route cap: unchanged** (3,233,792 B). S0 may use up to 700 B. After S0 each package may add at most 600 B.
3. **Script files:** the gate is 148 today. A package may add **one** lazy entry when its design shows that no existing lazy chunk can host it, up to the rc.10.73.41 figure of **150**. Beyond 150 the owner decides. Each addition is measured and written into `client-bundle.mjs`.
4. **Stylesheet cap: unchanged.** 271 B are left; new surfaces reuse existing classes.
5. **A second person on every new accept, approve, release, waive or acceptance step.** Packages reuse `verifierRefusal` (`public/architecture-obligations.js`) and the actor rules the rc.10.73.42 fixes introduced. No package writes its own check.
6. **Candidate knowledge is inert.** No candidate or unreleased form reaches a check, an eligibility gate, a score or a conformance reading. Each package's suite must prove it.
7. **Old documents.** Every new key is created only when first written. A document with none of the new records must read byte-identically: same findings, same stamps, same SDD.
8. **Resumable work.** Build agents commit work in progress on their branch and keep a notes file, because the usage limit interrupts them.

## 3. Order of work

Each slice: tests first (a case that fails today), the change, an adversarial review by a separate agent, one fix-up round, then merge by the lead with a rebuild and the related suites. A full regression closes each wave.

| Wave | Slices | Delivers |
|---|---|---|
| 0 | **S0** shared registration | The extension point every package uses. No visible change. |
| 1 | wp2 S1; wp1 S1 | The adoption record with second-person acceptance and its trace layer; knowledge forms and the concept register. |
| 2 | wp2 S5; wp1 S2, S3; wp9a S1 | **Component selection as a recorded decision**; one identity per mechanism; pins and currency; typed failure domains and deployment nodes. |
| 3 | wp1 S4, S5; wp2 S2–S4; wp9a S2, S3 | **Handbook slices imported as candidates** with a point-of-use view; patterns applied through the adoption record; declared failures and location gates. |
| 4 | wp3 S1–S6; wp2 S6; wp9a S4–S6 | One workload model; the eight old design-task paths retired; blueprints and rollout populations. |
| 5 | wp4, then wp5, wp6, wp9b | Behaviour evaluation; one change plan; evidence binding; standards, waivers and acceptance. |
| 6 | wp7, wp8, wp9c | Question-driven views; guided modelling and practice; bounded contexts and operations design. |

Waves 1 to 3 come first because the owner singled out components, the component library, deployment architectures and the selection of components that realise the architecture.

**Pace.** The four designed packages hold 24 slices and the whole upgrade about 55. With the usage limit, about one slice is finished per five-hour window. That is weeks of elapsed time. Each wave is merged and pushed when it closes, so the product improves wave by wave.

## 4. Slice S0: shared registration (the lead's contract)

**Purpose.** One place where an optional design package tells the shared machinery what it adds, so that packages do not each edit `record-graph.js`, `trace-kernel.js`, `record-lifecycle.js`, `provenance.js`, `canonical-command.js`, `review-domain.js`, the readings upgrade and the project store.

**Module.** `public/design-extensions.js`, on the route, with no import of any package. `registerExtension(e)` takes an object with a unique `id` and any of these parts:

| Part | Read by | Meaning |
|---|---|---|
| `objectTypes` | record graph | New record kinds: label, chapter, id prefix. |
| `records(p, add, rel)` | record graph | Emits the package's objects and typed relations from the document. |
| `layers`, `hops` | trace kernel | Trace layers and the hops that reach them, each marked own-chain or context. |
| `checks` | review and readiness | Findings per chapter, computed from the document. A finding may be marked hard (never waivable). |
| `commands` | the canonical command boundary | A handler per command type: apply, validate, audit and undo exactly as built-in commands. A type may be marked person-only or second-person. |
| `lifecycle`, `provenance` | record lifecycle and provenance | Collections whose records can be retired and restored; nouns and paths for the journal. |
| `designKeys`, `evidenceKeys` | the design fingerprint | Which document keys are design and which are evidence. |
| `upgrade(p)` | the read upgrade chain | An idempotent step for old documents. |
| `sections` | SDD and ARS | Named document sections placed at a stated anchor. |
| `needs(p)`, `load()` | the project store | Whether a document holds this package's records, and how the client loads the package before the first render. |

**Rules.**
- Registering is idempotent by `id`. Registration order never changes a result: readers sort by `id`.
- With no extension registered, and with extensions registered but none of their records in the document, every existing reading is byte-identical: graph, trail, findings, stamps, SDD.
- The server registers every package at start, synchronously. The client registers a package when its module loads; `ensureExtensions(p)` loads what the document needs before the first render.
- An extension cannot replace or wrap a built-in command, relation or check. It can only add.
- The registry holds no project state.

**Tests first** (`rc44-s0-extensions-validate.mjs`, with a synthetic extension defined in the suite):
1. Its record appears in the record graph with its relations, on the trail of the requirement it answers, and in `linkedVia`.
2. Its command applies through the command boundary, is journalled, can be undone, and is refused for an agent account when marked person-only and for the author when marked second-person.
3. Its finding appears in the chapter's checks and in readiness; a hard finding takes no disposition.
4. Its record retires and restores through the lifecycle.
5. Its design key moves the design fingerprint; its evidence key does not.
6. A reference document with no such record reads byte-identically with and without the extension registered (graph, findings, fingerprint, SDD text).
7. Registering twice, or in another order, changes nothing.
8. The client build passes every gate; the route delta is measured and is at most 700 B; 148 script files.

**Fails today:** all of 1 to 5, because no such registration exists.

## 5. External authorities: true status

| Authority | Status |
|---|---|
| Licence counsel | Not engaged. |
| Four-eyes knowledge approver | Not assigned. Until one is, imported knowledge stays candidate and inert. |
| Independent architecture reviewer | Not started. |
| Production acceptance authority | Not established. |

## 6. Needed from the owner

1. Confirm the release number (proposed rc.10.73.44).
2. Name the second person who releases knowledge.
3. Provide the four document sets, with who wrote and reviewed each and its permitted use, if they are to be imported.
4. Decide whether candidate teaching content may be shown inside design projects before release (wp1 slice S6). Until then it is visible in the library project only.
