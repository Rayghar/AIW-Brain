# The AIW knowledge repository

**Status:** v20 · 26 September 2026 · controlling baseline AIW v0.10.0-rc.10.73.6. This describes what is implemented and tested. It also marks what only people can decide.

The knowledge repository is the acquired architecture corpus, made usable by the Brain. It runs on the laptop that holds the corpus, as a separate service beside the workbench. It holds the 47 pinned GitHub snapshots from the governed acquisition: 186,219 file entries, of which 18,961 are documentation files. The architect searches it in Mind Factory, reads verified passages, and retrieves an exact original into the project. From there the ordinary governed path applies: interpretation, review, release, signed receipt, activation and a link to the record. Only then does Sol read it.

Nothing in the repository is evidence until that path is complete. A passage is unreviewed repository text. A licence is detected, not cleared. A concept cue says that a name occurs, not that a pattern applies.

## What it holds

| | Count |
|---|---|
| Repositories (connectors) | 47: 30 approved, 9 candidate, 8 discovery-only |
| File entries in the pinned snapshots | 186,219 |
| Documentation files (Markdown, AsciiDoc, reStructuredText, text), every byte verified | 18,961 |
| Files whose text is indexed | 8,432 |
| Passages | 45,517 |
| Files that can become project sources | 7,753 |
| Catalogue concepts cued in passages | 191 |

The other documentation files are not text-indexed for a stated reason:
- Their licence dossier permits metadata only (10 repositories, among them developer-roadmap with 10,192 files).
- Or they are too large for a project source (over 60,000 bytes).
- Or their path is not one the project source contract accepts.

Candidate and discovery-only repositories can be searched but not retrieved until they are approved and registered.

## How the parts fit

| Part | Where | What it does |
|---|---|---|
| Corpus reader | `repository-service/manifest-stream.js`, `corpus.js` | Streams the acquisition manifests (up to 409 MB each) and resolves the pinned snapshot per connector. Reads accepted bytes from the content-addressed store and checks each against the manifest hash on every read. Never opens quarantined, rejected, excluded or opaque files. |
| Store | `repository-service/store.js`, `build.js` | Holds revision and passage identities (contract v1), line ranges and hashes. Search uses a contentless FTS5 index, so there is no second copy of third-party text. The store identity is created once. Every build re-verifies all current revisions. After the baseline, changes become notices. |
| Passages | `repository-service/passages.js` | Deterministic segmentation by headings and paragraphs, at most 60 lines. An excerpt is the exact lines joined with LF, with CR and BOM kept, as the Site slices a stored source. |
| Search and reading | `repository-service/reader.js` | Ranked search, two passages per file at most. Also passage and revision detail, exact originals and concept listings. Every excerpt shown is read from the verified original at request time. |
| Service | `repository-service/server.js` | HTTP on loopback only, with a bearer token and a Host check. Requests from a browser Origin are refused; only the AIW server calls it. |
| Signed notices | `repository-service/sync.js` | Revision and invalidation notices, signed with the laptop's notice key (Ed25519). A notice key can never sign a release. |
| Live refresh | `repository-service/acquire.js`, `refresh.ps1` | Fetches newer documentation from approved repositories at an immutable commit. Downloads are checked against the git tree, credential-shaped files are quarantined, and the original acquisition root is never written. A rebuild then turns the change into notices. |
| Workbench | `knowledge-repository.js`, `knowledge-service.js`, `public/repository-corpus-ui.js` | Discovery routes, exact-original retrieval through `knowledge.fetch`, and automatic application of signed notices. Also the Knowledge repository surface in Mind Factory → Sources and repository leads beside what Sol will read. |

## Authority, and what stays with people

- **One path into the project.** A retrieved original has the same origin (`repository-fetch`) and the same identity (repository, commit, path, SHA-256) as a live GitHub read. The workbench re-derives the revision identity and re-hashes the text itself; it does not trust the service's word. Every existing rule applies unchanged: interpretation, independent review, a release, a current signed receipt, activation.
- **Leads are not evidence.** Sol is shown what it will read before anything is sent. Beside that, the workbench lists repository passages that mention what the decisions touch. Sol does not receive them and cannot cite them.
- **Purpose-bound keys.** `AIW_REPOSITORY_NOTICE_KEYS` holds keys that may sign notices only. `AIW_REPOSITORY_SYNC_KEYS` holds keys trusted for release receipts. The service's automated key belongs in the first. Keep the release signing key separate and offline.
- **Licences.** The repository records what the GitHub API detected and what the acquisition dossier says. Neither is clearance: a reviewer checks permitted use in the claim review.
- **Independent review.** Repository claims need a reviewer who is a different authenticated person from the author. The local server has one identity, so a repository claim cannot complete its review locally. Complete it on the hosted workbench, or with a second authenticated identity.

