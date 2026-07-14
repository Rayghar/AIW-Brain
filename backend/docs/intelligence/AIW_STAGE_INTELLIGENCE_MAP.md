# AIW Stage Intelligence Map

Version: v0.10.0-rc.10.17  
Sprint: 8.9.4

## Purpose

This map defines how the AIW intelligence substrate should be felt throughout the architecture design journey. It converts the training-reference flow — stakeholders, concerns, drivers, decisions, tactics, components, views and SDD output — into product-stage obligations.

## Stage map

| Stage | User action | Kernel intelligence | Knowledge used | UI expression | Evidence/approval |
|---|---|---|---|---|---|
| Brief | Paste or write problem statement | Extract candidate system context, actors, constraints and initial drivers | Driver taxonomy, stakeholder-concern grammar, measurable-scenario grammar | Driver cards, assumptions, missing-info prompts | Draft labels; user must accept extracted items |
| Stakeholders | Define consumers, providers, operators, reviewers | Map motivations, wishes, concerns and ways of use | Stakeholder persona patterns and SDD grammar | Stakeholder concern matrix | Accept/reject each concern |
| Quality drivers | Rank business, functional, quality and constraints | Score architecturally significant drivers and conflicts | Quality attribute definitions, tactics, benchmark scenarios | Weighted drivers, trade-off warnings, scenario sliders | Receipts for attribute definitions and scoring assumptions |
| Style/pattern selection | Choose style, pattern, tactic | Recommend styles/patterns; arm obligations and risks | Pattern DNA, pattern-to-quality matrix, tactic catalog | Adaptive pattern radar, obligations panel | User accepts pattern; obligations become review checks |
| Logical design | Add components and responsibilities | Check cohesion, coupling, semantic coherence and boundaries | Component responsibility grammar, design practices, Pattern DNA | Component inspector, semantic warnings | Proposed refactors remain previewable |
| Edge/integration design | Draw relationships/integrations | Interrogate protocol, contract, auth, timeout, retry, idempotency, DLQ | Integration patterns, adapter/facade/event/outbox tactics | Edge pre-commit review | Edge can commit with warning or require mitigation |
| Data and tenancy | Add data stores and ownership | Check data ownership, isolation, encryption, backup, retention and consistency | Data tactics, multi-tenancy decisions, compliance constraints | Data responsibility receipts | HARD blocks require waiver where policy applies |
| Technology and policy | Select technology options | Match capabilities to constraints and policies | Technology policy packs, quality-driver tactics, deployment rules | Capability checklist and policy posture | Waivers are time-boxed and owned |
| Review Studio | Run architecture review | Generate scorecard, findings, recommendations, ADRs and fitness tests | Active knowledge release, Pattern DNA, accepted obligations | Review categories, decision panel, test pack | Human accepts generated ADRs/tests |
| Repository conformance | Connect repository evidence | Compare intended model to implementation evidence | Repo asset mapping, conformance controls, CI fitness loop | Evidence coverage and drift report | Repo writes remain disabled until explicitly approved |
| Handoff | Export delivery pack | Compose SDD, ADR pack, C4 views, risk register, backlog and checklist | SDD grammar, review output, canonical architecture model | Handoff artifact browser and ZIP export | Manifest includes release ID and traceability |

## Stage-level rule

Every stage must be able to answer:

1. What does AIW know here?
2. Why does it believe this?
3. What can the user safely accept?
4. What becomes an obligation later?
5. What is only draft, offline, stale or insufficiently grounded?


## Canonical stage labels

- Brief
- Quality Drivers
- Patterns and Tactics
- Canvas Modelling
- Review Studio
- Repository Conformance
- Architecture Handoff

Export and handoff actions are user-triggered and traceable; generated changes remain approval-bound.
