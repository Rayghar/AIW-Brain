# Round 25 · Trade-off reasoning: AIW weighs the alternatives, a person decides

Baseline: `c346e2a` (the release manifest of AIW v0.10.0-rc.10.73.25). Branch `claude/dazzling-cerf-a3qshh`, never
pushed. Controlling baseline rc.10.73.6; `productionAccepted` false. Release field at the close of this round:
AIW v0.10.0-rc.10.73.26.

## 1. What was asked

The owner asked whether AIW is now a reasoning product. The answer was: partly. It reasons deterministically and
traceably, a model advises with citations, and a person decides; but it does not conclude trade-offs. Three steps were
named that would make it more of one within its doctrine: finish the trade-off criteria so AIW can rank a decision's
alternatives against the design's drivers (the choice staying with a person); release the knowledge pack so approved
knowledge can inform the reasoning; and run the round-24 pipeline live. The owner replied: "ok. then lets do it. go
ahead."

In scope: the first step, in full. Out of scope, and why: the knowledge release is a four-eyes approver's and licence
counsel's act (GR-DOM-10, GR-DOM-11); AIW can only keep the review pack ready. The live run waits on a provider (the
OpenAI project's spend limit; the Anthropic account's identity verification, which the owner set aside on 14 October).

## 2. What exists

Five read-only code maps (decisions and the trade-off view; the Brain's reasoning; drivers and constraints; knowledge
governance; the recorded requirements), read by the lead.

**The arithmetic is there; the reasoning is not.** `decisionTally` (`public/design-reasoning.js`) sums priority weight
(High 3, Medium 2, Low 1, not stated 0) times effect (supports +1, tension −1, neutral and unknown 0) over a decision's
drivers, and names a "favoured" alternative when one total is highest. Five readers call it: the Chapter 3 model
(`tradeoff-model.js`, with a one-step sensitivity), the review desk's decision probe (`desk-model.js`), the utility
tree (`utility-model.js`), the what-if (`architecture-whatif.js`) and, through its own copy of the same sum, Chapter 7's
product weighing (`product-choice.js`). What does not exist anywhere:

- no check of whether an alternative breaks a constraint: the tally can favour one that does, and nothing enforces a
  hard constraint (`EFFECTS` has no "breaks" value; constraints reach a decision only as drivers of kind constraint);
- no dominance: an alternative that is no better than another on any driver is still just "lower";
- no ranking: one top alternative, no order, no margin;
- no statement of how firmly the lean holds beyond a one-step change of one driver's priority;
- unknown effects count 0, with no test of whether stating them could change the lean;
- product choice and the decision tally weigh with different fallbacks, and sensitivity is computed in five places.

**Defects found by the maps.**

- A decision's link to a driver that no longer exists weighs 1 (`?? 1`), so a deleted driver still counts.
- The Chapter 3 map, rail and alternative panel show "×1" for a driver with no stated priority, which weighs 0.
- `brain-tradeoffs-validate.mjs` passes the drivers array where a priority map belongs, so every weight in it is 1.
- The SA Playbook's conditional mark "(x)" ("potential or conditional support") becomes plain support when a style or
  pattern alternative is offered (`styleAlternative`, `decisionPatterns`).
- `styleFit` and two re-exports of `tradeoff-model.js` are dead code.
- The wording contradicts the code: "No hidden score or automatic winner is calculated" beside a "★ Favoured" mark
  and an SDD section that says each alternative "is scored"; "Critical, Important, Supporting" survives in
  `product-choice.js` and `DESIGN-CHAPTER-MODELS.md` although drivers are High, Medium or Low since round 12.

**Recorded requirements still open.** GR-DRV-02 (partial): a reading must say which drivers it leaves out because no
priority is stated, and `test:tradeoff` asserts none. K2 (round 23): criteria tied to quality categories and driver
kinds, consequences per criterion, the evidence each option needs. E2 (round 23): an assessment and a preferred
alternative per drafted decision. The SDD specification (`audit/round12/SDD-SPEC.md`): for each decision compared on
weighted drivers, "the criteria, the result and the sensitivity"; every decision "justifies the preference by a named
driver and reason, explains why each other alternative was not preferred"; "a recommendation is never recorded as
approval".

**What the reading may use.** Only what the project records: the drivers a decision names, their priorities and kinds,
each alternative's recorded effects, and the constraint records a constraint driver links. Knowledge never moves a
score: `knowledge-retrieval-validate.mjs` §9 holds every tally, sensitivity and constraint finding unchanged by
candidate claims and even by released ones. The trade-off catalogue (AIW-TRADEOFFS-1) and the catalogue are excluded
by their own authority; the core-banking packs are candidates.

