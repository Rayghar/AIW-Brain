# Round-2 remediation plan

Baseline: `AIW-V5-Local-Source` at `1f9715e` (AIW v0.10.0-rc.10.73.6 plus the round-2 audit documents). Branch `claude/dazzling-cerf-a3qshh`. Scope: every finding in `audit/round2/01`–`05`, the adoption plan in `06`, and the enrichment proposals in `03` §5, in the order of the roadmap in `00_SUMMARY.md` §4. The authority chain, the release notation and the honesty rules in `AGENTS.md` govern every change.

## Discipline

- One working tree, workstreams on disjoint files, run in phases so that no two workstreams edit the same file at the same time. Where a workstream needs a line in a file it does not own, it records the request in its report and the lead applies it.
- Each workstream's agent runs the focused suites it touches; the lead runs the backend and frontend builds, the full regression (`node release-checks.mjs`), the Playwright gates and the security and integrity gates before every commit. A commit is made only on a green run.
- Commits are coherent per workstream, carry no secrets and no model identifiers, and are not pushed from this session.
- Nothing is skipped, disabled or quarantined to get green. A test that fails is a defect to fix in code or a wrong test to correct with its reason recorded.
- No change weakens a role check, a tenant boundary, a budget, a redaction, a receipt or a review gate. No LLM output enters the canonical document except through a command a person submits. `productionAccepted` stays false.
- External authorities (licence counsel, independent review, four-eyes approval, KMS, production acceptance) are not impersonated; their items are recorded with their true status.

## Phase 0, lead

| Workstream | Findings | Files |
|---|---|---|
| R2-H regression runner | F2-27 | `release-checks.mjs`; the server-spawn line of every browser suite |

## Phase 1, four workstreams in parallel

| Workstream | Findings | Files owned |
|---|---|---|
| R2-A backend | B2-01…B2-25 | `server.js`, `worker.js` (server-side handlers and validators), `recovery-service.js`, `project-storage.js`, `intelligence-provider.js`, `intelligence-service.js` (budget reservation only), `audit-log.js`, `operation-service.js`, `security-headers.js`, `build.mjs` (Worker packaging), `check-syntax.mjs`, `scripts/`, `.env.example`, `LOCAL-RUN.md`, migrations, backend suites |
| R2-C diagrams | D2-01…D2-33, P1…P12 | `public/notation-model.js`, `public/notation-layout.js`, `public/notation-view.js`, `public/notation*.css`, `public/sdd-renderer.js`, exchange and export modules (`archimate`, `ilograph`, `eraser`, SVG/PNG export), `public/architecture-explorer.js` palette only, `public/anatomy-view.js` palette only, diagram suites |
| R2-D Brain | I2-01…I2-26 except I2-12 | `public/workspace-ux.js`, `public/brain-context-ui.js`, `public/chapter-sol.js`, `public/chapter-reasoning.js`, `public/brain-reasoning.js`, `public/brain-reasoning-ui.js`, `public/aiw-brain.js`, `public/intelligence-ui.js`, `public/intelligence-context.js`, `public/knowledge-relevance.js`, `public/architecture-brain.js`, `public/knowledge-ui.js`, `public/journey-context-ui.js`, `public/cursor-tip*.js`, `public/entry.js` (the catalogue comment and lazy load), `sol-evaluation.js`, Brain suites |
| R2-B frontend core | F2-01…F2-07, F2-10…F2-13, F2-18…F2-25 | `public/project-store.js`, `public/workbench-ui.js`, `public/project-context.js`, every chapter studio `public/*-ui.js` (Chapters 4–11 Work editors), `public/model-stage.js`, `public/technology-domain.js`, `public/review-domain.js`, `public/workbench-domain.js`, `public/guided-creation.js`, new `public/dialog.js`, `client-bundle.mjs`, `package.json` devDependencies and scripts, lint configuration, new UI suites, a 300-object fixture |

## Phase 2, two workstreams in parallel

| Workstream | Findings | Files owned |
|---|---|---|
| R2-F UI/UX | U2-01…U2-39 | `public/app.js`, `public/requirements.js`, `public/quality.js`, `public/decisions.js`, `public/projects.js`, `public/desk-view.js`, every `public/*.css`, copy and naming across `public/` (word-level edits only in files owned by nobody at that time), the chapter views `public/*-view.js` for toolbar labels and phone defaults, UI/UX suites |
| R2-E field spark, Co-author, Ask Sol | I2-12, `06` §6 | new `public/field-spark.js`, new `public/field-suggestions.js`, new `public/coauthor-ui.js`, the form hook in each `public/*-ui.js` and in `requirements.js`/`quality.js`/`decisions.js` (one `field()` call site each, coordinated with R2-F), `intelligence-service.js` (mode `field`), `worker.js` (`solSuggestions` validation and `provenance.suggestions`), `public/canonical-command.js`, stewards' view statistics, spark suites |

R2-E starts after R2-B has merged (it hooks the studios R2-B edits) and coordinates with R2-F on the three page apps.

## Phase 3, lead and one workstream

| Workstream | Findings | Files owned |
|---|---|---|
| R2-G hygiene and final verification | F2-08, F2-09, F2-14…F2-17, F2-26 | shared helper module(s), the files that duplicate them, the cycle members, timers, formatter, truncation; then the release gates, evidence, manifest and SHA-256, and `audit/round2/REMEDIATION-REPORT.md` |

## Evidence to produce

- Regression report (`AIW_REPORT`), Playwright gate output, security and integrity gate output, bundle size budget output, axe sweep, the 300-object fixture timings before and after, and the diagram metrics (crossings, overlaps, dimensions) before and after on the reference and stress projects.
- `audit/round2/REMEDIATION-REPORT.md`: one row per finding with status (fixed, partly fixed with what remains, not fixed with reason), the commit, and the test that guards it.

## What this plan does not claim

- No licence, legal, independent-review, KMS or production acceptance status changes.
- The LLM-connected behaviour of Sol is implemented and tested against the mock provider and the recorded contract; a real-provider evaluation run is recorded only if a key is supplied, and its absence is stated.
