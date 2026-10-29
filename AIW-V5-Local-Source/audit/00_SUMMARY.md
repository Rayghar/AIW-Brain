# AIW V5 deep-dive audit: summary

**Code audited:** your V5 app, `AIW-V5-Local-Source` on `release/aiw-v0.10.0-rc.10.73.6-standard-diagrams` (newest release branch, 28 September 2026), in Rayghar/AIW-Brain. The extracted copy was checked byte-for-byte against the branch. It was run exactly as `LOCAL-RUN.md` describes and matched your screenshot.

**Scope:** backend code, frontend code, a UI/UX audit of the running app, and the capabilities in your uploaded archive (rc.10.91.1) that V5 could use. This is analysis only; no V5 code was changed.

**Detail files:**

| File | Contents | Findings |
|---|---|---|
| `01_BACKEND.md` | Server, API router, storage, auth, LLM gateway, knowledge services, tests | 21: 3 High, 7 Medium, 11 Low |
| `02_FRONTEND.md` | Browser modules: architecture, security, performance, CSS, accessibility, tests | 27: 4 High, 17 Medium, 6 Low |
| `03_UI_UX.md` | All 11 chapters × 4 tabs at three widths, with screenshots in `screens/` | 20: 4 High, 11 Medium, 5 Low |
| `04_CAPABILITY_DELTA.md` | 58 archive capabilities compared with V5 | 12 absent, 34 partial, 12 present |

Some issues appear in more than one file (for example the missing Content-Security-Policy, the page weight and colour contrast). The priorities below count each once.

## The short version

V5's governance core is sound, and in several places stronger than the archive. The review agents found no path where Sol's output reaches the model without an explicit human action. Four-eyes review of knowledge claims is enforced on the server and re-checked on every read. Candidate knowledge never reaches scoring, and project and tenant isolation held under probing.

The serious problems are elsewhere. There is a real stored cross-site scripting hole and no Content-Security-Policy to contain it. The local server can be driven by a malicious web page, and one Sol path sends objects you excluded from AI requests. Pages are heavy and slow to render. Three generations of UI run side by side. The design-document approval that matters most still accepts a typed name instead of a second signed-in person.

## Priorities, in order

| # | What to fix | Why it matters | Source IDs | Effort |
|---|---|---|---|---|
| 1 | **Close the stored XSS.** Use one shared escaping helper for every value put into HTML, including ids, refs and status values. Re-run the domain validators on restore/import. Add a Content-Security-Policy and `frame-ancestors 'none'` to the app page. | A crafted project file, once restored, runs script with the full rights of whoever opens it: it can change projects, record reviews and adopt Sol output without that person acting. It was demonstrated in every chapter. Normal editing is safe because the command path validates the same values. | F-01, F-15, F-05, B-04 | M |
| 2 | **Lock the local server to its own address.** Accept only `127.0.0.1` or `localhost` Host headers, as the repository service already does, and fail closed when bound beyond loopback without accounts. | A malicious page can use DNS rebinding to read and change every project and spend the OpenAI key in the default no-sign-in mode. It was demonstrated with a 201 Created. | B-01, B-07, C-31 | S |
| 3 | **Make AI disclosure rules hold on every path.** Apply excluded objects in the desk and chapter reasoning packet, and redact secrets (keys, passwords, connection strings) before any Sol call. | Objects you excluded from AI requests are sent to OpenAI whenever Sol reasons at the desk. Pasted credentials go out unmasked; only emails and phone numbers are masked today. | B-02, C-34 | S |
| 4 | **Require a second signed-in person to approve the design deliverable.** Take review-desk attribution from the signed-in identity, not from a free-text field prefilled by the browser. | The approval that unlocks handoff is a reviewer name typed into a form, which contradicts the product's own "human decision, audited" rule. | C-02, F-19 | M |
| 5 | **Harden sessions.** Revoke sessions on the server at sign-out, throttle failed sign-ins, set `Secure` when not on loopback, and close the post-login redirect gap. | A copied session cookie keeps working for up to 12 hours after sign-out. 40 wrong secrets were tried in 0.3 s with no lockout or delay. | B-03, B-05, B-06, B-13, B-12 | S |
| 6 | **Make writes safe to retry.** Add idempotency keys to `/api/commands`, and run local migrations in a transaction with a checksum manifest. | A lost response today looks like a conflict and re-applying duplicates records. An edited or failed migration can half-apply silently. | C-27, C-29, B-10 | S–M |
| 7 | **Make the release gate real.** Wire the 12 unwired test suites into `npm test` and fix the failing knowledge test. Pin `happy-dom` so the UI suites run. Add CI and a SHA-256 release manifest for V5. | One behavioural test fails today and is never run; 11 UI suites silently do nothing; the release branch has no CI at all. | B-08, F-20, F-26, C-43, C-44 | S–M |
| 8 | **Ship a production build.** Bundle, minify and gzip, split per chapter, and load the 1.5 MB Brain catalogue only where it is used. | Each page loads 142–164 modules (4.1–4.8 MB) and 40 stylesheets uncompressed. Chapter 4 takes 4.4 s to load cold on a 20 Mbps, 40 ms connection and 33 s on a slow mobile connection; gzip alone takes its boot code from 4.61 MB to 1.08 MB. | F-04, F-06, F-16, F-21, UX-09, C-49 | M |
| 9 | **Retire the old UI layers and stop recomputing everything.** Stop drawing the legacy canvas that CSS then hides, and memoise the whole-project analyses. | A Chapter 7 tab switch freezes the page for about half a second on a 5-object model and over a second at 300. On Chapter 4, 1,478 hidden elements are rendered for 244 visible ones. Running old and new paths side by side also breaks the engineering contract. | F-02, F-03, F-09, F-08 | M |
| 10 | **Fix readability.** Darken the muted text colour, give selected toggles light text, and set a 12 px floor for reading text. | Contrast fails on all 44 pages. Selected view toggles are 1.14:1, effectively invisible. One colour-token change clears most failures. | UX-01, UX-02, UX-03, F-17 | S |
| 11 | **Make the review desk usable.** Default to a worst-first list with full-text details, move Key and zoom off the content, and keep toolbar labels at laptop widths. | Chapter 11 is the product's most important screen and the hardest to read. | UX-04, UX-05, UX-06, UX-07 | M |
| 12 | **Make navigation one app.** Serve all chapters from one shell so moving from Chapter 2 to 3 doesn't reload, make Back work, give each view its own title, move focus correctly into and out of the Sol panel, and keep the user's tab across chapters. | Chapters 1, 2, 3 and 4–11 are four separate page apps; Back leaves the workspace; every view has the same title. | F-10, F-13, F-18, UX-08, UX-10, UX-14, UX-20 | M–L |

