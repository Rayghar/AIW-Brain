# Design anatomy — the Validate surface

Implementation record · 24 September 2026 · builds on [MODEL-ANATOMY-CONCEPT.md](MODEL-ANATOMY-CONCEPT.md) and [MODELLING-DIRECTION.md](MODELLING-DIRECTION.md)

The Validate tab of every chapter holds the **design anatomy**. It shows the whole design as one body that grows chapter by chapter, and it can be dissected at any level. The Model tab is not changed by this step.

**Update, 24 September 2026 — two ways to validate, one switch.** Validate now opens on **SDD readiness**, the original purpose of the tab: the chapter's own rule-based checks, milestones and handoff, unchanged. Above them, one line reads every chapter's readiness for the solution design document — the blocking findings Chapter 11 asks to treat, what is left to review, and the milestones met — and each chapter on the line opens that chapter's checks. Where the chapter has its own models (Chapters 1 and 4 to 10), what those models show sits beside the checks as prompts, each opening the model on what it concerns. A switch at the top of the tab turns to the **model views**: the design anatomy, now on its own. The choice is remembered for each project, and a link can ask for either view (`?validate=readiness` or `?validate=model`); the chapter models' *All checks on Validate* links ask for readiness. See `public/validate-view.js` and `public/readiness-model.js`.

## What the architect sees

- **One body.** Columns are the modules. External participants sit at the edges. A column keeps its place in every lens and every chapter.
- **Layers, top to bottom.** Each layer has its own shape:
  - Intent: requirements, qualities and decisions.
  - Logical application: responsibilities, drawn as capsules.
  - Application realization: components. Each one shows the responsibilities it realizes, and from Chapter 8 the data it owns.
  - Logical technology: capability slabs. A shared capability is one slab spanning every module that uses it.
  - Technology realization: product plates. A hatched plate is a choice not yet made.
  - Deployment and runtime: operating plans, with one dot per running copy in each zone.

  Gold threads show what realizes what. An interaction corridor carries the calls and events between components.
- **It grows with the journey.** Chapter *N* shows every layer designed up to *N* and opens the layer that chapter works on:

  | Chapter | Opens with |
  | --- | --- |
  | 1–3 | Intent layer, Reasoning lens |
  | 4 | Logical layer |
  | 5 | Application layer |
  | 6 | Platform layer |
  | 7 | Product layer |
  | 8 | Signals lens |
  | 9 | Protection lens |
  | 10 | Runtime layer, Operation lens |
  | 11 | The complete body |

  The next layer shows as dashed design questions, such as "Chapter 6 · What platform support do these components need?". **Replay the build-up** rebuilds the design from Chapter 1 to the current chapter. The chapter strip lets you preview the design as of any chapter.
- **Seven lenses run through the whole body.** They overlay the same layout; switching lens never moves an object.

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Structure | skeleton | modules, layers and shared platform parts |
  | Flow | muscles | interactions, with a step-by-step walk from where work enters |
  | Signals | nervous system | a contract on each interaction; complete, or missing timeout, failure or duplicate handling |
  | Information | circulation | who owns each piece of data, and which data travels on each interaction |
  | Protection | immune system | trust-boundary rings, controls, and threats with or without a control |
  | Operation | vital signs | zones, replicas, unplaced plans and single failure domains |
  | Reasoning | DNA | the requirements, qualities and decisions behind each responsibility |

- **Dissect at any level.**
  - **Whole system → module.** The module's components become the columns. The modules that call in and are called sit either side as context.
  - **Module → part.** One component is shown in full: its reasons, responsibilities, contracts, data, platform, products and runtime, with its callers and callees on either side.
  - **Platform part.** A capability shows every component that stands on it.

  The same lenses and layers apply at every level. Use a column's **Dissect**, double-click a part, or the specimen's **Dissect this part**. The breadcrumb or Escape steps back.
- **Follow any part.** Selecting a part lights its lineage from reasons down to runtime. The companion panel then shows:
  - where you are
  - a plain reading of what you are looking at
  - the selected part, with every link and its findings
  - findings grouped by rule, where clicking a group steps through the parts it concerns
  - structural insights, such as load-bearing platform parts, uncovered threats and unplaced plans

  **Ask Sol** and **Mind Factory** open on the selected part through the existing reviewed context.
