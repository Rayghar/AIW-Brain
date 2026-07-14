# AIW v0.10.0-rc.10.71.0 Release Report

## Release identity

- **Release:** AIW v0.10.0-rc.10.71.0
- **Name:** Requirements Intelligence, Journey Modelling and Architecture Context Foundation
- **Codename:** Sol Architecture Genesis
- **Status:** Implemented and focused-acceptance verified; not production accepted
- **Requirements knowledge release:** CAMBRIDGE-SA-1.0

## Product outcome

rc.10.71.0 changes the beginning of the AIW lifecycle from a mainly manual brief form into an architecture-genesis workflow:

**idea, pasted text or source document → governed extraction → reviewable canonical requirements → interactive semantic journeys → stage-specific architecture context → explicit System Context preview and acceptance**

This release establishes the structural foundation needed for later AIW stages to reason from accepted project intent instead of repeatedly reinterpreting raw documents.

## What was implemented

### 1. Canonical requirements-intelligence model

A new shared domain model now represents:

- source documents and sections;
- source evidence and classification;
- objectives, requirements, stakeholders and concerns;
- assumptions, constraints, dependencies and open questions;
- epistemic origin, confidence, review status and approval state;
- solution journeys, participants, paths and interactions;
- requirements-health assessments;
- stage-specific Architecture Context packages;
- proposal revision, knowledge-release pinning and downstream lineage.

The model is implemented in both frontend and backend domain packages and is attached to the canonical `ArchitectureProject`.

### 2. Multi-source requirements intake

The Requirements Intelligence Studio supports:

- starting from a short solution idea;
- pasting unstructured text;
- uploading DOCX, PDF, Markdown, text and CSV sources;
- source classification and bounded file-size validation;
- exact text extraction for text-enabled sources;
- source warnings and evidence retention.

XLSX binary extraction and OCR for scanned PDFs remain deliberately outside this release boundary.

### 3. Governed requirements distillation

A deterministic Architecture Genesis engine now:

- segments sources into evidence-bearing sections;
- identifies candidate requirements and stakeholders;
- classifies and prioritises requirements;
- proposes acceptance criteria;
- detects ambiguous or unsupported quality wording;
- creates clarification questions rather than inventing numeric targets;
- generates candidate major journeys;
- compiles requirements-health measures;
- builds eight stage-scoped Architecture Context packages.

An optional governed LLM may improve the solution intent before deterministic compilation. LLM output remains proposal-only. Explicit human acceptance and stale-revision protection control canonical mutation.

### 4. Requirements Intelligence Studio

The previous brief editor has been rebuilt as a queue-and-review workflow with:

- Sources;
- Requirements;
- Journey Atlas;
- Stakeholders;
- Questions;
- Manual details.

Users can review, select and accept proposed records rather than silently receiving generated content.

### 5. Solution Journey Atlas

Major solution journeys are now semantic model objects rather than static pictures. The Journey Atlas supports:

- happy, alternate, failure and recovery paths;
- participants and interactions;
- requirement lineage;
- data exchanged;
- trust-boundary and quality annotations;
- architecture obligations;
- interactive sequence projection and selected-interaction detail.

### 6. First-class System Context stage

A distinct **System Context & Journeys** lifecycle stage has been introduced between Quality Drivers and Logical Application. It:

- consumes accepted requirements, stakeholders and journeys;
- proposes one system of interest, actors, external systems and context interactions;
- preserves requirement and journey lineage;
- keeps internal components out of the context view;
- exposes architecture obligations that deeper design must preserve;
- requires explicit acceptance before updating the canonical model.

### 7. Architecture Context Compiler

Accepted project understanding is compiled into stage-specific context packages so later stages receive scoped, versioned intelligence rather than a raw document dump. The initial packages cover:

- Quality Drivers;
- System Context;
- Logical Application;
- Application Realisation;
- Logical Technology;
- Physical Technology;
- Review and Assurance;
- SDD and Delivery.

### 8. Cambridge executable knowledge foundation

`CAMBRIDGE-SA-1.0` provides an initial governed executable pack for:

- requirement-quality rules;
- stakeholder and concern rules;
- quality-scenario grammar;
- journey grammar;
- journey-to-architecture transformations;
- System Context rules;
- the architecture reasoning chain;
- promotion gates and authority boundaries.

This is an operationalised subset for Architecture Genesis, not a claim that every Cambridge source asset has already been converted into atomic executable knowledge.

## Authority and mutation boundary

The controlling flow is:

```text
Source material
→ secure extraction
→ evidence-bearing candidate records
→ deterministic requirements and journey compilation
→ optional governed LLM enrichment
→ schema and policy validation
→ reviewable proposal
→ explicit human acceptance
→ canonical project mutation
→ stage-specific context recompilation
```

No document extraction, LLM response or journey preview mutates the canonical model directly.

## Focused acceptance result

| Verification | Result |
|---|---:|
| Frontend package and strict TypeScript builds | Passed |
| Frontend production bundle | Passed |
| Backend package, API and worker builds | Passed |
| Architecture Genesis structural gate | 23/23 passed |
| Backend focused tests | 5/5 passed |
| Chromium desktop/laptop journeys | 2/2 passed |
| Internal dependency gates | Passed frontend and backend |
| Backend release-integrity gate | Passed |
| Focused page/request/console errors | 0 |
| Focused horizontal overflow | 0 px at 1600×900 and 1100×760 |
| Production dependency vulnerabilities | 0 frontend / 0 backend |

The browser journey verifies that a short idea can become a governed proposal, accepted requirements, an interactive Journey Atlas, a previewed System Context and canonical stage output.

## Release boundary

rc.10.71.0 is the **Architecture Genesis foundation**, not the final completion of every rc.10.71 programme increment. The following remain open:

- full claim-level multi-document contradiction and semantic-diff review;
- binary XLSX ingestion;
- OCR for scanned/image-only PDFs;
- advanced journey branch editing, timing, replay and BPMN authoring;
- direct React Flow editing of the System Context preview;
- complete Cambridge corpus operationalisation and independent knowledge approval;
- semantic downstream staleness beyond revision-level protection;
- full journey-to-logical-component co-creation;
- the 396-requirement evidence audit;
- live provider acceptance in the packaging environment;
- broad browser, accessibility and large-model acceptance;
- managed enterprise infrastructure acceptance;
- Agency Banking golden benchmark and independent expert validation.

## Recommended continuation

The next rc.10.71 increments should deepen multi-source reconciliation, journey editing and journey-to-logical-design co-creation before rc.10.72 executes the Agency Banking golden benchmark.
