# Sol's checks and Sol on every chapter — implementation plan (v20.4)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source v20.4, on v20.3 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-sol-checks-and-coverage`, from `dfce154` |
| Date | 27 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` stays `false`. |

## What the sponsor approved

These come from the live comparison of v20.3 (`release-evidence/sol-direct-comparison/ANSWER_REVIEW.md`):

1. Set aside a threat proposed for a decision that takes none, instead of withholding the whole assessment.
2. Let the checks read a question as a question, and catch "ensuring" and the other tenses of a guarantee.
3. Stop trusting a second-pass check that contradicts itself.
4. Stop presenting the SA Playbook's example load as a teaching project's own.

The sponsor added one requirement: on every model and every page of every chapter, the LLM can interpret what it is given and provide the response the page displays to the architect.

## How

1. **Set-aside threats.**
   - `validateReasoningOutput` sets such threats aside with their titles and a reason, as the guard already does for a guarantee-worded refinement. The advice stands.
   - The desk's renderer lists them under "Set aside".
2. **Questions and tenses.**
   - `overclaim` skips a sentence that ends in a question mark.
   - It reads guarantee, ensure, achieve and prove in every tense, including "ensuring".
3. **Self-contradicting second passes.**
   - The second pass on both of Sol's paths returns `defects` and `notes` instead of `issues`. The concrete defects decide.
   - A defect that only affirms support is read as a note.
   - When the flag disagrees with the defects, the disagreement is recorded, and it is shown on the assessment rather than relied on.
4. **The Playbook's example load.**
   - The capacity model says when its objective is the SA Playbook's example. It reads the workload a project records in its own drivers, such as "10 applications per second".
   - Every reason, and the basis a capacity fix writes into the project, names the example.
   - Where the project records a different workload, the capacity fix title says it is for the example load.
   - Sol's packet marks the objective as the example and says what the project records instead.
   - A deterministic check withholds advice that sizes such a design for the example: taking or adjusting an example-sized capacity draft, or setting a knob to one of the example's figures.
   - The bank reference records no workload of its own, so it keeps its titles and its advice.
5. **Every chapter.**
   - Inventory every chapter, page and model where Sol can be asked, through either path, and every record type the project holds.
   - Close any gap where a record cannot reach Sol, or a response kind cannot be displayed.
   - Prove it in three ways:
     - a model check that builds, answers, checks and renders a request for every target kind on every chapter against the test double;
     - rendered checks on the chapter pages;
     - a live run of one target of every kind on the configured model.
6. **Correction.**
   - The v20.3 reading said the bank payment reference records its own objective. It does not: all three evaluation designs size for the Playbook's example.
   - The bank reference records no competing workload; the teaching designs record 10 and 20 requests a second.
   - The v20.3 evidence gets a dated correction; nothing is rewritten.

## Verification

- `test:sol-checks` for the four fixes.
- A chapter-coverage suite.
- The existing suites that touch the checks, updated to the new second-pass contract.
- The full regression, including the browser suites.
- The live coverage run and the live held-out comparison, with the sponsor's supplied key loaded straight into the process.
- The package with SHA-256, a clean extract, and a secret scan of the diff.

## Not in scope

Changing the held-out expectations, independent review, and model pinning.

## Added after the live runs

The live runs on the fixes showed that the checks still cost right answers. Each change below was measured on the kept answers of every live run before it was committed.

1. **The guard's reading.** The run on `d0fb283` withheld 11 of 28 answers. Eight of those were right drafts, withheld because the guard read advice as a claim, or read a draft's own value restated in another unit as an invented number.
   - The guard now reads each use in its sentence.
   - The restated value counts as the draft's own, in the guard and in the scorer.
   - Checked against all 4,242 sentences of the four live runs; each sentence that now passes was read as advice (`5d0e67f`, `3a3ebce`).
2. **One refinement costs only itself.** The coverage run on `4c89871` withheld two Chapter 8 assessments for one refinement each: an over-long key, and a reason claiming "ensures compliance". Such a refinement is now set aside (`3a3ebce`).
3. **Kept evidence.**
   - The coverage report keeps a withheld assessment's draft (`4c89871`).
   - `--recheck` passes a kept report's answers through today's checks (`f7f563f`).
   - The control arm's text values count as its own numbers in the scorer (`7082246`).
4. **The final reading.** The last live run was on `4c89871`. Its kept answers were read with the final checks, and the engineer read every pair (`AFTER_FIXES_REVIEW.md`).