## 3. Design decisions

**D-25-01 · One reading.** A single pure engine, `public/decision-reading.js`, reads a decision's alternatives against
its drivers. It replaces `decisionTally` and the five sensitivity copies; the Chapter 3 model, the desk probe, the
utility tree, the what-if, the SDD and the checks read it, and Chapter 7's product weighing uses its arithmetic. The
old function, `styleFit` and the dead re-exports are retired, not kept beside it.

**D-25-02 · Recorded facts only.** The reading's inputs are the recorded facts named in section 2. A driver with no
stated priority is left out of the weights and named; a link to a driver that no longer exists weighs nothing and is
named. The §9 fingerprint grows to the whole reading, so candidates and releases are shown to move none of it.

**D-25-03 · Hard constraints.** A new effect, "breaks" (`violates`), can be recorded only against a driver of kind
constraint. A constraint driver is hard unless every constraint record it links is Should or Could (a Must binds, and
so does a constraint whose priority nobody stated; the reading says which). An alternative that breaks a hard
constraint is ruled out of the ordering; breaking a soft one counts as tension. An alternative whose effect on a hard
constraint is unknown stays in, marked "not shown to meet it". A working choice that breaks a hard constraint is an
error finding, so the decision cannot be accepted or approved until a person changes the choice or the constraint.
Sol's drafting contract keeps its four effects: a model does not rule an alternative out; a person does.

**D-25-04 · Dominance.** One alternative dominates another when it is at least as good on every weighed driver and
better on one, whatever the unstated effects of either turn out to be. Dominance needs no weights, so it is the
strongest thing the reading says. Dominance on the stated effects alone is reported as provisional, with the unstated
effects that could undo it.

**D-25-05 · The lean, and how firmly it holds.** The default arithmetic stays as documented (High 3, Medium 2, Low 1;
supports +1, tension −1; unknown 0) and now orders every alternative not ruled out, with ties shared and margins
given. The reading then says how firmly the lead holds, at the first level that is true:

