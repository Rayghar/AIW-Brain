# Evaluate usefulness and boundaries

Create a small evaluation set from actual questions. Record expected source passages, expected limitations and questions the collection cannot answer. Keep project data within its tenant boundary.

Check retrieval coverage before measuring answer quality. A beautiful explanation based on an incomplete shard is not evidence of reliable corpus retrieval.

Technical acceptance for this workspace includes deterministic indexing, visible truncation, duplicate rejection, scope mismatch rejection, safe display of hostile source text, local-only serving, broken-link reporting and source receipt integrity. The executable tests cover these behaviours.

AIW platform acceptance additionally requires its backend/frontend builds, full regressions, browser acceptance, security and integrity gates, and real external review. A standalone tool test does not satisfy those gates.

Keep productionAccepted false until every mandatory platform gate genuinely passes.

Continue with [troubleshooting](10-troubleshooting.md).
