// Production client (audit F-04, F-16, UX-09; round 2 F2-19). The ~150 source modules a chapter loads become a
// handful of minified, content-hashed chunks, and the 40 stylesheets become one minified file in the same
// cascade order. Output in <outdir>: index.html, assets/app-<hash>.js, assets/chunks/*.js, assets/app-<hash>.css
// and a linked source map beside each script. The local server serves the maps so a production error is
// readable; the hosted Worker packs only .html/.css/.js (build.mjs), so it ships none. The esbuild metafile and
// the size report are release evidence, written beside the output directory (<outdir>-metafile.json,
// <outdir>-size-report.json) so that nothing serves them.
// public/ stays the development source that `npm start` serves; `npm run build` produces this.
// The build fails when the size budget is exceeded (BUDGET below): the entry script, any hand-written chunk,
// the stylesheet, each data chunk, the number of script files and of sub-10 KB files, and — per route — the
// hand-written code a page loads before it can open (the entry plus the static closure of the modules
// entry.js imports for that route). There are two routes (round 3, A): the Projects page, and the one workspace
// shell that opens every chapter.
import {build, transform} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, rm, readdir} from 'node:fs/promises';
import path from 'node:path';

const shortHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const KB = 1024;

// Bytes, minified, before compression. Each bound is about 5 % above the largest size measured on 2026-10-01
// across the working tree and the R2-B change set alone, so growth is a decision someone makes, not a drift
// nobody sees; lower a bound once a reduction has landed (the chapters route has its own measurement, below). Measured
// (working tree / R2-B on 0754cad): entry
// 5,055 / 4,987; largest hand-written code in one chunk 306,815 / 343,576; CSS 634,342 / 621,641; code a route
// loads to open: Projects 880,086 / 879,134, Chapters 1–3 up to 1,581,258 / 1,758,197, Chapters 4–11
// 2,011,172 / 2,185,372; 116–121 / 106 scripts, 52–55 / 48 under 10 KB (the working tree grows as the other
// workstreams add modules). Data and vendor modules (catalogue,
// playbook, review font, docx) are counted per module, wherever esbuild places them, and have their own
// bounds; route totals hold hand-written code only and say which data modules a route loads eagerly.
// The chapters route (round 3, A): every chapter opens the one shell, so the route holds the eleven chapters' studios.
// Measured 2026-10-01: 2,260,583 B on the working tree (2,246,569 B for the baseline 2eb3e28 with the one-shell change
// alone, against 2,102,861 B for the old Chapters 4–11 route and 1,679,086 B for the old Chapter 1 route); the bound is
// that measurement plus 5 % (2,373,612 B), rounded up to whole KB.
// Round 11: measured 2,349,527 B after the six workstreams (the field kit's descriptors and help for every form of the
// eleven chapters, +16 KB; the instrument tray and the lens vocabulary; the Specification view, the ARS and the Output
// stage; the spark's neighbours and the providers for every record type; the library's domain core), the bound is the
// measurement plus 5 % rounded up to whole KB (2,467,003 B → 2410 KB). Round 5 measured 2,198,505 B (bound 2260 KB).
// Round 12 (D2): measured 2,512,332 B once Chapters 6 to 10 say what is not stated, patch their saves, link
// records to the requirements they answer, state a plan's targets and schedule and list AIW's proposals to keep or
// dismiss (most of the growth is in the runtime, interfaces and technology domains). The bound is that measurement
// rounded up to whole KB, without the usual 5 %, so that the next growth is again a decision.
// Round 12 (D1, 2026-10-08): measured 2,561,305 B with D2 merged and the two items the lead asked of D1 after it (D2 alone: 2,512,332 B). D1 added about 40 KB to the domain layer (the driver
// register with kinds and codes, the decision, persona, rule, allocation and component fields, the record lifecycle,
// and the shared readers of requirement links, open fields and priorities), which both routes load, and about 12 KB of
// editors for Chapters 1-5. The bound is the measurement rounded up to whole KB, for the lead to settle.
// Round 12 (D4, 2026-10-08): measured 2,597,097 B against 2,546,906 B on the round branch at 5c30c03 (+50,191 B). D4's
// records at depth: the one lifecycle family offered on every chapter page, journey steps served or realised, open
// fields on mappings, connections and groups, five technology categories with their checks, requirement fit and
// targets in Chapter 7, read and batch contracts, invariants, time-driven transitions, dual control, delivery status and
// parameters, start-up paths, the seeding switch, per-record readings in Chapters 8-10, and their editors. The bound is
// the measurement rounded up to whole KB, for the lead to settle (it was 2502 KB).
// Round 12 (E, 2026-10-08): E adds about 7 KB to the domain layer both routes load: requirement groups placed on
// plateaus and the migration records with their findings (roadmap-domain.js, GR-DRF-14, GR-RUN-05), the one drafting
// predicate (readiness-model.js), a journey step's process kind and the journey treatment (requirements-domain.js) and
// the surfaces that ask the predicate. The architecture draft's surface (journey-draft-ui.js) loads only when it opens.
// Measured 2,554,266 B with A2 merged (2,546,906 B without E): within the bound of that time (2502 KB); merged with D4 the lead measures again below.
// Lead (2026-10-08): D4 and E merged together measure 2,604,457 B; the bound is that measurement rounded up to whole KB
// until the round's budgets are settled with headroom at its close.
// Round 12 (F, 2026-10-08): measured 2,616,971 B with D4 and E merged (the round branch: 2,604,457 B, +12,514 B). F's share
// is in the domain layer both routes load (see the Projects route below) and in the Chapter 1 review's grouped findings
// and display references (review-domain.js). The bound is the measurement rounded up to whole KB, for the lead to settle
// (it was 2544 KB). With D4's and E's records printed in the ARS and the component specifications (the invariants and
// the batch chain: ars-document.js, component-spec-document.js; Sol's mark in record-lifecycle.js; the SDD itself is
// built on the server) it measures 2,620,255 B, so the bound is 2559 KB.
// Round 12 (K, 2026-10-08): measured 2,622,459 B with K merged on the round branch at 166ce30 (2,604,457 B, +18,002 B):
// the core-banking lens's vocabulary for retrieval (lenses/core-banking-terms.js, about 4 KB), the relevance margin and
// the catalogue's marks and stubs (catalogue-curation.js, about 4 KB) in the Brain's retrieval, the reader of released
// domain knowledge (domain-knowledge.js), the decision topics and templates, organisation knowledge releases in the
// knowledge domain and the application-platform category, which both routes load. The bound is the measurement rounded
// up to whole KB, for the lead to settle.
// Round 12 (F with K merged, 2026-10-08): 2,638,266 B (the round branch at cdb9884: 2,622,459 B, +15,807 B, F's share as
// above), so the bound is 2577 KB, for the lead to settle.
// Round 12 (B2, 2026-10-08): measured 2,646,984 B against 2,622,459 B on the round branch at 100be3f (+24,525 B): the
// statement checks (statement-checks.js, about 6 KB) and the readers of every source assertion, the repeated-statement
// judgements and assurance records that link groups (assurance-domain.js, requirement-commands.js), which both routes
// load, and the intake dialog's not-stated bands, saved-mapping differences, personal-data choice, enrich mode and
// source findings with the proposals dialog for outcomes and constraints (intake-ui.js, about 11 KB more). The bound
// is the measurement rounded up to whole KB, for the lead to settle (it was 2561 KB). Merged with F (the round branch
// at 5bdf34d: 2,638,266 B) it measures 2,662,797 B, so the bound is 2601 KB.
// Round 12 (D3, 2026-10-08): 2,691,181 B with D4, E, K, F and B2 merged and the SDD reading the one provenance reader
// (2,662,797 B on the round branch at af0d84a, +28,384 B): the provenance reader (provenance.js, about 17 KB in the
// bundle: every chapter's labels, the footer's disclosure, the grouped judgement, the SDD's provenance register) and the
// per-record review stamps in review-domain.js; the bound is the measurement rounded up to whole KB, for the lead to
// settle (it was 2601 KB).
// Round 12 integration (2026-10-10): measured 2,717,992 B for the chapter shell after the model draft review
// and the already merged domain work; settle the prior interim bound at the measured whole KB. Projects loads
// 1,241,549 B from the shared domains. These remain hard build gates, with less than 1 KB of headroom each.
// The chapter review now includes per-page proposal acknowledgement and an on-demand SDD content report. Measured
// chapter entry closure: 2,719,920 B; retain the whole-KB size gate instead of disabling it.
// Round 14 (2026-10-10): the resumed model review, navigable SDD findings and validation lenses measure
// 2,723,129 B. Set the hard gate to the next whole KB (2,723,840 B), leaving 711 B of headroom.
// Round 18: the integrated design-resource hub, Chapter 7 comparison and Chapter 11
// focused evidence review measure 2,776,046 B after integration. Retain a hard gate
// with about 1 KB of headroom for the final source/version cue.
// Round 19 integrated resource routes, scoped Validate, comparison readings and expanded-canvas
// controls and responsive shell status measure 2,798,478 B. Keep the next whole-KB hard gate; this is measured growth,
// not an exemption from the route-load budget.
// Round 20 measured 2,809,313 B after the explicit evidence-journey checks and route-aware handoffs.
// Continue the same next whole-KB hard gate. A new increase still fails this build.
// Round 21 (2026-10-11) measured 2,816,932 B after released design concerns,
// source-scoped comparisons and the substantive SDD gate. Keep the next whole-KB
// hard gate at 2,817,024 B; any further route growth fails the build.
// Chapter-surface refinement (2026-10-11) measures 2,843,469 B: the governed
// applicability path, kind-aware driver/decision editing, searchable chapter registers,
// repair routing and scope-aware Output/Validate controls. Reset the gate to the next
// whole KB (2,843,648 B); growth beyond these changes still fails the build.
// Companion, Sol and Proposals refinement (2026-10-11): measured 2,861,791 B of eager
// chapter code after shared comparison, disclosure and project-switch guards. Keep the
// next whole-KB gate rather than granting continuing headroom for unrelated growth.
// Focused Sol source relevance and clearer disclosure copy measure 2,862,908 B;
// retain the next whole-KB gate (2,863,104 B).
// Hosted connection diagnostics and a persistent disclosure panel measure
// 2,863,243 B; the next whole-KB gate is 2,864,128 B.
// Reviewed architecture knowledge adds the bounded source/scope reader and
// candidate authoring and the scoped Sol reader to the chapter route. Measured
// 2,875,012 B including the reviewer disclosure and qualified product guard (2026-10-11);
// keep the next whole-KB build gate rather than exempting these modules.
// 2026-10-12: 2,878,960 B with exact-source reading, linked-release invalidation
// and shared disclosure/scope guards. Keep the measured next whole-KB gate.
// Reasoning comparisons, knowledge context and scoped Sol controls: 2,884,749 B measured,
// +5,789 B (0.201%) over 2,878,960 B baseline. Preserve the existing whole-KB ceiling policy;
// all other route limits are unchanged.
// Contextual assistance (2026-10-13): measured chapter closure 2,899,121 B,
// +14,372 B over the 2,884,749 B baseline. The new emitted panel-state helper,
// private-draft controller and typed-operation reader contribute 2,144 + 2,231
// + 1,652 B; the rest is the corresponding proposal, follow-up and verification
// rendering/guards in existing panels. History storage/validation stays server-side.
// Approve only +16 KiB over the prior 2,885,632 B cap, to 2,902,016 B; unrelated
// growth still fails. This is a bounded feature allowance, not a blanket 5% reset.
// Integrated focus/history guards measure 2,899,504 B: 2,512 B below that cap.
// Co-design (2026-10-13): chapter guide, saved answer history, contextual starters,
// clearer labels and structural-correctness checks measure 2,906,451 B (+6,947 B
// over v86). Keep the next whole-KB cap; all unrelated budgets remain unchanged.
// Round 23 (2026-10-14): a drafted design's parties name their proposed users, the SDD tells a thin section Sol drafted
// from the rules' skeleton and names the drafting engine, and Draft with Sol waits for a configured model: 2,907,224 B
// measured, +773 B over 2,906,451 B, 88 B past the 2,839 KB cap. The next whole-KB cap; every other budget unchanged.
// Round 24 (2026-10-14, W1): the module structure Chapter 1 reads (module-model.js: the tree, the partition findings and
// the proposal the import shows) measures 2,912,199 B, +4,975 B over 2,907,224 B. The next whole-KB cap; every other
// budget unchanged.
// Round 24 (2026-10-14, W2): drafting by module (the drafter's module units, its Chapter 4 module groups and the concern
// readers the consolidation shares, and a component's served drivers in the realisation domain) measures 2,913,520 B,
// +1,321 B over 2,912,199 B, 1,264 B past the 2,844 KB cap. The next whole-KB cap; every other budget unchanged.
// Round 24 (2026-10-14, W5, D-24-08): one module scope on every screen measures 2,927,316 B, +15,117 B over 2,912,199 B:
// the lens and its projection (module-lens.js 2,756 B and module-scope.js 2,191 B, which it brings onto the route), the
// scope in the shell's address, history, breadcrumb and rail frame (app.js 2,179 B, module-shell.js, project-context.js),
// the scoped readiness readers (readiness-model.js 1,351 B), the register's module filter, group editor and tree of
// groups (requirements-scale.js, requirements.js, record-fields.js) and the scoped registers, pickers and board. The
// rail's tree, the module map and the structure screen are module-ui.js, loaded on first use (12,875 B, not on the
// route). The next whole-KB cap; every other budget unchanged.
// Round 24 (2026-10-14, lead, W2 and W5 merged): the two together measure 2,928,637 B, 1,021 B past W5's 2,859 KB cap
// (W2's +1,321 B and W5's +15,117 B over W1's 2,912,199 B, less what they share). The next whole-KB cap; every other
// budget unchanged.
// Round 25 (2026-10-15, lead, W1, D-25-01): the decision reading measures 2,934,759 B, +8,528 B over 2,926,231 B, 6,119 B
// past the 2,860 KB cap: the engine (decision-reading.js, 6,847 B in the bundle) and what reads it on the route (the
// decisions' two new checks, the trade-off model's observations, the what-if, Chapter 7's dominance), less the retired
// tally. The next whole-KB cap; every other budget unchanged.
// Round 25 (2026-10-15, lead, W2, W3 and W4 merged): the round measures 2,949,715 B, +14,956 B over W1's 2,934,759 B,
// 14,931 B past the 2,866 KB cap: the screens that show the reading (W2, +10,899 B on its tree: the Work tab's reading
// and suggestions bring the reading's words and decision-suggestions.js onto the route through decisions.js and the
// desk model; the map's standings, the matrix's suggestions, the what-if's firmness, Chapter 7's bounds and dominance),
// the design-concern criteria (W4, +3,032 B: domain-knowledge.js, architecture-knowledge.js, architecture-design.js) and
// the lead's fixes, less the duplicates retired. The SDD (W3) is server-side and adds nothing here. The next whole-KB
// cap; every other budget unchanged.
// Round 26 (W1): 2,953,141 B measured after the shell's tab purpose lines, the chapter record set (chapter-records.js),
// the one load-failure notice (load-failures.js) and the date words: 2,997 B past the 2,881 KB cap; the next whole-KB cap.
// Round 26 (W4, D-26-13): 2,958,778 B measured after the one Output kit (output-documents.js: the documents list with
// Preview, the downloads through the one mechanic with the chapter appendices as data, the MADR row; the preview dialog
// and the status line in validate-view.js), less the studios' retired export paths: 4,538 B past the 2,885 KB cap; the
// next whole-KB cap, every other budget unchanged. Then 2,959,455 B with Preview for every document and "Preview this
// chapter's part of the SDD" (D-26-13, R26-O-02): 95 B past the 2,890 KB cap; the next whole-KB cap.
// Header completion (2026-10-16): measured 2,981,510 B after adding the saved-model
// selector and accessible disclosure. Keep the limit at the measured size rounded
// up to 1 KB; no general headroom or disabled route checks.
// Round 27 (2026-10-17): shared Work/record cards, typed pickers, guarded Undo,
// validation confirmation and model navigation/export measure 3,032,382 B
// (+50,872 B over v88). Keep the hard gate at the next whole KB.
// Private-site tab refinement merged with Round 27 (2026-10-18): 3,044,364 B,
// +11,982 B (0.40%) over Round 27. Retain the next whole-KB ceiling.
// Shared studio composition: measured 3,076,043 B before the final labelled Fit control. Keep the bound within the next two KB.
// Round 29 journey restoration: measured 3,108,906 B for canonical inspection,
// model questions and grouped review; retain the next whole-KB ceiling.
// rc38: 3,114,012 B for driver-linked specifications, connected Work records and
// progressive native connections; retain the next whole-KiB ceiling.
// rc39 (W3, 2026-10-21): measured 3,141,579 B. The record card now loads the design-questions projection (W1's
// pattern-dna.js and design-questions.js, about 25 KB, which the Work tab's cards read on every chapter) and the Design
// basis section, the driver card and the Decide handler (about 3 KB). The next whole-KB cap, with no headroom reset.
// W3 step 3: 3,143,236 B with the need wording derived from the drivers (technology-domain.js needWording, the Needs
// register's chip and the editor's default, about 1.7 KB); the next whole-KB cap, with no headroom reset.
// W3 steps 5 and 6: 3,148,302 B with Sol's design-basis source and starters (intelligence-context.js, intelligence-ui.js)
// and the SDD component passage's design basis (sdd-architecture.js), about 4.5 KB; the next whole-KB cap, no headroom reset.
// rc39 (W2, merged over W1 and W3): the chapters route measured 3,150,480 B (+1,680 B over the 3075 KiB cap) with the
// Model views' selection toolbar, arrival rule, Layers reading, Drivers lens picker (the projection itself loads on
// demand), Fit on open, the Tools fold and the sheets' zoom (notation-view.js, model-stage.js); the next whole-KiB cap,
// with no other budget reset.
// rc40 (2026-10-21, lead, W1–W4 merged): the chapters route measured 3,440,376 B on the merged tree, +289,528 B over the
// 3077 KiB cap. 228,714 B of it was W4's glance miniature importing the Model tab's own engine statically (notation-layout
// 97,266 B, notation-model 58,915 B, notation-svg 51,661 B, figure-budget 15,320 B, technology-icons 5,552 B); the glance
// now loads the engine on demand as the Model views do (work-glance.js loadEngine), and the route measures 3,212,318 B.
// What remains over the cap is the round's own: W3's sheet model on the export path (component-sheet.js 34,328 B,
// specification-reading.js 7,323 B, component-spec-document.js +430 B), W4's frame (work-frame.js +7,961 B,
// work-records.js 7,429 B, work-glance.js 5,684 B before the change) and the shell hooks (+385 B). The next whole-KiB cap;
// every other budget unchanged.
// rc41 (2026-10-22, lead, W1–W4 and the close packages merged): the chapters route measured 3,250,550 B. 18,044 B of it
// was W3's canvas-draft.js on the route only because the eleven chapter adapters imported its editor registry; the
// registry and prefillForm now live in studio-kit.js and the canvas loads with the Model views (3,232,124 B, 150 scripts
// again). What remains, +19,806 B over rc40's 3,212,318 B, is the round's own (bytesInOutput on the route, against the
// base 3437db5): W2's chapter strip (chapter-strip.js 4,411 B, output-workspace.js +1,351 B, work-records/work-frame
// +505 B, validation-workspace.js −626 B), the close's execution.* field descriptors (record-fields.js +4,127 B) and
// ArchiMate typing (notation-palette.js +2,374 B), studio-kit.js +1,736 B (the registry, the Details toggle's reason),
// the adapters' editor hooks (about 2.5 KB across eleven files), app.js +990 B (reference routes, project-scoped links,
// focus on the case dossier), chapter-records.js +498 B and the knowledge scope gate (+621 B). The next whole-KiB cap;
// every other budget unchanged.
const CHAPTERS_ROUTE_BUDGET = 3157 * KB;
export const BUDGET = {
  entry: 8 * KB,
  // Round 12 (D4, 2026-10-08): the shared domain chunk measured 377,002 B of hand-written code (353,094 B on the round
  // branch at 5c30c03): the Chapter 1-10 domains with D4's records at depth (see above). The bound is the measurement
  // rounded up to whole KB, for the lead to settle (it was 368 KB).
  chunk: 369 * KB, // measured 359,903 B at round 5 (the chapter domains with their caps and indexes) plus headroom
  // Contextual assistance: 757,852 B measured (+1,760 B over 756,092 B), for the
  // resizable/mobile pane, readable proposal/verification cards and source popup.
  // Add only 2 KiB to the prior 756,736 B cap; the new hard cap is 758,784 B.
  // Co-design cards and question-first layout measure 764,628 B (+6,776 B over
  // v86). Keep the next whole-KB cap (764,928 B), with no general headroom reset.
  // Round 24 (2026-10-14, W5, D-24-08): the Modules section of the rail, the scope breadcrumb, the module map and
  // Chapter 1's structure screen measure 769,276 B (+4,968 B over 764,308 B at the round's base). The next whole-KB cap
  // (770,048 B), with no general headroom reset.
  // Round 25 (2026-10-15, W2, D-25-03 to D-25-08): the reading's states on the Chapter 3 map, the matrix, the Work tab,
  // the desk probe and the what-if (the lead, ruled out, dominated, suggestions), in light, dark and forced colours,
  // measure 771,840 B (+2,564 B over 769,276 B). The next whole-KB cap (772,096 B), with no general headroom reset.
  // Round 26 (2026-10-15, W4, D-26-13): the Output tab's documents list (its rows, the project data line, the disabled
  // rows with their reason, the status line) and the preview dialog measure 772,780 B (+940 B over 771,840 B), less the
  // retired decision-records card. The next whole-KB cap (773,120 B), with no general headroom reset.
  // Then the chapter's own records on Output (R26-O-03: the rows, their formats, the pager, the second section) measure
  // 774,109 B (+1,329 B over 772,780 B) after the per-chapter Output list rules retired with their lists (-1,156 B). The
  // next whole-KB cap (774,144 B), with no general headroom reset.
  // rc38: 866,189 B after retired Work-rule cleanup; next whole-KiB cap (846 KB), with no other budget reset.
  // rc39 (W3): 868,109 B with the Design basis rows on the record card and the driver card's lists (+1,920 B); the next
  // whole-KiB cap (868,352 B), with no other budget reset.
  // rc39 (W2, merged over W3): the phone frame, the footer's Tools fold, the selection toolbar, the Fit menu's Fit on open,
  // the "+N" pill and the Drivers lens' fills (+4,401 B; the retired Layers index-card rules left); measured after the
  // merge and set to the next whole-KiB cap below, with no other budget reset.
  // rc41 (lead): measured 901,726 B, +8,795 B over rc40's 892,931 B (minified per sheet against the base 3437db5): W2's
  // chapter-strip.css (10,628 B) and W3's canvas-draft.css (4,524 B), less the rules the strip retired (work-studio.css
  // −4,681 B, output-workspace.css −1,568 B, validate.css −857 B), notation.css +676 B (the count-line floor, the reveal
  // budget's marks), work-round27.css +170 B, studio-system.css −95 B. The next whole-KiB cap, no other budget reset.
  css: 881 * KB, // rc41 (lead): 901,726 B; was 873 KB. // rc40 (lead): measured 892,931 B, +20,421 B over rc39's 872,510 B: W4's work-studio.css (23,357 B) less the work-round27.css and realise.css rules it and W3 retired (−25,684 B), W3's spec-view.css (18,279 B), W2's arrange.css (10,162 B) less the popover rules (−916 B). The next whole-KiB cap. (rc39, W2 over W3: measured 872,510 B.)
  // Round 12 (D1, 2026-10-08): Projects measured 1,119,582 B with D2 merged and the two items after it (D2 alone: 1,083,403 B) (D1's share is the domain layer, see above);
  // the bound is the measurement rounded up to whole KB, for the lead to settle.
  // Round 12 (D4, 2026-10-08): Projects measured 1,150,527 B against 1,118,956 B on the round branch at 5c30c03 (+31,571 B,
  // D4's share of the domain layer, which both routes load); the bound is the measurement rounded up to whole KB, for the
  // lead to settle (it was 1094 KB).
  // Round 12 (K, 2026-10-08): Projects measured 1,174,973 B with K merged on the round branch at 166ce30 (1,156,304 B,
  // +18,669 B: K's domain-layer growth, see above, and the organisation knowledge releases in the organisation dialog);
  // the bound is the measurement rounded up to whole KB, for the lead to settle (it was 1130 KB).
  // Round 12 (B2, 2026-10-08): Projects measured 1,186,775 B against 1,174,973 B at 100be3f (+11,802 B: B2's share of the
  // domain layer, the statement checks and the assertion readers, see above); the bound is the measurement rounded up to
  // whole KB, for the lead to settle (it was 1148 KB). Merged with F (the round branch at 5bdf34d, whose bound was
  // 1162 KB) it measures 1,201,009 B, so the bound is 1173 KB.
  // Round 12 (D3, 2026-10-08): Projects measured 1,230,205 B with D4, E, K, F and B2 merged and the SDD reading the one
  // provenance reader (1,201,009 B on the round branch at af0d84a, +29,196 B: the provenance reader and the review stamps
  // in the domain layer both routes load, see above); the bound is the measurement rounded up to whole KB, for the lead
  // to settle (it was 1173 KB).
  routes: {projects: 1213 * KB, chapters: CHAPTERS_ROUTE_BUDGET}, // lead (2026-10-08): D4 and E merged measure 1,156,304 B, rounded up to whole KB until the close; // Projects measured 1,083,403 B at round 12 (D2, the Chapter 6 to 10 domains, see above; the bound is the measurement rounded up to whole KB, it was 1010 KB); measured 989,818 B at round 6 (typed relationships, the process semantics, the roadmap and the scale readings in the domain layer) plus headroom; 928,625 B at round 5
  // Projects measured 1,124,733 B at round 12 (E, 2026-10-08, with A2 merged: the roadmap's group placements and migration records and the drafting predicate, which the Projects cards' readiness reads; 1,118,956 B without E; the bound is the measurement rounded up to whole KB); measured 1,083,403 B at round 12 (D2, the Chapter 6 to 10 domains, see above; the bound is the measurement rounded up to whole KB, it was 1010 KB); measured 989,818 B at round 6 (typed relationships, the process semantics, the roadmap and the scale readings in the domain layer) plus headroom; 928,625 B at round 5
  // Round 12 (F, 2026-10-08): Projects measured 1,129,312 B with A2, D1, D2 and P merged (the round branch: 1,118,956 B). F's
  // share, about 10 KB, is in the domain modules both routes load: the review's coverage, grouped findings, display
  // references and the one open count (review-domain.js, readiness-model.js), the ARS's carriers, constraints and
  // assumptions (ars-document.js), the component specification's requirements and data (design-spec.js,
  // component-spec-document.js), the curated requirement trails (requirement-links.js) and the shared reference ranges
  // (util.js). The bound is the measurement rounded up to whole KB, for the lead to settle. Merged with D4 and E, Projects
  // measures 1,167,239 B (the round branch: 1,156,304 B, +10,935 B), so the bound is 1140 KB (it was 1130 KB); with D4's
  // and E's records printed in the ARS and the component specifications (see the chapters route above) it measures
  // 1,170,523 B: 1144 KB. With K merged (the round branch at cdb9884: 1,174,973 B) it measures 1,189,201 B (+14,228 B,
  // F's share as above): 1162 KB, for the lead to settle.
  data: {'brain-catalogue': 1540 * KB, 'review-font': 1064 * KB, 'vendor-docx': 420 * KB, 'brain-playbook': 120 * KB, 'brain-tradeoffs': 43 * KB /* measured 41,373 B, round 6 */},
  scripts: 150, // rc40 (lead): 150 measured — the round's own chunks (arrange-panel, component-sheet, component-spec-view, specification-reading, work-glance, work-records) less the retired spec-view; exact count gate, no spare allowance. (Combined tab refinement measured 146.)
  tiny: 61, // Round 29 adds the shared record-card facade (4,858 B) for canonical inspection; exact count gate.
};
// entry.js has two routes: the Projects page imports one page module; every chapter imports the store, the
// eleven chapters' studios and the shell (round 3, A). Every dynamic import of entry.js that is not the Projects
// page belongs to the chapters route.
const ROUTE_ROOTS = {projects: 'public/projects.js'};

