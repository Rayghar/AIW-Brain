// SDD readiness — what stands between the design and a reviewable solution design document.
//
// Every chapter already records its own checks (content gaps and review items) and milestones,
// and Chapter 11 decides which content gaps still block the SDD. This reads them together, as one
// line across the journey. Pure: it reads the records the chapters keep and never writes.
import {chapterSummaries, reviewBlockers, finalFindings, finalMilestones} from './review-domain.js';

export const SHORT = {1: 'Requirements', 2: 'Quality', 3: 'Decisions', 4: 'Logical', 5: 'Application', 6: 'Platform', 7: 'Products', 8: 'Interfaces', 9: 'Security', 10: 'Runtime', 11: 'Review & SDD'};
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);

export function sddReadiness(p) {
  const sums = chapterSummaries(p), open = reviewBlockers(p), by = {};
  for (const f of open) by[f.chapter] = (by[f.chapter] || 0) + 1;
  const chapters = sums.map(c => {
    const blockers = by[c.id] || 0;
    return {id: c.id, title: c.title, short: SHORT[c.id], gaps: c.errors, review: c.warnings, done: c.done, total: c.total, blockers, treated: c.errors - blockers,
      state: blockers ? 'gaps' : c.errors ? 'treated' : c.warnings ? 'review' : c.done === c.total ? 'clear' : 'open'};
  });
  const ff = finalFindings(p), fm = finalMilestones(p), fe = ff.filter(f => f.level === 'error').length;
  chapters.push({id: 11, title: 'Review & Realize', short: SHORT[11], gaps: fe, review: ff.length - fe, done: fm.filter(m => m.done).length, total: fm.length, blockers: fe, treated: 0,
    state: fe ? 'gaps' : ff.length ? 'review' : fm.every(m => m.done) ? 'clear' : 'open', final: true});
  const source = chapters.filter(c => !c.final), gaps = source.reduce((n, c) => n + c.gaps, 0), treated = gaps - open.length;
  const done = chapters.reduce((n, c) => n + c.done, 0), total = chapters.reduce((n, c) => n + c.total, 0), withGaps = source.filter(c => c.blockers).length;
  const summary = open.length
    ? `${plural(open.length, 'blocking finding', 'blocking findings')} in ${plural(withGaps, 'chapter', 'chapters')} stand${open.length === 1 ? 's' : ''} between this design and a reviewable SDD.${treated ? ' ' + treated + ' more ' + (treated === 1 ? 'is' : 'are') + ' treated in Chapter 11.' : ''}`
    : gaps ? `Every blocking finding is repaired or treated in Chapter 11; ${done} of ${total} milestones are met.` : `No finding blocks the SDD; ${done} of ${total} milestones are met.`;
  return {chapters, blockers: open.length, gaps, treated, done, total, withGaps, summary, ready: !open.length && !fe && fm.every(m => m.done)};
}
