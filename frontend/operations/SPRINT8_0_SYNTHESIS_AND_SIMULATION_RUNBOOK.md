# Sprint 8.0 Architecture Synthesis and Simulation Runbook

## Preconditions

1. Deploy all database migrations through `008_sprint8_0_architecture_synthesis_and_simulation.sql`.
2. Verify the intended Pattern DNA knowledge release and its signature.
3. Confirm tenant RLS and authentication are enabled.
4. Configure an optional `architecture-reasoning` LLM route; deterministic synthesis does not require it.
5. Confirm approved repository and conformance integrations before enabling handoff.

## Standard operating procedure

### 1. Assess the design brief

```http
POST /api/synthesis/assess
```

Do not proceed to approval while blocking gaps or contradictions remain. Record clarifications in the canonical project rather than only in chat history.

### 2. Create a synthesis run

```http
POST /api/synthesis/runs
```

Specify the approved knowledge release, strategy postures, alternative limit, diversity preference and data classification. Preserve the returned run identifier and project revision.

### 3. Review alternatives

Review:

- Pattern DNA and evidence connectors.
- Prerequisites and conflicts.
- Scorecard dimensions rather than only the overall score.
- Assumptions, risks and obligations.
- Cost and delivery ranges.
- Pareto-frontier status.

Do not treat an LLM-enriched narrative as new evidence.

### 4. Run stress simulations

```http
POST /api/synthesis/runs/{runId}/simulate
```

Run the default suite and any approved custom scenario. Compare alternatives under the same scenario definitions. Escalate critical findings and record any calibration overrides.

### 5. Preview application

```http
POST /api/synthesis/runs/{runId}/apply-preview
```

Confirm:

- Current project revision matches the run.
- Generated nodes and relationships are correctly scoped.
- Pattern selections and obligations are complete.
- Existing accepted decisions are not invalidated without an impact review.

### 6. Record the decision

```http
POST /api/synthesis/runs/{runId}/decision
```

Use `proposed` until required architecture stages and reviewers have approved the alternative. Acceptance must include a rationale and retain open obligations.

### 7. Generate artifacts

```http
POST /api/synthesis/runs/{runId}/artifacts
```

Verify the manifest checksums before committing the package. Review the ADR, CALM projection, diagrams, simulations and fitness tests.

### 8. Handoff to conformance

```http
POST /api/synthesis/runs/{runId}/conformance-handoff
```

Create a repository pull request, allow CI review, publish conformance evidence and link violations back to the decision and affected architecture objects.

## Incident procedures

### Stale project revision

- Reject the application.
- Re-run synthesis against the latest canonical project.
- Compare old and new alternatives rather than forcing the stale mutation.

### LLM provider unavailable

- Continue using deterministic alternatives and simulations.
- Check the configured fallback route and classification policy.
- Do not bypass classification controls for convenience.

### Unexpected discovery-source evidence

- Suspend the run.
- Verify the knowledge-release source policy.
- Remove the record from production retrieval and run recommendation-regression tests.

### Simulation anomaly

- Retain the run and model version.
- Inspect parameters and Pattern DNA signals.
- Compare with empirical telemetry, load tests or chaos results.
- Change calibrated coefficients through governed configuration, not ad hoc output editing.

### Artifact checksum mismatch

- Do not merge or approve the package.
- Regenerate from the persisted run, alternative and simulations.
- Investigate repository or object-store tampering.

## Verification commands

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run security:check
npm run architecture:gate
npm run e2e
npm run sprint7_9:verify
npm run sprint8_0:verify
```

## Backup and recovery

Back up synthesis tables with the existing PostgreSQL backup process. A restored decision must reference the same run, knowledge release, project revision, alternative and simulation results. Regenerate artifacts and compare checksums after restore.
