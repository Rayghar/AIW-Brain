# AIW product viability audit

**Date:** 25 September 2026 · **Scope:** AIW V5 at v19 (commit after `2790e38`) · **Author:** Claude, working with Neme on the V5 series.

**Read this with one caveat.** I wrote much of the code under review (v15–v19). This is a self-audit, checked against the codebase and its tests rather than against users, because there has been no user research and no live-model run to draw on. Where I state a number, it comes from the repository. Where I state a judgement, I say so.

---

## 1. The verdict in five lines

1. **The idea is strong and distinctive.** An architecture workbench where deterministic instruments read the design, a governed knowledge base remembers, and an LLM reasons with receipts and is checked twice, is not what the EA suites, the diagramming tools or the general assistants offer.
2. **The core engine is real.** The review desk, the chapter models, the Brain loop and the stewards' queue work end to end and are covered by 94 test files.
3. **The core claim is unproven.** Sol's judgement has never been run against a live model. Everything Sol has said in this workspace came from a test double. Until that changes, "architecture intelligence" is an architecture, not a result.
4. **The surface is over-built for a product nobody has used yet.** Eleven chapters, four tabs each, three companions, five ways to look at the same model, 106 commands, 89 npm scripts, 39 design documents. The "how many Sols" question was a symptom.
5. **Viable if narrowed and proven; not viable as-is as a general workbench.** As *a review desk with a grounded architect's assistant that produces a defensible design record*, sold to architecture functions in regulated industries, this can win. As *a full-lifecycle EA workbench* competing on breadth, it will lose to incumbents on integration and to LLM chat on convenience.

---

## 2. What AIW is, as built

- **A private, single-project-at-a-time architecture workbench.** Eleven chapters walk a design from requirements to an operating architecture and a living SDD. Each chapter has Work (forms), Model (an interactive architecture model), Validate (readiness and the review desk) and Output.
- **Instruments.** Deterministic readings of the recorded design: eight vital signs per running part, capacity arithmetic against an objective, specifications per part, anti-patterns, product weighings, decision trade-offs, What if on quality targets. They never decide.
- **Knowledge.** The SA Playbook structured as 12 attributes, 56 tactics, 5 styles and 14 patterns; an AKR catalogue release of 328 records (240 patterns, 30 anti-patterns, 24 topology templates, 20 archetypes, 14 styles); 24 documented product mechanisms across 13 products; project-governed claims with receipts, releases, withdrawals and, since v18, stewardship.
- **Sol, the LLM.** Reads a packet the architect sees first, answers a strict contract, is checked by a deterministic guard and a second model pass, and can only change the design through the chapter's own change review. Outcomes are recorded; disagreements teach the project.
- **Scale of the code.** 26,542 lines of application JavaScript in 200 files (plus a 23,072-line vendored docx library), 1,279 lines of server code, 4,522 lines of CSS, 9,012 lines of tests, 82,013 words of design documents. No runtime dependencies. Deployable locally with SQLite or hosted with D1/R2. Authentication is delegated to a gateway header.
- **Reference material.** One fully worked reference project (a bank payment journey), two lighter ones (citizen service requests, warehouse fulfilment), and a SEABaaS workbook used by four evaluation scripts that this workspace does not have.

---

## 3. What is strong

**a. The thesis is coherent and different.** Most tools either draw architecture (Structurizr, IcePanel, draw.io), catalogue it (LeanIX, Orbus, Ardoq), or talk about it (a chat assistant with your documents). AIW's loop of *instruments measure → knowledge recalls with receipts → LLM reasons under a contract → architect decides through a change review → outcomes recorded → stewards learn* is a stronger story for anyone who has to defend a design to a review board. The authority boundaries are unusually well drawn: Sol never writes to the design, numbers must come from the packet, guarantees are refused, business targets stay human.