Effort is a rough guide: S is days, M is one to three weeks, L is longer.

## Capabilities worth taking from the uploaded archive

The archive is a separate TypeScript, Fastify and PostgreSQL implementation of V5. V5 has already imported its candidate knowledge set. Beyond the items above (secret redaction, idempotent commands, release manifest and CI, fail-closed binding, safe migrations, authenticated handoff approval, bundled build), the most useful are:

- standard-notation diagrams inside the SDD, with an artifact hash manifest and then a tagged, accessible PDF;
- a controlled refinement case that records why a design stayed unchanged;
- address and load-failure recovery, and browser storage scoped to the signed-in person;
- then telemetry and health, a "My Work" view, architecture-as-code exports, PDF/DOCX extraction and requirement dispositions.

Do not port the archive's workspace sprawl, its PostgreSQL/pgvector/row-level-security stack, its pull-request writes to external repositories, its unauthenticated `/metrics`, or its warn-only permission gate. V5 is ahead on chapter breadth, standard diagrams, the review desk, claim-level knowledge governance, Sol disclosure and evaluation, portable project recovery, read-only delivery connectors, model exchange formats and operational simplicity; porting must not regress these.

The archive's own checks also fail on the uploaded copy, which may be a partial package: its source-hash check finds 1,015 inventoried files missing and its reachability gate finds 9 unreachable components.

## What was run

| Check | Result |
|---|---|
| `npm run check` | Pass: 347 modules |
| `npm test` | Pass |
| `npm run test:local-accounts` (sign-in and four-eyes through the server) | Pass |
| 88 non-browser validators | 74 pass; 14 fail, of which 1 is a real assertion failure (`knowledge-validate.mjs`), 11 need an unpinned optional DOM library and 2 need input files |
| Frontend unit and browser suites run by the frontend review | 25 unit and 7 browser suites pass |
| UI sweep | 59 pages at 1440, 1100 and 390 px: no console errors, failed requests or horizontal overflow |
| Live probes (private copies, never your data) | Confirmed B-01, B-03, B-05, B-06, F-01 and the isolation strengths |

## Not verified

- The hosted Cloudflare deployment (D1, R2, Worker asset routing); everything ran locally.
- Sol with a real OpenAI key, local accounts in a browser session, and the knowledge repository service end to end.
- Real-network timings other than the throttled runs noted in `02_FRONTEND.md`.
- Output from a real screen reader; checks were automated plus keyboard tracing.
- Licence compliance of the vendored libraries, which needs a legal decision.
- The six issues your data shows (the "RUN-001 review requested" banner and six changes), because your project data is not in the repository.
