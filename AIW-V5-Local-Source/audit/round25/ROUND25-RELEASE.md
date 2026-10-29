# Round 25 · Report

Baseline: AIW v0.10.0-rc.10.73.25 at `c346e2a` (the round-24 release manifest). Branch `claude/dazzling-cerf-a3qshh`,
never pushed: every commit exists only in this container until the owner pushes. Controlling baseline rc.10.73.6;
`productionAccepted` false throughout. Release field after this round: AIW v0.10.0-rc.10.73.26.

Nothing below claims a result that was not observed. Figures read from the owner's register come from runs in the
evaluator's scratch space, which keeps every output as client material; only counts are reported here. No person
reviewed a drafted design, a reading or an export, and nothing here is an approval.

## 1. What was asked

The owner asked whether AIW is now a reasoning product. The answer was: partly. It reasons deterministically and
traceably, a model advises with citations, and a person decides; but it did not conclude trade-offs. Three steps were
named that would make it more of one within its doctrine: finish the trade-off criteria so AIW can rank a decision's
alternatives against the design's drivers, the choice staying with a person; release the knowledge pack so approved
knowledge can inform the reasoning; and run the round-24 pipeline live. The owner replied: "ok. then lets do it. go
ahead." The plan is `audit/round25/PLAN.md` (commit `f29f0b7`).

In scope: the first step, in full. The other two are not AIW's to do: the knowledge release is a four-eyes approver's and
licence counsel's act, and the live run waits on a provider (the owner set it aside on 14 October after the Anthropic
account asked for identity verification; the OpenAI project's spend limit still refuses).

## 2. What the investigation found

The arithmetic was there; the reasoning was not. One function summed priority weight times effect over a decision's
drivers and named a "favoured" alternative when one total was highest. Nothing checked whether an alternative breaks a
constraint (the tally could favour one that does), nothing found an alternative that is no better than another on any
driver, there was no order or margin, no statement of how firmly the lean held beyond a one-step priority change, and
unknown effects counted 0 with no test of whether stating them could change the lean. Sensitivity was computed in five
places and Chapter 7 weighed with its own copy of the sum.

