# Standard diagrams on every chapter — release report (v20.6)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source **v20.6**, on v20.5 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-standard-diagrams`, from `a909f42` (v20.5) |
| Date | 28 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` is `false`. |

## What the sponsor asked

The Chapter 6, 7 and 10 models were matrices, and the sponsor asked why they did not look like the diagrams of Chapters 4 and 5 or like the standard. Five solution architecture documents were supplied as the standard (an ADR, OneBank+, Banca 2.0, OmniX 2.0 and PayHub 1.0; bank documents, read locally and not copied into this repository). The ask: every chapter gets a page that draws diagrams like those; smart arrangement — radial, tree, orthogonal and the like; toggles to shift between a chapter's views; and the sidebar's model layers used to strip a diagram of what the reader does not want to see.

## What the architect now has

- **A Diagram on every chapter model** (Chapters 1 to 10), drawn in the documents' notation: typed elements with a capitalised kicker and an icon (PHYSICAL APPLICATION COMPONENT, LOGICAL APPLICATION COMPONENT, APPLICATION SERVICE, LOGICAL DATA COMPONENT, PHYSICAL DATA COMPONENT, LOGICAL TECHNOLOGY COMPONENT, PHYSICAL TECHNOLOGY COMPONENT, TECHNOLOGY SERVICE, SECURITY CONTROL, THREAT, QUALITY SCENARIO, DECISION, REQUIREMENT, BPMN tasks, events and gateways), connectors that carry their relationship (*realizes*, *implements*, *uses*, *is served by*, *implemented by*, *depends on*, *owns*, *exchanges*, *protects*, *mitigates*, *threatens*, numbered runtime paths), titled groups (the application, modules, external systems, capability families, trust zones, environments, zones, swimlanes, *Not placed*), and the header strip of the template (model, template, author, created, last modified, version) filled only with what the project records.
- **Scenes that answer the documents' pages.** Process swimlanes (1); quality drivers (2); decisions and their alternatives (3); the logical application in its modules (4); the application architecture — the application realizing its components, each realizing its responsibilities and implementing its services (5); the solution architecture — components served by capabilities in families, with their dependencies (6); the technology realization — the chosen product per capability, hatched with its option count where nothing is chosen (7); integration and data & authority (8); security and trust zones (9); deployment per environment, with zones, placements, *Not placed* and numbered paths (10).
- **Smart arrange.** Tree, radial, orthogonal, layered, grouped and swimlanes, from an Arrange menu that names the one in use. Connectors pass through the corridors between elements. Drag an element to pin it; *Release pinned elements* lets go. The same records give the same picture.
- **Toggles.** The Diagram is the first view, and opens by default on Chapters 4 to 10; the chapter's own views (Responsibilities, Coverage, Components, Allocation, Platform, What fails together, Stack, Options, Sequence, Data flow, Threat model, Deployment and their analyses) are one click away. `?model=<view>` in the address opens a named view.
- **Layers.** The sidebar's *Model layers* and the diagram's *Layers* menu are one setting. Untick Interface and the application services go; untick Logical and the logical components go; the status says how many are hidden, and the sidebar says how many layers are visible.
- **Export.** SVG (vectors, with the kickers, words and header) and PNG, named after the project, chapter and scene.
- **The companion follows.** Selecting an element reads its record in the companion with Sol beside it; an element only the diagram draws (the application as a whole, an external system, a placement) reads as itself and is not written into the address as a record.

## How it is built

One projection, `public/notation-model.js`, reads the connected model (`architecture-model.js`) — nothing is drawn that is not a saved record, and a position is never a model fact. One arrangement module, `public/notation-layout.js`. One view module, `public/notation-view.js` with `public/notation.css`, which each chapter view mounts in its own stage, keeping its chrome, companion, camera and selection. The design note is in `AIW-V5-Local-Source/DESIGN-CHAPTER-MODELS.md` (*The standard diagrams*); the mapping of records to element types is in `IMPLEMENTATION_PLAN.md`.

## Verification

The branch, from v20.5 (`a909f42`):

| Commit | What |
|---|---|
| `7d31950` | chore: the plan (baseline checkpoint) |
| `aa4a9f9` | feat(notation): the standard diagrams as projections of the connected model, with six arrangements |
| `30837bf` | feat(models): a Diagram view on every chapter model, in the standard notation |
| `a51606e` | feat(models): one layers setting for the sidebar and the diagram; a named view in the address |
| `c97e56f` | test(notation): the standard diagrams rendered; the chapter suites open their analytical views by name |
| `d735bd5` | docs: v20.6 |
| `e51f6d9` | fix(notation): Sol's verdicts on the diagrams, a quieter deployment diagram, and the layers event outside a browser |

- **New suites.** `test:notation` (5 checks: all twelve scenes, kinds, edge words, groups, the header, a blank project, the layer strip), `test:notation-layout` (3 checks over 72 layouts: no overlap, containment, routing, pins, determinism), `test:notation-browser` (8 checks: every chapter's Diagram rendered, the five arrangements without loss or overlap, the layers from the menu and from the sidebar, pins and release, click and Enter selection into the companion and the address, SVG and PNG export, deep links, Chapter 8's two scenes and Chapter 10's zones and numbered paths, a blank project).
- **Full regression, first run** on `d735bd5` in the working tree: 89 of 95. Six failures, each traced: `test` (app.js used `CustomEvent`, which the suite's Node sandbox lacks), `test:chapter-sol-browser` (Sol's verdicts had nowhere to land on Chapter 10's diagram), `test:desk-browser` (the suite read Chapter 7's Stack view without naming it) — all three fixed in `e51f6d9`; `test:responsibility-browser` and `test:threat-browser` (load timeouts; both pass alone); `test:sol-evaluation` (it counted duplicates in an untracked copy of the v20.5 package extracted into the source folder).
- **Full regression, final run** on `e51f6d9`, in a clean git worktree of that commit so the run tests exactly the committed code: **93 of 95**, 25 of them rendered in headless Chromium (Playwright 1.56.0, `AIW_REGRESSION_CONCURRENCY=2`). The two others, `test:tradeoff-browser` and `test:desk-browser`, ran side by side and both stopped responding for the runner's whole 25-minute limit while every other browser suite took 40–110 s; run alone on the same commit in the same worktree they pass, 9 of 9 in 43 s and 16 of 16 in 84 s. Recorded as a transient stall of the machine, not a failure of the code (`TEST_EVIDENCE.json`, `stalledAndRerun`).
- **Package.** `AIW-V5-Local-Source-v20.6.zip`, built with `git archive` from `e51f6d9`: 3,430,396 bytes, 513 files, SHA-256 `bcf0353d3ed6412f9a9fdbb7caccd9c95992ad08d9e1c506b9ed33c0c10737c6` (re-hashed independently), reproducible byte for byte; every file byte-identical with the commit's blobs; no forbidden path, no secret, no personal data. From a clean extract with no `node_modules`: `check`, `build`, `test` and 19 suites and evaluations pass, including `test:notation` and `test:notation-layout`; then `npm ci --offline` installs the lockfile's tools. Delta from v20.5: 7 files added, 27 changed, 0 removed, 479 unchanged.
- **Secret scan** of the branch diff `a909f42..HEAD`: every rule 0 (API keys, tokens, private keys, JWKs, bearer literals, credential assignments, e-mail, user paths). The bank documents appear only by title, in the plan and this report; none of their hosts, addresses, endpoints or authors is in the repository or the package.
- **Screenshots** (`screenshots/`): each chapter's Diagram (Chapters 1 to 10), Chapter 8's Data & authority, and Chapter 5 in each arrangement.
- **`TEST_EVIDENCE.json`** gathers the above, machine-readable, with `productionAccepted: false`.

## Not in this release, and why

- **Chapter 11's review desk** keeps its own views (Vitals, Trace, the desk's decisions). Its module is built differently from the other ten and the desk is where Sol's reasoning runs; the rationale scene exists in the projection (`rationale`) and can be mounted there next.
- **The documents' tables** — core application stack, business drivers, system boundaries, risk and mitigation — belong to the Output tab, not the model canvas; they are recorded in the plan.
- **Elements the documents use that the project does not record** (business service, value stream, capability as a business concept, data entity as distinct from a data definition) are not invented. A diagram draws what is recorded and says when there is nothing to draw.
- **Exact visual parity** with the repository tool the documents came from (fonts, icons, colours) is not claimed; the element types, kickers, relationships, grouping and arrangements are.
- **An untracked copy of the v20.5 package** sits extracted inside the source folder (`AIW-V5-Local-Source/AIW-V5-Local-Source/`, timestamped with the v20.5 commit). It is not in any package and was left untouched; it makes `test:sol-evaluation` fail when the regression runs in the working tree. Removing it is the sponsor's call.
- No external authority has reviewed this release. `productionAccepted` is `false`. The branch is not pushed; pushing needs the sponsor's word.
