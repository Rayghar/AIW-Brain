# Gate 6B Pilot Approval Package

Generated: 2026-07-16T08:07:12.560Z

Status: **prepared; not approved; not started**. Production accepted: **false**.

## Selection

- Distinct bounded corpus semantic units: 189
- Bounded source occurrences: 190
- Source-gap controls (not model inputs): 12
- Total inspectable selection records: 202
- Governed repositories represented: 47/47, with four base slots each
- Supplementary paired and unique-coverage records: 14
- Global evidence-absence controls: 3
- Selection fingerprint: `sha256:69a06fa027c93245baddfdc4bf8289e0211ee936f3d7d0cf14d934c1d7285085`
- Authority classes covered: 5
- Candidate authority only; independent gold-set review has not occurred.

Authority coverage: architecture-conformance-implementation=26, educational-or-discovery-source=34, official-reference-architecture=74, official-specification-or-standard=15, reviewed-practitioner-or-implementation-source=53.

Artefact coverage: adr-or-decision-source=5, agentic-architecture-source=5, bounded-prose-or-code-evidence=139, conformance-or-fitness-source=14, deployment-or-topology-blueprint=6, diagram-or-visual-model=10, evidence-absence-control=12, machine-readable-or-structured-model=30, operational-or-resilience-source=1.

Topic coverage: agentic-architecture=9, diagram-and-model-semantics=32, general-architecture=78, interfaces-and-data-obligations=18, modernisation=1, observability=4, patterns-tactics-and-conformance=32, reference-and-deployment-architecture=7, resilience=1, security=8, source-gap-and-abstention=12.

Deterministic disposition coverage: ambiguous=9, boilerplate=15, duplicate-mapped=3, generated-content=3, human-review-required=83, implementation-example=8, missing-governed-evidence=12, near-duplicate-clustered=53, non-architectural=16.

The corpus cannot truthfully supply every requested per-repository slot. Missing slots are retained as preflight abstention controls and cannot be sent to the model. The pilot therefore meets the minimum of 188 distinct bounded units while keeping source gaps visible.

### Per-repository source gaps

- GH-AWESOME-ANTIPATTERN / claim-bearing-materially-different: Repository corpus has no second materially different bounded semantic unit.
- GH-AWESOME-DESIGN-PATTERNS / claim-bearing-materially-different: Repository corpus has no second materially different bounded semantic unit.
- GH-AWESOME-SCALABILITY / claim-bearing-materially-different: Repository corpus has no second materially different bounded semantic unit.
- GH-AWESOME-SCALABILITY / deliberate-non-claim: Repository corpus has no bounded administrative, boilerplate, generated, irrelevant, or short negative-control passage.
- GH-AWESOME-SYSTEM-DESIGN-RESOURCES / claim-bearing-materially-different: Repository corpus has no second materially different bounded semantic unit.
- GH-AWS-SAAS-EKS / claim-bearing-materially-different: Repository corpus has no second materially different bounded semantic unit.
- GH-AWS-SAAS-EKS / deliberate-non-claim: Repository corpus has no bounded administrative, boilerplate, generated, irrelevant, or short negative-control passage.
- GH-CNA-QUALITY-MODEL / deliberate-non-claim: Repository corpus has no bounded administrative, boilerplate, generated, irrelevant, or short negative-control passage.
- GH-GCP-SOFTWARE-DELIVERY-BLUEPRINT / claim-bearing-materially-different: Repository corpus has no second materially different bounded semantic unit.
- GH-GCP-SOFTWARE-DELIVERY-BLUEPRINT / deliberate-non-claim: Repository corpus has no bounded administrative, boilerplate, generated, irrelevant, or short negative-control passage.
- GH-SYSTEM-DESIGN-101 / claim-bearing-materially-different: Repository corpus has no second materially different bounded semantic unit.
- GH-SYSTEM-DESIGN-101 / deliberate-non-claim: Repository corpus has no bounded administrative, boilerplate, generated, irrelevant, or short negative-control passage.

The global abstention controls cover absent current normative core-banking evidence, complete official MCP/A2A guidance, and official OpenTelemetry specification evidence.

## Strategy comparison

A 24-unit paired subset is planned across one-unit calls, same-source micro-batches of at most three, and bounded cross-file architecture groups of at most four. The comparison uses 38 calls before a strategy is selected. Evidence precision and contamination controls outrank cost.

## Limits

- Semantic-unit ceiling: 220
- Model-call ceiling: 250
- Token ceiling: 750,000
- Retry ceiling: 2
- Initial concurrency: 2; maximum after clean evidence: 4
- Estimated token demand: 285,200 minimum; 458,800 likely; 806,000 uncapped maximum. The hard ceiling stops execution before 750,000 is exceeded.
- Expected elapsed runtime: 15 minutes minimum, 45 minutes likely, up to 150 minutes at the limits; these are estimates because live provider latency is unmeasured.
- Expected calls if the individual strategy wins after comparison: 214; hard ceiling 250.
- Expected new candidate storage: below 64 MiB permanent; 512 MiB temporary envelope.

## Runtime blocker

The runtime process has no OpenAI secret and there is no provider-account-verified model allowlist entry. The live bounded smoke and pilot are blocked. No network or model call was made.

## Proposed command after separate runtime and product-owner approvals

`node backend/scripts/rc10-73-8/run-gate-6b-pilot.mjs --selection release-evidence/rc10.73.8/GATE_6B_PILOT_SELECTION.json --max-units 220 --max-calls 250 --max-tokens 750000 --max-retries 2 --concurrency 2`

The command is a proposal only. The executable pilot runner has not been implemented or invoked, so it cannot be mistaken for an authorized path.
