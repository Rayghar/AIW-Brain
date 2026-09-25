# AIW Brain and Knowledge Repository — implementation plan

Controlling baseline: **AIW v0.10.0-rc.10.73.6**. Branch: `release/aiw-v0.10.0-rc.10.73.6-brain-knowledge-repository`.
Product source: `AIW-V5-Local-Source` v19 (supplied archive SHA-256 `1f4876421119fd15c464049a55e5356f03cc2aeec7ed5e3d31784c1c11c79ff1`), imported byte-for-byte at checkpoint `847cd33`.

## Why

v19's own registers state the gap: *"The full knowledge repository is not yet connected."* The Site keeps governed knowledge inside each project (100 source revisions, 250 claims, 8 MB) and could never reach the laptop's acquired corpus. The earlier laptop work stopped at a 24-file pilot with an unsigned packet preview. The Brain's "Ahead" list (desk and Sol in the SDD, evaluation, Mind Factory from the desk) is open.

## Outcome

One governed path from the complete acquired corpus to Sol:

corpus (verified bytes) → discovery search (unreviewed) → exact original retrieved into a project → architect interpretation → independent review → release → signed receipt → activation → eligible Brain retrieval → Sol → architect decision → SDD record.

Discovery material never becomes support, scoring, constraint or conformance input. Sol's packets keep their existing authority classes.

## Work packages

### 1. Knowledge repository service (laptop, Node 24, no new runtime dependencies)
`AIW-V5-Local-Source/repository-service/`, a separate process and trust domain from the Site. It reuses the Site's own `sha256`, `canonicalJSON` and packet validator so identities and signatures cannot drift.
- **Corpus reader.** Streams the acquisition index and snapshot manifests. It resolves accepted file bytes, verifies SHA-256 against the manifest on every read, and never opens quarantined or restricted objects.
- **Index.** A complete index of every accepted, hash-verified documentation file in the selected snapshots, with contract-v1 revision and passage identities. Passages are deterministic and at most 100 lines. Search uses a *contentless* FTS5 index: no second copy of third-party text, and a compact footprint given 9.7 GB free on C:. Excerpts are always read from the verified original at query time.
- **Registry enforcement.** The registry's `allowedPaths`, `deniedPaths` and `maxFileBytes` are enforced. Today they are declared in `BRAIN_CATALOGUE.repositories` but never applied.
- **Licences.** Licence files are detected per snapshot and labelled *detected; clearance not reviewed*. Detection only supports the human licence review pack.
- **Concept cues.** Catalogue concept cues use the Site's own alias normalisation, so a concept leads to the passages that mention it (lexical cue only).
- **Store.** Durable store identity, an append-only notice log with contiguous cursors, refresh (re-verification, unavailable/superseded invalidations) and operator withdrawal.
- **HTTP API.** Loopback only, bearer token and Host check, read-only: status, search, passage, revision, exact original, repositories, notices, candidate packet (`aiw-repository-packet-v1`) and signed notice updates (`aiw-repository-sync-v1`, Ed25519, notices only, never releases).
- **CLI.** build, refresh, withdraw, serve, status, search, keygen, packet, sign.

### 2. Site integration (local server; hosted degrades to "not connected")
- **Server client.** `AIW_KNOWLEDGE_REPOSITORY_URL` (https, or http on loopback only) and `AIW_KNOWLEDGE_REPOSITORY_TOKEN`, with bounded, redirect-free requests and response validation.
- **Discovery routes.** Project-member routes for status, search and passage. Every response is `authority:'discovery-only'`.
- **Exact-original retrieval through `knowledge.fetch`.** One command and one origin (`repository-fetch`), with a second transport (`akr-corpus`). The source identity (repository, commit, path, SHA-256) is identical to a live GitHub read, so signed receipts, tombstones and the independent-reviewer rule bind unchanged. UTF-8 BOM bytes are preserved so hashes match.
- **Automatic revocation processing.** Signed invalidation notices from the service are verified with the configured public key and applied through the existing `applyRepositorySync` path, throttled per project.
- **Mind Factory → Sources.** The pilot and sampled-locator surfaces migrate into one *Knowledge repository* discovery surface: full-corpus search when connected, bundled locators and packet preview when not. The passage reader leads to "Retrieve the exact original", then "Interpret this passage" with the line range carried over.

### 3. Brain
- **Repository leads.** Discovery passages relevant to a decision are shown beside "what Sol will read", in the stewards' queue and in Mind Factory concepts. They are **not sent to Sol** and cannot be cited, so the reasoning contract and guards are unchanged.
- **Ahead 1 — the desk and Sol in the SDD.** An "Architecture reasoning record" section covering desk vitals, product choices and switch points, anti-pattern treatments, Sol's advice (used, applied, dismissed with reasons) with receipts, stewardship decisions and withdrawal impact. It is built from cycle-free modules. Frozen baselines keep their original text.
- **Ahead 3 — Mind Factory from the desk.** A switch point opens a product comparison in Mind Factory with the weighing, documented mechanisms, playbook tactics, governed claims about each product (a new resolver) and repository leads. Switch items anchor Sol's recall on the realisation.
- **Ahead 2 — evaluation.** A held-out decision set across three domains with *implementation-authored* expectations (independent expert review required). Metrics: citation validity, required-support coverage, false support, withheld rate, verdict agreement, bound compliance, and use/dismissal rates. It runs against the loopback test double by default. The mock gains failure modes that prove the metrics detect defects. Live runs happen only with explicit permission.

### 4. Operations, evidence and packaging
- Windows scheduled refresh script; the task is **not registered** without explicit permission.
- A live acquisition adapter (bounded, docs-only, hash-verified), tested against a loopback fake. A live GitHub run happens only with explicit permission.
- Release evidence in `release-evidence/brain-knowledge-repository/`. Updated registers and run guides. A v20 source archive with SHA-256. A full regression run (timeouts sized for this workstation) with Playwright browser checks.

## Boundaries (not claimed, not simulated)

Licence clearance, independent architecture review, a second authenticated reviewer on a single-identity local server, production signing keys, cloud deployment of the corpus, live-provider quality, the architect-reviewed SEABaaS case and production acceptance all remain external gates. `productionAccepted` stays `false`.

## Harness repairs needed for this workstation

The baseline on this Windows laptop gave 58 passes and 21 failures. Every failure was environmental:
- The fixed 180 s runner timeout under 3-way concurrency. `review-validate` passes alone in 108 s, and the desk browser suite progresses normally when run alone.
- A Windows `EBUSY` unlink of an open SQLite file (`architecture-explorer-validate.mjs`).
- Orphaned servers and Chromium processes after a timeout, because Node kills only the direct child on Windows.

Repairs: `release-checks.mjs` accepts `AIW_REGRESSION_TIMEOUT_MS` and `AIW_REGRESSION_CONCURRENCY` and kills the whole process tree on timeout. The explorer test closes its database before deleting it.
