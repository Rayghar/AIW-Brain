# Sol improvements review · 2026-10-29

A read-only review of Sol as the live run of 2026-10-29 exercised it (`LIVE-RUN-2026-10-29.md`). Six investigators covered prompts, guards, packets, the product experience, evaluation, and cost and reliability; one skeptic per lens checked every proposal against the code. No provider was called. The ranking below applies the skeptics' corrections; the proposals they refuted, or found in conflict with the doctrine, are listed at the end with the reason. Nothing here is implemented yet, and `productionAccepted` stays false.

## FIX NOW (defects, small)

**1. Gap statements accepted as field values (lead A, root cause found)**
Impact high · Effort S · Owner: no
- **Problem:** in ch7, ch8 and ch9 the target field held the journey drafter's "Open question: …" placeholder (public/journey-drafter.js:157).
  - fieldPacket sends that placeholder verbatim in three places: as target.current (intelligence-service.js:392), in S1's `recorded` map (:347, :351) and in the retrieval query (:369).
  - FIELD_INSTRUCTIONS says "improve it without changing its meaning" (intelligence-provider.js:552), so Sol rewrote the gap at greater length. guardFieldDraft (:578-589) never calls isOpenText.
  - Once accepted, fieldOpen returns null (public/open-fields.js:34-50). The question then drops out of the SDD (sdd-architecture.js:254) and out of the Chapter 7 open notes (technology-domain.js:72). The "Define operational ownership" finding is replaced by nothing (technology-realisation-domain.js:208).
  - No packet builder imports open-fields.js.
- **Change:**
  - In fieldPacket, call fieldOpen(r, field). When the field is open, send current:'' plus target.open {state, question}, list it under `open` in S1 instead of `recorded`, and build the query from label, title and help.
  - Reword :552 so "improve" applies only to stated values. When target.open is set, Sol either answers target.open.question from cited sources or returns an empty value with the question in basis. That path already exists (field-spark.js:375), and journey mode already works this way (:617).
  - In guardFieldDraft, not validateFieldDraft (which turns failures into invalid_output run errors, :598), withhold gap wording (unassigned|undefined|unspecified|open question|must be clarified|requires definition), but only when target.open is set. That spares assumptions and risks fields (record-fields.js:226, :234).
  - Do not add a word-overlap test. It would reject real answers such as "The clinic IT team operates, monitors and supports it".
  - Add this defect to FIELD_REVIEW_INSTRUCTIONS (:555).
  - Apply the same detector to journey values; guardJourneyDraft (:652-663) has none.
  - Pin sol-field-4. Add tests from the ch7, ch8 and ch9 packets, which reproduce offline byte for byte.
  - Known gap: the "still to be written" placeholder (journey-drafter.js:447, :784) is not in PLACEHOLDERS (open-fields.js:15-21).

**2. The code demotes the checker's real defects to notes**
Impact high · Effort S · Owner: no
- **Problem:** reviewFinding moves a defect to notes when it matches AFFIRMS and not DENIES (public/brain-reasoning.js:671-676). Five realistic contrast-worded defects were all demoted, for example "supported by S1, but the 5-second window does not appear in any source". Every mode uses this function (intelligence-provider.js:375, 602, 676, 754; architecture-contract.js:51).
- **Change:**
  - Demote a defect only when it matches AFFIRMS, matches no DENIES pattern, and has no contrast word (but|however|although|though|except|yet|whereas) after the affirming phrase.
  - Extend DENIES with: not stated/mentioned/present/found, does not appear, no source, goes beyond, unsubstantiated, lacks support. Give exceed and absent negation lookbehinds.
  - Add the five cases to sol-checks-validate.mjs:109. The BP-09 cases (:105-106) stay as notes.
  - Expect a few more false withholdings from nits; report the rate in the next live run.

