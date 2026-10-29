# Round 8 · The journey audited, from a new project to the SDD

AIW v0.10.0-rc.10.73.13 candidate · branch `claude/dazzling-cerf-a3qshh` · controlling baseline rc.10.73.6 ·
`productionAccepted` stays false.

## How it was taken

- **What was driven.** A blank project created from a brief file (the neighbourhood bike-share teaching brief, read in
  the browser), Chapter 1 drafted and accepted, then the whole journey drafted and accepted chapter by chapter to
  Chapter 11; Chapters 2, 5, 8 and 10 opened on every tab; Chapter 11's five work stages, five model views, Validate and
  Output; the SDD exported in its editions; the sidebar's Sources and Changes, the help map, Ask Sol, Proposals and the
  project gallery.
- **How.** A headless Chromium probe at the owner's screen size, 1894 × 960, on the round-7 build. It took 86 steps
  and 77 screens and recorded, per screen, the headings, repeated phrases, tiny text, empty states, scroll and timing.
- **What failed.** Nothing in the product: 0 page errors, 0 console errors and 0 failed API calls across the run. Nine
  probe steps were skipped because the probe's own selector or expectation was wrong; none of them is a product fault.
- **What changed since.** The screens were taken on the round-7 header, which the owner then rejected. The header is
  back to its round-6 layout, shorter, with a collapsible right panel (DESIGN.md §4, A′). Findings about the header
  itself are therefore superseded and are not listed.

Severity: **blocks** (the journey cannot continue), **slows** (costs time or invites a wrong step), **jars** (looks
wrong, contradicts itself or says something false), **polish**. Effort: **hour**, **day** or **week** of focused work.
Status: **taken** (done in this round, with its proof in the round's report) or **open** (the owner's to order).

No finding blocks the journey. A first-time architect can go from a brief to an exported SDD without an error.

## What already works

- Every drafted value says where it comes from: the brief passage, the upstream record, or an open question.
  Nothing is saved until the chapter is accepted, and every saved record stays unconfirmed.
- "Sol was not consulted: the deterministic draft stands" tells the reader exactly what produced the draft.
- The pictures carry the work: Chapter 1's journey map, Chapter 2's utility tree, Chapter 5's application diagram,
  Chapter 11's vitals, "What it takes" and the trace each read well on their own.
- The SDD readiness board on Chapter 11 states, chapter by chapter, what passes, what to fix and the next step.
- The gallery card says plainly how far the design is from a reviewable SDD.

## The biggest problems, in one line each

1. The same thing is counted three different ways on three screens.
2. The readiness meter does not move when a chapter is drafted, so eleven drafted chapters all read "0 of N".
3. A 45-card draft is one long scroll, with the same five questions repeated as labels on every card.
4. Output buries the export and the handoff under a register that repeats the same two lines on every row.
5. Drafted names grow by concatenation down the chapters, and every decision gets the same two placeholder
   alternatives.
6. A selection made in one chapter follows the person into the next, where the panel shows a record from elsewhere.

## Findings by phase

### 0 · Arrival and creation

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-01 | The footer and the browser tab say "Live Model Explorer"; the top bar says "Intelligent Architecture Workbench". | jars | hour | One product name everywhere. | taken |
| J-02 | The empty gallery shows two "create" buttons, one in the hero and one in the empty state. | polish | hour | Keep the hero's. | open |
| J-03 | The create dialog scrolls: seven reference cards push "Opening brief" and "start from a model file" below the fold. | slows | day | Two columns: the starting point as compact choices on the left, the chosen one's inputs on the right. | open |
| J-04 | "Reference · drafted from its brief · confirm before use" repeats on five cards. | polish | hour | Say it once above the group. | open |
| J-05 | The brief's 64-character SHA-256 is shown in full in the dialog and in Chapter 1's Source line. | polish | hour | Twelve characters, the full hash in a title. | taken for Chapter 1; open in the dialog and Sources |
| J-06 | The brief file picker sits under the text box it fills. | polish | hour | Put the picker first, or beside the box's label. | open |

### 1 · Chapter 1 before drafting

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-07 | The brief shows as one run-on paragraph: its headings and lists are flattened. | jars | hour | Keep the brief's line breaks. | taken |
| J-08 | "Draft from the brief", the chapter's main move, sits below the fold under a long brief. | slows | hour | While the chapter is empty, a "Draft Chapter 1 from the brief" call to action above the brief. | open |
| J-09 | A blank project shows the reference-project note and the next thought "Review the reference content". | jars | hour | Show both only on reference projects; on a blank one, point to the draft. | taken |
| J-10 | The meter reads "0 of 6" with no word of what a milestone is. | polish | hour | Name the next milestone in the meter's title. | open |
| J-11 | Empty sections say "Add an artefact" and not that the draft fills them. | slows | hour | "Draft from the brief fills this section, or add one by hand." | open |
| J-12 | The Add dialog says "from the first band only", a term no architect knows. | jars | hour | "From this chapter's own records." | taken |
| J-13 | The inspector says "1 confirmation items". | polish | hour | Correct the plural. | taken |
| J-14 | The empty Model card offers three "New …" actions but not the draft. | slows | hour | Add the draft to the empty card when the chapter can be drafted. | open |
| J-15 | Empty Output makes "Export project JSON" the primary action and invites "Review & carry forward" with nothing in the chapter. | jars | hour | The draft as the primary action; the handoff disabled with "nothing to carry yet". | open |

