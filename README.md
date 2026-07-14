# Intelligent Architecture Workbench

## AIW v0.10.0-rc.10.73.6

**Governed GitHub Live Acquisition and 100 Percent Conversion Readiness**

This release replaces capped and split repository-ingestion paths with a single operational acquisition plane for the 30 approved GitHub sources.

### What is ready

- all approved repositories selected by default;
- GitHub REST API version `2026-03-10`, configurable;
- immutable commit pinning;
- truncated-tree recovery;
- complete governed-scope batching;
- resumable per-file checkpoints;
- Git blob and SHA-256 verification;
- expanded quarantine and prompt-injection treatment;
- licence evidence collection;
- deterministic candidate-claim extraction with exact source lineage;
- Kubernetes and PowerShell execution profiles;
- offline unit, policy, dependency, release-integrity and security gates.

### What is not claimed

The build environment could not reach GitHub. The direct connectivity preflight attempted all 30 approved repositories and recorded 0 reachable. Therefore live immutable snapshots remain 0/30 and production acceptance remains false.

Actual 100% conversion also requires accountable licence review, independent claim review, contradiction resolution, expert scoring calibration, signed knowledge-release promotion and managed production services.

### Run the acquisition

Windows:

```powershell
$env:AIW_GITHUB_TOKEN = "<secret-manager-injected-token>"
./RUN_GITHUB_KNOWLEDGE_ACQUISITION.ps1
```

Linux/container:

```bash
cd backend
node scripts/rc10-73-6-preflight.mjs
node scripts/rc10-73-6-run-live-github-acquisition.mjs
```

See `docs/GITHUB_KNOWLEDGE_ACQUISITION_RUNBOOK.md` for the complete operational and review sequence.