**3. A withheld Ask Sol answer can be saved as a "Sol draft" field value**
Impact medium-high (false provenance) · Effort S · Owner: no
- **Problem:**
  - Proposals ignores groundingReview.accepted (coauthor-ui.js:79-81), and worker.js:174-176 accepts design, author, mind and challenge runs (unlike field runs at :172).
  - So AIW's own fallback text, "The generated explanation was withheld…" (intelligence-provider.js:320, :377), can be saved as a field value with source 'sol' and a runId.
  - Separately, slice() cuts long text mid-sentence (coauthor-ui.js:306) and the field is then marked "edited" (field-spark.js:148).
- **Change:**
  - Filter on accepted at coauthor-ui.js:81 and refuse non-accepted runs in worker.checkSuggestions.
  - For over-length text, offer "Draft <field> with Sol from this answer" through field mode. At minimum, the prefill note should say "shortened from N to M characters".

**4. Tell Sol the rules the guards already enforce (root of lead C)**
Impact high (fewer wording withholdings; no guard change) · Effort S · Owner: no
- **Problem, wording:**
  - In drafted mode, ensure/achieve/guarantee followed by an outcome is a claim (brain-reasoning.js:538-539, :564), checked on every architecture string (architecture-contract.js:503).
  - The prompts only forbid guaranteeing "a verified outcome" (intelligence-provider.js:554, :618). The architecture prompt never mentions ensure or achieve, and it models "this would …" (architecture-contract.js:83, :86), which the guard reads as a guarantee.
  - Withheld for this reason: ch3, and 4 of the 5 architecture withholdings.
  - Ch11's "…, ensuring all freed slots are offered" was accepted even though it presents requirement OUT-002 as an outcome the design already achieves.
- **Problem, figures:**
  - Ch1 and ch4 lost a draft over "24". The prompts only say numbers must appear in the packet (:554, :618, :697; architecture-contract.js:87).
  - "At any time" recurs across the reference briefs (shared/reference-journeys.js:123, 149, 173, 286).
  - That the "24" came from "24/7" is an inference; item 5 will confirm it.
- **Change:**
  - Add one shared DRAFTED_WORDING constant built on shared/reasoning-instructions.js:30: say what a part does and which driver or constraint it answers, not an outcome it ensures or achieves, also not as a purpose or with must/would/help.
  - Include example pairs and a requirement-as-outcome example.
  - Do not paste the guard's SOFT/HARD outcome list (brain-reasoning.js:546-547). That would teach the model synonyms the guard misses.
  - Change architecture :83 to "this would let … / so that …".
  - Add "keep the source's words for times, frequencies and quantities; do not convert them to 24/7 or 48 hours" to the draft prompts. Add "a figure converted from words" to the check prompts (:555, :619, :698; architecture-contract.js:95).
  - Bump the field pin together with item 1 (one bump), plus the journey, architecture and generate pins. Update the literals in field-spark-validate.mjs:590, field-spark-browser-validate.mjs:94 and :100, and sol-live-check-validate.mjs:50.
  - Add a (promptVersion, sha256) pin test. Today :590 checks only the version string, while FIELD_INSTRUCTIONS embeds shared constants (:550-555).

**5. Live probe evidence misreports, and drops what is needed to diagnose (lead D)**
Impact high (honest evidence; prerequisite for measuring B and C) · Effort S · Owner: no
- **Problem:**
  - scripts/sol-live-check.mjs:92 reads groundingReview.withheld as an array that field and journey runs never set, so the evidence shows withheld 0 beside withheld true (passed.json:226 vs :269).
  - groundingAccepted means three different things (intelligence-provider.js:602, :761; architecture-request.js:63). At passed.json:1442-1443 it reads true next to 5 withheld.
  - :133-134 drops groundingReview.draft, notes and contradiction (intelligence-provider.js:604). Journey and review keep counts only (:142, :150), architecture drops passages (:166-167), and only the architecture run records its packet stamp.
  - Guard and check issues are merged into one list (:602, :676, :756). That is how LIVE-RUN-2026-10-29.md:13 came to blame the "deterministic checks" for ch10, whose issue is a model-check defect (passed.json:1164). LIVE-RUN:14 overstates journey coverage.
