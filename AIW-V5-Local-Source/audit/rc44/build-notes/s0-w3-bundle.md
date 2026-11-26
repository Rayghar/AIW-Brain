# rc44 build s0-w3-bundle: one size check (AA2) and one shared first-draw entry (D10, Y1, U6) — build notes

Built on `rc44/s0-w3-bundle`, from `4349bb6` (rc44/integration with the build contract of 2026-11-26). Release line:
AIW v0.10.0-rc.10.73.44 (working number, not confirmed by the owner). A lead-owned build of wave 3 on S0's shared files,
by leave: `client-bundle.mjs`, the route stubs (`public/design-package-routes.js`) and the lazy loaders, the extension
registry, `rc44-s0-readings.mjs`, `rc44-s0-extensions-validate.mjs` where named, and the size and placement assertions
of the rc44 suites that the bookings and the per-package first-draw loading pinned. Rulings: AA2 (the owner's decision of
2026-11-26), D10, Y1, U6; contract rules 7, 37, 50 to 52. `productionAccepted` stays false. No external authority is
involved or impersonated.

## State

- **Done:** nothing yet (baseline checkpoint).
- **In progress:** the plan below.
- **Next:** see the plan.

## Plan

(A) AA2 first. Raise `CHAPTERS_ROUTE_BUDGET` from 3158 KB (3,233,792 B) to 3190 KB (3,266,560 B) with a comment naming
the owner's decision AA2 of 2026-11-26. Retire per-slice byte booking: `routeBookings`, `assertBookingsAddUp` and
`LEAD_BOOKINGS` in `rc44-s0-readings.mjs`, S0's block "O1 the bookings add up", and every suite assertion that compares
the route with bookings, an allowance or the old cap literal. Each is replaced, old -> new (below), by one shared helper
`assertRouteWithinCap(measured, base)` in `rc44-s0-readings.mjs` that reads the caps and gates from `client-bundle.mjs`
(never a literal): the route under the cap, the script files at or under the gate, the files-under-10-KB bucket a
ceiling (P8, R4), and the stylesheet cap unchanged. The evidence and size files stay as the historical records they are;
`lead-bookings-size.json` gets one line saying booking was retired by AA2 at this build.

(B) D10 and Y1, with U6. Re-measure "opens with records" at `4349bb6`. Move the packages' first-draw readers
(registration rows, readers, checks, design rows; no surface) into one shared lazy entry that every route stub loads;
each surface stays in its host entry. Retire the per-package first-draw loading (one path). Tests first, in
`rc44-s0-d10-validate.mjs` (`test:rc44-s0-d10`), with goldens captured from an unchanged checkout of `4349bb6`. U6: the
S0 contract row for package steps kept on built-in records. wp3's design is revised so its readers join the shared
entry.

## Measurements at the start (4349bb6)

`node build.mjs` (dist/client-size-report.json): chapters route `routes.chapters.code` 3,228,938 B (72 files), projects
508,466 B, 148 script files, buckets under 10 KB 52, 10 to 50 KB 51, over 50 KB 45, stylesheet 901,873 B, no violation.
Caps: chapters 3,233,792 B, scripts 148, under 10 KB 61, stylesheet 902,144 B.

"Opens with records" (`rc44-s0-readings.mjs opensWithRecords(dist/client-metafile.json, entry, Object.keys(BUDGET.data))`
after `node build.mjs`):

| Package | Entry its stub loads | Route | Added | Scripts added |
|---|---|---|---|---|
| p10-knowledge | `public/knowledge-workspace-ui.js` | 3,228,938 B | +147,315 B | 2 |
| p40-adoption | `public/architecture-task-ui.js` | 3,228,938 B | +133,719 B | 2 |
| p30-deployment | `public/deploy-view.js` | 3,228,938 B | +855,804 B | 12 |

(Y1 measured +147,315, about +133,700 and +855,689 B at the close of wave 2.)
