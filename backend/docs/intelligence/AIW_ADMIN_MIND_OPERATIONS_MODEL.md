# AIW Admin Mind Operations Model

Version: v0.10.0-rc.10.17  
Sprint: 8.9.4

## Purpose

This model defines the admin operations required to administer AIW's mind: sources, claims, contradictions, Pattern DNA, release candidates, knowledge packs and tenant/project pins.

## Operating flow

```text
Register source
→ classify source posture and trust tier
→ capture pinned snapshot
→ quarantine source content
→ extract candidate claims
→ normalize claims
→ detect duplicates/synonyms
→ detect contradictions
→ calculate corroboration
→ assign reviewer
→ approve/reject/request changes
→ stage Pattern DNA/tactic/quality updates
→ build release candidate
→ run validation gates
→ preview release impact
→ promote signed release
→ pin tenant/project
→ monitor drift and rollback if required
```

## Admin work queues

| Queue | Purpose | Exit condition |
|---|---|---|
| Source registry | Register and classify knowledge sources | Source has owner, posture, trust tier and license |
| Snapshot queue | Capture immutable source evidence | Snapshot has commit/hash/provenance |
| Claim quarantine | Hold extracted candidate claims | Claims reviewed or rejected |
| Duplicate/synonym queue | Normalize overlapping terms | Canonical term linked to aliases |
| Contradiction queue | Split conflicts by context | Conflict resolved, escalated or marked context-dependent |
| Corroboration queue | Count independent evidence | Claim gets evidence confidence |
| Pattern DNA queue | Stage pattern/tactic changes | Pattern update approved into candidate release |
| Release queue | Build and validate release | Candidate promoted, blocked or rolled back |
| Pack queue | Sign/export/import packs | Pack verified and staged/pinned |

## Named roles

- Platform Admin,
- Knowledge Admin,
- Knowledge Curator,
- Architecture Reviewer,
- Security Reviewer,
- Compliance Reviewer,
- Repository Admin,
- Model Admin,
- Auditor.

## Audit events

Every operation must emit an audit event with:

- actor,
- tenant,
- role,
- action,
- before/after summary,
- evidence reference,
- release ID or snapshot ID,
- reason,
- timestamp.

## Required future implementation gates

- candidate knowledge cannot influence production,
- source popularity cannot be used as authority,
- release impact preview exists before promotion,
- signed pack verification exists before activation,
- every promotion has a named human reviewer,
- every contradiction is context-split, escalated or explicitly accepted.