### 2 · Drafting Chapter 1

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-16 | Two dark primary buttons under the brief: "Review & edit brief" and "Draft from the brief". | jars | hour | One primary, the draft, while the chapter is empty. | taken |
| J-17 | "Next: Confirm the project brief" competes with the draft on an empty chapter. | slows | hour | On an empty chapter the next step is the draft. | open |
| J-18 | 45 cards in one scroll, with no summary by kind and no way to skip a kind. | slows | day | A head that counts by kind (outcomes, actors, requirements …), each kind a collapsible group with "Skip all of this kind". | open |
| J-19 | Every card repeats the same five questions as row labels. | polish | hour | Short labels (Kind, Outcome, Description, Owner, Source), the question as a title. | open |
| J-20 | Drafted titles are cut mid-sentence without an ellipsis. | jars | hour | End a cut title with "…". | taken |
| J-21 | "0 upstream records" shows on cards that have none. | polish | hour | Hide the line at zero. | open |
| J-22 | A template acceptance criterion ("Given [the starting condition] …") is shown as an inferred value. | jars | hour | Show a template as "To write", with the template as a placeholder. | open |
| J-23 | A select shows its first option as if chosen while the line beneath says "Open question". | jars | hour | Select an explicit "— open —" choice. | open |
| J-24 | "Accept chapter · 36 records" counts down while records save. | jars | hour | "Accepting the chapter…" while saving, with the progress line. | taken |
| J-25 | After 45 records are accepted the meter still reads "0 of 6"; after the whole journey every chapter reads 0. | jars | day | Make "records drafted" the first milestone, or show "45 records · 0 confirmed" beside the meter. | open |

### 3 · Chapter 1 after drafting

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-26 | Three counts for one thing: Validate says 91 to confirm and 12 to fix, the inspector 46, Output 37 and 9. | jars | day | One counting function for findings and confirmations, with the unit named (findings or passages). | open |
| J-27 | Twelve findings of the same kind are listed one card per object. | polish | hour | Default to "By kind" when one kind dominates. | open |
| J-28 | "Previous · Page 1 of 1 · Next" on a single page. | polish | hour | Hide the pager on one page. | open |
| J-29 | The action "Treat" is an unclear verb. | jars | hour | "Decide" or "Mark handled", with the choices named. | open |
| J-30 | The "Validation recorded" toast lands over Ask Sol and Proposals. | polish | hour | Toasts at the bottom right. | open |
| J-31 | Output repeats "Confirm the drafted record / Review the draft" on every row, and the export and handoff sit under 47 rows. | slows | hour | One line per row with the record's own gap; the export and handoff beside the counts at the top. | open |
| J-32 | Every requirement card says "COVERED BY no Chapter 4 responsibility" in red before Chapter 4 exists. | jars | hour | Say "Chapter 4, when it is drafted" until Chapter 4 has records. | taken |
| J-33 | The companion lists all nine requirement titles as one wall of text. | polish | hour | The count and the first two, then "and 7 more". | open |

### 4 · The whole journey, Chapters 2 to 11

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-34 | The same two knowledge passages ("Facade Pattern", "Secure Communication") appear on nearly every chapter. | jars | day | Match passages by the chapter's topic and the record in view; show none when the match is weak. | open |
| J-35 | The method head repeats across chapters ("Compare structure before choosing technology" on 3, 4 and 5). | polish | hour | One method line per chapter. | open |
| J-36 | Each chapter change raises a toast over the header controls while the heading already names the chapter. | polish | hour | No toast when the heading is on screen. | open |
| J-37 | Names grow by concatenation: "Compute for Bike handling service implementation"; threats read "Disclosure of Bike". | slows | day | A short naming rule per chapter, and the name field first on each card. | open |
| J-38 | Every decision gets the same two alternatives: "Keep it within one owned boundary" or "Separate it". | jars | day | Draw alternatives from the constraint's kind, or label them plainly as placeholders. | open |
| J-39 | Inferred values mix lowercase ("service", "bike", "string") with capitalised ones. | polish | hour | Sentence-case inferred values for display. | open |
| J-40 | Chapter 10's environment bar takes two rows above the draft. | jars | hour | One 36 px row; hide it until an environment exists. | taken (one row); open (hide while empty) |
| J-41 | Chapter 11's narrative is one record of long concatenated fields. | slows | day | Short lists per section, one line per decision, the reasoning kept in the ADRs. | open |
| J-42 | From Chapter 2 on, the draft has no summary of its open questions, though its cards carry many. | polish | hour | Count them at the packet's head: "12 open questions on 9 cards". | open |

