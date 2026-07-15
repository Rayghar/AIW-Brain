# Backend Build Reconciliation

Baseline: AIW v0.10.0-rc.10.73.6  
Production accepted: **false**

## Reconciliation

The Prompt 2 backend build failed at `backend/apps/api/src/approvedKnowledgeGrounding.ts` because TypeScript did not narrow optional `claim.subjectId` before it was passed to a required string field. The repair added an explicit missing-field guard for `claimId`, `subjectId`, and `statement`; it did not weaken grounding, evidence, or authority behavior.

Prompt 3's reported backend success occurred after that repair. The clean verification below removes ambiguity: both dependency trees were deleted and recreated by `npm ci`, and both complete builds then exited 0.

| Workspace | Command | Actual start (UTC) | Actual finish (UTC) | Exit |
|---|---|---|---|---:|
| Backend | `npm.cmd ci` | 2026-07-15T08:52:55.4782372Z | 2026-07-15T08:59:02.5446660Z | 0 |
| Frontend | `npm.cmd ci` | 2026-07-15T08:52:50.7879068Z | 2026-07-15T08:57:55.3039842Z | 0 |
| Backend | `npm.cmd run build` | 2026-07-15T08:59:18.7228127Z | 2026-07-15T09:02:25.8911384Z | 0 |
| Frontend | `npm.cmd run build` | 2026-07-15T08:59:18.7228127Z | 2026-07-15T09:02:11.4741944Z | 0 |

Both `npm ci` runs reported zero vulnerabilities. npm also reported that the esbuild postinstall was not allowlisted; no script-policy bypass was introduced. The backend compiled all packages, API, and worker. The frontend compiled all packages and completed the Vite production bundle; Vite emitted a non-fatal large-chunk warning.

The earlier failed command is retained as historical diagnostic evidence, not rewritten as a pass. Its numerical exit code was not persisted in a repository receipt; it was non-zero and stopped at the cited TypeScript error. The four clean closure commands above have explicit exit code 0.

All timestamps in this document are actual command timestamps emitted by the verification shell. They are not deterministic fixture timestamps.
