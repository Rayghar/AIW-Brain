# Sol Knowledge Transformation Security Report

Baseline: AIW v0.10.0-rc.10.73.6  
Network access: **none**  
Production accepted: **false**  
Gate: **PASSED**

## Security and authority-isolation checks

- **PASSED — total-governed-source-count-47:** Source map has 47 dossiers with preserved 30/9/8 previous lifecycle distribution.
- **PASSED — default-acquisition-selection-47:** Empty connector list selects all acquisition-approved dossiers.
- **PASSED — explicit-connector-filter-and-partial-retry:** Explicit retry filters are deduplicated, ordered, and reject unknown or unapproved connector IDs.
- **PASSED — source-authority-remains-differentiated:** Five differentiated sourceAuthorityClass values remain while acquisitionStatus is approved for all 47.
- **PASSED — candidate-and-discovery-remain-non-authoritative:** The 9 candidate and 8 discovery-only sources retain non-authoritative lifecycle and prohibited authority uses.
- **PASSED — acquisition-does-not-grant-authority:** Acquisition permission is orthogonal to scoring, hard-constraint, conformance, and promotion authority.
- **PASSED — archived-acquisition-dispositions-remain-non-normative:** Both archived identities are explicitly acquisition-approved while remaining ineligible as current guidance or automatic promotion; successors require separate governance.
- **PASSED — focused-archived-preflight-proves-immutable-identities:** The authenticated focused evidence retains exact archived identities and a resolved 40-hex immutable revision for each connector.
- **PASSED — prompt-injection-shaped-evidence-remains-data:** Prompt-injection-shaped text is retained only inside the untrusted evidence envelope.
- **PASSED — repository-text-cannot-change-system-instructions:** System instructions are immutable application data and are not derived from repository text.
- **PASSED — missing-evidence-prevents-claim-creation:** Missing or hash-mismatched bounded evidence is rejected before semantic proposal creation.
- **PASSED — strict-output-schema-rejects-extra-or-invalid-fields:** Strict proposal validation rejects extra fields and non-candidate authority.
- **PASSED — all-generated-knowledge-candidate-only:** The acceptance boundary permits candidate authority only.
- **PASSED — authoritative-brain-route-excludes-candidates:** Runtime retrieval populates the authoritative route from approved hits only; candidate hits require explicit opt-in and remain separate.
- **PASSED — deterministic-dry-run-replay-identical:** Dry-run output is byte-identical when input ordering is reversed.
- **PASSED — production-accepted-remains-false:** Generated governance evidence cannot assert production acceptance.

## Boundary conclusion

Repository content is untrusted data. It cannot replace system instructions, grant source authority, approve licences, activate scoring or constraints, mutate the Design Graph, or promote candidate output. Semantic proposals require immutable bounded evidence and strict candidate-only output validation.
