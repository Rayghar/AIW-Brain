// The journey drafter (round 4, Contract 2; audit/round4/DESIGN.md). The rules are in public/journey-drafter.js,
// because the browser loads only public/ (server.js serves it as the page root), as the brief interpreter's are; this
// module re-exports them for the server and the suites, so there is one set of rules, not two. Round 6 (Contract I)
// adds the model's path: modelDraft, modelOf, modelSource and the reference helpers of the process commands.
export {draftChapter, draftJourney, modelDraft, briefOf, briefSource, briefText, modelOf, modelSource, objectPhrase, titleKey, resolveRefs, isRef, JOURNEY_CHAPTERS, JOURNEY_LIMITS} from '../public/journey-drafter.js';
