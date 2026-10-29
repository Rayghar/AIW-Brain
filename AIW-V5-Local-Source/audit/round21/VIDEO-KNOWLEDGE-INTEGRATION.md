# Video knowledge integration · candidate release

Release notation: AIW v0.10.0-rc.10.73.22. This is a design-resource and repository-intake change, not a production acceptance or an architecture approval.

## Supplied material and lineage

The recovered `AIW_Video_Knowledge_Engineering_Pack.zip` (`libfile_871244a2cf188191901156e77ed3edaa`) contains a blueprint, ingestion schema, scene manifest, frame semantic index, candidate graph seed and README. The exact files are held outside the Site source. The importer pins the SHA-256 of every member. The manifest has 72 scenes across four named recordings; the frame index has 63,184 rows; the graph seed has 100 nodes and 119 relationships. All scene and relationship authority remains candidate, restricted and unreleased.

The ZIP does not contain the MP4 recordings, a verified transcript, original media hashes, source URLs or rights clearance. The timecodes and frame spans locate supplied interpretations; they do not prove or play the source.

## Design Resources

Knowledge Repository → Video knowledge candidates is a lens inside the existing Design Resources entry. It offers search, recording and design-area filters; a selected scene has a named source locator, exact time/frame span, asset types, linked candidate concepts and relationships. Chapter links are navigation cues. Copy locator and Sources handoff preserve the evidence-review path. The small browser projection includes all 72 scenes, 24 non-media graph assets and 23 semantic asset links; the full graph and frame index remain in the separate laptop import. The view never writes a project decision, claim or selection.

The source generator `scripts/build-video-resource-catalogue.py` pins the exact scene manifest and graph seed before rendering the browser projection. The current Site view does not imply that the laptop repository has been imported.

## Knowledge repository intake

`repository-service/import-video-pack.ps1` accepts the exact ZIP on Windows and writes the six files, with hash receipts, beside the local SQLite store under `knowledge-repository\store\video-materials\packs\<pack-id>`. `video-evidence.js` validates the scene intervals, frame continuity and graph lineage before inserting tenant-scoped candidate records. Reimport of the same pack is idempotent. The loopback service and project API expose read-only status and search only for an explicitly allowed tenant. See `repository-service/README.md` for the laptop command and allow-list configuration.

The video candidate tables are separate from GitHub revisions, exact-source retrieval, claims, signed releases, Sol packets and SDD authority. A later reviewed source may use the ordinary Mind Factory release workflow; this import does not perform that promotion.

## Verification and remaining gates

- Exact pack import into a temporary repository store returned four videos, 72 scenes, 100 nodes, 119 edges and 63,184 frame mappings; all six pinned hashes matched.
- Repository regression covered idempotence, tampered/partial source rejection, tenant isolation, fail-closed missing allow-list, project API retrieval and exclusion from candidate packets. Existing repository service and knowledge repository suites passed.
- Design Resources' 12-check Chromium walkthrough covered search/filter, four recordings, source locators, no fake playback, clipboard, deep-link reload, Sources handoff, mobile focus/fit and no project mutation. Build and catalogue verification passed.

The laptop path `C:\AIW\aiw\knowledge-repository` is not mounted in this runtime; the actual laptop import and connection must be run there. The four recordings and use rights must be supplied and independently reviewed before a player, “Watch why”, “Ask about this moment”, “Apply to my project”, signed knowledge or measured design recommendation is enabled.
