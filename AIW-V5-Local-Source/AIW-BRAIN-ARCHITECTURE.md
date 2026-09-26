# The AIW Brain: how the knowledge repository and the LLM are involved in every decision

**Status:** v20 · 26 September 2026. This describes what is implemented and tested. It also marks what is still ahead.

## The idea

AIW is an architecture *intelligence* workbench. The architecture experience comes from one loop. The workbench's instruments read the design. The Brain recalls what is known about what they read. Sol, the LLM, reasons over both and advises. The architect decides. Each part does what it is good at.

- **Instruments** measure. Examples: the chapter models and their checks, the review desk's vitals, the arithmetic behind a performance specification, the weighing of product options against the drivers, the drafted fixes and the simulation of what each would change. They are deterministic and repeatable, and they never decide.
- **The knowledge repository** remembers. It holds:
  - the SA Playbook, as exact passages and as structured tactics, styles and patterns;
  - the Architecture Knowledge Repository (AKR) catalogue;
  - the documented mechanisms of products;
  - the project's governed claims, organisation guidance and project sources;
  - the acquired repository corpus: 18,961 documentation files from 47 GitHub repositories at pinned commits, searchable as 45,517 verified passages ([KNOWLEDGE-REPOSITORY.md](KNOWLEDGE-REPOSITORY.md)). Repository text is discovery material until it is retrieved, interpreted, reviewed, released and activated.

  Each item carries a receipt. Each can be withdrawn, and a withdrawal reaches every place that used it.
- **Sol** reasons. It reads the instruments' output and the governed knowledge relevant to it. It judges the decision in front of the architect: apply, refine, reconsider, or a judgement to put to the architect. It explains why and cites what it rests on. It refines drafted wording and proposes numbers within bounds, and it proposes the scenarios the instruments cannot, such as threats nobody has recorded.
- **The architect** decides. That happens through each chapter's own change review. Every changed field is shown, and nothing is applied without confirmation.

## The loop at a decision

