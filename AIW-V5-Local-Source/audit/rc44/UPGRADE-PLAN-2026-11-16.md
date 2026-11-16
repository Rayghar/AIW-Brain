# AIW upgrade plan: bringing the four document sets to life

**Date:** 2026-11-16
**Proposed release:** AIW v0.10.0-rc.10.73.44. The number is for the owner to confirm.
**Builds on:** AIW v0.10.0-rc.10.73.43+handbook.20261102.1, frozen source `815fca7`, as the owner's reports describe it.
**Status:** a plan only. No product code was changed. productionAccepted stays false.

## 1. Inputs, and what could be checked

| Input | Where it is | How far it was checked |
|---|---|---|
| RC43 completion report and RC43 attachment-completion document (the owner sent two copies of the second; they are identical) | `inputs/` in this folder | Read in full. Everything they say about RC43 is **reported**, not verified here, because the RC43 source is not in this repository. |
| The owner's target description: eight fundamental changes and the experience at each of the eleven stages | Pasted into the session; summarised in sections 3 and 6 | Read in full. |
| The four document sets (Master Course M01–M32; Playbook Explained Reference and Cheat Sheet; Illustrated Compendium, Workbook and Desk Reference; Expanded SA Playbook, System Design Roadmap edition) | Not in this session | Not read. |
| Handbook gap review: 353 gaps, defects D1–D20, features F1–F18 | `audit/rc41/handbook-review/` | Verified earlier against the rc.10.73.41 source. |
| The rc.10.73.42 fixes for D1–D20 | Nine local branches, also in the bundle given to the owner on 2026-10-31 | All nine groups reviewed. Six merged locally. Not released, not pushed. |

What the checks found:
- **RC43 is not here.** Commits `815fca7`, `97ada14`, `43af6c9` and `2d2d568` are in neither this repository nor its GitHub remote. `public/design-contracts.js` does not exist here. This repository holds rc.10.73.41 plus review and plan documents.
- **RC43 did not start from exactly this session's rc42.** This repository has 322 registered scripts. With all nine rc42 groups merged it would have 333. The RC43 report says RC43 started from 341. So it is unknown which of the D1–D20 fixes RC43 contains.
- **The runtime differs.** RC43 was qualified on Node 24.22.1 and Chrome 149. This container has Node 22.22.0 and a different Chromium build. Reproducing RC43's qualification here needs Node 24.

## 2. Is this the plan?

Yes. The four document sets become working modelling capability in AIW, by evolving RC43 through the eight changes. I agree with the direction, and with keeping RC43's foundation: one canonical Design Graph, native commands, one Brain entry point, knowledge governance and currentness tracking.

The plan needs seven additions. Most are things the verified gap review found that the eight changes do not mention. They are in section 4.

## 3. The eight changes, against what exists and what the review found

"Reported" means stated in the RC43 reports. "Verified" means checked in the rc.10.73.41 source during the gap review. Gap ids refer to `audit/rc41/handbook-review/chapter-gaps/`.

| Change | Foundation today | Verified gaps it closes | Still to build |
|---|---|---|---|
| **1. Versioned, usable knowledge** | Knowledge governance with second-person review (verified). A structured mechanism schema: kind, scope, effects, obligations, typed conditions (verified). | K-03, K-04, K-06–K-08, K-11, K-12, K-15, K-19, K-22 | Linked forms of one concept: definition, mechanism, conditions for use, composition rules, calculation, verification recipe, example, exercise. One identity per mechanism across the Playbook and the catalogue. A coverage record per topic. Intake of the four sets. |
| **2. Applied patterns bound to the model** | Eight code-authored design tasks that check fit, create records and carry obligations (verified). Thirty native methods (reported). | K-01, K-02, C5-01, C5-04–C5-08, X-04, X-11, X-12 | One adoption record: definition and version, roles, bindings to existing records, preconditions, parameters, obligations, evidence, decision, deviations. The eight tasks move onto it and their separate code path is retired. |
| **3. Behaviour AIW can evaluate** | A three-valued condition engine and failure walkthroughs (verified). Rule, command and guarded-workflow methods (reported, as descriptions). | C1-06, C8-05, C5-11, C5-16, C8-08 | Bounded evaluators for decision tables, transition guards, invariants, competing operations, and timeout, repeat and uncertain-outcome cases. A counterexample trace. Stated bounds on every result. |
| **4. One workload and assumption model** | Capacity arithmetic in three places that use different inputs (verified). Demand and operating-envelope methods (reported). | C2-03, C10-06–C10-09, C8-10, C8-15, X-16, X-17 | One authoritative workload definition. Every consumer moved onto it. The local calculations retired. |
| **5. One change plan across stages** | Model alternatives, saved design alternatives, guided tasks, interface impact preview, change reviews (verified, as separate paths). | X-19, C3-04, C5-18, C11-40 | One change-plan contract: question, basis, alternatives, creations and retirements, consequences per stage, findings, obligations, acceptance, limits on reversal. Stale plans reassessed. |
| **6. Claims tied to implementation and operations** | Typed checks bound to an environment and release (verified). Experiment portfolios and original observations (reported). | X-01–X-03, X-08, C11-05–C11-07, C11-19, C11-20, C11-28, C11-29 | Each observation bound to artifact, configuration, topology, workload, environment and collection method. A difference between design and observation names the affected claims and owners. |
| **7. Guided reasoning first** | A chapter guide, guided tasks and Sol (verified). Method guidance (reported). | C4-09, K-16, X-24, X-29. Mostly new: the review did not cover learning. | A question-led workspace per stage. The teaching sequence. Practice kept apart from approval. |
| **8. Views and documents from one meaning** | One canonical graph (verified). Document projection of methods (reported). | D7, X-09, X-26, X-27, X-30, C11-21–C11-23, C6-11 | Views that answer a question: who owns this state, where authority is checked, what is atomic, what happens on a lost reply. One trace reading behind every view. |

