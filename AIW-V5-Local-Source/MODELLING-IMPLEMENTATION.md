# Connected architecture modelling — v50

Implementation record · 23 September 2026

AIW now uses one connected Model surface across the eleven chapters. The chapter describes the design work; the model retains the architect's scope, selected object and perspective. This is the first implementation of the connected modelling direction. It does not close the receiving-tool and independent usability gates in that direction.

## What the architect can do

Start at the system overview, enter a responsibility group, and reveal its application realization and technology support. The realization perspective separates responsibilities, application components, technology capabilities, technology realization and runtime placement. Mapped responsibilities appear inside application cards as references to the same logical objects. Shared capabilities keep one identity and expose their other memberships. Missing implementation or operating mappings remain visible gaps.

Switch between Structure, Realization, Behaviour, Data, Protection, Deployment and Rationale without losing the selected subject. The location trail, module strip and exploration history give a route back. Arrange supported perspectives by architectural role, accountable owner or direct trust boundary. Per-project view and camera preferences persist locally; named perspectives persist with the project and travel in a native export.

Behaviour follows recorded directed interactions between a chosen start and destination. Its step strip refers to the actual relationships and interface contracts, including recorded failure policy. This is a design walkthrough, not traffic observation or execution simulation. Deployment shows environments, zones and planned placements, with links back to the operating plan and implemented asset. A product choice does not invent a deployment.

The canvas can fill the viewport. Typed icons, forms, port markers and labelled relationships distinguish architectural roles. Details open on demand. The existing Project, Architecture Journey and Perspectives navigation, Work / Model / Validate / Output surfaces, Sol and Mind Factory remain in place.

## Authoring and reasoning

The canvas can create a responsibility, responsibility group, application component or technology capability. Compatible objects can be connected with an interaction, realization mapping or capability dependency. Quick edits retain existing allocations, technology support mappings, evidence and specialized attributes. Specialized contracts, policies, controls and deployment records continue to use their chapter editors.

Creation and edits use the existing preview and explicit acceptance command. Changing form inputs invalidates the earlier preview. Unreviewed and stale changes are rejected. Accepted changes update the common project records, derived views, change history and living SDD. Existing Mind Factory alternatives can be inspected as proposed state; frozen baselines remain read-only. View navigation does not require architectural acceptance.

Sol receives the current scope and perspective in its reviewed source packet. The backend rebuilds that context from the saved project rather than trusting client-supplied architectural facts. The bounded packet includes up to 40 objects, 60 relationships and 20 mapping gaps, within the existing source budget and disclosure exclusions. Changing the relevant model makes the prior context stale. New provider requests from a frozen snapshot require returning to the working design; the user is not silently given current-state reasoning for a historical view.

The existing provider gateway, knowledge eligibility checks and reviewed proposals are reused. This release does not establish new live-provider evidence, independently certify the repository corpus or turn predefined quality effects into measured performance.

## Model and storage contract

| File | Responsibility |
| --- | --- |
| `public/architecture-model.js` | Versioned semantic projection, stable object and relationship identities, scope membership, realization lineage, perspective filtering and bounded reasoning context |
| `public/architecture-layout.js` | Deterministic visual occurrences, module and deployment grouping, embedded realization references and edge geometry |
| `public/architecture-explorer.js` / `.css` | Shared model interaction, navigation, selection, walkthroughs, details, contextual authoring and saved perspectives |
| `public/architecture-commands.js` | Safe quick-edit translation into existing chapter commands while retaining mappings |
| `public/model-exchange.js` / `-ui.js` | Native package validation, target mapping and exchange projections, ZIP generation and export review |
| `recovery-service.js` / `public/recovery-ui.js` | Validated native import through the existing isolated-project recovery workflow |
| `public/intelligence-context.js` | Server-reconstructed exploration context for the existing Brain and provider services |

`aiw.architecture/1` projects the existing domain records. It introduces no destructive database migration and does not replace the chapter services as writers. Canonical IDs are retained. Derived relationships are marked as derived and preserve their source or underlying record references. A rendered occurrence is not a new architecture object. Legacy reference context becomes explicit portable context on export.

