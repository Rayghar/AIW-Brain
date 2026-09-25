# Model anatomy: one body, cut in layers, seen through lenses

Concept proposal · 23 September 2026 · prototype in [`concepts/anatomy-prototype.html`](concepts/anatomy-prototype.html)

This builds on [MODELLING-DIRECTION.md](MODELLING-DIRECTION.md). It proposes the interaction model for the Model surface. It does not change product code yet.

## Why the current Model surface does not tell the story

Screens reviewed: the v50 explorer, Chapters 4–11, every perspective, desktop and 390 px.

| What happens today | Why a beginner gets lost |
| --- | --- |
| Every perspective re-lays out the same objects into new columns ("Interaction band 1–5", "Responsibilities / Application realization / …"). | The architecture has no stable shape. A learner cannot build a mental map when the map moves on every click. |
| Realization is five side-by-side columns of equal cards. The fifth runs off-screen. | Depth reads as a table, not as layers. Nothing is visibly *inside* or *beneath* anything. |
| Responsibilities, components, platform capabilities, products and runtime plans all use the same card. | There is no visual grammar for "this is a deeper level". |
| A component is not placed under the responsibility it realizes. | Following one thing down means chasing dashed lines across the screen. |
| Relationships are hidden until selection ("51 relationships available on selection"). | Interconnection is not *felt*. |
| The chapter journey and the model are separate: chapter bands and chips sit above a canvas. | The model never shows what the design has become so far, or what comes next. |
| Gaps are small text chips. | Missing design is not visible as a hole in the structure. |

The data is not the problem. `architecture-model.js` already joins the whole realization chain: responsibility → realized by → component → requires → capability → implemented by → technology → operated as → runtime plan → placed as → placement → located in → zone. It also holds interactions, contracts, data ownership, protection and the reasons behind each object (requirements, quality scenarios, decisions). What is missing is a view that keeps that chain in one place.

## The concept

Treat the solution like a body you can study. **The parts stay where they are. What changes is how deep you cut, and which system you look at.**

1. **One body — modules are columns that never move.** Each module (responsibility group) is a column. External participants sit in narrow columns at the edges. Every lens and every chapter uses the same columns. Lenses and depth change *what is drawn in* a column, never *where it is*.
2. **Depth is a stack of layers (the dissection).** Rows are the realization levels, from top to bottom:
   - Intent
   - Logical application
   - Application realization
   - Logical technology
   - Technology realization
   - Runtime

   Each level has its own shape:
   - Responsibilities are capsules.
   - Components are notched boxes, with the responsibilities they realize embedded inside as chips. This is the logical view embedded in the physical one.
   - Capabilities are slabs the components stand on.
   - Products are plates under their slab. A hatched plate is a choice not yet made.
   - Runtime plans show a replica dot for each running copy in each zone.

   Gold threads connect each thing to what realizes it. The threads are always faintly visible, so the connections are felt.
3. **Shared things span; nothing is invented.** A capability used by components in five modules is one slab spanning those five columns. Load-bearing platforms therefore read as the skeleton of the whole system. AIW never copies a shared service into each module and never invents exclusive containment. This matches the rule in MODELLING-DIRECTION §4.
4. **Cut deeper, or zoom in.**
   - **Open a layer** (Intent, Logical, Application, Platform, Product, Runtime). That layer enlarges, and the others compress but stay aligned. This is peeling.
   - **Dissect a module.** Its column widens and the other modules collapse to thin "spines". Their connections still run into the focused module (focus plus context).
   - **Select any part.** Its full lineage lights up: what it is for above it, how it is built and where it runs below it. It works like a core sample through every layer.
5. **Lenses are systems that run through the whole body.** They are named in architecture words, with the anatomy only as a hint:

   | Lens | Question it answers | Like the body's… | What it overlays |
   | --- | --- | --- | --- |
   | Structure | What holds it together? | skeleton | modules, layers, shared slabs |
   | Flow | How does work move through it? | muscles | interactions, and a scenario walked step by step |
   | Signals | How do parts talk, and react when a call fails? | nervous system | a contract on each interaction; complete (green) or missing timeout, failure or duplicate rules (amber) |
   | Information | Who owns which data, and where does it travel? | circulation | data inside its authoritative owner; the data carried on each interaction |
   | Protection | What defends it, and what is exposed? | immune system | trust-boundary rings, controls, threats without a control |
   | Operation | Where does it run, and what fails together? | vital signs | the runtime layer opened, with zones, replicas, unplaced plans and single failure domains |
   | Reasoning | Why is it shaped this way? | DNA | the intent layer opened; requirements, quality scenarios and decisions threaded to the parts they shaped |
