// Contract 1 of round 4, the interpreted brief (audit/round4/DESIGN.md): interpretBrief(text, {name}) and the counts a
// project keeps of it. The server, the suites and the journey drafter import it from here. The rules themselves are
// in public/brief-interpreter.js, because the browser loads only public/ (server.js serves it as the page root) and
// the Projects page reads a brief before the project exists; this module re-exports that one, so there is one set of
// rules, not two.
export {interpretBrief, briefCounts, BRIEF_LIMIT, BRIEF_RULES, BRIEF_KINDS} from '../public/brief-interpreter.js';
