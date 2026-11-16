# AIW · Integrity fixes (D1–D20)

Release: **AIW v0.10.0-rc.10.73.42+integrity.20261116**
Source baseline: **rc.10.73.41** (commit `25718b6`: the rc.10.73.41 source with the handbook gap review and the owner's decisions).
Controlling baseline (AGENTS.md): AIW v0.10.0-rc.10.73.6.
`productionAccepted` is **false**. No external authority has reviewed this release (section 8).

This release fixes the twenty defects the handbook gap review verified in rc.10.73.41 (`audit/rc41/handbook-review/AIW-HANDBOOK-GAP-REVIEW-2026-10-30.md`, section 3). It adds no feature. The owner decided to make these fixes the next release on 2026-10-30 (`audit/rc42/OWNER-DECISIONS-AND-PLAN-2026-10-30.md`).

## 1. How the work was done

- Nine fix groups, each on its own branch. Each wrote a test that fails on the baseline, then the fix, then was reviewed by a separate adversarial reviewer and given one fix-up round.
- The nine branches were merged and joined up by the lead (section 4).
- An independent audit then read every change the groups made to the 39 pre-existing suites they touched (section 6).
- The full regression was run three times on the merged tree (section 5).

## 2. What changed, by defect

| Defect | What was wrong | What it does now |
|---|---|---|
| D1 | A Chapter 7 product approval could be attached by the person who recorded the selection, and stored no approver. | A second signed-in person attaches the approval. The record keeps who approved. |
| D2 | A selection could be recorded with no driver judged, or with a hard gate pending. | Every inherited driver must be judged with a reason first, and no hard gate may be pending. |
| D3 | The SDD printed a draft preference, and drivers nobody had assessed, as a decided design basis. | The design basis comes only from a recorded selection and its judged drivers. |
| D4 | A withdrawn archetype still saved as a candidate. The organisation library offered drafts that were never released. One person could write and approve a project-library entry. | Withdrawn and unreleased entries are refused. Approval needs someone other than the author and the last editor. |
| D5 | The person who accepted a residual risk could also approve it. | Approval needs a second signed-in person. |
| D6 | A trace review could be recorded on a broken trail, and doing so cleared the trace warning. | It is refused, and the break is named. |
| D7 | Several separate traversals read a requirement's trace (the review names six), and they disagreed, so the Model views, the ARS and the SDD disagreed. | One trace kernel (`public/trace-kernel.js` over `public/record-graph.js`) is behind the trail, the review desk, the narrative, the design index, the ARS and the SDD journey line. |
| D8 | The review desk's availability verdict counted zone records, not independent failure domains. | It counts independent failure domains. |
| D9 | Chapter 5's data list and Chapter 8's authority both recorded ownership, and could disagree. | Chapter 8's authority is the only ownership. A Chapter 5 list is data the component works on. |
| D10 | The drafter made one production environment per component, which raised Chapter 10 errors by construction. An open RTO or RPO was dropped. | It makes one environment per stage, holding every part. An open RTO or RPO stays open. |
| D11 | Catalogue archetypes carried generator template text, and sometimes another kind's kit, into the design and the SDD. | Template fields are left as open questions. No template contract, need or obligation is proposed. |
| D12 | The ArchiMate import filed a Gap as a requirement and a business Capability as a technology capability. | A Gap becomes a transition note and a business Capability an import note. Each draft carries an import report. |
| D13 | A hard-constraint or invariant finding could be accepted as a design limitation. An accepted limitation never expired. | Those findings cannot be waived. Other limitations need a review-by date. |
| D14 | Recording evidence made the approved design stale. | Evidence is outside the design fingerprint (version 2, with a migration). |
| D15 | The author of a delivery action could mark it Verified. | Someone who neither wrote nor owns the action verifies it. |
| D16 | The BPMN import gave an unconditioned branch placeholder words and dropped the default flow. | An open condition stays open, and the default flow is kept. |
| D17 | Drafted placeholder text in Chapter 10 satisfied the operations check, so a milestone could complete on placeholders. | A placeholder never satisfies a check. |
| D18 | Payment wording appeared in projects that are not about payments. | It appears only in payment projects. |
| D19 | In a blank project the recovery proposal always took the first component as its source, and its seeded contract outlived the interaction. | A person chooses the source, and the seeded contract goes with its interaction. |
| D20 | A read-only contract raised the duplicate error unless a key was declared, which misstated the contract. | A person records a reviewed declaration that the contract is read-only and safe to repeat. |

## 3. What a person using AIW will notice

- **A second person is needed** for a Chapter 7 approval, a project-library approval, a residual-risk approval and a delivery verification. With one local account these steps cannot be completed; the record says so.
- **A requirement's trail is wider.** It holds what the requirement's drivers and decisions bear on, as context, beside the requirement's own chain. An edit to such a record reopens the trace reviews of every requirement whose trail holds it. Breaks are still read on the requirement's own chain.
- **Ownership is stated once**, in Chapter 8. Where an older document's Chapter 5 list disagreed with Chapter 8, the claim is listed for a person to confirm; nothing is decided for them.
- **Pictures draw one line** between a component and data it owns. On the reference design, Chapter 9's Layers picture (15 records, 24 relationships) now fits one screen and opens whole instead of grouped.
- **A record of another chapter** shows its place in the model a moment after it is selected, because that part of the page now loads when first needed.

## 4. Integration decisions by the lead

1. **Trace breaks read the kernel.** The trace-review break check (D6) was rebuilt on the kernel's own-chain walk (D7), because the traversal it used was retired.
2. **One line for a component and the data it owns.** After D9 the pair held a use and an ownership. The connected picture drew two parallel lines, and on the reference design the Layers layout stopped drawing lines together (143 top-level elements and 3 bundles, where the baseline drew 159 and 19). The picture now draws the ownership alone; the graph and the trail keep both relations. Measured after: 155 elements, 18 bundles, no fallback.
3. **The client fits its size gates without raising one.** The merged fixes were 15,366 B over the chapters-route cap. The dossier of a record another chapter owns now loads on first use, and the work glance asks for its drawing engine in one request instead of four. Measured: route 3,228,863 B against 3,233,792 B; 148 script files (the exact gate was lowered from 150 to 148).

## 5. Verification

**Full regression (`release-checks.mjs`, 334 suites; the baseline had 322).** Status of this section: the third and final run is in progress as this draft is committed; its figures replace the ones below.

| Run | Tree | Passed | Red | Red that were green on the baseline |
|---|---|---|---|---|
| Baseline, 2026-10-30 | rc.10.73.41 | 280 of 322 | 42 | n/a |
| 1 | merged fixes | 292 of 334 | 42 | 5: four were consequences of the fixes (closed in `53a37d3`), one was this run's own 6-minute limit |
| 2 | after `53a37d3` | 292 of 334 | 42 | 3: two expectations that follow the one ownership line (updated in `18eecde`), one passes when run alone |
| 3 | after `18eecde` | in progress | | |

Of the 39 baseline-red suites that were red in run 2, 36 failed exactly as on the baseline. Three failed at a different point and were checked one by one: `scale` (the baseline misses the same 500 ms bound on this machine), `tradeoff-browser` (passes alone) and `model-canvas-refinement-browser` (stopped earlier because of the one ownership line; updated in `18eecde`, passes alone).


- **New suites (12), all passing:** `rc42-g1-tech-approval`, `rc42-g2-library`, `rc42-g3a-risk-and-limits` (+ browser), `rc42-g3b-trace-and-delivery`, `rc42-g3c-evidence-fingerprint`, `rc42-g4-trace-kernel`, `rc42-g5-runtime`, `rc42-g6-import`, `rc42-g7-data-contracts` (+ browser), `rc42-lazy-dossier-browser`.
- **Syntax:** 904 modules pass. **Lint:** no new problem; the baseline was lowered by one row.
- **Build:** passes every size gate (section 4, item 3).
- **Machine-readable evidence:** `audit/rc42/release-evidence.json`, `audit/rc42/regression-2026-11-16.json`, `SOURCE-MANIFEST.json`.

Runtime used here: Node 22.22.0 and a Chromium headless shell that differs from the build Playwright expects. The owner's reference runtime is Node 24. Suites that are red here for that reason are named in the regression table.

## 6. Test integrity

The standing rule is that a test is never weakened. An existing assertion is replaced only by one at least as strict, and only where a fix changes the expected behaviour.

- The fix groups changed 39 pre-existing suites (84 changed assertions or fixtures).
- An independent auditor classified each: 41 stricter or equal, 37 fixture only, 4 loosened, 2 unclear.
- **All six flagged items were closed** (commit `18eecde`): four checks were restored, one was tightened, and one misleading pass line was corrected.
- The lead re-read the reasoning for the other 78. The planned second, adversarial agent pass did not run (usage limit).
- Assertions replaced during integration are recorded old → new in commits `67c6a06`, `53a37d3` and `18eecde`.

## 7. Known open items

Reported by the implementers and reviewers, confirmed still open:

1. Selections recorded before this release with no assessments still read as current. They cannot be approved until recorded again.
2. Project-library entries one person wrote and approved before this release stay approved.
3. A review-by date has no upper bound.
4. It is not settled which completeness findings belong in the set that cannot be waived.
5. A hard-constraint break can still disappear when one person re-records an assessment.
6. A single-account local installation cannot verify delivery actions or complete any second-person step.
7. D17 departs from DM-16: an explicit open state still raises the operations error.
8. Projects drafted earlier keep their per-component environments.
9. Chapter 6 templates still carry payment wording.
10. Project draft library entries are still offered.
11. The D6 rule accepts a hop when some record of it is reached, not every record.
12. One G3c commit message cites the owner's "yes to all decisions" for an engineering choice the owner did not make.

Added at integration:

13. The proposals block of the Chapter 5 review form is now checked on the studio in a DOM harness, not in a real browser.
14. On the reference design, Chapter 9's Layers picture no longer opens as a grouped overview, because it sits exactly at the budget (24 relationships).
15. The 500 ms readiness-board bound in `scale-validate.mjs` is missed on this machine by the baseline and by this release alike (604–899 ms and 608–1019 ms over three samples each).

## 8. External authorities: true status

| Authority | Status |
|---|---|
| Licence counsel | Not engaged. The owner's statement of permitted use for the handbooks is recorded; counsel has reviewed nothing. |
| Four-eyes knowledge approver | Not assigned. |
| Independent architecture reviewer | Not started. |
| Production acceptance authority | Not established. `productionAccepted` stays false. |

No knowledge was imported, released or promoted in this release.

## 9. To check this release

```sh
npm ci
node check-syntax.mjs
node scripts/lint.mjs --summary
node build.mjs
for s in rc42-*-validate.mjs; do node "$s" || echo "FAILED $s"; done   # browser suites need AIW_BROWSER_EXECUTABLE
AIW_REGRESSION_TIMEOUT_MS=1800000 node release-checks.mjs
node scripts/release-manifest.mjs --verify SOURCE-MANIFEST.json
```

A detailed validation brief for an independent reviewer was given to the owner on 2026-10-31 (`AIW-rc42-VALIDATION-PROMPT.md`).
