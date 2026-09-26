# Sol's checks — implementation plan

Controlling baseline: **AIW v0.10.0-rc.10.73.6**. Branch: `release/aiw-v0.10.0-rc.10.73.6-sol-check-fixes`, from the v20 release at `1c32f9c`.
Product source: AIW V5 Local Source v20. The result is packaged as **v20.1**. It takes nothing from the separate v21 line, which the sponsor set aside.

## Why

A live evaluation in another workspace, against a v19-based build, reported three defects in how the product checks Sol's answers. v20 never changed those files (`public/brain-reasoning.js`, `intelligence-provider.js`, `intelligence-service.js`), so it has the same code. Each defect is reproduced here with a failing test before it is fixed.

1. **The output validator loses the whole batch over one oversized field.** `validateReasoningOutput` throws on any text over its limit (a reasoning over 1,800 characters, a headline over 240), on a list over its limit (a fifth risk), and on a duplicated decision. `requestReasoning` turns any throw into `invalid_output`, so all of a request's decisions (up to eight) go unanswered. The provider's strict schema bounds assessments, refinements and proposals, but not text length or the risks and questions lists. The client is then told only that the response "did not pass source and structure checks".
2. **The second pass is mis-calibrated.** `REVIEW_INSTRUCTIONS` never says that gaps in the design itself are not defects in the advice, or that refinements are proposals the architect reviews, not claims of an achieved outcome. The reported live run rejected sound assessments because the design had gaps.
3. **The guarantee rule withholds whole assessments over drafted wording.** `guardReasoning` checks refinement wording in the same loop as the reasoning. So "…to ensure availability" inside a proposed scaling policy withholds the entire assessment, including correct numbers.

## Fixes

1. **Validator.** Only a broken structure fails a response: a missing or unexpected key, a wrong type, or a source outside the packet in the response's own citations.
   - Advice text over its limit is cut at the last sentence that fits. Lists are cut at their limit (four risks, four questions). Each assessment names what was shortened, and the workbench shows it.
   - A duplicated assessment, or one for a decision outside the packet, is set aside and named. The others stand.
   - An assessment that cites a source outside the packet, or has an empty headline or reasoning, is withheld on its own; the rest of the batch stands.
   - Refinement values keep their rules. A number outside its bounds, or wording longer than the field allows, withholds that assessment as before: they are values the design would take.
   - The schema also bounds risks and questions to four each, so a compliant model stays within limits at source.
   - The server returns the validator's own reason with a failed request as `detail`, and the workbench shows it.
2. **Second pass.** The review instructions state what is a defect in the advice and what is not.
   - Not defects: the design's own gaps, risks and failing readings (naming them is the assessment's job); evidence still to be gathered, when the assessment says so; unapplied refinements; a verdict the reviewer would not have chosen, when the packet supports it.
   - The drafting instructions ask for refined wording as what a part does, not what it ensures.
   - This fix can only be shown by a live model. The suites prove the instructions say it, not that a model follows them.
3. **Guarantee rule.** Wording that presents a guaranteed or verified outcome in the assessment's own text (headline, reasoning, risks, questions, reasons, proposed threats) still withholds the assessment. A drafted refinement whose wording does so is set aside on its own, shown with the reason, and never applied; the rest of the advice stands.

Set-aside refinements and shortened fields are not sent to the second pass as advice, and nothing set aside can be used or applied.

## Verification

- Failing tests first, in `brain-reasoning-validate.mjs`: size overruns, a duplicate assessment, guarantee wording in a refinement, the batch surviving an oversized field end to end through `requestReasoning`, and `detail` through the server route. The same tests then pass after the fix.
- Existing suites: `test:brain-reasoning`, `test:chapter-reasoning`, `test:stewardship`, `test:sol-evaluation` and `test:brain-ahead`.
- Browser suites that render Sol's assessments: `test:brain-reasoning-browser`, `test:chapter-sol-browser`, `test:stewardship-browser` and `test:desk-browser`.
- The full regression, and the v20.1 package with SHA-256 from a clean extract.

## Boundaries

- No live provider call is made here without the sponsor's go-ahead. Fix 2 is only shown by a live run.
- No expert review of advice quality is claimed. `productionAccepted` stays `false`.