- **Change:**
  - Bump the schema to aiw.sol-live-check/4.
  - Record per run: outcome (offered, withheld, withheldBy deterministic|check|both, fallback, and withheldAll, which already exists at architecture-request.js:61).
  - Record per-mode totals, and rename groundingAccepted per mode.
  - Record withheldDraft labelled offeredToArchitect:false (reference projects only), check notes and contradiction, packetStamp, journey answers and omissions.records, review findings and withheld findings, architecture passages and withheld text, omission reasons, and status.routes.
  - Keep `passed` as a deprecated alias of `completed`, and update sol-live-check-validate.mjs:36.
  - In the provider, add groundingReview.deterministic{issues} and check{defects, notes, contradiction} for field, journey and review, as generate already does (:358, :377). `accepted` is unchanged.
  - Append a dated erratum to the LIVE-RUN note covering :13 (3 withheld by the guard, 1 by the check) and :14 (12 of 24 records, 53 of 109 fields), and state that figures of 12 or less are exempt (:582). Do not rewrite the published text.
  - Add mock faults (invented-number, guarantee, gap-statement, check-reject, check-contradict) behind a `--mock-faults` flag. Today the double's checks always pass (mock-llm-provider.mjs:90, :112, :128) and fault injection exists only for the desk (:39-50). The probe calls startMockLLM() with no options (sol-live-check.mjs:39), and the validate suite asserts every chapter is accepted (sol-live-check-validate.mjs:44).

**6. Failed runs keep their full token reservation for 24 h; the architecture timer shim breaks fallback**
Impact high (budget) / medium (fallback is unset by default, settings.js:37) · Effort S · Owner: no
- **Problem, budget:**
  - Six failure UPDATEs never set used_tokens (intelligence-service.js:257, 298, 434, 518, 558, 605). The budget sums COALESCE(used_tokens, reserved_tokens) (:90), and retention releases only pending runs (retention.js:35-38).
  - Reservations run about 6x actual use: about 661k for the 11 field chapters, and 231,122 for the ch4 review.
  - So 13 unbilled 429s would have held about 0.95M of the 1M daily default (:85). The refusal then blames the hourly budget (:285, :422, :506, :593).
- **Problem, fallback:** architecture-request.js:24-28 has no rearm (intelligence-provider.js:419). After a timeout the fallback gets an already-aborted signal; after a 5xx it gets only the primary's leftover time.
- **Change:**
  - Add settleFailedRun(e), modelled on the architecture path (:144-149): billed usage when present; 0 only when no call in the whole run got a response; keep the reservation for timeout, storage errors and unknown cases.
  - Attach the usage of completed calls to errors thrown after them (as architecture-request.js:27 does). Ship this together with settleFailedRun.
  - Name the limit that refused the request.
  - Export timed, declinable and parsed from intelligence-provider.js, delete the shim, and test requestArchitectureDraft with a primary that times out and a fallback that answers.

**7. A spend-limit 429 is reported as a rate limit and sent twice**
Impact high · Effort S · Owner: no
- **Problem:**
  - Every 429 becomes provider_limit (intelligence-provider.js:466; intelligence-service.js:33), even though insufficient_quota and project_spend_limit_exceeded are already attached (:453-466) and saved in the run (intelligence-service.js:36-39). Nothing in public/ reads them.
  - 429 is in the retry list (:172), so each spend-limited call goes out twice.
  - The connection check passes under a spend limit (:248-251).
- **Change:**
  - Add a provider_quota code, using a per-wire predicate because Anthropic signals it differently (intelligence-anthropic.js:94-96, :103).
  - Never retry provider_quota, and show an owner-action message ("waiting will not clear it").
  - Keep provider_limit, with Retry-After, for real rate limits.

