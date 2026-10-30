# AIW v0.10.0-rc.10.73.42: owner decisions and implementation plan

**Date:** 2026-10-30
**Source line:** AIW v0.10.0-rc.10.73.41. AGENTS.md names AIW v0.10.0-rc.10.73.6 as the controlling baseline.
**Branch:** `claude/dazzling-cerf-a3qshh`. This session may push only this branch, so it also serves as the release branch.
**Baseline checkpoint:** the commit that adds this file.

## 1. Owner decisions recorded

The owner answered the three decisions in the handbook gap review (`audit/rc41/handbook-review/AIW-HANDBOOK-GAP-REVIEW-2026-10-30.md`, section 5) with: "yes to all decisions."

| # | Decision | Recorded as | Authority and true status |
|---|---|---|---|
| 1 | Whether the handbook content may be imported into AIW | **Yes.** The owner confirms permitted use of the 27 reviewed handbooks for import into AIW's governed knowledge. The files are identified by SHA-256 in `handbook-source-hashes.json`. | This is the owner's statement of permitted use. **Licence counsel has not reviewed it** (status: not engaged), and AIW and this session did not grant it. Imported entries still enter as candidates. Each needs a second authorised person to release it. That person is not yet assigned. |
| 2 | Whether to go ahead with the defect fixes (D1–D20) as the next release | **Yes.** Release number: **AIW v0.10.0-rc.10.73.42**. | Owner decision. **Correction:** the review proposed "rc.10.73.7", which overlooked that the source line is already at rc.10.73.41. The next number in the required notation is rc.10.73.42. The owner may still choose another number before packaging. |
| 3 | Whether the first library slices are the Application Architecture Master and Enterprise Component Library Parts 1 and 3 | **Yes.** | Owner decision. The import comes after the foundations (plan step 3). |

productionAccepted stays false.

## 2. Plan

### Step 1: rc.10.73.42 integrity fixes (D1–D20)

These are the defects listed in section 3 of the review. Rules for every fix:
- Write a test that reproduces the defect and fails before the fix.
- Make the smallest fix that removes the cause.
- Migrate and retire the old path where the review says so (D9, D7, D14). Do not run old and new side by side.
- Never weaken an existing test. An assertion may be replaced only by one at least as strict, recorded old → new.
- Keep the doctrine: Sol proposes only; a second person approves; no evidence is invented.

| Group | Defects | Main areas |
|---|---|---|
| G1 | D1, D2, D3 | Chapter 7 approval actor and four eyes; no recording a selection without assessments or with pending hard gates; the SDD prints only recorded selections as design basis |
| G2 | D4, D11 | Withdrawn or unreleased library entries cannot be proposed; project-library approval needs a second person; archetype proposals stop carrying template and wrong-kit content into designs |
| G3a | D5, D13 | Residual-risk approval by a person other than the acceptor; hard-constraint and invariant findings cannot be treated away as limitations |
| G3b | D6, D15 | No trace review on a broken trail; a delivery action cannot be marked Verified by its own author |
| G3c | D14 | Recording evidence no longer makes the approved design stale (evidence outside the design fingerprint, with a migration) |
| G4 | D7 | One trace kernel behind the trail, desk, narrative, design index, ARS and SDD journey line, with a consistency test |
| G5 | D8, D10, D17, D18 | Availability counts independent failure domains; drafter environments per stage; open RTO/RPO kept; placeholders never satisfy checks; no payment wording outside payment projects |
| G6 | D12, D16 | ArchiMate import mapping (Gap, Capability); BPMN import placeholders and default flow |
| G7 | D9, D19, D20 | Chapter 8 authority as the only ownership edge (migration); recovery proposal source chosen by a person; read-only contracts declared safe to repeat |

**Before release:**
1. Clean install.
2. Build, within the bundle budget.
3. Focused tests per group.
4. Full regression.
5. Browser (Playwright) tests.
6. Security and integrity gates.
7. Evidence and SHA-256 manifest.
8. Final diff review.

Each unresolved item is stated plainly.

### Step 2: foundations

- F15: decision rights and standards register.
- F7: business-service record and workload model.
- F13: evidence ladder and claim register.
- F1: library record kinds, Playbook–catalogue crosswalk and intake. The intake starts with the licence record above.

### Step 3: library slices, as candidates

1. Application Architecture Master and Enterprise Component Library Part 1.
2. Enterprise Component Library Part 3 (deployment blueprints and platform components).

Every entry stays a candidate until a second authorised person releases it.

### Step 4 onwards

F2 → F3 → F4, then F5 and F10, then method depth, then delivery and assurance, as in the review's section 5.
