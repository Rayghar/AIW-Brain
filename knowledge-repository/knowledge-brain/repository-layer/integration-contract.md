# AIW repository integration contract v1

The supplied application is Model Explorer Site v44, source commit `eef8464a885b93aee3f4a9348045dcc82f1635cd`. The engineering baseline remains AIW v0.10.0-rc.10.73.6. The archive SHA-256 is `d3bcd85be3cff6d8a425efa3e33a3fa1b68e423c5459f219214587be401c3334`.

## Implemented boundary

The shared repository layer holds corpus-scale acquisition metadata and immutable objects on the laptop. Its SQLite pilot store contains source identities, located passages, pending interpretations and descriptive edge suggestions. A packet carries at most 100 source revisions, 250 candidates, 500 notices and 8,000,000 UTF-8 JSON bytes. Source bodies, quarantined objects and acquired archives are excluded. Existing project contents still count toward the application's own limits; the adapter reports remaining capacity, and existing commands enforce it at mutation time.

`contract.schema.json` is the complete JSON Schema 2020-12 wire definition. The handoff includes that schema and appends it below this document. Cross-field validation also checks hash-derived identifiers, line order, unique IDs, source/passage/claim referential integrity, contiguous sequential notices and authenticated scope. Unknown fields, source bodies and authority upgrades are rejected. `architecture-knowledge-sample.json` conforms to the same schema; its source text is original synthetic test material in `synthetic-fixture.txt`.

Source revision ID = `revision-` plus the first 32 hex characters of SHA-256(JSON compact array of repository, exact commit, path, file SHA-256). Passage ID similarly hashes revision ID, inclusive 1-based lineStart, lineEnd and excerpt SHA-256. Claim ID hashes passage ID. Paths in this v1 adapter are restricted to ASCII documentation locators, and hashes are lowercase hex without a prefix. Passage text is obtained by UTF-8 decoding exact bytes, splitting on LF, slicing inclusive line locations and joining with LF; retained CR characters are part of the hash. No normalization or instructions from source bodies are executed.

`storeId` is a durable UUID created with the SQLite store. Cursor = `(storeId, integer)`, local to that store. Rebuilding a store creates a new UUID and requires a full resynchronization; integers must not be compared across stores. `fromCursor` excludes already consumed notices; `cursor` is the snapshot high-water mark. Export is a complete bounded current selection plus notices after fromCursor, not a paginated corpus dump. More than 500 pending notices fails closed rather than truncating invalidations. Consumers must persist a high-water mark only after validating and processing the whole packet, reject rollback or store replacement until explicitly resynchronized, and must not infer release authority from an unsigned notice.

## CLI and application endpoint

```powershell
python repository-layer/repository_layer.py query --db output/repository-layer/pilot.sqlite --question "caching" --mode candidate
python repository-layer/repository_layer.py query --db output/repository-layer/pilot.sqlite --question "caching" --mode approved
python repository-layer/repository_layer.py export --db output/repository-layer/pilot.sqlite --tenant local-architect --project bank-payment --cursor 0 --output output/repository-layer/project-packet.json
```

Candidate query is deliberately bounded lexical repository/path search (maximum 12 results, 500-character query). The existing full-collection explorer supplies corpus-scale content search. Approved query is fail-closed and returns an empty list: no trusted independent signed releases are installed in this service. A candidate statement is a pending-review placeholder rather than generated advice.

Added to v44: `POST /api/knowledge/repository-packet?project=bank-payment`, JSON body = packet, `Content-Type: application/json`, `Origin` = application origin. Authentication and project owner/editor authorization reuse v44's existing backend. The server derives tenant scope from the authenticated project owner; it does not trust packet tenantId. There is no arbitrary filesystem or URL parameter. Response is `{schemaVersion,storeId,scope,cursor,readOnly:true,authority:"discovery-only",productionAccepted:false,locators,counts,capacity,notices,activation:{allowed:false,reason}}`. Each locator includes either an existing `knowledge.fetch` command at an exact registered repository/commit/path/hash or `repository-registration-required`. Preview neither executes those commands nor persists candidates, passages, notices, graph changes or pins.

