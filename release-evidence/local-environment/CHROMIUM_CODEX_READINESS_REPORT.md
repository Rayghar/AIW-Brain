# Windows Playwright Chromium readiness report

Generated: 2026-07-15T01:56:36+01:00  
Repository baseline: AIW v0.10.0-rc.10.73.6  
Branch: `codex/rc-10-73-7-live-acquisition`  
Assessment: **Ready for local Windows Playwright Chromium use**

This assessment is limited to Playwright discovery and focused Chromium smoke coverage. Chromium actually launched in both headless and headed modes. No production-acceptance claim is made.

## Outcome

Playwright 1.61.1 launched its managed Chromium 149.0.7827.55 from the Playwright-managed browser cache. No Google Chrome installation or user-specific executable path was required. Both smoke runs loaded `http://127.0.0.1:4173/`, received HTTP 200, and reported the page title `Architecture Intelligence Workbench` with no browser console errors and no failed network requests.

The primary configuration continues to retain traces on failure and screenshots only on failure. The focused readiness test additionally retained a screenshot and trace for each successful verification run. Desktop and laptop projects remain configured.

## Findings and repairs

| Area | Finding | Repair |
|---|---|---|
| Chromium executable | `playwright.config.ts` and `playwright.audit.config.ts` defaulted to `/usr/bin/chromium`. | Added one shared resolver. When `AIW_CHROMIUM_PATH` is unset or blank, `launchOptions.executablePath` is omitted and Playwright selects its managed Chromium. |
| Explicit override | `AIW_CHROMIUM_PATH` was accepted without validation. | Explicit values are resolved and checked as executable files before Playwright starts. An invalid-path probe exited 1 before browser launch with the expected validation message. |
| Browser helpers | `capture-baseline.mjs` and both Python performance helpers carried Linux Chromium defaults; the capture output was also rooted at `/mnt/data`. | Helpers now default to their Playwright-managed Chromium, validate explicit overrides, use repository-relative evidence paths, and handle Windows process names/termination. The backend performance helper now starts the actual frontend workspace. |
| Web server command | Both TypeScript configs used Unix-only `cd ... && env -u ... VAR=value npm ...`. | Replaced with portable Node entry points that sanitize database variables and start the compiled API and Vite preview as single processes. |
| URL and ports | Vite proxied to `localhost:4100`, which can resolve to IPv6 on Windows while the API listens on IPv4. The main config had no frontend server or `baseURL` although tests use `page.goto('/')`. | API and preview bind to `127.0.0.1` on ports 4100 and 4173. The proxy uses `127.0.0.1`; `baseURL` is set; both servers have health/startup checks; CI does not reuse pre-existing servers. |
| Package scripts | Two Playwright scripts used POSIX inline environment assignment. | Added a Node Playwright CLI wrapper that sets the environment cross-platform and forwards the locked local CLI exit code. |
| Evidence path | `rc10-51-visual-evidence.spec.ts` created `/mnt/data/...` during module load, causing Windows discovery to fail with `EPERM`. | Moved the screenshots to a repository-relative release-evidence directory. |
| Browser telemetry | Collection was scattered across existing tests/helpers. | The readiness smoke records console errors, page errors, failed requests, browser version, executable source, URL, title, status, screenshot, and trace. |
| Projects | The main config already had desktop and laptop projects; the audit config had desktop only. | Preserved both main projects and added the laptop project to the audit config. |

No active Playwright configuration or helper now contains `/usr/bin/chromium`, `env -u`, or `/mnt/data`. No Windows username or cache location is hardcoded in source. `devices['Desktop Chrome']` remains an emulation descriptor; there is no `channel: 'chrome'` or other Google Chrome installation assumption.

## Required command results

PowerShell execution policy blocks the `npx.ps1` shim on this host, so the successful Windows invocations used the equivalent `npx.cmd` shim. npm was forced offline during Playwright commands.

| Command | Result |
|---|---|
| `npx playwright --version` | `Version 1.61.1` via `npx.cmd`; exit 0. |
| `npx playwright install --list` | Playwright 1.61.1; installed bundles: Chromium 1228, Chromium headless shell 1228, FFmpeg 1011, WinLDD 1007; exit 0. |
| `npx playwright test --list` | 208 tests in 35 files across `chromium-desktop` and `chromium-laptop`; exit 0. |
| Headless smoke | 1 passed; direct config-owned API and preview servers; exit 0. |
| Headed smoke | 1 passed; visible managed Chromium; exit 0. |

The first discovery attempt exposed the `/mnt/data` import-time failure described above. Discovery was rerun after repair and passed. Chromium installation listing contains a stale Playwright `References` entry from a prior local checkout; active configuration does not use it, and the managed executable in the current cache launched successfully.

## Runtime evidence

| Field | Headless | Headed |
|---|---|---|
| Result | Passed | Passed |
| Chromium version | 149.0.7827.55 | 149.0.7827.55 |
| Executable | `%USERPROFILE%\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe` | Same |
| Executable source | Playwright-managed Chromium | Playwright-managed Chromium |
| Project | `chromium-desktop` | `chromium-desktop` |
| Test URL | `http://127.0.0.1:4173/` | `http://127.0.0.1:4173/` |
| HTTP status | 200 | 200 |
| Page title | Architecture Intelligence Workbench | Architecture Intelligence Workbench |
| Console errors | 0 | 0 |
| Failed requests | 0 | 0 |

Evidence files:

- Headless: [`evidence.json`](chromium-readiness/headless/evidence.json), [`chromium-readiness.png`](chromium-readiness/headless/chromium-readiness.png), [`trace.zip`](chromium-readiness/headless/trace.zip)
- Headed: [`evidence.json`](chromium-readiness/headed/evidence.json), [`chromium-readiness.png`](chromium-readiness/headed/chromium-readiness.png), [`trace.zip`](chromium-readiness/headed/trace.zip)

Artifact SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| Headless screenshot | `7fb56ee57f3e9ee2a6f197d9d8339563f1f1a1f61b8dae92d927875be68bf820` |
| Headless trace | `d76e4a14f941e6c52146e0831254cefc23d3428dcd18f275fce92cc4b5c21b5f` |
| Headed screenshot | `6bb65c2d5c2d4010831548e9f8dcc39d8c31e1375704cba37e0d3e6e34e5e1a1` |
| Headed trace | `0fb77f9b6e281124cfb6ef67084760e618e6f34704310eb1d1264118419fc52b` |

## Environment note

Inside the restricted Codex process sandbox, Playwright's Windows teardown command (`taskkill /T /F`) cannot terminate config-owned web-server processes, so two in-sandbox attempts completed the browser test but waited until the outer command timeout during teardown. A scoped run outside that process restriction used the same config, allowed Playwright to own and terminate both servers, passed the headless smoke, and exited 0. The headed smoke used explicitly tracked local server process IDs and stopped only those processes after the test. This is a Codex runner restriction, not a Chromium, application startup, or ordinary Windows developer-environment failure.

## Scope limits

- The complete 208-test browser suite was listed, not executed.
- Only the focused readiness smoke was executed in headless and headed modes.
- No application functionality, security control, or governance behavior was weakened for the smoke.
- No secrets were recorded, and the Windows home directory is represented as `%USERPROFILE%`.
