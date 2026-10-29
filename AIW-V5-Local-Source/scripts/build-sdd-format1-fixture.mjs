// The format-1 SDD fixture (round 24, D-24-06): architecture editions exported before format 2, and what the content
// reader said about each, for sdd-content-validate.mjs to hold the reader to: an old exported file reads exactly as it
// read before. Run it in a source tree of AIW v0.10.0-rc.10.73.24 (commit f0872fa), the last to write format 1:
//   cd <rc.10.73.24 tree>/AIW-V5-Local-Source && node <this tree>/AIW-V5-Local-Source/scripts/build-sdd-format1-fixture.mjs <out.json.br>
// A tree that writes format 2 (its editions carry "<!-- aiw:sdd-format 2 -->") has no format-1 file to give, and the
// script refuses. Every document is synthetic (sdd-fixtures.mjs and the clinic reference journey; no client material):
//   rich: every record kind with some round-12 fields left open; rich-asked: the same with open questions on a driver, a
//   decision and an external party (one question asked of three fields), and a question that ends without "?";
//   depth: invariants and the batch chain; content-ready: the written design that passes; clinic: a reference journey
//   drafted by the journey rules (its parties read from its contracts); large: the 1,400-requirement rules skeleton.
// Each document keeps its Markdown whole (figures=none) and the reading of that Markdown alone, as
// `npm run test:sdd-content -- file.md` rereads a file without its project.
import {writeFile} from 'node:fs/promises';
import {brotliCompressSync, constants} from 'node:zlib';
import path from 'node:path';
const ROOT = process.cwd(), out = process.argv[2];
if (!out) { console.error('Usage: node build-sdd-format1-fixture.mjs <out.json.br> (cwd: an rc.10.73.24 source tree)'); process.exit(2); }
const load = f => import(path.join(ROOT, f));
const F = await load('sdd-fixtures.mjs'), {sddDocument} = await load('public/sdd-document.js'), {contentReading} = await load('public/sdd-content.js');
const {createProject} = await load('shared/projects-domain.js'), {withFinalReview} = await load('public/review-domain.js');
const pkg = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(ROOT, 'package.json'), 'utf8'));
const edition = p => sddDocument(p, {figures: false}).markdown;
const documents = [];
const keep = (name, markdown) => {
  if (/^<!-- aiw:sdd-format \d+ -->$/m.test(markdown)) throw Error('This tree writes a later SDD format; run the script in an rc.10.73.24 tree.');
  documents.push({name, markdown, reading: contentReading(markdown)});
  console.log(name + ': ' + Buffer.byteLength(markdown) + ' bytes; ' + documents.at(-1).reading.line);
};
const {document: rich} = await F.richProject();
keep('rich', edition(rich));
{
  // Open questions where the rich project leaves fields open: a quality driver's description, a decision's rationale
  // and impact, one question asked of an external party's data formats, protocols and security, and a party question
  // written without its question mark (the reader takes no question from it).
  const asked = structuredClone(rich), d = asked.quality.drivers.find(x => !x.description), dec = asked.decisions.records.find(x => !x.rationale && x.id !== 'ADR-001');
  d.open = {...d.open, description: {state: 'open-question', question: 'What must the posting path guarantee to the customer?'}};
  dec.open = {...dec.open, rationale: {state: 'open-question', question: 'Which driver decides this choice?'}, impact: {state: 'open-question', question: 'What changes once it is decided?'}};
  const q = 'Which contracts, authentication method and reconciliation rules govern the requests?';
  for (const party of asked.interfaces.parties) {
    const open = {...party.open};
    for (const f of ['dataFormats', 'protocols', 'securityConsiderations']) if (!String(party[f] || '').trim()) open[f] = {state: 'open-question', question: q};
    if (!String(party.challenges || '').trim()) open.challenges = {state: 'open-question', question: 'Who handles a missed cut-off'};
    party.open = open;
  }
  keep('rich-asked', edition(asked));
}
keep('depth', edition((await F.depthProject()).document));
keep('content-ready', edition((await F.contentReadySyntheticProject()).document));
keep('clinic', edition(withFinalReview(createProject({name: 'Clinic appointments', template: 'clinic-appointments'}, 'clinic-sdd', '2026-10-01T09:00:00Z'))));
{
  const {document: large} = await F.largeProject({rows: 1400});
  for (const r of [...large.quality.drivers, ...large.decisions.records, ...large.realisation.components, ...large.interfaces.parties]) r.provenance = {...r.provenance, draft: {...r.provenance?.draft, engine: 'rules'}};
  keep('large', edition(large));
}
const fixture = {schema: 'aiw.sdd-format1-readings-fixture.v1', release: pkg.release, note: 'Architecture editions in format 1 (before the round-24 format marker) and the content reading of each file, as that tree read it.', documents};
const bytes = brotliCompressSync(Buffer.from(JSON.stringify(fixture)), {params: {[constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: 0}});
await writeFile(out, bytes);
console.log(out + ': ' + bytes.length + ' bytes, ' + documents.length + ' documents');
