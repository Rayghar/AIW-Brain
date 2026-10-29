// Contract I of round 6, a model in (audit/round6/DESIGN.md): interpretModel(text, {name, format}) and the counts a
// project keeps of it. The server, the suites and the journey drafter import it from here. The readers themselves are
// in public/model-interpreter.js, because the browser loads only public/ (server.js serves it as the page root) and
// the Projects page reads a model file before the project exists; this module re-exports that one, so there is one set
// of readers, not two.
export {interpretModel, modelCounts, detectFormat, inflateModelText, unescapeXML, MODEL_LIMIT, MODEL_KIND_LIMIT, MODEL_RULES, MODEL_FORMATS, ELEMENT_KINDS, RELATIONSHIP_KINDS} from '../public/model-interpreter.js';