1. for every weighting that keeps each High driver at least as heavy as each Medium one, and each Medium at least as
   heavy as each Low one (checked exactly: a lead holds over that whole set when it holds on each of its extreme
   weightings, which are the priority order's up-sets);
2. if drivers of the same priority count equally (the class weights in any order High ≥ Medium ≥ Low);
3. only at the default weights.

At levels 2 and 3 it names the drivers that would swing it and the condition, in words ("if availability counted for
more than consistency, both High, ALT-2 would lead"). The one-step sensitivity points come from the same engine.

**D-25-06 · Unknown effects.** Each alternative's total is bounded with its unstated effects at their worst and best.
The reading says whether stating them could change the lead at the default weights, and names the effects that
matter, the leader's first.

**D-25-07 · The working choice and the reading; the words.** AIW never chooses: nothing the reading computes is saved,
and the working choice changes only by a person's command. A working choice that breaks a hard constraint is an error
(D-25-03); one that another alternative dominates is a warning asking why; one the drivers do not lean to stays a
warning, as today. The SDD prints the lead as "the drivers lean to", never as a proposal or an approval; and, for an
alternative the architect gave no reason for not choosing, AIW's reading of it labelled as AIW's (the open item stays
open). "Favoured" becomes "leads on the drivers"; "scored" becomes "weighed"; the "no hidden score" sentence says what
is true: the arithmetic is shown, and it does not choose. "Critical, Important, Supporting" goes.

**D-25-08 · Suggested effects.** Where an alternative has no recorded effect on a driver, AIW may suggest one, with its
source: from an eligible released claim whose architecture unit states an effect on that driver's quality, or from the
SA Playbook's mark for the alternative's style or pattern ("x", strong support, suggests supports; "(x)", conditional,
suggests nothing but asks whether the condition holds). A suggestion is never counted; it becomes an effect only when
a person records it, with the existing command. Candidate and withdrawn knowledge suggest nothing. The reading says,
as a labelled hypothesis, whether recording the suggestions would change the lead.

**D-25-09 · Drafting (E2).** AIW's rules drafter drafts the assessments of an alternative that follows a playbook style
or pattern from its marks, as D-25-08 reads them, marked as drafted by AIW's rules until a person sends them again;
the SDD says so. The "preferred alternative per decision" that E2 asks for is the reading's lead, computed when read,
never stored.

**D-25-10 · Design concerns (K2).** A released design-concern claim's criteria may name a quality category and a driver
kind; its guided comparison then links the project's drivers of that category to the decision it drafts. Each option
may state its consequence per criterion and the evidence it needs. Candidate concerns still offer nothing.

**D-25-11 · Product choice.** Chapter 7's weighing uses the reading's arithmetic and gains its dominance and unknown
bounds; criteria other than drivers weigh 1, as today; its scale behaviour (`scale-validate.mjs`) is kept.

**D-25-12 · The Anthropic wire's failures.** It logs a provider failure as the OpenAI wire does (status, error type,
request id; never the key or the message text), so a refusal such as an account-verification gate is diagnosable
without reproducing the call.

## 4. Workstreams

Each workstream works in its own worktree (W1 and the lead items on the round branch), owns its files, runs its
focused suites, and is audited before its merge: no check deleted or loosened, no client text, no secret, no model
identifier.

| # | Workstream | Decisions | Owns | Order |
| --- | --- | --- | --- | --- |
| W1 | The reading: the engine, "breaks" and hard constraints, the findings, suggestions, every caller migrated, the old paths retired, the doctrine fingerprint | D-25-01 to 08, 11 | decision-reading (new), design-reasoning, decisions-domain, tradeoff-model, desk-model, utility-model, architecture-whatif, product-choice | first, by the lead |
| W2 | Chapter 3 and the desk: the map's lead and standings, the matrix's reading rows and suggestions, the companion's statements, "breaks" in the editor, the what-if, the desk probe | D-25-03, 05 to 08 (screens) | tradeoff-view, decisions (work), desk-view, the what-if UI, their CSS | after W1 |
| W3 | The SDD: the decision lines, the alternatives not chosen, the trade-off analysis (criteria, result, how firmly, unknowns, sensitivity), the executive edition | D-25-05 to 07, 09 (print) | sdd-architecture, sdd-document | after W1 |
| W4 | Drafting and design concerns: playbook-drafted assessments, the drafted mark, K2 criteria, consequences and evidence | D-25-09, 10 | architecture-drafter, domain-knowledge, architecture-knowledge, architecture-design | after W1 |
| L | The Anthropic wire's failure log; evidence on the reference projects and on the owner's register (scratch, counts only); regression; report; release | D-25-12 | intelligence-anthropic; audit/round25 | throughout |

## 5. Acceptance

- `test:decision-reading` (new): ruled out by a hard constraint and not by a soft one (Must, Should, none stated);
  dominance, robust and provisional; the full order with ties and margins; each of the three levels of D-25-05 on
  constructed cases (a conflict between two High drivers is not level 1 but is level 2); the bounds of D-25-06 and the
  effects named; left-out and missing drivers named and weighing nothing; the same reading whatever the order of the
  alternatives and drivers; a dominated alternative added changes no lead; a level-1 lead holds under a thousand random
  weightings that respect the priorities; the one-step sensitivity points equal the old definition on the reference
  projects.
- `test:knowledge-retrieval` §9: the whole reading, suggestions excluded, is unchanged by candidates and by release;
  candidates and withdrawn claims suggest nothing; a released claim suggests, and its suggestion moves nothing until a
  person records it.
- `test:decisions`: "breaks" is refused on a driver that is not a constraint; a working choice that breaks a hard
  constraint blocks acceptance and approval; a dominated working choice warns.
- `test:tradeoff`: the reading names the drivers it leaves out (GR-DRV-02).
- `test:brain-tradeoffs`: its tally check reads a real priority map.
- The screens (`test:tradeoff-browser` and the desk suites): the lead, the ruled-out and dominated alternatives, how
  firmly the lead holds, the unknowns that matter, a suggestion recorded by a person; light and dark.
- `test:sdd-architecture`: the trade-off analysis prints the criteria with those left out, the order, how firmly it
  holds, the unknowns and the sensitivity; an open decision names the lean as the drivers' lean, never as a choice; no
  "scored".
- The drafting suites: a playbook style's alternatives carry drafted assessments ("x" supports; "(x)" asks); a released
  design concern's criteria link the project's drivers of their category.
- Full regression, browser suites, lint ratchet, build and bundle gates, release manifest.

## 6. External authorities

Unchanged: the owner pushes; a named reader reviews an export; the owner's architects and an independent reviewer
review a drafted design; a four-eyes approver and licence counsel release the core-banking knowledge (and with it any
suggestion it could offer); production acceptance stays false.
