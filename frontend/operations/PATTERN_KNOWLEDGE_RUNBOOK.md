# Pattern Knowledge and Repository Governance Runbook

## Default posture

- GitHub monitoring/retrieval is disabled unless `AIW_ENABLE_GITHUB_KNOWLEDGE=true`.
- Production recommendation retrieval uses an approved AIW knowledge release.
- Current release: `AKR-0.8.8`.
- Repository content is quarantined and cannot publish itself.
- Discovery-only sources cannot drive production recommendations.

## Source onboarding

1. Identify the repository owner and primary architectural purpose.
2. Classify it as authoritative, method/reference, implementation/conformance or discovery-only.
3. Record trust tier, lifecycle, content uses and ingestion mode.
4. Review licence and attribution requirements.
5. Define allowlisted and denied paths, file types, size and file-count limits.
6. Select acquisition mode: selected files, commit archive or controlled clone.
7. Select monitoring mode: scheduled poll, webhook or manual.
8. Assign a knowledge owner and reviewer.
9. Add deterministic governance tests.
10. Register the source without granting production recommendation use until approved.

## Revision monitoring

For an external public repository:

1. Poll repository metadata on the approved cadence.
2. Resolve the latest eligible tag/commit.
3. Compare with the approved revision.
4. If unchanged, record a successful no-change check.
5. If changed, create a candidate revision and snapshot job.

For an AIW-controlled or partner-controlled repository, a GitHub App/webhook may trigger the same candidate workflow. A webhook never bypasses quarantine or approval.

## Snapshot acquisition

1. Retrieve only the approved commit.
2. Apply path allowlists and deny rules.
3. Detect truncated tree results and fetch subtrees explicitly.
4. Reject unsupported binaries, oversized files and excessive counts.
5. Generate file inventory and checksums.
6. Record repository, branch/tag, commit, connector version and retrieval time.
7. Store an immutable source archive or selected-file bundle.
8. Mark the snapshot `quarantined`.

## Quarantine controls

Verify:

- Archive traversal protection.
- File type and size limits.
- Secret and malicious-content scan.
- Prompt-injection boundary.
- Licence-file detection and change alert.
- Parser resource limits.
- No executable code is run from the snapshot.
- No repository instruction is treated as system/user guidance.

## Extraction and normalization

1. Run the source-specific parser.
2. Generate candidate claims, patterns, topologies and conformance rules.
3. Resolve aliases and possible duplicate records.
4. Separate general pattern intent from provider realization.
5. Compare candidate claims with approved evidence.
6. Detect contradictions, limitations and context differences.
7. Calculate impacted records and benchmark scenarios.
8. Keep every extracted object in candidate state.

## Expert review

The reviewer must confirm:

- Source text supports the candidate claim.
- Exact repository revision and source path are recorded.
- Conditions, exclusions and limitations are complete.
- Provider-specific advice is visibly labelled.
- Pattern obligations are complete.
- Quality impacts are reasonable and supported.
- Conflicts and alternatives are represented.
- Topology remains canonical and valid.
- Licence permits the proposed use.
- Required corroboration is present.
- Recommendation regressions pass.

## Knowledge release publication

1. Freeze the proposal set.
2. Resolve or explicitly defer contradictions.
3. Run corpus validation and duplicate review.
4. Run all architecture benchmark scenarios.
5. Run automated tests, type checking, security checks and production build.
6. Generate the release manifest and checksum.
7. Obtain required approvals.
8. Publish the release and rebuild approved retrieval indexes.
9. Retain the prior release for rollback.
10. Notify impacted architecture owners when recommendation behavior changes.

## Pattern recommendation operation

1. Compile project objectives, constraints, quality priorities and current model state.
2. Retrieve approved records from the active knowledge release only.
3. Apply deterministic eligibility and scoring.
4. Preserve penalties, conflicts and counterfactuals.
5. Build the bounded evidence pack.
6. Permit the LLM to explain, compare or draft an ADR.
7. Post-validate citations and deterministic values.
8. Require the architect to accept or reject the recommendation.

## Pattern composition operation

1. Select pattern(s) and scope.
2. Preview prerequisites, conflicts, completion suggestions and obligations.
3. Review quality deltas and proposed topology mutation.
4. Validate the plan against the canonical model.
5. Apply only after explicit architect action.
6. Record the pattern selection and generated obligations.
7. Use the rollback plan if the proposed architecture is rejected.

## Incident response

For incorrect or compromised upstream guidance:

1. Suspend the connector.
2. Block new snapshot and recommendation operations.
3. Identify affected snapshots, records and releases.
4. Roll back to the last safe knowledge release or publish a corrective release.
5. Re-run recommendations for affected projects.
6. Notify architecture owners and governance reviewers.
7. Preserve all evidence and audit events.

For a licence change:

1. Suspend affected use operations.
2. Quarantine new revisions.
3. Review whether existing release content must be removed or re-attributed.
4. Publish a corrected release if required.

## Verification commands

```bash
npm run pattern:intelligence:release
npm run pattern:intelligence:benchmark
npm run test
npm run typecheck
npm run build
npm run security:check
npm run e2e
```

Expected Sprint 7.8 benchmark posture: 6 of 6 passing.