**8. The journey packet sent no Chapter 1 requirements**
Impact high · Effort S · Owner: no (the bound itself is an owner decision)
- **Problem:** journeyPacket takes the first 12 records in draft order (public/intelligence-context.js:354, :370). Live, that was c1-c12: none of the 6 requirements, 3 constraints, 2 scope boundaries or the assumption reached Sol (24 records; 53 of 109 fields).
- **Change:**
  - Before slicing, order records: requirements, constraints and scope first, then outcomes, journeys and assumptions, then actors and stakeholders.
  - Admit cited passages first (:373).
  - Record omissions.records and omissions.passages in the probe (sol-live-check.mjs:142).

**9. Any negation in a sentence hides a guarantee**
Impact medium (no accepted live case found, because the probe drops prose) · Effort S · Owner: no
- **Problem:** overclaim skips the whole sentence on not, never, cannot or until (brain-reasoning.js:584), before every test (:585-597). "The booking lock guarantees zero double bookings, not just fewer." passes in drafted mode in every guard.
- **Change:**
  - Keep the whole-sentence skip only for hedges.
  - In the ENSURES loop, skip a match only when a negation falls within the 5 words before it, splitting on ';' only. Splitting on commas misfires on "does not, as written, guarantee".
  - Add negation to the VERIFIED test.
  - In memory this gave 0 regressions over the 57 suite sentences. Add the three positives and the three comma cases as tests.

**10. Screen readers do not hear the draft or why it was withheld**
Impact medium · Effort S · Owner: no
- **Problem:**
  - When the run returns, the status region is replaced and focus moves to Accept or Ask again (field-spark.js:344, :350, :425) with no description.
  - The withheld paragraph has no role (:374), unlike the error branch's role=alert (:367).
  - The empty-value branch (:375) moves focus to Close.
- **Change:** give the result blocks ids and point aria-describedby on the focused button at them. Mark the withheld and empty paragraphs role=status. Add a Playwright assertion on the accessible description.

## IMPROVE NEXT (worthwhile, medium)

**1. Field packets: put project facts and the chapter reading before editorial catalogue text**
Impact high · Effort M · Owner: no
- **Problem:**
  - The chapter reading is added last (intelligence-service.js:387) and was omitted in all 9 packets that had one.
  - Catalogue text took 31-86% of 10 of the 11 packets. In ch7 it was 10,320 of 11,972 characters, and ch7 lost REQ-001, QD-001, CON-001 and CON-003.
  - criticalContext.complete still read true (:396).
- **Change:**
  - Use the desk's order (brain-reasoning.js:294-307): record, parent, neighbours, then compact requirements, drivers and constraints as must-carry, then the compact reading, insights, claims, and at most one compact catalogue projection.
  - The neighbour-first order is a deliberate round-11 choice (:355-358). Keep it, or change field-spark-validate.mjs:546-548 and :559 on purpose.
  - Reserve both characters and a source slot for the reading; ch9 hit the 10-source cap (:332).
  - Compute complete from the must-carry set, and make :561 require the reading.
  - Build the compact projection first, so larger projects do not hit a new fail-closed refusal.

**2. Apply architecture's approval/verification guard in field, journey and review**
Impact medium · Effort M · Owner: no
- **Problem:**
  - Only architecture checks status words (architecture-contract.js:146-152, :502).
  - overclaim never checks approval (brain-reasoning.js:596-597), so guardFieldDraft passes "Approved by the clinic manager."
  - The field and journey check prompts' support clause omits 'approved' (:555, :619); the review check prompt has it (:698).
  - Architecture's issue text says "accepted", but STATUS_WORD has no "accepted".
- **Change:**
  - Share claimedStatus.
  - In field and journey, match status constructions ("has been/was approved|verified by", "signed off", "certified"), not bare words, so process verbs such as "held until approved" still pass. Exempt a word the cited source uses in the same form.
  - In review and desk prose, exempt negated forms ("not yet approved").
  - Align the architecture issue text with STATUS_WORD.

