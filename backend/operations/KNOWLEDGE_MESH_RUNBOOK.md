# Dynamic Architecture Knowledge Mesh Runbook

## Default posture

GitHub refresh and LLM extraction are disabled unless explicitly configured. The built-in approved seed release is available offline.

## Enable GitHub refresh

```bash
export AIW_ENABLE_GITHUB_KNOWLEDGE=true
export AIW_GITHUB_TOKEN="<runtime-secret-reference>"
npm run dev:api
```

Do not store the token in project JSON, source snapshots or generated artifacts.

## Refresh-preview procedure

1. Select an approved connector.
2. Call `POST /api/knowledge-mesh/github/refresh-preview` with its connector ID.
3. Confirm the commit SHA, ETag, file count and warning list.
4. Inspect the path allowlist and excluded files.
5. Store the snapshot as quarantined.
6. Do not change the snapshot status manually.

## Extraction procedure

1. Read an allowed file from the pinned snapshot.
2. Call `POST /api/knowledge-mesh/extract` with snapshot, source path and text.
3. Inspect rejected and warning lists.
4. Confirm every claim has conditions and limitations where applicable.
5. Run contradiction analysis.
6. Create a knowledge proposal.

## Review procedure

Reviewers must verify:

- The claim is supported by the source.
- The source location and revision are correct.
- Provider-specific advice is labelled.
- Conditions and limitations are complete.
- No quotation exceeds licence or copyright policy.
- Numerical impacts are supported by evidence.
- Contradictions are resolved or context-separated.
- Recommendation regression fixtures pass.
- A second source is available where policy requires corroboration.

## Release procedure

1. Approve all included proposals.
2. Publish a versioned knowledge release.
3. Record checksum, source snapshots and proposal IDs.
4. Rebuild retrieval indexes.
5. Run design recommendation regression.
6. Promote the release to production.
7. Keep the prior release available for rollback.

## Incident response

For compromised or incorrect upstream guidance:

1. Disable the connector.
2. Mark affected snapshots rejected.
3. Identify releases containing the affected claims.
4. Publish a corrective release or roll back.
5. Re-run recommendations for impacted projects.
6. Notify architecture owners of changed advice.
7. Preserve audit records.
