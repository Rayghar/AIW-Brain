// One hover reading for every stage (round 2, I2-11). "Hover explanations" used to be two unrelated things:
// the chapter models' tooltip with the record's description, and the legacy cursor tip whose Brain lines
// were counts. This is the one rule-based micro-reading both can show for an object: the worst open check
// on the record, the worst desk vital of the running parts it touches, and the one knowledge rule that
// fired for it — each from a reading the chapters already make. Counts are not explanations; a count of
// reviewed claims is shown as what it is (an empty index is not a verdict). Pure: nothing here changes
// the project, and nothing here consults a model.
import {solTarget, chapterReading, homeChapter} from './chapter-reasoning.js';
import {brainContext} from './aiw-brain.js';
import {esc} from './html-escape.js';
import {list} from './util.js';


export function hoverReading(p, id, chapter = null) {
  if (!p || !id || id === 'project') return null;
  const home = homeChapter(p, id);
  let target = null, x = null;
  try { target = solTarget(p, home || Number(chapter) || 1, id); x = target ? chapterReading(p, target) : null; } catch { x = null; }
  // Checks and vitals are already worst-first in the chapter's reading.
  const check = x?.reading.checks?.[0] || null, vital = x?.reading.vitals?.[0] || null;
  let rule = null, claims = 0, requirements = 0, drivers = 0, findings = 0;
  try { const c = brainContext(p, {id, chapter: home || chapter || undefined}); const k = c.knowledge[0]; rule = k ? {id: k.id, why: k.why, limit: k.limit} : null; claims = c.governed.claims.length; findings = c.governed.findings.length; requirements = c.requirements.length; drivers = c.drivers.length; } catch { rule = null; }
  return {id, chapter: home, target, record: x?.reading.record || null, check, vital, notRecorded: list(x?.reading.notRecorded).slice(0, 3), rule, claims, findings, requirements, drivers};
}
// The reading as two or three short lines for a tooltip; empty when there is nothing recorded to say.
export function hoverTipHTML(p, id, chapter = null) {
  const h = hoverReading(p, id, chapter);
  if (!h) return '';
  const lines = [];
  if (h.check) lines.push(`<small class="tip-brain tip-check ${esc(h.check.level)}"><span class="clip-2">Check · ${esc(h.check.level)} · ${esc(h.check.title)}</span></small>`);
  else if (h.target) lines.push(`<small class="tip-brain tip-check">Checks · none open${h.notRecorded.length ? ' · not recorded: ' + esc(h.notRecorded.join(', ')) : ''}</small>`);
  if (h.vital) lines.push(`<small class="tip-brain tip-vital"><span class="clip-2">Vital · ${esc(h.vital.part)} ${esc(h.vital.vital.toLowerCase())}: ${esc(h.vital.state.toLowerCase())}${h.vital.recorded ? ' · ' + esc(h.vital.recorded) : ''}</span></small>`);
  if (h.rule) lines.push(`<small class="tip-brain tip-rule"><span class="clip-2">Knowledge rule · ${esc(h.rule.id)} · ${esc(h.rule.why)}</span></small>`);
  lines.push(`<small class="tip-brain tip-context">Context · ${h.requirements} requirement${h.requirements === 1 ? '' : 's'} · ${h.drivers} quality driver${h.drivers === 1 ? '' : 's'} · ${h.claims ? `${h.claims} reviewed claim${h.claims === 1 ? '' : 's'} in scope${h.findings ? ' · support needs review' : ''}` : 'no reviewed claims in scope; inspect Sources and Releases'}</small>`);
  return lines.join('');
}
