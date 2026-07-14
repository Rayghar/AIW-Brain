# AIW Knowledge-Pack Signing Specification

Version: v0.10.0-rc.10.17  
Sprint: 8.9.4

## Purpose

Knowledge packs make the mind portable. They allow Essential and Sovereign deployments to run governed intelligence without online source access.

## Pack contents

A knowledge pack contains:

```text
manifest.json
knowledge-release.json
claims.ndjson
pattern-dna.json
quality-attributes.json
tactics.json
scenario-templates.json
sdd-reasoning-grammar.json
fitness-test-seeds.json
source-provenance.json
license-manifest.json
checksums.sha256
signature.json
```

## Manifest fields

- packId,
- releaseId,
- releaseStatus,
- producedAt,
- producedBy,
- tenantScope,
- sourceSnapshotIds,
- claimCount,
- patternCount,
- tacticCount,
- scenarioCount,
- checksumAlgorithm,
- signatureAlgorithm,
- publicKeyId,
- expiresAt,
- compatibility.

## Activation rules

AIW may activate a knowledge pack only when:

1. manifest schema is valid,
2. all files listed in the manifest exist,
3. all checksums match,
4. signature validates against trusted key,
5. release status is approved or released,
6. package compatibility matches the running AIW version,
7. tenant/project pinning allows the release.

## Rejection rules

AIW must reject packs that are:

- unsigned,
- checksum-mismatched,
- expired,
- candidate-only,
- blocked/deprecated without override,
- incompatible with the running kernel,
- missing provenance or license manifest.

## Admin operations

Enterprise and Sovereign admins can:

```text
import pack
verify pack
compare pack
stage pack
promote pack
pin pack
deactivate pack
rollback pack
export audit manifest
```

Essential and Professional users can import only signed released packs.
