# Round 26 · Plan — standardising the Work, Model, Validate and Output tabs

Release: AIW v0.10.0-rc.10.73.27 (from rc.10.73.26, commit c3d0289). Controlling baseline AIW v0.10.0-rc.10.73.6.
Companion: `GAP-REGISTER.md` (every gap with its source, severity, decision, workstream and acceptance).

## 1. What was asked

A deep, chapter-by-chapter refinement pass, acting as AIW's product owner and solution architect: standardise the Work,
Model, Validate and Output tabs so they are the most functional, useful, easy to use and easy to understand they can be,
without losing any existing feature, functionality or capability; the tabs are contextual per chapter, so the review had
to be per chapter and from a user's seat. The owner's questions, which this plan answers in §3:

- Is the purpose of each tab clear?
- Work: what is its function; is the layout right; is it noisy; what should it do?
- Model: are the toggles, views and capabilities uniform across chapters; are the models useful and descriptive; is the
  AIW brain deeply embedded; what is missing; how does it compare with Orbus; is the layout right?
- Validate: is it logically arranged; is intelligence embedded; is it confusing, scattered or noisy; what is missing?
- Output: what is its function; is the layout right; what is missing?

## 2. How the review was done, and what it found

Five read-only reviews of rc.10.73.26 (details and evidence in `GAP-REGISTER.md`):

- a code map of the four frames across the eleven chapters (which chapter bypasses which frame, why, what pins it);
- four browser reviews from a user's seat on the reference project and on a blank project, Sol not connected, every
  control pressed, every dialog read, screenshots kept, every form cancelled. Four things were saved by the app during
  the walks, each in a private database since deleted, and each is itself a finding: "Run checks" (a check stamp, every
  chapter), Chapter 2's priority arrows, Chapter 6's "Record failure review" and Chapter 7's "Set draft preference",
  which all save on one click.