- **Findings sit on the parts they concern.** 510 of the 539 reference findings attach to a card. A contract finding sits on its provider; a control or threat finding sits on what it concerns. Project-level findings are listed separately. Gaps appear as empty sockets in the layer where the missing design belongs.

## Smart arrangement

The layout is deterministic and computed, not drawn by hand:

1. **Module order** minimizes the distance between interacting modules and lets work read left to right. A module that an initiating party calls is pulled left; a module that hands off to a receiving party is pulled right. For example, the reference project reads *Channel & customer → Control & accounting → Settlement*.
2. **Components inside a module** are ordered by where their partners sit. Responsibilities follow their components, so realization threads run straight down.
3. **Capability lanes** are packed by span, so narrow, local platforms sit next to their components and widely shared ones form the base.
4. **Interactions** are routed orthogonally. They leave a card's side, run down the gutter to a corridor track, and come back up to the target. Tracks are assigned so segments do not overlap, and adjacent cards connect straight across. Contract and data labels are placed only where they do not cover a card; otherwise they shrink to a dot.
5. **Column widths** depend on the stage width only, never on zoom or lens. Zoom has three levels of detail; far away, embedded responsibilities and data remain visible as coloured bars.
6. **You can override the order.** Drag a column header to reorder modules or components. The arrangement is saved per project as a view preference, and **Smart arrange** restores the computed order.

## Files

| File | Responsibility |
| --- | --- |
| `public/anatomy-model.js` | Pure adapter over `architectureModel()`; lineage; findings hosted on cards; structural insights |
| `public/anatomy-layout.js` | Pure smart layout: scopes, column order, bands, lanes, sockets, orthogonal routing |
| `public/anatomy-view.js` / `anatomy.css` | Validate surface: rendering, lenses, dissection, companion panel, replay, persistence |
| `public/validate-view.js` / `validate.css` | The Validate switch: SDD readiness (the chapter's checks, the readiness line across the journey, the chapter model's observations) and the model views (the anatomy) |
| `public/readiness-model.js` | Pure: every chapter's blocking findings, review items and milestones, and Chapter 11's treatments, read as one line |
| `public/workspace-ux.js` | Loads Validate and the anatomy on first use and removes them on other tabs |
| `anatomy-validate.mjs` (`npm run test:anatomy`) | 13 layout and model checks across 1,386 layouts |
| `anatomy-browser-validate.mjs` (`npm run test:anatomy-browser`) | 11 rendered checks; needs Playwright |

Nothing here writes to the project. Arrangement, lens, layer, scope and selection are stored in browser preferences.

## Verification

- **Model and layout checks (13):**
  - No card overlaps in 1,386 layouts. These cover 11 chapters × system, module and part scopes × every opened layer, on both the reference project and the illustrative core-banking model.
  - Lens switching never moves an object.
  - Columns and responsibilities keep their position as layers are added.
  - Shared capabilities are drawn once and span their users.
  - All 746 routes are orthogonal and avoid every card.
  - The smart order shortens interaction distance and reads from the entry point.
  - A 40-module, 160-component synthetic system lays out in about 60 ms.
- **Rendered checks (11):** Chapters 1–11 all mount the anatomy with the checks below. The seven lenses leave positions unchanged. The rendered checks also cover:
  - selection and lineage
  - Ask Sol
  - system → module → part and back
  - opening a layer
  - stepping through findings
  - column drag, persistence and Smart arrange
  - replay
  - a 390 px phone with no horizontal scroll
  - no page errors
- **Regressions:** all 44 regression suites that can run here still pass. The four that need the private SEABaaS workbook were not run.

## Limits and next step

- The core-banking model is hypothetical, used only to test scale. It is not the recorded SEABaaS architecture.
- The anatomy is read-only. Changes still go through each chapter's Work and Model surfaces and the existing proposal review.
- Novice and practitioner walkthroughs are still needed to show the anatomy communicates an unfamiliar design.
- **Next:** chapter-specific Model views (step 2) are done for all eleven chapters, with the SA Playbook as knowledge, a specification and anti-pattern layer, and Chapter 11's review desk — also Validate's third mode, beside SDD readiness and this anatomy — whose critical and silent vitals come with drafted fixes, applied through each chapter's change review: see [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md).