Defects found on the way: a decision's link to a driver that no longer exists weighed 1; the Chapter 3 map showed "×1"
for a driver with no priority, which weighs 0; a trade-off test passed the drivers array where a priority map belongs, so
every weight in it was 1; the SA Playbook's conditional mark "(x)" became plain support when a style or pattern was
offered; dead code (`styleFit`, two re-exports); and wording that contradicted the code ("No hidden score or automatic
winner is calculated" beside a "★ Favoured" mark, an SDD section that "scored" each alternative, "Critical, Important,
Supporting" for priorities that have been High, Medium and Low since round 12).

## 3. What was done

29 commits on the round branch after the baseline (then this report and the source manifest), of which 3 merge
workstreams that ran in their own worktrees. Each workstream was audited before its merge: no check deleted or loosened
(every changed assertion was read and is replaced by one at least as strict; they are named in the merge commits), no
secret, no client text, no model identifier.

**W1 · The decision reading (lead; D-25-01 to D-25-08, D-25-11).** One pure engine, `public/decision-reading.js`, reads a
decision's alternatives against the drivers it names, from recorded facts only (the drivers, their priorities and kinds,
each alternative's recorded effects, and the constraint records a constraint driver links). It imports no knowledge
module. What it reads:

- **Hard constraints.** A new effect, "Breaks it", can be recorded only against a constraint driver. A constraint driver is
  hard unless every constraint record it links is Should or Could. An alternative that breaks a hard constraint is ruled
  out of the order; breaking a soft one counts as tension. A working choice that breaks a hard constraint is an error
  finding, so the decision cannot be accepted or approved until a person changes the choice or the constraint. Sol's
  drafting contract keeps its four effects: a model never rules an alternative out.
- **Dominance.** At least as good on every driver and better on one, whatever the unstated effects turn out to be (no
  weights involved); as the effects stand, it is reported as provisional with the effects that could undo it. A dominated
  working choice is a warning.
- **The order and how firmly it holds.** At the default weights (High 3, Medium 2, Low 1; supports +1, tension −1,
  unstated 0), with ties shared and margins given. Then, exactly rather than by sampling: whether the lead holds for every
  weighting that keeps the priorities' order (level 1), only if drivers of the same priority count alike (level 2), or only
  at the default weights (level 3), naming the drivers that would swing it.
- **The unstated effects.** Each total bounded with them at their worst and best, and whether stating them could change
  the lead, the leader's first.
- **Where the two at the top pull apart, the sensitivity points, and where the working choice stands.**
- **Suggestions** (`public/decision-suggestions.js`): for an unstated cell, what an eligible released claim linked to the
  alternative, or the SA Playbook's mark for its style or pattern, would suggest, with its source; "x" suggests supports,
  "(x)" suggests nothing and asks whether the condition holds. A suggestion is never counted; whether recording them
  would change the lead is a labelled hypothesis. Candidate and withdrawn knowledge suggest nothing.

Every caller was moved to it (the Chapter 3 model, the review desk's probe, the utility tree and Chapter 2's What if, the
what-if, Chapter 7's weighing) and the old paths were retired: the tally, its weight tables, `styleFit` and the
re-exports. The doctrine fingerprint (`knowledge-retrieval-validate.mjs` §9) now holds the whole reading unchanged by
candidates and by release. On the 27 decisions of the seven reference projects the reading's leads, totals and
sensitivity points equal the old tally's. D-25-12: the Anthropic wire logs a provider failure as the OpenAI wire does
(status, error type, request id; never the key or the message), so a refusal like round 24's identity-verification gate
is diagnosable without reproducing the call.

**W2 · The screens (D-25-03, D-25-05 to D-25-08, D-25-11).** Chapter 3's map, rail, feet and alternative panel show the
lead on the drivers and how firmly it holds, ties, alternatives a hard constraint rules out (marked, not ranked) and
dominated ones, the working choice's standing, the totals with their ranges and the reading's note ("Arithmetic on the
recorded effects, not a measurement; it does not choose."). The matrix and the Work tab's driver evidence show
suggestions labelled as not counted, with their source; "Use this suggestion" opens the comparison editor filled in, for
a person to review and save, and what they save is theirs. "Breaks it" is offered only for a constraint driver. The
review desk's probe, the what-if, the utility tree and Chapter 7's comparison read the same reading. Light, dark and
forced colours.

**W3 · The SDD (D-25-05 to D-25-07, D-25-09).** An open decision's line names the lean as the drivers' lean, labelled as
AIW's reading of the recorded effects and not a choice, apart from Sol's proposal (which still prints "proposed by Sol,
not accepted"); a working choice that does not lead, breaks a hard constraint or is dominated is said to be. An
alternative not chosen that no person gave a reason for gets "AIW's reading:" (ruled out, dominated, or its rank and
total) while the question why stays open in Appendix B. The trade-off analysis prints the criteria with their weights and
those left out, a table of totals (with ranges), effects and standings, the result and how firmly it holds, the unknowns
that could change it and the sensitivity points; the executive edition says the same in a few words; rules-drafted
effects carry their own label. The SDD weighs; it never "scores", "favours" or "recommends", and the size suite checks
that at the register's scale.

**W4 · Drafting and design concerns (D-25-09, D-25-10).** E2: AIW's rules drafter drafts the assessments of an
alternative that follows a Playbook style or pattern from its marks, read exactly as the suggestions read them, each
marked "drafted by AIW's rules" until a person sends it again (`decisions-domain.js` keeps the mark as it keeps Sol's).
The preferred alternative E2 asked for is the reading's lead, computed when read and never stored; the rules drafter
records no recommendation and no choice. K2: a released design concern's criterion may name a quality category and a
driver kind, an option the evidence it needs and its consequence per criterion (`criterion:<id>|<label>|<question>|
<category>|<kind>`, `option:<id>|<title>|<trade-off>|<evidence>`, `consequence:<option>|<criterion>|<text>`, read
strictly: a malformed one is not offered); its guided comparison links the project's drivers of them on the person's
reviewed apply and shows the consequences and the evidence, and still scores nothing and fills no effect.

**The lead, besides W1 and the audits:**

- The reading's sentences read as written in a document (a capital to start, "it" for one unstated effect, "the chosen
  alternative" of an accepted decision, no "meets" for a constraint not shown to be met); W2's checks were moved to them.
- Chapter 2 and the design notes say High, Medium and Low; the decision register marks rules-drafted assessments; the
  utility tree asks which alternative the drivers lean to; `SDD-SPEC.md` describes the lean, AIW's reading and the
  standing column.
- A Playbook pattern is read as a whole word of an alternative's pattern, and a design concern's option follows none, so
  no stray suggestion is offered.
- The rules draft of the Bank Payment reference could not be applied (present before this round): its seeded model does
  not draw the steps a draft adds, and Chapter 4 refused the drafter's connection to one. The drafter now connects only
  where the project draws its own steps.
- The legacy "favoured" alias is retired; Chapter 2's What if names an alternative that breaks a tuned constraint and
  flags a chosen one; Chapter 7's objective, which holds no recorded judgement, no longer keeps every option from being
  dominated; one number format and one hypothesis sentence for the reading.
- The client budgets moved by the policy: the chapters route to 2,881 KB and the stylesheet to 754 KB, each the next
  whole KB with its measurement recorded in `client-bundle.mjs`.

## 4. What the reading reads

**The reference projects** (built as `POST /api/projects` builds them):

| Project | Decisions | Read | How firmly the leads hold | Dominated (robust) | Sensitivity points | Drivers left out |
| --- | --- | --- | --- | --- | --- | --- |
| Seed and Bank Payment (each) | 3 | 3 | 2 at level 1, 1 at level 2 | 1 | 2 | 0 |
| The five other reference journeys | 21 | 0 | — | 0 | 0 | 21 |

The five other reference journeys state no priority on the drivers their decisions link, so nothing is weighed there and
the reading says so instead of ranking. On all 27 decisions the reading's leads, totals and sensitivity points equal the
old tally's (`test:decision-reading`).

**The owner's register** (scratch, counts only). The 1,400 requirements drafted by AIW's rules drafter, which needs no
provider:

| The register's rules draft | Round 24's drafter | Round 25's drafter |
| --- | --- | --- |
| Decisions · alternatives | 9 · 37 | 9 · 37 |
| Effects stated on weighed drivers | 0 of 166 | 3 of 166 (each "supports", drafted from a Playbook mark) |
| Decisions the reading can read | 0 (all unjudged) | 2 (one lead, at level 1, that stating the unstated effects could change; one tie) |
| Cells with a suggestion | 3 | 0 (the three are now drafted) |
| Dominated, as the effects stand | 0 | 5 |

So on the register the reading has little to read yet: 163 of 166 effects are unstated. The rules drafter can draft only
what the Playbook marks, and it marks styles and patterns: 21 of the 37 drafted alternatives are tactics (8) and design
decisions (13), which the Playbook files under a quality family but does not mark (AIW does not read a family as a
mark). The register's quality drivers are of two categories, traceability and security, neither of which the style
table marks, so its style decision weighs its six functional drivers only and its five styles draft nothing. The SDD of
that draft prints the drivers' lean and AIW's reading where there is one, labels both drafted assessments it prints, and
never says "scored", "favour" or "recommend" in section 3; its content reading is 0 %, as for every rules draft (sections
2 to 4 are a skeleton). On the synthetic register of the same shape (`test:drafter-groups`) the drafter drafts 4
assessments, all "supports", on its 9 decisions and 37 alternatives.

## 5. Verification

On `d2626fb` unless named otherwise (the release field is set at `d0682ba`; `d2626fb` changes two browser checks, below),
in this container, with the provider keys empty.

- **Install and check.** A clean install (`npm ci` on `d0682ba`, which differs from `d2626fb` only in two test files;
  112 packages, 4 s); on `d2626fb` the syntax check passed for 706 modules; the lint
  ratchet found 172 problems against its baseline of 172, none new. The install's audit lists four moderate advisories,
  all in development dependencies (drizzle-kit through esbuild); `npm audit --omit=dev` finds none; the lockfile is
  unchanged this round.
- **Build.** Passed: 221 server modules from the import graph, 136 client script files and one stylesheet. The chapters
  route measures 2,949,715 B under its cap of 2,950,144 B (2,881 KB) and the stylesheet 771,840 B under 772,096 B
  (754 KB); both caps moved this round by the next-whole-KB policy (W1 to 2,866 KB; the close to 2,881 KB and 754 KB),
  each with its measurement recorded in `client-bundle.mjs`. The projects route measures 491,764 B, under its budget.
- **Full regression, first run** (on `d0682ba`, concurrency two, browser suites included): 233 of 235 suites passed.
  `test:desk-browser` expected the recorded range of a product choice's totals as −18 to +18; a lead commit the same day
  (`22074d7`) had taken the objective, which holds no recorded judgement, out of that weighing, and that browser suite had
  not been re-run after it: the range is −16 to +16, and the assertion now reads it, no less strictly.
  `test:tradeoff-browser` read the style proposal's dialog after a fixed 400 ms (a line from before this round) and under
  the run's load the dialog opened later; it now waits for the dialog, and asserts on it as before. Both pass alone and
  side by side (`d2626fb`).
- **Full regression, second run** (on `d2626fb`, concurrency two, browser suites included): all 235 suites passed,
  every `test:*` script of `package.json` among them, the 50 Playwright browser suites included.
- **The plan's acceptance (section 5).** `test:decision-reading` (17 checks: the hard constraints, Must, Should and none
  stated; dominance, robust and provisional; the order with ties and margins; each level of how firmly a lead holds on
  constructed cases; the bounds and the effects named; drivers left out and missing; the same reading in any order; a
  dominated alternative added changes no lead; level-1 leads under random weightings that keep the priorities; the
  sensitivity points and leads equal to the retired tally's on the reference projects; "breaks" refused on a driver that
  is not a constraint, a working choice that breaks a hard constraint refused acceptance, a dominated one warned; the
  drafted marks; suggestions never counted, candidates suggesting nothing). `test:knowledge-retrieval` §9 holds the
  whole reading unchanged by candidates and by release, and §11 the design-concern criteria. `test:tradeoff` names the
  drivers left out (GR-DRV-02); `test:brain-tradeoffs` reads a real priority map. The screens: `test:tradeoff-browser`,
  `test:desk-browser`, `test:architecture-whatif-browser`, `test:utility-browser`, `test:theme-browser` (light, dark and
  forced colours). The SDD: `test:sdd-architecture` (its section 11), `test:sol-sdd`, `test:sdd-content`,
  `test:sdd-formats`, `test:sdd-size` (no "scored", "favour" or "recommend" in section 3 at the register's scale). The
  drafting: `test:drafter-groups`, `test:journey-drafter`, `test:design-concern`.
- **Integrity.** No check was deleted, skipped or loosened: the 18 assertion lines removed across the round are each
  replaced by one at least as strict (the merge and lead commits name them), and 394 assertion lines were added. No
  secret, no client text and no assistant model identifier is in the diff from the baseline or in a commit message;
  the workbook, the drafted designs and their exports stayed in scratch.
- **Release manifest.** `SOURCE-MANIFEST.json` regenerated by the script behind `npm run release:manifest`, naming this
  release, and checked with `npm run release:verify`.

## 6. What is still open

Most consequential first:

1. **Effects to state.** On the owner's register 163 of 166 effects are unstated, so the reading can rank only 2 of 9
   decisions. A person states them in Chapter 3 (the suggestions help where there are any), or a model draft proposes
   them (the live run, below).
2. **The live model run** on the register and its comparison with run 3 and the reference: set aside by the owner on
   14 October (the Anthropic account's identity verification; the OpenAI project's spend limit).
3. **The knowledge release** (four-eyes approver and licence counsel): until then released claims suggest nothing on the
   owner's projects, as candidates never do.
4. **The reference journeys** state no priority on the drivers their decisions link; their readings say nothing is
   weighed.
5. **E2 and K2 remainders.** E2: category V decisions from unhomed themes, the application platform where evidenced,
   maker and checker roles drafted or open. K2: core-banking design concerns as candidates with review packs, which need
   source passages AIW does not hold.
6. **Smaller items.** The guided comparison's criteria form does not yet show each criterion's scope, consequence and
   evidence beside its notes field (they show in the comparison's checks and caveats); the knowledge workspace's product
   cards show totals without ranges (the comparison table above them shows both); tactics carry no marks to draft from.
7. **Two browser suites outside the release regression** (neither is a `test:` script): `shell-focus-browser` is flaky
   before and after this round (a redraw detaches the link it injects; 2 of 6 runs passed on the workstreams' base and 3
   of 5 on W2's tree), and
   `end-to-end-browser` does not use `AIW_BROWSER_EXECUTABLE`, so it cannot launch here without a shim, and then waits for
   `.kw-workspace`, at the base as now.
8. **What the reading is not.** The default weights are a convention, not a measurement, and the firmness levels are
   exact only over the priorities' order; whether two drivers can be traded at all is a person's judgement.
9. **Carried from round 24:** a person's acceptance of the register's module structure; the gap register not re-verified
   (this round's findings are tracked in the plan); a provider's daily token budget (M); the screens-at-size items
   (GR-UX-09 to GR-UX-17).

## 7. External authorities and the owner's decisions

Nothing here impersonates or replaces them, and none of their steps is claimed:

| Authority | What only they can do | State |
| --- | --- | --- |
| The owner | Push the branch; make a provider available for the live run (complete the Anthropic account's identity verification, or raise the OpenAI project's spend limit); rotate the API keys of the `.env` file uploaded earlier; revoke the Anthropic key pasted into the conversation on 14 October (deleted from the session) | Not done |
| A person on the owner's side | State the effects the register's decisions need, choose and accept decisions; review and accept the proposed module structure | Not done |
| The owner's architects and an independent reviewer | Review a drafted design through AIW, page by page (GR-GOV-21) | Not done |
| A four-eyes knowledge approver and licence counsel | Release the core-banking knowledge pack (GR-DOM-10, GR-DOM-11) | Not done |
| The workbook owner | Answer the open source questions (GR-SRC-08) | Not done |
| A named human reader | Fill the SDD review gate's checklist for an export (C2-10) | Not done |
| Production acceptance | Accept a release for production | Not done; `productionAccepted` is false |
