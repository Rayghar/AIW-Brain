AIW v0.10.0-rc.10.21 — Live Provider Binding, KMS/Repository Runbooks and .aiw-kpack UX

# AIW v0.10.0-rc.10.21 — Sprint 8.9.5 Mind Administration and Knowledge Ingestion Factory

This release uses the rc.10.17 Intelligence Constitution build as its base and implements the first operational factory for administering AIW's mind.

## Major changes

1. **Source quarantine and snapshot contract**
   - Sources can be captured as pinned snapshots with content hash, license, provenance and quarantine status.
   - Blocked snapshots cannot produce candidate claims.

2. **Candidate claim extraction contract**
   - Extracted claims are non-scoring and reviewer-required.
   - The language faculty may assist extraction later, but it cannot approve, weigh or promote claims.

3. **Normalization, duplicate/synonym and contradiction handling**
   - Candidate claims can be normalized.
   - Duplicate and synonym groups are identified.
   - Contradictions require context split/review, not deletion.

4. **Release-impact preview**
   - Candidate releases must preview affected stages and recommendation movement before promotion.
   - Candidate knowledge remains preview-only until promoted and pinned.

5. **Signed knowledge-pack import/export foundation**
   - Reference manifest generation and activation checks are available for offline/sovereign pack flows.
   - Unsigned or malformed packs are rejected.

6. **Stage-to-knowledge traceability**
   - Admin can inspect which knowledge inputs power Brief, Quality Drivers, Patterns/Tactics, Canvas, Review Studio, Repository Conformance and Architecture Handoff.

## Verification summary

```text
npm run package:integrity
npm run release:hygiene
npm run build:packages
npm run build -w @aiw/api
npm run test -w @aiw/api -- test/sprint8_9_5.test.ts
node scripts/verify-sprint8_9_5.mjs
```

## Boundary

This is a governed reference factory. Live cloning, production KMS signing, and target-environment worker execution remain deployment-bound activities.

## v0.10.0-rc.10.29

- Project Cockpit added as default product entry surface.
- Navigation grouped into Design Studio, Intelligence & Review, Governance & Delivery, and Admin & Knowledge.
- Universal Studio Inspector added to keep evidence, selected object state, recommendations and governance posture visible.
- Route-level workspace error boundary added to avoid full-app crashes from individual workspace rendering errors.
- Readability reset raises dense microcopy and telemetry labels.


## v0.10.0-rc.10.34 — Product-grade tables, previews and empty states

Sprint 8.9.13 adds a reusable specialist workspace table system with search, row preview drawers and explicit empty states. Knowledge Ops and Admin Control Plane dense internal tables now use the shared `StudioDataTable` pattern so operators can inspect records without losing their current context.
