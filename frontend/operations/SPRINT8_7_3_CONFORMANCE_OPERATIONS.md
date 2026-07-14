# Sprint 8.7.3 Conformance Operations

## Reference commands

```bash
npm ci
npm run sprint8_7_3:verify
npm run e2e
```

## Target-environment operation

1. Configure a writable acceptance repository and delivery token.
2. Generate and review the conformance plan and artifacts.
3. Deliver artifacts through the governed pull-request workflow.
4. Execute CI and return evidence to `/api/conformance/evidence`.
5. Import infrastructure/runtime inventories and telemetry.
6. Run `/api/conformance/assess` or use the Continuous Conformance workspace.
7. Do not approve remediation until evidence, impact and rollback are reviewed.

## Production acceptance

A release should not pass implementation conformance while critical or high findings remain open, required controls are unverified, or the relevant architecture stages lack current approval.