**3. Make the number check unit-aware and ID-aware**
Impact medium · Effort M (upper end) · Owner: no
- **Problem:** the guards exempt 0-12 and learn any digit run in the packet (intelligence-provider.js:576-583, 652-658, 730-733; brain-reasoning.js:645). All of these pass:
  - "3 times with a 2-second backoff";
  - a journey numeric target of "5", which architecture forbids (architecture-contract.js:499-500);
  - "30 seconds" when the packet only holds REQ-030;
  - "29 minutes" when the packet only holds a date;
  - "twenty-four hours".
- **Change:**
  - Add a shared numericProvenance helper. Check unit-bound numbers at any size (unit vocabulary from journey-drafter.js:216).
  - Require exact figures for numeric journey fields.
  - Strip IDs and ISO dates before collecting numbers (watch SHA-256 and UTF-8), and check that draft IDs exist in the packet.
  - Read number words on both sides.
  - Keep each mode's packet scope (journey learns no numbers from knowledge sources, :655) and the desk's exemption for restated design numbers (brain-reasoning.js:621, :650-652).

**4. Check and withhold journey answers one by one**
Impact medium (no live loss; matters because of lead C) · Effort M · Owner: no
- **Problem:** the journey check gives one verdict per chapter (intelligence-provider.js:674), and any issue withholds every answer (:667, :676-677). Review mode (:749-757) and architecture (architecture-contract.js:521-529) settle per item.
- **Change:**
  - Give answers ids J1..Jn, use a per-id check schema like :704, and withhold per answer, including "did not reach it".
  - A declined check still withholds everything.
  - Handle an answer that depends on a withheld sibling.
  - The UI needs work, because it reads one withheld boolean per chapter.

**5. Architecture: measure theme focus, then enforce the reuse rule**
Impact medium · Effort S to measure, M to enforce · Owner: no
- **Problem:**
  - 14 of the 17 accepted titles equal existing state rows, and about 15 cover REQ-002 to REQ-006 while citing only REQ-001 (passed.json:1456-1575).
  - That breaks "never proposed again" (architecture-contract.js:84), which checkShape (:413-432) does not enforce.
  - Offline, own() (:640) produced new chapter-4 and chapter-5 draft records with no id beside the existing records.
  - Not yet traced: whether apply's heldDraftIds (architecture-drafter.js:1322) suppresses them.
- **Change:**
  - In the probe, record themeFocus, duplicatesOfState (strip code prefixes, because the 2026-10-14 run repeated "QD1 — …") and each proposal's passages.
  - Then add a deterministic check that returns duplicates as "already recorded", not counted as accepted.
  - Give state rows their requirement refs (:260).
  - Add sourcePassage and sourceLines to claimsFor (:204-214).

**6. One withheld list on every surface**
Impact medium · Effort M · Owner: no (owner call: may withheld architecture titles be shown? Default is kind and refs only)
- **Problem:**
  - Review stores withheld findings and set-asides (intelligence-provider.js:715-726, :757-759), but the UI shows only a count (brain-reasoning-ui.js:478, :550).
  - Architecture passes only withheldDetails[0].issues[0] (drafting-service.js:149). Live, 5 proposals were withheld and the architect saw one reason.
- **Change:**
  - Build a shared renderer showing the target, the issue and the layer that withheld it (needs Fix-now 5).
  - Never show the withheld text and never offer accept.
  - Offer "Ask again" and "Write it yourself" (field-spark.js:513).
  - Keep earlier withheld attempts for the same field visible, so a later accept does not look like a clean first pass.

**7. Show what each S-ref is, and what "source-checked" means**
Impact medium · Effort S · Owner: no
- **Problem:**
  - Field drafts show bare "Cites S1, S3." (field-spark.js:378) even though the run carries the packet (intelligence-service.js:423, :430).
  - Check notes (:604) are never shown.
  - reviewBasisPacket strips ref and title on both server and client (intelligence-service.js:43; brain-reasoning-ui.js:374).