**b. The review desk is the best feature in the product.** Vitals on every running part, capacity arithmetic ("100,000 users → 3,125 req/s → 24 replicas → 940 connections against PostgreSQL's 100"), drafted fixes the architect can preview and apply, product switch points ("one queue holds to about 224,000 users"). It gives an answer to "where do I start" in a way a diagram never does, and it does so without an LLM. It is the wedge.

**c. Governance is ahead of the market.** Receipts on every source, withdrawal that reaches every place a source was used, dismissed advice becoming reviewed knowledge, no-store provider calls, the packet shown before sending, disclosure policy on excluded objects. Banks will ask for exactly these things and most LLM products cannot answer.

**d. The engineering discipline is real.** Pure model modules separated from views; every change through a reviewed command; 94 test files including 15 rendered suites against a loopback provider double; a build that verifies packaged imports; design documents that say what is verified and what is not.

**e. The chapter models are good at reading.** Selecting any record in Chapters 2–10 gives the record, its checks, the desk's vitals for the parts it touches, and what the chapter knows besides. That reading is now the same thing Sol reads, which is the right architecture.

---

## 4. What is weak, ranked by how much it threatens viability

### 4.1 The core is unproven (severe)

- No live provider call has been made in this workspace. Every Sol assessment in every screenshot says `mock-sol`.
- The test double answers the contract perfectly and approves itself in the source check. It proves plumbing and guards, not judgement. It cannot tell us whether a real model cites correctly, stays inside the knobs, produces refinements an architect would accept, or gets withheld so often that the feature is dead on arrival.
- There is no evaluation harness: no held-out decisions with expected advice, no measure of citation accuracy, false support, withheld rate, or use/dismiss rate.
- **Consequence:** the product's headline claim rests on design intent. This is the single largest risk and the cheapest to retire: a key, three designs, two weeks.

### 4.2 Breadth outran proof (severe)

- Eleven chapters × four tabs × three companions, five distinct ways to see the same model (chapter models, Validate's anatomy, the "All perspectives" explorer, Chapter 1's own map, the review desk), 106 command types, 21 API route families, 89 npm scripts.
- Feature velocity has been high (five releases in three days in this series alone, on top of a "release 50" history) with no user in the loop. Each release added surface; none removed any until v19.
- The vocabulary a new architect must learn is long: chapters, Work/Model/Validate/Output, Sol, Mind Factory, Cursor, the desk, vitals, drafted fixes, switch points, anatomy, explorer, workbench, alternatives, stewards, receipts, releases, pins, withdrawals, journeys, walks, lenses, dissection.
- **Consequence:** a long time-to-first-value and a product that is hard to demo in fifteen minutes. The "how many Sols" moment is what happens when breadth is added faster than it is reconciled.

### 4.3 The empty-project problem (severe for adoption)

- Everything valuable depends on a richly recorded model: drivers with targets, plans with placements, contracts with timeouts, threats with targets. The reference project took a lot of authoring to reach the state where the desk sings.
- A new project starts blank, and the front door is eleven chapters of forms. There is no importer. `MODELLING-DIRECTION.md` lists Orbus, ArchiMate and Structurizr adapters as intended; none exist. There is no "paste your SDD / upload your diagrams and let Sol draft the model for review" path, which is the one an LLM makes newly possible.
- **Consequence:** the first week with AIW is data entry, and the value appears only after it. Pilots will stall here.

### 4.4 The knowledge base is thin relative to the story (moderate)

- 24 product mechanisms across 13 products is a pilot set, not a repository. The playbook is one organisation's playbook. The AKR catalogue is descriptive and explicitly "not eligible to establish constraints".
- The stewards' loop (v18) is the right maintenance mechanism, but it starts almost empty.
- **Consequence:** Sol's packets will often carry only the reading and the drivers. The "knowledge repository" positioning needs 100+ mechanisms, several playbooks, and a real intake path before it holds.

### 4.5 Two generations of code and UX coexist (moderate)

