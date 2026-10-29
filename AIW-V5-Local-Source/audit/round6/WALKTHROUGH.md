# AIW walkthrough: from a brief to the SDD

Taken on AIW v0.10.0-rc.10.73.11 (candidate) at `4a5a62d` with a Playwright probe (headless Chromium, 1440×900, local server, scratch database, no API key). Project: project-cedf7790-1812-4cfb-9acd-5832331ebc7c. The brief is an AIW authored teaching example (a town bike-share service).

## A new project from a brief

Everything starts with words an architect already has: the brief. The Projects gallery takes it typed or as a file, interprets it on the spot and keeps the text as the project’s first source, so every record drafted later can point back to a sentence.

01. **projects** (`01-projects.png`): The Projects gallery before anything exists.
07. **projects-brief** (`07-projects-brief.png`): The brief typed (or read from a .txt/.md/.docx) into the blank template; the interpreted counts appear beside it.
08. **ch1-work** (`08-ch1-work.png`): Chapter 1 Work: the brief is in; the chapter offers "Draft from the brief" and "Draft the whole journey".

> undefined

## A project from a model

A model an architect already has comes in the same way a brief does. The Projects page reads Structurizr DSL, an ArchiMate exchange file, BPMN 2.0, draw.io with C4 or ArchiMate shapes, the C4 subset of Mermaid and PlantUML, or MADR decision records, interprets it on the spot, and keeps the text as the project’s evidence source. Every chapter the model speaks to can then be drafted from it: one card per stated element, each value marked stated or inferred with the model’s own lines beside it, accepted through the same governed commands, every record carrying its provenance.

02. **projects-model** (`02-projects-model.png`): A project from a model file beside the brief: the Structurizr DSL is read on the spot; the reading says what it states (elements by kind, relationships, views) and the brief fills in what a model cannot carry (requirements, outcomes, constraints).
03. **model-ch1-work** (`03-model-ch1-work.png`): Chapter 1 Work of the model project: it offers "Draft from the brief", "Draft from the model" and "Draft the whole journey".
04. **model-draft-ch1** (`04-model-draft-ch1.png`): Chapter 1 drafted from the model: the three people the model states come first, marked Model draft with the DSL lines quoted in the companion; the brief rules draft the rest (a model states no requirement).
05. **model-draft-ch4** (`05-model-draft-ch4.png`): Chapter 4 drafted from the model, opened by its address (?journey=draft&mode=model): one card per container the model states, each value marked stated or inferred with the model's own lines beside it; the requirement each develops is chosen from Chapter 1; nothing is a record until accepted.
06. **model-ch4-model** (`06-model-ch4-model.png`): The same picture, drawn from what the model stated: every record carries provenance mode "model" and the source it came from.

> What is happening underneath: the interpreter splits the brief into numbered passages (P-001, P-002 …) and proposes Chapter 1 records by rule, each value marked stated when it is the passage’s own words and inferred when a rule derived it. No model is consulted at this step.

## Chapter 1 · Requirements drafted, then accepted

The journey draft shows one card per proposed record. Each value says where it comes from; the passages are quoted beside the cards; what the brief does not say stays an open question. Nothing is saved until the person accepts the chapter, and every saved record stays unconfirmed.

09. **ch1-draft** (`09-ch1-draft.png`): The journey draft for Chapter 1: one card per proposed record, each value marked stated, inferred or a gap; the passages quoted in the companion.
10. **ch1-accepted** (`10-ch1-accepted.png`): Accepted: the records are saved through the governed guide commands, unconfirmed, each with its provenance.
11. **ch1-work-filled** (`11-ch1-work-filled.png`): Chapter 1 Work with the drafted records.
12. **ch1-model** (`12-ch1-model.png`): Chapter 1 Model: the journey as a picture.
13. **ch1-validate** (`13-ch1-validate.png`): Chapter 1 Validate: the checks say what is to fix and to confirm.

> Accept runs the same governed guide commands a person uses by hand (start, one answer per question, commit with a preview stamp and reviewed: true). Each created record carries provenance.journey: the mode, the passages, the upstream records and the citations.

## Chapters 2 to 11 · Drafting the whole journey

From here each chapter is drafted from the records accepted before it: quality scenarios from requirements, decisions from constraints and tensions between drivers, responsibilities, components, technology, realisation, contracts and data, threats and controls, the runtime, and the narrative. The person stops at each chapter, reads, skips or edits, and accepts.

14. **ch2-draft** (`14-ch2-draft.png`): Chapter 2 drafted from the upstream records; gaps stay as open questions.
15. **ch3-draft** (`15-ch3-draft.png`): Chapter 3 drafted from the upstream records; gaps stay as open questions.
16. **ch4-draft** (`16-ch4-draft.png`): Chapter 4 drafted from the upstream records; gaps stay as open questions.
17. **ch5-draft** (`17-ch5-draft.png`): Chapter 5 drafted from the upstream records; gaps stay as open questions.
18. **ch6-draft** (`18-ch6-draft.png`): Chapter 6 drafted from the upstream records; gaps stay as open questions.
19. **ch7-draft** (`19-ch7-draft.png`): Chapter 7 drafted from the upstream records; gaps stay as open questions.
20. **ch8-draft** (`20-ch8-draft.png`): Chapter 8 drafted from the upstream records; gaps stay as open questions.
21. **ch9-draft** (`21-ch9-draft.png`): Chapter 9 drafted from the upstream records; gaps stay as open questions.
22. **ch10-draft** (`22-ch10-draft.png`): Chapter 10 drafted from the upstream records; gaps stay as open questions.
23. **ch11-draft** (`23-ch11-draft.png`): Chapter 11 drafted from the upstream records; gaps stay as open questions.
24. **ch11-accepted** (`24-ch11-accepted.png`): Chapter 11 narrative drafted and accepted; the whole journey is in the project.

