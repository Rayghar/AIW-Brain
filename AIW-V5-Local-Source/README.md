# AIW V5 Live Model Explorer

## The Chapter 4–8 models: room, honesty, one vocabulary (v20.5) — 27 September 2026

The 31 gaps the engineer observed in the Chapter 4 to 8 model views (`MODEL-VIEWS-CHAPTERS-4-8-GAPS.md`) are closed in the repository line; the two that belong to the private site's own source are handed over as a patch.

- **Room.** The title row is one line, the lens row hides when it has nothing to say, and the Key and zoom controls stand in the footer beside the walk, never over the canvas or the label rail. The status line is whole (two lines at most) instead of cut. The companion opens as a column on a wide window, as a drawer over the canvas below 1200 px, and starts closed there; its toggle says *Hide the companion panel* or *Show the companion panel · N observations*. The stage's four edges say where more of the model lies and move there on a click; arrow keys pan.
- **Loading.** While a chapter model's modules load, its frame says *Preparing the Chapter N model…* instead of a blank. Static files carry an ETag and are revalidated (304) rather than re-sent on every navigation — measured neutral on loopback, expected to matter on a network. Preloading the import closure was measured slower on loopback (the explorer-to-model switch doubled) and is not shipped; the 2–3 s a warm navigation takes is the page's own boot and compile of 5.6 MB of unbundled modules, and a bundle is the lever (`release-evidence/model-views-4-8/LOAD_TIMINGS.json`). Chapters 1–3 and 9–11 keep their status line in the lens bar and their key and zoom in the stage until they move to this shell.
- **Honesty.** Chapter 5 names a product only where Chapter 7 has chosen one; a capability whose candidates are still open is dashed and says so. Chapters 5, 6 and 7 of a blank project say in place what is missing and offer the next action; no observation is invented. When Sol is not connected, its round says so and stands last in the companion.
- **Defects.** *Propose a realisation* targets the capability it was asked for. A walk's progress belongs to one project. A Chapter 7 family opens from its heading; the stack has no duplicate *realises* column; the options share the stage's width. Chapter 5's *Not placed in a module* and column lanes, Chapter 4's bundled flow labels and Chapter 5's proposal card all select and read in the companion. Every selection, however it was made, reaches the address (`object=`) and Sol.
- **One vocabulary.** Every key explains every mark its model draws: unowned steps, proposals and changes in Chapter 4; data, products, dependencies, gaps and the outside in Chapter 5; plates per lens and what lost, degraded and stopped look like in Chapter 6; suggested, lean, preview, proposed and stale in Chapter 7; lost answers, missing contracts and unsourced data in Chapter 8. Each chapter's key styles are scoped to that chapter.
- **Keyboard and phones.** Every chip that selects is a button, reachable with Tab and Enter. A card is a group that says what Enter does: select, then focus or open. On a phone the fit keeps the cards' lens lines.
- **Site line.** `release-evidence/model-views-4-8/site-line.patch` makes a chapter's Model tab open on the chapter's own model, labels a borrowed scene, and stops a selection carried in the address from moving the reader to another chapter.

Run `npm run test:model-views` and `npm run test:model-views-browser`; the five chapter suites and their rendered variants cover the rest.

## Sol's checks, and Sol on every chapter (v20.4) — 27 September 2026

- **Threats on a decision are set aside, not the advice.** Before this fix, a model that filled the threat field on a decision, which takes none, had the whole assessment withheld. Now the threats are listed as *Set aside* and never recorded, and the rest of the advice stands.
- **The guard reads a claim as a claim.**
  - A claim in any tense is still withheld: "…, ensuring exactly-once processing", "three replicas ensure availability".
  - Neither a question, an instruction, a purpose, a goal nor a statement that evidence is missing is a claim: "Ensure clear recovery procedures", "…to ensure availability", "critical for ensuring…", "without measured evidence…".
  - A drafted value is still read strictly, because it is written into the design.
  - A refinement's own value restated in another unit ("a 30-second timeout" for 30000 ms) is not a new number.
- **One refinement costs only itself.** Wording past its field's limit, or a reason claiming an outcome, sets that refinement aside. The rest of the advice stands.
- **A second pass that contradicts itself is not relied on.** It now reports defects and notes separately, and the defects decide. When its flag disagrees with them, the assessment shows the disagreement.
- **The SA Playbook's example load is named as the example.**
  - Every reason and basis on the desk says when the objective is the Playbook's example.
  - Sol's packet says so, with what the project records instead.
  - Where a design records its own workload (the teaching designs: 10 applications and 20 requests a second), advice that sizes it for the example is withheld, naming the recorded workload.
  - The bank reference records no workload of its own. It keeps its advice, labelled as for the example.
- **Sol on every page.**
  - Every element Chapters 4 to 10 draw has Sol in its companion. A group, gap or link drawn from a record is asked about as that record.
  - A saved object Sol does not assess is offered to Sol's panel to explain.
  - Sol's panel always answers. A response that does not fit its contract is replaced by the reviewed method's guidance, with the reason.
- **Correction to v20.3.** The v20.3 reading said the bank reference records its own objective. It does not: all three evaluation designs size for the Playbook's example. The v20.3 evidence carries a dated correction.
- **Live.** The last runs were on the code before the final checks; their kept answers are read with the final checks (`--recheck`).
  - One target of every kind in Chapters 1 to 11 was asked, 33 requests, and each was answered and displayed.
  - In the comparison, Sol withheld 4 of 28 answers, each a teaching design sized for the example. It agreed with the expected verdict on all 24 it showed; the direct model agreed on 26 of 28.
  - The engineer read every pair (`release-evidence/sol-checks-and-coverage/AFTER_FIXES_REVIEW.md`): Sol was better in 17, the same in 8, worse in 3.
  - The runs used the key the sponsor supplied, loaded straight into the process.

Run `npm run test:sol-checks`, `npm run test:sol-coverage` and `npm run test:sol-coverage-browser`. `npm run evaluate:sol:coverage` runs every chapter against the test double, and `npm run evaluate:sol -- --recheck report.json` measures today's checks on a kept report.

## Sol beside a direct LLM (v20.3) — 27 September 2026

- **The evaluation reads answers as Sol's checks do.** Before this fix, the scorer counted six things as false support:
  - citation labels such as S13, read as numbers;
  - "does not guarantee";
  - hedges such as "to be proven";
  - questions;
  - withholding reasons guessed from words;
  - numbers outside a case's band, still counted as sound.

  Now every flag keeps the sentence that raised it.
- **Every answer is kept.** A withheld assessment keeps the draft that was withheld and its issues. `npm run evaluate:sol -- --rescore report.json` scores a kept report again without asking any model; each packet must still read as it did.
- **A control arm.** The same model answers the same questions without the Brain. It gets the project's description, each decision's title and draft, and a recorded decision's alternatives, but no packet, instructions or checks.
  - The same scorer scores it, and the Brain's checks measure what they would have withheld.
  - Only the evaluation can reach it; the application still reasons through `requestReasoning` alone.
  - `--brain-only` skips it.
- **The first live comparison and its reading.** Details are in `release-evidence/sol-direct-comparison/ANSWER_REVIEW.md`, the engineer's reading and not independent review.
  - On the bank payment reference, Sol was better in 10 of 16 assessments and worse only where its checks withheld right answers.
  - On the teaching designs, the desk presents the Playbook's example load as the project's, and the direct model did better in 6 of 12.

Run `npm run test:sol-evaluation`. The live run used the key the sponsor supplied, loaded straight into the process.

## Four eyes, candidate knowledge and the whole chain (v20.2) — 26 September 2026

- **Four eyes on every claim.** A claim is used only after an authenticated person other than its author has verified it. This is checked at review and again on every read, so a claim its author verified stops reaching Sol until someone else reviews it. Before, only repository claims needed a second person.
- **Two people on one machine.** `AIW_LOCAL_ACCOUNTS` gives the local server named accounts, each with its own secret, a sign-in page and a signed session. See [LOCAL-RUN.md](LOCAL-RUN.md). Without it, the server behaves as before.
- **Candidate knowledge from the earlier backend.**
  - `candidate-sets/bk-p2-20260911.json` carries 16 curated candidate claims. Each is anchored on an exact passage that was verified in the laptop's corpus when the set was built.
  - `npm run candidates:import` retrieves the exact originals and creates the candidates. They then need an independent review. See [KNOWLEDGE-REPOSITORY.md](KNOWLEDGE-REPOSITORY.md).
- **One identity for a file,** whether it is read from GitHub or from the corpus. A byte-order mark no longer changes its hash.
- **The chain, proven end to end.** `npm run test:brain-chain` runs corpus → candidate → a second person's review → release → signed receipt → activation → link → Sol's packet → the provider request. It uses synthetic accounts, a synthetic signing key and the provider test double.

Run `npm run test:brain-chain`, `npm run test:local-accounts` and `npm run test:stewardship-browser`. No live provider call was made here.

## Sol's checks keep the advice (v20.1) — 26 September 2026

- **One oversized field no longer costs a whole batch.** Before this fix, one of these made the output validator throw, and every decision in the request (up to eight) went unanswered:
  - a long reasoning or headline;
  - a fifth risk;
  - a decision assessed twice.

  Now advice text over its limit is cut after the last whole sentence that fits and marked *Shortened to fit*, and a duplicate or unknown decision is set aside. Only a broken structure fails a request, and the workbench then says which check failed.
- **A drafted value that guarantees an outcome is set aside on its own.** Wording such as "…to ensure availability" in a proposed scaling policy used to withhold the whole assessment, correct numbers included. Now that refinement is shown as *Set aside* and can never be applied, and the rest of the advice stands. Advice whose own reasoning guarantees an outcome is still withheld.
- **The second check reviews the advice, not the design.** Its instructions now say three things are not defects in the advice: gaps in the design itself, evidence still to be gathered, and refinements not yet applied. Only a live model can show the effect, and none has been run here.

The defects were reported from a live evaluation of a v19-based build. Each was reproduced on v20 before it was fixed. Run `npm run test:brain-reasoning` and `npm run test:chapter-reasoning`. No live provider call was made here.

## The knowledge repository, connected — 26 September 2026

- **The whole acquired corpus is searchable in Mind Factory → Sources.** On the laptop that holds it, the knowledge repository service covers 47 GitHub repositories at pinned commits: 18,961 documentation files, every byte verified, as 45,517 passages. Search it, read a passage (always from its verified original), and retrieve the exact original into the project. *Interpret this passage* opens the claim form on its exact lines.
- **One path into the project.** A retrieved original is the same kind of source as a live GitHub read, with the same identity. Interpretation, independent review, a release with a current signed receipt, and activation still decide what Sol may read. The workbench re-verifies identity and bytes itself.
- **What the licences allow, the repository respects.**
  - Repositories whose licence dossier allows metadata only show file names, not text.
  - Candidate and discovery-only repositories can be searched but not retrieved.
  - Quarantined files are never opened.
  - A licence is shown as detected, never as cleared.
