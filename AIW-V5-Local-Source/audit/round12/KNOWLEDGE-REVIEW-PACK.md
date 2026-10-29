# Knowledge review pack · core-banking candidate knowledge (round 12, D-14)

**Status: pending. Not approved, not released, not active.** Prepared by Sol for AIW round 12, workstream C, on
2026-10-07. No person has reviewed it. This pack is for the four-eyes knowledge approver; nothing in it may be
released until that approver, and a second person who did not write the claims, have done what section 4 asks.

| Field | Value |
| --- | --- |
| Pack | `candidate-sets/core-banking-candidate-pack.json`, pack id `CB-CANDIDATE-1`, schema `aiw-candidate-pack-v1` |
| Status | `candidate`; approval `pending`; `fourEyes: false`; `approvedBy: null`; `releaseId: null`; `productionAccepted: false` |
| Influence today | none: no score, no hard constraint, no conformance result, no draft, no Brain retrieval, no lens reading |
| Entries | 58: 17 patterns, 23 tactics, 18 anti-patterns |
| Sources | 35 entries name at least one source (50 references); 23 entries have `source: null` and `sourceNeeded: true` |
| Lens | written against the core-banking lens, `public/lenses/core-banking.js`, version 1 |

## 1. What the pack holds, and what it does not

The pack holds candidate patterns, tactics and anti-patterns for the seventeen concerns of the core-banking lens:
posting and ledger integrity, end of day, interest and charges, multi-currency, onboarding and KYC, AML and
sanctions, regulatory reporting, maker-checker, audit history, product configuration, value dating, payments,
channels, availability and recovery, privacy and residency, migration, and operations. Each entry has an id, a kind,
`status: "candidate"`, the concerns it serves, a title, its intent in one or two sentences, and either its sources or
`source: null` with `sourceNeeded: true`.

A source names a public standard or text by title, edition and section. It is named only where those three could be
given precisely. For each reference the pack says:

- `supports`: what the entry relies on the passage for. Where the entry frames an anti-pattern that the source does
  not name, the reference says the framing is AIW's.
- `located`: how the title and section were found. "Confirmed against public summaries on 2026-10-07" means the
  section's number and title were checked against public summaries of the text, not against the text itself. "From
  the drafter's reading, not confirmed" means they were not checked at all.
- `rights`: what is known of the right to keep the passage. For every reference this is "not checked" or a first
  note (public text of the United States government; a Creative Commons licence; not freely redistributable).

The pack does **not** hold any passage. No source was retrieved, attached or hashed. No statement in it has been
checked against its source. No rights were checked. No jurisdiction's law beyond the European Union texts named in
three references is covered; the project's own jurisdiction (its central bank's rules, its data-protection law) must
be named by a person who can name it.

## 2. Why it informs nothing today

The doctrine: candidate and discovery knowledge never affect scoring, hard constraints or conformance; every
authoritative claim traces to an immutable source passage; nothing becomes knowledge without a four-eyes review. The
code keeps that true for this pack, and a suite proves it (`npm run test:domain-lens`, section "the candidate pack"):

- No runtime module reads the file: no module under `public/`, `shared/`, the Worker or the server names it or its
  pack id (a scan in the suite).
- The candidate-set import (`scripts/import-candidate-set.mjs`) refuses it: its schema is not a candidate set made of
  anchored passages, so it cannot become candidate claims by that path either.
- The stress test: the suite keeps the pack's whole text as a project knowledge source and makes candidate claims on
  it through the governed commands, as a person could. The scores (Chapter 3's trade-off tallies), the hard checks
  (every chapter's findings), the conformance results (every chapter's checks, the architecture requirements gate,
  the anti-pattern scan), the drafter's records and citations, the Brain's retrieval and released claims, and the
  lens's reading are exactly what they were. Unreviewed claims are not eligible (`knowledgeEligibility` in
  `public/knowledge-governance.js`), and the lens reads records, never knowledge.

The core-banking **lens** is separate from this pack. The lens is a rule set: it lists concerns and reads whether the
design addresses them. It states no value and cites nothing. Releasing this pack would not change the lens.

## 3. The entries

Kinds: P pattern, T tactic, A anti-pattern. "Located": C confirmed against public summaries, R from the drafter's
reading, C/R chapter confirmed and the pattern's place in it from the drafter's reading.