Limits of the review, stated plainly: no language model was connected, so every Sol surface was read in its unconnected
state; no record was created, edited, retired or treated, so the effects of saving were not observed; a few controls
were not reached by the harness (Chapter 8's blank "Data derivations" stage, Chapter 10's "Technology usage" picture,
Chapter 11's trail-review form, some Chapter 9 table and matrix clicks); dark theme, keyboard-only use and screen readers
were not reviewed. The register has 98 rows: 58 major, 40 minor.

The round-3 contract still stands and is the right one: **Work edits, Model shows, Validate checks, Output documents**;
one Model switcher (Diagram · the chapter's own views · Layers · Table · Matrix · Whole design); Validate as a status
header, findings by object and kind with Open · Ask Sol · Treat, and "This chapter in the SDD"; Output as the chapter's
documents and exports. What the review found is that the contract is carried by two generations of frames and eleven
local variants, so a user meets the same idea in three or four forms:

| Tab | What is uniform (and good) | What is not |
|---|---|---|
| Work | the shell (tabs, "You are here", Ask Sol · Co-design · Hover help, Next task, details column), the form pattern (sections, ✦ suggestions with their provenance, Fill with Undo), honest empty states, the carry-forward dialog | two section-switch designs (the shell cannot read Chapters 1–3's, so "You are here" always says "Records"); a record the user never chose filling the details panel (Chapters 2–3); a selection carried into the next chapter (4–11); two details-panel designs; saves without confirmation or undo (2–3); flat object pickers; three Work templates in Chapters 4–6; a dead "Explore a draft suggestion" in Chapter 3 and silent tab jumps |
| Model | one switcher, perspectives, lenses, the companion (what the model shows · checks · reading · Sol), Key in sentences, SVG/PNG/Code export on Diagram, empty states that name the next action | four icon-only views, a wrapping toolbar, truncated crumbs, a silently remembered view; tools that move between views; chapter selects in three places; labs as second cards under the shell; pictures clipped and tiny; counts that disagree with every other screen; selection not announced in six chapters; two layer vocabularies; shared views that read as data dumps; a different default-view rule for Chapters 4–10 |
| Validate | the three readings, four tiles, Run checks, findings with Open · Ask Sol · Treat, model prompts, the SDD table, the doctrine line | three frames (no causes table in Chapter 1, a select in Chapter 11, filters named three ways, defaults that differ, three toasts, Chapter 1's Run button not adopted); no "do this first" and the same findings three times on a 3,000 px page; cut and duplicated labels; a stub "Focused case" that removes the details column; Chapter 11 words inside Chapters 1–3; no bulk confirmation |
| Output | the documents card ("N documents this chapter can produce now", "Needs later chapters", "none approves anything"), "What comes next", "Inspect SDD passages" | duplicate downloads under two names; a "JSON" that is the whole project; three export mechanics; no preview anywhere but Chapters 2 and 5; record rows that select-and-edit, navigate or do nothing; Chapter 4 listing its links rather than its records; a carry-forward dead end; live exports under "Nothing can be produced yet"; Chapter 11 outside the frame |

## 3. Answers to the owner's questions

**Is each tab's purpose clear?** No. The purpose is right (edit · show · check · document) and the help map states it,
but the tabs themselves carry no hint; the reviewers found the "?" two clicks deep and never linked from the words it
defines. Decision D-26-01 puts one purpose line on each tab.

**Work.** Its function is to record and connect the chapter's objects through dialogs, with the details column as the
place to read one record and the Next task strip as the guide; that is the right function. The layout is right in
Chapters 4–11 (head card · stages · register · milestones) and almost right in 1–3; the noise is in the details column
(a 3,000 px card for a record nobody chose; four stacked blocks for one record), in badges repeated on every row, in
import vocabulary on a five-row register, and in developer words ("spark", raw timestamps, internal ids). What it should
do that it does not: say how to select a row, keep a selection inside its chapter, confirm or offer Undo on one-click
saves, offer grouped pickers, review proposed needs in a table, and show a record's check status on its row.

**Model.** The toggles and views are *structurally* uniform (one switcher, one companion) but *behaviourally* not: the
default view, the status line's place, the walk's meaning, the Key's place, the chapter selects' place and the attribute
names all differ (D-26-06, D-26-07). The models are useful and, in the chapter's own views, descriptive: the Journey map,
Utility tree with What-if, Trade-off matrix with the decision reading, Responsibilities and Coverage, Components and
Specification, Platform and "If a capability fails", Stack and Options, Data flow, Threat model, Deployment and "If a
zone fails", and the desk's Vitals. The shared views (Layers, Table, Matrix, Whole design) are where description fails:
internal ids, empty columns, ungrouped axes, a different layer vocabulary (D-26-11). The AIW brain is embedded deeply in
the companion (rule-based observations with "Ask:" questions, Chapter N checks, the reading of the view, Sol with the
exact packet) and in Chapter 6's failure reasoning and Chapter 3's decision reading; it is thin in Chapters 7–11's
Model defaults and absent from the shared views. What is missing against Orbus iServer, Sparx EA, Ardoq or LeanIX: a
stakeholder viewpoint catalogue (perspectives are the seed), per-element impact analysis beyond the hover sentence,
picture export from every view, a published figure, table exports (CSV), a dashboard beyond the milestones, drag to link
or reorder, baseline compare on pictures, saved filters on Table. Where AIW is already ahead: the observations beside
every picture, the walk across every layer, the utility tree, the weighted trade-off with sensitivity and what-if, honest
empty states, MADR, provenance on every record, "Inspect what will be sent" before any model call. This round takes the
uniformity, the shared views, picture export on every view, one walk control and the counts; it defers the viewpoint
catalogue, impact analysis, CSV export, dashboards and drag editing (§8). Chapter by chapter: Chapter 7 reads its
weighing only on the Model while Work records blind (D-26-17); Chapter 8's sequence picture has unlabelled arrows;
Chapter 9's Diagram does not fit and Fit does nothing; Chapter 10's grid is dominated by "Not placed" rows and its failure
simulation has two entrances; Chapter 11's desk marks parts "critical" against an assumed example and never defines its
words (D-26-18); the Table and Matrix miss each chapter's key column and default relation.

**Validate.** The arrangement is logical in outline (readings → status → causes → findings → model prompts → SDD) but
not in experience: the same findings three times, no "do this first", three frames. Intelligence is embedded (findings
by cause with the rule that raised them, Ask Sol on a finding, Treat into Chapter 11, model prompts) but not surfaced as
a plan. It is confusing where frames differ, scattered where Chapter 11's words and stubs appear in Chapters 1–10, noisy
where labels are cut and groups duplicated. Missing: a "Next three things" block, bulk confirmation after review, a
"?" per check, per-chapter model prompts for Chapter 11, inherited findings marked as such (D-26-12).

**Output.** Its function is to produce the chapter's working documents from saved records and to hand the chapter
forward; that is right, and the honest doctrine line is right. The layout leads with the documents card, which is right,
but the card offers the same file under two names, a "JSON" that is the whole project, and no way to see a document.
Missing: Preview for every document, one per-record action ("Open in Work"), the chapter's own records on the page,
a revision and date on each document, one export mechanic, a carry-forward that says why it cannot proceed, exports
disabled with the reason on an empty chapter (D-26-13). PDF/DOCX for registers, versioned export history and publishing
are deferred (the SDD already has Word and PDF).

## 4. Decisions

D-26-01 **Each tab says what it is for.** One line under the tab bar, the same words in every chapter: Work "Record and
connect this chapter's objects"; Model "See what you have recorded, as pictures and tables"; Validate "Check what is
recorded; nothing here approves"; Output "Produce the chapter's documents and hand it forward". The help map keeps the
detail; its "Words used here" glossary is linked from the line.

D-26-02 **One Work frame.** The section switch is a `nav.work-stages` of buttons with `aria-pressed` and `data-stage` in
all eleven chapters (the shell reads it for "You are here"; `?section=` in the address deep-links it). Chapter 1's second
stepper strip goes; the brief card keeps its own three-step progress line. Every chapter opens on its first stage.
Chapters 4–11 share one Work template: head card · stages · register · milestones (open, one layout) · private note where
the chapter has one; one review action name ("Review what this chapter inherits"); one badge vocabulary (the
provenance labels of round 9).

D-26-03 **Arrival, selection and the record card.** A chapter arrives with its guidance in the details column; a record
fills it only when clicked or named in the address. A chapter change keeps a selection only if the record belongs to the
new chapter (OBJECT_TYPES) or the address names it; otherwise the panel shows the chapter's guidance and the subject strip
is released. One record card in every chapter: head (id, title, state, provenance), the record's open findings, a small
neighbourhood, then disclosures (Details · Relationships · History · Upstream rationale · A useful next thought · Retire);
Chapter 6's Context · Dependencies · Quality & decisions · Recovery become sections of it. A decision is shown as its
question, state, drivers and both alternatives, never as one alternative's text under the decision heading. Rows carry a
visible "Details" affordance and a check-status chip. Object pickers are grouped by chapter (this chapter first) and
searchable; relationship verbs are filtered by the pair. Chapter 6 reviews proposed needs in a table with keep / untick
and "Accept all proposed for this component" (each still recorded through the existing command).

D-26-04 **One-click saves say so and can be undone.** "Record input review", "Mark inputs reviewed", "Use as working
choice" and the priority arrows keep their immediacy but show "Saved · Undo"; Undo issues the inverse command. Dialog
saves are unchanged.

D-26-05 **Proposals where the user is; no silent jumps; no dead controls.** "Explore a draft suggestion" opens the
proposal in the details column on Work in Chapters 1–3 alike (Chapter 3's button is wired), with "Open on Model →" as the
secondary link; the Model banner stays for those who go there. Every control that leaves the tab names its destination
("Preview impact on Model →", "Delivery evidence → Validate"); "← Back" returns to the previous panel state. A control
with nothing to do is disabled with the reason (Add menu, Connect on a blank project, Propose modules without a column).

D-26-06 **One Model switcher and one default rule.** Seven labelled views on one row (an overflow menu when the row is
narrow); the scope crumb in the title row with room; Questions ▾ explains the views (hover and "?") and no longer switches
them; a remembered view opens with a "Remembered · Reset to <view>" chip. Every chapter opens on its own first view, as
`defaultView()` already names it; Diagram is second. The address writes `model=<view>` for every view so a view can be
deep-linked (today only saved perspectives can).

D-26-07 **One footer and one picture row.** Every view of every chapter has the same footer: walk · status · Key · − + Fit.
The chapter's selects (Diagram picture, Connections, journey, realisation, scenario) sit in one picture row under the
switcher in every chapter. Labs live in the footer's walk slot with one control set, Start · Next · Record this walk
(Chapter 4 journeys, Chapter 5 scenarios, Chapters 6 and 10 failures, Chapter 9 journeys, Chapter 11 steps); recording
writes the walk the milestone counts. Whole design keeps its chips but uses the shared Key and zoom. A caption under the
lens row says what the lens and depth change.

D-26-08 **Pictures at size.** Fit to width on open; a minimum rendered label size with zoom-to-fit; names wrap and are
never cut; the stage uses the free height; SVG · PNG · Code export on every view.

D-26-09 **One count and one vocabulary.** A chapter's record set is the OBJECT_TYPES rows of that chapter
(`chapterRecordSet(p, chapter)` in one module); every "N records" on Work, Model, Validate and Output prints it; any
larger number is captioned ("42 elements, including Chapter 4's responsibilities"). Findings arithmetic is
`chapterChecks` everywhere (to fix · to confirm · passing). One plural helper for every count; "spark" becomes
"suggestion"; dates in the app's format; internal ids (process steps, packets, object keys) behind a Details disclosure
or hidden; one id per record (Chapter 2 prints QD-001 only); one chapter-name table (GR-UX-16).

D-26-10 **Selection announced everywhere.** Chapters 1–3 and 9–11's models dispatch `announceObject` on every selection
path; the address writes `object=` in every chapter (the inbound aliases `artefact=`, `driver=`, `decision=` stay). Links
to other chapters carry record ids, never internal keys.

D-26-11 **Shared views that describe.** Matrix rows and columns come from chapter record sets (no internal process
ids), axis lists are grouped by chapter, each chapter's Matrix default is its own relation (Chapter 6: Components ×
Capabilities). Table shows one type column, the record's kind, and hides empty columns by default ("Show empty columns").
Layers draws its lanes on arrival (the summary stays as a toggle) and names lanes by record type. One layer vocabulary
(the chapter-layers table) for the sidebar and Whole design; the sidebar panel is hidden on views it cannot filter.
Companion readings fold to one line with "More"; the observations appear once per surface with a scope switch; no
label is cut. Specification opens on the first component; the blank diagram's card shows no raw timestamp.

D-26-12 **One Validate frame.** In all eleven chapters: readings → status tiles (plain buttons that name the filter they
set) → "Next three things" (the first to-fix items, then the cause with most records) → findings by cause (full names, a
"?" with the rule sentence per cause; Chapter 1 and 11 adopt the frame's table) → one filter contract
(`nav.findings-filter button[data-filter][aria-pressed]`, a `select[data-filter]` where the chapter needs one) with one
default (the first category with findings, else All) → findings grouped by their own object (parent in small type) with
Open · Ask Sol · Treat and multi-select "Confirm selected after review" (a reviewer name; each record confirmed through
the chapter's own review command; nothing is approved) → model prompts (same list and "show all" as the Model; Chapter 11
gets prompts) → "This chapter in the SDD". Inherited findings are marked "fix in Chapter N →" outside the chapter's
count. "Focused case" is offered only when a case exists (the link to create one kept). "Treat this finding" with
Chapter 11 as a footnote. One Run checks hook (`data-run-checks`, any label) and one toast ("Checks recorded for what is
saved now."). The cause table, groups and SDD table are collapsible so the page is a page.

D-26-13 **One Output kit.** The documents list comes from the registry for all eleven chapters: document · Preview ·
Markdown · HTML · JSON (only where the document has its own data JSON) · packs (MADR zip, OpenAPI/AsyncAPI), each offered
once; "Project data (JSON)" once per page; the register's HTML view is served by the export route (`view=1`) as the ARS
and specifications are, and Preview opens it in a dialog with "Open in a new tab" and the downloads. Register pages list
the chapter's own records (Chapter 4: responsibilities, then their links) with one per-record action, "Open in Work",
and the per-record formats where they exist; rows never edit on Output. Carry-forward shows the handoff summary with a
disabled action and the reason inline; on an empty chapter the exports are disabled with the reason. Every document's
first line carries the project revision and the date. Chapter 11 keeps its cover, board and export form; the frame's
documents list is folded under them and the SDD-passages disclosure is offered; MADR becomes a registry document; one
export mechanic (`downloadExport`) with the chapter appendices as data.

D-26-14 **Framework hygiene, no visible change unless named.** Chapter 7's filters get `aria-pressed`; the
empty-category switch reads the filter contract; the Run button is adopted by hook; every finding row carries
`data-finding-id`; Chapter 8's `data-cm` is renamed; one dialog class contract (`dialog l-dialog <chapter>-dialog`);
DESIGN-CHAPTER-MODELS.md and DESIGN-ANATOMY.md corrected to the code. A convention with no pinning suite gets its test
before it changes (standardisation-notes §5).

D-26-15 **A part of the page that fails to load says so.** Every lazy import reports through `reportFailure` with a
Reload action; LOCAL-RUN.md names `npm run start:production` (the bundle) for use and `npm start` for development.

D-26-17 **Chapter 7 reads where it records.** The weighing of the options against the drivers (the round-25 reading:
"as the drivers weigh them", the lean, how firmly, the bounds, "AIW does not choose") is shown under Work · Compare's
decision reading beside the judgement cells, with the recorded / with-suggestions split; Model · Options stays the
exploring view, its cells open the reading with "Open in Work to record", and "Record suggested judgements" stays
available from both places. The reading keeps two options side by side at the default layout.

D-26-18 **No verdict from an assumed example.** A reading computed against an assumed Playbook example (Chapter 11's
capacity "critical" against "3,125 req/s · assumed (playbook example)") is shown grey as "no target recorded" until a
person saves an objective; the example is offered as a proposal on What it takes ("Use this example as the
objective?"), never as a verdict. The desk's words are defined where they appear (a one-line legend under the tiles;
"vitals", "no signal", "not carried", "to watch", "probe" in the glossary); "Sol's rounds", "the attending architect" and
"℞" give way to "Sol's review notes" and "fix".

D-26-19 **One figure per chapter model in the SDD.** The architecture edition embeds a figure for every chapter model
that can draw one (Chapter 9's threat model first, then Chapter 8's sequence, Chapter 2's utility tree, Chapter 11's
trace), each with its hash as the four existing figures carry; the executive edition carries the context figure. Done
in the export route's figure set, with the Word and PDF editions following.

D-26-16 **Nothing is lost.** Every capability in `features-to-keep.md` stays; chapter instruments are slots in the
frames (the question bar, the environment bar, labs, intake and seeding, the library, the sensitivity panel, the impact
review, the assurance surface, the content report, the readiness board, the export form). A workstream that cannot keep
one says so in its merge note and the lead decides before merge.

## 5. Workstreams

Parallel worktrees from c3d0289 (after the plan commit), audited merges by the lead (no loosened or deleted assertion;
no secrets; no client text; no model identifiers). File ownership avoids most conflicts: W2 owns the Model modules, W3
the studios' `validation()` functions and the Validate frame, W4 the studios' `output()` functions and the Output frame,
W5 the studios' Work surfaces (`work()`, `inspector()`, forms, dialogs, pickers), W1 the shell.

| WS | Who | Scope (decisions) | Files owned | Tests to add first |
|---|---|---|---|---|
| W1 | lead | D-26-01, D-26-03 (chapter change rule), D-26-09 (helpers: `chapterRecordSet`, `plural`, `appDate`; the Sol panel's unconnected text and the 409), D-26-10 (shell side), D-26-15 | `app.js`, `workspace-ux.js`, `shell-ux.js`, `brain-context-ui.js`, `util.js`, `project-context.js`, `entry.js`, LOCAL-RUN.md | `ux-shell-browser` (purpose lines, section in "You are here"), `workspace-validate` (chapter-change rule, lazy-load notice), `counts-validate` (new), `wording-validate` (new) |
| W2 | agent | D-26-06, D-26-07, D-26-08 (incl. Chapter 9's Fit), D-26-10 (view modules), D-26-11 (incl. Chapter 7–8 catalogue columns and Matrix axes, Chapter 10's "not placed" tray, Chapter 11's Trace column), D-26-14 (M6, docs), D-26-17 (Model side), D-26-18 | `instrument-tray.js`, `model-stage.js`, the eleven `*-view.js`, `notation-view.js`, `model-table.js`, `model-matrix.js`, `layers-view.js`, `anatomy-view.js`, `perspective-view.js`, `chapter-sol.js`, model CSS, DESIGN docs | `tray-validate`, `model-views-validate`, `model-views-browser`, `selection-consistency-validate`, `screens-at-size-browser`, `exchange-browser`, `desk-browser`, `threat-browser`, `deploy-browser` |
| W3 | agent | D-26-12 (incl. Chapters 7–8's templated rows folded by cause, Chapter 11's "passing with nothing behind it" and blank group titles, one verb Treat), D-26-14 (V2–V8) | `validate-view.js` (mountValidate and its helpers), `readiness-model.js`, `validation-models.js`, `requirements-scale.js`, the eleven studios' `validation()` and finding rows, Validate CSS | `validate-browser`, `requirements-browser`, `focused-case-browser`, per-chapter node suites for `validation()` |
| W4 | agent | D-26-13 (incl. Chapter 8's OpenAPI gap words and schemas-only document, Chapter 11's file names, preview menu and handoff reason), D-26-14 (O1–O4), D-26-19 | `output-documents.js`, `validate-view.js` (mountOutput), `worker.js` + `server.js` export route (register HTML view, figures), the eleven studios' `output()`, `review-ui.js` (Output parts), `madr.js`, `interfaces-domain.js` (contract export), Output CSS | `output-stage-validate`, `validate-browser` (`vx-stage`/`vx-out`), `sdd-documents-browser`, `madr-validate`, `interfaces-validate`, export filename assertions in logical/realisation/technology |
| W5 | agent | D-26-02, D-26-03 (studios), D-26-04, D-26-05, D-26-09 (studio wording), D-26-17 (Work side), the per-chapter Work rows of the register for Chapters 1–11 | the eleven studios' `work()`, `inspector()`, forms, dialogs, pickers; `studio-kit.js` (record card, picker, nav); `register-list.js`; Work CSS | `requirements-browser`, `utility-browser`, `tradeoff-browser`, `studio-dialog-browser`, `technology-capability-handoff-browser`, `technology-selection-ux-browser`, `technology-choice-browser`, per-chapter node suites for `work()`/`inspector()` |

Shared contracts (named here so the workstreams build against the same words):

- Work section switch: `<nav class="work-stages" aria-label="Sections"><button data-stage="…" aria-pressed="true|false">`;
  the shell writes `section=` and reads the pressed button for "You are here".
- Record card: `recordCardHTML(project, record, {chapter, findings, neighbourhood, open})` in `studio-kit.js`, with
  `<details>` sections `data-card-section="details|relationships|history|upstream|next"`.
- Findings filter: `<nav class="findings-filter"><button data-filter="gaps|review|all" aria-pressed>`; a chapter that
  needs a select uses `<select data-filter>`.
- Finding row: article `.finding` (old classes kept one release) with `data-finding-id` and `data-finding-object`.
- Run checks: the studio's button carries `data-run-checks`; the frame adopts it by that attribute.
- Model switcher: `trayButtonsHTML(chapter, attr)` unchanged in signature; the view button gains a visible label for
  every view; the address writes `model=<view>`.
- Footer: `toolsHTML(prefix)` is the only Key/zoom host; the walk slot is `.cm-walk-in` with `data-walk="start|next|record"`.
- Counts: `chapterRecordSet(p, chapter) → {records, byType, caption(n)}` in `chapter-records.js`; `plural(n, noun)` in `util.js`.
- Output: `OUTPUT_DOCUMENTS` entries gain `preview: true` where the route serves `view=1`; `documentListHTML(p, chapter)`
  renders the list; `downloadExport(path, fallback)` is the one mechanic.

## 6. Order of work

1. Plan commit (this file and the register).
2. W1 lands the shared helpers and contracts first (half a day), so the others import them; W2–W5 branch from that commit.
3. W2–W5 in parallel; each adds its pinning tests before changing an unpinned convention, runs its own suites and lint,
   and writes a merge note (what changed, what was kept, which assertions were replaced and why).
4. Lead merges W3, W4, W5, W2 in that order (least to most shared files), auditing each merge; conflicts in the eleven
   studio files are resolved by the lead.
5. Full regression (`release-checks.mjs`, concurrency 2, browser suites included), clean install and build, lint
   ratchet, bundle budget measured and recorded if raised.
6. Evidence (`audit/round26/evidence.json`), report (`ROUND26-RELEASE.md`), release field, manifest with `--release`,
   package and SHA-256; tracker updated; honest final report.

## 7. Acceptance

- Every row of `GAP-REGISTER.md` marked done has its acceptance suite green, or is listed in §8 with the reason.
- No capability in `features-to-keep.md` is lost (the lead checks the list against each merge note).
- No assertion deleted or loosened; every replaced assertion at least as strict (counted in the merge audit).
- 100 % of the regression suites pass; lint has no new problems; the bundle stays within its recorded budget.
- productionAccepted stays false; no external authority is impersonated.

## 8. Deferred (named, not hidden)

Listed with the reason; each is a candidate for a later round.

- A stakeholder viewpoint catalogue (named, owned, audience); per-element impact analysis ("what breaks if"); CSV export
  of Table and Matrix; dashboards; drag to link or reorder; baseline compare on pictures; saved filters on Table.
- SDD versions and compare (a baseline list, "changed since" marks, a redline view): the freeze exists, the comparison
  does not (R26-O-13).
- PDF/DOCX and export history for the chapter registers (the SDD has them); publishing to a portal; document templates
  beyond the two editions; comments on the preview; a roadmap picture for plateaus.
- Per-chapter review marks with reviewer and date in Chapter 11 (the architecture review is recorded for the whole
  design only); reviewer assignment, due dates and sign-off trails.
- Risk scoring with a heat map, STRIDE or LINDDUN mapping and a reusable control library in Chapter 9; side-by-side
  environments, numeric RTO/RPO fields and infrastructure import in Chapter 10; a product catalogue with lifecycle and
  bulk judgement entry in Chapter 7; schema import and contract versioning in Chapter 8.
- The journey draft's citation filter (R26-V-19): the drafter cites Playbook passages unrelated to the chapter.
- Bulk owner / acceptance / journey-step editing on the Chapter 1 register (GR-UX-10); the indexed requirement API
  (GR-UX-13); the missing field editors (GR-UX-17).
- Drafting-surface wording J-22, J-23, J-42.
- A per-check catalogue page with run history (this round gives each cause its rule sentence).
- A per-record form per record type in Chapter 1 beyond hiding fields that do not apply (R26-W-13) if the form change
  proves larger than a day.

## 9. External authorities

Unchanged from round 25 and recorded honestly: the owner pushes the branch and rotates the credentials named in the
round-25 report; a person on the owner side states, chooses and accepts decisions and reviews drafted designs; the
owner's architects and an independent reviewer review a drafted design; a four-eyes knowledge approver and licence counsel
release the knowledge pack; the workbook owner answers the open source questions; a named human reader fills the SDD
review gate; production acceptance accepts a release. None of these is done by this round.
