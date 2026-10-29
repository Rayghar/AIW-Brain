// The journey audit's items taken in round 8 (audit/round8/JOURNEY-AUDIT.md): each one checked where it lives, in
// the pure modules where it has behaviour and in the source where it is wording or a style. No server, no browser.
// Run: npm run test:journey-audit
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interpretBrief} from './public/brief-interpreter.js';
import {guidance} from './public/requirements-domain.js';
import {storyModel} from './public/story-model.js';
const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const src = f => readFileSync(new URL('./public/' + f, import.meta.url), 'utf8');

// J-20 · a drafted title cut to its limit says so with an ellipsis.
{
  const brief = 'Goals\nThe goal is to cut short car trips within the town by making a bike available within a five-minute walk of most homes, so that residents can join, unlock and pay without visiting an office and the service runs with a small team.\n';
  const titles = Object.values(interpretBrief(brief, {name: 'Bike share'})).flat().filter(x => x && typeof x.title === 'string').map(x => x.title);
  const cut = titles.filter(t => t.length >= 100);
  assert.ok(cut.length > 0, 'the long goal is drafted as a long title');
  for (const t of cut) { assert.ok(t.endsWith('…'), `a cut title ends with an ellipsis: ${t}`); assert.ok(t.length <= 120, `and stays within 120 characters (${t.length})`); }
  pass('J-20 · a drafted title cut at its limit ends with "…" and stays within 120 characters');
}

// J-09 and J-13 · a blank project is not told to review reference content; the plural is right.
{
  const base = {brief: {confirmed: false, problem: 'People need bikes near home.'}, artefacts: [], relationships: [], contentVersion: 1};
  const blank = guidance({...base, workspace: {template: 'blank'}}, null, 'work', 'brief').attention;
  const reference = guidance({...base, workspace: {template: 'bank-payment'}}, null, 'work', 'brief').attention;
  assert.doesNotMatch(blank, /reference/i, 'a blank project is not told to review reference content: ' + blank);
  assert.match(blank, /draft/i, 'it is pointed at the draft: ' + blank);
  assert.match(reference, /reference content/, 'a reference project still is');
  const drafted = guidance({...base, workspace: {template: 'blank'}, artefacts: [{id: 'OUT-001', type: 'outcome', title: 'x'}]}, null, 'work', 'brief').attention;
  assert.match(drafted, /drafted records/, 'once records exist, the next thought is to review them: ' + drafted);
  const v = guidance({...base, workspace: {template: 'blank'}}, null, 'validate', 'brief').explanation;
  assert.doesNotMatch(v, /\b1 confirmation items\b|\b1 content gaps\b/, 'singular counts read singular: ' + v);
  assert.match(src('requirements.js'), /const referenceNote=p=>noteDismissed\(\)\|\|p\?\.workspace\?\.template==='blank'\?'':/, 'the reference note is not drawn on a blank project');
  pass('J-09, J-13 · a blank project gets no reference note and is pointed at the draft; the reference project keeps its note; singular counts read singular');
}

// J-32 · coverage by Chapter 4 is not reported missing before Chapter 4 has any responsibility.
{
  assert.equal(storyModel({}).covered, false, 'no responsibilities: not yet covered');
  assert.equal(storyModel({responsibilities: [{id: 'LR-001', ref: 'LR-001', title: 'Bike handling', requirementIds: []}]}).covered, true, 'with one: coverage is read');
  const view = src('story-view.js');
  assert.match(view, /SM\.covered \? '<em class="miss">no Chapter 4 responsibility<\/em>' : '<em>Chapter 4, when it is drafted<\/em>'/, 'the strip says "Chapter 4, when it is drafted" until Chapter 4 exists');
  pass('J-32 · the story map reports a missing Chapter 4 responsibility only once Chapter 4 has responsibilities');
}

// J-01, J-05, J-07, J-12, J-16, J-24 · wording and style where they live.
{
  for (const f of ['index.html', 'projects.js']) assert.doesNotMatch(src(f), /Live Model Explorer/, f + ' no longer names the retired product');
  assert.match(src('index.html'), /<title>AIW V5 · Intelligent Architecture Workbench<\/title>/, 'the tab says the product\'s name');
  assert.match(src('requirements.css'), /\.r-brief-block p\{[^}]*white-space:pre-line/, 'the brief keeps its line breaks');
  assert.match(src('requirements.js'), /const shortHash=s=>/, 'the Source line shortens a SHA-256 to 12 characters with the full hash in a title');
  assert.doesNotMatch(src('field-spark.js'), /first band only/, '"first band" is gone from the fill bar');
  assert.match(src('field-spark.js'), /from your project<\/b> · \$\{plural\(open\.length, 'empty field'\)\}/, 'it says where the values come from (round 11: the offer line counts the suggestions from your project)');
  assert.match(src('requirements.js'), /btn\('edit-brief',icon\('edit'\)\+'Review & edit brief',project\.artefacts\.length\|\|!String\(project\.brief\?\.problem\|\|''\)\.trim\(\)\?'primary':''\)/, '"Review & edit brief" is not a second primary while the chapter waits for its draft');
  assert.match(src('journey-draft-ui.js'), /S\.busy \? 'Accepting the chapter…' : 'Accept chapter · '/, 'the accept button says "Accepting the chapter…" while it saves');
  pass('J-01, J-05, J-07, J-12, J-16, J-24 · one product name; the brief keeps its lines; a short hash; no "first band"; one primary on an empty chapter; the accept label holds while saving');
}

console.log(`\n${checks.length} checks passed.`);
