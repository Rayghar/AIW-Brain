# Knowledge review pack · core-banking domain candidates (round 12, workstream K)

**Status: pending. Not approved, not released, not active.** Prepared by Sol for AIW round 12, workstream K, on
2026-10-08. No person has reviewed it. This pack is for the four-eyes knowledge approver and, where a passage comes from
a licensed text, for licence counsel; nothing in it may be released until those people have done what section 6 asks.
It sits beside the round's first candidate pack (`candidate-sets/core-banking-candidate-pack.json`, reviewed through
`audit/round12/KNOWLEDGE-REVIEW-PACK.md`), which holds the core-banking patterns, tactics and anti-patterns; this pack
holds the decision topics, the compliance tactics and regulation records, the core platform product categories, the
recovery and availability passages and the posting method that the round-12 gap register asks for (GR-DOM-03, -04,
-05, -07, -08).

| Field | Value |
| --- | --- |
| Pack | `candidate-sets/core-banking-domain-candidates.json`, pack id `CB-DOMAIN-CANDIDATES-1`, schema `aiw-domain-candidates-v1`, built by `scripts/build-domain-candidates.mjs` |
| Status | `candidate`; approval `pending`; `fourEyes: false`; `approvedBy: null`; `releaseId: null`; `productionAccepted: false` |
| Influence today | none: no score, no hard constraint, no conformance result, no draft, no Brain retrieval, no offer to a chapter, no lens reading |
| Records | 39: 7 decision topics, 5 compliance tactics, 12 regulation records, 6 core platform product categories, 7 recovery and availability passages, 2 posting method passages |
| Passages | 21 records hold their exact passage (14 AIW-authored method texts, 7 SA Playbook texts); 18 hold none and name the source they need |
| Lens | written against the core-banking lens, `public/lenses/core-banking.js`, version 1 |

## 1. What the pack holds, and what it does not

Every record has an id, a kind, `status: "candidate"`, the gap it answers, the lens concerns it serves, a title, the
passage it rests on or `passage: null` with `sourceNeeded: true`, the sources it still needs, and the claim it would
become, written in the shape the chapters read once a claim is released (`public/domain-knowledge.js`):

| Shape | Subject | Predicate | Read by |
| --- | --- | --- | --- |
| topic | `decision-topic:<id>` | offers a decision topic | Chapter 3: the topic list, the decision's guidance, Sol's Proposals panel |
| tactic | `tactic:<id>` | offers a tactic for | Chapter 2: the tactics released for the driver's category, Sol's Proposals panel |
| product | `product:<name>` | states a product fact | Sol's Proposals panel for Chapters 6 and 7, per technology category |
| regulation | `regulation:<id>` | records a regulation | Sol's Proposals panel for constraints and compliance drivers |
| method | `method:<id>` | describes a method | the Brain's retrieval and citations, like any released claim |

A passage is held only where its exact text is in this repository:

- **AIW-authored** (14 records): method text AIW wrote for this pack, the decision topics, the compliance tactics and
  the posting method. It copies no third-party text. Its locator is the pack and the record id, and it is hashed.
- **SA Playbook** (7 records): the owner's workbook text as the structured pack holds it (`public/playbook-knowledge.js`,
  `AIW-PLAYBOOK-3`), word for word, with the workbook's own hash. A list cell is held as its bullet texts, one per line;
  the cell's bullet marks and line-break tags are not held, and each record says so.

No third-party passage is held. No regulation text, no standard and no vendor document was retrieved, attached or
hashed, and no rights were checked. Every title, edition and section below is **from the drafter's reading, not
confirmed** against the text, or **not located**. The European Union records apply only in the European Union. The
project's own jurisdiction is not named here: it is a record of its own (`CBK-REG-JURISDICTION`), left open, with the
questions a person who can name it answers.

The example targets of the SA Playbook's availability guide (cell F7: "99.99% uptime", "RTO of 1 hour", "RPO of 15
minutes") are deliberately **not** prepared as citable passages: they are examples, and a draft must never use them as
values, so no released passage should carry them.

## 2. Why it informs nothing today