| Id | Kind | Concerns | Source (title · edition · section) | Located |
| --- | --- | --- | --- | --- |
| CB-PAT-POSTING-BALANCED | P | posting | Pacioli, Summa de arithmetica · Venice 1494 · Dist. IX, Tract. XI; Fowler, Analysis Patterns · 1st ed. · ch. 6, 6.2 Transactions | C, C |
| CB-TAC-POSTING-REVERSAL | T | posting, audit | source needed | |
| CB-TAC-POSTING-SUSPENSE | T | posting, operations | source needed | |
| CB-ANTI-POSTING-SINGLE-SIDED | A | posting | Fowler, Analysis Patterns · 1st ed. · ch. 6, 6.2 Transactions | C |
| CB-ANTI-MONEY-AS-FLOAT | A | posting, fx | Fowler, Patterns of Enterprise Application Architecture · 1st ed. 2002 · ch. 18, Money | R |
| CB-PAT-EOD-CHAIN | P | eod | source needed | |
| CB-TAC-EOD-CUTOFF | T | eod, value-dating | source needed | |
| CB-TAC-EOD-ONLINE | T | eod, channels | source needed | |
| CB-ANTI-EOD-UNRESTARTABLE | A | eod | source needed | |
| CB-PAT-INTEREST-ACCRUAL | P | interest | 2006 ISDA Definitions · 2006 · s. 4.16 Day Count Fraction; IFRS 9 · July 2014 as amended · para. 5.4.1 | C, R |
| CB-TAC-TARIFF-TABLES | T | interest, product-config | source needed | |
| CB-ANTI-RATES-IN-CODE | A | interest, product-config | source needed | |
| CB-PAT-AMOUNT-WITH-CURRENCY | P | fx | ISO 4217:2015 · Table A.1, minor unit; Fowler, PoEAA · 2002 · ch. 18, Money | C, R |
| CB-TAC-FX-TRANSACTION-RATE | T | fx | IAS 21 · revised 2003 as amended · para. 21 | C |
| CB-TAC-FX-REVALUATION | T | fx | IAS 21 · revised 2003 as amended · paras. 23 and 28 | C |
| CB-ANTI-MIXED-CURRENCY-TOTALS | A | fx, reporting | source needed | |
| CB-PAT-RISK-BASED-CDD | P | kyc | FATF Recommendations · 2012 as updated · R.10; R.1 | C, R |
| CB-TAC-KYC-TIERED-LIMITS | T | kyc | source needed | |
| CB-TAC-KYC-RECORD-KEEPING | T | kyc, audit | FATF Recommendations · R.11 | C |
| CB-ANTI-ACCOUNT-BEFORE-CHECKS | A | kyc | FATF Recommendations · R.10 | C |
| CB-PAT-SCREEN-CURRENT-LISTS | P | aml | FATF Recommendations · R.6; R.12 | C, C |
| CB-TAC-TRANSACTION-MONITORING | T | aml | FATF Recommendations · R.20 | C |
| CB-TAC-WIRE-TRANSFER-DATA | T | aml, payments | FATF Recommendations · R.16 | C |
| CB-ANTI-STALE-SCREENING-LIST | A | aml | FATF Recommendations · R.6 | R |
| CB-PAT-RETURNS-FROM-LEDGER | P | reporting | BCBS 239 · January 2013 · Principles 3 and 7 | C, C |
| CB-TAC-RETURNS-CALENDAR | T | reporting | source needed | |
| CB-ANTI-HAND-BUILT-RETURNS | A | reporting | BCBS 239 · Principle 3 | C |
| CB-PAT-MAKER-CHECKER | P | maker-checker | NIST SP 800-53 Rev. 5 · AC-5; COSO Internal Control · May 2013 · Principle 10 | C, C |
| CB-TAC-INCOMPATIBLE-ROLES | T | maker-checker | ISO/IEC 27002:2022 · 5.3 | C |
| CB-ANTI-SELF-APPROVAL | A | maker-checker | COSO Internal Control · Principle 10 | C |
| CB-PAT-AUDIT-TRAIL | P | audit | NIST SP 800-53 Rev. 5 · AU-3, AU-9; ISO/IEC 27002:2022 · 8.15 | C, C, C |
| CB-TAC-AUDIT-RETENTION | T | audit | NIST SP 800-53 Rev. 5 · AU-11 | C |
| CB-ANTI-AUDIT-EDITABLE | A | audit | NIST SP 800-53 Rev. 5 · AU-9 | C |
| CB-PAT-PRODUCT-CONFIGURATION | P | product-config | source needed | |
| CB-ANTI-PRODUCT-NEEDS-RELEASE | A | product-config | source needed | |
| CB-PAT-VALUE-AND-BOOKING-DATE | P | value-dating | ISO 20022 camt.053.001.08 · version 08 · Entry BookgDt and ValDt | C |
| CB-TAC-BACKDATING-WINDOW | T | value-dating, maker-checker | source needed | |
| CB-ANTI-UNLIMITED-BACKDATING | A | value-dating | source needed | |
| CB-PAT-IDEMPOTENT-PAYMENT | P | payments | Hohpe and Woolf, Enterprise Integration Patterns · 1st ed. 2003 · ch. 10 Idempotent Receiver; ch. 5 Correlation Identifier | C/R, C/R |
| CB-TAC-ENQUIRE-BEFORE-RETRY | T | payments | source needed | |
| CB-TAC-NAMED-MESSAGE-STANDARD | T | payments | ISO 20022 pacs.008.001.08 · version 08 | R |
| CB-ANTI-RETRY-ON-TIMEOUT | A | payments | source needed | |
| CB-PAT-ONE-CHANNEL-LAYER | P | channels | source needed | |
| CB-TAC-CHANNEL-AUTHENTICATION | T | channels | OWASP ASVS · 4.0.3 · V2, V3; Regulation (EU) 2018/389 · Arts. 4 and 5 (EU only) | R, R |
| CB-ANTI-RULES-PER-CHANNEL | A | channels | source needed | |
| CB-PAT-TARGETS-FROM-BIA | P | availability | ISO 22301:2019 · 8.2.2; NIST SP 800-34 Rev. 1 · s. 3.2 | C, R |
| CB-TAC-STANDBY-ELSEWHERE | T | availability | NIST SP 800-53 Rev. 5 · CP-7, CP-9 | C, C |
| CB-ANTI-UNTESTED-RECOVERY | A | availability | NIST SP 800-53 Rev. 5 · CP-4 | C |
| CB-PAT-PERSONAL-DATA-PLACED | P | privacy | ISO/IEC 27002:2022 · 5.34; Regulation (EU) 2016/679 · Art. 5 and Art. 44 (EU only) | C, R |
| CB-TAC-ENCRYPT-AND-MASK | T | privacy | ISO/IEC 27002:2022 · 8.11; Regulation (EU) 2016/679 · Art. 32 (EU only) | C, R |
| CB-ANTI-PRODUCTION-DATA-IN-TEST | A | privacy | ISO/IEC 27002:2022 · 8.11 | C |
| CB-PAT-PARALLEL-RUN | P | migration | Newman, Monolith to Microservices · 1st ed. 2019 · ch. 3, Parallel Run | R |
| CB-TAC-INCREMENTAL-TAKEOVER | T | migration | Newman, Monolith to Microservices · ch. 3, Strangler Fig Application | R |
| CB-TAC-MIGRATION-CONTROL-TOTALS | T | migration | source needed | |
| CB-ANTI-BIG-BANG-NO-WAY-BACK | A | migration | source needed | |
| CB-PAT-DAILY-RECONCILIATION | P | operations, payments | source needed | |
| CB-TAC-MONITOR-EACH-PART | T | operations | NIST SP 800-53 Rev. 5 · SI-4 | R |
| CB-ANTI-SUSPENSE-NOBODY-CLEARS | A | operations, posting | source needed | |

