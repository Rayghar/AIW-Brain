# Knowledge repository service

The laptop-side service that makes the acquired architecture corpus usable by the workbench. It is a separate process and trust domain from the workbench: it holds the corpus and the notice-signing key; the workbench holds projects. Node 24, no runtime dependencies beyond Node itself. The operator and architect guide is [../KNOWLEDGE-REPOSITORY.md](../KNOWLEDGE-REPOSITORY.md).

| Module | Responsibility |
|---|---|
| `manifest-stream.js` | Streams acquisition manifests without loading them whole; raw SHA-256 of every manifest read. |
| `corpus.js` | Configuration, the verified connector registry, the pinned selection plus the local overlay, verified reads, retrieval and licence policy. |
| `passages.js` | Deterministic passage segmentation; excerpts are exact line ranges. |
| `ids.js` | Contract v1 identities (revision, passage, claim, concept). |
| `concepts.js` | Lexical cues against the descriptive AKR catalogue. |
| `store.js` | The SQLite store: identity, revisions, passages, contentless FTS5, notices, jobs. |
| `build.js` | Build and refresh: re-verification, successors, invalidations, operator withdrawal. |
| `reader.js` | Search, passages, revisions, exact originals, concepts, notices; excerpts re-verified per request. |
| `sync.js` | Candidate packets and notices-only signed updates; notice key management. |
| `transfer.js` | Explicit, signed handoff of one to five current, retrievable originals to a named private project; source-use acknowledgement, no claim or licence approval. |
| `acquire.js` | Live documentation refresh from GitHub for approved connectors. |
| `server.js` | The loopback HTTP API (token, Host check, no browser origin). With `allowedTenants` (a list of tenant ids) in `config.json`, the token is bound to those tenants: a packet or signed notice update for any other tenant is refused with 403. Without it, the token serves any tenant scope, which is the documented trust model (the token is the workbench). |
| `cli.mjs` | `init`, `acquire`, `build`, `status`, `search`, `withdraw`, `packet`, `transfer`, `serve`. |
| `video-evidence.js`, `video-evidence-cli.mjs`, `import-video-pack.ps1` | Restricted, tenant-scoped candidate scene index from the exact six-file engineering ZIP. Copies all six analysis files with SHA-256 receipts into the local store, checks all 63,184 frame rows against 72 scene intervals and all 119 graph edges against candidate nodes. It never imports an MP4 or creates an approved claim. |
| `refresh.ps1`, `register-refresh-task.ps1` | The locked, logged refresh and its optional daily Windows task. |
| `fixture.mjs` | The synthetic corpus the suites use; original text only. |

Verification: `npm run test:repository-service`, `npm run test:repository-acquire`, `npm run test:knowledge-repository`, `npm run test:knowledge-repository-browser`.

## Import the video analysis on the repository laptop

This import is **separate from the 47 acquired GitHub connectors**. Download the exact `AIW_Video_Knowledge_Engineering_Pack.zip` from the private Library, then use the AIW source checkout and Node 24 on Windows. In AIW, Mind Factory → Sources → **Transfer selected originals from the repository laptop** displays the exact tenant scope; copy it into `-Tenant`. With the Site checkout and its `repository-service` script available:

```powershell
cd C:\AIW\aiw\AIW-V5-Local-Source
powershell -ExecutionPolicy Bypass -File .\repository-service\import-video-pack.ps1 `
  -EngineeringPack 'C:\Users\<you>\Downloads\AIW_Video_Knowledge_Engineering_Pack.zip' `
  -Tenant '<exact tenant scope from Sources>' `
  -KnowledgeRoot 'C:\AIW\aiw\knowledge-repository'
```

The script checks the six ZIP member names and sizes, extracts to a temporary directory, verifies **each member against its pinned SHA-256**, checks the graph/scene/frame relationships, and copies the exact analysis bytes under `C:\AIW\aiw\knowledge-repository\store\video-materials\packs\<pack-id>`. The SQLite candidate index is in `store\akr-store.sqlite`. Repeating the import of identical bytes is idempotent. The large frame CSV and ZIP stay outside the Site Git source.

For the **laptop repository service to expose these restricted candidates**, set `"allowedTenants": ["<exact tenant scope>"]` in that laptop's private `repository-service/config.json`, then restart `npm run repository:serve`. The video status and search endpoints fail closed if `allowedTenants` is absent or excludes the tenant. Design Resources → Knowledge Repository → Source media reads the candidate index through the project's authorized `?view=video-status` and `?view=video` API routes. An unconnected or empty repository shows an empty state; the Site does not bundle this private catalogue in browser assets. The hosted Site cannot directly reach the laptop's loopback service.

The ZIP holds a blueprint, schema, graph seed, 72-scene manifest, 63,184-row semantic frame index and README. It **does not hold the four MP4 originals, their content hashes, transcript or a licence clearance**. A timecode is a locator within a named but currently unavailable recording, not playable proof. Every scene and concept remains `candidate` / `restricted-source-review-required` / `unreleased`. The repository indexes it as discovery only: it never enters project `knowledge.source`, signed release, or Sol context from this import. Once the originals and rights are supplied, use Mind Factory's ordinary exact-source, independent review, release and signed activation route for each supported claim.