### 5 · Chapters after the journey (2, 5, 8 and 10, every tab)

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-43 | A selection follows the person across chapters: Chapter 5 opens on Chapter 4's LR-001, Chapter 8 on Chapter 5's APP-001. | jars | hour | Clear the selection on a chapter change unless the record belongs to the new chapter. | open |
| J-44 | The panel stacks four blocks for one record: a neighbourhood graph, history tabs, details and a "Follow this object" card. | jars | day | One record card: title, state, gaps, a small neighbourhood, and "Follow this object" as a link. | open |
| J-45 | Utility-tree cards carry three noise lines, and every drafted driver is marked Critical. | jars | day | One "no tactics named" line; drafted drivers start unranked with a prompt to rank. | open |
| J-46 | Drafted records carry a "User-authored" pill. | jars | hour | Read the pill from the record's provenance: "Journey draft", "From the brief", "Sol" or "You". | open |
| J-47 | The "Explain" hover card holds eleven lines and covers the card it explains. | jars | day | Three lines: what it is, what it links to, what is open. | open |
| J-48 | The panel squeezes three-column tables into 300 px, wrapping their headers. | jars | day | Sections as one scrolling list; tables only where the columns fit. Collapsing the panel now gives the stage the width. | open |
| J-49 | Panel actions repeat the card's own actions ("Edit component · Connect" beside "Edit · On model"). | polish | hour | Keep one set. | open |
| J-50 | A contract card has four actions with two emphases. | polish | hour | One primary. | open |

### 6 · Chapter 11 and the SDD

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-51 | The architecture case shows four empty tiles before a case is chosen. | polish | hour | Show the tiles once a case is chosen; before that, the choice alone. | open |
| J-52 | "1 things to look at" on the vitals and the running board. | polish | hour | Correct the plural. | open |
| J-53 | The export form sits under an eleven-card readiness board. | slows | hour | The export and freeze actions beside the board's totals. | open |
| J-54 | The full SDD edition is about 1 MB and 64,000 words for a 45-record project; the five largest sections are chapter handoffs. | slows | week | One register per chapter in the full edition, with handoffs as links to it. | open |
| J-55 | Box titles truncate in the running board and design rationale diagrams. | polish | hour | Two-line titles, the full title on hover. | open |

### 7 · Around the journey

| ID | Finding | Severity | Effort | Recommendation | Status |
| --- | --- | --- | --- | --- | --- |
| J-56 | Ask Sol lists findings as "error: Make acceptance testable", which reads like a crash. | jars | hour | "To fix: Make acceptance testable". | open |
| J-57 | The empty Changes dialog fills the screen to say two sentences. | polish | hour | Size the dialog to its content. | open |
| J-58 | The header and its assistance row took 280 px above the studio in round 6; round 7's compact header was rejected. | slows | day | The round-6 layout, shorter, with a collapsible right panel. | taken (A′) |

## SDD editions, as measured

On the bike-share project after the whole journey:

| Edition | Status | Size | Words | Figures |
| --- | --- | --- | --- | --- |
| Full, Markdown | 200 | 1,053,098 B | 64,239 | 20 |
| Full, HTML | 200 | 1,199,010 B | 74,273 | 20 |
| Executive, Markdown | 200 | 79,528 B | 4,973 | 4 |
| Full with Mermaid figures | 200 | 314,211 B | 43,280 | 19 |

Without its figures the full Markdown edition is 234,408 B and about 36,000 words. The delivery and review audiences
were fetched separately on the bank reference project: delivery 4,718 words and review 9,897 words without figures,
against 26,859 for everyone. The probe's request for an "edition=delivery" was refused with "Choose the executive or
the full edition."; delivery is an audience, not an edition, so that refusal is correct.

## The order recommended

1. **J-26 · One count.** Trust in every other number depends on it.
2. **J-25 · Readiness that moves.** Drafting is the biggest step in a chapter, and the meter should show it.
3. **J-18 and J-19 · A draft a person can review.** Group by kind, skip a kind, short labels.
4. **J-43 and J-44 · A panel about this chapter.** Clear stale selections, then one record card.
5. **J-31 and J-53 · Output leads with its document.** Export and handoff at the top, one line per row.
6. **J-22, J-23 and J-42 · Open questions look open.**
7. **J-08, J-11, J-14, J-15 and J-17 · The draft is the primary action wherever a chapter is empty.**
8. **J-37, J-38 and J-41 · Better drafted names, alternatives and narrative.**
9. **J-34 · Knowledge matched to the chapter.**
10. **J-45 and J-47 · Fewer, truer marks on the pictures.**
11. **J-03 · A create dialog that fits.**
12. **J-54 · A shorter full SDD.**
13. **The polish items**, as one batch.

## Taken in this round

J-01, J-05 (Chapter 1), J-07, J-09, J-12, J-13, J-16, J-20, J-24, J-32, J-40 (one row) and J-58. Each is listed in the
round's report with the suite that proves it.
