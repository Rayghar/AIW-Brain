# Evidence Deduplication and Clustering Report

Generated: 2026-07-16T05:23:31.685Z

- Original bounded passages: 147239
- Unique exact passages: 97513
- Normalized unique passages: 97182
- Semantic units after deterministic near-duplicate clustering: 75217
- Near-duplicate clusters: 2257
- Duplicate accepted file occurrences: 36055
- Silent passage loss: 0

Normalization uses Unicode NFKC, stable quote folding, line-ending normalization, horizontal whitespace collapse and lowercase conversion without removing numbers or architecture terms. Near-duplicate candidates use four 16-bit SimHash bands, a token-count ratio of at least 0.75 and Hamming distance no greater than 4. Every occurrence retains connector, repository, immutable commit, path, heading, structural range, excerpt hash, denominator status and semantic-unit membership in the sharded candidate ledger. Contradictions are not merged away; cluster membership is a reuse proposal, not semantic equivalence or promotion.
