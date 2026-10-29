# AIW V5 remediation plan

**Baseline:** `release/aiw-v0.10.0-rc.10.73.6-standard-diagrams` at `3ee0854`, folder `AIW-V5-Local-Source`.
**Working branch:** `claude/dazzling-cerf-a3qshh`.
**Inputs:** the audit in this folder (`00_SUMMARY.md` to `04_CAPABILITY_DELTA.md`). Finding IDs below (B-, F-, UX-, C-) refer to those files. The screenshots and sweep data were delivered separately and are not kept in the repository.

The work runs in workstreams, in priority order. Each workstream ends with its own commit, and the full regression runs before each one. The final report (`REMEDIATION-REPORT.md`) records what was done and verified, and what was left open and why.

## A. Server and HTTP hardening (priorities 2 and 5)

| Findings | Change |
|---|---|
| B-01, C-31 | Serve only requests whose `Host` is an IP literal, `localhost` or a name in `AIW_ALLOWED_HOSTS` (421 otherwise). Refuse to listen beyond loopback without local accounts unless `AIW_ALLOW_OPEN_NETWORK=1`. |
| B-04, F-05, F-21 | One shared header module (`security-headers.js`) for the local server and the packaged Worker: a strict Content-Security-Policy (`script-src 'self'`), anti-framing, nosniff, referrer and permissions policy. ETags in the packaged Worker too. |
| B-03, B-05, B-06, B-12, B-13, B-17 (sign-in) | Server-side session store revoked at sign-out; throttling with a doubling lock; a strict same-site redirect check; equal work for unknown accounts; `Secure` cookies behind HTTPS; JSON audit lines for sign-in events. |
| B-07 | Reading a project never writes: signed repository notices move to an explicit, origin-checked POST that the workbench sends before it reads. The one remaining write on read is the idempotent first materialisation of the fixed reference example. |
| B-21 | Static text assets are compressed once (brotli or gzip) and cached in memory. |

## B. Stored cross-site scripting (priority 1)

| Findings | Change |
|---|---|
| F-01 | Restore and import validate the incoming document: identifiers, references and enumerated values must be plain tokens, as the command path already requires. Fix every sink the audit names, including the URL-scheme sink in the stack view. |
| F-15 | One shared escaping module replaces the per-file copies; identifiers, references and enumerated values are escaped where they enter HTML. |
| F-22 | Escape the latent dialog title in `app.js`. |
| Test | A hostile-restore regression suite: markup in identifiers and enumerated values is refused on restore, and a crafted project cannot run script in any chapter. |

## C. AI disclosure and budgets (priority 3)

| Findings | Change |
|---|---|
| B-02 | The desk and chapter reasoning packet honours `excludedObjectIds` for every context source, as the generate path already does. |
| C-34 | Redact secrets (API keys, tokens, passwords, private keys, connection strings) from every Sol request, alongside the existing contact masking. |
| B-11 | One budget helper for both paths: both run tables are summed and the same caps apply. |
| B-15 | Warn at startup when the model or repository base URL is not the default host, since the credential is sent there. |

## D. Governance and durability (priorities 4 and 6)

| Findings | Change |
|---|---|
| C-02, F-19 | The design-deliverable approval and the review desk take the person from the signed-in identity, and the approver must be a different signed-in person from the author of the reviewed baseline. Free-text reviewer names become display notes only. |
| C-27 | `Idempotency-Key` on `/api/commands`: a receipt is stored in the same transaction as the change, and a retried request returns the original outcome rather than a conflict. |
| C-29, B-10 | Local migrations run in a transaction with a checksum manifest, and an edited applied migration stops start-up. Start-up checks the Node version. |
| B-16 | Unexpected errors return a generic message; authored validation messages are kept. |
| B-17, B-18 | Audit lines for access-control changes; activity and change-journal entries carry the actor. |
| B-19 | Requirement pages are capped by the real page count. |
| B-14 | Generic connector endpoints are resolved and re-checked against private address ranges at fetch time. |

## E. Tests, CI and release evidence (priority 7)

| Findings | Change |
|---|---|
| B-08 | Wire the 12 unwired suites into `package.json`; fix the failing `knowledge-validate.mjs` assertion at its cause. |
| F-20, F-26 | Pin `happy-dom` as a development dependency so the UI suites run. `test:browser` uses a free port and a private database. Add escaping tests. |
| C-43, C-44 | A GitHub Actions workflow for V5 (install, syntax check, the regression, browser suites) and a SHA-256 release manifest generator. |
| B-09, F-25 | Record provenance (package, version, licence as declared) for the vendored bundles. The licence election itself is a legal decision and is recorded as pending, not made. |

## F. Performance and architecture (priorities 8, 9 and 12)

| Findings | Change |
|---|---|
| F-04, F-16, UX-09 | A production build that bundles, minifies and splits the modules, and combines the stylesheets. |
| F-06 | The 1.5 MB Brain catalogue loads only where it is used. |
| F-02, F-22 | Stop drawing the legacy canvas that CSS hides; remove the unreachable prototype path. |
| F-03 | Memoise whole-project analyses per project revision. |
| F-11, F-12 | Parallel chapter boot with a visible loading state and a surfaced cause on failure; global error reporting, fetch time-outs and offline notice. |
| F-13, UX-20 | Chapter and tab changes create history entries and Back works; the chosen tab is kept across chapters. |
| F-14 | Tell the person when another tab or person has saved, before their next save conflicts. |
| F-07, F-08, F-09, F-10, F-23, F-24 | Reduce where it is safe within this pass; the full single-shell rewrite is recorded as follow-up work with its reasons. |

## G. UI and UX (priorities 10, 11 and 12)

| Findings | Change |
|---|---|
| UX-01, UX-02, UX-03, F-17 | Darker muted token, light text on selected toggles, a 12 px floor for reading text. |
| UX-04, UX-05, UX-06, UX-07 | Review desk: worst-first list by default, full-text details, larger targets; Key and zoom in the footer on every chapter; toolbar labels at laptop widths; no empty header fields. |
| UX-08, UX-10, UX-11, F-18 | Focus moves into Sol and Mind Factory and back to the opener; the narrow-width companion drawer behaves as a dialog. |
| UX-12, UX-13, UX-16, UX-17, UX-18, UX-19 | Clear names ("Hover explanations"), one name per concept with a glossary, accessible names that start with the visible text, an honest project switcher control, one logo, a right-sized empty Changes dialog. |
| UX-14, UX-15 | A title per chapter and tab; heading order and nested controls fixed. |
| F-27 | Honour reduced motion everywhere. |

## Not in this pass

These archive capabilities are features rather than fixes. They are listed in `04_CAPABILITY_DELTA.md` and in the final report, and are not built here: standard-notation diagrams inside the SDD with an artifact hash manifest, the tagged accessible PDF, the controlled refinement case, telemetry and health, "My Work", architecture-as-code exports, PDF/DOCX extraction and requirement dispositions.

Nothing in this plan approves architecture, waives policy, promotes knowledge or claims production acceptance. `productionAccepted` stays false, and the licence election, independent review and production acceptance remain with their human authorities.
