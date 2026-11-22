// Builds candidate-sets/crosswalk-seed.json (rc44, wp1 slice S2; audit/rc44/design/wp1-knowledge.md, section e).
//
// The SA Playbook names a catalogue record for 13 of its patterns and anti-patterns (the `catalogue` name of an entry,
// public/playbook-knowledge.js), and no runtime module reads that name: it was a second identity nobody used. This
// script turns it into what the crosswalk takes, as candidates for the stewards and the second person who reviews a row,
// never as knowledge: one row per such entry, scheme `playbook`, the entry's id as the alias, the catalogue record of
// exactly that name as the concept, relation `same`, status `proposed`. It reads only the product's own records in this
// repository (the structured Playbook and the catalogue, public/brain-catalogue.js through catalogue-store.js) and holds
// their ids and names, nothing more: no handbook text, no client material, no passage. A row carries no verification
// and nothing in the file is promoted; a row names an identity only after a library holds its concept, a person sends it
// through knowledge.crosswalk, a second person verifies it and a release of the concept holds it.
// targetContent says what the catalogue record holds as the server reads it when the row is saved (a marked record, the
// generator's template, a relation stub, or the record's own words); the server reads it again then and ignores this.
//
// Usage: node scripts/build-crosswalk-seed.mjs           writes the seed
//        node scripts/build-crosswalk-seed.mjs --check   fails when the seed is not this script's output
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {PATTERNS, ANTI_PATTERNS, PLAYBOOK} from '../public/playbook-knowledge.js';
import {catalogue} from '../public/catalogue-store.js';
import {catalogueMark} from '../public/catalogue-curation.js';
import {templateFields} from '../public/component-snapshot.js';

export const SEED_FILE = 'candidate-sets/crosswalk-seed.json';
export function buildSeed() {
  const C = catalogue(), rows = [];
  for (const entry of [...PATTERNS, ...ANTI_PATTERNS].filter(e => e.catalogue)) {
    const match = C.records.filter(r => r.name === entry.catalogue);
    if (match.length !== 1) throw Error(entry.id + ' names the catalogue record "' + entry.catalogue + '", which ' + (match.length ? match.length + ' records of ' + C.releaseId + ' bear' : 'no record of ' + C.releaseId + ' bears') + ': the seed takes an exact name match only.');
    const record = match[0];
    rows.push({scheme: 'playbook', aliasId: entry.id, conceptId: record.id, label: entry.name + ' (SA Playbook) · ' + record.name + ' (' + C.releaseId + ')', relation: 'same', status: 'proposed',
      targetContent: catalogueMark(record.id) ? 'marked' : templateFields(record).includes('summary') ? 'template' : 'authored',
      basis: 'Exact name match: the SA Playbook entry names the catalogue record "' + entry.catalogue + '". For the reviewer: a name is not a mechanism; check both.'});
  }
  return {schema: 'aiw.crosswalk-seed/1', seedId: 'AIW-CROSSWALK-SEED-1', status: 'candidate',
    authority: 'Candidate only. Proposed crosswalk rows built from the product\'s own SA Playbook and catalogue; no row is reviewed, and none names an identity until a second person verifies it and a release holds its concept.',
    influence: {scoring: false, constraints: false, eligibility: false, conformance: false, identity: false, drafter: false, brain: false}, productionAccepted: false,
    playbook: {id: PLAYBOOK.id, files: PLAYBOOK.files}, catalogueRelease: C.releaseId, catalogueSha256: C.sourceSha256 || null, rows, counts: {rows: rows.length, patterns: rows.filter(r => r.aliasId.startsWith('P-')).length, antiPatterns: rows.filter(r => r.aliasId.startsWith('AP-')).length}};
}
const text = () => JSON.stringify(buildSeed(), null, 1) + '\n';
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  if (process.argv.includes('--check')) { let held = ''; try { held = readFileSync(SEED_FILE, 'utf8'); } catch { held = ''; } if (held !== text()) { console.error(SEED_FILE + ' is not this script\'s output: run node scripts/build-crosswalk-seed.mjs'); process.exit(1); } console.log(SEED_FILE + ' is this script\'s output (' + buildSeed().rows.length + ' rows, all proposed).'); }
  else { writeFileSync(SEED_FILE, text()); console.log('Wrote ' + SEED_FILE + ' (' + buildSeed().rows.length + ' rows, all proposed).'); }
}
