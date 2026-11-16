# rc44 slice S0: shared registration — build notes

Branch `rc44/s0-extensions`, from `94dbd4f`. Contract: `audit/rc44/BUILD-PLAN-2026-11-16.md` section 4.

## State

- **Done:** the suite, written first: `rc44-s0-extensions-validate.mjs` (registered `test:rc44-s0-extensions`), the
  readings it compares (`rc44-s0-readings.mjs`) and the baseline digests (`rc44-s0-extensions-baseline.json`, captured
  from the unchanged code of `94dbd4f`). On the baseline block 6a passes and the twelve other blocks fail ("the
  registration point exists").
- **In progress:** the registry and the hooks.
- **Next:** measure the route, trim, document the contract, run the related suites.

## Baseline measurements (94dbd4f, `node build.mjs`)

chapters route 3,228,863 B of 3,233,792 B; 148 script files; under 10 KB: 53; stylesheet 901,873 B.
Lint: 162 problems, 162 baseline, 0 new.
