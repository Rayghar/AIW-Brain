# A click race in the browser suites

## Symptom

`test:brain-reasoning-browser` failed intermittently at its third check (line 74). After Sol's refinement was applied through the change review, the suite cleared the desk's selection. It then waited 15 s for the steps panel, which never came back.

| Build | Runs | Failed at line 74 |
|---|---|---|
| v20 (the package extract, `3a6a336`), before the harness fix | 5 | 1 |
| v20.1 (`86d605a`), before the harness fix | 6 | 4 |

The mechanism below is the same in both builds. The difference in rate is not explained by the Sol-check changes, which do not touch how the desk redraws, and the samples are small.

## Diagnosis

`diag-click-race.mjs` replays the suite's first three steps with a fresh server and database each time, including its real mouse clicks. It prints the page's state whenever the steps do not return. Before the fix, 6 of 22 replays failed, and every failure showed the same thing:
- The crumbs still read `Vitals › RUN-001 · Capacity`: the clear never took effect.
- No click event reached the document, and no selection change ran.
- The element the suite clicked was **detached**: `{"connected": false, "inDesk": false}`.
- A second click on the clear crumb brought the steps back every time.

The suites' helper was `page.$eval(sel, e => e.click())`. Playwright resolves the selector first and runs the function in a later step. If the desk redraws between the two, the click lands on a replaced element and goes nowhere. Here the redraw is the cell's pulse ending 2.6 s after the change review. A person cannot click a detached element, so this is a race in the test harness, not a product defect.

## Fix

The helper now finds and clicks in one page task (`page.evaluate`), so no redraw can fall between the two. No assertion changed. The same helper was in five browser suites, and all five are fixed: brain-reasoning, chapter-sol, stewardship, desk and knowledge-repository.

## Verification after the fix

On v20.1 with the fixed helper:
- `test:brain-reasoning-browser` passed 5 of 5 runs, 7 checks each. One run took 249 s under load.
- `test:chapter-sol-browser` passed with 10 checks, `test:stewardship-browser` with 5, `test:desk-browser` with 16, and `test:knowledge-repository-browser` with 6.