6. **The design story grows on the same map.** A chapter scrubber (1–11) sits under the canvas.
   - Chapters 1–3 show only the brief.
   - Chapter 4 makes the modules and responsibilities appear.
   - Chapter 5 makes components wrap around them.
   - Chapter 6 slides the platform in beneath.
   - Chapter 7 adds the products.
   - Chapters 8 and 9 switch on the nervous and immune systems.
   - Chapter 10 places everything in zones.

   The *next* layer shows as empty dashed sockets ("Which component realizes these three responsibilities?"). **Watch the design story** plays this through in about 35 seconds. A beginner sees the architecture being built in the order it was reasoned.
7. **Gaps are holes, not footnotes.** Examples:
   - A responsibility with no component.
   - A capability with no realization.
   - A product not chosen.
   - A plan with no placement.
   - A threat without a control.

   Each one renders as an empty socket in the layer where the missing design belongs. It can be clicked and names its chapter.
8. **The Brain works on the slice you are looking at.** The companion panel always answers three things: where you are, what you are looking at (a sentence written from the model, with no LLM needed), and what is worth noticing (rule-based insights, such as a load-bearing capability or an uncovered threat).
   - **Sol · explain this slice**, **What's missing here?** and **Mind Factory · alternatives** act on the current scope, depth, lens and selection.
   - In the product these go through the existing reviewed source packet (`explorationContext`), with the depth and lens added.
   - Alternatives appear as ghosts in place on the same canvas before anything is accepted.

## How it maps onto the code

| Need | Reuse | New |
| --- | --- | --- |
| Objects, realization chain, interactions, data, protection, reasons | `architectureModel()` — no schema change for phase 1 | — |
| Stable columns, layer bands, capability lanes, level of detail | — | `public/anatomy-layout.js`: a pure function, unit-testable like `architecture-layout.js` |
| Rendering, threads, selection lineage, dissect and peel | Explorer shell, zoom and pan, and the Details, Sol and Mind Factory launchers in `architecture-explorer.js` | `public/anatomy-view.js`, mounted as the default Model perspective |
| Lenses | `CONCERNS`: structure, behaviour→Flow, data→Information, security→Protection, deployment→Operation, rationale→Reasoning; plus Signals from interface contracts | Realization stops being a lens and becomes the depth axis |
| Chapter scrubber | `CHAPTER_STAGES` / `chapterFocus`; the Model tab of chapter *N* opens at *N* | Design state "up to chapter N" with a *See the finished design* switch |
| Scenarios in Flow | Process paths, `relationshipPath` | Step player over existing interaction records |
| Companion context | `explorationContext`, reviewed source packet | Add `depth`, `lens`, `focus` and `chapter` |
| Authoring | Existing preview → accept pipeline, `architecture-commands.js` | Filling a socket opens the right chapter task already scoped; dragging a thread proposes a re-mapping |

## Delivery plan

| Phase | Deliverable | Done when |
| --- | --- | --- |
| 1 · Anatomy canvas | Read-only anatomy for Chapters 4–11: columns, layers, threads, selection lineage, dissect, open-a-layer, chapter scrubber, gaps as sockets. Replaces the Realization perspective. | Layout tests prove column positions are identical across lenses and chapters, shared capabilities are single slabs, and every unmapped link renders a socket. |
| 2 · Lenses | Flow with scenarios, Signals, Information, Protection, Operation, Reasoning as overlays on the same layout | Switching lenses never moves an object; every overlay reads from existing records. |
| 3 · Design in place | Fill a socket, re-map by dragging, Mind Factory ghosts in the anatomy, Sol on the visible slice | Accepting a change updates the canvas, change history and SDD through the existing pipeline; rejecting leaves the model intact. |
| 4 · Core-banking scale | Import the real SEABaaS workbook, form modules, level-of-detail and culling for 20–40 modules | Novice and practitioner walkthroughs from MODELLING-DIRECTION §8, recorded with wrong turns. |

## Limits of the prototype

- It is a standalone page, not wired into the product.
- **Bank Payment Journey** is exported unchanged from the reference project.
- **Core banking** is a hypothetical model written to show scale. It is *not* the recorded SEABaaS architecture.
- Companion answers are rule-based text written from the model. No LLM is called and nothing can be changed.
- Layout is deterministic. It has not been tested beyond about 20 columns or with real users.

Rebuild the prototype with `node concepts/anatomy-src/export-bank.mjs && node concepts/anatomy-src/build.mjs`.
