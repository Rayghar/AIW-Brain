# Guided Journey — v0.10.0-rc.10.7

The Guided Journey is the first-use path for AIW. It replaces the old standalone Activation, Golden Path and Template Gallery widgets with one coherent workflow.

## Architecture

- UI: `apps/web/src/features/guided-journey`
- Deterministic helpers: `packages/intelligence`
- Scenario catalog: `apps/web/src/data/scenario-templates.json`
- Store action: `apps/web/src/store/actions/applyScenarioTemplate.ts`

## Workflow

```text
Scenario template
→ brief extraction
→ driver/scenario creation
→ starter model generation
→ intelligent layout preview
→ pattern/style ADR checkpoint
→ conformance controls
→ architecture pack export
```

## Governance

Generated content is seed material. It remains editable, review-required and non-authoritative until accepted by accountable users and/or promoted through the relevant governance workflows.