const rel = (outdir, f) => path.relative(outdir, f).split(path.sep).join('/');
function staticClosure(outputs, starts) {
  const seen = new Set();
  const walk = (f) => { if (seen.has(f) || !outputs[f]) return; seen.add(f); for (const i of outputs[f].imports || []) if (!i.external && i.kind === 'import-statement') walk(i.path); };
  starts.forEach(walk); return seen;
}
export function sizeReport(metafile, outdir) {
  const outputs = metafile.outputs;
  const scripts = Object.entries(outputs).filter(([f]) => f.endsWith('.js'));
  const entryFile = scripts.find(([, o]) => o.entryPoint === 'public/entry.js')?.[0];
  // esbuild puts a data module into whichever chunk its importers share, often beside hand-written modules, so
  // data and code are told apart per input module (bytesInOutput), not per chunk.
  const dataName = (input) => Object.keys(BUDGET.data).find((name) => input.endsWith('public/' + name + '.js')) || null;
  const dataBytes = (f) => Object.entries(outputs[f]?.inputs || {}).reduce((n, [i, x]) => n + (dataName(i) ? x.bytesInOutput : 0), 0);
  const codeBytes = (f) => (outputs[f]?.bytes || 0) - dataBytes(f);
  const dataModules = {};
  for (const [, o] of scripts) for (const [i, x] of Object.entries(o.inputs || {})) { const name = dataName(i); if (name) dataModules[name] = (dataModules[name] || 0) + x.bytesInOutput; }
  const rows = scripts.map(([f, o]) => ({file: rel(outdir, f), bytes: o.bytes, code: codeBytes(f), data: Object.keys(o.inputs || {}).map(dataName).filter(Boolean), source: o.entryPoint || null, importers: scripts.filter(([, x]) => x.imports.some((i) => i.path === f)).length})).sort((a, b) => b.bytes - a.bytes);
  const entry = rows.find((r) => r.file === rel(outdir, entryFile));
  const dynamic = (outputs[entryFile]?.imports || []).filter((i) => i.kind === 'dynamic-import').map((i) => i.path);
  const special = new Set(Object.values(ROUTE_ROOTS));
  const roots = Object.fromEntries([...Object.entries(ROUTE_ROOTS).map(([k, src]) => [k, dynamic.filter((f) => outputs[f]?.entryPoint === src)]), ['chapters', dynamic.filter((f) => !special.has(outputs[f]?.entryPoint))]]);
  const routes = {};
  for (const [name, files] of Object.entries(roots)) {
    const closure = [...staticClosure(outputs, [entryFile, ...files])];
    routes[name] = {files: closure.length, code: closure.reduce((n, f) => n + codeBytes(f), 0), data: closure.reduce((n, f) => n + dataBytes(f), 0), eagerData: [...new Set(closure.flatMap((f) => Object.keys(outputs[f].inputs || {}).map(dataName).filter(Boolean)))]};
  }
  const tiny = rows.filter((r) => r.bytes < 10 * KB);
  const buckets = {under10k: tiny.length, from10to50k: rows.filter((r) => r.bytes >= 10 * KB && r.bytes < 50 * KB).length, over50k: rows.filter((r) => r.bytes >= 50 * KB).length};
  const violations = [];
  if (!entry) violations.push('no entry script for public/entry.js');
  else if (entry.bytes > BUDGET.entry) violations.push(`entry ${entry.file} is ${entry.bytes} B (budget ${BUDGET.entry} B)`);
  for (const r of rows) if (r.code > BUDGET.chunk) violations.push(`chunk ${r.file} holds ${r.code} B of hand-written code (budget ${BUDGET.chunk} B)`);
  for (const [name, bytes] of Object.entries(dataModules)) if (bytes > BUDGET.data[name]) violations.push(`${name}.js is ${bytes} B in the bundle (budget ${BUDGET.data[name]} B)`);
  for (const [name, r] of Object.entries(routes)) if (r.code > BUDGET.routes[name]) violations.push(`route ${name} loads ${r.code} B of code to open (budget ${BUDGET.routes[name]} B)`);
  if (rows.length > BUDGET.scripts) violations.push(`${rows.length} script files (budget ${BUDGET.scripts})`);
  if (tiny.length > BUDGET.tiny) violations.push(`${tiny.length} script files under 10 KB (budget ${BUDGET.tiny})`);
  return {entry: entry?.bytes || 0, routes, data: dataModules, total: rows.reduce((n, r) => n + r.bytes, 0), scripts: rows.length, buckets, largest: rows.slice(0, 12), facades: tiny.filter((r) => r.source && r.bytes < KB).map((r) => r.source), violations};
}