> Where a chapter needs a value no source states (an owner, a target figure, a retention period), the draft keeps an explicit open answer rather than inventing one, and the checks count it as something to fix.

## The model carries its state

Every chapter’s Model tab draws the same connected model: the Diagram, the chapter’s own views, Layers, Table, Matrix, Whole design and the saved perspectives, with the sidebar’s eight layers filtering every picture. The checks are painted on the elements, a trace lights a requirement’s chain through every layer, and every record has a picture on the Work tab.

25. **ch4-model** (`25-ch4-model.png`): Chapter 4 Model: the logical application drafted from the requirements.
28. **ch4-checks-painted** (`28-ch4-checks-painted.png`): The checks painted on the picture: every element carries its state (to fix, to confirm, passing); the Key explains the glyphs.
29. **ch4-trace** (`29-ch4-trace.png`): Trace: the chain from the selected requirement lights up through every layer and the rest dims; the companion names the chain and its gaps.
30. **ch4-story** (`30-ch4-story.png`): Read as a story: the lit trace told from its records, each sentence from a record's own fields, every gap named.
26. **ch4-layers** (`26-ch4-layers.png`): Layers: one lane per layer.
27. **ch4-matrix** (`27-ch4-matrix.png`): Matrix: requirements against responsibilities, gaps marked.
31. **ch4-build** (`31-ch4-build.png`): Build-up: the picture revealed one layer at a time from the Build menu, with Next, Back and Play; the step is named under the toolbar.
32. **ch4-perspectives** (`32-ch4-perspectives.png`): Perspectives: the explorer's saved perspectives are entries of the same switcher, drawn in the same frame.
36. **ch4-record-picture** (`36-ch4-record-picture.png`): Every record has a picture: on Work the companion shows the selected record's neighbourhood with its checks painted; clicking it opens the Model tab.
37. **ch8-sequence** (`37-ch8-sequence.png`): Chapter 8 as a sequence: lifelines for the components and parties, the contracts' messages in order, request then response.
38. **ch1-story-walk** (`38-ch1-story-walk.png`): Chapter 1 Model, walking the journey: Next moves along the steps and the companion tells the current step as a story, from its requirement through the layers to the running parts, each sentence from a record's own fields and every gap named.

> The words on the picture are the product’s three: to fix, to confirm, passing. Nothing drawn here writes the document; the marks come from the chapter checks, the trace from the connected model, and the alternatives from the saved proposals.

## Proposals, Sol and the help map

One Proposals list holds what the rules, the knowledge, the tasks, the journey draft and Sol’s review propose, each with its source and its own accept path. Sol can review a chapter and its findings are painted on the picture until a person adopts one. The help map shows the eleven chapters by their four tabs.

33. **ch4-proposals** (`33-ch4-proposals.png`): Proposals: one list for rule proposals, knowledge, tasks, the journey draft and Sol's review findings, each with its source and its own accept path.
34. **ch4-review-packet** (`34-ch4-review-packet.png`): Review this chapter: Sol's packet shown first; without a key Sol is not connected and only the packet is shown.
39. **ch4-ask-sol** (`39-ch4-ask-sol.png`): Ask Sol: the packet Sol would see (sources, redactions); without a key the server says Sol is not connected and the rule-based guidance stands.
35. **help-map** (`35-help-map.png`): The help map: eleven chapters by four tabs, what each holds in a phrase, and the glossary.

> In this environment no language model is connected, so Sol answers that it is not configured, the packet it would read is shown, and the rule-based proposals stand. With a key, the same packet goes to the configured provider under strict validation and the answer is receipted.

## Chapter 11 · Review desk, checks and the SDD

Chapter 11’s Model is the review desk (Vitals, What it takes, Trace, the Running board). Validate lists what is to fix and to confirm. Output opens on the SDD readiness board, one tile per chapter, then the document itself.

40. **ch11-vitals** (`40-ch11-vitals.png`): Chapter 11 Model: the review desk opens on Vitals.
41. **ch11-scale** (`41-ch11-scale.png`): The Scale reading: demand derived from the Chapter 2 targets and the Chapter 8 data against the placements, with the reference latency figures; without numeric targets it says so in one line.
42. **ch11-running-board** (`42-ch11-running-board.png`): The Running board: parts in their zones with their state in words.
43. **ch11-validate** (`43-ch11-validate.png`): Chapter 11 Validate: what is to fix and to confirm before the SDD is ready.
44. **ch11-plateaus** (`44-ch11-plateaus.png`): Plateaus on Chapter 11 Work: the design as a current state and a target, each with its readiness; a gap lists what a transition introduces and retires and the actions that carry it.
45. **ch3-madr** (`45-ch3-madr.png`): Chapter 3 Output: the decisions as MADR records, one Markdown file per decision in a zip, beside the chapter's place in the SDD.
46. **ch11-output** (`46-ch11-output.png`): Chapter 11 Output: the SDD readiness board, one tile per chapter, then the editions (executive or full, for everyone, delivery or review), Preview, Download and Freeze.
47. **sdd-preview** (`47-sdd-preview.png`): The SDD preview as the export renders it.

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
| 9 | Threats + controls | 12+12 |
| 10 | Environments + running parts | 9+9 |
| 11 | Narrative | titled |

SDD Markdown: 1053645 bytes. Confirming records, treating findings, the architect review, a frozen baseline and a second person's approval turn a drafted project into a passing SDD; the drafter does none of them.
