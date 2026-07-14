# Repository and Conformance Pilot — v0.10.0-rc.10.9

This product note documents the read-only repository onboarding and conformance pilot. The capability detects repository architecture evidence, produces an evidence coverage report, generates reviewable conformance controls, proposes a CI fitness-loop plan and prepares runtime evidence ingestion without mutating repositories or architecture models automatically.

## Guardrails

- Repository writes remain disabled by default.
- PR creation is preview-only and requires explicit approval.
- Architecture model mutation requires human approval.
- Runtime evidence is evidence-only.
- Generated conformance controls are review seeds until approved.