- **Revocations reach projects on their own.** The service signs its change notices with a notices-only key that can never sign a release. A project holding a changed or withdrawn original applies them when it is opened.
- **Live refresh.** `node repository-service/cli.mjs acquire` fetches newer documentation from approved repositories at an immutable commit. Every download is checked against the git tree. `refresh.ps1` wraps the refresh, and `register-refresh-task.ps1` registers a daily task when you decide to.
- **Leads beside Sol.** When Sol is asked, repository passages that mention what the decisions touch are listed beside what Sol will read. They are marked *not sent to Sol*, and one click opens a lead in Sources.

Run `npm run test:repository-service`, `npm run test:knowledge-repository`, `npm run test:repository-acquire` and `npm run test:knowledge-repository-browser`. See [KNOWLEDGE-REPOSITORY.md](KNOWLEDGE-REPOSITORY.md) and, to connect it, [LOCAL-RUN.md](LOCAL-RUN.md).

## The Brain's open items, delivered — 26 September 2026

- **The desk and Sol in the SDD.** A new *Architecture reasoning record* section holds:
  - the vitals at review;
  - every product choice and whether its switch point is framed;
  - each piece of Sol's advice, with what the architect did and why, the packet it came from and the sources it rested on, marked where that knowledge has since been withdrawn;
  - what the stewards learned, and how far each capture has come through review, release, activation and link.
- **Mind Factory from the desk.** *Compare in Mind Factory* at a product switch point shows the options side by side: the weighing, what each product is documented to do, and the project's reviewed claims about each product, with any excluded claims and their reasons. Sol's advice on a switch point now recalls what the project knows about that realisation.
- **Evaluation.** 26 held-out decisions across the bank payment reference, citizen service requests and warehouse fulfilment. The expected advice was written without running Sol on these cases, and an architect should review it. `npm run evaluate:sol` runs them through Sol's real path: packet, guard, second check, the chapter's own rules. It reports withheld rates, verdict agreement, citations, false-support proxies and, from an exported project, how often advice was taken or disagreed with.
  - Against the test double: 26 cases, 28 assessments, 93% agreement. The two misses are the cases built to catch advice that takes an example objective at face value.
  - `npm run evaluate:sol:live` runs the same set against a configured provider.

Run `npm run test:brain-ahead` and `npm run test:sol-evaluation`. No live provider call was made here.

## One Sol — 25 September 2026

- **Before this release a chapter model could show four different "Ask Sol" controls**, backed by two services with different answer shapes, answering in two panels side by side. Now each surface has one Sol control, and every one of them is the same Sol.
- **In a chapter model**, the companion's *Sol · the attending architect* is where Sol's assessment lives. The separate *Ask Sol* button in the action row is gone (23 of them, across nine chapters). The section's footer, *More with Sol*, opens Sol's panel for what else Sol does.
- **Sol's panel** (the overlay, tab now simply **Sol**, beside *Mind Factory*) no longer gives a second answer beside a model. It shows the status of the companion's assessment (the verdict, or *not assessed yet*) with *Read it beside the model*, then *Ask Sol in your own words*, guided design, writing and the chapter's tools.
- **On the Work tabs and Validate**, where no companion shows it, Sol's panel is the assessment itself: the same section and state as beside the model. Sol's reasoning is now reachable from every tab.
- The companion and the panel keep each other current.

Run `npm run test:chapter-sol-browser` (10 rendered checks; the tenth is the one-Sol rule).

## The AIW Brain learns: the knowledge stewards' queue — 25 September 2026

