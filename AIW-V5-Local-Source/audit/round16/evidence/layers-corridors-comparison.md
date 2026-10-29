# Layers corridor comparison · current source

Same current source, documents, scenes, and metrics; only Layers corridor planning switches on or off.

| Measure | Corridors off | Corridors on |
| --- | ---: | ---: |
| Reference Layers crossing points | 18783 | 14711 (21.7% fewer) |
| Foreign shared runs | 1019 | 611 |
| Touches | 2421 | 1551 |
| Ink (px) | 2149450 | 1999701 |
| Fall back | 6 | 6 |

The 355 pictures include 64 routed reference Layers views. Both runs keep source SHA-256 values and document fingerprints in the adjacent JSON and timing records. The independent structural and comparison gates run through `npm run test:layers-corridors`.

audit/round10/evidence/notation-lines.json and audit/round11/evidence/layers-corridors.json remain frozen; their sources/scenes are different and are not the quantitative control for this release.
