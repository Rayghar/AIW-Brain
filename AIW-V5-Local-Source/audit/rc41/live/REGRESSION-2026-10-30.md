# rc41 · full regression after the Sol fixes (2026-10-30)

`node release-checks.mjs` ran on `ec8137b` with two suites at a time, a built client, a 1,500 s per-suite timeout and this
container's Chromium (`chromium-1243`, newer than the rc41 run's `1194`). Report: `regression-2026-10-30.json`.

| | rc41 final (2026-10-22, old container) | after the Sol fixes |
|---|---|---|
| suites | 320 | 322 (+`sol-open-fields`, +`provider-quota`, both green) |
| green | 282 | 280 |

- **37 of rc41's 38 red suites are still red.** The 38th, `notation-layout`, is now green, as its harness fix
  (`EXCLUSIVE`) intended.
- **Five suites are red that were green at rc41.** None comes from the Sol fixes. Those fixes changed only seven files in `public/`
  (`architecture-contract`, `brain-reasoning`, `brain-reasoning-ui`, `coauthor-ui`, `field-spark`, `intelligence-context`,
  `operations-ui`), and none of these suites' code:

  | Suite | Where it stops | On the pre-fix base `2439171`, alone | On head, alone | Reading |
  |---|---|---|---|---|
  | `tradeoff-browser` | reads the breadcrumb "All decisions" before it reads "All decisions › QD-004" | **red** | – | the harness reads before the breadcrumb updates; in this container (newer Chromium) even alone |
  | `platform-browser` | reads the breadcrumb "Whole platform" before "› Application execution…" | green | green | the same race, under load |
  | `requirements` | a crash inside `requirements.js` `showTip`'s timer | green | green | the tooltip timer fires after the suite's page is torn down, under load |
  | `sdd-size` | an edition built cold in 2,083 ms against a 2 s bound | – | green | a timing budget measured beside two browser suites; `release-checks.mjs` now runs it alone (`EXCLUSIVE`) |
  | `retention` | "the never-applied uploads were already removed by the sweep above" (1 !== 0) | **red** | – | the same on the pre-fix base in this container; not yet root-caused |

- **Suites changed after this run started.** The changes in `acb6a25` (`sol-field-5`) came later. The suites they touch
  (`sol-open-fields`, `field-spark`, `field-spark-browser`, `sol-live-check-validate`) were run on the final tree and are green.
- **Not run here.** The live provider run is separate (`LIVE-RUN-2026-10-30.md`). No suite was skipped, disabled or loosened, and
  `productionAccepted` stays false.
