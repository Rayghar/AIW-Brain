# AIW Knowledge Room

A local second brain for understanding AIW's architecture knowledge: searchable records, source receipts, a linked Markdown vault, and a practical guide. Controlling baseline: **AIW v0.10.0-rc.10.73.6**.

This is a standalone discovery workbench, not a new Brain execution entry point or an authority service. All projected records remain discovery-only, including historical records that contain approval labels. `productionAccepted` is false.

## Run locally

Python 3.11 or newer. No runtime dependencies or API keys. From this directory:

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

## Tools

```powershell
python brain.py stats --input ../AKR-0.10.73.5/KNOWLEDGE-OBJECTS.json
python brain.py graph --input ../AKR-0.10.73.5/KNOWLEDGE-OBJECTS.json
python brain.py check-links local-vault
python brain.py chat conversation.json --vault local-vault
python -m unittest discover -s tests -v
```

Chat input is a JSON array of `{ "role": "user", "content": "text" }` records, with user, assistant, or system roles. Other export formats need explicit conversion. Imported text stays quoted in a candidate inbox note. Duplicate imports refuse to overwrite.

Generated `output/` contains the site, catalogue, navigation graph and input/build SHA-256 receipts. `local-vault/` and generated outputs are ignored by Git. Open `local-vault` as an Obsidian vault if desired; Obsidian is optional. No plugins are required.

## What this includes

- Explorer: search, repository/type filters, record detail, pinned source links where available, same-repository navigation, and visible source coverage.
- Ten original guide pages, linked starter notes and reusable source/concept/review templates.
- Capture, review and maintenance playbooks; deterministic graph export, statistics, local link checks, chat import and site generation.
- Executable regression and browser checks, a packaging command, and machine-readable delivery evidence.

Source passage verification, semantic support/contradiction edges, live LLM extraction, installed agent skills/slash commands, scheduled agents, authenticated multi-user hosting, and runtime Sol integration are **not implemented**. The explorer does not claim to recreate the reference's page or command counts.

## Boundaries and integration

Input is explicit; the tool never recursively crawls raw acquisition stores, quarantine folders, or project folders. Only selected metadata fields enter the catalogue. File hashes identify local input bytes; they do not verify upstream passages, licences, or approvals. Source statements are displayed as untrusted text.

Use a separate build for each tenant/project with `--tenant` and `--project`. Labelled records from another scope cause a hard failure. Unlabelled records inherit the selected scope; the operator must select the correct files. This is **not an authorization boundary**. Do not host it for multiple users or serve confidential files on a shared machine. The server binds only to loopback and serves an allowlist of generated assets. The entire selected catalogue is readable by anyone with local access.

The linked wiki and exported graph are disposable reading aids. Knowledge review and promotion must use AIW's existing governed knowledge lifecycle and its real human authorities. Nothing here writes to the canonical Design Graph, scores architecture, or installs another inference engine.

Do not publish generated catalogues or acquisition content without actual redistribution and licence review. The source package excludes all imported data and local notes. No deployment is performed.

## Design reference

Inspired by the [Second Brain OS repository](https://github.com/undefined-ui/second-brain-os): portable Markdown, linked knowledge, and small maintenance tools. This implementation contains original AIW code and guidance; no upstream content was copied or automatically acquired. The reference remains an external learning resource, not approved architecture knowledge.

See [implementation plan](IMPLEMENTATION_PLAN.md) and [delivery evidence](evidence/delivery.json).