- The pre-Brain overlay (explain / propose / challenge via `/generate`) and the Brain loop (`/reason`) are both called Sol. v19 gives them one name and one status, but they are still two services with two contracts and two composers.
- Two code styles: readable modules with tests (the model layer) and dense single-line legacy files (`logical-ui.js`, `operations-ui.js`, `technology-realisation-ui.js` average 600–700 characters per line). The legacy files are where the Work tabs live.
- Test debt: four scripts need a workbook the repository does not contain; three happy-dom UI checks (`architecture-ui`, `brain-governance-ui`, `intelligence-ui`) have failed since the baseline and are outside the npm scripts, so nobody notices; two rendered suites needed hardening this week against timing.
- **Consequence:** change is slower and riskier than the test count suggests, and any newcomer will struggle with the Work-tab code.

### 4.6 Enterprise readiness gaps (moderate, but decisive for the target buyer)

- Authentication trusts a request header set by a fronting gateway; there is no first-party identity, SSO or roles beyond owner/editor/reviewer/viewer.
- Single project at a time, single organisation model; team features (assigned reviews, discussions) exist but are unexercised at scale.
- Provider lock: OpenAI Responses API by default; an OpenAI-compatible gateway is supported, but banks will ask for Azure OpenAI, Bedrock or on-premises models, and for a data-processing statement.
- No telemetry, no audit export of Sol usage beyond the operations log.

### 4.7 Positioning is not yet a sentence (moderate)

- `PRODUCT-VISION.md` describes a whole-lifecycle workbench. The market has three crowded neighbours: EA repositories (integration, portfolio, cost), diagramming (speed, developer adoption) and LLM chat (convenience). AIW cannot out-integrate the first, out-draw the second or out-convenience the third.
- The thing AIW does that none of them do — read a recorded design like a patient, draft the fix, have an assistant reason about it with receipts, and keep the record — is not the headline of the vision document.

---

## 5. Who would pay, and for what

- **User:** solution and enterprise architects who must take a design through review: architecture review boards, design authorities, regulated change (banking, payments, insurance, public sector). The reference project is a bank payment journey for a reason.
- **Buyer:** head of architecture / design authority chair. **Their problem:** reviews are slow, inconsistent, and rest on documents nobody can check; LLM assistants are banned or untrusted because they invent.
- **What they would pay for:** (1) a review desk that finds the single points of failure, the missing timeouts and the capacity shortfalls before the board does; (2) an assistant that advises with citations and cannot change the design; (3) a design record (SDD) with rationale, evidence, decisions and the assistant's advice, all with receipts. (4) Over time, a knowledge base the organisation owns and maintains.
- **What they would not pay for:** a replacement for their EA repository or their diagramming tool, or eleven chapters of re-keying.

---

## 6. Recommendations

Ordered by the ratio of risk retired to effort.

### R1. Prove the core against a live model (2 weeks)

- Run the existing Brain suites against a real provider with a key held server-side. Build the held-out set the Brain document already describes: 30–50 decisions across the reference, SEABaaS and one more domain, each with the advice a senior architect would accept and the numbers that must not appear.
- Measure and publish: citation accuracy, false support (assessments that pass both checks but are wrong), withheld rate, and, with three architects, use/dismiss rate.
- Decide from the numbers whether the two-pass check is enough, whether the packet needs more or less, and whether the mock's optimism misled the UX.

### R2. Rewrite the positioning around the wedge (1 day)

- Lead with the review desk and Sol: *"Read your architecture like a patient. Draft the fixes. Get advice you can check."* The eleven chapters become how the record is kept, not the pitch.
- Rename nothing else until R1 is in.

### R3. Build the import front door (4–6 weeks)

- Make the first hour valuable without forms. Three intakes: (a) an existing SDD or design document, from which Sol drafts drivers, components, contracts, threats and plans as *proposals through the existing change review*; (b) a spreadsheet/CSV mapping (the Orbus-style import the direction document already specifies); (c) a Structurizr DSL or ArchiMate exchange file for the structure.
- This is the one place the LLM should be allowed to draft at volume, because every proposal still passes the architect's review and lands as ordinary records.

### R4. Cut the surface by a third (3–4 weeks, in parallel)

