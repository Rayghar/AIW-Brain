# Bounded knowledge layer implementation plan

Baseline: AIW v0.10.0-rc.10.73.6; source base cd78118420bfcad6293e18954ab4aeb9c9154414.
Local app package: 0.10.0-rc.10.91.1, not verified as cloud Site v44.

1. Stream acquisition manifests; reconcile snapshot files, nested content-addressed objects, quarantine and checkpoints. Record current counts and failures without exporting content.
2. Select 24 readable architecture files across two acquired repositories. Verify bytes and create deterministic revision/passage IDs, candidate claims and explicitly tentative typed links.
3. Persist refresh checkpoints and history in SQLite; test unchanged runs, change/withdrawal invalidation, bounded batches and dry run. No automatic authority or graph mutation.
4. Add a fail-closed bounded repository adapter and machine-readable contract. Production retrieval and activation remain blocked pending external signature/review/project trust integration.
5. Execute deterministic tests and actual pilot evaluation; produce metadata-only handoff under C:\AIW\aiw\second-brain-handoff, verify contents and SHA256.

Preserve unrelated changes and acquired bytes. No pushes, external publication, original text exports or invented approvals. Platform release gates and cloud end-to-end integration remain explicitly unrun.

Target updated by user: supplied AIW-Model-Explorer-v44-local.zip, SOURCE-RELEASE siteVersion 44, sourceCommit eef8464a885b93aee3f4a9348045dcc82f1635cd. Isolated extraction under output/v44-target; adapt and test against this source. Existing local v5 application remains untouched.

Completion continuation: rerun the full current acquisition inventory in output/repository-layer-complete; verify quarantine presence without reading restricted bytes; validate the required pilot checks; replace partial-handoff wording with measured completion and explicit external authority gates. No new product features, remote publication or unrelated app changes.
