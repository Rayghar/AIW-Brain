// AIW's trade-off catalogue and reference latency figures (round 6, Contract K; audit/round6/DESIGN.md). The pack is in
// public/brain-tradeoffs.js, because the browser loads only public/ (server.js serves it as the page root); this module
// re-exports it for the server and the suites, so there is one pack, not two.
export {BRAIN_TRADEOFFS} from '../public/brain-tradeoffs.js';
