# Round 23 · Report

Baseline: the AIW current source snapshot of 2026-10-14, supplied by the owner as AIW v0.10.0-rc.10.73.23 and committed
unchanged as the checkpoint `cf79560`. Branch `claude/dazzling-cerf-a3qshh`, never pushed: every commit exists only in
this container until the owner pushes. Controlling baseline rc.10.73.6; `productionAccepted` false throughout. Release
field after this round: AIW v0.10.0-rc.10.73.24.

Nothing below claims a result that was not observed. Where a figure comes from a live provider run on the owner's
register, the run's outputs stay in the evaluator's scratch space as client material; only counts are reported here.
No person reviewed the drafted design, and nothing here is an approval.

## 1. What was asked

Continue round 12 (make AIW turn the owner's 1,400-requirement register into a real software design document like the
owner's reference SDD) from the new snapshot: assess the snapshot against the assessment of 2026-10-10, then finish the
outstanding items (BRAIN, M, C2, D3, G, A3, E2, K2) and close the round: the live run on the register, a comparison with
the reference, the register re-verified, the full regression, this report, the release and the package.

## 2. The baseline against the assessment of 2026-10-10

The snapshot was checked three ways before any change: a clean install, the syntax check, the lint ratchet and the
build on the checkpoint; the full regression; and a read-only verification of every round-12 requirement against the
code and its tests (126 requirements, at the merge point `0d35183`, by a verification agent working in its own worktree
with the provider keys empty). The 265-item gap register was re-verified at `65a8d53` the same way (section 6).

- **Install and build.** A clean install took 14 s; the syntax check passed for 690 modules; the build passed. The lint
  ratchet found two problems above its baseline (an unused import in `public/brain-reasoning.js` and an unused binding
  in `intelligence-service.js`).
- **Regression.** 227 suites: 194 passed, **33 failed**. None of the 33 was a product regression the snapshot claimed
  fixed; most were suites the round-13 to round-22 work had outgrown (wording, structure), and five exposed product
  defects (section 3).
- **Requirements.** Of 126 requirements: 89 done and tested, 6 done but untested, 24 partial, 7 missing. 18 rested on
  test doubles only. A3 was fully met; D3 had 23 of 25 tested; K2, E2, M and G were the weakest.
- **The gap register file was unchanged** in the snapshot (19 closed, 5 rejected, the rest open or running as of round
  12), although much of its work had been done since.

| Item | 2026-10-10 assessment | The 2026-10-14 snapshot, verified | After round 23 |
| --- | --- | --- | --- |
| BRAIN · Sol drafts with a model | Started: packet and request modules only | Built and integrated (job, contract, guard, receipts), tested on doubles only; the first live trial accepted 0 of 24 proposals | Six live-trial defects fixed; contract asks for a decision's impact, a component's solution and a quality scenario; the SDD reads Sol's proposals; a suite reads a model draft's SDD; live runs in section 4 |
| M · several models | Registry half-written | Registry, routes per mode and pass, fallback, three wires; no provider view, not documented, daily budget not enforced | Provider view (per project) with probe and use by provider; output ceilings per mode; registry, routes and fallback documented; per-provider daily budget still not enforced |
| C2 · content standard and gate | Reader started | Reader, standard and banner; the reader misread Sol's preferred alternative; no suite read a model draft's SDD | Reader reads proposals; a thin section Sol drafted says it falls short, not that Sol has not drafted it; test:sol-sdd |
| D3 · authorship and governance at size | Built, not merged | Merged; 23 of 25 tested; the review plan has no screen | A person's save no longer folds into Sol's drafted change; review-plan screen still open |
| G · screens at size | Built, not merged | Merged; three register items missing, four partial | Unchanged; next round |
| A3 · baselines, recovery, storage | Built, not merged | Merged and fully met | Met |
| E2 · rules drafter at depth | Started | Partial: no assessments or preferred alternative in the rules drafter, category V only from released topics, no application platform, maker and checker roles neither drafted nor open | Unchanged; next round |
| K2 · design comparisons per domain | Not started | A generic guided-comparison engine; criteria tied to no quality category; no core-banking concern candidates | Unchanged; next round |
| Register re-check | 166 entries to re-check | Register file unchanged | Re-verified: section 6 |
| Live run on the register | Not started | None recorded | Section 4 |
| Round close | Not started | Release field rc.10.73.23 as supplied | rc.10.73.24 |

## 3. What was done

62 commits on the round branch after the checkpoint (then this report and the source manifest), of which four are merges of workstreams that ran in
their own worktrees from the checkpoint (A1, A2, B and C, which together fixed the 33 failing suites). Each workstream
was audited before its merge: no check deleted or weakened, no secret, no client text, no model identifier.

**The failing suites (workstreams A1, A2, B, C).** Most of the 33 were suite updates for the product as it had become
(the Co-design wording and structure, the shell's page-load step, the round-18 rail, the bounded register list, the
reasoning contract's fixtures). Five exposed product defects, and two more were found beside them; each is fixed with a
test that fails without the fix:

- the Sol panel had lost its Scope label and its provenance band labels;
- the knowledge workspace did not come into view when opened from elsewhere (Compare in Co-design among them);
- the evaluation's control arm was asked for no citation anywhere;
- the Pattern DNA posture had dropped "never eligible to establish a constraint";
- a person's save folded into an earlier change Sol drafted of the same record, and the folded change was then stamped
  a person's, reviewed, while it held Sol's wording (the "drafted by Sol, not reviewed by a person" label was lost);
- the scale suite's save-status check could never fail;
- Chapter 10 alone of the chapter views lost keyboard focus on a redraw.

**Sol's architecture drafting (BRAIN), from live trials.** Five two-theme trials through Draft with Sol took a theme's
accepted proposals from 0 of 24 to 23 of 24. Each fix is a product defect the trials found: an empty citation list
offered the placeholder "none" and every proposal citing it was withheld; the proposal bound was never told to the model;
a control's category was checked against the decision categories; the check pass read "not stated" as invented; status
words withheld banking nouns (a bank guarantee); platform services were proposed as external parties. The output
ceiling of the architecture passes was raised from 6,000 to 32,000 tokens on the OpenAI wires (every live theme came back
incomplete at 6,000). After the first full run (section 4), the contract was changed to ask for what the content
standard reads: a decision's impact, a component's architectural solution and at least three responsibility sentences,
a quality driver's stimulus, conditions and response, and its target only where the packet states the figure (a target
the packet does not state is withheld). A data entity whose owning component the draft does not propose is placed with
its owner open instead of dropped. Prompt version sol-architecture-3.

**The drafting budget and plan (BR-06).** A drafting job's theme runs leave the interactive budget, which held a
40-theme draft for hours, and are admitted under the project's drafting budget: 120 runs and 6,000,000 tokens in any 24
hours by default, set by the owner within 1,000 runs and 20,000,000 tokens. Before a start, the panel shows the plan:
themes, runs, calls, estimated tokens and cost, and what the budget has left. A failed model run now records the tokens
the provider billed instead of zero.

**Several models (M).** Operations opens Model providers: each provider with its key state (never the key), models,
routes, prices, a check of that provider alone and its use by provider and model over 30 days (M-09, per project). The
registry, the routes and the fallback are documented in the settings table and `.env.example`, and the settings gate
now sees variables read through the helper (M-11).

**The SDD a reader reads (C2, BR-08, BR-09).** Found by the requirement verification and the live run:

- every external integration of a drafted design printed "Used by: no component yet", because the party reading skipped
  every contract still proposed, and every drafted contract is; a party now names the parts its proposed contracts
  reach, as proposals, not decided, and reads how the architecture handles it from them, labelled so;
- the reader read "Open: no alternative is chosen yet. Preferred: …, proposed by Sol" as no decision; it now reads Sol's
  proposal as the decision stated, and asks why another alternative was not chosen only of a person's choice;
- a section Sol drafted with the model that left one statement in five open was bannered "This section is a skeleton;
  Sol has not drafted it", which is untrue of it; it now says it falls short of the content standard, with its reasons,
  and the rules' skeleton keeps its banner;
- the cover's provenance tells Sol's drafts apart by engine: how many with the model (naming the provider and model)
  and how many by AIW's drafting rules;
- Draft with Sol is no longer offered when no architecture model is configured or the owner disallows external AI.

**Gap-register items closed with a fix or the missing test.** GR-DRV-03 (a dash as a target's window or verification
states nothing), GR-CMP-04 ("Unassigned. Open question" asks the question instead of passing as an owner), GR-REQ-10,
GR-SRC-10, GR-FIG-13 and GR-INT-18 (the assertions their acceptance named), and M-12 (the providers suite covers the
per-provider variables and the fallback after a 5xx and a timeout).

**Found reading the live run's SDD.** Every Sol-drafted driver printed "because sol’s reading: …"; it now reads the reason,
then "(Sol’s reading)". Every open decision repeated its whole justification on its Decision line; the line now names the
preference and the alternatives, and the reasons print once.

**Tests added.** `test:sol-sdd` (new): a synthetic double answers all nine proposal kinds for every theme, through the
job, the bundle and the apply into the SDD, which the content standard reads; it fails on the branch before the
integration fix. Further checks in sol-architecture, architecture-job, architecture-service, providers, operations,
journal-archive, deploy-browser, scale-browser, knowledge, interfaces, sdd-architecture, sdd-content,
journey-draft-browser, architecture-model-browser and server-hardening.

**Smaller fixes.** The dialog header's close button showed white on white; two lint problems from the baseline.

## 4. The live run on the owner's register

Client material stays in the evaluator's scratch space: the workbook, the reference SDD, the drafted design, its exports
and the comparison. Only counts are reported here. The draft was started by the evaluator under the owner's authorisation
of 2026-10-08 (a draft model and a smaller check model, on the owner's OpenAI account) and applied unchanged in a scratch
database for evaluation, with no page reviewed: every record reads "drafted by Sol, not reviewed by a person". This is an
automated reading by the lead, not a person's review.

**Spend.** 96 model runs on the register this round recorded 4,006,581 tokens: six two-theme trials (476,845), a first
full run stopped after six runs to apply a fix (242,076), and two full runs (1,605,591 and 1,682,069). Three runs of the
first trial failed before the accounting fix and recorded none, and one run of the third full run was cut off by a
container restart and recorded none; the provider billed what those read and wrote. The live provider check on synthetic
projects used 128,615 tokens over 14 runs. No price table is configured, so no cost is estimated.

**The two full runs.** Run 2 used the contract as the trials left it; run 3 the contract that asks for what the content
standard reads (section 3), resumed from its checkpoint after the restart.

| | Run 2 | Run 3 |
| --- | --- | --- |
| Theme runs, accepted | 38 of 38 | 38 of 38 |
| Proposals accepted, withheld | 851, 31 | 841, 29 |
| Records applied | 1,340 | 1,192 |
| Records meeting the content standard (sections 2-4) | 0 of 554 (every section a skeleton) | 477 of 579 (82 %; no section a skeleton) |
| Decisions meeting it | 0 of 101 | 101 of 105 |
| Components and integrations meeting it | 0 of 288 | 294 of 308 |
| Drivers meeting it | 0 of 165 | 82 of 166 |

**Section by section against the owner's reference SDD.** The reference is a summary design: 16 drivers, 19 decisions, 6
main components and 6 integrations. AIW's edition holds the same seven sections and every subsection the reference has,
at the register's size. The share of each item that states what the reference states:

| Section 2-4 measure | Reference | Run 2 | Run 3 |
| --- | --- | --- | --- |
| Driver description and impact stated | 16 of 16 | 90 % | 99 % |
| Quality driver's scenario stated | n/a | 0 % | 99 % |
| Quality target stated (only where the source states the figure) | n/a | 0 % | 10 % |
| Decision preferred or chosen, with justification | 19 of 19 | 96 % | 97 % |
| Decision impact stated | 3 of 19 | 0 % | 98 % |
| Two or more alternatives | 3 of 19 | 100 % | 100 % |
| Decision stakeholders stated | 12 of 19 | 0 % | 0 % |
| Component with three or more responsibility sentences | 6 of 6 | 50 % | 93 % |
| Component's architectural solution stated | 6 of 6 | 0 % | 93 % |
| Integration: how the architecture handles it | 6 of 6 | 0 % | 97 % |
| Integration: the component that uses it | 6 of 6 | 0 % | 97 % (as proposals) |
| Integration formats and protocols stated | 6 of 6 | 12 %, 9 % | 22 %, 22 % (the rest asked as questions) |

**What still reads worse than the reference.** These are the next round's content work:

- 150 components where the reference has 6 main ones and three supporting ones: concerns recur across themes (19
  reporting, 14 audit, 10 bulk-processing components), because the cross-theme pass merged nothing.
- A component's driver list is every driver its requirements share, not the few it serves with a reason; and a component
  Sol proposed reads "Responsibilities: none realised yet" beside its own responsibility sentences.
- No architectural style statement: Sol proposes one (a modular service platform), but the section prints only a chosen one.
- Stakeholders, dependencies and component coupling are never stated; technology products are never named (by design:
  no product is invented).
- Where the source is silent on an integration's formats, protocols and security, the same question is printed three times.
- 84 of 166 drivers fall short of the standard, most on the prose checks.

## 5. Verification

All on the round-close commit `1c18fc9` unless named otherwise, in this container, with the provider keys empty except
for the live checks named.

- **Install and check.** A clean install (`npm ci`, 112 packages, 12 s, on `cbe2ada`); the syntax check passed for 691
  modules. The lint ratchet found 173 problems against a baseline of 173, none new: the two problems the snapshot
  introduced were removed, and the baseline was lowered from 179 to the current count.
- **Build.** Passed: 217 server modules from the import graph, 136 client script files and one stylesheet, packaged
  imports and asset serving verified. The chapters route measured 2,907,224 B under its cap of 2,908,160 B (2,840 KB):
  the cap moved to the next whole KB under the file's policy after the regression at `c4c5772` found it 88 B over; the
  +773 B since the last measure is this round's client code (commit `27965bd`). Every other budget is unchanged.
- **Full regression.** 227 of 228 suites passed, every `test:*` script of `package.json` among them (Playwright browser
  suites included), at a concurrency of three. `test:model-import-browser` failed: after six of its eight checks passed,
  it timed out after 60 s waiting for Chapter 1 drafted from a model whose names hold markup. It passed on the baseline
  and in the regression before, and has not recurred in 26 runs since: three alone, four beside other copies and a heavy
  browser suite, eighteen at six copies at once (that step took 0.9 to 2.5 s every time), and once after the change
  below. A project read held back 12 s still opens the draft, so a slow project read is not the cause. The cause is not
  found: the suite now reports the page's state, page errors and failed requests when such a wait ends (commit
  `cbe2ada`; no assertion or timeout changed), and the failure is listed as open in section 7.
- **The regression before it** (at `c4c5772`): 226 of 228 suites passed. `test:bundle-browser` failed on the chapters
  route's cap (above). `test:tradeoff-browser` failed once under the runner's concurrency and passed alone with all ten
  checks; it passed in the final regression.
- **`test:sol-sdd`** (new): five checks, a synthetic double answering all nine proposal kinds for eight themes; it fails
  on the branch before the integration fix.
- **The scale suite**, which had failed intermittently (GR-TST-08): eight consecutive runs passed.
- **The live provider check** on synthetic projects: 14 runs completed, 128,615 tokens, on the owner's OpenAI account;
  receipts in `evidence/sol-live/2026-10-14-openai.json`. One provider only: the second provider's live receipt is still
  outstanding.
- **Integrity.** No check was deleted, skipped or loosened to pass: each suite changed this round was read before its
  merge, and one weakening found during the round (the settings gate briefly excluded the test files from its scan) was
  reverted before commit. No secret, no client text and no assistant model identifier is in the diff from the
  checkpoint; the client's workbook, the reference SDD, the drafted design and its exports stayed in scratch.
- **Release manifest.** `SOURCE-MANIFEST.json` regenerated by the script behind `npm run release:manifest`, naming
  this release, and checked with `npm run release:verify`.

## 6. The gap register

The 265-item register was re-verified at `65a8d53` by two read-only verification agents, item by item against its
acceptance, each with the file and line or the suite and assertion that proves it; then items closed later in the round
were updated with their evidence. Each item's round-23 state, evidence and note are in its `round23` field of
`audit/round12/gap-register.json`, and `GAP-REGISTER.md` opens with the summary.

| State | Round 12 | Snapshot as supplied | Round 23 |
| --- | --- | --- | --- |
| closed | 19 | 19 | 231 |
| partial | — | — | 19 |
| open or running | 241 | 241 | 6 |
| needs an outside authority | — | — | 4 |
| rejected (the reason still holds) | 5 | 5 | 5 |
| total | 265 | 265 | 265 |

Twelve items were closed after the re-verification: the six closed by a fix or its missing test
(section 3), GR-FIG-07 and GR-FIG-11 (the desk suite passes in the full regression), GR-TST-08 (eight consecutive runs of
the scale suite passed), GR-TST-03 and GR-SDD-02 (the comparison with the reference, section 4), GR-DRF-21 (live-model
behaviour at size is now recorded). The 25 partial or open items are listed
with what each lacks at the head of `GAP-REGISTER.md`.

## 7. What is still open

From the requirement verification and the live run, most consequential first:

1. **The drafted design's shape (BRAIN, C2):** merge recurring concerns across themes into one component each; a
   component's drivers as the few it serves, with the reason; its logical responsibilities linked; an architectural
   style printed as Sol's proposal until chosen; an integration's open question printed once.
2. **D3's review plan has no screen:** grouped judgements and cause treatments exist only as commands (GR-GOV-04, GR-GOV-19,
   GR-UX-03).
