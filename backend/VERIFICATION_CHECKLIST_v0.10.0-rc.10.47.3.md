# Verification Checklist — rc.10.47.3

Because the full rc.10.47.2 source ZIP was not available in this workspace, this pack was generated as a drop-in foundation patch and was not compiled inside the AIW repo.

## Apply and verify in AIW repo

Run:

```bash
npm install
npm run build
npm test --if-present
node scripts/gates/brain-architecture-gate.mjs
```

If Playwright is installed:

```bash
npx playwright test tests/e2e/aiw-golden-journey.spec.ts
```

## Required proof before rc.10.48

- [ ] Architecture docs committed.
- [ ] LLM Gateway interfaces compile.
- [ ] Brain Signal Engine interfaces compile.
- [ ] No frontend direct LLM provider calls.
- [ ] Signal prioritizer unit tests added or planned.
- [ ] Golden journey E2E selector alignment completed.
- [ ] LLM usage ledger persistence mapped to database.
- [ ] Redaction policy reviewed.
- [ ] Cost budget policy environment variables configured.
- [ ] Production deployment checklist reviewed.

## Definition of done for rc.10.47.3 inside the actual repo

- [ ] `frontend/npm run build` passes.
- [ ] `backend/npm run build` passes.
- [ ] `npm test --if-present` passes.
- [ ] Structure gates pass.
- [ ] Brain architecture gate passes.
- [ ] Golden journey smoke test passes or selectors are documented as pending.
- [ ] No UI regression in project creation → lifecycle → design canvas → SDD journey.