Saved working perspectives use current project facts. A frozen perspective points to a retained baseline source snapshot; its export projection reads that snapshot. Saving a view or baseline does not itself change the architecture signature used for reasoning freshness. Native restore creates a new private project, retains the source model's external identity namespace and opens the imported perspective. Historical reviews and knowledge records do not confer newly authenticated approval or access.

## Exchange fidelity

| Route | Implemented | Verification and limits |
| --- | --- | --- |
| AIW native | Full supported project source, semantic objects and relationships, attributes, named perspectives, exploration state and retained baseline sources; SHA-256 integrity and source/projection agreement checks | Domain and HTTP round trips, tamper rejection and browser export/import verified. Original binary uploads use the separate recovery package. Server secrets and access grants are excluded. |
| OrbusInfinity preparation | Target metamodel worksheet, explicit object and relationship type pairs, lead/member direction, stable external IDs, mapped attributes, CSV/JSON package and repeat-update manifest | Synthetic mapping and repeat-update tests pass. Missing mappings and absent records are disclosed. No deletion or external write is performed. Actual tenant import, ID resolution and repeat-update verification remain required. |
| ArchiMate | Conservative object mapping, explicit association projection, AIW type properties, omission report and native companion | Generated XML passes the Open Group ArchiMate 3.0 model XSD. This does not claim faithful specialized relationship semantics, diagram interchange or receiving-tool verification. |
| Ilograph | Resources, seven connected perspectives, relationships and a walkthrough source file, with native companion | Source construction and identifier preservation tested. Rendering in Ilograph has not been independently verified. |
| Eraser | Diagram source for the current perspective, unique target IDs and native companion | Source construction and escaping tested. Rendering in Eraser has not been independently verified. |

The Orbus route is an exchange preparation adapter, not a configured tenant connector. An identifying attribute and exact target type-pair mappings are mandatory for a meaningful trial. A package records create/update/unchanged identities relative to the supplied prior manifest; it never interprets absence as permission to delete. A mapping change requires revalidation. A target metamodel and representative import/export template or authorized tenant access are needed for the remaining gate.

The native package is the semantic companion for each external ZIP. Unsupported AIW meaning remains there and is listed in the fidelity report; it is not claimed as native target-tool meaning. Structurizr, reconciled third-party reimport and automatic bidirectional synchronization remain later adapters.

## Verification

- 43 existing regression suites passed.
- 13 connected-model checks cover stable identity, shared and many-to-many mappings, deterministic occurrences, quick-edit preservation, reviewed change propagation into views and SDD, staleness, frozen source snapshots, bounded server context, native integrity, synthetic Orbus updates, external identifier escaping, empty models, a 2,000-requirement projection and isolated HTTP import.
- Desktop browser review covers module entry, realization, perspective and chapter continuity, directed interaction steps, details, contextual Sol, saved views, native upload/restore/reload, unreviewed edit rejection and visible export omissions. A browser-generated native download was retrieved and independently checked against Node SHA-256 and the native validator.
- The source-backed SEABaaS repayment-notification case was replayed into a hypothetical connected design. Its proposed module and implementation remain hypotheses. Workbook row 1073 / PGL-066 and the unresolved delivery-status conflict remain traceable. The workbook does not establish the production topology.
- ArchiMate XSD validation and ZIP integrity checks passed. Portable runtime checks are recorded separately in the local edition's `LOCAL-VERIFICATION.json`.

## Remaining product gates

Independent novice and practitioner sessions are still needed to establish that the experience communicates an unfamiliar architecture well. The current layout is deterministic and supports pan, zoom and explicit detail; it is not a freely arranged spatial editor or continuous animated semantic zoom. Functional module exploration uses retained context and an orientation strip rather than keeping every neighbouring module expanded in place.

The 2,000-requirement check verifies semantic projection, not browser performance at the 100,000-object import boundary. Virtualization, richer layout persistence, complete keyboard/accessibility review, mobile-device review and collaborative scale need their own evidence. Runtime observations are not a new live overlay in this increment. Domain-specific attributes and commands remain authoritative; the projection is not a replacement universal metamodel editor.

The next external proof should be one real Orbus import and repeated update using the target tenant's metamodel. The next product proof should be a recorded novice/practitioner walkthrough of the same connected design, including wrong turns and comprehension gaps. These are explicit acceptance work, not completion claims inferred from passing tests.
