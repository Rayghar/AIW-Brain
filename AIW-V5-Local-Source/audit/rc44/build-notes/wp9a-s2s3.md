# rc44 wp9a slices 2 and 3 (one build, owner decision AA3): the declared failure set, its evaluation and acceptance; location gates and data copies — build notes

Branch `rc44/wp9a-s2s3`, from `4349bb6` (rc44/integration: S0, S0-D12, wp1 S1 to S3, wp2 S1 and S5, wp9a S1 merged; the
build contract). Release line AIW v0.10.0-rc.10.73.44 (proposed; the owner has not confirmed it). `productionAccepted`
stays false. Package `p30-deployment`; host entry `public/deploy-view.js` (unchanged).
Binding: `audit/rc44/BUILD-CONTRACT-2026-11-26.md`; rulings L, M, O, R, T (wp9a) and the carried items L2, L3, L8,
L11(d), M9(f); design `audit/rc44/design/wp9a-deployment.md` section g (Slices 2 and 3) with b.1, b.3, c.2 to c.5, d.1,
d.2 (H4, H5, H11), d.4 and f.1; S1's notes `audit/rc44/build-notes/wp9a-s1-topology.md`.

## State

- **Done:** plan (this file), baseline checkpoint.
- **In progress:** the cases of blocks S2 and S3 (tests first, each "fails today" case seen to fail on `4349bb6`).
- **Next:** see "Plan".

## Plan

1. Goldens for S2's parity case 6: `simulateRuntime` results for every environment, zone and mode of the three
   references and of the Tidewater project (untyped and typed), captured from an unchanged checkout of `4349bb6`
   (`node rc44-wp9a-simulations.mjs --capture 4349bb6`), never recaptured.
2. Cases first (blocks S2 and S3 of `rc44-wp9a-deployment-validate.mjs`), run on `4349bb6`; logs under
   `.aiw-local/wp9a-s2s3/` (git-ignored).
3. Slice 2: `public/topology-failures.js` (runtime.failure, runtime.environment-link, runtime.failure-accept as a
   second person's step through S0's `second` row, evaluateFailure, lossCases, survivalScope, findings); H4 and H5 in
   `public/runtime-domain.js`; the `TOPOLOGY` slot of H1 in `public/runtime-model.js`; L2: `hostingComparison`
   extended (one reader) to answer the zones that share a stated cause or a nested hosting domain, over the ancestors,
   so that the built-in checks, planFacts and the desk read them as one failure domain; S1.13's marked case flipped.
4. Slice 3: `public/topology-gates.js` (runtime.gate, runtime.copy, runtime.copy-proposals, runtime.gate-evidence,
   gateReading, locationGateState, copyInventory, the hard finding `location-gate:*`, `location-unknown:*`,
   `node-address-overlap:*`, `node-data-exposure:*`); H11 in `public/workbench-domain.js`; the gate refusal of
   runtime.failure-accept.
5. Suites, size before and after (`node build.mjs`, AA2: no booking), notes, final commit.

## Cases (each with the failure seen on `4349bb6`)

(filled as the work goes)

## Deviations

(filled as the work goes)

## Retirement list (J6)

(filled as the work goes)

## Open questions (for the lead)

- L3 (a lifecycle rule for a package on built-in collections, ruled "when slice 2 starts"): assumed NO, as the task
  says: the tracker's mend of slice 1 and the error `topology-incomparable` (L2 (c)) stand; this build adds no
  `canRestore` row on a built-in collection.
