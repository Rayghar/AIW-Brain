# AIW rc.10.48 Acceptance Criteria

## Functional acceptance

- Changing quality driver weights changes recommendation ordering.
- Selecting an architecture style changes visible pattern/component fit.
- Accepting a pattern creates obligation signals.
- Missing interfaces appear as object-level badges or Info Center findings.
- Co-Architect prompts are stage-aware.
- Mind Factory posture can reduce/increase confidence.
- Stage health chips show the most important signals only.

## UX acceptance

- The canvas remains the dominant work area.
- No long intelligence paragraphs are shown by default.
- Full reasoning is hidden behind Info Center, Decision Radar, or Co-Architect.
- Visible signals respect the noise budget.
- Hover/tooltips explain compact badges.
- User can dismiss or ignore non-blocking recommendations.

## Architecture acceptance

- No React component directly imports/calls OpenAI or another LLM provider.
- LLM calls are routed through the LLM Gateway.
- Deterministic findings remain separated from LLM-assisted explanations.
- Signals include source type and confidence.
- Cost/task metadata is preserved for any LLM-assisted action.
