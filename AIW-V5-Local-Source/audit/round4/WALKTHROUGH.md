# AIW walkthrough: from a brief to the SDD

Taken on AIW v0.10.0-rc.10.73.9 (candidate) at `eb3d605` with a Playwright probe (headless Chromium, 1440×900, local server, scratch database, no API key). Project: project-4a7e00b8-0138-483d-b7ee-ce5dded9ecde. The brief is an AIW authored teaching example (a town bike-share service).

## A new project from a brief

Everything starts with words an architect already has: the brief. The Projects gallery takes it typed or as a file, interprets it on the spot and keeps the text as the project’s first source, so every record drafted later can point back to a sentence.

01. **projects** (`01-projects.png`): The Projects gallery before anything exists.
02. **projects-brief** (`02-projects-brief.png`): The brief typed (or read from a .txt/.md/.docx) into the blank template; the interpreted counts appear beside it.
03. **ch1-work** (`03-ch1-work.png`): Chapter 1 Work: the brief is in; the chapter offers "Draft from the brief" and "Draft the whole journey".

> What is happening underneath: the interpreter splits the brief into numbered passages (P-001, P-002 …) and proposes Chapter 1 records by rule, each value marked stated when it is the passage’s own words and inferred when a rule derived it. No model is consulted at this step.

## Chapter 1 · Requirements drafted, then accepted

The journey draft shows one card per proposed record. Each value says where it comes from; the passages are quoted beside the cards; what the brief does not say stays an open question. Nothing is saved until the person accepts the chapter, and every saved record stays unconfirmed.

04. **ch1-draft** (`04-ch1-draft.png`): The journey draft for Chapter 1: one card per proposed record, each value marked stated, inferred or a gap; the passages quoted in the companion.
05. **ch1-accepted** (`05-ch1-accepted.png`): Accepted: the records are saved through the governed guide commands, unconfirmed, each with its provenance.
06. **ch1-work-filled** (`06-ch1-work-filled.png`): Chapter 1 Work with the drafted records.
07. **ch1-model** (`07-ch1-model.png`): Chapter 1 Model: the journey as a picture.
08. **ch1-validate** (`08-ch1-validate.png`): Chapter 1 Validate: the checks say what is to fix and to confirm.

> Accept runs the same governed guide commands a person uses by hand (start, one answer per question, commit with a preview stamp and reviewed: true). Each created record carries provenance.journey: the mode, the passages, the upstream records and the citations.

## Chapters 2 to 11 · Drafting the whole journey

From here each chapter is drafted from the records accepted before it: quality scenarios from requirements, decisions from constraints and tensions between drivers, responsibilities, components, technology, realisation, contracts and data, threats and controls, the runtime, and the narrative. The person stops at each chapter, reads, skips or edits, and accepts.

09. **ch2-draft** (`09-ch2-draft.png`): Chapter 2 drafted from the upstream records; gaps stay as open questions.
10. **ch3-draft** (`10-ch3-draft.png`): Chapter 3 drafted from the upstream records; gaps stay as open questions.
11. **ch4-draft** (`11-ch4-draft.png`): Chapter 4 drafted from the upstream records; gaps stay as open questions.
12. **ch5-draft** (`12-ch5-draft.png`): Chapter 5 drafted from the upstream records; gaps stay as open questions.
13. **ch6-draft** (`13-ch6-draft.png`): Chapter 6 drafted from the upstream records; gaps stay as open questions.
14. **ch7-draft** (`14-ch7-draft.png`): Chapter 7 drafted from the upstream records; gaps stay as open questions.
15. **ch8-draft** (`15-ch8-draft.png`): Chapter 8 drafted from the upstream records; gaps stay as open questions.
16. **ch9-draft** (`16-ch9-draft.png`): Chapter 9 drafted from the upstream records; gaps stay as open questions.
17. **ch10-draft** (`17-ch10-draft.png`): Chapter 10 drafted from the upstream records; gaps stay as open questions.
18. **ch11-draft** (`18-ch11-draft.png`): Chapter 11 drafted from the upstream records; gaps stay as open questions.
19. **ch11-accepted** (`19-ch11-accepted.png`): Chapter 11 narrative drafted and accepted; the whole journey is in the project.

> Where a chapter needs a value no source states (an owner, a target figure, a retention period), the draft keeps an explicit open answer rather than inventing one, and the checks count it as something to fix.

## The model and the Brain on a chapter

Every chapter’s Model tab draws the same connected model: the Diagram, the chapter’s own views, Layers, Table, Matrix and Whole design, with the sidebar’s eight layers filtering every picture. Ask Sol shows the packet Sol would see, redactions included.

20. **ch4-model** (`20-ch4-model.png`): Chapter 4 Model: the logical application drafted from the requirements.
21. **ch4-layers** (`21-ch4-layers.png`): Layers: one lane per layer.
22. **ch4-matrix** (`22-ch4-matrix.png`): Matrix: requirements against responsibilities, gaps marked.
23. **ch4-ask-sol** (`23-ch4-ask-sol.png`): Ask Sol: the packet Sol would see (sources, redactions); without a key the server says Sol is not connected and the rule-based guidance stands.

> In this environment no language model is connected, so Sol answers that it is not configured and the rule-based guidance stands. With a key, the same packet goes to the model under strict validation and the answer is receipted.

## Chapter 11 · Review desk, checks and the SDD

Chapter 11’s Model is the review desk (Vitals, What it takes, Trace, the Running board). Validate lists what is to fix and to confirm. Output opens on the SDD readiness board, one tile per chapter, then the document itself.

24. **ch11-vitals** (`24-ch11-vitals.png`): Chapter 11 Model: the review desk opens on Vitals.
25. **ch11-running-board** (`25-ch11-running-board.png`): The Running board: parts in their zones with their state in words.
26. **ch11-validate** (`26-ch11-validate.png`): Chapter 11 Validate: what is to fix and to confirm before the SDD is ready.
27. **ch11-output** (`27-ch11-output.png`): Chapter 11 Output: the SDD readiness board, one tile per chapter, then Preview, Download and Freeze.
28. **sdd-preview** (`28-sdd-preview.png`): The SDD preview as the export renders it.

> A drafted project is not a passing SDD: the gaps are to fix and every record is to confirm until a person confirms it, treats the findings, records the architect review, freezes a baseline and a second person approves. The board says so in words, never as a percentage.

## What the journey produced

| Chapter | Records | Count |
|---|---|---|
| 1 | Requirements and context records | 45 |
| 2 | Quality drivers | 9 |
| 3 | Decisions | 5 |
| 4 | Logical responsibilities | 9 |
| 5 | Application components | 9 |
| 6 | Technology capabilities | 9 |
| 7 | Technology realisations | 9 |
| 8 | Contracts + data definitions | 8+8 |
| 9 | Threats + controls | 10+10 |
| 10 | Environments + running parts | 9+9 |
| 11 | Narrative | titled |

SDD Markdown: 359385 bytes. Confirming records, treating findings, the architect review, a frozen baseline and a second person's approval turn a drafted project into a passing SDD; the drafter does none of them.
