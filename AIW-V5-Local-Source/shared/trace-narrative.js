// The narrative trace (round 6, R6-G; audit/round6/DESIGN.md): traceNarrative(p, trace), traceStoryHTML(p, trace) and
// narrativeSection(p, edition), told from the saved records along a record's trace. The server, the SDD and the suites
// import them from here; the rules themselves are in public/trace-narrative.js, because the browser loads only public/
// and the Story view and the trace companion read the same story. This module re-exports that one, so there is one
// narrative, not two.
export {traceNarrative, traceStoryHTML, narrativeSection, narrativeTitle, journeySteps, clipValue, NARRATIVE_LIMITS} from '../public/trace-narrative.js';
