// One vocabulary for where a value came from (round 11), across the field spark, Proposals and the journey draft:
//   Stated     the words are in a record or passage the project holds, copied as they stand (the spark's first band,
//              the journey's stated and upstream values);
//   Inferred   a rule derived it from the project or the chapter guide (the spark's confirm band, the journey's
//              inferred values);
//   Sol draft  a model's draft, checked against what it read and recorded with its run;
//   Edited     a person changed the value after accepting it.
// The audit trail keeps what was recorded (a suggestion's source 'project' | 'confirm' | 'sol', a journey value's
// basis 'stated' | 'inferred' | 'upstream' | 'sol'); only the words shown change. An open question is not a
// provenance: no value was recorded, and the record keeps an explicit open answer until a person answers it.
export const PROVENANCE_WORDS = Object.freeze({stated: 'Stated', inferred: 'Inferred', sol: 'Sol draft', edited: 'Edited'});
const KEY_OF = {project: 'stated', stated: 'stated', upstream: 'stated', confirm: 'inferred', inferred: 'inferred', sol: 'sol', edited: 'edited'};
export const provenanceKey = source => KEY_OF[String(source || '')] || null;
export const provenanceWord = source => PROVENANCE_WORDS[provenanceKey(source)] || '';
export const OPEN_WORD = 'Open question';
