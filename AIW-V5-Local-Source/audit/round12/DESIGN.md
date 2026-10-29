# Round 12 · A real project: from a 1,400-requirement workbook to an SDD an architecture board would accept

Baseline: `ba239d6` (AIW v0.10.0-rc.10.73.16). Branch `claude/dazzling-cerf-a3qshh`. Controlling baseline
rc.10.73.6; `productionAccepted` false. Release field at the close of this round: AIW v0.10.0-rc.10.73.17.

Asked for (the owner, verbatim intent): use the SEABaaS core-banking workbook to critically enhance, expand and refine
AIW so that it handles such projects in a way that makes sense and delivers the AIW vision; implement every identified
gap and improvement opportunity fully; make the design decisions needed; and produce an SDD that looks like the
reference SDD the owner supplied.

Client material stays out of the repository. The workbook and the reference SDD are the owner's documents: neither is
committed, and nothing here quotes their content beyond structure and counts. The 1,400-row acceptance workload keeps
running from a supplied file, and a synthetic workbook of the same shape (generated, no client text) runs in the
regression.

## 1. What the exercise showed

The workbook was imported through AIW's own intake and the design was drafted through AIW's governed commands by Sol
(5,109 records, 65 responsibilities on 18 components, 87 contracts, 11 threats, 19 controls; nothing confirmed; every
change attributed to the drafting account with the reason "not reviewed by a person"). The full gap register is
`audit/round12/GAP-REGISTER.md` (AIW gaps only); the headline:

- **The SDD is a register dump, not a design document.** 53.4 MB of Markdown; 70% of it is the change history; the
  figures shrink labels below 1 pt in print; requirements repeat ungrouped; 19,496 PDF pages; 86–125 s per export.
- **AIW cannot think in groups.** The drafter makes one design record per requirement and stops at 500 per chapter;
  nothing can link to a requirement group or theme; seven workbook columns are dropped; every requirement becomes
  "Must".
- **AIW does not stay usable at this size.** One save takes about 69 s once the design is in; every chapter freezes the
  browser for about 40 s; requirement copies inflate the document twelvefold.
- **Provenance cannot say "drafted, not reviewed".** A governed batch requires `reviewed:true`; an unattended draft is
  indistinguishable from a person's work except in free text.
- **There is no core-banking grounding**: no ledger, end-of-day, interest, multi-currency, KYC/AML or regulatory
  reporting knowledge or checks.

## 2. The target document

The reference SDD is an attribute-driven design document of about 60 pages. Its order and what each part needs from
AIW:

| Reference part | What it holds | AIW source | What AIW adds this round |
| --- | --- | --- | --- |
| Cover, contents | title, document type, authoring group, contents with page numbers | project, narrative | cover block and a generated contents list; page numbers in Word and PDF |
| 1. Introduction | purpose, key functionalities, target users, business problems solved, a stakeholder persona table (role, motivations, wishes, concerns, how they use it, expected benefits) | brief, outcomes, requirement groups, actors, stakeholders | stakeholder persona fields; key functionalities from requirement groups; business problems from the brief and outcomes |
| 2. Architectural drivers | business, functional, quality, constraint, operational, data, technology-evolution and business-continuity drivers, each with an id (BD1, FD1, QD1, C1, OD1, DD1, TE1, BC1), description, impact on the architecture and priority, then one summary table | outcomes, requirement groups, quality drivers, constraints | one driver register with kinds; impact and priority on every driver; functional drivers drawn from requirement groups; stable display codes |
| 3. Architecture decisions | grouped as foundational, structural, cross-cutting, trade-offs and additional; each with the decision, justification naming driver codes, alternatives considered and why rejected, impact (gains and costs), stakeholders, dependencies, licensing, skills, documentation | Chapter 3 decisions and alternatives | decision category, impact, stakeholders, dependencies, licensing, skills, documentation; rejection reason per alternative; justification printed with driver codes |
| 4. Components, interfaces, properties and composition | the architectural styles; each component's responsibilities and the drivers it serves; one specification table (responsibilities, properties, technologies, interfaces, dependencies, architectural solution, drivers); per component its interfaces, data and coupling; how components serve each quality driver; each external integration with purpose, data formats, protocols, security, challenges and how the architecture handles it | Chapters 4–9 records, `componentSpec` | component properties and pattern fields; technologies and interfaces derived from Chapters 6–8; integration fields on parties; a per-quality-driver interaction reading |
| 5. Architecture models | C4 context, container and component diagrams, and the deployment diagram, each with its purpose | notation scenes | figures with a node budget, grouped above it, drawn at a printable scale, with short text alternatives |
| 6. Model refinements | how the model moved between versions | baselines, plateaus, change summary | a refinement section from baselines and the change summary |
| 7. Appendix | the requirements analysed by functional area, each mapped to components | requirement groups and traceability | a per-group mapping; the complete requirement-to-component matrix as an annex file, not in the body |

