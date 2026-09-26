# Sol against a direct LLM — implementation plan (v20.3)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source v20.3, on v20.2 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-sol-direct-comparison`, from `962fb5e` |
| Date | 26 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` stays `false`. |

## Why

The live Sol evaluation of 26 September (`release-evidence/knowledge-four-eyes/LIVE_SOL_EVALUATION.json`) left three questions the sponsor asked to settle:

1. **The scorer is wrong in two ways.**
   - It reads citation labels such as `S13` as numbers. The guard's own number pattern does not.
   - It flags every use of "guarantee", where the guard deliberately passes negated or hedged sentences.
2. **The answers cannot be checked directly.** The report keeps scores, not Sol's wording, and a withheld assessment keeps nothing of what was withheld.
3. **Nothing shows what the Brain adds.** There is no measurement of the same model answering the same questions without the Brain.

## What changes

1. **Scorer** (`sol-evaluation.js`):
   - Numbers use the guard's boundary, so a digit run inside a word or label is not a number.
   - A forbidden phrase counts only when its clause asserts it. A negation or hedge before it in the same clause ("does not guarantee", "no guarantee", "until a load test replaces it") passes.
   - Every flag records the sentence that raised it.
   - The dataset and its expectations are unchanged, and so is its digest.
2. **Answers kept.**
   - Each shown assessment keeps its headline, reasoning, risks, questions, refinements, proposals, preference and citations.
   - Each withheld assessment keeps the draft that was withheld, taken from the grounding review, with the issues that withheld it.
3. **A direct-LLM control arm.** It uses the same provider, model, verdict vocabulary and answer format, but not the Brain:
   - **It receives only:**
     - the project's own description;
     - each decision's title and draft values;
     - for a recorded architecture decision, its question, context and alternatives.
   - **It does not receive:** readings, the objective and assumptions, drivers, mechanisms, tactics, governed knowledge, Sol's instructions, the guard, the second pass or the chapter rules.
   - **Scoring:** it is scored by the same scorer. Its numbers count as supported only when they appear in what it was given.
   - **Measurement only:** the Brain's deterministic checks are applied to its answers, without its missing citations, to count what the Brain would have withheld. Nothing is withheld from it.
   - **Access:** the application never calls it. `intelligence-provider.js` exports it for the evaluation alone, and a check proves that only the evaluation imports it. `requestReasoning` stays the only way the product reasons.
4. **Paired comparison.** Case by case, the report sets the Brain's verdicts, withholding and flags beside the direct arm's.
5. **Reading the answers.** The engineer reads every answer pair and records a judgement. It is the engineer's reading, not independent review.

## Verification

- `test:sol-evaluation`, extended with these checks:
  - citation labels are not numbers;
  - negated guarantees pass;
  - flags carry their sentences;
  - withheld drafts are kept;
  - the direct request carries no packet or Sol instructions;
  - only the evaluation imports the control arm;
  - the comparison pairs every case.
- Focused suites that touch the provider and reasoning path.
- The full regression, the browser suites, the package with SHA-256, a clean extract, and a secret scan of the diff.
- The live run of both arms, with the key the sponsor supplied loaded straight into the process and its temporary copy deleted afterwards.

## Not in scope

Changing Sol's instructions or guards to withhold less, changing the dataset's expectations, and model pinning. The comparison informs those next steps.
