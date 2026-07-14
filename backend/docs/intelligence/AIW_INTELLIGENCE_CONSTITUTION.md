# AIW Intelligence Constitution

Version: v0.10.0-rc.10.17  
Sprint: 8.9.4 — Intelligence Constitution, Tiering and Knowledge-Pack Architecture  
Base: v0.10.0-rc.10.16 Doctrine Embedded

## 1. Purpose

AIW's intelligence is not a chatbot attached to a canvas. It is a governed architecture reasoning system made of deterministic code, pinned knowledge releases, explicit design grammar, and bounded language routes.

This constitution makes the intelligence model explicit so that subsequent sprints can build tiering, offline knowledge packs, source ingestion, and stage-level guidance without creating duplicate recommendation authorities.

## 2. Non-negotiable laws

1. **Authority lives in the deterministic kernel and the active knowledge release.**
   - The kernel evaluates architecture state.
   - The active knowledge release supplies governed facts, pattern DNA, tactics, trade-offs, quality attributes, and SDD grammar.
   - Retrieval, source popularity, model fluency, or user preference may not silently reorder authoritative recommendations.

2. **The LLM is a language faculty, not the mind.**
   - It may extract, explain, question, summarize, draft and translate.
   - It may not score, assign HARD severity, mutate the model, promote knowledge, or bypass approval.
   - Every LLM route must accept a purpose, schema, clamp set, and whitelisted knowledge references.

3. **Knowledge mutates only through governance.**
   - Sources are registered with posture, trust tier, license and owner.
   - Snapshots are pinned before processing.
   - Candidate claims are quarantined, deduplicated, contradiction-scanned, corroborated, reviewed, and promoted by a named human.
   - Contradictions are resolved by context split, not deletion.

4. **Architecture mutation is previewable, selective, reversible and human-approved.**
   - AIW proposes; architects decide.
   - Generated ADRs, model changes, conformance controls, and handoff backlog items remain proposed until accepted.

5. **Honesty is a rendered feature.**
   - Draft and non-scoring outputs are labelled.
   - Offline/online capability limits are visible.
   - Insufficient grounding is an allowed result.
   - AIW may not declare its own production readiness without external acceptance evidence.

## 3. Intelligence layers

| Layer | Name | Owns | Must not own |
|---|---|---|---|
| 1 | Knowledge memory | Sources, claims, Pattern DNA, quality attributes, tactics, templates, SDD grammar, fitness seeds | User-specific scoring by itself |
| 2 | Deterministic reasoning kernel | Ranking, graph checks, obligations, review findings, recommendations, scorecards | Natural-language invention or ungoverned facts |
| 3 | Experience intelligence | Stage guidance, adaptive palette, edge interrogation, smart defaults, receipts, health posture | Hidden model mutation |
| 4 | Language faculty | Brief extraction, clarification questions, explanations, ADR narrative drafting | Authority, scoring, approval, HARD blocks |

## 4. Architecture reasoning grammar

The Cambridge/SSP/Agency Banking reference pack shows the practical reasoning flow AIW must preserve:

```text
stakeholders
→ motivations, wishes, concerns, ways of use
→ business / functional / quality / constraint drivers
→ architecturally significant requirements
→ candidate styles, patterns and tactics
→ decisions with rationale, assumptions, risks, scaling factors and trade-offs
→ solution options and rejected alternatives
→ components, interfaces, properties and composition
→ views/models for named audiences
→ review findings, ADRs, fitness tests and SDD/handoff pack
```

This grammar is now a product-level contract. Future stages must map their intelligence output back to one or more grammar elements.

## 5. Stage intelligence requirements

At every stage AIW should expose:

- what intelligence fired,
- what knowledge release was used,
- which claims or Pattern DNA records influenced the result,
- what assumptions were made,
- what obligations were armed,
- what the user accepted, rejected or deferred,
- which generated artifacts trace back to the decision.

## 6. Tiering principle

Tiering must not fork the mind.

All tiers use the same constitutional model:

```text
same deterministic kernel
same knowledge-release format
same human-approval rules
same evidence model
same prohibition semantics
```

What changes by tier is deployment posture, language faculty availability, governance depth, live evidence ingestion, collaboration and administrative control.

## 7. Offline principle

Offline AIW is not a weak version of the mind. Offline AIW is the deterministic authority layer running with a signed knowledge pack. It must remain useful without an API key.

Offline AIW can perform:

- brief-to-driver guidance using local grammar and templates,
- quality-driver ranking from the pinned release,
- pattern/tactic recommendations,
- graph and model checks,
- Review Studio findings,
- ADR/fitness-test/handoff generation,
- local traceability and receipts.

Offline AIW cannot claim fresh repository evidence, live knowledge ingestion, tenant-wide release promotion, or cloud model enrichment unless those capabilities are locally configured.

## 8. Admin mind operations principle

Admin users administer the mind through governed operations, not database edits:

```text
register source
snapshot source
extract candidate claims
review claim
triage contradiction
resolve duplicate/synonym
stage Pattern DNA change
build release candidate
run validation gates
promote signed release
pin release to tenant/project
rollback if required
export audit evidence
```

## 9. Completion bar for subsequent sprints

Sprint 8.9.5 and later must not be considered complete unless they preserve this constitution and add gates for any new mind operation.