- **Change:**
  - Add a collapsed "What it rests on" in the spark, with titles and excerpts but no shell-select links inside the open editor (field-spark.js:296-298).
  - Add ref and title to reviewBasisPacket, and show them per finding.
  - Extend the field-runs list (:219) so Proposals can show them.
  - Show groundingReview.authority (intelligence-provider.js:593) as the explanation of "source-checked".

**8. Golden expectations for the live modes, with offline rescore and recheck**
Impact medium · Effort M · Owner: no (independent review is pending)
- **Problem:** the live modes have no expectations, and the manual reading praised the ch7-ch9 gap statements (LIVE-RUN:29-30). The machinery exists, but only for reasoning mode (sol-evaluation.js:88-110, :190-219).
- **Change:**
  - Add evaluation/sol-live-expectations-v1.json, labelled "implementation-authored". Entries carry mustNot (gap, instruction and outcome wording), emptyAcceptableWhen, citeKinds and numbers.
  - Add `--rescore` and `--recheck`. Recheck rebuilds packets through the exported fieldPacket (intelligence-service.js:333) and refuses when the stamp differs.
  - Freeze the live examples as guard fixtures, as sol-checks-validate.mjs:1-13 already does for the desk.
  - Depends on Fix-now 5.

**9. Per-mode timeouts and recorded latency**
Impact medium · Effort M · Owner: no
- **Problem:**
  - One AIW_LLM_TIMEOUT_MS overrides every mode, architecture's 120 s included (intelligence-provider.js:174), and the documented example is 45000 (settings.js:19).
  - Status reports 45 s for every mode (:163).
  - Eight hard-coded 120000 pending windows (intelligence-service.js:40, 123, 238, 281, 418, 502, 540, 589) leave no margin for two 60 s calls.
  - No receipt records elapsed time (:444-448).
- **Change:**
  - Add AIW_LLM_TIMEOUT_MS_<MODE>.
  - Record elapsedMs per call, and report p50 and p95 per mode in the probe.
  - Derive each window from passes × per-call timeout plus slack. This is a prerequisite for any repair redraft.

**10. Quota follow-through: pause the drafting job**
Impact medium-high · Effort M · Owner: no (owner call: may a quota refusal fall back to another provider? Today it never does, :398)
- **Problem:** every failed theme counts toward JOB_BUDGET_SQL (intelligence-service.js:94). A 40-theme job under a spend limit burns about 80 of the 120 daily theme runs (intelligence-provider.js:29) with nothing billed.
- **Change:**
  - On provider_quota, pause the job using the existing paused-budget pattern (architecture-job.js:78; drafting-service.js:178-183, :323).
  - Record each provider's last call outcome in status.

**11. Warn when the default model switches because a second key was added**
Impact medium · Effort S · Owner: no
- **Problem:** with both keys set and AIW_LLM_PROVIDER unset, claude-opus-5-5 answers every mode (intelligence-provider.js:25, 59, 63-64). The rc41 live evidence covers only gpt-4.1-mini. This is documented (settings.js:7), but nothing warns at runtime; server.js:552-567 warns only about gateways.
- **Change:** warn at start-up, flag it in status, and mark routes that have no live evidence.

## OWNER DECISIONS (cost, policy, bounds)

**1. Repeat runs with confidence intervals (how we measure lead C)**
Impact high · Effort M · Owner: yes (spend)
- **Problem:** one run is too small to read as a rate. 4/11 withheld has a 95% interval of 15-65%. The two live runs also differ in prompt pins and packets, so their difference cannot be attributed.
- **Change:**
  - Add `--repeat N`, `--modes` and `--chapters`. Report per-item k/N, a flip flag and withheld counts by layer; label pooled intervals as approximate.
  - Raise the scratch project's hourly budget through operation-service.js:53 (capped at 120/hour, :16), and record the raise. The daily token budget (1M default, 2M max; intelligence-service.js:85, :97) binds at about 6-7 passes.
  - Add `--max-tokens`. Architecture bypasses the server budget (sol-live-check.mjs:162), so this flag is its only bound.

