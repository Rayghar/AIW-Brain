# AIW Knowledge Room

> **Superseded for architects (26 September 2026).** The acquired corpus is now served to the workbench by the knowledge repository service in `AIW-V5-Local-Source/repository-service/` (see `AIW-V5-Local-Source/KNOWLEDGE-REPOSITORY.md`). It searches all 18,961 documentation files as verified passages in Mind Factory → Sources, and serves exact originals for retrieval, signed notices and a live refresh. The `repository-layer/` 24-file pilot is retired: its 24 revisions exist in the full store with identical contract-v1 identities. The tools here remain as the historical audit and discovery record; they are not a second path into project knowledge.
>
> Note: the full-collection index this tool built (`output/collection/collection.sqlite`, about 826 MB) contains the text of the 10 repositories whose licence dossier permits metadata only. The knowledge repository service does not index their text. Treat that derived file as restricted, or delete it: it is disposable, and rebuilding it is not needed for the workbench.

A local second brain for understanding AIW's architecture knowledge: searchable records, source receipts, a linked Markdown vault, and a practical guide. Controlling baseline: **AIW v0.10.0-rc.10.73.6**.

This is a standalone discovery workbench, not a new Brain execution entry point or an authority service. All projected records remain discovery-only, including historical records that contain approval labels. `productionAccepted` is false.

## Run locally

Python 3.11 or newer. No third-party runtime packages or API keys. Full-collection mode requires SQLite FTS5 support, verified here with Python 3.13.3. From this directory:

```powershell
python brain.py init local-vault
python brain.py build --input ../AKR-0.10.73.5/KNOWLEDGE-OBJECTS.json --vault local-vault
python brain.py serve
```

Open http://127.0.0.1:8765. This example explicitly selects the **older AKR-0.10.73.5 catalogue**, not the latest complete acquisition. The source receipts show indexed and total records. An empty `python brain.py build` builds the guide without importing data. Rebuilding with no inputs clears the previous catalogue.

Choose newer candidate material explicitly, for example:

```powershell
python brain.py build --input ../AKR-0.10.73.8/candidate/prompt-6g-planning-v1/transformation-units-00.ndjson --limit 2000 --vault local-vault
```

This selects **one shard**, not the full corpus. Repeat `--input` for additional files. The default cap is 10,000 displayed records across all files, in input order. The tool still reads, validates, and hashes every selected file and reports excluded records. Large collections take time; the browser catalogue is an in-memory projection, not a production search engine.

## Explore the downloaded GitHub collection

From this directory, build the complete selection using the actual unpacked snapshot root (note the underscore in its folder name):

```powershell
python brain.py collection --snapshot-root ../AKR-0.10.73.7_/github-live --manifest-index ../../release-evidence/rc10.73.7/CONTENT_SNAPSHOT_MANIFEST_INDEX.json --candidates ../AKR-0.10.73.8/candidate/prompt-6g-planning-v1 --vault local-vault
python brain.py serve --directory output/collection --port 8766
```

Open http://127.0.0.1:8766. This mode covers every file entry in the acquisition index's 47 selected snapshots and every record in all 16 transformation shards. There is no 10,000-record cap. Search runs in a local SQLite full-text index and returns pages of 40 records. All query terms must match; terms support prefix matching. Search includes metadata and the complete UTF-8 text of accepted, hash-verified files up to 2 MiB.

The initial view shows verified local source files. Set Availability to **All dispositions** to inspect excluded, missing, quarantined and other metadata-only entries. Choose **candidate-semantic-unit** under Type and clear Availability to explore candidate processing records. Their source link matches repository, immutable revision and file path, not just a similar name.

Select **Read verified local source** to read escaped text. The server rechecks both the selected manifest hash and the source hash on each read. It blocks previews if bytes or manifest dispositions have changed. HTML, scripts and source instructions are displayed as inert text. Quarantined, rejected, excluded, opaque, binary, oversized and hash-mismatched entries never supply searchable body text or previews.