3. **Screens at size (G):** GR-UX-09, GR-UX-13 and GR-UX-17 are missing; GR-UX-10, GR-UX-11, GR-UX-12 and GR-FIG-14 partial.
4. **The rules drafter at depth (E2):** assessments and a preferred alternative per decision, category V decisions from
   unhomed themes, the application platform where evidenced, maker and checker roles drafted or open, released tactics
   and product facts.
5. **Domain comparisons (K2):** criteria tied to quality categories and driver kinds, consequences per criterion, the
   evidence each option needs, and core-banking design concerns as candidates with review packs.
6. **Several models (M):** a provider's daily token budget enforced; an organisation-wide provider view with cost.
7. **The model-import suite's one timeout** in the final regression: cause not found, not recurred in 26 runs; the suite
   now reports the page's state when a draft wait ends (section 5).
8. **Smaller:** GR-SDD-30 needs version-gated wording so that old documents read the same; focus inside Sol's part of the
   companion is lost after a redraw in every chapter (found by workstream A1); the remaining partial register items listed
   in `GAP-REGISTER.md`.

## 8. External authorities and the owner's decisions

Nothing here impersonates or replaces them, and none of their steps is claimed:

| Authority | What only they can do | State |
| --- | --- | --- |
| The owner | Push the branch; decide whether the client's name and row identifiers may appear in the repository; rotate the API keys of the `.env` file uploaded earlier | Not done |
| The owner's architects and an independent reviewer | Review the drafted design through AIW, page by page, and record their judgements (GR-GOV-21) | Not done |
| A four-eyes knowledge approver and licence counsel | Release the core-banking knowledge pack with its passages and rights (GR-DOM-10, GR-DOM-11) | Not done |
| The workbook owner | Answer the open source questions (GR-SRC-08) | Not done |
| A named human reader | Fill the SDD review gate's checklist for an export (C2-10) | Not done |
| Production acceptance | Accept a release for production | Not done; `productionAccepted` is false |
