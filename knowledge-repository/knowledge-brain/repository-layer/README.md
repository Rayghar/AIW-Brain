# AIW bounded repository layer

Controlling baseline: AIW v0.10.0-rc.10.73.6. Target application: supplied Model Explorer Site v44, source commit `eef8464a885b93aee3f4a9348045dcc82f1635cd`. The unrelated local v5 app is not this integration target.

Python 3.11+ standard library, SQLite, and Node 24 for v44. No new runtime dependencies. Run from `knowledge-brain`:

```powershell
python repository-layer/repository_layer.py inventory --root ../AKR-0.10.73.7_/github-live --index ../../release-evidence/rc10.73.7/CONTENT_SNAPSHOT_MANIFEST_INDEX.json --output output/repository-layer
python repository-layer/repository_layer.py select --root ../AKR-0.10.73.7_/github-live --index ../../release-evidence/rc10.73.7/CONTENT_SNAPSHOT_MANIFEST_INDEX.json --output output/repository-layer/pilot-selection.json
python repository-layer/repository_layer.py refresh --root ../AKR-0.10.73.7_/github-live --plan output/repository-layer/pilot-selection.json --db output/repository-layer/pilot.sqlite --batch 30
python repository-layer/repository_layer.py refresh --root ../AKR-0.10.73.7_/github-live --plan output/repository-layer/pilot-selection.json --db output/repository-layer/pilot.sqlite --batch 30 --dry-run
python repository-layer/repository_layer.py export --db output/repository-layer/pilot.sqlite --tenant local-architect --project second-brain-pilot --output output/repository-layer/project-packet.json
python repository-layer/evaluate_pilot.py --root ../AKR-0.10.73.7_/github-live --output output/repository-layer
python -m unittest discover -s repository-layer -p test_repository_layer.py -v
```

Inventory streams one manifest file entry at a time and hashes files in bounded batches of 64 using 12 readers. SHA-256 object identities are reconciled on disk in SQLite. Restricted/quarantine bytes are never opened; their metadata and physical counts are reported. The historical canonical manifest digest is compared to the acquisition index's embedded digest; it is **not recomputed** by this audit. A separate raw-file digest pins each pilot manifest, and accepted file and object hashes are recomputed. Missing unpacked copies and missing/corrupt objects are different findings.

The pilot currently selects 12 readable documentation files each from Microsoft Architecture Center and OpenTelemetry Demo, at their acquired commits. No live acquisition or branch polling occurs. Refresh consumes an explicitly pinned selection: after an authorized acquisition adds a new snapshot, update that selection with its exact commit, manifest hash and file hash. Removing a selection is not withdrawal: submit the original selector with `withdrawn:true`. A changed or unavailable source invalidates dependent candidates without erasing history. Previously invalidated revisions cannot silently recover eligibility.

The local SQLite job stores its cursor in the same transaction as revisions and invalidations. A crash before commit rolls the batch back. Repeated invocations resume an unfinished batch; completed jobs revalidate their selected sources. Dry run uses an in-memory copy and cannot write the durable database. A single Windows mutex in `refresh.ps1` prevents overlapping scheduled invocations. Output JSON includes progress, errors and completion. Semantic claim text is deliberately pending interpretation: lexical graph cues are suggestions, not extracted architectural truth.

For a repeatable daily invocation, configure Task Scheduler to run the following command as the owner account, without elevated privileges, and retain its output in the task's operational logs. No system task is automatically installed by this delivery:

```powershell
powershell.exe -NoProfile -File C:\AIW\aiw\knowledge-repository\knowledge-brain\repository-layer\refresh.ps1 -Batch 30
```

For v44, apply `v44-integration.patch` at its application root, then copy `repository-packet.js` and `repository-packet-validate.mjs` into that root. The patch adds a read-only authenticated packet-preview endpoint and includes the adapter in the build. It does not add another Brain execution entry point. Test against a metadata packet:

```powershell
$env:AIW_PACKET_PATH='C:\AIW\aiw\knowledge-repository\knowledge-brain\output\repository-layer\project-packet.json'
node repository-packet-validate.mjs
node knowledge-second-brain-validate.mjs
node knowledge-ingestion-validate.mjs
node brain-integration-validate.mjs
node build.mjs
```

The packet preview returns existing `knowledge.fetch` commands for explicit acquisition through v44's registered-repository, immutable-commit and expected-hash checks. It does not export or import original source text. Preview capacity is advisory; each actual command is checked by existing project limits. No packet grants licence clearance, review, signature, activation or canonical graph authority. Live cloud deployment and trusted signed-release integration remain external work.