The doctrine: candidate and discovery knowledge never affect scoring, hard constraints or conformance; every
authoritative claim traces to an immutable source passage; nothing becomes knowledge without a four-eyes review. The
code keeps that true for this pack, and `npm run test:knowledge-retrieval` proves it:

- No runtime module reads the file: no module under `public/`, `public/lenses/`, `shared/` or the server names it or
  its pack id (section 3 of the suite).
- The import (`scripts/import-domain-candidates.mjs`) makes candidate claims only, authored by the importing person:
  one source and one claim per held passage, nothing reviewed, released or pinned. The 18 records without a held
  passage cannot be imported at all until the approver attaches one.
- Kept as candidate claims on AIW's Bank Payment reference with the lens chosen and on a banking brief, the 21
  importable records leave every score (Chapter 3's tallies, the style marks, the sensitivity), every hard constraint,
  every conformance result (the eleven chapters' checks, the requirements gate, the anti-pattern scan), the drafted
  records, the Brain's retrieval and citations, the chapter offers and the lens reading exactly as they were
  (section 9). Unreviewed claims are not eligible (`knowledgeEligibility`), and the chapters read released claims only.
- Even once released (in the suite only, by two synthetic accounts, never in the repository), they inform the reading
  (topics offered, tactics listed, passages cited) and still move no score, hard constraint or conformance result.

## 3. The records

Concerns are the lens's concern ids. "Passage" gives the origin, the locator and the first twelve characters of the
passage's SHA-256; "pack" is the pack file.

### 3.1 Decision topics (GR-DOM-03)

Each topic holds two lines: the question it frames, and the method a decision of it follows. Offered in Chapter 3 only
once released.

| Id | Title | Concerns | Passage | Sources still needed |
| --- | --- | --- | --- | --- |
| CBK-TOPIC-POSTING-INTEGRITY | Posting integrity | posting | AIW-authored · pack · 43f5cc9e0a48 | none: AIW's method; the approver may attach the patterns of the first candidate pack it follows (CB-PAT-POSTING-BALANCED) |
| CBK-TOPIC-END-OF-DAY | End of day | eod, value-dating | AIW-authored · pack · dfd4590c8985 | none: AIW's method |
| CBK-TOPIC-APPROVAL-WORKFLOW | Approval workflow | maker-checker | AIW-authored · pack · d8b122740532 | none: AIW's method |
| CBK-TOPIC-PRODUCT-PARAMETERS | Product parameters | product-config, interest | AIW-authored · pack · abe33f19e9a0 | none: AIW's method |
| CBK-TOPIC-CURRENCIES | Currencies | fx | AIW-authored · pack · a2e70a687e71 | none: AIW's method |
| CBK-TOPIC-REGULATORY-REPORTING | Regulatory reporting | reporting | AIW-authored · pack · e57baa754c8b | none: AIW's method |
| CBK-TOPIC-DATA-RESIDENCY | Data residency | privacy | AIW-authored · pack · b7e5c1b9afc4 | none: AIW's method |

### 3.2 Compliance tactics (GR-DOM-05)

Offered for Chapter 2's compliance category only once released.

| Id | Title | Concerns | Passage | Sources still needed |
| --- | --- | --- | --- | --- |
| CBK-TAC-OBLIGATIONS-REGISTER | Obligations register | reporting, audit | AIW-authored · pack · 57e6d829b987 | none |
| CBK-TAC-DATED-REGULATORY-PARAMETERS | Regulatory parameters as dated configuration | product-config, maker-checker | AIW-authored · pack · 79547db2d066 | none |
| CBK-TAC-EVIDENCE-FROM-RECORDS | Evidence from the platform's own records | audit | AIW-authored · pack · c38d48d41695 | none |
| CBK-TAC-RETURNS-RECONCILED | Returns reconciled to the ledger before submission | reporting | AIW-authored · pack · 2e2937891f2d | BCBS 239 · January 2013 · Principles 3 and 7 (to confirm the tactic follows them) |
| CBK-TAC-RETENTION-BY-RULE | Retention by rule | audit, privacy | AIW-authored · pack · e2b1507a1a72 | none: the periods come from the instruments that set them |

### 3.3 Regulation records (GR-DOM-05)

Regulator, instrument, section and the date it applies from, each from the drafter's reading, not confirmed. No
passage is held and no obligation is stated: the approver writes the claim's statement from the attached passage.

| Id | Regulator | Instrument | Section | Effective | Where it applies |
| --- | --- | --- | --- | --- | --- |
| CBK-REG-FATF-R10 | FATF (standard setter) | The FATF Recommendations | Recommendation 10, Customer due diligence | Adopted February 2012, as updated; pin the version | FATF member jurisdictions, through their own law |
| CBK-REG-FATF-R11 | FATF (standard setter) | The FATF Recommendations | Recommendation 11, Record-keeping | as above | as above |
| CBK-REG-FATF-R16 | FATF (standard setter) | The FATF Recommendations | Recommendation 16, Wire transfers | as above; this recommendation has been revised | as above |
| CBK-REG-FATF-R20 | FATF (standard setter) | The FATF Recommendations | Recommendation 20, Reporting of suspicious transactions | as above | as above |
| CBK-REG-BCBS239-P3 | Basel Committee on Banking Supervision | BCBS 239 (January 2013) | Principle 3, Accuracy and integrity | January 2016 for global systemically important banks | where the national supervisor applies it |
| CBK-REG-BCBS239-P7 | Basel Committee on Banking Supervision | BCBS 239 (January 2013) | Principle 7, Accuracy | as above | as above |
| CBK-REG-EU-GDPR-ART5 | European Union | Regulation (EU) 2016/679 | Article 5, Principles relating to processing of personal data | 25 May 2018 | EU and EEA only |
| CBK-REG-EU-GDPR-ART32 | European Union | Regulation (EU) 2016/679 | Article 32, Security of processing | 25 May 2018 | EU and EEA only |
| CBK-REG-EU-GDPR-ART44 | European Union | Regulation (EU) 2016/679 | Article 44, General principle for transfers | 25 May 2018 | EU and EEA only |
| CBK-REG-EU-RTS-2018-389 | European Union | Commission Delegated Regulation (EU) 2018/389 | Articles 4 and 5, Authentication code and Dynamic linking | 14 September 2019 | EU and EEA only |
| CBK-REG-EU-DORA-ART11-12 | European Union | Regulation (EU) 2022/2554 | Articles 11 (Response and recovery) and 12 (Backup policies and procedures, restoration and recovery procedures and methods) | 17 January 2025 | EU only |
| CBK-REG-JURISDICTION | not stated | not stated | not stated | not stated | not stated: a person who can name it must |

### 3.4 Core platform product categories (GR-DOM-04)

What each category of packaged platform holds, and the facts an evaluation of one needs (`factsNeeded`, six to ten per
category). No product is named and no fact is filled in (`facts: []`). Each fact becomes one claim of the product
shape, on the technology category `application-platform`, written from the vendor's document for the version weighed.

| Id | Title | Concerns | Sources still needed |
| --- | --- | --- | --- |
| CBK-PRD-CORE-BANKING-PLATFORM | Core banking platform | posting, eod, interest, fx, product-config, value-dating | the vendor's documentation of each product weighed, at the version weighed, one section per fact |
| CBK-PRD-PAYMENTS-HUB | Payments hub | payments | as above |
| CBK-PRD-FINANCIAL-CRIME-PLATFORM | Financial crime platform | kyc, aml | as above |
| CBK-PRD-DIGITAL-BANKING-PLATFORM | Digital banking platform | channels | as above |
| CBK-PRD-REGULATORY-REPORTING-PLATFORM | Regulatory reporting platform | reporting | as above |
| CBK-PRD-GENERAL-LEDGER-PLATFORM | General ledger and finance platform | posting, reporting | as above |

### 3.5 Recovery and availability passages (GR-DOM-07)

From the owner's SA Playbook (`SA Playbook_v2.xlsx`, SHA-256 `d3ee19a22e664b365a0e3d618bf60ebb195788b5578a425d25c8672e7c53e4a6`),
as the structured pack holds them. The playbook measures recovery under availability (MTTR, RTO, RPO), so these
passages are both. Cited only once released.

| Id | Title | Locator | Passage |
| --- | --- | --- | --- |
| CBK-PB-AVAILABILITY-DEFINITION | Availability: what it means | QR-Guidebook!C7 | bc7d0d278370 |
| CBK-PB-AVAILABILITY-IMPORTANCE | Availability: why it matters | QR-Guidebook!D7 | 3aa1d45355ea |
| CBK-PB-AVAILABILITY-METRICS | Availability and recovery: what is measured | QR-Guidebook!E7 | cc45a9cad9ff |
| CBK-PB-AVAILABILITY-DECISIONS | Availability: the design decisions | QR-Guidebook!G7 | b16313ceddfc |
| CBK-PB-AVAILABILITY-TESTING | Availability and recovery: how they are tested | QR-Guidebook!I7 | 5805563fa35b |
| CBK-PB-AVAILABILITY-RISKS | Availability: risks and how they are mitigated | QR-Guidebook!J7 | 95ea7a6b6421 |
| CBK-PB-AVAILABILITY-TRADEOFFS | Availability: what it is traded against | Quality Requirements!B13 | bc75643cfcb5 |

### 3.6 The posting method (GR-DOM-08)

Lifted from the Bank Payment reference's decisions ADR-002 and ADR-003 (`public/decisions-domain.js`), where the core
ledger stands behind an external party, and written again with the ledger inside the system under design
(`coreModel: "internal"`). Usable by any project once released, in the project or once for the organisation.

| Id | Title | Concerns | Passage | Sources still needed |
| --- | --- | --- | --- | --- |
| CBK-MTH-IDEMPOTENT-POSTING-BOUNDARY | Idempotent posting boundary | posting, payments | AIW-authored · pack · a2364399a862 | Hohpe and Woolf, Enterprise Integration Patterns, first edition 2003, chapter 10, Idempotent Receiver (from the drafter's reading, not confirmed) |
| CBK-MTH-ENQUIRE-BEFORE-RETRY | Enquire before retry | payments, posting | AIW-authored · pack · 14555dfbd0fb | a published source for the practice: not located (the first pack's CB-TAC-ENQUIRE-BEFORE-RETRY has none either) |

## 4. The passages still needed from a real source

Nothing below may be invented, paraphrased into a passage or attached from memory. Each needs the exact text from the
source itself, its version or date, and a rights check:

1. **FATF Recommendations**, Recommendations 10, 11, 16 and 20, at the version in force (R.16 has been revised).
2. **BCBS 239**, Principles 3 and 7 (records CBK-REG-BCBS239-P3 and -P7, and the tactic CBK-TAC-RETURNS-RECONCILED).
3. **Regulation (EU) 2016/679**, Articles 5, 32 and 44, for an EU or EEA project only.
4. **Commission Delegated Regulation (EU) 2018/389**, Articles 4 and 5, for an EU or EEA project only.
5. **Regulation (EU) 2022/2554**, Articles 11 and 12, for an EU project only.
6. **The project's own jurisdiction**: its central bank's or supervisor's rules, its data protection law, its AML law
   and its reporting returns, named by a person who can name them (CBK-REG-JURISDICTION).
7. **Vendor documentation** for each product a project weighs in the six product categories, at the version weighed:
   one passage per fact in `factsNeeded`.
8. **Enterprise Integration Patterns**, chapter 10, Idempotent Receiver, if the approver wants the posting boundary to
   rest on it as well as on AIW's own method; and a source for enquire-before-retry, or the method stays AIW's own.

## 5. Also for review: AIW's own words that are not knowledge

These decide what is shown, never what is true, and move no score, constraint or conformance result. No person has
reviewed them; a reviewer should.

- **The lens's vocabulary for retrieval** (`public/lenses/core-banking-terms.js`, `CORE_BANKING.vocabulary`): for each
  of the seventeen concerns, the terms that name it in a question and the qualities it asks about (posting asks about
  consistency, residency about location and providers). It applies only to a project that uses the lens.
- **The catalogue curation** (`public/catalogue-curation.js`): eleven archive records marked "Not for financial use"
  with why, three of them under a clearer name, and fifteen stubs for the relation ids the archive does not hold. The
  archive projection itself is untouched.
- **The decision option templates** (`public/decisions-domain.js`, `TOPIC_TEMPLATES`): the six options offered for a
  decision, in words free of payment wording; the Bank Payment reference keeps its own.
- **The statement checks** (`public/statement-checks.js`, round 12, workstream B2): the subjective words (`SUBJECTIVE`:
  the eight Chapter 1 has always flagged and fourteen more of the same kind), the words that leave scope open when a
  statement states no figure (`VAGUE`), the cues of a regulation cited by its kind (`CITED`) and of compliance
  (`COMPLY`), the regulator patterns (`REGULATOR`), the instrument titles (`ISSUED`, `STRONG`, `WEAK`) and the short,
  generic list of widely cited instruments (`KNOWN_INSTRUMENTS`; no jurisdiction assumed), the qualities that need a
  target (`QUALITY`) and the phrasings of a test objective (`OBJECTIVE`). They raise the one ambiguity finding and
  the test-objective finding, and propose a constraint at import; they decide nothing. With the core-banking lens
  chosen for the project, and only then, the lens's regulatory terms name the regime a citation is about. Calibrated
  on the round's supplied workbook by counts only (no text kept): 138 statements flagged as ambiguous where the
  eight-word rule flagged 12, and 426 test objectives.
- **The personal-data rule of the intake** (`public/intake-proposals.js`, `personalColumns`, round 12, B2): the words
  of a person's role in a header (`PERSON_ROLE`), the words of a team, an organisation or a status that make a cell
  not a name (`ORG_WORDS`, `STATUS_WORDS`), and the e-mail and telephone patterns. A flagged column is held back unless
  a person chooses it. It is AIW's rule, not a judgement of the law: it does not find a name written inside prose
  that no flagged column holds, and the person who answers for the project's data protection should review it.

## 6. What the four-eyes knowledge approver must check and attach before any release

Release is the approver's decision and AIW's governed path, not this file's. For each record:

1. **Open the passage.** For an AIW-authored record, read it as AIW's method and decide whether it may stand as the
   organisation's knowledge; for an SA Playbook record, check it against the owner's workbook (the hash is the
   workbook's); for every other record, find the source in section 4.
2. **Check the statement against the passage.** The claim's statement and every `supports` line must be what the
   passage says, or say plainly where they go beyond it.
3. **Check the rights.** Record whether each passage may be stored, quoted or only referenced; do not attach one the
   organisation may not keep. Licence counsel decides where a licence is unclear.
4. **Import the held passages** with `node scripts/import-domain-candidates.mjs` as the claim author (each becomes a
   source and a candidate claim in the shape the chapters read), or attach a passage from a real source with
   `knowledge.source` and write its claim with `knowledge.claim` in the record's shape.
5. **Have a second person verify each claim** with `knowledge.review` (`decision: verified`, source, rights and
   conditions checked). AIW refuses verification by the claim's author.
6. **Release and pin** with `knowledge.release` and `knowledge.activate`, naming the reviewer and the reason. To release
   it once for every banking project, an organisation administrator publishes the active release to the organisation
   (Organisation guidance › Knowledge releases), and each project pins it there; a pinned organisation release counts
   against none of the project's knowledge limits.
7. **Withdraw or rewrite** any record that does not hold, and record the decision per record in the sign-off below.
   Update the pack's `approval` block only from that decision.

## 7. Sign-off

Not signed. Nothing below is filled in by AIW or by Sol.

| Role | Name | Date | Decision |
| --- | --- | --- | --- |
| Knowledge approver (claim author) | | | pending |
| Second reviewer (four eyes, not the author) | | | pending |
| Rights and licence check | | | pending |
| Person who names the project's jurisdiction | | | pending |

`productionAccepted` stays false. This pack's status is **pending, not approved**.