export async function bundleClient(outdir = 'dist/client', {sourcemap = 'linked', budget = true} = {}) {
  await rm(outdir, {recursive: true, force: true});
  await mkdir(path.join(outdir, 'assets'), {recursive: true});
  const html = await readFile('public/index.html', 'utf8');
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="\/([^"]+\.css)">/g)].map((m) => m[1]);
  if (sheets.length < 10) throw Error('index.html no longer lists its stylesheets as expected.');
  const css = (await Promise.all(sheets.map((file) => readFile('public/' + file, 'utf8')))).join('\n');
  const {code: styles} = await transform(css, {loader: 'css', minify: true, logLevel: 'error'});
  const cssFile = `assets/app-${shortHash(styles)}.css`;
  await writeFile(path.join(outdir, cssFile), styles);
  const result = await build({
    entryPoints: {app: 'public/entry.js'},
    bundle: true, splitting: true, format: 'esm', minify: true, target: 'es2022',
    outdir: path.join(outdir, 'assets'), entryNames: '[name]-[hash]', chunkNames: 'chunks/[name]-[hash]',
    legalComments: 'eof', metafile: true, logLevel: 'error',
    sourcemap, // 'linked': <script>.js.map beside each script and a sourceMappingURL comment; false ships none
  });
  const [entryFile] = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint === 'public/entry.js');
  const entry = '/' + rel(outdir, entryFile);
  let page = html.replace(/<link rel="stylesheet" href="\/[^"]+\.css">\s*/g, '');
  if (!page.includes('<script type="module" src="/entry.js"></script>')) throw Error('index.html no longer loads /entry.js as expected.');
  page = page.replace('<script type="module" src="/entry.js"></script>', `<script type="module" src="${entry}"></script>`);
  // The theme's boot script (round 9) runs before the first paint, so it stays a classic script in the head; like
  // every other script it is a content-hashed file under /assets/. The app's own fonts are copied under /fonts/,
  // where the stylesheet names them; the Worker packs both with the rest (build.mjs).
  const boot = await readFile('public/theme-boot.js', 'utf8'), bootFile = `assets/theme-boot-${shortHash(boot)}.js`;
  await writeFile(path.join(outdir, bootFile), boot);
  if (!page.includes('<script src="/theme-boot.js"></script>')) throw new Error('index.html no longer loads theme-boot.js');
  page = page.replace('<script src="/theme-boot.js"></script>', `<script src="/${bootFile}"></script>`);
  page = page.replace('</head>', `<link rel="stylesheet" href="/${cssFile}">\n</head>`);
  await writeFile(path.join(outdir, 'index.html'), page);
  await mkdir(path.join(outdir, 'fonts'), {recursive: true});
  for (const font of (await readdir('public/fonts')).filter((f) => f.endsWith('.woff2'))) await writeFile(path.join(outdir, 'fonts', font), await readFile(path.join('public/fonts', font)));
  const scripts = Object.keys(result.metafile.outputs).filter((f) => f.endsWith('.js'));
  const report = sizeReport(result.metafile, outdir);
  report.css = styles.length;
  if (report.css > BUDGET.css) report.violations.push(`stylesheet ${cssFile} is ${report.css} B (budget ${BUDGET.css} B)`);
  const evidence = path.resolve(outdir) + '-';
  await writeFile(evidence + 'metafile.json', JSON.stringify(result.metafile));
  await writeFile(evidence + 'size-report.json', JSON.stringify({budget: BUDGET, ...report}, null, 2));
  if (budget && report.violations.length) throw Error('Client bundle exceeds its size budget:\n- ' + report.violations.join('\n- '));
  return {entry, css: '/' + cssFile, scripts: scripts.length, stylesheets: sheets.length, sourcemaps: sourcemap ? scripts.length : 0, metafile: evidence + 'metafile.json', report};
}

// `node client-bundle.mjs [outdir]` builds and prints the size report; a budget violation exits non-zero.
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  bundleClient(process.argv[2] || 'dist/client').then((r) => {
    console.log(JSON.stringify({entry: r.entry, css: r.css, scripts: r.scripts, stylesheets: r.stylesheets, sourcemaps: r.sourcemaps, metafile: r.metafile, sizes: {entry: r.report.entry, css: r.report.css, total: r.report.total, buckets: r.report.buckets, routes: r.report.routes}, largest: r.report.largest.slice(0, 6).map((x) => `${x.file} ${x.bytes}`)}, null, 1));
  }).catch((e) => { console.error(e.message); process.exit(1); });
}
