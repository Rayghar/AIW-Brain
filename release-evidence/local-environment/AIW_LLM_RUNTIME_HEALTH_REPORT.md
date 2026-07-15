# AIW LLM Runtime Health Report

Baseline: AIW v0.10.0-rc.10.73.6  
Generated: 2026-07-15T09:10:12.755Z  
Production accepted: **false**

## Execution channels

- **Codex agent channel:** GPT-5.6 Sol is supervising this local engineering and verification task.
- **AIW product-runtime channel:** **UNCONFIGURED**. Provider is openai; the resolved model is `gpt-5.6-sol`.
- **Deterministic fallback/harness:** Passed the gateway governance controls, but is not evidence of an external model call.

## Actual AIW health route

The product's `GET /api/llm-brain/health` route resolved the architecture-reasoning route to OpenAI / `gpt-5.6-sol`, with `configured=false`. The active probe returned HTTP 503. No provider call was made because OPENAI_API_KEY is absent; the route failed closed before network access.

## Configuration and controls inspected

- The real API gateway uses the OpenAI Responses API and strict provider-native JSON Schema, then independently post-validates the returned object.
- System and user content are redacted before provider transport. Redaction receipts expose only categories, counts and fingerprints.
- Claim-bearing output is restricted to an approved evidence-reference allowlist and deterministic entailment verification.
- Transactions begin in `proposed` state, require human review, and prohibit direct model mutation.
- Provider, purpose, protocol and data classification are allowlisted. There is currently **no explicit model-name allowlist**; model identifiers are required to be non-empty and are recorded in route and audit receipts.
- The older integrations OpenAI adapter remains a scaffold and is not the runtime channel tested here.

## Prior provider evidence

`release-evidence/rc10.72.3/LIVE_SOL_PROVIDER_ACCEPTANCE.json` recorded status `blocked`, `liveProviderUsed=false`, and `productionAccepted=false` for the former `gpt-4.1-mini` route. It is historical evidence, not proof of the current model route.

## Governed bounded-transformation controls

The production gateway implementation was exercised with a deterministic provider transport harness. Strict schema validation, redaction receipts, evidence allowlisting, unsupported-claim rejection, candidate-only authority, unchanged Design Graph fingerprint, no automatic promotion, and proposed transaction receipt generation all passed. This harness result must not be read as AIW runtime Sol activation.

## Activation blocker

OPENAI_API_KEY is not configured. Supply it through the external environment or approved secret manager, then rerun this receipt generator with approved network access. No secret file was created or modified.