Coverage details show each disposition and the historical snapshot excluded from the acquisition selection. The extra Apache Camel snapshot is not silently counted twice. Older derived/replay datasets are not duplicated into this view. The ZIP and multipart RAR archives remain unchanged: matching unpacked snapshots supply the content, so no backup extraction or redistribution is performed.

The generated SQLite index and source previews are local restricted derivatives. They remain inside ignored output directories and are excluded from source packages. The HTTP server does not serve the database or arbitrary filesystem paths. It still has no multi-user authentication; use it only as a local single-user tool.

Stop the full-collection server before rebuilding its output directory. Rebuilds replace a disposable index; source snapshots and archives are never written.

The full-collection build rejects explicit tenant/project labels that differ from repository-reference/shared-catalog. Unlabelled acquisition records inherit that reference scope. It fails if a selected manifest or any of the 16 candidate shards is absent or inconsistent. Missing individual accepted files and hash mismatches remain visible as coverage gaps. Source hashes establish byte identity, not licence clearance, semantic correctness, or knowledge approval. No new live GitHub acquisition occurs.

## Tools

```powershell
python brain.py stats --input ../AKR-0.10.73.5/KNOWLEDGE-OBJECTS.json
python brain.py graph --input ../AKR-0.10.73.5/KNOWLEDGE-OBJECTS.json
python brain.py check-links local-vault
python brain.py chat conversation.json --vault local-vault
python -m unittest discover -s tests -v
python verify_collection.py output/collection
```

Chat input is a JSON array of `{ "role": "user", "content": "text" }` records, with user, assistant, or system roles. Other export formats need explicit conversion. Imported text stays quoted in a candidate inbox note. Duplicate imports refuse to overwrite.

Generated `output/` contains the site, catalogue, navigation graph and input/build SHA-256 receipts. `local-vault/` and generated outputs are ignored by Git. Open `local-vault` as an Obsidian vault if desired; Obsidian is optional. No plugins are required.

## What this includes

- Explorer: search, repository/type filters, record detail, pinned source links where available, same-repository navigation, and visible source coverage.
- Ten original guide pages, linked starter notes and reusable source/concept/review templates.
- Capture, review and maintenance playbooks; deterministic graph export, statistics, local link checks, chat import and site generation.
- Executable regression and browser checks, a packaging command, and machine-readable delivery evidence.

Semantic passage verification, semantic support/contradiction edges, live LLM extraction, installed agent skills/slash commands, scheduled agents, authenticated multi-user hosting, and runtime Sol integration are **not implemented**. The explorer does not claim to recreate the reference's page or command counts.

## Boundaries and integration

Input is explicit; the tool never recursively crawls raw acquisition stores, quarantine folders, or project folders. Only selected metadata fields enter the catalogue. Input hashes identify catalogue bytes. Full-collection mode additionally checks accepted source-file hashes; neither check verifies passage meaning, licences, or approvals. Source statements are displayed as untrusted text.

For the small explicit-file workflow, use a separate build for each tenant/project with `--tenant` and `--project`. The acquired-collection workflow is restricted to shared reference material. Labelled records from another scope cause a hard failure. Unlabelled records inherit the selected scope; the operator must select the correct files. This is **not an authorization boundary**. Do not host it for multiple users or serve confidential files on a shared machine. The server binds only to loopback and serves an allowlist of generated assets. The entire selected catalogue is readable by anyone with local access.

The linked wiki and exported graph are disposable reading aids. Knowledge review and promotion must use AIW's existing governed knowledge lifecycle and its real human authorities. Nothing here writes to the canonical Design Graph, scores architecture, or installs another inference engine.

Do not publish generated catalogues or acquisition content without actual redistribution and licence review. The source package excludes all imported data and local notes. No deployment is performed.

## Design reference

Inspired by the [Second Brain OS repository](https://github.com/undefined-ui/second-brain-os): portable Markdown, linked knowledge, and small maintenance tools. This implementation contains original AIW code and guidance; no upstream content was copied or automatically acquired. The reference remains an external learning resource, not approved architecture knowledge.

See [implementation plan](IMPLEMENTATION_PLAN.md) and [initial delivery evidence](evidence/delivery.json) and [full-collection evidence](evidence/full-collection.json).