## 4. Additions the plan needs

**A1. Check the baseline's integrity first.**
D1–D20 are approval and consistency defects: self-approval, placeholders passing checks, several trace readings that disagree. The target description does not mention them, and the RC43 reports do not say whether they are fixed. Each rc42 group has a test suite that fails when its defect is present. Run those suites against RC43, then port whatever is missing. Until that is done, every new accept step in this plan could inherit self-approval.

**A2. Treat the four document sets as candidate knowledge until a person reviews them.**
They were generated by an AI assistant. The doctrine says an LLM must not promote knowledge, and every authoritative claim must trace to an immutable source passage. So the content splits into two tiers:
- **Teaching content:** definitions, explanations, diagrams, examples, exercises. It may be shown, labelled with its source and status. It never feeds a check, an eligibility gate or a score.
- **Decision-bearing content:** conditions for use, obligations, composition rules, calculations, verification recipes. It takes effect only after a second authorised person releases it.

Intake starts with the owner's record of who wrote each file, its permitted use and its SHA-256. Where a set restates the SA Playbook or the 27 handbooks, the claim cites that passage.

**A3. A second person on every new accept step.**
Accepting a pattern adoption, accepting a change plan, reviewing a "not applicable", releasing knowledge, granting a waiver and recording operational acceptance each need a signed-in person other than the author. Sol and agent accounts are refused.

**A4. Verified gaps the eight changes do not cover.**
RC43's methods may already cover parts of these. Check first, then keep each in scope or defer it explicitly:
- component selection as a recorded decision with the rejected candidates (F2);
- enterprise standards, approved products and a conformance reading (F4, F15);
- a deployment topology model, reference blueprints and location gates (F5);
- decision outcomes other than one choice, and reversibility (F6);
- waivers with a class that can never be waived (F13);
- operational acceptance by a second person (F12);
- bounded contexts and compared partitions (F18);
- observability, incident and support design (F11).

**A5. Size and determinism limits.**
The client build has a size budget. On the rc.10.73.41 base it had 955 bytes to spare, and the merged rc42 fixes are over it until code moves out of the main route. RC43 reports 150 client scripts against a limit of 150. Evaluators and teaching content must load on demand or run in the worker. Evaluators must be deterministic and bounded, and must state their bounds. Their results count as model-level evidence only.

**A6. Sol stays a proposer.**
Proactive help prepares alternatives and explains them. It never selects, approves or waives. Guided modelling must work with no provider configured, so the deterministic guidance comes first and Sol adds to it.

**A7. Practice is kept apart from real projects.**
Exercises run in a sandbox, not in a real project's canonical graph. A practice attempt never counts as a review, an approval or evidence.

## 5. Work packages and order

| # | Package | Delivers | Retires | Done when |
|---|---|---|---|---|
| WP0 | **Baseline** (blocks everything) | RC43 source in this repository with its history. Its 350 scripts reproduced on Node 24. The rc42 defect suites run against it; missing fixes ported. The gap review's 353 gaps re-checked against RC43's 30 methods. | The rc.10.73.41 line as a working base. | A written baseline record: what RC43 contains, verified, with every D1–D20 status. |
| WP1 | Knowledge integration (change 1, A2) | Concept records with linked forms; crosswalk; coverage and maturity per topic; candidate intake of the four sets. | Duplicate Playbook and catalogue identities. | Every topic has a coverage record. No candidate reaches a check. |
| WP2 | Applied design (change 2, A3) | The adoption record and its proposals. | The eight tasks' separate code path, after a parity test. | A pattern can be bound to real records and its obligations inspected. |
| WP3 | Shared workload (change 4) | One workload authority. | Local calculations in design tasks, contract journeys and the review desk. | Changing one assumption updates every consumer the same way. |
| WP4 | Behaviour evaluation (change 3, A5) | Bounded evaluators and counterexample traces. | None. | A competing-operations case shows a violated invariant, with its bounds stated. |
| WP5 | Change plans (change 5, A3) | One change-plan contract. | The separate proposal contracts. | A service split shows its consequences in every stage before acceptance. |
| WP6 | Evidence and conformance (change 6) | Bound observations; design-to-observation differences. | None. | "What supports this claim?" returns the tested arrangement and its limits. |
| WP7 | Views and documents (change 8) | Question-driven views; SDD from the same records. | Any view-private traversal. | Every view and the SDD give the same answer for one requirement. |
| WP8 | Guided modelling (change 7, A6, A7) | Question-led stages, added stage by stage as WP1–WP7 land. | None. | A practitioner completes all eleven stages guided; an expert edits the same records directly. |
| WP9 | Remaining verified gaps (A4) | Whatever A4 keeps in scope. | As each item states. | Each item closed or deferred in writing. |

