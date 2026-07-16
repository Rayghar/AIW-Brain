# Prompt 6 Gate 6A Storage Delta Report

Generated: 2026-07-16T04:18:50.333Z

## Reconciliation

The exact observed loss was **7,447,240,704 bytes**. Current free space is **18,359,943,168 bytes**, a recovery of **11,276,976,128 bytes** since the controlled stop and **3,829,735,424 bytes more** than the earlier receipt. No persistent 7.45 GB workspace consumer exists.

The delta was transient Windows virtual-memory backing created while the 603-second manifest verifier ran with an 8 GiB Node heap ceiling. It parsed and canonicalised 895,388,377 bytes of manifests, including a 429,260,100-byte manifest. Windows exposes a 16,828,760,064-byte system-managed page file; physical pagefile commitment can expand during the process and be released later without changing the logical file length. Administrative CIM access to the exact historical PageFileUsage counter was denied, so the stopped-instant allocation cannot be replayed, but the exact free-space recovery and absence of an equivalent persistent directory delta distinguish paging from a stored Gate 6A artefact.

## System-managed storage observations

| Path | Logical length | Newest UTC modification | Existed before Gate 6A | Safe to remove | Posture |
|---|---:|---|---|---|---|
| `C:\pagefile.sys` | 16,828,760,064 | 2026-07-16T03:49:13Z | true | false | Windows-managed virtual-memory backing; logical length is not historical physical allocation. |
| `C:\hiberfil.sys` | 6,731,501,568 | 2026-07-16T03:49:03Z | true | false | Windows-managed hibernation storage. |
| `C:\swapfile.sys` | 16,777,216 | 2026-07-16T03:49:13Z | true | false | Windows-managed application paging. |

These system files are not cleanup candidates. Changing them would require an explicit product-owner decision and administrative operating-system action.

## Non-additive inventory

| Path | Bytes | Files | Folders | Newest UTC modification | Existed before Gate 6A | Immutable evidence | Reproducible | Safe to remove | Approval required |
|---|---:|---:|---:|---|---|---|---|---|---|
| `C:\AIW\aiw` | 6,025,528,645 | 308,105 | 90,695 | 2026-07-16T04:18:36.801Z | true | mixed | mixed | false | true |
| `C:\AIW\release-sidecars` | 29,840 | 5 | 2 | 2026-07-15T21:47:49.633Z | true | true | false | false | true |
| `C:\AIW\.npm` | 0 | 0 | 0 | n/a | true | false | true | true | true |
| `C:\Users\ilohec\AppData\Local\npm-cache` | 491,324,284 | 21,210 | 5,084 | 2026-07-15T12:57:50.573Z | true | false | true | true | true |
| `C:\Users\ilohec\AppData\Local\ms-playwright` | 721,890,403 | 612 | 21 | 2026-07-15T00:37:44.457Z | true | false | true | true | true |
| `C:\AIW\aiw\backend\node_modules` | 155,084,407 | 11,590 | 1,679 | 2026-07-15T19:44:20.424Z | true | false | true | true | true |
| `C:\AIW\aiw\frontend\node_modules` | 141,820,989 | 7,246 | 446 | 2026-07-15T19:47:33.408Z | true | false | true | true | true |
| `C:\AIW\aiw\backend\dist` | 0 | 0 | 0 | n/a | true | false | true | true | true |
| `C:\AIW\aiw\frontend\dist` | 0 | 0 | 0 | n/a | true | false | true | true | true |
| `C:\Users\ilohec\AppData\Local\Temp` | 4,090,940,416 | 20,660 | 4,975 | 2026-07-16T04:19:14.583Z | true | unknown-mixed-ownership | mixed | false | true |
| `C:\AIW\aiw\release-evidence\rc10.73.8` | 35,400 | 7 | 0 | 2026-07-15T23:20:31.319Z | false | release-evidence-in-progress | partially | false | true |
| `C:\AIW\aiw\release-evidence` | 234,263,430 | 145 | 20 | 2026-07-15T23:20:31.319Z | true | true | false | false | true |
| `C:\AIW\aiw\knowledge-repository\AKR-0.10.73.8\candidate` | 0 | 0 | 0 | n/a | false | false | true | true | true |
| `C:\AIW\aiw\knowledge-repository\AKR-0.10.73.7\github-live` | 5,367,402,297 | 285,542 | 88,031 | 2026-07-15T12:15:04.121Z | true | true | false | false | true |
| `C:\AIW\aiw\knowledge-repository\AKR-0.10.73.7\github-live\snapshots` | 5,212,021,150 | 285,473 | 88,029 | 2026-07-15T12:15:04.121Z | true | true | false | false | true |
| `C:\AIW\aiw\knowledge-repository\AKR-0.10.73.7\github-live\checkpoints` | 155,381,147 | 69 | 0 | 2026-07-15T12:14:10.123Z | true | recovery-required | partially | false | true |
| `C:\AIW\aiw\release-evidence\rc10.73.7\AIW_v0.10.0-rc.10.73.7_All_Source_Governed_Acquisition_and_Sol_Semantic_Transformation_Foundation_FULLDIST.zip` | 19,072,557 | 1 | 0 | 2026-07-15T21:11:27.255Z | true | true | false | false | true |
| `C:\AIW\release-sidecars\rc10.73.7\AIW_rc10.73.7_Post_Tag_Attestation_Sidecars.zip` | 5,825 | 1 | 0 | 2026-07-15T21:47:49.633Z | true | true | false | false | true |

No deletion, movement, compaction or in-place regeneration occurred. The backup remains deferred and is not a passed gate. Gate 6A was not resumed.