An explicit source fetch continues through v44's `/api/commands?project=...` with `{revision:<current project revision>,command:{type:"knowledge.fetch",payload:{connectorId,path,ref:<40-hex commit>,expectedHash:<64-hex SHA-256>}}`. This uses v44's bounded registered-repository acquisition and source verification. It obtains an original through the application's current transport; this delivery does not export the laptop's originals or certify their permitted use. Returned source IDs are project-local; consumers must retain the repository revision mapping when a future importer is installed.

## Review, release and activation

Required authority sequence: candidate interpretation -> independently verified original passage and context -> human architecture review -> independent approval with exact claim hashes -> trusted signed release -> explicit project activation -> eligible Brain/Sol retrieval. Descriptive graph cues do not constitute conditional advice and never affect scoring or hard constraints. The adapter does not install a second Brain runtime or modify the canonical Design Graph.

Existing v44 `knowledge.review`, `knowledge.release` and `knowledge.activate` commands are project review mechanisms. A release checksum is not a cryptographic signature, and an asserted reviewer name is not independent authenticated approval. This delivery does not relabel those mechanisms as satisfying the required signed independent release gate. Organization knowledge has a distinct authenticated signed workflow; mapping repository packets into that trusted workflow, including exact signed source/claim hashes and reviewer separation, remains required integration work.

The repository adapter intentionally has no release activation endpoint. Requests asserting signed or approved packet state are rejected. A future signed-release adapter must bind issuer, key ID, tenant, release hash, claims, provenance, validity interval, revocation status and independent review receipts to an authenticated trust provider. It must use the existing project activation and Brain execution path, not bypass it. Production acceptance remains false.

## Changes, withdrawals and recovery

Refresh rehashes selected source copies and content-addressed objects. A new immutable revision creates a successor record, marks old dependent candidates ineligible pending review, and emits an invalidation notice. Missing, corrupt or disallowed support fails closed. Explicit withdrawal has the same eligibility effect. Source history and prior passages remain; no old record is deleted. Failed transactions are rolled back and retried from the last durable job position. Completed jobs recheck sources on the next invocation. Dry-run changes only an in-memory database copy.

The current v44 preview displays invalidation notices to its caller but does not apply unsigned repository messages to live project authority. Existing v44 refreshed-source/withdrawal paths already check eligibility for their own stored sources. A future trusted synchronization adapter must map repository revision IDs to project sources, process revocations before retrieval, invalidate affected claims/releases and retain prior SDD receipts with changed-support warnings. Until that adapter is deployed, automatic cross-service revocation and eligible repository claim retrieval are **not implemented**.

## Operating boundaries

The pilot scheduler revalidates a pinned local selection; it does not poll GitHub branches or download new snapshots. New acquisitions must use the governed acquisition process, then provide a successor selection. `refresh.ps1` is ready for Task Scheduler but no system task is registered automatically. The laptop corpus is not mounted in the cloud, and no cloud deployment, live LLM call, expert review or architect-reviewed SEABaaS case is claimed.


## Exact operation schemas and existing activation/withdrawal examples

`operations.schema.json` defines the search arguments, immutable source fetch, existing v44 project activation/withdrawal commands, and invalidation notices. `operations.examples.json` contains synthetic documentation examples only; no example is submitted to a service or counted as a real approval. Both schema documents are included in the handoff.

Search JSON arguments map to `query(dbpath, question, mode, limit)` in the local repository adapter. The CLI exposes question and mode and uses the bounded default limit of 12. There is no invented HTTP search endpoint.

Activation uses the existing authenticated `POST /api/commands?project=<projectId>` endpoint. Its exact body is the `activation` example, with the current project revision, a real release ID, a genuine human review and the application's current `knowledgeStamp(project)`. It acts only on already stored reviewed project releases; it cannot activate a repository metadata packet. The repository-to-independent-signed-release bridge remains an external integration gate.

Withdrawal uses the same existing endpoint and the `withdrawal` body, with a real recorded source/claim/release ID and `knowledgeImpactStamp(project,targetId)`. Application review is required. This is the project authority operation; it is distinct from unsigned repository invalidation notices, which may only be previewed by this adapter.

Repository invalidation is exercised without changing project authority by refreshing a selector with `withdrawn:true`, or ingesting a successor immutable snapshot for the same repository/path. Export with `--cursor <previousCursor>` returns the exact `invalidationNotice` shape. Consumers retain history and cannot treat a descriptive notice as a signed approval. The existing local tests exercise changed-source and withdrawal invalidation; no production authority is simulated as real.
