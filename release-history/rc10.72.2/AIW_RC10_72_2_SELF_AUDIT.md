# rc.10.72.2 Self-Audit

## Audit question

Did this release actually recover the product, or merely place another layer over rc.10.72.1?

## Verdict

**Structural recovery, not a compatibility overlay.**

The recovery changes the source of interaction ownership and removes superseded surfaces. It does not preserve old UI contracts through hidden aliases or CSS shims.

## Source delta from rc.10.72.1 baseline

The tracked source comparison before final reports contained:

- 67 modified/deleted tracked files;
- approximately 4,803 added lines;
- approximately 3,243 deleted lines;
- 17 new untracked source/evidence files at the comparison point;
- one 533-line rc.10.72.1 navigation stylesheet deleted;
- six superseded executable UI tests removed from the active test directory.

The largest changes are concentrated in the actual product surfaces: Guided Delivery, Sol, canvas rendering, Review, Output and navigation—not only in release reports.

## Non-patch tests

| Test | Result |
|---|---|
| Is there one new wrapper while old panels still execute? | No. Guided stages expose one Sol drawer; old identities are not rendered in parallel. |
| Were old navigation rules merely overridden? | No. The rc.10.72.1 owner stylesheet was deleted and the recovered rail has one explicit state model. |
| Was Stage Co-Author hidden but still embedded in Output? | No. Output uses model-grounded rationale evidence and directs challenge to Sol Ask. |
| Was the old Generative Cursor restored under another label? | No. It remains the governed design implementation but is exposed as compact Sol Design; old multi-mode UI contracts were retired. |
| Were failing historical tests patched with compatibility classes? | No. Superseded tests were retired with replacement mappings and retained under release history. |
| Was exact lifecycle context fixed at the source? | Yes. The backend request contract and context assembler preserve Requirements, Quality and Context semantics. |
| Was Review only restyled? | No. The page interaction changed to task lenses and queue/detail selection. |
| Is canonical model mutation still governed? | Yes. Preview, revision checking, validation and explicit acceptance remain. |

## What remains inherited

The release intentionally retains substantial platform foundations:

- canonical model and project store;
- Architecture Brain Orchestrator;
- Pattern DNA;
- Mind Factory and signed knowledge;
- Requirements Intelligence and Journey Atlas;
- Architecture Context Graph;
- Viewbook and SDD generation;
- role and governance infrastructure.

Retaining these is not considered patching because they remain the authoritative platform layers. The recovery changes how they are composed and experienced.

## Regression evidence

A clean project was created after the refactor and progressed through Requirements, journeys, System Context and four modelling stages to Review and SDD. This proves that the recovered journey is not only a static shell around old pages.

## Honest finding

The product is materially clearer, but not all legacy density has disappeared from specialist and administrative areas. rc.10.72.2 focuses on the primary Solution Architect journey. The same product grammar should be extended to other role surfaces only after the recovered journey is accepted by users.
