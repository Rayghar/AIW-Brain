# Grounded LLM integration

## Implemented

The existing Ask Sol and Mind Factory companions support a natural-language request, source inspection, generation and reopening saved responses. Developing the design and writing explanations are tasks inside those companions. The canvas stays in view. Existing deterministic actions remain available.

The first provider adapter uses the OpenAI Responses API with strict structured output, a 45-second timeout, a 6,000-token output ceiling, no tools and `store: false`. The browser never receives the API key. The endpoint is fixed to `https://api.openai.com/v1/responses`; redirects are rejected. Response structure, length and cited source identifiers are checked before a result can enter a review workflow. These checks establish source identity, not semantic truth.

Retrieval is bounded to the selected saved object and its connected requirements, drivers, decisions, nearby objects and constraints; up to four matching passages from the current project's saved sources; and up to three related records from the eight-record AKR pilot. It uses transparent lexical matching, not embeddings or live repository search. The source packet contains at most 22 excerpts and 28,000 excerpt characters, with truncation and omission labels. Knowledge is reserved immediately after the selected object, before optional neighbours can crowd it out. Current-record excerpts omit historical snapshots and internal generation/basis fields. Model context freshness still uses the full saved basis. Knowledge excerpts are capped at 6,000 characters each; provenance receipts remain separately attached.

Generated boundary options can start the established application/technology guided task in Chapters 1–7. Saved values win over generated suggestions. Ownership, interaction semantics, capability category and boundary identifiers require the existing human choices. Model records change only after the normal proposal preview and explicit acceptance. Other chapters support contextual explanations and questions while retaining their native design actions.

Explicit pattern questions remain explanatory unless the request also asks about boundaries. The server sets the available proposal capability and rejects unsupported boundary options. Matching passages identify whether the topic arose in the saved design or only in the user's question. Neither establishes suitability or satisfies a prerequisite. Matching rationale, prerequisite uncertainty, risks and original receipts persist in the saved generation record and editable explanation.

Generated explanations become private editable co-author drafts. Reviewed text alone enters the working SDD. Provider/model, request, exact source packet, assumptions and source references persist. Changed model context or retrieved source revisions require renewed review. Accepting model changes refreshes the task's reviewed context without rewriting its original generation receipt. Frozen SDD baselines stay fixed.

Private request metadata uses the new additive `intelligence_runs` table; source packets and responses use owner-scoped R2 objects. Request IDs prevent repeat generation on a replay. A single active request per project and ten attempts per owner per hour bound the pilot. Generation does not alter the project revision. Result adoption uses the project's existing revision checks. Refused, incomplete or invalid responses never create model records or accepted passages.

## Activation status

The site's hosted runtime initially had no environment variables. The user's earlier AIW configuration supplied an existing OpenAI key and the `gpt-4.1-mini` model setting. A real Responses API request through the new adapter returned HTTP 200, a schema-valid draft and source reference S1. The returned model was `gpt-4.1-mini-2025-04-14`. This check used a synthetic equipment-reservation requirement, not actual project content.

`OPENAI_API_KEY` is now configured as a secret and `AIW_LLM_MODEL` as `gpt-4.1-mini` in Sites environment revision 1, applied by this release's publication. The key is not included in source, client assets or this report. `.env.example` documents the local equivalent.

Configured status only reports that the required settings exist. The UI distinguishes that from a saved provider response. The live adapter check establishes working credentials and response compatibility; it does not establish broad architectural quality or a production browser walkthrough.

This increment does not connect the full knowledge repository, introduce vector search, add other LLM providers or claim FPA/MSA conformance. It keeps the established need → quality → decision → responsibility → support → interface/protection/operation reasoning sequence and review boundaries.

## Verification

- Actual Worker and in-memory database/R2 fixture checks: source-preview gate, missing configuration, no cross-origin writes, owner isolation, stable saved responses, duplicate protection, hourly budget, source staleness and safe adoption.
- Mock provider checks: exact request shape, server-only credentials, strict schema, bounded source references, refusal, incomplete output, authentication error, timeout and storage failure.
- Separate live provider check: one synthetic author request returned HTTP 200, a valid draft, source reference S1 and an explicit question about missing ownership. The actual adapter received 796 input tokens and 216 output tokens. This was not a production Site walkthrough or a broad model-quality evaluation.
- Co-author and guided-design regression checks: unchanged accepted text while editing, source-review separation, immutable baselines, non-banking fixtures, explicit model acceptance and preserved subsequent change detection.
- DOM integration: inactive/active configuration states, source inspection before generation, visual option elements, existing guided-design entry, co-author review, saved origin and reopen. DOM checks do not validate rendered layout.
- The browser connection again timed out during tab enumeration after 20 seconds. No rendered desktop/mobile inspection or screenshot was obtained.
- The build loads the packaged Worker and resolves its import graph before publication. The new migration was generated from the schema and inspected: one new table and two indexes, with no changes to existing project rows.

API contract reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), inspected during implementation. Provider retention policies are separate from the request's `store: false` setting; no zero-retention guarantee is made.

## Subsequent architecture grounding

Interaction comparisons now contribute typed reasoning paths, explicit condition states, expected quality effects, source-pinned playbook passages and inspected reference summaries. The comparison's requirement and selected quality scenario receive space before that graph; remaining AKR and neighbouring context follow under the same packet limits. The active comparison ID is validated against the selected object's linked tasks. Changed intent, reused model objects, task answers or method receipts invalidate old generation context. Reviewed refresh retains the original source packet and comparison identity.

Interaction questions are explanatory at the provider boundary. Their concrete model proposals use the deterministic, reviewed architecture flow, and cannot be replaced by generic cohesive/separate boundary options. The server-side OpenAI configuration is unchanged. Domain, Worker and mock-provider regressions passed; this increment did not run a new live provider request. See `ARCHITECTURE-BRAIN-REVIEW.md` for scope and browser verification limits.
