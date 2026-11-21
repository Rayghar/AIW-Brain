// The crosswalk of the concept register (rc44, wp1 slice S2; audit/rc44/design/wp1-knowledge.md, b.1 and e): what the
// browser needs of it, in the knowledge workspace's lazy entry, and the server reads too. A crosswalk row
// (knowledge.crosswalk[], KA) maps another id of a mechanism onto the concept id of the register; only a row a second
// person verified and a release holds names an identity (knowledge-concepts.js resolveConcept, server and suites).
//   METHOD_CROSSWALK    AIW's own rows of scheme aiw-method, navigation only, reviewed by no person: the built-in
//                       comparison options and the catalogue concepts each covers (the table knowledge-coverage.js kept
//                       until this slice: an option realises the concepts it covers, and is never their identity). The
//                       one list of built-in rows, BUILT_IN_CROSSWALK, is these and the Playbook's five style rows
//                       (knowledge-concepts.js, on the server: the style rows read design-reasoning.js STYLE_CATALOGUE,
//                       which no browser module imports from there, so the route's chunks are as they were).
//   crosswalkDesign     what the rows say to the design fingerprint (the lead's ruling J3 of 2026-11-19): all but the
//                       steps and stamps of a row, so no person's confirmation and no second person's review of a row
//                       moves a design stamp. The design package p10-knowledge states it (knowledge-package.js).
const METHODS=[['reads/cache-aside',['PAT-CACHE-ASIDE']],['delivery/transactional-outbox',['PAT-TRANSACTIONAL-OUTBOX']],['resilience/protected-call',['PAT-CIRCUIT-BREAKER','PAT-BULKHEAD']],['resilience/bounded-call',['PAT-RETRY-WITH-BACKOFF']],['partitioning/sharded',['PAT-SHARDING']],
 ['structure/layered-module',['STYLE-LAYERED','PAT-LAYERED-ARCHITECTURE','STYLE-MODULAR-MONOLITH','PAT-MODULAR-MONOLITH']],['structure/service-boundaries',['STYLE-MICROSERVICES']],['interaction/request-reply',['PAT-REQUEST-REPLY']],['interaction/durable-queue',['PAT-QUEUE-BASED-LOAD-LEVELING']],
 ['persistence/relational-transaction',['ARCH-RELATIONAL-DATA-CAPABILITY']],['persistence/aggregate-document',['PAT-DOCUMENT-STORE','ARCH-DOCUMENT-DATA-CAPABILITY']]];
export const builtInRow=(scheme,aliasId,conceptId,relation)=>Object.freeze({scheme,aliasId,conceptId,relation,authority:'built-in'});
export const METHOD_CROSSWALK=Object.freeze(METHODS.flatMap(([alias,ids])=>ids.map(id=>builtInRow('aiw-method',alias,id,'realises'))));
const STEPS=['history','review','confirmed','provenance'];
export const crosswalkDesign=p=>{const rows=p.knowledge?.crosswalk;return Array.isArray(rows)?rows.map(r=>r&&typeof r==='object'?Object.fromEntries(Object.entries(r).filter(([k])=>!STEPS.includes(k))):r):rows;};
