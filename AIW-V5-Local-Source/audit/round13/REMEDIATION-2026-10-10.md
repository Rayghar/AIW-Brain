# Round 13 · Architecture draft, review, and SDD content

This source follows the user's supplied AIW V5 ZIP and the Round 12 browser-verified candidate. It is a local source candidate, not a Git commit or a deployment. `productionAccepted` remains false.

## Implemented

- A model proposal's source-facing name and stated basis must have a concrete topic in its cited requirement, passage, or upstream proposal. A citation that merely exists in the packet no longer suffices for an unrelated responsibility, data definition, or integration. This is a deterministic relevance filter and an independent model check still follows it; neither proves architectural correctness.
- Model drafting yields after one checked theme or cross-cutting pass. Each slice saves a checkpoint bound to the project revision, skeleton stamp, and packet stamp. The workbench continues a queued slice with the same receipt and resumes after a reload. The browser needs to be open for automatic continuation; no unattended hosted queue is claimed.
- Each proposal review page contains at most 20 records and can be marked reviewed by a signed-in person. Progress is held with the completed draft and survives a reload. Apply checks all page marks and the current preview stamp on the server, in addition to the final human acknowledgement. Agent accounts cannot mark a page or apply as the reviewer.
- Chapter 11 Output can inspect the SDD's actual content reading on demand, with section scores, open statements, concrete findings, and links to the chapters where the underlying records are edited. Missing client facts remain open.
- The routing search now uses integer cost tables, clips bounds once, and skips settled states before evaluating their edge cost. Route integrity and determinism are retained in the full diagnostic suite.

## Verification

| Check | Result |
| --- | --- |
| Architecture job and service | Pass: unrelated and fabricated-source advice withheld; bounded checkpoint replay; seven model draft calls and six source checks in the service; every page mark required before apply. |
| Rendered model browser | Pass: fresh imported project, seven draft calls, six checks, eleven marked review pages, desktop and phone, final human apply. |
| Rendered journey browser | Pass: 15 checks including new project, Chapter 1 through 11, SDD content report links, 1,400 imported requirements, bounded page review across the entire bulk draft, one apply, no page/API errors. |
| SDD size | Pass: 5,572 records, 1,400 requirements, 285 KB architecture Markdown, 96 PDF pages and 117 with figures; figured Markdown 5.4 s, freeze 5.2 s in the measured run. |
| Build | Pass: 208 server modules and 139 client scripts, route size gate retained. |
| Diagram integrity diagnostic | Pass: 21 checks, 120 arrangements, cross-process determinism. Its Chapter 5 run was 852 ms. |
| Strict diagram timing gate | Unstable/fails on this shared runner: Chapter 5 measured 1,043, 1,184 and 1,383 ms in separate unmodified runs against 900 ms. One diagnostic run measured 852 ms. The 900 ms gate remains unchanged. |

## Remaining acceptance work

The rich synthetic SDD still measures 8 of 31 records at the prose standard. Sections 2 and 3 remain skeletons because source descriptions, impacts, alternatives, and justifications are absent. The report now gives an author an exact path to the relevant records, but this cannot be completed truthfully without substantive client architecture input and review.

A real architecture provider and a client-specific project have not been run here; semantic quality is unaccepted. A hosted execution trial is still required for theme slices and apply on the intended Worker platform. The browser-driven continuation needs an open session; for unattended jobs, a durable hosted queue or scheduled consumer must be designed and validated. The strict diagram latency gate is still a performance risk on the target hardware. No private site was deployed by this round.
