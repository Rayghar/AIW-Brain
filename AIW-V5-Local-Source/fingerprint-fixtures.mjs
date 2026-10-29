// What a document says about itself that depends on its records' readings and on the stamps taken of them (round 12,
// D-04): every chapter's findings and milestones, every source-change judgement record by record, the state of every
// affected record in the change journal, and whether each recorded review, disposition, trace, action, analysis and
// baseline is still current. fingerprint-validate.mjs compares these for a document before and after its readings
// upgrade; the legacy fixture (evaluation/legacy-readings.json.br) carries them as the code of rc.10.73.16 computed them
// on documents that code wrote (scripts/build-legacy-readings-fixture.mjs). M holds the modules to ask, so the same
// judgement runs against any version of them: {review, quality, decisions, logical, realisation, technology,
// techrealisation, changes, guidance, memo}. A finding list is kept as its ids and levels with a hash of its wording,
// which keeps the fixture small and the comparison exact.
const hash = text => { let a = 2166136261, b = 5381; for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b, 33) ^ c; } return (a >>> 0).toString(16) + (b >>> 0).toString(16); };
// Wording changed on purpose since rc.10.73.16, read back as that code worded it: round 12 (D-02) names driver
// priorities High, Medium and Low, where rc.10.73.16 said Critical, Important and Supporting; round 12 (B2, GR-INT-08)
// opens the ambiguity finding with the checks and the words that raised it ("The statement names a quality without a
// measure (“quickly”).") and asks for the regulation a citation rests on, before the advice rc.10.73.16 gave alone.
// Nothing else is translated.
const REWORDED = [[/a high-priority driver with no monitoring/g, 'a Critical driver with no monitoring'], [/The statement (?:[^"\\]|\\.)*?\. (Replace subjective wording with an observable response or a confirmed measurable target)(?:, and name the regulation it rests on)?\./g, '$1.']];
const worded = text => REWORDED.reduce((t, [from, to]) => t.replace(from, to), text);
// The open change reviews are counted by cause since round 12 (D-05), so that finding's wording is left out; its count is
// the change summary's, which is compared whole.
const findingsOf = fs => ({ids: fs.map(f => f.id + ' · ' + f.level).join('\n'), wording: hash(worded(JSON.stringify(fs.map(f => f.code === 'change-review' ? ['', ''] : [f.title || '', f.detail || '']))))});
export function readingJudgements(M, p) {
  return M.memo.memoPass(p, () => {
    const out = {}, m = p.finalReview;
    for (const c of M.review.CHAPTERS) { out['findings ' + c.id] = findingsOf(c.checks(p)); out['milestones ' + c.id] = c.milestones(p).map(x => x.id + ':' + x.done).join(' '); }
    out.final = findingsOf(M.review.finalFindings(p));
    out.finalMilestones = M.review.finalMilestones(p).map(x => x.id + ':' + x.done).join(' ');
    out.inherited = findingsOf(M.review.inheritedFindings(p));
    out.readings = {
      drivers: p.quality.drivers.map(d => d.id + ':' + M.quality.sourceChanged(p, d)).join(' '),
      conflicts: p.quality.conflicts.map(c => c.id + ':' + M.quality.conflictIsResolved(p, c)).join(' '),
      decisions: p.decisions.records.map(d => d.id + ':' + M.decisions.decisionSourceChanged(p, d)).join(' '),
      responsibilities: p.logical.responsibilities.map(r => r.id + ':' + M.logical.logicalSourceChanged(p, r)).join(' '),
      components: p.realisation.components.map(c => c.id + ':' + M.realisation.componentSourceChanged(p, c)).join(' '),
      needs: p.technology.needs.map(n => n.id + ':' + M.technology.needChanged(p, n)).join(' '),
      capabilities: p.technology.capabilities.map(c => c.id + ':' + M.technology.capabilityChanged(p, c)).join(' '),
      realisations: p.technologyRealisation.records.map(r => r.id + ':' + M.techrealisation.realizationSourceChanged(p, r) + ':' + M.techrealisation.selectionCurrent(p, r)).join(' '),
      technologyIntake: M.technology.technologyIntakeCurrent(p)
    };
    out.changes = M.changes.changeEvents(p).map(e => e.id + ':' + M.changes.isCurrentChange(p, e) + ' ' + e.items.map(i => i.key + '=' + M.changes.changeItemState(p, e, i).status).join(' '));
    out.changeSummary = M.changes.changeSummary(p);
    out.review = {
      intake: M.review.reviewIntakeCurrent(p), narrative: M.review.narrativeCurrent(p), checks: M.review.finalChecksCurrent(p),
      traces: m.traces.map(t => t.id + ':' + M.review.traceReviewCurrent(p, t)).join(' '),
      dispositions: M.review.inheritedFindings(p).filter(f => m.dispositions.some(d => d.findingId === f.id)).map(f => f.id + ':' + (M.review.latestDisposition(p, f)?.id || null)).join(' '),
      actions: m.actions.map(a => a.id + ':' + M.review.actionCurrent(p, a) + ':' + M.review.actionComplete(p, a)).join(' '),
      designReview: M.review.latestDesignReview(p)?.id || null,
      baselines: m.baselines.map(b => [b.id, M.review.baselineCurrent(p, b), M.review.baselineChanges(p, b)]),
      analyses: (p.workbench?.analyses || []).map(a => a.title + ':' + (a.modelBasis === M.guidance.workingBasis(p))).join(' ')
    };
    return JSON.parse(JSON.stringify(out));
  });
}