- Keep: chapter models, the desk, Sol (one), Mind Factory, Cursor, Validate readiness, the SDD, the stewards' queue.
- Merge: the "All perspectives" explorer and Validate's anatomy into one connected view; the Work tab forms into the chapter models' editors where a model exists (the model is already the better editor).
- Park behind a flag: repository packet signing (Ed25519 signed sync), composition knowledge, architecture case guidance, the co-authoring "Writing with Sol" mode, the second and third reference projects. They are good work that is premature for a product with no users.
- Write the fifteen-minute demo path and make the first-run experience follow it.

### R5. Five design partners, one metric (start now, run 8 weeks)

- Two banks or payment providers, one insurer, one public-sector body, one consultancy. Their own design, imported (R3) or authored with help.
- Measure time-to-first-finding on the desk, findings they act on, Sol use/dismiss rate, and whether the SDD replaced a document they previously wrote by hand. Ask one question at the end: would you fight to keep it.

### R6. Enterprise basics before any pilot signs (2–3 weeks)

- First-party sign-in or SSO (OIDC), roles enforced server-side, an audit export of every Sol request with its packet stamp and outcome, a provider abstraction that admits Azure OpenAI and a private endpoint, and a one-page data-processing statement (no-store calls, what leaves the tenant, disclosure policy).

### R7. Make the regression gate honest (1 week)

- Remove or fixture the four workbook-dependent scripts, fix or delete the three broken happy-dom checks, add the rendered suites to a CI job with the loopback provider, and split the densest legacy files where they are touched. Move the vendored docx library to a dependency.

### R8. Grow the knowledge base deliberately (ongoing)

- Target 100 product mechanisms across the 25 products architects in the target segment actually run, each with its documentation page. Add a second playbook (an organisation's own) through the existing source → claim → release path to prove the multi-playbook story. Make the stewards' queue part of the weekly rhythm of a design authority.

---

## 7. A 90-day plan

| Weeks | Do | Exit criterion |
|---|---|---|
| 1–2 | R1 live evaluation; R2 positioning; R7 gate | Published numbers for citation accuracy, false support, withheld rate on 30+ decisions; green CI |
| 3–6 | R3 import front door; R4 surface cut; R6 enterprise basics | A new project reaches a populated desk from an uploaded SDD in under an hour; sign-in; demo path in 15 minutes |
| 5–12 | R5 five design partners on their own designs; R8 knowledge growth | Three of five partners produce an SDD they would submit to their board; use rate above dismiss rate; a written "would fight to keep it" from at least two |

**Go / no-go at week 6:** if R1 shows false support above a few percent that the checks cannot bring down, or partners cannot get their own design in, stop adding features and fix that first. If both hold, the product is viable in its narrow form and the case for investment is made on evidence rather than intent.

---

## 8. Things I would stop saying until they are true

- "Architecture intelligence" — until R1 is published.
- "Knowledge repository" — until there are 100+ governed mechanisms and a second playbook.
- "Every chapter" as a selling point — the customer buys outcomes on the desk and in the SDD, not chapter count.
- "Powered by an LLM" — the pitch is *checked by instruments, advised by Sol, decided by you*; the LLM is the least differentiated part.

---

## 9. Evidence used

- Repository metrics (this workspace, v19): file and line counts, command and route inventories, test scripts and their results, knowledge pack sizes (`product-knowledge.js`, `playbook-knowledge.js`, `brain-catalogue.js`), reference projects.
- Design documents: `PRODUCT-VISION.md`, `MODELLING-DIRECTION.md`, `AIW-BRAIN-ARCHITECTURE.md`, `DESIGN-CHAPTER-MODELS.md`, `SECOND-BRAIN-STATUS.md`.
- Test runs this week: 19 model suites, 16 rendered suites against the provider double, 44 of 48 regression scripts (four need the SEABaaS workbook), three happy-dom UI checks failing since the baseline.
- No user interviews, no usage data, no live provider calls. Those are the gaps this audit asks to close first.
