# Prompt 6 Gate 6A Safe Cleanup Plan

Generated: 2026-07-16T04:18:50.333Z

No cleanup has been performed. Every listed deletion requires explicit product-owner approval.

| Exact path | Category | Recoverable bytes | Files | Rebuild effect |
|---|---|---:|---:|---|
| `C:\AIW\aiw\backend\apps\api\dist` | build-or-test-output | 1,994,820 | 264 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\apps\worker\dist` | build-or-test-output | 38,384 | 36 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\node_modules` | node-modules | 155,084,407 | 11,590 | npm ci; offline success depends on retained cache |
| `C:\AIW\aiw\backend\packages\admin\dist` | build-or-test-output | 48,063 | 3 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\artifacts\dist` | build-or-test-output | 291,661 | 12 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\domain\dist` | build-or-test-output | 2,966,712 | 111 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\engine\dist` | build-or-test-output | 1,828,896 | 192 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\integrations\dist` | build-or-test-output | 116,599 | 42 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\intelligence\dist` | build-or-test-output | 136,433 | 33 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\knowledge\dist` | build-or-test-output | 140,344 | 18 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\modelling\dist` | build-or-test-output | 180,965 | 15 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\testing\dist` | build-or-test-output | 883 | 3 | local rebuild or test rerun |
| `C:\AIW\aiw\backend\packages\ui\dist` | build-or-test-output | 603 | 3 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\apps\web\dist` | build-or-test-output | 4,261,171 | 54 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\node_modules` | node-modules | 141,820,989 | 7,246 | npm ci; offline success depends on retained cache |
| `C:\AIW\aiw\frontend\packages\admin\dist` | build-or-test-output | 48,063 | 3 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\artifacts\dist` | build-or-test-output | 291,661 | 12 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\brain-runtime\dist` | build-or-test-output | 26,357 | 24 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\domain\dist` | build-or-test-output | 2,966,712 | 111 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\engine\dist` | build-or-test-output | 1,807,653 | 189 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\integrations\dist` | build-or-test-output | 64,754 | 36 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\intelligence\dist` | build-or-test-output | 136,433 | 33 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\knowledge\dist` | build-or-test-output | 121,450 | 12 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\modelling\dist` | build-or-test-output | 180,965 | 15 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\testing\dist` | build-or-test-output | 883 | 3 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\packages\ui\dist` | build-or-test-output | 603 | 3 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\playwright-report` | build-or-test-output | 528,334 | 1 | local rebuild or test rerun |
| `C:\AIW\aiw\frontend\test-results` | build-or-test-output | 1,518,709 | 18 | local rebuild or test rerun |
| `C:\Users\ilohec\AppData\Local\ms-playwright` | playwright-browser-cache | 721,890,403 | 612 | requires Playwright browser reinstall, normally network access |
| `C:\Users\ilohec\AppData\Local\npm-cache` | npm-cache | 491,324,284 | 21,210 | may require network; reduces offline verification capability |

Maximum reported recovery if every candidate were approved: **1,529,818,194 bytes**. Paths overlap in some build layouts; actual recovery must be recalculated from a non-overlapping approved deletion set immediately before execution.

The raw vault, safe and quarantine CAS, snapshots, manifests, denominator and withdrawal records, checkpoints, journals, rc.10.73.7 evidence, verified FULLDIST and post-tag sidecar package are excluded from cleanup. Operating-system temporary storage is not proposed because ownership is mixed. Node modules and caches are rebuildable but their removal would impair offline verification and may require approved network access.

Gate 6A may resume only after a fresh observation shows at least 12 GiB free and projected peak space remains above 8 GiB. Gate 6B should prefer at least 15 GiB free. Automatic evidence deletion remains prohibited.