**2. Check strength and sampling (lead B), cheapest option first**
Impact low-medium · Effort S to M · Owner: yes
- (a) Route the check to a different or stronger model with the existing AIW_LLM_ROUTE_CHECK (intelligence-provider.js:20-21, :119-138), then measure with item 1. No code change.
- (b) Optional per-provider temperature for openai and openai-compatible providers only (none is sent today, :477, :493), recorded in receipts.
  - Refuse it as a configuration problem on anthropic: Opus 5.5, and every model from API 2026-10-21, reject it with a 400.
  - Document that OpenAI reasoning models also reject it; a 4xx never falls back (:398).
  - It buys reproducibility, not accuracy. The Anthropic lever is effort (:98-99, :108).
- (c) An optional second check with a union rule: accept only when the guard and both checks are clean; a declined check withholds. Cost is about 53k extra input tokens for the 11 field drafts.
- (d) Per-route parameters gated by a capability table.
- Do not route the check to a weaker model than the draft without evidence.

**3. Repair redraft for field and journey (lead C)**
Impact medium · Effort M · Owner: yes (cost)
- **Already exists** for architecture (architecture-request.js:58-59).
- **Change:**
  - At most one redraft, and only after a deterministic guard withholding, with the guard's problems appended after the packet. The normal check still runs, and both attempts go into the receipt and the withheld list.
  - Evidence counts "accepted after repair" separately.
  - Never redraft after a check-only withholding: that re-samples the check until it passes.
  - Pay for it by skipping the doomed check (see Later), and do it after Fix-now 4 and Improve-next 9.

**4. Journey record bound**
Impact high · Effort S · Owner: yes
- **Options:**
  - Keep 12 records, priority-ordered.
  - Bound by about 110 fields or about 30,000 characters. All 24 records come to 28,165 characters, about 2.9k more tokens across 2 calls.
  - Page the chapter as 12 + 12.
- No rationale for 12 is recorded (audit/round4/DESIGN.md Contract 2).

**5. An open-question action for fields (follow-on to A)**
Impact high · Effort S for the first step, L across all studios · Owner: yes (should gap prose lose Accept entirely? Fix-now 1 already withholds it)
- **Problem:** the empty-value branch offers no action (field-spark.js:375). Only runtime-ui.js:63 writes an open state from a form.
- **Change:**
  - Optional status and openQuestions in the schema, mirroring architecture's "not stated" sentinel (architecture-contract.js:87, :95).
  - "Keep it open with this question" in the spark, saved through patchOpen and cleanOpen.
  - List such runs under "Questions to investigate" (coauthor-ui.js:120-127).

**6. Model matrix and cost aggregation**
Impact medium · Effort M (L without items 1 and Improve-next 8) · Owner: yes (spend and model cells)
- **Already in place:** per-run prompt sha256 and per-call model snapshots (sol-live-check.mjs:90-91), and usage.cost per run when prices are set (:482). Only summing is missing.
- **Change:** add scripts/sol-matrix.mjs, reusing routeComparability (sol-evaluation.js:317). Thresholds only raise flags, outside the release gate.

**7. Packet bounds**
Impact low · Effort S · Owner: yes
- **Options:** A, compact optional knowledge; B, tiered budgets; C, raise to 32 sources / 40,000 characters; D, token-based bounds.
- Tune with sol-current-v1. The 6 unbuildable held-out cases were retired deliberately (sol-evaluation-validate.mjs:1-3).

**8. Decline a review finding with a reason**
Impact low · Effort M · Owner: yes (new record kind; route declines to the stewards?)
- **Problem:** hiding a finding lasts only for the session (brain-reasoning-ui.js:373, :576), and the server accepts only adoption (intelligence-service.js:75).
- **Already exists elsewhere:** the assessment Disagree path (chapter-sol.js:262-268); round 7 specified this state (audit/round7/DESIGN.md:62).