- **A disagreement with Sol now teaches the project.** When an architect disagrees with Sol's advice, on the desk or in any chapter model, the note offers *Open the stewards' queue*. In Mind Factory → Architecture in context → **Stewards**, each item shows the advice, the architect's words and what the advice rested on. Changes made on advice whose knowledge was later withdrawn come here too.
- **Sol advises the stewards.** It reads the disagreement, the advice it answered and the record as it reads now. It suggests what the project should learn, worded as a claim with where it applies and its limits. It may also say that the advice still holds.
- **Captured knowledge follows the governed path.** *Capture as project knowledge* turns the disagreement into an original source (the project's own record of it) and a candidate claim. The queue then shows the next step, one at a time, each through the knowledge workspace's own reviewed forms: review the interpretation, release it, activate it, link it to the record.
- **Sol reads what the project learned.** Once linked, the claim is read with that record whenever Sol reasons about it, first among its sources. Sol does not repeat the advice the project ruled out unless the reading gives new grounds. It is read only with its own record, not wherever its words match.
- **Other decisions.** Stewards can record that the knowledge and design stand, ask for a revisit, or withdraw what the advice rested on. Withdrawn knowledge is never sent to Sol again.

Run `npm run test:stewardship` and `npm run test:stewardship-browser`. The browser checks run against a loopback test double of the provider. No live provider call was made here.

## The AIW Brain reasons in every chapter model — 25 September 2026

- **Sol is in the companion of every chapter model, Chapters 2 to 10.** Select a quality driver, a decision, a responsibility, a component, a platform capability, a realisation, a contract or data definition, a threat or control, or a runtime plan, and ask Sol to assess it. Sol reads the chapter's own reading of that record. That includes the model's description of it, its recorded fields and what is still missing, the journey's checks on it, and the review desk's vitals for the running parts it touches. Sol also reads the governed knowledge behind all of that. It answers with a verdict: sound, refine, reconsider, or your call. It says why and cites what it rests on.
- **Three chapter-specific questions.**
  - In Chapter 2's *What if*, Sol weighs the move you are exploring. It does not propose a target, because targets are the business's to set.
  - In Chapter 9, for a component, contract or data definition, Sol is asked what could go wrong. It proposes threats only on the listed targets.
  - In Chapter 7, Sol may lean to one of a realisation's options. The choice stays in Chapter 7.
- **Sol's round of a chapter.** With nothing selected, the companion offers the chapter's records with the most open checks as one round of advice. The verdicts are marked on the canvas.
- **Refinements are checked by the instruments before you see them.** Sol may reword a record's fields. Where an instrument reads a number, Sol may also change it within its bounds: a contract's timeout, a runtime plan's replicas or its recovery time. The chapter then reads the design again with Sol's values and shows which checks clear, which appear and which vitals move. A refinement the chapter's own rules reject is withheld, like any failed check. Using a refinement opens the chapter's change review. Only the refined fields change, and the record's links to other records are kept.
- **What you do with the advice is recorded.** You can agree, disagree (with a reason), or apply refinements through the change review. The advice then shows what you did. Once the record changes, the advice becomes history.
- **Unchanged from v16.** What Sol reads is shown in full before sending, the two checks still apply, and so do the disclosure policy and knowledge withdrawals. See [AIW-BRAIN-ARCHITECTURE.md](AIW-BRAIN-ARCHITECTURE.md).

Run `npm run test:chapter-reasoning` and `npm run test:chapter-sol-browser`. The browser checks run against a loopback test double of the provider. No live provider call was made here.

## The AIW Brain reasons at every decision on the review desk — 25 September 2026

- **Sol advises on every decision on the desk.** This covers every drafted fix, every judgement the instruments will not make, every product choice at a switch point and every Chapter 3 decision opened there. Sol reads what the instruments measured and the governed knowledge behind it, then gives a verdict: apply, refine, reconsider, or your call. It says why and what it rests on. Ask about one decision, a whole step, or run *Sol's rounds*. The verdicts appear on the cells.
- **What Sol reads is shown before anything is sent.** One reading per decision, the objective and assumptions, the documented product mechanisms, the drivers, the SA Playbook's tactics and the project's governed claims, each with its receipt.
- **Checked twice.** A deterministic guard catches invented numbers, refinements outside a knob's bounds, verdicts that do not fit and guarantees of verified outcomes. A second model pass checks the rest. An assessment that fails is withheld, and the reading stands.
- **Refine, then decide.** Sol's refinements become the draft's numbers and wording, and the desk reads the design again with them. The change review applies them. Sol's proposed threats go through Chapter 9's review. Using, applying or disagreeing (with a reason) is recorded with the model and sources.
- **Governed knowledge reaches the models.** The structured playbook and the product mechanisms carry receipts. Withdrawing either stops its use in the models' suggestions, on the desk and in Sol's packets, and names the assessments that rested on it.
- **Connection.** Set `OPENAI_API_KEY` and `AIW_LLM_MODEL`, and optionally `AIW_LLM_BASE_URL` for an OpenAI-compatible gateway. Without them the desk says so, still shows what Sol would read, and its instruments and drafts stand on their own. See [AIW-BRAIN-ARCHITECTURE.md](AIW-BRAIN-ARCHITECTURE.md).

Run `npm run test:brain-reasoning` and `npm run test:brain-reasoning-browser` (the latter against a loopback test double of the provider; no live provider call was made here).

## Drafted fixes on the review desk — 25 September 2026

- **Every critical or silent vital comes with a drafted fix**, built from the desk's own numbers: 24 replicas for the payment service, a standby in the recovery zone for PostgreSQL, QD-003's 2 seconds as nested timeouts (IF-001 2,000 › IF-004 1,300 › IF-005 650 ms), a 2,900,000-message bound for the queue with what the sender does when it is full, `paymentReference` as the idempotency key, Chapter 9's own controls, and monitoring drawn from what each driver measures. Product choices at a switch point become Chapter 3 questions, with an alternative for each product judged against the drivers.
- **Preview on the desk.** One draft, a step of *Where to start*, or all of them: the monitor and every cell show the design as it would read, each changed cell ringed with the state it had. Change a draft's number and the desk reads it again.
- **Applied only through the chapter's change review**, with every changed field, the downstream work it reaches and what it does on the desk; or kept as a design alternative. Applied, the cells turn and pulse. Drafted values stay unconfirmed until evidence confirms them.
- **The desk does not invent** threats, recovery points, sites or drills: those readings say *Needs your judgement* and point to the chapter that decides.
- **Sharper readings.** Latency now nests timeouts by who calls whom, so a call that waits longer than its caller reads critical; a quorum product in two zones reads *watch*, because losing the zone with most of its nodes loses the majority; Chapter 7's recorded bounds, cluster size and ingest are compared with what the objective asks.

Run `npm run test:desk-fixes` and `npm run test:desk-browser`.

## Product choices weighed against the drivers, with switch points — 25 September 2026

- **Chapter 7's options are weighed** the way Chapter 3's alternatives are: priority × effect on the recorded judgements, and again with suggestions filling the gaps; ★ where the drivers lean; sensitivity points.
- **Suggestions come from what each product is documented to do** — Kafka keeps a replayable log, a RabbitMQ queue removes what it delivers, every PostgreSQL write goes through one primary — each with its source. The playbook merely naming a product is shown, not weighed. Recording them is Chapter 7's own judgement, confirmed by the architect.
- **Switch points.** Under the review desk's objective, one queue and one database primary show where they stop keeping up (on planning limits the reviewer can change) and which recorded alternative spreads the load: in the reference, RabbitMQ holds to about 224,000 concurrent users; one PostgreSQL primary is past its limit above about 75,000.
- **What if** in Chapter 2 now says what a product's documentation suggests when it is not yet judged against the driver being tuned.

Run `npm run test:product-choice`.

## Chapter 11: the review desk, and decisions that ask earlier chapters to review — 25 September 2026

Chapter 11's Model tab — and a third mode on every chapter's Validate tab — is now a review desk: the design read like a patient on a monitor.

- **The monitor.** Eight vital signs for the whole system — availability, recovery, data loss, latency, capacity, integrity, protection, observability — each with a heartbeat that beats once for every running part: red where it reads critical, flat where there is no signal.
- **Vitals.** Every running part on every vital: a recorded value against a recorded target, with its reason, the SA Playbook tactics that would move it and the chapter that changes it. Plug a probe into the parts you are watching to pin their charts to the desk.
- **What it takes.** An objective — the playbook's own *100,000 concurrent users* until the project records its own — turned into a performance specification for every service: requests a second, replicas for the load and for availability, CPU and memory, database connections against PostgreSQL's limit, the queue backlog a consumer outage leaves, cache, telemetry, cluster nodes, and what outside systems must accept. Every assumption is visible and changeable, product rules are quoted with their sources, and each part is compared with Chapters 7 and 10. Saved, the objective puts the specification into the SDD.
- **Trace.** Each requirement followed to where it runs; a missing link is a break.
- **Decisions under a probe.** Alternatives, patterns, failure boundaries and effects on every driver — and what the decision reaches both ways.
- **Decisions trigger reviews.** Choosing or recording a decision in Chapter 3 asks the requirements and drivers it rests on, as well as everything it shapes, to review; any probe can ask the same by hand. Reviews use the existing change review, in each chapter's own terms.
- **Anti-patterns are Chapter 11 findings**, each with its fix in the chapter that owns it and Chapter 11's own treatment.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:desk`, and `npm run test:desk-browser` where Playwright is available.

## Chapters 2 and 3 models, the SA Playbook as knowledge, and what realises each part — 25 September 2026

The design now says what realises it, why, and what a change would do.

- **Chapter 2 — utility tree.** Utility → quality family → attribute → driver, Critical first. An attribute the SA Playbook treats as core that no driver covers stands as a hole, with the playbook's definition, measures, example targets, design decisions and the technologies it names, and **Explore** proposes a driver from it. Each driver reads the playbook tactics the design names, with the words that name them.
- **Chapter 2 — What if.** Move a driver's target or priority and see, before anything is saved, what stops holding in the decisions, runtime plans, platform and products that carry it — 99.99 % leaves 4.3 minutes a month, so a single replica that restarts in ten minutes no longer holds — which tactics the playbook offers for the gap, and which drivers it pulls against. **Open in the editor with these values** takes the change to Chapter 2's own review.
- **Chapter 3 — decision map and trade-offs.** Each decision with the drivers it weighs and its alternatives, each alternative with its pattern, the failure boundary to avoid and its effect on every driver; the weighted reading as the drivers' priorities make it, and the sensitivity points where one priority change would tip a decision.
- **Architecture style is a decision.** The playbook's five styles are read against the design's own drivers, and one recorded through Chapter 3's editor arrives with the playbook's marks as its reasons.
- **Products, versions and vendors.** Every Chapter 7 realisation in the reference names a product and an alternative: Kubernetes, PostgreSQL or MongoDB, RabbitMQ or Kafka, Redis or Memcached, Kong or NGINX, Keycloak, OpenTelemetry with Prometheus and Grafana, pgBackRest, Patroni. None is chosen for the architect.
- **Specification of every part.** Select a part in any of Chapters 4 to 10: the companion panel reads responsibility → component → platform → product with version and vendor → where and how it runs, with the drivers it must meet, the decisions behind it and what is not yet specified. Chapter 5's components carry their products; Chapter 10's rail says what each part runs on.
- **Anti-patterns.** Found in recorded facts and named as the pattern catalogue names them — single point of failure, synchronous chain, missing idempotency, unbounded queue, observability as an afterthought in the reference — on the parts they concern and on Validate beneath SDD readiness.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:utility`, `npm run test:tradeoff` and `npm run test:design-spec`, and `npm run test:utility-browser` and `npm run test:tradeoff-browser` where Playwright is available.

## Chapter 1 models: the journey map and the context — 24 September 2026

Chapter 1's Model tab now opens on two models of what the design must achieve, in place of the page's own requirements map (one click away, under *All perspectives*).

- **Journey map.** A story map: the journey's steps run across with who takes part and whether their order is recorded; the priority slices run down — Must, then Should, then Could. Each requirement stands in its slice under the step that needs it and carries along its foot the Chapter 4 responsibility that covers it. A step with no requirement is a hole with **Add a requirement for this step**.
- **Walk the journey.** Step by step: who takes part, what each step needs, what it delivers, and what follows it.
- **Context.** The system as its boundary with its steps in order, the people who take part, the outcomes it exists for and the stakeholders who own them — with the limits on the design beneath: what is in and out of scope, constraints and assumptions.
- **The same slicing as Validate and the other chapter models.** Whole journey, one step, one person or one outcome; Steps or Requirements (more than 60 requirements open folded); the Structure, Flow and Reasoning lenses. Nothing moves when the lens changes.
- **Changes go through Chapter 1's own editor and proposals.** An enquiry about a pending payment is drawn under *Settle the payment* in a Should slice of its own before review; observable acceptance marks REQ-005; an unverified dependency stands among the limits.
- **What the model shows.** Untestable acceptance, an assumption not yet confirmed, everything still Must, a step nobody takes part in — each from recorded facts, with the chapter's proposal where it has one. The same observations sit beside Chapter 1's checks on Validate.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:story`, and `npm run test:story-browser` where Playwright is available.

## Validate: SDD readiness and the model views — 24 September 2026

Validate opens again on its original purpose — whether the design is ready for the solution design document — with the design anatomy one switch away.

- **SDD readiness.** The chapter's own checks, milestones and handoff, as before. Above them, one line across the journey: each chapter's blocking findings (the ones Chapter 11 asks to treat), what is left to review, and its milestones; each chapter opens its own checks. Where a chapter has its own models, what they show sits beside the checks as prompts.
- **Model views.** The design anatomy, on its own.
- The choice is remembered per project; `?validate=readiness` or `?validate=model` asks for one.

Run `npm run test:readiness`, and `npm run test:validate-browser` where Playwright is available.

## Chapter 4 models: responsibilities over the journey, and coverage — 24 September 2026

Chapter 4's Model tab now opens on two models of the logical design.

- **Responsibilities.** A blueprint: the journey's steps run across and the responsibility groups run down. Each responsibility stands at the step it serves, hands work on through its logical flows (◇ marks a condition), and carries along its foot the component that realises it in Chapter 5. A step nobody owns is a hole with **Add a responsibility**.
- **Walk the journey.** Follow the successful payment, the risk hold or the settlement timeout step by step, see where a scenario stops and what it leaves unowned, and record the walk as the chapter's scenario review.
- **Coverage.** Requirements, quality drivers and decisions against the responsibilities: what covers each reason, what only inherits it, which decisions are still drafts, and what nothing covers. Missing links open the Chapter 4 editor with the link ticked.
- **The same slicing as Validate and the other chapter models.** Whole journey, one group or one responsibility; Groups or Responsibilities; the Structure, Flow and Reasoning lenses. Nothing moves when the lens changes.
- **Changes go through Chapter 4's own editors and proposals.** The manual review queue is drawn in its group before review, and an edit to a saved responsibility is staged as a model proposal shown as the design would be.
- The shared lane engine gained bands, so each group keeps rows of its own; Chapters 5 and 9 are unchanged.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:responsibility`, and `npm run test:responsibility-browser` where Playwright is available.

## Chapter 7 models: the product stack and its options — 24 September 2026

Chapter 7's Model tab now opens on two models of the product layer beneath the platform.

- **Stack.** Every realisation in Chapter 6's order: the capability it realises, the option chosen (hatched where no choice is made yet), who depends on it and what stops if it fails, its six implementation obligations, sizing, cost, and how far its selection has gone. **With options** lists every alternative in place.
- **Options.** One realisation's options against the criteria that should decide between them — the quality drivers it carries first — with a judgement, reason and evidence per cell. No score is calculated.
- **The same slicing and lenses as the other chapter models:** Structure, Operation and Reasoning. Nothing moves when the lens changes.
- **Changes go through Chapter 7's own editors.** Options can be previewed in the stack before a draft preference is saved; proposals mark the obligations they would write.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:stack`, and `npm run test:stack-browser` where Playwright is available.

## Chapter 6 models: the platform stack and what fails together — 24 September 2026

Chapter 6's Model tab now opens on two models of the platform the application stands on.

- **Platform.** Capabilities are rows grouped by what they do, the components that stand on them are columns, and each need is a dot where the two meet; shared support joins into plates. Dependencies run beside the capabilities, and each row says what stops if it fails.
- **What fails together.** The same stack with one capability or its whole failure domain lost, through the chapter's own simulation, walked in four stages.
- **The same slicing as Validate and the other chapter models.** Whole platform, one module or one capability; Modules or Components; the Structure, Operation and Protection lenses. Nothing moves when the lens or the failure changes.
- **Changes go through Chapter 6's own editors and proposals.** Independent continuity, a recovery path and missing support are drawn in place before review.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:platform`, and `npm run test:platform-browser` where Playwright is available.

## Chapter 5 models: components and allocation — 24 September 2026

Chapter 5's Model tab now opens on two models of the realisation, built from the recorded components, allocations and interactions.

- **Components.** Each component stands in its Chapter 4 module carrying the responsibilities it realises, with the platform it stands on along its foot — the logical design embedded in the software. A responsibility nothing realises stands as a hole with **Create a component for it**. **Walk the logical flows** reads which interaction carries each Chapter 4 flow.
- **Allocation.** The responsibility × component matrix: what realises what, with which scope, and why.
- **The same slicing as Validate and Chapters 8–10.** Whole system, one module or one component; Modules or Components; the Structure, Flow and Reasoning lenses. Nothing moves when the lens changes.
- **Changes go through Chapter 5's own editors and component proposals.** A proposed component is drawn in its module before review, and a staged model proposal is shown as the design would be — a removed allocation appears as a hole straight away.
- Chapters 5 and 9 now share one lane layout engine.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:realise`, and `npm run test:realise-browser` where Playwright is available.

## Chapter 9 models: threat model and threats × controls — 24 September 2026

Chapter 9's Model tab now opens on two models of the protection design, built only from recorded contracts, trust boundaries, threats and controls.

- **Threat model.** Parts, parties outside and the stores they reach, laid out across trust boundaries. Every crossing is marked guarded, exposed or not yet examined; uses of one store from one boundary join one trunk, so fifteen uses read as four entries. **Walk the journey** reads each crossing of the payment path in turn.
- **Threats & controls.** The chapter's coverage rule made visible: which control covers which threat on which affected object, where a control protects something a threat affects but is not linked, and what evidence exists.
- **The same slicing as Validate and Chapters 8 and 10.** Whole system, one boundary or one part; Boundaries, Parts or Parts + platform; the Protection, Information and Flow lenses. Nothing moves when the lens changes.
- **Changes go through Chapter 9's own editors and control proposals.** *Record a threat here* opens the threat editor on the selected object; a proposed control appears as its own unsaved column that says which threats it would close.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:threat`, and `npm run test:threat-browser` where Playwright is available.

## Chapter 10 models: deployment and what fails together — 24 September 2026

Chapter 10's Model tab now opens on two models of the chosen environment.

- **Deployment.** Each part is a row and each zone a column; zones that share a failure domain stand together. You can see where every copy runs, what is not placed, what each part needs, and how it recovers.
- **What fails together.** Remove a zone or a shared failure domain to see, through the chapter's own simulation, what stops, what it takes with it, and what could recover. A four-stage walk-through explains it.
- **The same slicing as Validate and Chapter 8.** Whole environment, one module or one part; Modules, Parts, or Parts + platform; the Operation, Flow and Protection lenses. Nothing moves when the lens or the failure changes.
- **Changes go through Chapter 10's own editors and runtime proposals.** A proposed standby is drawn in its zone before review.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:deploy`, and `npm run test:deploy-browser` where Playwright is available.

## Chapter 8 models: sequence and data flow — 24 September 2026

Chapter 8's Model tab now opens on two standard architecture models of its exchanges, built from the recorded journey, contracts and data.

- **Sequence.** Each recorded business journey (confirmed, held, uncertain) is shown message by message. You can see the contracts and data that carry it, which parts wait on which, and what each contract says when an answer is lost.
- **Data flow.** Each data definition is shown with its authority and every place it travels. Parts that send data no contract gave them are flagged.
- **The same slicing as Validate.** Whole system, one module or one part; module or component lifelines; the Flow, Signals and Information lenses. Positions never move when the lens changes.
- **Changes go through Chapter 8's own editors** and appear on the sequence as a reviewable proposal. The connected explorer stays one click away under **Explore all perspectives**.

See [DESIGN-CHAPTER-MODELS.md](DESIGN-CHAPTER-MODELS.md). Run `npm run test:exchange`, and `npm run test:exchange-browser` where Playwright is available.

## Design anatomy on Validate — 24 September 2026

Every chapter's Validate tab now opens on the design anatomy. It shows the whole design as one body that grows chapter by chapter.

- **Columns** are the modules. **Bands** are the realization layers, from intent down to runtime.
- **Seven lenses** show the systems that run through the whole design: Structure, Flow, Signals, Information, Protection, Operation and Reasoning.
- **Any part can be dissected**: the whole system, then one module, then one component or platform capability, with the same layers and lenses at every level.
- **Findings** sit on the parts they concern. **Gaps** appear as empty sockets in the layer where the missing design belongs.
- **The layout is computed**: module order follows the flow of work, shared platform parts are single lanes, and interactions are routed so they never cross a card. You can drag columns into a new order.

Nothing on this surface changes the project. See [DESIGN-ANATOMY.md](DESIGN-ANATOMY.md). Run `npm run test:anatomy`, and `npm run test:anatomy-browser` where Playwright is available.

## Connected model exploration — release 50

One Model surface now spans all eleven chapters: system/module exploration, five realization levels, behaviour paths, data, protection, deployment and rationale. Selection, scope and saved perspectives stay connected; the canvas can fill the viewport. Sol receives the current model context, and reviewed canvas edits use the existing command and SDD pipeline.

Native export/import preserves semantic identities and views. OrbusInfinity mapping preparation, conservative ArchiMate XML, Ilograph and Eraser exports include explicit fidelity reports. Actual Orbus tenant exchange and independent usability evidence remain outstanding. See [MODELLING-IMPLEMENTATION.md](MODELLING-IMPLEMENTATION.md) for the exact implementation, verification and limits. Run `npm run test:connected-model` for its acceptance group.

## Connected architecture journey — release 41

This release completes the implementation increment recorded in [ENHANCEMENT-ACCEPTANCE.md](ENHANCEMENT-ACCEPTANCE.md), including its verification evidence and explicit operating limits. It preserves the eleven chapters and existing Sol, Mind Factory and Cursor surfaces.

- **Start with real requirements:** Chapter 1 → Import requirements workbook. Select the sheet, header and column mapping; inspect gaps and original cells; review before import. Re-import retains external IDs and presents conflicting source changes.
- **Stay oriented:** Sol carries a saved, source-sensitive question and next step through Chapters 1–11. Answers become reviewable proposals. The model remains under the architect’s control.
- **Compare before changing:** ordinary edits show their changed definitions and downstream relationships. Retain alternatives in Mind Factory, resolve concurrent conflicts and merge with rationale. Chapters 4–6 provide canvas connections, boundary creation and dependency analysis.
- **Make design assumptions explicit:** project libraries hold versioned technology, control, runbook and drafting guidance. Chapters 3/7 compare whole-life costs; Chapter 10 compares environments, capacity assumptions and rollout steps.
- **Exchange contracts:** Chapter 8 imports OpenAPI 3.1 / AsyncAPI 3.0 JSON, retains original documents and drafts contracts against selected existing participants. Edit nested schemas, check samples, record field lineage and export. Unsupported validation keywords are disclosed.
- **Carry evidence into delivery:** attach original files through Sol; record typed assurance observations. Chapter 11 holds authenticated review assignments/discussion, a unified action queue, baseline comparisons, offline Word/PDF exports and reviewed delivery JSON exchange.
- **Manage the workspace:** rename, archive/restore and create reusable project templates; retain named model perspectives. Templates reset prior review authority and evidence.

The frontend is browser ES modules in `public/`; `worker.js` routes authenticated API requests into shared domain modules and backend services. Hosted data uses D1 (`db/`, `drizzle/`) and private R2 objects (`project-storage.js`, `requirement-storage.js`, `intake-service.js`). The downloadable local edition uses the same domain logic with Node 24, SQLite and local files. `collaboration-service.js` records authenticated roles/reviews and attachments; `intelligence-service.js`, `intelligence-provider.js` and `brain-retrieval.js` serve the existing grounded OpenAI integration.

Run `npm run check` and `npm run test:enhancements` for source and integration verification. Workbook acceptance uses `AIW_WORKBOOK=/absolute/path/to/workbook.xlsx npm run verify:intake`; it specifically checks the supplied SEABaaS workload. DOM integration also needs `AIW_DOM_MODULE` pointing to an installed Happy DOM ESM entry. DOM verification is not a rendered browser/layout test.

The XLSX reader supports unencrypted `.xlsx` files up to 12 MB, with bounded expansion and record limits; it preserves formulas as source text and uses cached values without executing them. Word/PDF exports run in the browser using bundled dependencies, without a document service. Live provider use requires an independently configured OpenAI key. Source-grounding checks do not constitute independent semantic or production certification.


## Coordinated proposals and saved alternatives — 20 September 2026

The existing impact review now combines edits to saved records across Chapters 4–7. Add related edits through their usual editors, compare saved and proposed definitions on the model, and save named alternatives with their rationale. Mind Factory resumes and compares these alternatives against the current model, discloses overlaps and retains applied or set-aside reasoning.

Acceptance applies the reviewed records together, preserves unrelated saved edits and records the reviewer and reason with each CHG entry and the living SDD. The refined navigation, source flow and lens placement remain in place. See [MODEL-ALTERNATIVES-REVIEW.md](MODEL-ALTERNATIVES-REVIEW.md) for the workflow, verification, limits and outstanding visual inspection.

## Workbench refinement — 20 September 2026

Project navigation now has three sections: a compact project switcher with Sources and Changes, an uninterrupted chapter list, and independently scrollable perspectives. Short screens retain whole-navigation scrolling. Object lens placement is available from the context panel's layout menu; its remembered preference is retained. Output handoffs use a compact footer with the carry-forward explanation on demand.

Source-based drafting now opens inside the existing Sol dialog. Back returns to the current chapter's actions. Mind Factory considerations, source excerpts, saved tasks and linked-record trails retain their original data. The separate evidence banner, three-mode evidence window and header-level placement row have been removed. See [WORKBENCH-REFINEMENT-REVIEW.md](WORKBENCH-REFINEMENT-REVIEW.md) for implementation and verification scope, including the unavailable visual preview.

## Reviewed model changes in Chapters 4–7 — 20 September 2026

The existing responsibility, application-component, technology-capability and realization-plan editors now offer **Preview impact** for saved records. Compare saved and proposed definitions on the same canvas, inspect the actual allocation changes and linked obligations, edit the proposal, and explicitly apply the reviewed working change. Sol opens the current change review. Cursor explains the proposal; the saved definition and existing chapter tools remain accessible underneath. Mind Factory and the established model controls remain separate.

The shared review includes both removed and proposed allocation paths, inherited requirements/quality/decision context, connected peers, and downstream interface, control and operating obligations. Technology changes also expose the recorded applications and operating plans depending on their support. Allocation comparisons use model references and names. Existing chapter checks provide introduced/resolved findings; this is design analysis, not proof of runtime effects.

Accepted changes save CHG history and travel into the working SDD. Concurrent work requires refresh, with preserved unrelated field and allocation edits and explicit disclosure of conflicting values. Frozen baselines remain unchanged. Unaccepted previews remain in the current session with chapter-navigation reminders and an unload warning; they are not yet durable named alternatives. Standalone relationship editors and existing pattern proposals retain their established workflows. See [MODEL-IMPACT-REVIEW.md](MODEL-IMPACT-REVIEW.md) for the exact scope and checks.

## One continuous workbench — 20 September 2026

The product direction is captured in [PRODUCT-VISION.md](PRODUCT-VISION.md). Chapter changes retain the selected model object, and the existing inspectors expose saved cross-chapter paths in a bounded **Connected journey** panel. Direct continuation links keep stable object and project references. No new authoring workspace is added. See [JOURNEY-CONTINUITY-REVIEW.md](JOURNEY-CONTINUITY-REVIEW.md) for validation and scope.

## Evidence-led Chapters 1–3 — 20 September 2026

The **Sources** control is available in every chapter’s project section. In Chapters 1–3, **Sol → Draft from a source** starts connected work inside the existing assistant. Save a focused source excerpt with its location, version/date, confirmation status, and reviewer. Earlier source revisions remain available.

**Sol** saves the need, acceptance criteria, accountable owner, open questions, and an optional business outcome. Prepare and edit a coordinated requirement, quality scenario, and decision question; inspect the complete proposed records and open findings before applying all three together. The resulting stable IDs and links belong to the existing shared model. Targets stay unconfirmed and decisions start in draft. Blank projects use their own source and never receive payment prompts automatically.

**Mind Factory** remains separate: compare prerequisites, benefits, costs, and anti-patterns and retain a consideration or rejection reason. The cursor and pinned context show the applied record's source citation. Source changes reopen evidence review; saved task history, the original excerpt at application, and pattern reasoning travel into the SDD. An untouched bundle can be withdrawn only while no later records depend on it. Existing chapter actions, layered maps, flow controls, impact previews, exports, and the chapter journey remain available.

This increment uses explicit project rules, pasted excerpts, and source references. It does not connect an external LLM, extract uploaded documents, verify sources independently, or grant design/governance approval. See [EVIDENCE-COAUTHORING-REVIEW.md](EVIDENCE-COAUTHORING-REVIEW.md) for validation and boundaries.

## Interface and data impact previews — 20 September 2026

Editing an existing interface contract, data definition, or dictionary field now stages an unsaved impact preview. Compare saved and proposed states on the same canvas, inspect linked records, review attribute-level differences and new definition findings, then edit, dismiss, or explicitly apply the proposal. Provider changes redraw the actual relationship; dictionary edits preserve stable field references. All existing exploration and chapter controls remain available.

Dependencies come from recorded payloads, participants, data authority, derivations, application allocations, upstream rationale, controls, and operating plans. Potential compatibility effects remain review questions. Acceptance saves a CHG entry into the existing review desk and Chapter 11 SDD, including findings and prompts captured at acceptance. Frozen baselines remain unchanged. Concurrent changes require refresh, retain unrelated edits, and expose competing values before acceptance. Mobile review uses a compact record picker with the same context and actions. See [INTERFACE-IMPACT-REVIEW.md](INTERFACE-IMPACT-REVIEW.md) for scope and validation.

## Requirement change review — 20 September 2026

**Review changes** is available from every chapter. Edits to existing requirements retain stable CHG references, before-and-after wording, changed links, and affected records across Chapters 2–10. The review desk explains the dependency trail and opens each record in its own model. Record an evidenced assessment or an owned follow-up; follow-ups stay open. A later edit to a reviewed record or its immediate modelling context reopens that assessment. Later requirement changes preserve earlier entries as history.

Review notes, outcomes, and progress persist with the private project and travel into the Chapter 11 SDD. Frozen baselines retain their captured history. Assessments do not repair model findings or grant governance approval. Concurrent saves cannot overwrite newer revisions, and the review desk retains unsaved notes when loading the latest project. The journal uses private object storage with a compact revision-controlled database reference. See [CHANGE-REVIEW-REPORT.md](CHANGE-REVIEW-REPORT.md) for scope and validation.

## Project journeys — 20 September 2026

Use **All projects** or the project switcher from any chapter to open the private project workspace. Create a genuinely blank architecture or a fresh, labelled Bank Payment Journey reference copy. Each project retains its own saved records, revisions, browser preferences, and last visited chapter. Existing Bank Payment Journey links continue to work.

Blank projects start at zero content progress, with no bank objects or invented requirements. All eleven chapters support authoring from that state. Recorded journey steps drive their model walkthrough; the reference project retains its successful-payment, risk-hold, and uncertain-settlement simulations. Requirements and stable references carry into the later studios without re-entry.

Editing a requirement now offers a compact downstream review route through its saved relationships. Chapter 11 produces a formatted SDD with a contents list, model atlas, object/relationship tables, traceability, findings, and delivery obligations. Frozen baselines retain their captured model. The restored exploration controls remain in place. See [PROJECT-JOURNEY-REVIEW.md](PROJECT-JOURNEY-REVIEW.md) for validation evidence and limits.

## Current interaction baseline — 20 September 2026

The original explorer's persistent layer controls sit in a separately scrollable perspectives section beneath the uninterrupted architecture journey, across all eleven chapters and all four tabs. Chapters 1–3 expose their native map perspectives in the same location. Sol, Mind Factory, cursor controls, readable context, canvas shortcuts and next-step guidance remain available. The object lens can sit beside or below the desktop model, with a remembered preference controlled from the context panel. Chapter 4's original architect's note editor is restored using the existing browser storage and export path.

The workbench refinement above supersedes control placement in the historical review notes below. Those earlier visual checks describe their own source revisions. See [FUNCTIONALITY-RESTORATION-REVIEW.md](FUNCTIONALITY-RESTORATION-REVIEW.md) for the original-to-current capability mapping, 44-surface desktop and mobile review, interaction evidence, and the preservation rule for subsequent changes.

A private architecture workbench using an illustrative Bank Payment Journey. Chapter 1 opens by default. Chapter 4 provides a saved logical application studio; Chapter 5 provides an editable Application Realisation studio over those same responsibilities and object identities. Chapter 6 models the vendor-neutral technology capabilities supporting those applications. Chapter 7 realizes those capabilities through compared technology options, implementation obligations, and recorded selection evidence. Chapter 8 defines interface contracts, shared data dictionaries, authoritative ownership, and data derivations. Chapter 9 connects threat hypotheses, intended controls, independent evidence records, and residual-risk treatment. Chapter 10 places the inherited assets into environments and zones, records their operating plans, and explores runtime failure dependencies. Chapter 11 assembles the connected review, freezes versioned SDD baselines, and tracks implementation obligations separately from governance and delivery evidence. Chapter 2 provides the quality-driver studio. Chapter 3 compares alternatives, records architectural decisions, and carries their reviewed impacts into Chapters 4 and 5.

## Chapter 1

Work, Model, Validate, and Output share one private project document. The brief and eight artefact types are editable: outcomes, stakeholders, actors, scope, journey steps, constraints, assumptions, and functional requirements. Requirements retain stable IDs, owner, source, priority, and acceptance criteria. Reference, user-authored, and suggested origins remain distinguishable from explicit user confirmation.

The requirements map filters perspectives, reveals hidden perspectives when following links, searches across the project, and highlights selected relationships. A guided walkthrough exposes the recorded journey order with play, pause, previous/next, and direct step selection. Solid journey arrows and moving markers are distinguished from dashed structural relationships; reduced-motion preferences suppress the markers. Cursor explanations, Sol actions, and Mind Factory proposals adapt to the active surface. Cursor, Sol, and Mind Factory controls are visible above every Chapter 1 surface. Ghost changes show the saved and proposed wording before editing and application; previewing never changes the saved project. Guidance is rule-based; there is no external LLM or live bank connection.

Validation checks required context, missing descriptions/owners/sources, testable acceptance, ambiguous wording, duplicate titles, missing requirement links, and broken references. Readiness is calculated from content and review milestones. Editing invalidates earlier validation and handoff records. Chapter 2 reads the same requirements and stable IDs, including open findings.

## Chapter 2

Work, Model, Validate, and Output continue the same project. Six illustrative quality scenarios cover payment integrity, availability, performance, recoverability, security, and traceability. Each driver has a stable QD reference and a QS scenario reference, a stimulus, operating conditions, expected response, metric, comparator, numerical target, unit, measurement window, verification method, owner, evidence, named priority, and a written priority reason. Example targets remain assumptions until explicitly confirmed. The editor supports incomplete drafts and a protected, three-step editing flow.

The live map connects outcomes through the current requirements to scenarios and affected application responsibilities. Layer toggles, focused selection, an expanded canvas, dependency highlighting, and optional moving markers explain the rationale. Potential trade-offs remain prompts until recorded. Driver comparisons show actual scenario fields, priorities, and reasons. Drivers can be reordered within a named priority. Recorded conflicts require a resolution and owner, and changing a participating driver makes an earlier resolution require review.

Cursor explanations, Sol actions, and separate Mind Factory exploration adapt to the active tab and selected context. Editable ghost proposals cover missing quality concerns, incomplete measurement definitions, boundary conditions, and candidate tactics. Guidance is rule-based; proposals require review and application before they affect the stored project.

Validation detects unmeasurable targets, missing sources and responsibilities, unconfirmed assumptions, duplicate titles, changed or broken requirement references, and unresolved conflicts. Requirement edits flag the affected drivers and invalidate prior quality validation/handoffs. Quality edits preserve Chapter 1 records and references. Markdown exports a prioritised register; JSON exports the shared project and findings. Chapter 3 intake and the Chapter 4 application inspector read the same quality records, without re-entry.

## Chapter 3

The decision studio retains the same private requirements and quality drivers. Three illustrative questions cover processing style, duplicate protection, and recovery after uncertain settlement outcomes. Users can create questions and alternatives, compare each alternative against linked quality drivers, record reasons and evidence, and define affected responsibilities and proposed relationships. Named comparison effects are explicit; no numerical score or automatic winner is calculated.

The Work surface separates inputs, comparison, and recording. The Model surface previews the selected alternative and its proposed impact, with layer toggles, source inspection, and optional dependency tracing. Sol offers actions for the current tab; Mind Factory explores styles, patterns, tactics, and anti-pattern boundaries through editable ghost proposals. Cursor explanations and the pinned lens show consequences and linked quality criteria. Guidance remains rule-based.

Working choices, recorded decisions, architect acceptance, and external governance review evidence are separate states. Stable ADR and ALT references survive editing. Recording, acceptance, and revision events retain decision history. Revised choices or changed source requirements/drivers make earlier model impacts inactive. Acceptance never applies a model change automatically: applying the reviewed ghost is a separate action. Governance evidence applies to a specific decision revision and needs review after relevant inputs change.

Validation covers missing rationale, unsupported comparisons, incomplete alternatives, broken source/impact links, unsafe failure boundaries, unresolved assumptions, risk treatment, conflicting recorded choices, and stale conflict resolutions. Markdown exports the decision register and comparison basis; JSON exports the complete shared project with current findings. Handoff carries current accepted references to Chapter 4/5. Applied decision relationships appear on the logical model; physical implementations expose inherited decision references through their logical responsibilities. Earlier accepted references remain visible when their current revision needs review.

## Chapter 4

Logical responsibilities, groups, connections, physical candidates, and implementation mappings are saved in the same private project. The original application object IDs are preserved. Stable LR, GRP, REL, MAP, and OBJ references survive revision and reopening. Each responsibility records its purpose, owned boundary, owner, source, group, requirement references, and decision references. Source confirmation, working suggestions, architect acceptance, and governance approval remain distinct. Quality drivers are inherited through requirements, affected responsibilities, and linked decisions. The Chapter 2 and 3 responsibility pickers also recognise newly created logical records.

Work provides responsibility, connection, allocation, and group registers. The Model surface reads those same records through all eight existing layer toggles. Logical grouping changes the canvas arrangement without duplicating objects. Selection, search, focus, zoom, fit, and a wider canvas support exploration. Directed flow markers and structural links have separate meanings. The successful payment, risk hold, and uncertain-settlement walkthroughs are explicitly simulated reference scenarios; custom connections are model relationships, not an executable payment engine. Scenario reviews only count after all applicable steps have been visited and are invalidated by model changes.

Cursor explanations include attributes, relationship meanings, upstream rationale, and current modelling gaps. Sol actions and Mind Factory pattern exploration remain separate and chapter/tab-aware. Human review, duplicate protection, and controlled recovery proposals appear as unsaved ghosts. Users can edit and preview their wording, accept a reviewed working candidate, or dismiss it without saving. Guidance is deterministic and rule-based; no external LLM is connected. Earlier browser-only candidates remain visible until individually reviewed and saved into the shared model.

Validation checks uncovered requirements, incomplete responsibility definitions, missing decision rationale, changed source records, disconnected objects and process steps, broken relationships, duplicate names, and incomplete or stale implementation mappings. Meaning changes to a responsibility flag its mapping for review; moving it between groups does not invalidate the allocation. Recorded validation and handoff track the current model and source versions. Chapter 5 retains each logical reference and its rationale on physical components. A working handoff can carry acknowledged open findings; it does not assert implementation readiness or governance approval.

JSON exports the connected project and current findings. Markdown exports the logical register, relationships, allocations, source references, scenario reviews, and handoff state. Both include earlier browser exploration notes when downloaded from the application. Native dialogs protect unsaved edits, and stale server revisions preserve form contents instead of overwriting newer changes.

## Chapter 5

Application components retain stable APP references and the physical object IDs inherited from Chapter 4. Services, workers, adapters, queues, stores, and modules can be created and revised through a protected three-step editor. Each component records its purpose, owned boundary, accountable owner, inputs, outputs, rationale, evidence, technology capabilities, assumptions, and design state. Design review remains separate from architect acceptance of an upstream decision and from governance approval.

Many-to-many allocations use the same MAP and LR references as Chapter 4, with a scope for each component's part of a responsibility. Requirements, quality scenarios, and architecture decisions are inherited without re-entry. Changes to those inputs flag affected component designs for review. Chapter 4 physical candidates created later are automatically included as editable component records. Missing definitions and technology capabilities stay explicit gaps.

The Work surface contains component, interaction, and technology-needs registers. Typed interactions retain INT references, conditions, and failure or uncertainty policies. Authoritative data ownership is declared in the component editor and projected as relationships on the shared model. The Model surface keeps all eight layer toggles, focus, search, fit, and flow controls. The three payment walkthroughs use current component allocations and clearly disclose that they simulate the reference journey; custom policies are not executed. Physical highlighting follows allocation links rather than visual placement.

Cursor explanations include component attributes, relationship meanings, inherited rationale, and modelling gaps. Sol actions and Mind Factory exploration are separate and adapt to Work, Model, Validate, and Output. Editable ghost proposals cover accountable review queues, duplicate protection with an owned result record, and controlled recovery. Preview and dismissal do not save changes; acceptance requires an explicit review. Guidance is rule-based, with no external LLM or bank connection.

Validation detects missing or stale allocations, incomplete boundaries and policies, unsupported choices, changed source records, duplicate names, overlapping scopes, competing data owners, disconnected components, and unresolved assumptions. Eight content and review milestones show progress. Scenario reviews, validation, and handoff are tied to the current model and source versions. Completing a component does not force repetition of the inherited logical intake.

JSON exports the connected project and current findings. Markdown exports the application register with allocations, source references, technology needs, scenario reviews, and handoff state. Browser notes and earlier browser-only candidates remain included. The Chapter 5 handoff opens the Chapter 6 Logical Technology studio with the same component and logical references, including acknowledged open findings.

## Chapter 6

Logical technology capabilities retain stable TC references and the original technology object IDs. Nine vendor-neutral reference categories cover compute, transactional storage, messaging, caching, connectivity, identity, observability, backup, and recovery. Application needs retain TN references and explicit consequences of unavailability; support mappings retain TM references and individual scopes. Inferred needs for later Chapter 5 components begin unconfirmed and unmapped. Existing application, logical, requirement, quality, and decision references are inherited without re-entry.

Work provides application-need, capability, dependency, and trust-boundary registers. The three-step capability editor records purpose, owner, boundary, support, rationale, sources, failure domains, continuity, recovery ownership, numerical assumptions, and design state. Application groups keep the mapping editor compact. Typed TD relationships distinguish critical prerequisites, data movement, trust enforcement, and recovery dependencies. TB boundaries record ownership and crossing policy. Source tracking uses compact fingerprints while the source artefacts remain in the project; unrelated technology edits do not alter earlier chapter versions.

The same layered model reveals application support, data movement, trust boundaries, and resilience. All eight original layer toggles remain available. A contextual bottom panel directly beneath the canvas shows the selected capability or application, its support, policies, upstream rationale, open decisions, and recovery arrangements. Selection updates a compact context bar without moving the canvas. Open details brings the bottom panel into view; a return-to-model action keeps the route back clear. Cursor explanations, Sol actions, and Mind Factory patterns are separate and tab-aware. Missing support, independent continuity, and restoration proposals remain editable ghosts until explicitly reviewed and accepted. Guidance is rule-based, with no external LLM connection.

The failure lab separates whole-capability outages from primary-domain loss. Critical support prerequisites propagate impact; data movement and recovery links do not automatically block service. All mapped capabilities are required for a need; alternates belong inside a capability's continuity arrangement. Declared alternates and safe bypasses remain unproved assumptions. Animated impact traces follow support toward its dependents. Playback pauses at quality review. Empty measurements remain unassessed, and numerical outcomes require an explicit hypothetical basis. Recovery delay can begin with a labelled outage-duration assumption. Unapplied edits survive tab changes and must be applied before advancing. Four explored stages and explicit recording are required to save a review.

Validation checks unsupported needs, missing definition and traceability, direct and indirect single points of failure, invalid isolation, fail-open boundaries, missing recoverable copies, unclear recovery ownership/targets, shared recovery domains, broken dependencies, and critical prerequisite cycles. Eight content and review milestones make progress visible. Earlier application or source changes invalidate affected capability reviews, simulations, validation, and handoff. The handoff opens the Chapter 7 Technology Realization workspace with the same capability references and acknowledged findings.

JSON exports the connected project and findings. Markdown exports capabilities, needs, support mappings, trust/dependency policies, source references, explicit simulation assumptions, and the handoff. Protected dialogs and server revision checks prevent silent overwrites. Earlier verbose pre-release tracking snapshots are compacted without resetting valid reviews.

## Chapter 7

Technology realizations retain stable TR references, technology options retain TO references, capability allocations retain RM references, and technology interfaces retain TI references. Multiple capabilities can share one realization boundary; one capability can have several scoped realizations. Chapter 6 capabilities carry their applications, requirements, quality drivers, and decisions forward without re-entry. Changes flag the inherited input review. Selecting technology does not modify vendor-neutral capability records.

Work separates the realization plan, option comparison, and interface obligations. Protected editors capture accountable ownership, actual product/service, version or service tier, provider, operating model, support, access, data handling, recovery, contract, lifecycle and exit arrangements, rationale, risks, and assumptions. Capacity and cost estimates retain their units and evidence basis and require explicit confirmation. Illustrative Kubernetes, PostgreSQL, and RabbitMQ options link to official documentation, without inventing versions, prices, or suitability. No product is selected automatically.

Comparisons use inherited quality scenarios plus operations, recovery, lifecycle, and cost criteria. Each option has a named judgement, written reason, and evidence; there is no numeric score or automatic winner. Draft preference, recorded architect selection, and evidence of an existing external approval remain separate. Revision history preserves the selection trail. Plan, option, assessment, capability, and interface changes make affected selections and approval evidence require review.

The same layered model shows capability allocations, application support, interface/data obligations, and trust/runtime context. Previewing an option changes its visible technology node while retaining the TR and RM identities. A draft preference updates the saved connected model. The bottom panel exposes rationale, source references, implementation obligations, and selection history. Cursor explanations, Sol actions, and Mind Factory exploration remain distinct and tab-aware. Operating-boundary, recovery/contract, and missing-allocation proposals appear as editable ghosts; preview and dismissal do not save changes. Guidance is rule-based and no infrastructure is provisioned.

Validation checks missing realization allocations, broken references, incomplete products and implementation obligations, unsupported comparison judgements, unresolved estimates and assumptions, and stale selection/approval evidence. Eight content and review milestones track progress. Acknowledged open findings travel with the Chapter 8 handoff. The Chapter 7 handoff now opens the Interfaces & Data workspace with the same realization references and interface obligations. JSON exports the complete connected project; Markdown exports the realization register, comparison basis, allocations, contracts, and open findings.

## Chapter 8

Interfaces and data enrich the existing connected project. The original Payment, Posting, and Settlement contract node IDs are retained with stable IF references. Application interactions from Chapter 5 and technology interfaces from Chapter 7 receive contract records that retain their INT/TI source references. Later upstream interactions are incorporated as unconfirmed contract definitions; existing definitions are never silently replaced. Named external participants retain EXT references, including explicit channel, core-authority, and payment-network boundaries. The reference network is not an actual NPS specification.

Work separates interface contracts, the data dictionary, and data derivations. Three-step contract editors capture participants, interaction style, operation, protocol, version, ownership, payload links, correlation and repeat keys, duplicate/error/timeout/retry behaviour, access, transport, compatibility, and agreement evidence. Timing values require a basis and explicit confirmation. Data definitions retain DAT references, authoritative system, accountable owner, classification, protection, retention/deletion/hold policy, and open assumptions. Numerical retention durations are optional assumptions, not invented legal requirements.

The field dictionary retains DF references through revision. Fields declare names, meanings, types, required/key status, classification overrides, enumerated values, free-text constraints, and fictional examples. DX references link request/event and response shapes to contracts. DL references describe lineage between data records, an optional interface, transformation, ownership, and evidence. A record's definitive authority is distinguished from the application's previously declared local copies and logical ownership.

The same layered model exposes service contracts, payloads and lineage, authoritative ownership, and technology/trust context. Selecting a contract, data record, participant, or realization opens its bottom context panel. New data and contracts appear in the model immediately. Cursor explanations, Sol actions, and separate Mind Factory patterns adapt to the chapter and tab. Correlation, uncertain-outcome, and data-lifecycle proposals remain editable ghosts until explicitly reviewed and accepted. Guidance is rule-based with no external LLM connection.

The contract design lab checks fictional JSON objects against the linked flat dictionary. It detects missing required fields, type mismatches, undeclared fields, conflicting definitions, invalid enum values, and empty dictionaries. Ordinary exchange, repeated-delivery, and missing-acknowledgement walkthroughs explain the declared policies with model highlighting and play/step controls. All four stages, explicit confirmation, and written observations are needed to record a check. The server binds the review to the exact current contract/data revision. Entered sample payloads are not saved; records retain findings, references, scenario, and observations. Nested shape constraints, free-text rules, security enforcement, and actual financial processing remain implementation-test obligations.

Validation detects missing or changed boundaries, broken payload links, absent correlation/repeat keys, incomplete failure and protection policies, unconfirmed assumptions, conflicting shapes, missing ownership, classification mismatches, missing retention, and incomplete lineage. Field, data, participant, source, and contract changes invalidate affected design reviews and sample checks. Eight content and review milestones can reach a complete working handoff while acknowledged assumptions remain visible. The saved Chapter 9 handoff now opens the Security workspace, retaining contract, data, and field identities.

JSON exports the complete connected project; Markdown exports the interface register, dictionary, lineage, review results, source references, and Security obligations. Protected dialogs retain unsaved changes, and server revision checks reject stale saves without discarding form inputs.

## Chapter 9

Security enriches the same connected project. Existing identity/consent, audit, and service-trust nodes retain their IDs and receive stable SEC references. THR references identify illustrative threat scenarios for instruction authority, repeated or altered payments, data disclosure, and missing evidence. Threats and controls can target the existing IF/DAT/APP/TR/TC/TB objects, with source requirements, quality drivers, and accepted decisions accessible from the context panel. Trust assignments remain owned by Chapter 6.

Work separates Threats & exposure, Control design, and Evidence & risk. Threat editors capture actor, scenario, consequence, scope, owner, qualitative priority and its basis, and open assumptions. Controls capture purpose, enforcement point, mechanism, accountable owner, scoped threat and object links, unavailable-control posture, detection and response, verification expectations, and runtime operating obligations. Reference content stays labelled, and confirming an assumption does not establish implementation.

EV records distinguish design review, implementation evidence, and verification evidence, each with a result, reviewer, reference, scope, observations, and explicit confirmation. They are user-recorded evidence references; AIW does not inspect or independently certify the report. Evidence can be withdrawn with a reason while remaining in history. A newer failed result supersedes an earlier passing result. RR records retain residual risk, treatment, owner, rationale, and next review date. Architect-recorded acceptance remains separate from SG records of external governance approval, rejection, or deferral. Withdrawing a later evidence record cannot silently restore an older risk acceptance or approval.

The layered model exposes threats and intended protection, data exposure, inherited trust boundaries, and runtime obligations. The contextual bottom panel separates exposure, controls, evidence, and source rationale. Cursor explanations, Sol actions, and Mind Factory patterns adapt to the chapter, tab, and selected object. Authority, repeat-integrity, data-minimisation, and protected-evidence proposals remain editable ghosts until reviewed and accepted. Acceptance saves only the control design; evidence is recorded separately. Guidance remains rule-based without an external LLM.

A four-stage design walkthrough traces an affected object, intended enforcement, planned or unavailable-control response, and residual exposure. Play/pause, step, restart, and scenario switching update model highlighting. SS reviews require all four stages and written acknowledgement. These simulations follow written policies; they do not execute attacks, contact live systems, or turn a planned control into a tested control.

Validation detects incomplete threat and control definitions, broken references, mismatched scope, uncovered objects, missing failure/test/operating plans, stale sources and evidence, failed test records, rejected governance treatment, unreviewed residual risk, overdue review dates, and inherited contracts/data without threat assessment. Upstream model changes invalidate affected evidence, risk decisions, simulations, and handoff. Eight content/review milestones can complete a working security design while explicit implementation and verification gaps remain attached to the Chapter 10 Deployment / Runtime intake. The handoff opens the Chapter 10 workspace with those same stable control references; completion is not production certification.

JSON exports the connected project and complete historical records. Markdown exports the threat and control registers, evidence references, current risk/governance state, walkthrough reviews, and runtime obligations. Forms protect unsaved edits; server revision checks preserve concurrent-change safety.

## Chapter 10

Deployment / Runtime continues the inherited applications, technology realizations, contracts, and security controls. One environment selector governs Work, Model, and the contextual bottom panel. Environment scopes, zones and shared failure domains, runtime plans, placements, runtime paths, review/exercise evidence, and simulations retain stable ENV/ZON/RUN/PL/RP/RV/RS references. The original application and technology IDs remain unchanged; the original zone-a and zone-b identities now have explicit zone definitions. Example scopes, replica counts, and capacity assumptions remain visibly unconfirmed.

The three Work stages place components, design recovery, and define operation/release responsibilities. Editors cover active and standby replica counts, capacity and scaling basis, readiness, network admission, state ownership and write fencing, protected copies, recovery assumptions, security enforcement, alert/runbook ownership, rollout, and rollback/reconciliation. Included assets receive stable operating-plan stubs. Removing an asset from a scope preserves its prior plan and history; reincluding it restores the same reference. Paths inherit their IF contract identities and retain separate runtime routing, admission, and unavailable-provider policy.

Four live model perspectives reveal placements, runtime paths, recovery dependencies, and security enforcement. All eight shared layers remain available. Application needs, critical capability dependencies, and required/buffered interface routes feed the same runtime dependency model used by the graph and failure simulation. The bottom panel exposes placements, recovery prerequisites, operation/evidence, and upstream requirements, quality drivers, decisions, and controls. Cursor explanations, Sol actions, and Mind Factory patterns adapt to the active tab. Standby, recovery, and operating suggestions are editable ghosts requiring explicit acceptance. Guidance remains rule-based.

Labelled zone-loss and shared-domain-loss simulations walk through failure scope, dependency impact, quality/control implications, and recovery prerequisites with step/play/pause/restart. Zones sharing a case-insensitive failure-domain name fail together in a domain scenario. Baselines below the declared minimum remain unassessed. A surviving replica count does not establish health or throughput. Stateful recovery requires a declared surviving protected copy and write authority; missing or failed prerequisites propagate to callers. Provider-managed recovery is not inferred. Quality outcomes remain unassessed until a user supplies a measurement assumption and its basis. No resources are provisioned and no live failure exercise occurs.

Design reviews, actual external exercise references, and simulated walkthroughs are separate records. Environment/source changes invalidate their currency without removing history. Validation covers undefined placements, excluded prerequisites, shared failure domains, capacity assumptions, incomplete state/recovery arrangements, missing runtime/security ownership, stale routes and evidence, and failed exercise results. Eight milestones can complete a working operating design while actual-exercise gaps travel explicitly into the Chapter 11 Review & Realize intake. Chapter 11 assembles these records and open obligations into the final architecture review and SDD.

## Chapter 11 — Review & Realize

The final studio assembles the existing Bank Payment Journey into a Solution Design Document. Work provides cross-chapter intake, document framing, and owned delivery actions with stable RA references, due dates, linked objects, acceptance evidence, progress, and history. The eight milestones describe architecture review and implementation handoff; they never imply that the system has actually been implemented.

Model follows each requirement through five stages: obligation, quality and decisions, application responsibilities, supporting architecture, and protection/runtime. It filters the same connected model through its actual references, retains all eight layer toggles, and exposes selected-object rationale, source findings, and delivery evidence in the bottom panel. Missing coverage has an explicit empty state and a Chapter 4 repair link. Step/play/pause/restart support the design walkthrough, with stable controls during automatic playback. Traceability reviews retain observations and their source version. Separate Cursor, Sol, and Mind Factory guidance adapt to the active tab; editable delivery ghosts require explicit acceptance. Guidance remains rule-based, with no external LLM connection.

Validate aggregates source findings without deleting or silently resolving them. Architects can require a source fix, carry a finding into a fully defined action, record an evidenced design limitation, or explain non-applicability. A positive review requires current intake, confirmed SDD framing, all in-scope requirement walkthroughs, and explicit treatments for source errors. Remaining source errors require the outcome “Ready with actions / limitations.” Working drafts, architect-reviewed baselines, recorded external governance evidence, and actual delivery verification remain separate.

Output provides a printable HTML SDD, Markdown, and complete project JSON, including all ten chapter registers, traceability, and retained findings. Frozen BL snapshots preserve their exact captured SDD and model source; changes identify affected chapters or review content. Governance evidence attaches to a specific baseline, supports conditions and withdrawal, and does not obtain approval from another person. Delivery verification requires an evidence reference and reviewer; it does not rewrite the captured design. Upstream changes invalidate the currency of review, traceability, actions, and handoff while preserving history.

Frozen baseline documents use private R2 storage (`FILES`); the D1 working row contains compact references. Unique snapshot keys and the existing revision check prevent a losing concurrent capture from replacing a winning one. Unavailable snapshot storage preserves the saved project and form input. Local baseline files and review fixtures remain excluded from deployment.

## Storage and privacy

Chapter 1–11 working records use D1, keyed by the Sites-authenticated user and the selected project ID. Legacy `bank-payment` links remain supported. Server-side API routes reject missing identity, cross-origin mutations, stale revisions, invalid relationships, and malformed actions. Conflicting edits preserve the form for review rather than overwrite the newer revision. JSON and Markdown exports are generated from the stored project with current findings.

Private access is enforced by the existing owner-only Sites policy. Never broaden access without explicit user approval. Chapter 4–11 architect notes and view preferences remain browser-local. New model changes and accepted ghosts are saved in the shared private project; earlier browser-only candidates remain labelled until reviewed and saved. Local preview review records are excluded from deployments.

## Development and validation

`npm install` installs the schema-generation tools. `npm run dev` runs a watching preview server; `npm start` runs the same server without watching. Local development uses Node's SQLite adapter and applies the generated schema into ignored `.aiw-local/`. Development identity is injected only by `server.js`, which is excluded from deployment. Production `worker.js` requires the authenticated Sites header and D1 binding.

- `npm run check`: JavaScript syntax.
- `npm test`: existing Chapter 4/5 state and 1,536 layout combinations at three canvas widths.
- `npm run test:requirements`: API authentication, owner isolation, durable create/edit/reopen, stable ID allocation, confirmation, validation, concurrency, handoff invalidation, milestones, proposal non-mutation, and export content.
- `npm run test:quality`: scenario references, assumptions, measurable targets, source changes, named priorities, conflict review, ghosts, handoff progress, durable saving, authentication, concurrency, and export content.
- `npm run test:decisions`: stable references, comparison evidence, acceptance/governance separation, reviewed impact application, logical/physical traceability, revision/source invalidation, conflicts, history, handoff, authenticated persistence, concurrency, and exports.
- `npm run test:logical`: stable logical records, group/connection/mapping edits, dynamic upstream references, ghost review, coverage and connectivity, source/mapping/scenario invalidation, handoff, 1024 grouped desktop/mobile layer layouts, authenticated persistence, concurrency, and exports.
- `npm run test:realisation`: stable component/allocation/interaction identities, inherited source changes, ownership conflicts, reviewed ghosts, scenario and handoff invalidation, 1024 layered layouts, Chapter 4 compatibility, authenticated persistence, concurrency, and exports.
- `npm run test:technology`: compact source tracking, stable TC/TN/TM/TD/TB identities, inherited rationale, editable ghosts, support and resilience validation, explicit failure semantics and target assumptions, source invalidation, handoff, 512 layered layouts, authenticated persistence, concurrency, and export content.
- `npm run test:technology-realisation`: stable TR/TO/RM/TI identities, inherited rationale, comparison and estimate validation, selection/approval separation and invalidation, reviewed ghosts, attainable handoff, expanded desktop/mobile model layouts, authenticated persistence, owner isolation, CAS, and exports.
- `npm run test:interfaces`: IF/DAT/DF/DX/DL/EXT/CT identities, inherited interfaces, dictionary and lineage edits, sample shape and policy checks, review/source/schema invalidation, editable ghosts, attainable Security handoff, shared desktop/mobile graph layouts, authenticated persistence, isolation, CAS, and exports.
- `npm run test:runtime`: stable environment/zone/plan/placement/path/evidence/simulation identities, scoped editing, reviewed proposals, capacity and domain failure, state protection and dependency propagation, explicit quality assumptions, evidence/source invalidation, final-review handoff, desktop/mobile graph bounds, owner isolation, persistence, CAS, and exports.
- `npm run test:security`: stable THR/SEC/EV/RR/SG/SS identities, inherited protection scope, editing and evidence/governance separation, source and withdrawn-evidence invalidation, ghosts, design walkthroughs, attainable runtime handoff, shared desktop/mobile graph bounds, authenticated persistence, owner isolation, CAS, and exports.
- `npm run test:review`: explicit finding treatments, owned actions, traceability, architect/governance/verification boundaries, immutable baselines, source and outcome invalidation, attainable conditional handoff, safe SDD exports, private object storage, bounded working-row size, owner isolation, concurrent capture protection, failure preservation, reopening, and missing-coverage context.
- `npm run test:workspace`: real save-status transitions, stale-revision recovery, and preservation of the last successful document after failed or malformed responses.
- `npm run db:generate`: generate an append-only Drizzle migration after a schema change.
- `npm run build`: emit the Cloudflare-compatible Worker, assets, hosting metadata, and migrations into `dist/`.

The Chapter 1 desktop and 390px mobile-frame walkthrough used the managed Sites preview and browser. It covered brief review, requirement and scope creation, editing, relationship creation, persistence on reopening, map perspectives/focus, ghost editing and application, Sol/Mind context, validation, and the Chapter 2 handoff. API tests verify both downloadable export formats and their attachment headers. The retained `browser-validate.mjs` is the earlier standalone Chapter 4/5 browser test; use the managed browser workflow in environments that require it.

A second Chapter 1 quality review compared the working surfaces with Chapter 4. Desktop and mobile checks covered the guided walkthrough, cross-perspective search, linked selection, contextual Sol/Mind actions, editable ghost comparison and application, stable IDs after reopening, finding-to-relationship repair, and mobile unsaved-change protection. Domain regressions cover unique missing-category repair targets, broken-link repair targets, priority of concrete guidance over confirmation reminders, and avoiding repeated context suggestions. Browser checks use local review records; these records are never included in the deployment.

Chapter 2 validation includes desktop creation, three-step editing, an applied and edited ghost, persistence after reopening, map layers and link tracing, source selection, comparison and priority ordering, and conflict review. Mobile checks use the same live records in the 390px frame. Local validation records are excluded from deployment.

Chapter 3 validation used the managed desktop preview and a live 390px mobile frame. It covered creation of a linked question and a stable alternative, comparison switching, map layers and impact tracing, edited Mind Factory ghosts, rationale editing, recording, architect acceptance, explicitly reviewed impact application, and revision history. Mobile checks exercised unsaved-change protection, revision and reopening, selected-driver context and Sol actions, finding-to-impact editing, export, and handoff. Logical responsibilities and physical implementations exposed the same accepted ADR; revising it removed its active model relationships while retaining the historical reference. API tests verify export content and attachment headers. All browser review records stay local and are excluded from the deployment.

The development-only `/?preview=mobile&chapter=4` wrapper supports Chapters 1–11 and renders the live chapter in a 390px frame for responsive QA. It is not emitted in the hosted Worker.

Chapter 4 validation used the managed desktop preview and a live 390px mobile frame. It covered responsibility creation, revision and grouping; connection creation; a new physical candidate and stable implementation mapping; mobile unsaved-change protection and mapping review; edited ghost preview, explicit acceptance, and dismissal; all eight layer toggles; grouping, fit, zoom, focus, and a wider canvas. The three simulated outcomes were traced and recorded, including play/pause, step/restart, the risk-hold stop, and the pending settlement boundary. Checks also covered finding-to-repair navigation, Sol/Mind/Cursor context, durable reopening, desktop/mobile exports, and the Chapter 5 handoff with acknowledged findings. The realised component exposed its logical reference and Chapter 1–3 rationale. The Chapter 2 and 3 editors both included new logical responsibilities. Chapter 5 now tracks eight application modelling and review milestones.

Chapter 5 validation used the managed desktop preview and live 390px mobile frame. It covered guided component creation, mobile revision and unsaved-change protection, stable APP/MAP references after reopening, explicit interaction creation and revision, edited ghost preview and acceptance, source traceability, data ownership, all eight layers, and fit. The three simulated payment outcomes were stepped and recorded, including play/pause, restart, the risk-hold stop, and the pending-settlement boundary. Desktop and mobile checks covered contextual assistance, validation, exports, and the saved Chapter 6 intake. Earlier chapter API/domain regressions also passed. All browser review records remain local and are excluded from deployment.

Chapter 6 validation used the managed desktop preview and a live 390px mobile frame. Checks covered inherited needs, guided capability creation, mobile revision with keep/discard protection, stable references on reopening, trust-boundary creation, explicit dependencies, compact support mapping groups, edited ghost previews, explicit acceptance and dismissal, live perspectives, and source links in the bottom panel. Whole-capability and domain-loss scenarios exposed affected applications, hypothetical unmet/met targets, play/pause/step/restart, and an automatic pause at quality review. Unapplied assumptions survived tab navigation; a stale mobile save preserved the review and succeeded after loading the latest project. Both desktop exports and mobile Markdown export worked, and the Chapter 7 handoff retained open findings. No horizontal page overflow was present in the mobile simulation. Domain/API tests and earlier chapter regressions passed. Local review data is excluded from deployment.

### Historical chapter release checks

The Chapter 7–10 connection limitations below describe their original releases. The subsequent desktop/mobile walkthrough is recorded in [UX-REFINEMENT-REPORT.md](UX-REFINEMENT-REPORT.md).

Chapter 7 automated validation covers stable technology references, comparisons, estimate assumptions, plan and interface revision, selection and approval currency, editable proposals, complete working handoff, source preservation, authenticated saving and reopening, owner isolation, stale-edit rejection, exports, and the expanded shared graph at desktop/mobile layouts. Studio surface generation and earlier chapter regressions also pass. The managed browser connection timed out during this release, so a fresh desktop/mobile visual and interaction walkthrough remains outstanding; these automated checks do not substitute for that review.

Chapter 8 domain/API validation and all earlier chapter regressions pass. Surface generation covers contract, data, participant, and technology context; graph layout checks cover the four chapter perspectives and all layers on desktop/mobile layouts. The managed preview browser continued to time out during connection, so the fresh desktop/mobile visual and interaction walkthrough remains outstanding. Automated rendering/layout checks do not substitute for that browser review.

Chapter 9 domain/API validation and all earlier chapter regressions pass. Surface generation and local action dispatch cover the four tabs, threat/control/inherited-object context, editor and review dialogs, separate Sol/Mind menus, staged scenario highlighting, editable ghost preview, and model perspectives. The managed browser connection continued to time out, so the fresh desktop/mobile visual and interaction walkthrough remains outstanding. Generated-surface and graph-bound checks do not substitute for browser review.

Chapter 10 domain/API validation and all earlier chapter regressions pass. Local generated-surface/action checks cover all four tabs, environment and runtime selection, editors, separate Sol/Mind menus, ghosts, perspectives, scenario controls, and final-review intake. The managed browser connection continued to time out, so fresh desktop/mobile visual and interaction review remains outstanding. Automated checks are not a substitute for that browser walkthrough.

Chapter 11 validation used the managed desktop preview and a live 390px mobile frame. Checks covered document framing with keep/discard protection, linked finding-to-action creation with preserved parent form fields, an edited and accepted Mind Factory ghost, five-stage traceability and recording, mobile play/pause/step/restart, frozen working SDD capture, desktop and mobile reopening, revision indicators, and the printable SDD preview. An uncovered requirement initially showed generic empty-state text and a mismatched fallback description; both were corrected and rechecked. API tests verify complete Markdown/JSON/HTML content and attachment/inline headers. The managed browser download monitor did not report file completion after download clicks, so a completed browser download remains unconfirmed. Earlier Chapters 7–10 browser-review limitations remain as recorded above.


## Shared interaction refinement — 14 September 2026

The Model surfaces now give the connected canvas the full workspace width and place the selected context beneath it. A compact selection bar updates in place; Open details is the explicit route into the inspector. Layer controls sit beside the Chapters 4–11 canvas, with one set of assistance controls above each surface. Sol acts, Mind Factory explores, and Cursor explains; the cursor preference survives chapter changes.

Simulation transport controls keep their DOM identity and keyboard focus as results change. Reviewable ghosts and newly opened simulation controls scroll into view, while ordinary object selection stays on the model. Mobile navigation closes after chapter selection, model toolbars wrap, group boundaries fit the available canvas, and saving/failure status remains visible. Milestone counts use each chapter's actual readiness definition.

The refinement walkthrough covered Work, Model, Validate, and Output in all 11 chapters on desktop and in the live 390px mobile frame. It included targeted creation, revision, protected cancellation, reopening, technology comparisons, an edited and accepted data ghost, and interface/security/runtime walkthroughs. Frozen SDD currency changed after upstream edits without altering the captured document. See [UX-REFINEMENT-REPORT.md](UX-REFINEMENT-REPORT.md) for the exact coverage and remaining browser-download verification limit.

## Chapters 1–3 focused workspace review — 14 September 2026

The subsequent review replaces the long document layout in Requirements, Quality Drivers, and Decisions with a workspace bounded by the available screen height. Chapter location, Work/Model/Validate/Output, the next action, progress, and selected context stay visible. The chapter rail scrolls independently; its full milestone checklist now opens from the progress indicator. Registers and findings use five rows per page on desktop and three on mobile. Selected context opens in a closable bottom panel with Overview, Definition, Connections, and Guidance sections as applicable.

Quality work separates Inputs, Scenarios, Priority, Compare, and Conflicts. The comparison shows Scenario, Measurement, or Rationale & traceability at a time, with both drivers readable side by side on mobile. Decision work separates alternatives from quality evidence, compares one linked criterion at a time, and keeps assumptions, governance, revisions, and conflicts in explicit disclosures. Model controls collapse on mobile; decision preview actions open separately so the canvas remains available. Output puts export and handoff actions ahead of an expandable register. The existing project, stable IDs, commands, storage, and access policy are unchanged.

The live review opened all 12 chapter/tab combinations on desktop and in the 390px mobile frame, with targeted checks for paging, search reset, selected context, comparison switching, model layers and alternative previews, protected editor cancellation, navigation, readiness, and contextual Sol actions. Existing Requirements, Quality, Decisions, and shared model regressions passed. See [FOUNDATION-UX-REVIEW.md](FOUNDATION-UX-REVIEW.md) for scope and limits; the earlier report records the preceding release.
