# AIW SDD Reasoning Grammar

Version: v0.10.0-rc.10.17  
Sprint: 8.9.4

## Purpose

This grammar adapts the user's Cambridge training materials, Shared Services Portal workbooks, and Agency Banking SDD into a reusable AIW reasoning model for Solution Design Document generation.

## Canonical SDD reasoning flow

```text
1. Introduction and motivation
2. Stakeholder personas and concerns
3. Architectural drivers
4. Visual modelling purpose and audience
5. Solution-domain model
6. Architectural decisions
7. Architecture solutions
8. Components, interfaces, properties and composition
9. Architecture views/models
10. Refinements, risks and appendix
```

## Required records

### Stakeholder persona

- stakeholder,
- role,
- motivations,
- wishes,
- concerns,
- ways of using the system,
- expected benefits.

### Driver

- driverId,
- name,
- category: business | functional | quality | constraint,
- description,
- impactOnArchitecture,
- priority,
- source concern.

### Decision

- decisionId,
- name,
- description,
- rationale,
- addressed drivers,
- assumptions,
- risks,
- scaling factors,
- trade-offs,
- alternatives accepted/rejected,
- obligations,
- fitness tests.

### Architecture solution

- solutionId,
- name,
- addressed drivers,
- steps,
- accepted decisions,
- discarded decisions,
- rationale,
- assumptions and risks,
- scaling factors,
- trade-offs.

### Component

- component name,
- responsibilities,
- properties,
- technologies,
- interfaces,
- dependencies,
- architectural solution,
- architectural drivers.

## Documentation minimization rule

AIW should document items that are architecturally significant: long-lived, cross-team, quality-impacting, risk-bearing, expensive to reverse, or needed for governance. Minor implementation choices should remain out of the SDD unless the user marks them significant.

## SDD intelligence hooks

- Brief stage creates candidate stakeholder and driver records.
- Quality stage turns drivers into measurable scenarios and tactics.
- Pattern stage proposes decisions and obligations.
- Canvas stage creates components/interfaces/composition.
- Review Studio validates completeness and quality posture.
- Handoff pack renders SDD sections with traceability.