The registers (the full requirement list, the change journal, every record's fields) move to **annexes**: separate,
paged exports (Markdown, CSV and JSON), linked from the document, never printed in its body.

## 3. Design decisions

Each decision is made here, with its reason; the owner may reverse any of them.

1. **D-01 · The SDD's default edition is the architecture document of §2.** The executive edition stays as the
   two-page reading; the delivery and review audiences become views of the architecture document (delivery: §4, §5 and
   obligations; review: §2, §3, open items and assurance). The old register-shaped full edition is retired; its content
   lives in the annexes.
2. **D-02 · One driver register with kinds.** Chapter 2 becomes "Architectural drivers". A driver has a kind (business,
   functional, quality, constraint, operational, data, technology evolution, business continuity), a description, an
   impact on the architecture and a priority (High, Medium, Low). A quality driver keeps its scenario and measurable
   target; the other kinds do not need one. Display codes (BD1, FD1, QD1 …) are assigned in order within a kind and kept
   when records are added. Business drivers can be drafted from outcomes, functional drivers from requirement groups,
   constraint drivers from Chapter 1 constraints.
3. **D-03 · Requirement groups are records.** A group (`RG-nnn`) is a functional area, theme or module with a title, a
   kind, a description and its members (explicit ids, or a rule on imported attributes such as domain or capability
   theme). Drivers, decisions, responsibilities and components may link groups; traceability expands a group to its
   members. The intake creates groups from the domain and capability-theme columns.
4. **D-04 · Links keep fingerprints, not copies.** A record that links a requirement keeps its id and a fingerprint
   (revision and hash), not the whole requirement. Source-change detection compares fingerprints. Documents shrink
   back to the size of their content.
5. **D-05 · The change history is summarised incrementally and printed as a summary.** Each save updates the summary
   instead of rebuilding it; the SDD prints the latest change per record and the open reviews by cause; the journal is a
   paged annex; affected reviews are grouped by cause, so one change to a shared record is one review, not 50,000.
6. **D-06 · Authorship is recorded.** Every commit records who or what wrote it: a person, an import, or a Sol draft
   that no person has reviewed. A governed batch may be sent with `reviewed:false` and `authorKind:'sol-draft'`; its
   records carry "Drafted by Sol · not reviewed" until a person reviews them. Nothing about approval changes: a draft
   can never be confirmed, accepted or approved by its author kind.
7. **D-07 · Richer decisions, components and parties**, exactly the fields §2 lists. The alternative cap rises to 12.
8. **D-08 · Stakeholder personas** on Chapter 1 stakeholders: motivations, wishes, concerns, how they use the system,
   expected benefits.
9. **D-09 · The intake keeps every column** as a typed field (user group, capability theme, PGL link, source basis,
   mapping method, source reference, source authority), prefers the capability-theme column for capability, sets the
   priority from a priority-band mapping the person can change at inspect, proposes stakeholders from user groups and a
   brief from the workbook's other sheets, offers bulk confirmation, flags pasted markup, and groups its findings by
   cause. The "missing evidence" finding clears when evidence is linked or a reviewed treatment says why none exists.
10. **D-10 · The drafter drafts an architecture.** Drivers per concern and group, responsibilities per requirement group,
    components per domain, decisions per theme; imported requirements are placed on journey steps by their group.
    Drafting runs as a background job with progress, in time linear in the number of records.
11. **D-11 · Speed at size is a requirement.** Targets on the SEABaaS-size project: one save under 2 s; committing the
    whole drafted design under 15 minutes; an SDD export under 10 s; a chapter's first picture under 5 s in the browser.
    Exports are cached per revision and built off the request path.
12. **D-12 · Fields say "not stated" instead of inventing.** Required enumerations gain a not-stated value; replica
    counts become optional; a runtime plan gains an availability target, an operating schedule and a batch window, a
    path its trust boundary and a plan its requirement links; data classification gains "not classified yet". Link
    limits refuse loudly instead of truncating; updates keep the links they do not mention.
13. **D-13 · AIW-seeded records are proposals.** Contracts seeded from interactions, plans and paths created from an
    environment, needs drafted from cue words: each is a proposal the author can complete, keep or delete, and editing
    it makes it authored.
14. **D-14 · Core-banking grounding without bending the doctrine.** A deterministic core-banking lens (rules, not
    knowledge claims) checks that the design addresses the concerns a core-banking platform must (posting and ledger,
    end of day, interest and charges, multi-currency, KYC and AML, regulatory reporting, maker-checker and segregation of
    duties, audit history, availability and recovery, migration and coexistence) and raises open questions where it
    does not. A sourced core-banking knowledge pack is prepared as candidate knowledge with its review pack for the
    four-eyes knowledge approver; until a person releases it, it informs nothing, as the doctrine requires.
15. **D-15 · The screens work at this size**: the import summary leads Chapter 1; companion text groups instead of
    listing; long titles are clipped; a large picture opens fitted; the change banner counts causes, not records; the
    first-steps tour shows once.

## 4. Workstreams

Each workstream works in its own git worktree, commits there once its suites pass, and is audited and merged by the
lead (no check deleted, no client text, no model identifier). Ownership is by file, to keep merges clean.

| # | Workstream | Decisions | Owns | State |
| --- | --- | --- | --- | --- |
| A | Speed at size: fingerprints instead of copies, an incremental change summary grouped by cause, per-command cost, export caching, browser load | D-04, D-05, D-11 | project-storage, changes, document-memo, the worker command path, snapshot helpers | fingerprints merged; the rest resumed after the container restart |
| B | A faithful intake and requirement groups: every column typed, priority from bands, groups from domains and themes, proposed stakeholders and brief, bulk confirm, evidence treatment, findings by cause, the synthetic acceptance workbook | D-03, D-09, D-15 (Chapter 1) | intake, workbook reader, requirement groups, the Chapter 1 page | merged |
| C | The core-banking lens (rules) and a candidate knowledge pack pending its approver | D-14 | domain-lens, lenses/, candidate-sets/ | merged |
| D1 | The records the reference SDD needs: drivers by kind with stable codes, decision and component fields, stakeholder personas, group links and the one requirement-links reader, open fields, record lifecycle (proposed, authored, retired), business rules and parameters, patch semantics | D-02, D-07, D-08, D-12 (its records), D-13 (lifecycle) | quality, decisions, logical, realisation, Chapter 1 records, design-spec | running |
| D2 | Fields that say "not stated": runtime targets and schedule with batch windows, parties as external integrations, classification and personal data, trust boundaries, seeded records as proposals, grounding links below Chapter 4, patch semantics | D-07 (parties), D-12, D-13 | runtime, technology, technology-realisation, interfaces, security | running |
| D3 | Authorship and governance: who or what wrote a commit (person, import, Sol draft not reviewed), reviewed:false drafts, reviews grouped by cause in the screens, provenance printed in the SDD | D-06 | the worker command path after A, workbench apply, provenance readers | after A and D1 |
| E | A drafter that drafts an architecture: drivers per concern and group, responsibilities per requirement group, components per domain, decisions per theme, requirements placed on journeys, drafting as a background job | D-10 | journey-drafter, brief-interpreter, the journey route, jobs | after D1 and D2 |
| F | The SDD as an architecture document (SDD-SPEC.md): editions, audiences, annex exports, Word and PDF with contents and page numbers, figures within a node budget | D-01 | sdd-document, sdd-figures, sdd-renderer, review-documents, review-pdf, the export route | after D1, D2 and A |
| G | Screens at size: import summary, grouped companion, clipped titles, fitted pictures, banners by cause, the review desk at size | D-15 | the shell and model views, the review desk | after A |
| R | Regenerate the SEABaaS design through the new AIW with the new fields, export the architecture edition and compare it with the reference, section by section | — | scratch only (client material) | after F |
| P | Pictures at size: a node budget with grouped overviews and detail figures, labels at 7 pt or more at A4 width, short text alternatives, a Mermaid guard, the matrix figure by group, pictures that open fitted, the Running board and first picture under 5 s | D-11, D-15 (pictures) | sdd-figures, mermaid-figures, notation model, layout, renderer and view, model-stage, the picture layouts | running |
| D4 | Records at depth: the record gaps found in D1's and D2's files beyond their briefs (reliability and operability qualities, assessments in step with drivers, citations on drivers and decisions, per-record stamps in Chapters 8-10, accounting invariants, batch contracts, maker-checker controls, further technology categories, seeding switched off) | D-07, D-12, D-13 | D1's and D2's record domains, after they merge | after D1 and D2 |
| A3 | Baselines, recovery and storage at size: the freeze as a job with parts outside the working document, chunked recovery, import revisions as deltas | D-11 | baselines, recovery, project storage after A | after A |
| B2 | Intake at depth: saved mappings on re-import, journalled source-assertion changes, repeated statements compared, an enrich mode for further sheets, typed dates, statement checks, the source-data findings the import surfaces | D-09 | intake, workbook reader, assurance (B's files) | after A |
| K | Domain knowledge at depth: retrieval that knows domain terms and returns nothing below a relevance margin, catalogue integrity, banking topics and regulation as candidate knowledge with review packs; nothing counts until the four-eyes approver releases it | D-14 | knowledge retrieval, catalogue, candidate sets | after D1 |
| BRAIN | Sol drafts the architecture, theme by theme: a contract in which the model proposes drivers with description and impact, decisions with alternatives, a preferred option and a justification per driver, components with responsibilities in sentences, integrations with protocols, data, controls, batch work and open questions, each cited, guarded and reviewed, applied as proposals; a cross-cutting pass; the job in mode sol beside the rules skeleton | D-10 (corrected), D-16 | intelligence-service, drafting-service, the model half of architecture-drafter, a new contract module | running |
| M | AIW connects to several models: a provider registry (OpenAI, OpenAI-compatible, Anthropic), a model per mode with fallbacks, receipts naming provider and model, budgets and cost per provider, the organisation's view | D-17 | intelligence-provider, intelligence-anthropic, settings, the organisation's provider view | running |
| C2 | A content standard for the SDD and the reviewer gate: what a reader must find in prose per section, a suite that scores a document and fails a skeleton, the rules drafter's hygiene, a page-by-page read recorded against the export's hash before delivery | D-16 | SDD-SPEC, sdd-content, the rules half of architecture-drafter, the gate template | running |

The verified register of every gap, its owner and its acceptance test is `audit/round12/GAP-REGISTER.md` (machine-readable: `gap-register.json`); what only a person or outside access can close is marked EXT there and never "implemented".

The shared readers `public/open-fields.js` (stated, not stated, open question) and `public/priority-scale.js` (one
ordinal level for every priority scale) were written by the lead so that D1 and D2 build on one definition.

## 5. Correction after the owner's review (2026-10-08)

The owner read the SDD printed from the drafted design and judged it not a design document. The audit agreed: no model had
reasoned in this environment (the network denied the providers; every word attributed to Sol came from deterministic code
or from the lead's own transcription scripts); the rules drafter groups and counts, names entities from sentence fragments
and lists Playbook options without reasoning; the document printed that faithfully as hundreds of "open: … not stated"
marks; and the round's tests measured shape (sections, counts, sizes, speed), never substance. Three decisions follow.

- **D-10, corrected.** The drafter that drafts an architecture is Sol with a model, theme by theme, under AIW's packet,
  guard, review and receipt machinery, proposing the design itself with explicit, separable interpretation; the rules
  path is a labelled skeleton and a fallback, never the design. (Workstream BRAIN.)
- **D-16, the content standard.** The SDD specification says what a reader must find in prose for each section to count
  as written; a suite scores a document against it and fails a skeleton; no document is delivered without a page-by-page
  read recorded against its hash. (Workstream C2.)
- **D-17, several models.** AIW connects to several providers and models at once, routes each mode to a model with
  fallbacks, and records which model answered each pass. (Workstream M.)

The live pipeline was verified on 2026-10-08 once the owner opened the network: field drafts in the eleven chapters, the
Chapter 1 journey draft and the Chapter 4 review completed with receipts on two OpenAI models; the grounding review
withheld drafts that added words the cited excerpts do not support, as designed. Evidence stays in the session's scratch.

