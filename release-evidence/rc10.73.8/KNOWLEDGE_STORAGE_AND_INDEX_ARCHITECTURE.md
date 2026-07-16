# Knowledge Storage and Index Architecture

Generated: 2026-07-16T05:23:31.685Z

- Cold immutable evidence remains under the ignored rc.10.73.7 CAS and snapshot vault. It is accessed by evidence ID and immutable CAS reference, never by recursive query-time scanning.
- Warm candidate ledgers are stored under the ignored AKR-0.10.73.8 candidate path as deterministic sharded NDJSON. They are candidate-only, rebuildable and physically separate from approved indexes.
- Hot approved indexes remain release-pinned transactional/application data and do not ingest these Gate 6A shards.
- Canonical identities are evidence IDs, semantic-unit IDs and immutable hashes; filesystem paths are locators only.
- Incremental refresh keys are connector ID plus immutable commit/blob SHA. Source withdrawal must invalidate dependent candidate units, ledgers and indexes before retrieval.
- The transformation ledger is ordered by semantic-unit ID with model, prompt and schema pins; bounded batches, checkpoints, retries and dead letters are mandatory before Gate 6C.
- Ordinary Brain queries retain zero raw-vault recursive scans. Raw content is loaded lazily by evidence ID.

The independent vault backup remains deferred and not passed. No compaction, deletion or movement was performed.
