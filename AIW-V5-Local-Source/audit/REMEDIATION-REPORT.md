# AIW V5 remediation report

**Baseline:** `release/aiw-v0.10.0-rc.10.73.6-standard-diagrams` at `3ee0854` (AIW v0.10.0-rc.10.73.6), folder `AIW-V5-Local-Source`.
**Branch:** `claude/dazzling-cerf-a3qshh`, not pushed.
**Plan:** `REMEDIATION-PLAN.md` in this folder. Finding IDs (B-, F-, UX-, C-) refer to `01_BACKEND.md`, `02_FRONTEND.md`, `03_UI_UX.md` and `04_CAPABILITY_DELTA.md`.

This report records what was changed, how each change was checked, and what is still open. It approves nothing. `productionAccepted` stays false. The licence election, independent architecture review, four-eyes approvals and production acceptance stay with their human authorities.

## Commits

| Commit | Workstream | Findings |
|---|---|---|
| `1d9d10d` | Audit and plan (baseline checkpoint) | — |
| `3f264e0` | A. Server and HTTP hardening | B-01, B-03, B-04, B-05, B-06, B-07, B-12, B-13, B-17 (sign-in), B-21, F-05, F-21, C-31 |
| `cf85f56` | B. Stored cross-site scripting | F-01, F-15, F-22 (dialog title), B-20 (in part) |
| `5773ee2` | C. AI disclosure and budgets | B-02, B-11, B-15, C-34 |
| `4ee4dca` | D. Governance and durability | C-02, F-19, C-27, C-29, B-10, B-14, B-16, B-17, B-18, B-19 |
| `5a8cc5c` | E. Tests, CI and release evidence | B-08, F-20 (in part), F-26, C-43, C-44, B-09, F-25 (record only) |
| `05638cc` | F. Performance and architecture | F-02, F-03, F-04, F-11, F-12, F-13, F-14, F-16 (in part), F-20, F-22, UX-09, UX-20, F-06 (in part) |
| this commit | G. UI and UX | UX-01 to UX-07, UX-10 to UX-19, F-17, F-18, F-27 |

Each commit message lists its changes and its regression result.

## What was done, by finding

### Security and server (A, B, C)

| Finding | Status | What changed | Checked by |
|---|---|---|---|
| B-01, C-31 | Done | Requests are answered only for IP literals, `localhost` and `AIW_ALLOWED_HOSTS` (421 otherwise). The server refuses to listen beyond loopback without local accounts unless `AIW_ALLOW_OPEN_NETWORK=1`. | `test:server-hardening` |
| B-04, F-05, F-21 | Done | One header module for the local server and the packaged Worker: CSP (`script-src 'self'`), anti-framing, nosniff, referrer and permissions policy. The Worker sends ETags and answers 304; hashed build assets are cached as immutable. | `test:server-hardening`, `test:bundle-browser` (all 44 pages under the CSP) |
| B-03, B-05, B-06, B-12, B-13 | Done | Server-side sessions revoked at sign-out; lockout with doubling back-off; strict same-site redirect check; equal work for unknown accounts; `Secure` cookies behind HTTPS. | `test:server-hardening`, `test:local-accounts` |
| B-07 | Done | Reading a project no longer applies repository notices; the client asks for them by an origin-checked POST first. The first read of the fixed reference example still materialises it, idempotently. | `test:knowledge-repository` |
| B-21 | Done | Text assets are compressed once (brotli, else gzip) and cached. | `test:server-hardening` |
| F-01, F-15 | Done | One escaper (`html-escape.js`) replaces 68 copies; 809 sites that put identifiers, references or enumerated values into HTML are escaped; stored links go through `safeUrl()`. Rendered output for real data was compared before and after on all pages and is unchanged. | `test:xss-browser` (hostile project in every field, 11 chapters × 4 tabs and projects) |
| B-20 | In part (corrected in round 2) | Restore refuses markup in identifiers, references and enumerated values and script-bearing links (`document-safety.js`). It did not re-run every command-path invariant on a restored document; the concrete consequence, found in round 2 (B2-01), was that imported review, baseline and approval authors counted as a second signed-in person for the four-eyes rule. Round 2 clears those authors on restore (`recovery-service.js`, `neutraliseImportedAuthority`); approval evidence and the delivery handoff then need an architect review recorded here and a second signed-in person. | `test:xss-browser`, `test:durability`, `recovery-authority-validate.mjs` (round 2) |
| B-02 | Done | The reasoning packet leaves out every source whose object the owner excluded from AI requests, and records only how many were held back. | `test:sol-disclosure` |
| C-34 | Done | Secrets (keys, tokens, private keys, credential pairs, connection-string passwords) are redacted from every Sol request, at the packet and again at the provider boundary. | `test:sol-disclosure` |
| B-11 | Done | One budget helper for both Sol paths, counting both run tables. | `test:sol-disclosure` |
| B-15 | Done | Start-up says when the model or repository base URL sends credentials to a non-default host. | Manual check of the start-up log |

