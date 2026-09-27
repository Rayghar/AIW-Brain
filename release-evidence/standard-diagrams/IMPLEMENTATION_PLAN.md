# Standard diagrams on every chapter — implementation plan (v20.6)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source v20.6, on v20.5 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-standard-diagrams`, from `a909f42` (v20.5) |
| Date | 27 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` stays `false`. |

## What the sponsor asked

Five solution architecture documents were supplied as the standard (an ADR, OneBank+, Banca 2.0, OmniX 2.0, PayHub 1.0 — bank documents, read locally, not copied into this repository). Each chapter's Model tab must have a page that draws the chapter's design in that notation; the canvas must offer smart arrangement (radial, tree, orthogonal and the like); and each model must have toggles to shift between its views. The sidebar's model layers should strip a diagram of what the reader does not want to see.

## What the standard is

The documents are TOGAF-style diagrams from an enterprise repository template (the "T10" master template), and one BPMN process diagram:

- **Elements** are typed boxes with a small icon and a capitalised type kicker above the name: PHYSICAL APPLICATION COMPONENT, LOGICAL APPLICATION COMPONENT, APPLICATION SERVICE, LOGICAL DATA COMPONENT, PHYSICAL DATA COMPONENT, DATA ENTITY, LOGICAL TECHNOLOGY COMPONENT, PHYSICAL TECHNOLOGY COMPONENT, TECHNOLOGY SERVICE, BUSINESS SERVICE, PROCESS, CAPABILITY, VALUE STREAM. A family colour distinguishes application (blue), data (orange, violet), technology (green, yellow) and business (peach). A physical node may carry an address or version beneath its name.
- **Relationships** are labelled connectors: *realizes*, *implements*, *uses*, *is served by*, *depends on*, *enables*, and numbered steps on integration diagrams.
- **Groups** are titled containers: an application, an external system, a cluster or host with its address, a site or ecosystem.
- **Arrangements**: a tree from one root (the application realising its logical components, each implementing its services); a radial fan around a hub (the API gateway; the shared database server and its databases); an orthogonal integration diagram with nested clusters and numbered flows; a layered business diagram (service → process → capability → value stream); BPMN swimlanes by actor.
- **A header strip** on every diagram: model, template, author, created, last modified.
- Tables beside the diagrams (core application stack, business drivers, system boundaries, risks) belong to the document, not the model canvas; they are recorded here for the Output tab, not built in this release.

## Design

One notation, projected from one model. `architectureModel(project)` already gives every chapter's records as typed objects with typed relationships (realizedBy, implementedBy, requires, provides, uses, owns, exchanges, withinBoundary, protects, mitigates, threatens, operatedAs, placedAs, locatedIn, partOf, sequence, considers, fulfils, constrains…). The standard diagrams are projections of that graph; nothing is drawn that is not recorded, and a position is never a model fact.

| Module | Responsibility |
|---|---|
| `public/notation-model.js` | The projection: for a chapter and a scene, the nodes (with their TOGAF kicker, family, name, sub-line), the groups (system, module, external system, boundary, environment, zone, cluster) and the labelled edges, from `architectureModel`. One scene per chapter, two where the standard has two (Chapter 8: integration and data & authority; Chapter 10: one per environment). |
| `public/notation-layout.js` | Smart arrangement: **tree** (ranked from the roots, orthogonal connectors), **radial** (rings around the selected or best-connected hub), **orthogonal** (left-to-right ranks, right-angled routes), **layered** (bands by level: business, application, data, technology, deployment), **grouped** (nested containers packed and sized to content). Deterministic; nodes never overlap; a node stays inside its group; a dragged node is pinned per project, chapter, scene and arrangement, and *Reset* releases them. |
| `public/notation-view.js`, `public/notation.css` | The Diagram view any chapter mounts in its stage: the header strip from the project's own metadata (empty where nothing is recorded), groups and edges in SVG, elements as cards, selection into the chapter's companion (the same records, so the same specimen and Sol), hover reading, keyboard, the Arrange menu, the layer filter, the scene picker, Export SVG and PNG. |
| Each chapter view (1–11) | A **Diagram** button in the model's view group (`.cm-views`), first for Chapters 4–10 where the sponsor's standard is a diagram; the chapter's analytical views stay as toggles beside it. |
| `public/workspace-ux.js`, `public/app.js` | The sidebar's **Model layers** become a filter the chapter models listen to: a layer unticked strips its elements, chips and edges from the diagram and from the chapter's other views. |

The mapping of AIW's records to the standard's kickers:

| AIW record | Kicker | Chapter scenes |
|---|---|---|
| Project (the system) | PHYSICAL APPLICATION COMPONENT (the application as a whole) | 4, 5 |
| Responsibility group (module) | group | 4, 5 |
| Responsibility | LOGICAL APPLICATION COMPONENT | 4, 5 |
| Application component | PHYSICAL APPLICATION COMPONENT | 5, 6, 8, 9, 10 |
| Interface contract | APPLICATION SERVICE (operation, protocol) | 5, 8, 9 |
| Data definition | LOGICAL DATA COMPONENT / DATA ENTITY | 8 |
| Platform capability | LOGICAL TECHNOLOGY COMPONENT (TECHNOLOGY SERVICE for connectivity and identity families) | 6, 7 |
| Technology realisation (chosen option) | PHYSICAL TECHNOLOGY COMPONENT (product, version, vendor; hatched while no choice is made) | 7, 10 |
| External participant | group (external system) with its services | 5, 8, 9 |
| Trust boundary | group (trust zone) | 6, 9 |
| Security control / threat | SECURITY CONTROL / THREAT | 9 |
| Environment, zone | groups (environment; site or cluster) | 10 |
| Placement (plan × zone) | PLACEMENT (copies, role) of the component or technology it runs | 10 |
| Runtime path | numbered connection | 10 |
| Journey, journey step, actor | PROCESS, task, lane (BPMN-style swimlanes) | 1, 4 |
| Quality scenario, decision, alternative, requirement | QUALITY SCENARIO, DECISION, ALTERNATIVE, REQUIREMENT | 2, 3, 11 |

Relationships keep the standard's words: *realizes* (component → responsibility), *implements* (component → application service), *uses* (component → data, component → service it consumes), *is served by* (component → capability), *implemented by* (capability → realisation), *depends on* (between capabilities or realisations), *exchanges* (service → data), *owned by* (data → authority), *protects*, *mitigates*, *threatens*, *located in*, *flows to* (responsibility → responsibility), *enables*.

## Order of work, one commit each

1. Plan and baseline (this document).
2. `notation-model.js` with model checks on the reference project: every scene, every node's kicker, every edge's words, nothing invented.
3. `notation-layout.js` with checks: the five arrangements, no overlap, groups contain their nodes, pins hold, determinism.
4. `notation-view.js` and `notation.css`; the Diagram view on Chapter 5, compared with the standard's application architecture page.
5. The Diagram view on Chapters 4, 6, 7, 8 (integration; data & authority), 10, 9, then 1, 2, 3, 11.
6. The Model layers as a filter across the chapter models.
7. Export SVG and PNG, the header strip, the scene picker.
8. Rendered checks for every chapter's Diagram, the arrangements, the filter and the export; documentation; the full regression; the package with SHA-256 and a clean extract; the evidence and report.

## Verification

- `test:notation` and `test:notation-browser` (new), the eleven chapter suites and their rendered variants, the full regression with the browser suites, the package from a clean extract, a secret scan of the diff, and screenshots of each chapter's Diagram beside the standard's page it answers, in this folder.

## Not in scope

The document tables (application stack, business drivers, system boundaries, risks) as Output-tab sections; a diagram-as-code export to Eraser or Ilograph beyond what `MODELLING-IMPLEMENTATION.md` already records; any new record type (business service, value stream) the project does not hold — a diagram shows what is recorded, and says when a standard element has no record behind it.
