# rc44 wp9a slice 1: typed failure domains, nodes and registration — build notes

Branch `rc44/wp9a-s1-topology`, from the integrated base `9673661` (S0 and wp1 S1 merged).
Design: `audit/rc44/design/wp9a-deployment.md` (sections a to f, Slice 1 under g, b.4, d.3).
Contract: `audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"), the rulings of 2026-11-18 (A to J).
Package id `p30-deployment`, route stub `p30-deployment-route` (ruling D8). Host entry: `public/deploy-view.js`
(design d.3, ruling A3). `productionAccepted` stays false.

## State

- **Done:** reading (plan, rulings, design, S0 contract, the code the slice touches); the plan below.
- **In progress:** the fixture and the suite (cases first).
- **Next:** the package modules, the registration, H1, the size measurement.

## Plan (decided before any code)

What slice 1 builds, and how each design hook is carried now:

| Design hook | Carried as |
|---|---|
| H1 `failureDomainKey` reads the zone's typed hosting domain first | an edit of built-in code (`public/runtime-model.js`), on the route |
| H3 findings | a `checks` row when a slice first raises a finding. Slice 1 raises none (ruling J7: no surface offers the steps yet) |
| H6 lifecycle, H7 provenance | registration rows (`lifecycle`, `provenance`) |
| H8 staging | registration row (`commands[type].staged`) |
| H9 object types, collections, relations, trace layers and hops | registration rows (`objectTypes`, `records`, `layers`, `hops`) |
| the `TOPOLOGY` slot of H1 | not added: slice 1 needs no call from built-in code into the package |

Commands of slice 1 (the others of design section c wait for the slice that builds their readers, ruling J6):
`runtime.topology-start` (person), `technology.domain`, `technology.domain-proposals`, `runtime.node`, `runtime.locate`.

## Deviations from the design

(filled as the work goes)

## Open questions

(filled as the work goes)
