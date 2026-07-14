# Sol Intelligence Calibration

## Purpose

The calibration answers a narrow but critical question: does Sol produce stage-correct, evidence-grounded and actionable architecture guidance without inventing facts?

## Evaluation dimensions

1. Stage alignment
2. Evidence grounding
3. Specificity
4. Clarification discipline
5. Trade-off quality
6. Actionability
7. Governance transparency
8. Lineage completeness

Critical failures include wrong-stage reasoning, unsupported numeric/legal claims, missing evidence where evidence is explicitly requested, and opaque authority.

## Controlled result

- Scenarios: **9**
- Passed: **9**
- Deterministic average: **91.6**
- Stage alignment: **100%**
- Quality-gate pass rate: **100%**
- Unsupported claims: **0**
- Live LLM variants: **not available**

| Stage | Score | Recommendation | Clarification |
|---|---:|---|---|
| requirements | 86 | Requirement legacy-objective-3 (“Business objective 3”) is the most architecture-significant ambiguity because no accountable stakeholder is linked and no observable acceptance criterion is recorded. Resolve this before treating the requirements baseline as architecture-ready. | Who is accountable for approving “Business objective 3”, and what observable acceptance evidence will show that the outcome has been achieved? |
| quality | 83 | Quality scenario qs-payment-provider-latency is the weakest measurable constraint because its response measure (“No confirmed order is lost; checkout degrades within 3 seconds”) has no recorded observation window, verification source or accountable test owner. Until that evidence is supplied, tactics derived from this scenario must remain provisional. | Over what measurement window, using which evidence source and test owner, will “No confirmed order is lost; checkout degrades within 3 seconds” be verified? |
| context | 90 | No canonical System Context is accepted. Use journey legacy-journey-1 (“Process customer orders reliably”) to establish the system boundary, then explicitly disposition its actors, the known external systems (Core ledger, Enterprise identity provider, Commerce analytics platform), trust-boundary crossings and interactions. | For journey “Process customer orders reliably”, which participants are inside the system of interest and which must remain external? |
| logical | 97 | The next boundary decision is ownership between logical-order-service (“Order Service”) and logical-payment-service (“Payment Service”). Assign one owner for the journey state and failure/compensation policy; otherwise their coupling remains ambiguous before further decomposition. | Which responsibility owns the authoritative state and compensation outcome when “Order Service” and “Payment Service” collaborate? |
| realization | 97 | Add an explicit reconciliation or compensation responsibility around deployable-payment-worker (“Payment Worker”) for exhausted retries and uncertain outcomes on interface if-payment-provider (“Payment Provider Contract”). The accepted asynchronous boundary otherwise has no visible owner for exception resolution. | Which component and team own reconciliation, compensation and manual disposition after retries on “Payment Provider Contract” are exhausted? |
| logicalTechnology | 93 | Add a provider-neutral resilience and recovery capability. Quality scenario qs-payment-provider-latency requires “Isolate the failure and preserve order status for safe retry”, but the logical technology model has no explicit backup, recovery, failover or continuity capability to own that obligation. | Which provider-neutral recovery capabilities and accountable operational owner will verify scenario qs-payment-provider-latency before product selection? |
| physicalTechnology | 97 | The highest-impact deployment decision is finding-single-zone-postgres (“Critical order database remains single-zone”). The physical database currently records one availability zone and does not meet the intended failure-domain posture. Keep the physical stage unapproved until the failure-domain choice is corrected or an accountable risk disposition is recorded. | Which zone/region failover design and verification evidence will replace the current configuration of “Managed PostgreSQL”? |
| review | 89 | Architecture approval should remain blocked by finding-development-identity (“Development authentication is enabled”, severity HARD). Disposition it as changes required, attach the mitigation evidence, and only then request re-review. | Who owns remediation of “Development authentication is enabled”, what evidence will prove closure, and which reviewer must accept it? |
| sdd | 92 | The SDD is not implementation-ready because finding-development-identity (“Development authentication is enabled”) remains unresolved and approval approval-physical is still changes-requested. Mark the affected security/deployment and assurance sections as blocked or stale, attach corrective evidence, and regenerate only after reapproval. | Which SDD section owns the unresolved finding, and what evidence and approval will make that section implementation-ready? |

## Interpretation

The strongest improvement is not higher prose quality. It is that each stage now diagnoses a concrete project condition and names the evidence that caused the diagnosis. Requirements and Quality Drivers remain the lowest-scoring stages because the controlled reference project still contains legacy compatibility projections and incomplete evidence. Logical, realisation and physical stages score highest because they contain explicit model objects, interfaces, ADRs and findings.

## What remains unproven

- Whether a live governed LLM equals or outperforms deterministic output.
- Whether independent architects score the blinded outputs at or above 4/5.
- Whether AIW reduces end-to-end preparation time by 25% or ADR/SDD time by 40%.
- Whether calibration generalises across multiple real enterprise domains.
