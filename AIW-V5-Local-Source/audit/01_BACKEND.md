# AIW V5 Live Model Explorer — Backend Security & Integrity Audit

Scope: backend only (`server.js`, `worker.js`, root `*-service.js`, `project-storage.js`,
`requirement-storage.js`, `local-db.js`, `local-files.js`, `intelligence-*.js`,
`brain-retrieval.js`, `knowledge-repository.js`, `repository-sync.js`, `repository-packet.js`,
`knowledge-service.js`, `connection-adapters.js`, `repository-service/`, `drizzle/`, `db/`,
and the shared `public/*-domain.js` where it drives server behaviour).
Read-only analysis. Source of truth confirmed identical to
`origin/release/aiw-v0.10.0-rc.10.73.6-standard-diagrams:AIW-V5-Local-Source`
(byte-for-byte diff of every tracked file: 0 diffs, 0 missing). Paths are relative to
`AIW-V5-Local-Source`. Live probing done against private copies on ports 5391/5392 (the
reviewer's 4173 instance and its `.aiw-local` were left untouched).

---

## 1. Architecture map

**Entry / request flow.** `server.js` is the local Node HTTP host. It reads the whole body,
builds a `Request`, and in local-accounts mode resolves the actor via a signed cookie
(`localAccount`, `server.js:57-71`); otherwise every request is the single `local-architect`
(`server.js:76`). It injects `oai-authenticated-user-id: <actor>` (`server.js:77`) and forwards
to `worker.fetch` with an `env` bag carrying `DB`, `FILES`, `ASSETS`, the OpenAI key and
repository settings (`server.js:79`). The same `worker.js` runs hosted on Cloudflare with
D1 (`DB`) and R2 (`FILES`) bindings (`.openai/hosting.json`).

`worker.js` (`fetch`, `worker.js:49-161`) is the single API router. Non-`/api/` paths go to
static serving. For `/api/*`: it reads the actor header (`worker.js:52`), validates `projectId`
(`worker.js:56`), resolves `identity`/`owner`/`role` via `projectIdentity` (`worker.js:59`,
`collaboration-service.js:11-14`), dispatches to the service modules, and gates non-GET for
non-owner/editor roles (`worker.js:65`). The big command switch (`worker.js:147`) routes
`/api/commands` to ~30 `apply*Command` domain functions in `public/*-domain.js`.

**Storage.** `project-storage.js` keeps the working project as a JSON row in `projects`
(SQLite locally via `local-db.js`; D1 hosted) with large sub-collections (baselines, evidence,
requirements ≥250, knowledge, alternatives, change journal, extensions) spilled to content-
addressed blobs in `FILES` (`local-files.js` locally / R2 hosted), each guarded by a
`digest`/SHA-256 checksum on read (`project-storage.js:11-63`). Writes are optimistic:
`UPDATE … WHERE revision=?` plus a fresh `index_stamp`, all sub-statements in one atomic
`DB.batch`, with orphaned blobs deleted if the row did not change (`project-storage.js:123-128`).
Schema/migrations: `drizzle/0000-0007*.sql`, applied locally in filename order by `local-db.js:18`;
`db/schema.ts` matches.

**Auth.** Two modes. Default: no sign-in, one architect, loopback bind only. Local accounts
(`AIW_LOCAL_ACCOUNTS`, `server.js:32-38`): per-account secret ≥16 chars; HMAC-signed cookie
`aiw_local` (`server.js:39-49`), 12 h TTL; four-eyes needs two real people. Authorization is
per project via `projects` ownership + `project_access` rows (`projectIdentity`,
`collaboration-service.js:11-14`) and per organization via `organization_members`.

**LLM path.** `intelligence-service.js` (`/api/intelligence/*`) prepares a packet
(`brain-retrieval.js` / `public/intelligence-context.js` / `public/brain-reasoning.js`),
enforces per-project AI policy + DB-side hourly/token budgets (`intelligence-service.js:64,105`),
calls OpenAI `responses` via `intelligence-provider.js` (`store:false`, JSON-schema strict,
two-pass grounding + deterministic contract guard), stores the run in `intelligence_runs`+`FILES`,
and returns it. Output only enters the model through an explicit human `intelligence.adopt` /
domain command (`public/intelligence-context.js:145+`, `public/brain-reasoning.js:585+`).

---

## 2. Findings (ordered by severity)

| ID | Sev | Area | Finding | Evidence | Impact | Recommendation |
|----|-----|------|---------|----------|--------|----------------|
| B-01 | High | CSRF / DNS-rebinding | The server computes its *own* origin from the untrusted `Host` header and does no Host allowlist; the API's only cross-origin defence is `Origin === url.origin`. In default (no-accounts) mode no cookie is needed, so a DNS-rebinding site (Host & Origin both = attacker name resolving to 127.0.0.1) satisfies the check and gets full project read/write and OpenAI-key use. | `server.js:75` (`new URL(req.url,'http://'+req.headers.host)`), `server.js:78`; `worker.js:79,138` (`Origin!==url.origin`); no host check in `server.js` vs `repository-service/server.js:16,20` which *does* validate Host. Probed: POST `/api/projects` with `Host` & `Origin` both `attacker.example:PORT` → **201 Created**; cross-site `Origin` with real Host → 403. | Any web page the developer visits can drive the local API as `local-architect`, read/alter all projects and spend the OpenAI key. Accounts mode is protected by the `SameSite=Strict` cookie. | Validate `Host` against a fixed `127.0.0.1[:port]`/`localhost` allowlist (as the repository service already does); compute the expected origin from that, not from the request. |
| B-02 | High | Governance / privacy | The desk/chapter **reasoning** packet does not honour the project's `excludedObjectIds` disclosure policy for context sources: it only throws when an *asked-about item* is excluded, but still sends excluded objects to the LLM when they appear as quality drivers / neighbours. The generate path (`intelligencePacket`) correctly filters them. | `public/brain-reasoning.js:227` (build `excluded`), `:230` (item-only check), `:276` (drivers `add()` with no `excluded.has`), `:291` (`shown` applies only `redactContacts`); contrast `public/intelligence-context.js:89` (`packet.sources=…filter(s=>!excluded.has(s.objectId))`). Probed: with all four QD drivers listed in `excludedObjectIds`, `reasoningPacket` still emitted them in `sources`. | An object the owner explicitly excluded from AI processing is transmitted to OpenAI whenever Sol reasons at the desk / in a chapter — a real disclosure-policy bypass on one of the two LLM paths. | Filter `sources`/`links` by `excluded` in `reasoningPacket` before building `shown`, matching `intelligencePacket`. |
| B-03 | High | Session management | Sessions cannot be revoked server-side. Sign-out only deletes the client cookie; there is no server session store, so a captured/leaked cookie stays valid for the full 12 h until it expires (or the process restarts and rotates the random key). | `server.js:39` (per-process `SESSION_KEY`), `:42-49` (stateless HMAC token), `:64` (issue), `:66` (sign-out just clears cookie). Probed: captured a cookie, hit `/local/sign-out`, replayed the *same* cookie → `/api/projects` 200. | No forced logout / revocation; a stolen token cannot be invalidated except by restarting the server. | Keep a server-side set of valid/ revoked session IDs (or a per-account token version) and reject signed-out / revoked tokens. |
| B-04 | Medium | HTTP hardening | The local app shell and all static responses carry no `Content-Security-Policy`, `X-Frame-Options`, or `X-Content-Type-Options`. Only API JSON and the SDD HTML export set these. | `server.js:25` (static headers = Content-Type, `Cache-Control:no-cache`, ETag only). Probed `/`: response has no CSP/XFO/nosniff. Contrast strong CSP on export (`worker.js:109`) and sign-in page (`server.js:53`). | Clickjacking of the workbench is possible and any SPA XSS has no header-level containment. | Add a baseline CSP, `X-Frame-Options: DENY`/`frame-ancestors 'self'`, and `X-Content-Type-Options: nosniff` to static responses. |
| B-05 | Medium | Brute force | Sign-in has no rate limit, lockout, or backoff. 40 wrong secrets for one account were all processed in ~279 ms and the correct secret still worked immediately after. | `server.js:60-64` (no throttle; 401 on mismatch). Probed: 40×401 in 279 ms, then 303 success. (Comparison itself is constant-time — `timingSafeEqual`, `server.js:50` — good.) | With the 16-char minimum, weak/low-entropy secrets are brute-forceable by a local/network attacker (esp. under `--host 0.0.0.0`). | Add per-account failure throttling / temporary lockout and a small fixed delay on failure. |
| B-06 | Medium | Open redirect | `sameSitePath` accepts a `next` value beginning with `/` + a tab (`/\t/evil.example/…`): it is not `//`- or `/\`-prefixed, so it passes, and the browser normalises the emitted `Location` to a protocol-relative `//evil.example/…`. | `server.js:51` (`sameSitePath`), used at `:59,62,64`. Probed: `Location: /<TAB>/evil.example/phish`; `new URL()` in a browser resolves to `http://evil.example/phish`. | Post-login open redirect / phishing pivot for someone who can seed the `next` field. Local scope. | Reject control characters and any value not matching `^/[^/\\]` after trimming; parse and re-serialise the path. |
| B-07 | Medium | Safe-method contract | `GET /api/project` performs writes: it lazily seeds the seed project and runs `syncRepositoryNotices`, which can `saveStoredProject` (revision bump). | `worker.js:88-91,94`; `knowledge-repository.js:97-118` (`syncRepositoryNotices` → `saveStoredProject`). | A "read" mutates state; combined with B-01 a rebinding GET could trigger writes in default mode. Mitigated in accounts mode by `SameSite` and by throttling/idempotency. | Move notice sync off the GET path (explicit POST) or make it strictly read-and-defer. |
| B-08 | Medium | Test integrity / CI | 12 `*-validate.mjs` suites are **not** wired into `package.json` scripts, so `npm test` and `release-checks.mjs` never run them — and one of them, `knowledge-validate.mjs`, currently **fails** a real assertion in this snapshot. The 11 UI suites also silently no-op without an unpinned `happy-dom`. | `package.json` (no `node knowledge-validate.mjs` etc.); my run: `knowledge-validate.mjs` → `AssertionError: An explicit boundary question can still enter the supported design review` (`knowledge-validate.mjs:41`). `release-checks.mjs:4` filters to `test:`-prefixed scripts only. | A failing behavioural test and 12 suites are excluded from the release gate, weakening the "executable tests + evidence" claim. | Wire every non-browser suite into `package.json`/regression; fix or quarantine the failing assertion; pin `happy-dom` so UI suites actually execute. |
| B-09 | Medium | Dependency / licence | The shipped browser bundle vendors third-party code inline (`public/vendor-docx.js` 804 KB: docx 9.6.1, jszip 3.10.1 (dual MIT/GPLv3), pako, sax, readable-stream, etc.) plus an embedded DejaVu font (`public/review-font.js` 1 MB). `THIRD-PARTY-NOTICES.md` bundles full GPLv2/GPLv3 texts. | `public/vendor-docx.js:1+`; `THIRD-PARTY-NOTICES.md:3,113-146,768-1252` (deps + licences); `public/review-font.js:1`. | Licence-compliance must confirm the MIT election for dual-licensed deps and that redistribution terms are met; vendored copies also carry unpatched-CVE exposure with no update path. | Record the elected licence per dependency, add SPDX + version provenance, and a refresh/patch process for vendored bundles. |
| B-10 | Medium | Runtime parity | The backend relies on `node:sqlite` `DatabaseSync` (`local-db.js:13-19`), an experimental API requiring Node 24 (per `LOCAL-RUN.md`). It ran under the audit's Node 22 but emits `ExperimentalWarning`; behaviour/parity vs hosted D1 is version-sensitive. | `local-db.js:13` (`import {DatabaseSync} from 'node:sqlite'`); `LOCAL-RUN.md` ("Install Node.js 24"). Observed `ExperimentalWarning: SQLite is an experimental feature`. | A Node minor change can alter transaction/`batch` semantics; local↔hosted persistence parity is not pinned or verified. | Pin/verify the Node version, gate on it at startup, and add a local↔D1 parity test for `batch` atomicity. |
| B-11 | Low | Budget / cost control | The reasoning path's daily-token budget check sums only `intelligence_runs`, omitting `brain_retrieval_runs`, whereas the generate path sums both; and the generate path hard-codes a global `<10`/hour owner cap while the reasoning path uses `Math.max(10,policy.hourlyRequests)`. | `intelligence-service.js:64` (generate: both sums, `<10` global) vs `:105` (reason: only `intelligence_runs`, `Math.max(10,…)`). | Token budgets under-count on the reasoning path and the per-project hourly limit is enforced inconsistently → higher-than-intended OpenAI spend. | Use one shared budget helper that always sums both run tables and applies the same caps. |
| B-12 | Low | User enumeration | `secretMatches` returns early for an unknown account id *before* hashing, so an unknown id answers measurably faster than a known id with a wrong secret. | `server.js:50` (`if(typeof want!=='string'…)return false` precedes `timingSafeEqual`). | Timing side channel reveals which account ids exist. Local scope. | Hash a fixed dummy secret for unknown ids so both paths do equal work. |
| B-13 | Low | Transport | The session cookie has `HttpOnly; SameSite=Strict; Path=/` but no `Secure` flag; under `--host 0.0.0.0` over plain HTTP the token travels in clear. | `server.js:64`. | Session token interceptable on a shared network when not on loopback. | Set `Secure` when not bound to loopback (or always, documenting HTTPS termination). |
| B-14 | Low | SSRF residual | Generic connector kinds (`runtime-json`, `openapi-json`, `asyncapi-json`) are only checked for "public HTTPS, no private IP literal, no creds"; unlike GitHub/Jira/Azure they are not host-pinned, so a hostname resolving to an internal address would pass the string check. | `connection-adapters.js:7` (`endpoint`: private-IP/localhost block + per-kind pinning only for github/jira/azure). | DNS-based SSRF for the generic kinds. Strongly mitigated: profiles are server-owned config (`AIW_CONNECTIONS_JSON`), the caller cannot supply URLs, and `redirect:'error'` is set. | Resolve and re-check the target IP at fetch time, or require an explicit host allowlist for generic kinds. |
| B-15 | Low | Secret handling | The OpenAI key and the repository-service bearer token are sent to whatever base URL is configured; only "https, or http on loopback" is enforced — no host allowlist. | `intelligence-provider.js:7-13` (`llmEndpoint`), `knowledge-repository.js:15-22,28`. | A mis-set `AIW_LLM_BASE_URL`/`AIW_KNOWLEDGE_REPOSITORY_URL` to an attacker HTTPS host exfiltrates the credential. Server-config trust boundary. | Warn/allowlist on non-`api.openai.com` bases; document the risk in `.env.example`. |
| B-16 | Low | Error surface | Domain-layer `throw`s are returned verbatim as `{error:e.message}` (400). These are authored validation strings, but a non-validation exception (e.g. a `TypeError`) would leak its message to the client. | `worker.js:147-148` (catch → `json({error:e.message},400)`); same pattern in every service `catch`. | Minor internal-detail disclosure on unexpected errors. | Map unknown/native errors to a generic message; keep authored validation text only for known cases. |
| B-17 | Low | Observability | Security-relevant events (failed sign-ins, role/membership changes) are not logged; only exceptions reach `console.error` (5 sites total) and model actions go to `project_activity`. | `server.js:81`; `object-service.js:7` (activity rows); `grep console.* *.js` → 5 hits. | No trail to detect brute force or authorization abuse. | Emit structured audit logs for auth and access-control events. |
| B-18 | Low | Audit completeness | The `/api/commands` activity row records only `input.command.type` as the title and no per-field actor on change-journal events; `trackModelChange` writes journal events without an actor. | `worker.js:155` (title = command type); `public/model-impact.js:94` (`push({… at …})`, no actor). | Weaker forensic detail on who changed what. | Include the actor and a human summary on activity/journal events. |
| B-19 | Low | Input validation | `queryRequirements` builds a `LIKE` with user `q` (escaped for `\ % _`) and paginates `page` up to 100000; the count+select run unbounded pages against the index. | `requirement-storage.js:36,41-45`. | Escaping is correct (no injection), but very large `page` values still execute two full scans → minor DoS. | Cap `page` to a sane maximum tied to `total`. |
| B-20 | Low | Recovery import trust | `handleRecovery` restore reconstructs a whole project from client JSON; integrity is checked (sha256/`digest`, size caps, 200-file cap) and imported approvals are correctly relabelled as historical, but the importer becomes owner of arbitrary imported content. | `recovery-service.js:31-43` (`previewRecovery`/restore). | Low: bounded and checksum-verified; noted for completeness (imported audit is explicitly non-authoritative). | None required; keep the "historical assertion" labelling. |
| B-21 | Low | Static serving | The static handler reads each file fully into memory with `readFile` (no range/stream) and serves any file under `public/` including the 1.5 MB catalogue and 1 MB font on every cold request. | `server.js:22,25`. | Memory/latency cost per cold asset; not a security issue. Traversal is correctly blocked. | Optional: stream large assets; add long-cache for immutable vendored assets. |

---

## 3. Strengths worth keeping (verified by reading + probing)

- **Path traversal is blocked**: `file.startsWith(root+path.sep)` after `path.resolve` (`server.js:22`).
  Probed `/../server.js`, `/%2e%2e/…`, `/..%2f…`, `/%00` → all 404.
- **Tenant/project isolation**: every query is scoped by `owner_id` and role-gated
  (`worker.js:65`, `collaboration-service.js:11-14`). Probed: a second account gets 404 on
  another's project, empty project list, and 403 on write; a `reviewer` cannot write commands
  or grant itself `owner`.
- **Optimistic concurrency + atomic writes**: `revision`-guarded `UPDATE`, a fresh `index_stamp`
  bound into every dependent statement, one `DB.batch`, and R2/FILES cleanup on a losing save
  (`project-storage.js:123-128`; conflict paths return 409 across services).
- **Constant-time secret comparison** via `timingSafeEqual` on SHA-256 digests (`server.js:50`);
  HMAC-signed, expiring, `HttpOnly`+`SameSite=Strict` session cookie (`server.js:42-49,64`).
- **Strong source-connector SSRF controls**: https-only, no embedded creds, localhost + RFC1918 +
  169.254 + IPv6-literal blocks, host+path pinning for GitHub/Jira/Azure, `redirect:'error'`,
  25 s timeout, 2 MB cap (`connection-adapters.js:7-16`).
- **LLM cannot silently mutate the canonical model**: generation stores a run; adoption is a
  separate explicit human command with `generationCurrent`/`reviewed` gates; `store:false`;
  strict JSON-schema; two-pass grounding with a *deterministic* contract guard as the real
  backstop (`intelligence-provider.js:53-88`, `public/intelligence-context.js:145+`,
  `public/brain-reasoning.js:585-610`).
- **Four-eyes enforced server-side and re-checked on every read**: author ≠ verifier for
  claims, org library, and repository releases (`public/knowledge-governance.js:23,142`,
  `organization-service.js:42,48`, `repository-sync.js:81`). `npm run test:local-accounts`
  exercises it through the running server and passes.
- **Candidate/discovery knowledge never reaches scoring/conformance**: corpus/packets are
  `authority:'discovery-only'`, `productionAccepted:false`, claims stay `eligible:false` until
  reviewed→released→activated; `semanticKnowledge` only feeds `releasedClaims(...).eligible`
  (`brain-retrieval.js:24-26`, `repository-packet.js:20,46,60-62`, `knowledge-governance.js:18-27`).
- **Repository sync trust**: Ed25519 verification with separate notice-key vs release-key roles
  (a notice key can never make a release eligible), 7-day lease bounds, and retained proof
  re-verified on every read — a stored boolean is never the trust boundary
  (`repository-sync.js:26-51,111-129`).
- **Content integrity everywhere**: SHA-256/`digest` verification on every spilled blob
  (baselines, evidence, requirements, knowledge, alternatives, intelligence runs), with a
  mismatch raising an error rather than silent repair (`project-storage.js:11-63`,
  `requirement-storage.js:7`, `recovery-service.js`).
- **Loopback-only repository service** with token + Host allowlist + no-browser-origin
  (`repository-service/server.js:12-22`) — the pattern `server.js` itself should adopt (B-01).

---

## 4. Test results (run in a private copy, not the 4173 instance)

Copy: `scratchpad/v5-agent-backend` (source tree minus `.aiw-local`). Runtime: Node v22.22.2
(note B-10: project targets Node 24).

- `npm run check` → **PASS**. "Syntax checks passed for 347 application, service and verification modules." (~10 s)
- `npm test` (`validate.mjs`) → **PASS**. "PASS: 1536 mobile/desktop layer layouts … " + `{"status":"passed"}`.
- `npm run test:local-accounts` (server-driven four-eyes + session) → **PASS** (sign-in, four eyes, sign-out).
- All non-browser `*-validate.mjs` (88 suites, `OPENAI_API_KEY` unset) → **74 passed, 14 "failed"**:
  - 11 are environmental no-ops, not code defects: missing optional dep `happy-dom` / unset
    `AIW_DOM_MODULE` (the `*-ui-validate.mjs` suites), unset `AIW_WORKBOOK` (`intake-validate.mjs`),
    unset `AIW_PACKET_PATH` (`repository-packet-validate.mjs`).
  - **1 real assertion failure**: `knowledge-validate.mjs:41` (see B-08).
  - These 12 suites are also absent from `package.json` scripts (B-08), so the standard
    `npm test` / `release-checks.mjs` gate never runs them.
- Browser (`*-browser-validate.mjs`, Playwright/Chromium) → **skipped** per instructions.
- Live probing (private ports 5391 default-mode / 5392 accounts-mode) confirmed B-01, B-03,
  B-05, B-06 and the isolation/role strengths; port 4173 and its `.aiw-local` were not touched.

---

## 5. Not verified / open

- **Hosted D1/R2 behaviour**: only the local `node:sqlite` + filesystem adapters were exercised;
  Cloudflare `DB.batch` atomicity, R2 semantics, and migration application order on D1 were not
  run (no hosted environment). Local↔hosted parity is asserted by shared code, not tested here.
- **Real OpenAI provider behaviour**: no `OPENAI_API_KEY` was configured, so timeouts, refusal
  handling, cost, rate-limit (429) mapping and the two-pass grounding were read but not run live;
  prompt-injection resistance rests on the deterministic guard + JSON-schema, reviewed statically.
- **Live repository-service corpus/notice signing**: the service starts on loopback but was not
  driven end-to-end with a signed store; Ed25519 verification and receipt binding were read and
  are exercised by `repository-service-validate.mjs`/`repository-sync-validate.mjs` (which pass),
  not re-driven against a real corpus.
- **Licence compliance conclusion** (B-09) requires legal review of the elected licences for
  the vendored dual-licensed dependencies; only the presence/versions/notice texts were checked.
- **B-06 browser normalisation** was confirmed via Node's URL parser and the emitted `Location`
  header, not against a live browser navigation.
- External human authorities (independent architecture review, four-eyes *people*, KMS,
  production acceptance) are process items outside code and were not assessed;
  `productionAccepted` is correctly `false` throughout the code read.
