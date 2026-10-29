// A Chapter 7 question is grounded in the saved realization, its candidate products and the
// quality scenarios reached through its capability allocations. This is a question, not a score.
import {findRecord, parseTarget, chapterReading} from './chapter-reasoning.js';
import {realizationSources} from './technology-realisation-domain.js';
import {isQualityDriver, targetText} from './quality-domain.js';

const short = (value, max) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
const name = option => `${option.id} ${short(option.product || option.title, 70)}${option.version ? ` (${short(option.version, 32)})` : ''}`;

export function technologyComparison(project, target, selectedId = '') {
  const parsed = parseTarget(target);
  if (parsed?.chapter !== 7 || parsed.variant) return null;
  const found = findRecord(project, parsed.objectId);
  if (found?.type !== 'realisation') return null;
  const record = found.record, options = Array.isArray(record.options) ? record.options : [];
  const first = options.find(o => o.id === selectedId) || options.find(o => o.id === record.selectedOptionId) || options[0];
  const second = options.find(o => o.id !== first?.id);
  let drivers = [], detailedDrivers = [];
  try { drivers = realizationSources(project, record.id).drivers.filter(isQualityDriver); } catch { /* Incomplete projects have no linked scenarios yet. */ }
  try { const readable = new Set(chapterReading(project, target)?.drivers || []); detailedDrivers = drivers.filter(d => readable.has(d.id)); } catch { /* A missing chapter reading is a question to resolve. */ }
  if (!first || !second) return {record, options: [], drivers, prompt: '',
    summary: `Add a second option to ${record.ref || record.id} in Chapter 7 Work before asking for a product comparison.`};
  const pair = [first, second], opening = `Compare the saved options ${pair.map(name).join(' and ')} for ${record.ref || record.id}. `,
    ending = 'For each, explain supports, trade-off or needs evidence using the current sources. What could change the recommendation if a reliability, recovery or scalability target changes? State version, tier and operating assumptions; do not invent measured results or make a selection.';
  const scenarios = [], notDetailed = drivers.length - detailedDrivers.length;
  for (const d of detailedDrivers) {
    const line = `${d.id} ${short(d.title, 65)} (${short(targetText(d), 45)}${d.targetConfirmed ? ', confirmed' : ', target assumption'})`;
    if (scenarios.length === 4 || (opening + 'Examine these quality scenarios from the current chapter reading: ' + [...scenarios, line].join('; ') + '. ' + (notDetailed ? 'Other linked criteria lack detailed evidence. ' : '') + ending).length > 960) break;
    scenarios.push(line);
  }
  const remaining = detailedDrivers.length - scenarios.length;
  const driverText = drivers.length
    ? `${detailedDrivers.length ? `Examine these quality scenarios from the current chapter reading: ${scenarios.join('; ') || 'see the current packet'}${remaining ? `; ${remaining} more in the packet` : ''}. ` : ''}${notDetailed ? `${notDetailed} other linked criteria lack a detailed scenario reading in this packet; request evidence before claiming their fit. ` : ''}`
    : 'No quality scenario is linked; identify the missing trace before claiming quality fit. ';
  const prompt = opening + driverText + ending;
  return {record, options: pair, drivers, prompt,
    summary: `${pair.map(name).join(' vs ')} · ${drivers.length} linked quality scenario${drivers.length === 1 ? '' : 's'}${notDetailed ? `; ${notDetailed} lack a detailed reading here` : ''}`};
}
