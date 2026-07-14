# rc.10.71.0 Requirements Traceability

## Scope

This matrix traces the Architecture Genesis requirements agreed for the first rc.10.71 implementation increment. It is not the programme-wide 396-requirement audit, which remains an explicit later work item.

| Requirement | Implementation evidence | Automated evidence | Status |
|---|---|---|---|
| Start from a short solution idea | `DesignBriefStudio.tsx`; deterministic distillation engine | Chromium desktop/laptop journey | Verified |
| Paste unstructured requirements text | Requirements Intelligence source intake | Structural gate | Verified |
| Upload Word documents | `/api/requirements-intelligence/extract-source`; Mammoth | Backend API test with DOCX fixture | Verified |
| Upload text-enabled PDF | `pdf-parse` extraction route | Build and structural inspection | Implemented |
| Upload Markdown, text and CSV | extraction route and source kind model | Structural gate/API test for text | Verified for text; implemented for Markdown/CSV |
| Combine multiple sources | distillation API accepts 1–20 sources | Engine/API tests | Verified contract |
| Preserve source evidence | source/section/evidence canonical records | Engine tests and 23-point gate | Verified |
| Classify source sensitivity | public/internal/confidential/restricted schema | API schema and route tests | Verified contract |
| Generate requirements on behalf of user | deterministic proposal generation with optional LLM brief enrichment | Engine and browser tests | Verified |
| Distinguish proposal from accepted fact | origin/status/confidence/proposal contracts | Gate and browser acceptance | Verified |
| Prevent unsupported numeric target invention | Cambridge rule and clarification generation | Engine test | Verified |
| Show requirements health | completeness, clarity, testability, traceability, journey/stakeholder coverage | Gate and browser screenshot | Verified |
| Surface ambiguity and open questions | health gaps and open-question queue | Engine/browser tests | Verified |
| Allow selective human acceptance | reviewed proposal controls and governed apply endpoint | Browser and API tests | Verified |
| Reject stale proposal revision | expected revision and merge guard | Engine test/API 409 contract | Verified |
| Keep LLM outside mutation authority | hybrid enriches proposal; deterministic merge owns mutation | API and engine tests | Verified |
| Create major solution journeys | journey-generation grammar | Engine and browser tests | Verified |
| Support happy, alternate, failure and recovery paths | semantic path kinds | Gate and Journey Atlas | Verified model contract |
| Render visually interactive sequence views | `JourneySequenceDiagram.tsx` | Desktop/laptop screenshots and E2E | Verified |
| Trace journey interactions to requirements | interaction requirement IDs/evidence | Gate and engine tests | Verified |
| Show data, trust and quality implications | semantic interaction metadata and overlays | Gate/browser evidence | Verified initial implementation |
| Make journeys input to System Context | context candidate builder consumes accepted journeys | Browser E2E | Verified |
| Create first-class System Context stage | lifecycle configuration, routing and workspace | Gate and browser E2E | Verified |
| Preview before context mutation | candidate preview and Compare/Accept controls | Browser E2E | Verified |
| Preserve journey lineage in context | node/relationship tags and lineage | Gate and output evidence | Verified |
| Compile stage-specific intelligence context | eight Architecture Context packages | Engine test and gate | Verified |
| Show actual Requirements outputs | stage output evidence projection | Gate and browser evidence | Verified |
| Show actual System Context outputs | participants/interactions/journey coverage | Gate and browser evidence | Verified |
| Operationalise Cambridge rules | `data/CAMBRIDGE-SA-1.0.json` | Structural gate | Implemented initial pack |
| Avoid direct page-level LLM mutation | governed backend route and explicit apply endpoint | API test | Verified |
| No focused horizontal page overflow | responsive Requirements/Journey/Context layouts | E2E at 1600×900 and 1100×760 | Verified |

## Deliberate non-completion statements

| Requirement boundary | Status |
|---|---|
| Binary XLSX ingestion | Not implemented; CSV export required |
| OCR for scanned PDFs | Not implemented |
| Full semantic contradiction adjudication | Initial only |
| Advanced journey editing and BPMN | Not implemented |
| Direct React Flow System Context editing | Not implemented |
| Full Cambridge corpus at atomic-claim level | In progress |
| Full journey-to-logical-design co-creation | Next increment |
| Programme-wide 396-requirement evidence matrix | Not completed |
| Agency Banking benchmark | Planned for rc.10.72 |
| Independent expert outcome proof | Not completed |
| Production acceptance | Not completed |