**Proof scenarios.** Each package is shown end to end (concept, explanation, application, consequences, challenge, evidence, SDD) on six system families: transactional, human workflow, asynchronous integration, analytical pipeline, multi-tenant platform, AI-enabled. RC43's supplier-onboarding fixture stays as a regression.

**Rules for every package.**
- Tests first; no assertion weakened.
- One authority path: migrate, then retire.
- Old documents load, and no old record gains a guarantee because the schema changed.
- The size budget is not raised.

## 6. Stage by stage: what is added

The owner's target description gives the full experience for each stage. This table records the question, the outcome, and what the verified review adds. Every "adds" item is checked against RC43 first.

| Stage | Question | Outcome | The review adds |
|---|---|---|---|
| 1 Requirements | What problem, for whom, and what obligation is accepted? | Reviewed problem statement, boundary, journeys, rules, owned uncertainties | The service promise recorded before any mechanism; journeys with end states including "unknown" (C1-01–C1-03) |
| 2 Quality drivers | Under which conditions must it work, and how will we know? | Scenarios, measurement definitions, workload profiles, conflicts | A business-service record; objectives with error budgets (C2-09; deep-dive quality-method) |
| 3 Decisions | Which approach fits, and when does that stop being true? | Conditional decision records with compared variants | Gates that cannot be traded off; "infeasible", "defer" and "pilot" outcomes; reversibility (C3-02, C3-07, C3-08) |
| 4 Logical application | Which responsibilities and rules, and who owns each fact? | Responsibility map, state model, command contracts | Bounded contexts; partitions compared; a split invariant detected (C4-01–C4-03) |
| 5 Application realization | How do responsibilities become implementable structure? | Component views, operation contracts, dependency rules | A recorded component selection with rejected candidates; a reason for each deployable split (deep-dive component-selection; C5-03) |
| 6 Logical technology | Which capabilities, limits and failure arrangements? | Capability architecture, envelopes, failure views | Typed failure domains; qualified fallback paths (C6-01, C6-05) |
| 7 Technology realization | Which products and configurations provide them? | Realization map, configuration assumptions, qualification plan | Approval by a second person (D1–D3); a check against enterprise standards (deep-dive technology-selection) |
| 8 Interfaces and data | What crosses each boundary and who owns the truth? | Contracts, data models, compatibility, recovery obligations | A writer inventory; derived copies with freshness; retention horizons that cover each other (C8-01, C8-02, C8-11) |
| 9 Security and privacy | Who may do what, through every path? | Authority rules, threat cases, credential lifecycle | Coverage judged per access route; the tenancy model; independent risk approval (C9-01, C9-03, D5) |
| 10 Deployment and runtime | How does it operate, change and recover? | Deployment views, budgets, release and recovery sequences | A declared failure set; topology and blueprints; location gates (C10-01–C10-04) |
| 11 Review, realize, evolve | Is it coherent, supported and able to stay current? | SDD, decision records, evidence portfolio, acceptance pack | Findings that cannot be waived; expiring waivers; acceptance by a second person (C11-01, C11-02) |

## 7. What completion means

The target description's ten observable capabilities stand. This plan adds five:
1. Every D1–D20 defect suite passes on the release.
2. Each concern has one authority path, and the path it replaced is gone.
3. No candidate or AI-generated content affects a check, a gate or a score.
4. The client size budget and script limit are unchanged.
5. The true status of each external authority is recorded: licence counsel, second knowledge approver, independent architecture reviewer, production acceptance.

## 8. Needed from the owner

1. **The RC43 source package:** `AIW-rc43-handbook-complete-source.zip`, its external package receipt and its history bundle. Either upload them, or push RC43 to a branch of this repository.
2. **The four document sets,** with who wrote and reviewed each one and its permitted use.
3. **Decisions:**
   - the release number;
   - the second person who releases knowledge;
   - which A4 items belong in this release.

Until item 1 arrives, no product code can be upgraded. Building on rc.10.73.41 would create a second line beside RC43.
