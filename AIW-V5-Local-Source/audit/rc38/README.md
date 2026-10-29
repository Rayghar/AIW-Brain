# rc38 — Readable architecture views and connected design work

Release: `AIW v0.10.0-rc.10.73.38+studio.20261021`.

Baseline source: `83854ef635e4ad421b403804ad7778c060a673d8` (rc37).

## Architecture views

Dense structural diagrams and Layers open with a bounded set of six paths. **Reveal next** adds six; **All** shows the complete path set in the current projection; **Selected** isolates the selected object's relationships; **None** hides connection ink. A small count beside an object identifies additional paths. Path counts distinguish grouped paths from underlying recorded relationships. Ordered Process, Sequence and Lifecycle notation retains its complete ordered flow by default.

Connection visibility does not unfold groups, move objects, reroute paths or change the camera. Opening a group and showing every element are separate actions. Manual positions, pins, held subjects and canonical identities remain intact. Pending-count badges avoid nodes and current or later-revealed relationship labels. Hidden crossing paths no longer leave unexplained white gaps in visible connectors. Same-band relationships use reserved space below cards so their labels remain legible.

Layers groups actual records by concern and type. Business, Application and Technology follow the three core ArchiMate layers. Motivation is a separate aspect; Information and data, Security concerns and Deployment are explicitly AIW concern bands rather than additional standard ArchiMate layers. Logical responsibilities remain distinct from application components; technology capabilities remain distinct from realization plans, products and candidate options. Canonical layer IDs are unchanged.

The same connection controls now operate on all nine native model drawings that contain connectors. Paths, heads, labels and shared branches carry their exact relationship memberships, so progressively revealing a connection does not expose half a route. Native selection emphasis is preserved. Utility and Decision views reveal their existing hierarchy and driver-to-decision order before details, using the existing layout's order rather than lexical record IDs.

Arrange presents a primary recommendation, conventional layout choices and real vertical/horizontal direction. Selection-dependent alignment, even spacing and matching dimensions retain the native commands. Fit, zoom, pins, undo and reset remain part of the existing model controls. The assistant's reading packet now reports the current projection and exact visible path IDs, matching what the user is examining.

## Connected Work across all 11 chapters

The existing Work surface now carries a shared task path, a concrete architecture question for each of its 40 sections, and explicit method inputs and handoffs. Actual record links remain separate from method navigation: a chapter link does not imply that evidence or a traceability relationship exists. Context is bounded, deduplicated and linked to canonical record IDs. Native editors, scopes, primary actions and unsaved-change guards remain authoritative.

| Chapter | Context brought into the working surface |
| --- | --- |
| 1 — Requirements | Source, acceptance and business/journey context |
| 2 — Quality | Inherited requirements and actual driver links |
| 3 — Decisions | Required behaviour alongside choice criteria |
| 4 — Logical responsibilities | Source requirements and implementation allocations |
| 5 — Application components | Realized responsibilities and mapped platform support |
| 6 — Technology capabilities | Application needs, mapped support and evidence |
| 7 — Technology realization | Plan scope, capabilities, preference and rationale |
| 8 — Interfaces and data | Endpoints, payloads, delivery promises and carrying contracts |
| 9 — Security | Threat scenario, consequence, affected architecture, safeguards and evidence |
| 10 — Runtime | Plan purpose, environment, assets and inherited drivers |
| 11 — Review | All ten preceding chapters organized into design basis, connected architecture, and assurance/operation |

No new readiness score or completion engine was added. Record counts remain counts, not claims of approval.

## Driver-grounded Specification

Specification is an integrated component dossier with Structure, Flow and Reasoning reading lenses. It reads canonical component facts once per render pass and connects the component's drivers, decisions, responsibilities, properties, applied mechanisms, platform needs, capabilities, product realizations, contracts and obligations.

The reasoning follows recorded relationship paths. It shows selected alternatives and rationale, benefits and costs, hard-constraint conflicts, changed source context, and the distinction between candidates and selected realizations. Product-driver assessments appear only where the component and realization actually share that driver. Current obligation evidence is distinguished from earlier references. Record-specific review prompts open the existing relevant record or editor; they do not assert satisfaction merely because a record exists.