## LATER

- **Skip the check after the guard has withheld a draft.** Field, journey and generate run it anyway (intelligence-provider.js:599-602, 673-676, 363-375); architecture already skips it (architecture-request.js:42-45). Live this cost 13,104 + 257 tokens, 12% of field mode. Keep a sampled check, because those verdicts are the only data on how often the check agrees with the guard (leads B and C). Fold this into Owner 3.
- **Receipt usage, cost and duration.** settings.js:14 promises a cost per run that no receipt shows, and the list endpoints drop usage (intelligence-service.js:214, :219). Cheapest fix: reword settings.js:14.
- **Move the packet bounds into one module.** They are scattered across brain-reasoning.js:57; intelligence-context.js:69, 150, 195, 215, 354, 398; brain-retrieval.js:68; intelligence-service.js:332. Have the probe copy omission reasons (sol-live-check.mjs:132).

## Already built (do not redo)

- The withheld draft is stored and returned (intelligence-provider.js:604; intelligence-service.js:180).
- Check-pass routing exists.
- Architecture already has its repair redraft and its claimedStatus guard.
- Upstream quota codes are already attached to failed runs.
- Each run records its prompt sha256 and each call its model snapshot.
- Field packets reproduce offline byte for byte, so packet tests need no provider.

## Sequencing and external dependencies

- One sol-field-4 bump covers Fix-now 1, Fix-now 4 and the new check rule.
- Land Fix-now 5 and the mock faults before the next live run.
- No independent reviewer has looked at the golden expectations.
- productionAccepted stays false.

## Refuted or dropped by the skeptics
- prompts align-field-check-rubric | Give the field and journey check prompts the same rules as their draft prompts, plus an explicit defect / not-a-defect rubric | doctrine: The proposed 'not defects: the sources' own phrasing kept verbatim' loosens the model-based check. A verbatim brief goal ('Every freed slot is offered to the waiting list before the day of the appointment', ref
- prompts precise-basis-and-sourcerefs | Cite a source only for what its excerpt states, and attach each ref to its statement in basis | refuted: Verified that all seven accepted drafts already name every one of their sourceRefs in basis, so the optional deterministic check would catch nothing. Placed in validateFieldDraft, it would also turn a miss into 
- guards overclaim-outcome-vocabulary | Count universal quantifiers and multi-word targets as claimed outcomes (live ch11 false negative) | refuted: The problem is real. The live ch11 summary ('…anytime, ensuring all freed slots are offered…') has groundingAccepted true in sol-live-2026-10-29-passed.json. overclaim returns null for it and for the other four 
- guards guard-first-repair | Refine idea C: run the guard first, repair once on guard issues, then check only the final draft | doctrine: Feeding the guard's own issue sentences back to the model so it produces a passing draft coaches it to reword past a lexical guard. Finding C shows that 'must ensure' passes and ', thus ensuring compliance' doe
- packets field-related-dedupe-and-gaps | Remove duplicate sources in field packets and fill relatedOf/neighboursOf gaps for Chapters 6, 7 and 9 | doctrine: Part (2) adds a second traversal for 'which requirements and drivers this record answers to' in relatedOf (public/field-suggestions.js:804-824), whose only caller is fieldPacket. brainContext already resolves t
- reliability field-packet-reading-first | Field packets spend 31-86% of their budget on generic catalogue text and leave out the chapter's own reading | doctrine: As written, 'cap each catalogue-description excerpt at 1,500 chars' cuts the end of the structured excerpt, which is where conflicts and the counterfactual sit. For example, Microservices ends with 'Do not sele
- reliability openai-cache-accounting | Record OpenAI cached and reasoning tokens, add prompt_cache_key, then measure before restructuring prompts | doctrine: A deployment-wide prompt_cache_key of the form mode:pass:promptVersion would route different tenants' identical prefixes together under the one provider key. Scope it to owner and project (for example a hash) s
