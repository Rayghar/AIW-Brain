# Enterprise Architecture Portfolio Governance Runbook

## Monthly cycle

1. Confirm portfolio membership, owners, criticality and lifecycle posture.
2. Reconcile cross-project dependencies with repository and runtime evidence.
3. Refresh technology standards and expire outdated exceptions.
4. Review technical-debt records and financial impact.
5. Run `npm run portfolio:reference` or the production portfolio analysis job.
6. Review high-risk projects and single points of dependency.
7. Confirm reference-architecture applicability and compliance gaps.
8. Prioritize roadmap items with architecture, finance, security and delivery owners.
9. Create governed project changes or waivers; do not edit generated report values manually.
10. Snapshot the approved portfolio report and retain it under audit policy.

## Exception handling

- Every restricted, deprecated or prohibited technology exception must name an owner and expiry date.
- Expired exceptions return to the action queue.
- Accepted technical debt remains visible and must include an explicit cost and risk rationale.
- Reference-architecture waivers require governance approval.

## Incident use

During a major incident, use dependency centrality to identify potentially affected systems, but validate the graph against live telemetry before taking action.
