# AIW Design Workbench Runbook

## Start the workbench

```bash
npm ci
npm run build
npm run dev:api
npm run dev:web
```

Default development services:

- API: `http://localhost:4100`
- Web: `http://localhost:4173`

## Validate the visual library

```bash
npm run build:packages
python - <<'PY'
import json
from jsonschema import Draft202012Validator
schema=json.load(open('data/sprint7_5-design-library.schema.json'))
data=json.load(open('data/sprint7_5-design-library.json'))
Draft202012Validator(schema).validate(data)
print(len(data['records']))
PY
```

Expected result: 68 records.

## Exercise the primary design flow

1. Open one of the four main design views.
2. Select Components, Patterns, Styles or Templates in the Architecture Library.
3. Search or enable the recommended-only filter.
4. Inspect the record to review properties, quality effects and obligations.
5. Drag the record to the canvas or select Preview placement.
6. Review the semantic drop preflight.
7. Apply or cancel the change.
8. Connect relevant objects using typed ports and relationship selection.
9. Select an object and edit properties in the inspector.
10. Review the updated Decision Radar and design-assurance monitor.
11. Invoke AI co-architect review when an external model is configured.

## Verification commands

```bash
npm run typecheck
npm test
npm run security:check
npm run design:benchmark
npm run architecture:gate
npm run operational:reference
npm run e2e
```

## Troubleshooting

### Record cannot be dropped

Check:

- Active architecture stage.
- Record `applicableStages`.
- Technology prohibitions.
- Hard structural findings.

Warnings do not block placement. Only hard constraints disable Apply.

### Template creates no objects

Confirm the record contains stage-matching `nodeTemplate` items. Templates are instantiated only in their declared stage.

### Recommendations appear unrelated

Check:

- Active stage.
- Selected component scope.
- Quality-attribute weights.
- Existing style and pattern decisions.
- Project team and timeline context.

### AI review unavailable

Deterministic design intelligence works offline. AI-assisted review requires an external provider configuration and credentials in the API environment.

### Browser performance test cannot run

Run `npm run browser:perf` in CI or a workstation where Playwright Chromium can navigate to the local preview URL. The current sandbox blocks local Chromium navigation.