### Governance and durability (D)

| Finding | Status | What changed | Checked by |
|---|---|---|---|
| C-02, F-19 | Done | Approval evidence for a frozen Chapter 11 baseline must be recorded by a signed-in person other than the one who recorded its architect review; only that unlocks the delivery handoff. Review records carry the signed-in actor; the desk's "asked by" and "set by" show the signed-in account. | `test:review` (two people), `test:desk-browser` |
| C-27 | Done | `Idempotency-Key` on commands; the receipt is written in the same batch as the change (migration 0008); a retry returns the saved outcome; the client retries a lost response once with the same key. | `test:durability`, `test:workspace` |
| C-29, B-10 | Done | Local migrations run in a transaction with a SHA-256 record; an edited applied migration stops start-up. Node older than 22.13 is refused before SQLite loads. | `test:durability` |
| B-14 | Done, with a residual | Generic connector endpoints that resolve to private addresses are refused on the local server. The check resolves and then fetches, so a DNS answer that changes in between is not caught (see "Not verified"). | `test:durability` |
| B-16, B-17, B-18, B-19 | Done; B-16 corrected in round 2 | Programming faults answer with a general message through `publicMessage`; role and membership changes are audit-logged; journal entries carry the actor; requirement pages past the end read as the last page. Round 2 (B2-06) found that the route-level catch still reported every fault, including integrity faults, as a transient storage outage (503) and that `repository-sync.js` returned raw messages: integrity faults now answer 422 with `code: integrity`, programming faults 500 with the general message, and only an unreachable adapter 503; every such fault is one JSON log line. | `test:durability`, `test:requirements`, `service-routes-validate.mjs` (round 2) |

### Tests, CI and evidence (E)

| Finding | Status | What changed |
|---|---|---|
| B-08 | Done | The 12 unwired suites run in the gate; all had drifted from the product and were brought to current behaviour. Each retired expectation is noted in its test. |
| F-26 | Done | `test:browser` uses a free port and a private database; in F it was rewritten for the current shell and joined the gate. |
| C-43 | Done, not run | `.github/workflows/v5-release-checks.yml`: install from the lockfile, syntax, build, full regression, SHA-256 manifest, evidence upload. It has not run on GitHub. |
| C-44 | Done | `scripts/release-manifest.mjs` writes and verifies a SHA-256 manifest of every tracked file (`npm run release:manifest`, `npm run release:verify`). |
| B-09, F-25 | Recorded | `THIRD-PARTY-PROVENANCE.md` records what can and cannot be established about the vendored bundles, with their hashes. Rebuilding `vendor-docx.js` from a pinned lockfile is not done. |

### Performance and architecture (F)

| Finding | Status | What changed | Measured |
|---|---|---|---|
| F-04, UX-09 | Done | `client-bundle.mjs` (esbuild 0.28.2, exact-pinned) bundles, minifies and splits the client into content-hashed chunks; `npm run start:production` builds and serves it. | Chapter 4 Model page: 211 requests / 1,616 KB → 72 / 1,251 KB. Projects page: 115 / 698 KB → 25 / 499 KB. Loopback, compressed, one run each. |
| F-16 | In part | The 40 stylesheets become one minified file in cascade order. The token layer and the `!important` count were not reworked. | — |
| F-02, F-22 | Done | `app.js` is the Chapter 4–11 shell only (70 KB → 34 KB). The SVG canvas that every Model render drew and CSS hid, and the studio-less prototype with its hard-coded findings, are gone, with `canvas-authoring.js`, the studios' hidden canvas controls and the ribbon and lens code. The footer and About dialog describe the product as it is; the footer names the configured language model or says none is connected. | Chapter 4 Model page: 2,336 → 499 elements; hidden legacy elements about 1,840 → 0 on every Model tab. |
| F-03 | Done for the shell | Milestones are computed once per render instead of about 22 times. Per-document memoisation inside the domain modules was not added. | Work → Model switch: Chapter 7 919 ms → 325 ms, other chapters 241–325 ms (loopback, first switch). |
| F-11 | Done | Chapters 4–11 show a loading state, load the studios in parallel, and on failure name the cause and focus a retry. | `test:browser` |
| F-12 | Done | Requests time out after 45 s (a save is retried once with its key); page errors, going offline and coming back are announced. The many empty `catch` blocks were not revisited. | `test:browser` |
| F-13, UX-20 | Done | Chapter and tab changes are history entries in every chapter, Back works, and choosing a chapter keeps the tab. | `test:browser` |
| F-14 | Done for one browser | Tabs of the same browser announce a newer save and offer to load it. Saves by other people are still caught by the server's revision check. | `test:browser` |
| F-20 | Done | `npm test` checks the reference model and the shell's own rules instead of the retired prototype. | `npm test` |
| F-06 | In part | `entry.js` no longer loads the Brain catalogue on entry; domain modules still reach it synchronously (see follow-up). | — |