Every concern has at least three entries. End of day, product configuration and the unsourced entries of every other
concern have no source the drafter could name precisely: they are the approver's first search.

## 4. What the four-eyes knowledge approver must check and attach before any release

Release is the approver's decision and AIW's governed path, not this file's. For each entry:

1. **Open each named source** at the named edition and section. Confirm the title, the edition and the section; where
   the pack says "as amended" or "as updated", pin the version in force and record its date. Correct or withdraw any
   reference that does not hold.
2. **Check the statement against the passage.** The entry's intent and each `supports` line must be what the passage
   says, or the entry must say plainly where it goes beyond it. An anti-pattern framed by AIW stays AIW's framing.
3. **Check the rights.** Many of the texts are not freely redistributable (ISO, ISO/IEC, ISDA, IFRS, COSO). Record for
   each passage whether it may be stored in the knowledge repository, quoted, or only referenced. Do not attach a
   passage the organisation may not keep.
4. **Attach the exact passage** as a knowledge source through the governed command `knowledge.source` (the original
   text, its URL or document reference, its revision and its licence), so that AIW hashes it.
5. **Write the claims** with `knowledge.claim` on the exact lines: subject, predicate, statement, claim type,
   polarity, conditions and limitations. One entry may need several claims, or none.
6. **Have a second person verify each claim** with `knowledge.review` (`decision: verified`, source, rights and
   conditions checked). AIW refuses verification by the claim's author.
7. **Release and pin** with `knowledge.release` and `knowledge.activate`, naming the reviewer and the reason.
8. **For every entry with `sourceNeeded: true`**: find a source that can be named precisely and do steps 1 to 7, or
   withdraw the entry. An unsourced entry is never released.
9. **Name the project's jurisdiction.** Add the law and the regulator's rules that apply where the bank operates (for
   example its central bank's guides, its data-protection act, its sanctions lists) as their own sources, reviewed
   the same way. The European Union references in this pack apply only in the European Union.
10. **Record the decision per entry** (approve, rewrite, withdraw) in the sign-off below, and update the pack's
    `approval` block only from that decision.

## 5. Sign-off

Not signed. Nothing below is filled in by AIW or by Sol.

| Role | Name | Date | Decision |
| --- | --- | --- | --- |
| Knowledge approver (claim author) | | | pending |
| Second reviewer (four eyes, not the author) | | | pending |
| Rights and licence check | | | pending |

`productionAccepted` stays false. This pack's status is **pending, not approved**.
