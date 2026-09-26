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
| `acquire.js` | Live documentation refresh from GitHub for approved connectors. |
| `server.js` | The loopback HTTP API (token, Host check, no browser origin). |
| `cli.mjs` | `init`, `acquire`, `build`, `status`, `search`, `withdraw`, `packet`, `serve`. |
| `refresh.ps1`, `register-refresh-task.ps1` | The locked, logged refresh and its optional daily Windows task. |
| `fixture.mjs` | The synthetic corpus the suites use; original text only. |

Verification: `npm run test:repository-service`, `npm run test:repository-acquire`, `npm run test:knowledge-repository`, `npm run test:knowledge-repository-browser`.
