# Built-browser restoration acceptance

Passed on `app-NK6SZLFO.js` / `app-32945c070bd2.css`. This is a bounded restoration pass against an isolated copy of the synthetic UI-authored revision 82 project. No canonical design, approval, governance, or provider mutation was made.

- 44 chapter/tab surfaces retain location and native Next task.
- 11 chapters: Questions navigate to native and shared models; validation supports object/kind grouping and accurate cause rollups; Output source inspection and handoff controls work.
- Inherited errors remain in Awaiting assessment. Canonical inspection preserves current chapter, tab, scope, scroll, selected document and preview. Details preferences survive reload; expanded Model can close and reopen Details without losing camera/selection.
- Blank project: related outputs name concrete missing inputs; ambiguity and test-objective warning findings remain actionable content gaps.
- Seven native forwards reach the next chapter Work tab. Working logical/SDD and captured baseline Markdown downloads have validated bytes and SHA256 receipts. Captured baseline remains a working draft, not approved.
- Desktop (1440px) and phone (390px) captures cover Questions, grouped validation, cause rollups, Output Details, and expanded Model.

Integrated acceptance: 30 grouped checks. Focused Model: 18 grouped checks / 96 recorded clicks. Parallel built-shell gate: 8 grouped checks. Zero application exceptions. The complete surface run recorded 180 selector-based clicks, with 3 more in a bounded export retest; these counts do not include every direct locator click or select change. No claim is made that every conditional button was exercised in this restoration pass; the broader Round 28 inventory remains authoritative.

The final integrated receipt incorporates a bounded export retest on identical assets. The test initially inspected an iframe before its document loaded; the retest waits for URL and content readiness. Other interrupted harness attempts involved a tab-state selector, uppercase labels and closed native export menus. No production fix was needed. Request `ERR_ABORTED` entries are navigation/preview replacements; all requested downloads completed and were hashed.

Reproduce with:

```sh
AIW_BROWSER_EXECUTABLE=/path/to/chromium AIW_QA_CLIENT=dist/client node scripts/workspace-restoration-walkthrough.mjs
AIW_BROWSER_EXECUTABLE=/path/to/chromium AIW_MODEL_GUIDANCE_CLIENT=dist/client node model-restored-guidance-browser-validate.mjs
AIW_BROWSER_EXECUTABLE=/path/to/chromium AIW_SHELL_RESTORATION_CLIENT=dist/client node shell-restoration-browser-validate.mjs
```

The main harness defaults to the committed revision 82 fixture archive and compact evidence under `audit/round29/integrated`. Override `AIW_RESTORATION_FIXTURE` with an extracted fixture directory or `AIW_RESTORATION_EVIDENCE` with an evidence destination. `AIW_RESTORATION_CHECK` selects one named check for bounded reproduction.
