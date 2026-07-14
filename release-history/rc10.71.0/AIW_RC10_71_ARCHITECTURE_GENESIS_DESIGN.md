# AIW Architecture Genesis — Design and Authority Model

## 1. Purpose

Architecture Genesis converts incomplete business intent and heterogeneous source material into a governed project-understanding model that can safely drive the remaining architecture lifecycle.

The design prevents each page or LLM prompt from independently interpreting the original documents. Accepted understanding is compiled once into canonical records and stage-specific context packages.

## 2. Runtime architecture

```text
Idea / paste / DOCX / PDF / Markdown / text / CSV
                         │
                         ▼
              Source Intake and Extraction
                         │
                         ▼
             Source Sections and Evidence
                         │
                         ▼
       Requirements Genesis Deterministic Engine
           ├─ classification and normalisation
           ├─ ambiguity and metric checks
           ├─ stakeholders and concerns
           ├─ candidate requirements
           ├─ clarification questions
           ├─ semantic journey candidates
           └─ requirements-health assessment
                         │
              optional governed LLM brief enrichment
                         │
                         ▼
             Reviewable Distillation Proposal
                         │
          deterministic validation + revision guard
                         │
                         ▼
               Explicit Human Acceptance
                         │
                         ▼
          Canonical Requirements Intelligence State
                         │
                         ▼
             Architecture Context Compiler
      ┌────────────┬─────────────┬───────────────┐
      ▼            ▼             ▼               ▼
 Quality       System       Logical App      Realisation /
 Drivers       Context       Context          Technology /
 Context       Package                        Review / SDD
```

## 3. Canonical record design

Every accepted record carries or can resolve:

- stable identifier;
- record type;
- origin: source-derived, user-entered, deterministic, knowledge-suggested or LLM-inferred;
- confidence;
- source-evidence references;
- lifecycle/review status;
- owner or confirmer;
- project revision;
- downstream lineage.

This makes “where did this come from?” a model question rather than a narrative promise.

## 4. Source intake

### Supported in rc.10.71.0

- short idea;
- pasted text;
- UTF-8 text and Markdown;
- CSV;
- DOCX text extraction through Mammoth;
- text-enabled PDF extraction through `pdf-parse`;
- up to twenty sources per distillation request;
- 7 MB bounded file extraction;
- public, internal, confidential and restricted classifications.

### Safety and integrity behaviour

- empty and oversized sources are rejected;
- extraction problems become visible warnings;
- scanned PDFs do not trigger hidden OCR;
- XLSX binary content is not guessed and must be exported as CSV;
- restricted/confidential classification is passed into governed LLM routing;
- sources remain evidence inputs, not automatic canonical facts.

## 5. Distillation and epistemic safety

The deterministic compiler owns structure and safety. It may propose wording, classification and journeys, but it cannot claim unsupported numeric performance, availability, RTO or RPO targets. Such gaps become explicit questions.

The optional LLM is used to improve ambiguous solution intent. It does not own:

- schema validity;
- architecture eligibility;
- source provenance;
- approval;
- canonical mutation;
- release authority.

## 6. Semantic journey model

A journey is represented by:

- journey identity and purpose;
- participating actors and systems;
- one or more paths;
- ordered interactions;
- interaction purpose and exchanged data;
- linked requirements;
- quality implications;
- trust crossings;
- architecture obligations.

The sequence diagram is a projection of these objects. This enables future alternative views, validation, export and refinement without treating an image as the architecture record.

## 7. Journey-to-architecture reasoning

The initial transformation grammar is:

| Journey signal | Candidate architecture implication |
|---|---|
| Human actor | System Context actor |
| External participant | External system and context relationship |
| Journey step | Logical responsibility |
| Business decision | Policy/rule responsibility |
| Data exchange | Interface and data obligation |
| Trust crossing | Security-control and threat-review obligation |
| Failure path | Resilience, error-handling and recovery obligation |
| Long-running work | Workflow/orchestration consideration |
| Asynchronous outcome | Event and delivery-semantics consideration |
| Reconciliation | Ledger, batch or reconciliation responsibility |

The grammar proposes obligations; it does not prematurely commit microservices or vendor products.

## 8. System Context stage

System Context is now an explicit lifecycle responsibility rather than an incidental output of Logical Application.

It accepts:

- approved system intent;
- actors and stakeholders;
- external systems;
- major journeys;
- scope and boundary facts;
- accepted requirements;
- open architecture questions.

It produces:

- one system of interest;
- context actors;
- external systems;
- context relationships;
- journey coverage;
- preserved obligations and lineage;
- a reviewable candidate model.

Internal containers and components remain intentionally deferred to deeper decomposition.

## 9. Architecture Context Compiler

The compiler creates bounded context packages for each stage. A context package contains only the accepted facts, drivers, journeys, obligations, unresolved questions and lineage relevant to that stage.

Benefits:

- consistent interpretation across pages;
- smaller and safer LLM prompts;
- deterministic downstream reasoning;
- explicit revision and staleness handling;
- reduced duplication;
- traceable rationale and model proposals.

## 10. Cambridge knowledge authority

`CAMBRIDGE-SA-1.0` is an initial executable knowledge release for the Architecture Genesis scope. It is explicitly bounded:

- project evidence and enterprise policy override generic knowledge;
- numeric targets require source or user confirmation;
- human approval remains mandatory;
- the pack is version-pinned and rollback-aware;
- it is not a verbatim or complete reproduction of all course material.

## 11. User journey

```text
Open Requirements
→ choose Describe, Paste or Upload
→ compile proposal
→ review evidence, health and questions
→ accept selected records
→ inspect major journeys
→ move to System Context
→ preview participants and interactions
→ compare with existing context
→ accept context model
→ inspect actual stage output and handoff
```

## 12. Extension architecture

The design intentionally supports later additions:

- source semantic diff and contradiction adjudication;
- inline journey authoring and simulation;
- journey-to-logical-responsibility composition;
- interface and data contract generation;
- security and resilience overlays;
- semantic downstream impact analysis;
- SDD requirements and dynamic-view generation;
- Agency Banking benchmark calibration.