| Step | What happens | Where it lives |
|---|---|---|
| **Sense** | The instruments read the design. On the desk: vital state, value and target, the arithmetic, the drafted fix, the cells it would change, and the knobs with their bounds. In a chapter model: the model's description of the selected record, its fields and what is not recorded, the journey's checks on it, the desk's vitals for the parts it touches, and the chapter's own extras (a What if's reach, a realisation's weighing, a threat's coverage). | `desk-vitals.js`, `desk-capacity.js`, `desk-fixes.js`, `product-choice.js`, `desk-model.js`, `chapter-reasoning.js` |
| **Recall** | The Brain assembles a packet. It holds one reading per decision, then what the project has learned about those records (claims its stewards linked to them), then the objective and its planning assumptions (where capacity is read), the documented mechanisms of the products involved, the quality drivers the parts answer to, the SA Playbook's tactics for the vitals and drivers, and the project's governed claims and methods. A chapter reading is fitted to its share of the packet, dropping the least telling parts first. Every source carries a receipt, and withdrawn packs and releases are left out. The packet is capped at 22 sources and 28,000 characters. | `brain-reasoning.js` (`reasoningPacket`), `chapter-reasoning.js` (`fitReading`), `architecture-brain.js`, `model-knowledge.js` |
| **Show** | The architect sees what Sol will read before anything is sent: every excerpt, whole, with its receipt. An optional question focuses Sol. Beside it, marked *not sent to Sol*, are leads: knowledge repository passages that mention what the decisions touch. A lead opens in Mind Factory → Sources, where it can be retrieved and taken through the governed path. | `brain-reasoning-ui.js` (`pendingHTML`, `leadQuery`), `/api/intelligence/reasoning-context`, `/api/knowledge/corpus` |
| **Reason** | Sol answers a strict JSON contract for each decision. The answer has a verdict, a headline, reasoning, refinements on the draft's own knobs, proposed threats on the listed targets, a preferred alternative for a decision, risks, questions and citations. One request covers up to eight decisions. | `intelligence-provider.js` (`requestReasoning`), `/api/intelligence/reason` |
| **Check** | Every assessment is checked twice. The deterministic check covers structure, citations, verdicts that fit the decision, refinements within bounds, numbers the packet does not contain, and guarantees of verified outcomes, including in refined wording. A second model pass then checks it against the same packet. A chapter record's refinements must also pass the chapter's own rules. An assessment that fails any check is withheld, and the reading stands. | `validateReasoningOutput`, `guardReasoning`, `settleReasoning`, `checkRecordRefinements` |
| **Refine** | On the desk, "Use Sol's refinements" puts Sol's numbers and wording into the draft. In a chapter, Sol's refinements become the chapter's own change command. Either way, the instruments read the design again with them before the architect reviews anything. A number is only as good as the arithmetic that checks it. | `desk-view.js` (`solUse`), `chapter-reasoning.js` (`chapterCommands`, `chapterReread`) |
| **Decide** | The draft or the refined record goes through the chapter's change review: apply, or keep as a design alternative. Only the refined fields change, and the record's links are kept. Sol's proposed threats go through Chapter 9's review. | `workbench-ui.js` (`reviewDesignChanges`), `chapter-sol.js` |
| **Record** | The outcome is kept with the model, the chapter, the packet stamp and the sources the advice rested on: used or agreed, applied, or dismissed with the architect's reason. The advice shows what was done with it. Advice whose reading has since changed is shown as history, not advice. The SDD's *Architecture reasoning record* carries the vitals at review, the product choices and switch points, every piece of advice with what was done with it and whether the knowledge it rested on was later withdrawn, and what the stewards learned. | `adoptReasoning`, `intelligence.adopt` (kind `assessment`), `p.coauthoring.assessments`, `reasoning-record.js` |
| **Learn** | Every disagreement with Sol, and every change made on advice whose knowledge is later withdrawn, goes to the knowledge stewards' queue. Sol advises the stewards too. They capture a disagreement as project knowledge, which then takes the governed path: an original source and a candidate claim, review, release, activation, and a link to the record it concerns. Or they record that the knowledge and design stand, ask for a revisit, or withdraw what the advice rested on. Once linked, the claim is what Sol reads about that record from then on. | `knowledge-stewardship.js`, `stewardship-ui.js`, `knowledge.capture`, `knowledge.steward`, `knowledgeImpact` |

## One Sol

Sol is one persona, and each surface has one Sol control. Until v18 this was not so: a chapter model could show four different "Ask Sol" controls, backed by two services with different answer shapes, answering in two panels at once. v19 puts it right.

| Where you are | Sol's one control | What it opens |
|---|---|---|
| A chapter model, Chapters 2–10 | **Sol · the attending architect**, in the companion beside the model: *Ask Sol to assess it* | The assessment, in the companion. Its footer, *More with Sol*, opens Sol's panel. |
| The review desk | The Sol chip; *Ask Sol* on a decision, a step or the rounds | The assessment, on the desk. |
| The stewards' queue | *Ask Sol what the project should learn* | The assessment, on the item. |
| Any Work tab, Validate | *Ask Sol* in the assistance bar | Sol's panel, which here **is** the assessment: the same section, the same state. |
| Sol's panel (tab **Sol**, beside Mind Factory) | — | Beside an open chapter model, the status of the companion's assessment (verdict, or *not assessed yet*), never a second answer, with *Read it beside the model*. Then what else Sol does: *Ask Sol in your own words* (explain, propose a design, challenge sources), guided design, writing, the chapter's tools and saved responses. |

The companion and the panel share one state and tell each other when it changes (`aiw:sol-changed`). Mind Factory stays what it was: knowledge, patterns, alternatives and the stewards' queue. Cursor stays the hover explanation.

## Where Sol is involved today

- **Review desk (Chapter 11 Model, and Validate on every chapter).** Sol is involved in every kind of decision on the desk:
  - every drafted fix: replicas, standbys, recovery objectives, nested timeouts, queue bounds, idempotency keys, controls and monitoring;
  - every judgement the instruments will not make: threats, recovery points, sites and drills;
  - every product choice at a switch point, where Sol's recall anchors on the Chapter 7 realisation, and *Compare in Mind Factory* opens the options side by side with each product's documented mechanisms and the project's reviewed claims about it;
  - every Chapter 3 decision opened on the desk.

  You can ask Sol about one decision, a whole step of *Where to start*, or *Sol's rounds* (the first decision of each step). Verdicts appear on the cells and in the step summaries.
- **Every chapter model, Chapters 2 to 10.** Select a record in a chapter model's canvas and its companion carries Sol:
  - Chapter 2: a quality driver, or the move you are exploring in *What if*. Sol weighs the move without proposing a target.
  - Chapter 3: a decision or an alternative, as the desk reads it. Sol may lean to an alternative.
  - Chapter 4: a responsibility.
  - Chapter 5: a component.
  - Chapter 6: a platform capability.
  - Chapter 7: a realisation or one of its options. Sol may lean to an option.
  - Chapter 8: a contract or a data definition.
  - Chapter 9: a threat or a control. For a component, contract, data definition or realisation, Sol is asked what could go wrong and proposes threats on the listed targets.
  - Chapter 10: a runtime plan.

  With nothing selected, *Sol's round* asks about the chapter's records with the most open checks. Verdicts are marked on the canvas. A record's refinements arrive already read again by the instruments, and are applied through the chapter's change review.
- **The knowledge stewards' queue (Mind Factory → Architecture in context → Stewards).** Each disagreement with Sol, with the architect's words and what the advice rested on, and each change made on knowledge since withdrawn. Sol advises on each queue item: what the disagreement should teach, worded as a project claim with where it applies and its limits, or whether the change still holds. The queue then leads the claim through review, release, activation and the link, one step at a time.
- **The Sol and Mind Factory companions (Chapters 1–10).** They are unchanged from earlier releases:
  - grounded explanations, guided design proposals, source challenges and Mind Factory comparison drafting;
  - the same governed claims, playbook methods and catalogue records, through `/api/intelligence/generate`.
- **Knowledge governance.** Withdrawing the product mechanisms (`AIW-PRODUCT-MECHANISMS-1`) or the SA Playbook (`SA-PLAYBOOK`, which covers `AIW-PLAYBOOK-2` and `AIW-PLAYBOOK-3`) stops their use everywhere:
  - product suggestions and single-unit limits stop in the models;
  - the desk stops offering the playbook's tactics;
  - Sol's packets leave them out.

## Authority boundaries

- Sol's advice never changes the design. Refinements become draft values or a chapter's change command. They and proposed threats reach the design only through a chapter's change review, which changes only the refined fields.
- Numbers come from instruments. Sol may propose a number only inside a knob's bounds, and the instruments re-check it. A number Sol states that is not in the packet withholds that assessment.
- A failed check costs only what failed it:
  - an assessment that invents a number, claims a guaranteed or verified outcome in its own words, or cites outside the packet is withheld;
  - a drafted value worded as a guarantee is set aside and never applied, while the rest of the advice stands;
  - advice text over its limit is shortened at a whole sentence and marked;
  - a decision assessed twice, or one outside the packet, is set aside;
  - only a broken response fails the request, and the architect is told which check it failed.
- Business targets stay the architect's: recovery points, service levels, quality driver targets and priorities, and sites. Sol frames the options and questions, and in *What if* it weighs the architect's move without proposing one of its own.
- Four eyes on every claim: a claim is used only after a different authenticated person from its author has verified it. This is checked at review and again on every read.
- What the project learns reaches Sol only through its governance. A captured disagreement is an original source and a candidate claim. Sol reads it only once it is reviewed, released, activated and linked to its record, and then only with that record, not wherever its words match. Withdrawn knowledge is never sent to Sol again, including when Sol weighs a change that rested on it.
- Knowledge is used at its authority level:
  - playbook passages are method, not proof;
  - catalogue entries are descriptive;
  - product mechanisms paraphrase vendor pages and are not benchmarks;
  - governed claims carry their conditions and limitations;
  - repository passages are discovery material: never sent to Sol, never citable, never support. They become knowledge only as a retrieved original that passes interpretation, independent review, a release with a current signed receipt, and activation.
- What is sent is shown first, and the project's disclosure policy (excluded objects, contact redaction) applies. The provider is called with `store: false`. Budgets, replay protection and storage are those of every Sol request.
- The endpoint is OpenAI by default. `AIW_LLM_BASE_URL` may point to an OpenAI-compatible gateway over https, or to loopback for tests.

## Verified, and not yet verified

- **Verified:**
  - 8 model checks (`npm run test:brain-reasoning`) cover the packet, the contract, settling, what size, duplicates and drafted wording may cost (only their own part), the provider path, the server routes and adoption, and knowledge governance.
  - 9 model checks (`npm run test:chapter-reasoning`) cover what can be asked about in each chapter, each chapter's reading and what identifies it, change commands that keep a record's links (44 knobs across 10 record types), the instruments' re-reading, the packet, the contract per kind, the server and adoption.
  - 8 model checks (`npm run test:stewardship`) cover the queue, Sol's stewardship advice, capture, the governed path to a link, Sol reading what was learned (and only with its record), the other decisions, a withdrawal from the queue, and the server.
  - 5 rendered checks (`npm run test:stewardship-browser`) cover the whole loop, in two browsers signed in as two people.
    - A disagreement in Chapter 8 reaches the queue.
    - Sol advises the stewards, and the capture uses Sol's wording.
    - The architect who captured the claim is refused when verifying it; a second person reviews it.
    - The claim is released, activated and linked to IF-001.
    - Asked again about IF-001, Sol reads the learned claim and does not repeat the advice.
  - 4 checks (`npm run test:brain-chain`) cover the chain from the knowledge repository to the LLM:
    - a candidate set built against the corpus and imported;
    - the author refused, and a second person verifying;
    - release, a signed receipt, activation and a link to IF-001;
    - Sol's packet for IF-001 carrying the claim, and the request to the provider sending it.

    A claim still a candidate reaches neither.
  - 10 rendered checks (`npm run test:chapter-sol-browser`), one of them the one-Sol rule: one control in the companion, the panel's status of the same assessment, and the panel as the assessment on the Work tab. The other nine run in Chapters 2, 3, 7, 8, 9 and 10 against the test double. They cover a chapter's round, a refinement applied through Chapter 10's review, a What if move, leanings in Chapters 3 and 7, a threat proposed from Chapter 9, disagreement, persistence and the unconnected state.
  - 7 rendered checks (`npm run test:brain-reasoning-browser`) run against a loopback test double of the provider (`mock-llm-provider.mjs`). They cover asking, the packet shown before sending, assessments on cells, refinements through the change review, a proposed threat recorded in Chapter 9, disagreement, stale advice and persistence.
  - The desk's rendered checks cover the unconnected state.
  - 5 model checks (`npm run test:brain-ahead`) cover the SDD's reasoning record, the product comparison (mechanisms, claims naming each product, withdrawal), its rendering from the desk's entry point, switch points anchored on the realisation, and leads worded from what Sol reads.
  - 6 model checks (`npm run test:sol-evaluation`) run every held-out case through the real reasoning path against the test double. Injected faults prove that the guards withhold invented numbers, guarantees, missing citations and out-of-bounds refinements, and that the metrics catch wrong verdicts and missing support.
  - The knowledge repository's own suites and rendered checks are listed in [KNOWLEDGE-REPOSITORY.md](KNOWLEDGE-REPOSITORY.md).
- **Not yet verified:**
  - No live provider call was made in this workspace; `npm run evaluate:sol:live` runs the held-out set against a configured provider.
  - The second check's instructions say that the design's own gaps, evidence still to be gathered and unapplied refinements are not defects in the advice. Only a live model can show whether a model follows them.
  - The quality of Sol's advice on real designs has not been evaluated. Against the test double the held-out set gives 26 cases, 28 assessments, none withheld and 93% verdict agreement. The two disagreements are the cases built to catch advice that takes an example objective at face value. That measures the harness, not Sol's judgement.
  - The expected advice is implementation-authored; an architect should review and amend it before any result is relied on.
  - The test double proves the plumbing and the guards, not the judgement.

## Delivered in v20

1. **The desk and Sol in the SDD.** The *Architecture reasoning record* section: vitals at review, product choices and switch points, Sol's advice with what was done with it and its receipts, what the stewards learned, and withdrawn knowledge with its reach (`reasoning-record.js`).
2. **Evaluation.** 26 held-out decisions across three domains (the bank payment reference, citizen service requests and warehouse fulfilment) with expected advice. They are run through the real reasoning path, and adoption rates come from exported projects (`evaluation/sol-heldout-v1.json`, `sol-evaluation.js`, `npm run evaluate:sol`).
3. **Mind Factory from the desk.** *Compare in Mind Factory* at a switch point (`product-comparison.js`).
4. **The knowledge repository connected.** Corpus search, verified passages, exact-original retrieval, signed revocations applied automatically, and leads beside Sol ([KNOWLEDGE-REPOSITORY.md](KNOWLEDGE-REPOSITORY.md)).

## Ahead

1. **A live evaluation**, with the expectations and the results reviewed by an architect.
2. **SEABaaS as a fourth domain**, once an architect has confirmed a representative scope and baseline from the private workbook.
3. **A repository claim through the whole governed path, by real people.**
   - The path is proven with synthetic accounts and a synthetic signing key (`npm run test:brain-chain`).
   - Still needed: two real reviewers, local accounts or the hosted workbench, and a production signing key.
   - The 16 claims of candidate set BK-P2 are ready to import for that review.