## Run it on the laptop

From `AIW-V5-Local-Source`:

```sh
npm run repository:init    # once: service token and notice key under %LOCALAPPDATA%\AIW\repository-service
npm run repository:build   # index or re-verify the corpus (about a minute)
npm run repository:serve   # the service on http://127.0.0.1:4180; keep it running
```

`init` prints the settings for the workbench. Put them in the workbench's `.env`, never in Git:

```sh
AIW_KNOWLEDGE_REPOSITORY_URL=http://127.0.0.1:4180
AIW_KNOWLEDGE_REPOSITORY_TOKEN_FILE=C:\Users\<you>\AppData\Local\AIW\repository-service\service-token
AIW_REPOSITORY_NOTICE_KEYS={"repo-…":"<public key>"}
```

Then start the workbench with `node --env-file=.env server.js`. Mind Factory → Sources shows the Knowledge repository. A project with repository originals applies signed notices when it is opened, and on demand from Sources.

### Refresh

- `npm run repository:build` re-verifies every current revision against its manifest.
- `node repository-service/cli.mjs acquire --dry-run` shows what a live refresh would fetch from GitHub.
- `node repository-service/cli.mjs acquire` fetches it. This contacts api.github.com and raw.githubusercontent.com. Set `AIW_GITHUB_TOKEN` in the environment for a higher API rate limit.
- A build after an acquisition turns the changes into notices.
- `refresh.ps1 [-Acquire]` wraps both with a lock and logs to `knowledge-repository/store/logs`.
- `register-refresh-task.ps1` registers a daily Windows task. Nothing registers it automatically.

A repository whose tree GitHub truncates fails closed, and so does a refresh with more changed files than the connector's limit (`--max` raises it deliberately). Such a repository needs the governed acquisition process.

### Other commands

| Command | Use |
|---|---|
| `node repository-service/cli.mjs status` | Store identity, notice cursor, counts, connectors with lifecycle, use policy and detected licence. |
| `node repository-service/cli.mjs search "circuit breaker"` | Search from the terminal. |
| `node repository-service/cli.mjs withdraw <revisionId> --reason "…"` | Operator withdrawal, for example after a licence decision. It becomes a signed invalidation for every project that holds the file. |
| `node repository-service/cli.mjs packet --tenant … --project … --revision … --output packet.json` | A metadata-only candidate packet for the hosted workbench's packet preview. |
| `node scripts/sign-repository-sync.mjs …` | The operator's signing of an independently reviewed release (unchanged). Use the store identity from `status`. |

## Verified, and not yet verified

- **Verified:**
  - `npm run test:repository-service`: 12 checks on a synthetic corpus of original text. They cover identity parity with the workbench, the streaming reader at hostile chunk boundaries, segmentation, and policy gating (quarantined and metadata-only text never searchable). They also cover search injection safety, exact originals with BOM and CRLF, resumable builds, and store identity. Finally: the HTTP boundary, retrieval, the workbench's own packet validator, refresh notices, and signed notices that a notice key cannot use for a release.
  - `npm run test:knowledge-repository`: 4 checks through the real Worker, SQLite and commands. They cover discovery routes, retrieval and interpretation on the same line range, automatic revocation on project read, the explicit sync route, and the Sources rendering.
  - `npm run test:repository-acquire`: 5 checks against a loopback fake of GitHub. They cover planning, reuse by git blob hash, blob-verified downloads, credential quarantine, fail-closed truncation, redirects and tampering, notices after the refresh, and an untouched original root.
  - `npm run test:knowledge-repository-browser`: rendered checks in Chromium. They cover search, read, retrieve, interpret; the desk switch point opened in Mind Factory; leads beside Sol; phone width.
  - The real corpus was built, re-verified and searched on this laptop: 18,961 documentation revisions with zero unavailable, build receipts in `knowledge-repository/store/build-receipts`.
- **Not yet verified:**
  - No live GitHub acquisition was run for this delivery; the adapter is verified against the loopback fake.
  - No project claim from the corpus has been independently reviewed, released under a real signing key or activated.
  - The hosted workbench cannot reach the laptop. It keeps the packet preview and signed-update upload, and retrieves live from GitHub.