### UI and UX (G)

Automated accessibility (axe-core 4.x, WCAG 2.1 A/AA and 2.2 AA rules plus best practice, all 11 chapters × 4 tabs at 1440 px, reference project; the final sweep ran on the committed code and found no violations on any of the 44 pages):

| Rule | Before G | After G |
|---|---|---|
| color-contrast (serious) | 1,041 nodes on 44 pages | 0 |
| nested-interactive (serious) | 25 nodes on 3 pages | 0 |
| target-size (serious) | 11 nodes on 2 pages | 0 |
| heading-order (best practice) | 11 pages | 0 |
| landmark-unique (best practice) | 1 page | 0 |

| Finding | Status | What changed |
|---|---|---|
| UX-01 | Done | Selected view toggles and primary buttons keep their white label (a more specific rule had made it inherit dark green: 1.14:1 → 9.5:1). |
| UX-02, F-17 | Done | The muted greys (seven values, 2.7–4.4:1) become one colour at 4.8:1 or better on every light surface; diagram subtitles 3.0:1 → 5.5:1. |
| UX-03 | In part | A 12 px floor for 205 text declarations in the shell, panels, Validate, Sol, projects and the model chrome. Labels inside fixed-size diagram boxes keep their sizes (see follow-up). |
| UX-04 | In part | The review desk lists parts worst first by default (with a design-order switch) and opens at a size where its targets are at least 24 px, scrolling instead of shrinking. One vital per column with a full-text popover was not built. |
| UX-05 | Done | Key and zoom sit in the footer in every chapter, never over the model. |
| UX-06 | Done | At laptop widths the view switch and the diagram menu keep their labels down to 1000 px; the secondary actions shorten to icons with their names kept for assistive technology. No "More" menu was added. |
| UX-07 | Done | Diagram headers show only fields that have a value, on the page and in the SVG export. An empty "Journey" picker in diagram views is hidden too. |
| UX-10 | Done | Sol and Mind Factory take focus on open, keep it across redraws and give it back to the opener on close. |
| UX-11 | Checked, no change | With Sol open at 1440 px the main area ends at 1,042 px and the panel starts at 1,054 px; the details column gives way to Sol. Below 1100 px Sol overlays by design. |
| F-18 | Done | Below 1200 px the companion drawer is announced as a dialog, takes focus, closes on Escape and returns focus to its toggle. |
| UX-12 | Done | "Cursor" is "Hover explanations" with On/Off in its label and a confirmation when toggled, in every chapter and the explorer. |
| UX-13 | In part | One name ("Model layers") for the sidebar setting in every chapter; a glossary in the About dialog. Inline definitions at first use were not added, and the coined names themselves are a product decision. |
| UX-14 | Done | Each view has its own title, for example "Ch 4 Model · Bank Payment Journey · AIW V5". |
| UX-15 | Done | Model titles are level-2 headings and companion sections level 3; cards that hold their own buttons are labelled groups, so their buttons reach assistive technology; repeated finding landmarks became labelled groups. |
| UX-16, UX-17 | Done | Accessible names start with the visible text ("Changes · …", the project name); the project card lost its misleading dropdown chevron. |
| UX-18 | Done | The projects page uses the workspace's stacked-layers mark; its secondary actions are the size of the primary one. |
| UX-19 | Done | With no change yet, the Changes dialog is as tall as its message and has no review footer. |
| F-27 | Done | With a reduced-motion preference nothing animates, transitions or scrolls smoothly. |
| UX-08 | Mitigated | Chapters 1–3 and 4–11 are still separate pages; with the production bundle the second page loads from the browser cache. One shell is follow-up work. |

## Found and fixed during the work (not in the audit)

1. Five chapter milestones could not be completed: the Chapter 5 outcome trace, Chapter 6 failure scopes, Chapter 8 contract checks, Chapter 9 threat simulations and Chapter 10 failure scenarios were recorded only from a panel hidden on the Model tab. The panel is now visible below the chapter model (F).
2. A model change previewed in Chapters 1–3, 9 or 10 had no visible "Review proposal" banner (a helper those views call was never defined). It shows now (F).
3. An unfinished exchange or protection design could not be continued after Sol moved to the side panel (E).
4. Three latent TypeErrors (a `const` reassigned) in the story, trade-off and utility views, found by the bundler (F).
5. The mobile "Return to model" button did nothing on Work, Validate and Output (F).
6. The selection toast showed escaped text such as `&amp;` (F).
7. The Chapter 5 model's capability strip overflowed its card with wider platform fonts; this was `test:realise-browser`, which failed on the baseline and now passes (G).

