# rc37 — Diagram reading, connected Work, and component specifications

Release: `AIW v0.10.0-rc.10.73.37+studio.20261021`.

Baseline source: `2faeb7f12620940312c087a4f3d1f65619ba660a` (rc36).

## Design decisions

The opening diagram should explain the architecture before asking the reader to inspect every relationship. Dense structural views therefore use the model's recorded modules, trust boundaries, capability families and kinds. Their Overview keeps primary relationships plus the minimum additional recorded paths needed to preserve each connected component. This is a view projection: it does not create architectural records, infer new dependencies or delete relationships. Process and Sequence retain their ordered notation. Existing authored positions are preserved.

The reference Application view changes from 19 individual elements and 26 relationships to seven semantic groups and nine summary paths. Solution changes from 14 elements and 32 relationships to six groups and nine paths. Technology changes from 23 elements and 41 relationships to nine groups and 24 possible summary paths; its opening Overview draws eight actual paths while preserving connectivity among those groups. The connection caption states the subset. All exposes the individual elements and their complete relationships within the active scope.

Layers opens with named layer cards and a directional relationship index. Each card identifies its composition and examples. Opening a large lane remains bounded; a member picker exposes every recorded member, grouped by type. A member opens its exact direct neighbourhood. A held subject remains held when entering Layers. Empty layers no longer take up overview space.

Overview, Selected, All and None are consistently exposed on diagram views and native model drawings that contain connectors. All overrides selection fading. None hides connector paths, labels and interactive line targets while retaining objects, matrix cells, lane boundaries and lifelines. Native views keep their own meaningful routing and failure emphasis. Preferences remain scoped to project and view.

Arrange uses a compact panel with Auto arrange, illustrated layout presets, six alignment commands, even spacing, matching dimensions, snap, pin/release, undo and reset. Commands state their selection requirements. The panel is bounded by the model surface and has a scrolling body and reachable footer. The Auto arrange foreground explicitly wins over the shared button color rule.

All 11 Work chapters use one native composition: purpose-led section navigation, a bounded working surface, nearby actions, project record inventories, and links explaining the upstream input and downstream use. The original chapter editors, source identities, scope controls, dirty guards and canonical commands remain in place. Record counts do not imply completion or approval. Brief, Context, Inputs and later chapter record groups have purposeful content layouts rather than full-width undifferentiated lists.

Specification is a normal scrolling reading sheet, outside the diagram camera. Component identity and purpose lead into recorded Drivers → Decisions → Application → Platform context. Structure, Flow and Reasoning order the same canonical facts around different questions. All 14 specification groups and the gap list remain present. Review next names missing recorded context and opens the relevant existing editor or chapter; it does not assert that the component satisfies its drivers. Component choices respect the active scope while the chosen component's facts read the canonical project.

## Visual evidence and its limits

All 13 supplied images were recovered and visually inspected. The final implementation was also inspected through seven native SVG captures and their rasterized PNGs in `visual/`. The SVGs retain native geometry, labels and the actual connection visibility projection. The rasterizer used the application's IBM Plex Sans fonts and light theme background.

These PNGs are **native SVG diagnostics, not browser screenshots**. Georgia uses an installed serif fallback in the diagnostic renderer. Unsupported SVG marker orientation and interaction selectors mean these images are not acceptance evidence for arrowhead direction, pointer behavior, keyboard behavior, live camera scaling or surrounding HTML layout. The accompanying rendering manifest records hashes and these limits.

The supported managed browser preview could not be reached; a subsequent browser operation was rejected by the browser security policy. No alternate browser, raw CDP route or browser workaround was used. Full browser acceptance of the final page layouts therefore remains unverified.

Pure WeasyPrint diagnostics were also used to examine Work, Specification and Arrange composition. Its native form controls, nested grids, viewport sizing and scrolling differ from a browser; those limitations were kept separate from product defects. The Arrange color cascade conflict was independently confirmed from the actual CSS and corrected. No product layout was changed merely to accommodate the static renderer.

## Verification

The release record in `verification.json` names the focused native-handler, model, geometry and export checks. New reproducible entry points are:

```sh
npm run test:diagram-readability
npm run test:native-connections
npm run test:specification-reading
```

Existing Work checks cover all 11 chapters, 80 section transitions across reference and blank projects, and 28 editor open/cancel paths. Diagram checks include independent connected-component reachability, exact source edge membership, every connection mode, retained manual positions, held-subject continuity, lane exploration and arrangement controls. Specification checks cover reading lenses, all groups, canonical facts, scope-aware selection, source editor identities and zero model writes.

The notation layout suite reached its final child-process determinism check after passing its geometry assertions. This execution environment rejects its `spawnSync` with `EPERM`. The exact determinism workload was executed in two independent supported processes and produced the same expected SHA-256 in both:

`1d73069ebc75a5768783eeaede244c61f9b30fe91928db73856041f5f96722ba`

The test was not relaxed. The subprocess-dependent suite is recorded with that limitation rather than as an unqualified passing command.

Lint evidence distinguishes existing repository findings from changes in this release. The lint baseline was not increased. A direct ESLint API check avoids the same spawned-wrapper limitation; the comparison uses the rc36 source for every changed JavaScript file and checks new suites strictly.

## Performance and source integrity

The redesign removes 1,842 bytes of obsolete or duplicate Work CSS. Only the CSS size budget is changed, to the next whole KiB above the measured result; JavaScript startup, entry, chunk and script-count budgets remain enforced. The final measured report is `client-size-report.json`.

The normal private Worker build validates packaged imports and plain/gzip asset bytes and ETag behavior. `SOURCE-MANIFEST.json` verifies the complete delivered source. Its commit field names the checkout parent at generation to avoid a circular hash; the publication receipt and exact Git source archive identify the final pushed commit.

## Interaction references

The useful reference is progressive exploration of actual repository objects: grouping, relationship visibility, local expansion, familiar layouts, fit and zoom. This release does not claim feature parity with Orbus.

- [Orbus — Using Impact Explorer](https://support.orbussoftware.com/hc/en-us/articles/30456793367325-Using-Impact-Explorer)
- [Orbus — List View](https://support.orbussoftware.com/hc/en-us/articles/32009144101533-List-View)
