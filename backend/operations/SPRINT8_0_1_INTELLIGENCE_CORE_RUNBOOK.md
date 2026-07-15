# Sprint 8.0.1 Intelligence Core and Co-Architect Runbook

## 1. Verify the release

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run intelligence:gate
npm run sprint8_0_1:verify
npm run security:check
npm run architecture:gate
npm run e2e
npm audit --audit-level=high
```

The intelligence gate must report all checks passing. Do not promote a release when the semantic gate is red, even when ordinary feature tests pass.

## 2. Configure the model brain

The workbench remains operational without a model. To enable the embedded co-architect, configure a route for `architecture-reasoning` and `recommendation-explanation`.

Example environment configuration:

```bash
AIW_LLM_PROVIDER=openai
AIW_LLM_MODEL=gpt-5.6-sol
AIW_LLM_PROTOCOL=responses
OPENAI_API_KEY=...

AIW_LLM_ARCHITECTURE_REASONING_PROVIDER=openai
AIW_LLM_ARCHITECTURE_REASONING_MODEL=gpt-5.6-sol
AIW_LLM_ARCHITECTURE_REASONING_API_KEY_ENV=OPENAI_API_KEY

AIW_LLM_RECOMMENDATION_EXPLANATION_PROVIDER=openai
AIW_LLM_RECOMMENDATION_EXPLANATION_MODEL=gpt-5.6-sol
AIW_LLM_RECOMMENDATION_EXPLANATION_API_KEY_ENV=OPENAI_API_KEY
```

Equivalent provider IDs are `xai`, `gemini`, `qwen`, `deepseek`, `custom-openai` and `local-openai`.

For a local OpenAI-compatible endpoint:

```bash
AIW_LLM_ARCHITECTURE_REASONING_PROVIDER=local-openai
AIW_LLM_ARCHITECTURE_REASONING_BASE_URL=http://localhost:11434/v1
AIW_LLM_ARCHITECTURE_REASONING_MODEL=<approved-local-model>
AIW_LLM_RECOMMENDATION_EXPLANATION_PROVIDER=local-openai
AIW_LLM_RECOMMENDATION_EXPLANATION_BASE_URL=http://localhost:11434/v1
AIW_LLM_RECOMMENDATION_EXPLANATION_MODEL=<approved-local-model>
```

## 3. Data-classification controls

- Default co-architect calls use `internal` classification.
- Routes must explicitly allow the classification.
- Do not configure public SaaS routes for restricted architecture data.
- Use local or enterprise-hosted routes for restricted designs.
- Prompts are not logged by default.
- Secrets are referenced by environment-variable name, not stored in project data.

## 4. Exercise the contextual guide

1. Open Design Brief and clear the problem statement, objectives or constraints. Confirm the guide appears next to the missing input.
2. Move to Quality Drivers. Confirm only calibrated controls are enabled.
3. Assign a calibrated weight. Confirm the guide can identify the leading eligible style.
4. Open a canvas stage. Confirm canvas guidance appears above the working area.
5. Select an object and open Inspect. Confirm scope-specific guidance appears in the inspector.
6. Accept a pattern with obligations. Confirm an obligation guide appears.
7. Open Review and Realize. Confirm deterministic findings take priority.
8. Dismiss a noncritical guide item. Confirm it remains dismissed for the current workspace session.

## 5. Exercise the embedded co-architect

### With a configured model

- Open the Co-Architect panel.
- Ask about the current stage and selected object.
- Confirm the result says `llm-assisted` and records provider/model trace.
- Confirm citations resolve to supplied knowledge IDs.
- Run `Review with AI co-architect`.
- Confirm every returned proposal is reversible, uncselected by default and evidence-linked.
- Confirm no delete operation or LLM-created HARD finding is present.

### Without a configured model

- Remove model credentials or disable the route.
- Ask the same question.
- Confirm deterministic fallback answers remain available.
- Run the assisted audit and confirm deterministic validation still completes.

## 6. Quality-calibration governance

The twelve pending quality attributes must not be enabled by simply adding arbitrary numbers. Promotion requires:

1. An evidence-backed cross-style calibration matrix.
2. Architecture-expert review.
3. Reference scenarios and expected ranking effects.
4. Sensitivity analysis.
5. Disagreement and confidence recording.
6. Regression tests proving the new driver changes appropriate outcomes without destabilizing unrelated scenarios.
7. Knowledge-release approval.

## 7. Release incident controls

If a recommendation regression is detected:

1. Disable the affected calibration profile or style record.
2. Revert to the previous approved knowledge release.
3. Keep deterministic validation available.
4. Disable external model routes if model output contributed to confusion.
5. Preserve request fingerprints, model traces and architecture revisions.
6. Add the incident as a permanent semantic regression test before re-release.