## Tests retired or rewritten

- `npm test` (`validate.mjs`): the checks of the studio-less prototype (its surfaces, hard-coded findings, progress, 1,536 canvas-layout combinations, search) were retired with it. Reference-model integrity and the Chapter 5 trace guards remain.
- Seven domain suites (logical, realisation, technology, technology-realisation, interfaces, security, runtime): the canvas-layout bounds and overlap checks were retired; their domain and API checks are unchanged.
- `review-validate.mjs`: the check of the canvas empty state was retired.
- `browser-validate.mjs` (`test:browser`): rewritten for the current shell. It checks the Model tab (no hidden canvas), the Chapter 5 trace and Chapter 6 lab, Back and tab-keeping, the cross-tab notice, the boot failure cause, the footer and About, and widths from 1280 to 390 px.
- `brain-ui-validate.mjs`: the companion mode (`test:brain-companion`, Chapters 4, 8 and 11) no longer expects native chapter actions on the Model tab, where the chapter model carries its own, and no longer clicks the retired canvas.
- `model-alternatives-ui` waits for the proposal banner, which the chapter model now draws.
- Workstream E's retired expectations are listed in its commit and noted in each test.

## Not verified

- The GitHub Actions workflow has not run on GitHub.
- The packaged Worker has not been run against a real D1 and R2 deployment; the bundle was served by the local server in tests.
- Only Chromium was used. Firefox and Safari are untested; no screen reader was used. Accessibility figures are automated checks only.
- Timings are single loopback measurements in this container, not real networks or low-end devices.
- The connector check in B-14 resolves and then fetches, so a DNS answer that changes between the two is not caught.
- In workstream F's full run, `test:responsibility-browser` failed once under load and then passed on four reruns, alone and beside other browser suites.

## Decisions that belong to people

| Question | Owner | Status |
|---|---|---|
| JSZip licence election (MIT or GPL-3.0-or-later) and the other bundled packages' terms | Licence counsel | Pending |
| Whether the DejaVu font terms cover embedding in generated PDFs | Licence counsel | Pending |
| The licence of the `AKR-0.10.73.5` catalogue content | Content owner | Pending |
| Chapter 11 approvals recorded by the same person as the architect review no longer unlock the handoff; they must be recorded again by a second person | Project owners | Pending |
| Independent architecture review and production acceptance | Their authorities | Not claimed |

## Follow-up work

- **F-06:** `knowledge-governance.js` looks up catalogue records synchronously for 17 modules, so the 1.5 MB catalogue still loads with the domain modules. Making that lookup lazy is a multi-module change.
- **F-07, F-08, F-09, F-10, F-23, UX-08:** one shell for all chapters, a state store in place of the `window.aiw*` globals, rendering without post-render DOM patching, and formatted source. This pass reduced them (app.js halved, dead canvas code and bridges removed) but did not rewrite them.
- **F-24:** a CI check for unused exports. Only the exports made dead by this work were removed.
- **F-16:** a real token layer and fewer `!important` rules; dead CSS left from the retired ribbon, lens, drawer and canvas.
- **F-25:** rebuild `vendor-docx.js` from a pinned lockfile with a recorded command.
- **UX-03:** text inside fixed-size diagram boxes (notation nodes, desk cells, map cards) is below 12 px; raising it needs larger boxes in each chapter model's layout code.
- **UX-04, UX-06, UX-13:** the desk's one-vital popover, a toolbar "More" menu, inline definitions.
- `npm audit` reports four moderate advisories in esbuild 0.24.2 or older, reached only through drizzle-kit (development tooling). The client bundler uses esbuild 0.28.2.

## Not built

These archive capabilities are features rather than fixes and were not built: standard-notation diagrams inside the SDD with an artifact hash manifest, the tagged accessible PDF, the controlled refinement case, telemetry and health, "My Work", architecture-as-code exports, PDF/DOCX extraction and requirement dispositions (`04_CAPABILITY_DELTA.md`).

## Regression

Full run on this commit's code: 113 of 114 suites passed. The one failure, `test:model-views-browser`, asserted the old toolbar behaviour that UX-06 changes (view labels folding to icons at 1100 px); its expectation now checks that the view labels stay and the secondary actions fold, and it passes. `test:realise-browser`, which failed on the baseline, passes. The accessibility sweeps above ran after that fix.

`node release-checks.mjs` runs every `test` and `test:*` script. `npm run release:manifest -- --out manifest.json` records the SHA-256 of every tracked file for a delivered copy.