The contract reading also corrects event direction: the event publisher is the provider/from end and the consumer is the to end. Request and batch provider semantics remain unchanged. The same correction reaches UI, JSON, Markdown and snapshots. Exported verification wording points to canonical obligations instead of declaring an invented pending state.

## Visual review and limits

All 13 supplied reference images were recovered and inspected. The final seven native SVG views were visually inspected after rendering with the application's IBM Plex fonts and sage background. Final source SVGs, diagnostic PNGs and hash manifests are in `visuals/`. These are **native SVG diagnostics, not browser screenshots**. Geometry and text are retained; equivalent SVG font longhands are used only in diagnostic rendering. Arrowhead behavior that depends on unsupported marker orientation, surrounding HTML, viewport behavior and live camera interaction are not accepted by those PNGs.

Pure static WeasyPrint renders were produced from actual native HTML/CSS fixtures for 22 Work states. Representative states from all 11 chapters, all three Specification lenses, and the default/selected Arrange panel were visually inspected. WeasyPrint's native form controls, fixed/scrolling surfaces, grid pagination and negative grid-line handling differ from a browser. An isolated 900 px trace reproduced its negative-grid-line defect; diagnostic-only equivalent positive grid ends were used to inspect the affected records. Production CSS was not changed to accommodate that renderer.

**A live application walkthrough remains unverified.** The Sites managed-preview workflow requires the `control-browser` capability, which is unavailable in this session. That workflow requires skipping browser QA rather than starting an alternative browser route. The earlier supported preview attempt was unreachable and a subsequent operation was rejected by browser security policy. No alternate browser, tunnel, raw CDP route or shell screenshot was used. This release therefore does not claim browser acceptance or Orbus feature parity.

## Verification

`verification.json` records the focused checks actually run for rc38. They cover six diagram readability groups across the offered views in all 11 chapters, 12 Layers groups, ten Arrange groups, ten native connection groups, 80 reference/blank Work section transitions, 28 editor entry/cancel paths including unsaved-change handling, and relationship-grounded Specification checks. These tests exercise native handlers, canonical identities and model-write boundaries.

`notation-layout-validate.mjs` is not recorded as an unqualified pass: its second-process digest comparison receives empty captured output from the environment's subprocess wrapper. The exact determinism workload was run in two independent supported processes; both produced `1d73069ebc75a5768783eeaede244c61f9b30fe91928db73856041f5f96722ba`. The test was not relaxed.

Direct syntax parsing passed for 865 application, service, script and verification modules. Changed-track lint evidence is distinguished from preexisting findings; the repository lint baseline was not increased and whole-repository lint cleanliness is not claimed. The normal private Worker build passed, validating 243 packaged server modules, imports, plain/gzip asset bytes and ETag behavior.

## Performance and source integrity

No runtime dependency was added. Chapter code measures 3,114,012 bytes, up 14,171 bytes (about 0.46%) from rc37. CSS measures 866,189 bytes, up 11,946 bytes (about 1.40%). Only the chapter and CSS ceilings were moved to their next whole KiB; all other bundle budgets remain enforced. Final production measurements are in `client-size-report.json`.

`SOURCE-MANIFEST.json` verifies the delivered source. Its parent-commit field avoids a circular hash; the exact Git archive and publication receipt identify the final pushed commit. The build completed before audit documents and the integrity manifest were finalized; those files are not runtime build inputs.

## Standards and interaction references

TOGAF supplies the architecture method and concern/viewpoint framing; ArchiMate supplies modeling concepts and relationships. This release uses that distinction rather than calling a drawing layout a TOGAF notation or claiming formal conformance. Orbus's progressive object exploration, grouping, fit/reset and conventional layouts informed the interaction approach.

- [The Open Group — TOGAF](https://www.opengroup.org/togaf)
- [The Open Group — ArchiMate 101](https://archimate-community.pages.opengroup.org/workgroups/archimate-101/)
- [The Open Group — ArchiMate 3.2 reference cards](https://www.opengroup.org/sites/default/files/docs/downloads/n221p.pdf)
- [Orbus — Using Impact Explorer](https://support.orbussoftware.com/hc/en-us/articles/30456793367325-Using-Impact-Explorer)
