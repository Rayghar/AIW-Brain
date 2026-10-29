// A projection of a reviewed architecture proposal onto its canonical records.
// The task's existing reasoning graph retains this trace; it is not a second
// design store or a new source of product/quality judgements.
const list = value => Array.isArray(value) ? value : [];
const unique = values => [...new Set(values.filter(Boolean))];
const text = value => typeof value === 'string' ? value.trim() : '';

export function architectureDecisionAssessments(task,focus){
 const ids=unique([...list(task.basis?.drivers).map(d=>d.id),task.driverId]);
 return Object.fromEntries(ids.map(id=>[id,id===task.driverId?focus:{effect:'unknown',reason:'This driver applies to the design. Record its specific trade-off and verification evidence before accepting the decision.',evidence:task.methodReceipt?.packId||''}]));
}

export function bindArchitectureSolution(project, task, alternative, used, assessment, decisionId) {
  const components = list(project.realisation?.components);
  const byRole = new Map();
  for (const record of used) {
    if (!byRole.has(record.slot)) byRole.set(record.slot, []);
    byRole.get(record.slot).push(record.id);
  }
  const componentIds = unique(used.filter(r => r.type === 'realisation.component').map(r => r.id));
  const driverIds = unique([...list(task.basis?.drivers).map(d => d.id), task.driverId]);
  const resolve = place => {
    const ids = unique([place?.componentId, ...list(byRole.get(place?.role)), ...list(byRole.get(place?.hostRole))]);
    return ids.filter(id => components.some(c => c.id === id));
  };
  const placements = list(assessment.placement).flatMap(place => resolve(place).map(componentId => ({
    role: place.role || 'component', componentId, scope: place.scope || 'responsibility',
    responsibility: text(place.responsibility || place.reason), ...(place.hostRole ? {hostRole: place.hostRole} : {})
  })));
  for (const record of used.filter(r => r.type === 'realisation.component')) {
    if (!placements.some(p => p.componentId === record.id && p.role === record.slot)) {
      const component = components.find(c => c.id === record.id);
      placements.push({role: record.slot, componentId: record.id, scope: 'responsibility', responsibility: component?.purpose || ''});
    }
  }
  const rawObligations = list(assessment.obligations);
  const obligations = rawObligations.map((item, index) => ({
    id: task.id + ':' + (item.id || 'obligation-' + (index + 1)), kind: item.kind || 'verification',
    action: text(item.action || item.detail || item.title), evidence: text(item.evidence || item.verification),
    targetIds: resolve(item.placement).length ? resolve(item.placement) : [...componentIds],
    driverIds: [...driverIds], fieldKeys: list(item.fieldKeys), sourceIds: list(item.sourceIds),
    declared: item.status === 'declared', verification: 'pending'
  }));
  for (const [index, effect] of list(assessment.effects).entries()) {
    if (!effect.verify) continue;
    const evidence = text(effect.verify);
    if (obligations.some(o => o.evidence === evidence)) continue;
    obligations.push({id: task.id + ':effect-' + (index + 1), kind: 'verification',
      action: text(effect.quality) + ': ' + text(effect.why), evidence, targetIds: [...componentIds],
      driverIds: [...driverIds], fieldKeys: [], sourceIds: [], declared: false, verification: 'pending'});
  }
  const specifications = componentIds.map(componentId => {
    const needs = list(project.technology?.needs).filter(n => n.applicationId === componentId).map(n => n.id);
    const capabilityIds = unique(list(project.technology?.mappings).filter(m => needs.includes(m.needId)).map(m => m.capabilityId));
    const contracts = list(project.interfaces?.contracts).filter(c => c.from === componentId || c.to === componentId);
    const relevant = obligations.filter(o => o.targetIds.includes(componentId));
    return {componentId, roles: unique(placements.filter(p => p.componentId === componentId).map(p => p.role)),
      driverIds: [...driverIds], responsibilityIds: unique(list(project.logical?.mappings).filter(m => m.physicalId === componentId).map(m => m.logicalId)),
      capabilityIds, contractIds: contracts.map(c => c.id),
      dataIds: unique([...list(project.interfaces?.data).filter(d => d.authorityId === componentId).map(d => d.id), ...contracts.flatMap(c => list(c.exchanges).map(e => e.dataId))]),
      obligationIds: relevant.map(o => o.id),
      parameters: Object.fromEntries(unique(relevant.flatMap(o => o.fieldKeys)).filter(k => Object.hasOwn(task.answers, k)).map(k => [k, structuredClone(task.answers[k])]))};
  });
  const method = task.methodReceipt || {};
  return {id: 'solution:' + task.id, taskId: task.id, alternativeId: alternative.id, state: 'proposed',
    requirementIds: [task.requirementId], driverIds, focusDriverId: task.driverId, decisionId, optionId: assessment.optionId,
    mechanism: {pattern: assessment.option.pattern || assessment.option.title, style: assessment.option.style || '',
      tactic: assessment.option.tactic || '', capability: assessment.option.capability || ''},
    placement: placements, obligations, specifications,
    rationale:text(alternative.rationale||task.answers.reason),alternatives: list(alternative.reasoningGraph?.alternatives),
    receipt: {packId: method.packId || '', methodId: method.methodId || '', fingerprint: method.fingerprint || '',
      sourceIds: unique([method.sources?.method?.id, ...list(method.sources?.references).map(r => r.id), ...list(task.governedKnowledge).map(r => r.claimId)])},
    verification: 'pending'};
}

export function solutionTraceMarkdown(solution) {
  if (!solution) return '';
  const name = value => String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  let output = '\n#### Driver-to-design trace\n\n' +
    'Drivers: ' + solution.driverIds.join(', ') + ' · Decision: ' + solution.decisionId + '\n\n' +
    'Mechanism: ' + solution.mechanism.pattern + (solution.mechanism.tactic ? ' · ' + solution.mechanism.tactic : '') + '\n\n' +
    'Design state: ' + solution.state + '. Target verification: pending; no test result is implied by this trace.\n\n';
  if (solution.placement.length) output += '| Role | Component | Placement and responsibility |\n| --- | --- | --- |\n' +
    solution.placement.map(p => '| ' + name(p.role) + ' | ' + name(p.componentId) + ' | ' + name(p.scope + ' · ' + p.responsibility) + ' |').join('\n') + '\n\n';
  if (solution.obligations.length) output += '#### Implementation and verification obligations\n\n' +
    solution.obligations.map(o => '- ' + o.id + ' · ' + o.action + '\n  Targets: ' + (o.targetIds.join(', ') || 'Solution scope') +
      '. Evidence required: ' + (o.evidence || 'Define evidence with the accountable architect.') + ' Verification: pending.').join('\n') + '\n\n';
  return output;
}

const BASIS_FIELDS = {
  kind: 'driver kind', title: 'title', description: 'description', impact: 'architectural impact',
  priority: 'priority', metric: 'metric', operator: 'comparison', targetValue: 'target', unit: 'unit',
  window: 'measurement window', conditions: 'conditions', response: 'required response', measurement: 'verification method',
  componentIds: 'direct component scope', responsibilityIds: 'responsibility scope', requirementGroupIds: 'requirement groups',
  constraintIds: 'linked constraints', selectedAlternativeId: 'working choice', assumptions: 'assumptions', risks: 'risks',
  acceptance: 'acceptance criteria', confirmed: 'confirmation', options: 'product configurations'
};

// Explain changed inputs to an existing assessment. This does not reinterpret
// them: the specialised evaluator supplies the current judgement separately.
export function architectureBasisChanges(previous, current) {
  if (!current) return [{kind: 'requirement', id: previous?.requirement?.id || '', detail: 'The source requirement is unavailable.'}];
  const changes = [];
  const compare = (kind, before, after) => {
    const old = new Map(list(before).map(r => [r.id, r])), next = new Map(list(after).map(r => [r.id, r]));
    for (const [id, record] of next) {
      if (!old.has(id)) { changes.push({kind, id, detail: (record.title || record.question || id) + ' now applies to this design.'}); continue; }
      const fields = Object.keys(BASIS_FIELDS).filter(key => JSON.stringify(old.get(id)[key] ?? null) !== JSON.stringify(record[key] ?? null));
      if (fields.length) changes.push({kind, id, fields, detail: (record.title || record.question || id) + ': ' + fields.map(k => BASIS_FIELDS[k]).join(', ') + ' changed.'});
    }
    for (const [id, record] of old) if (!next.has(id)) changes.push({kind, id, detail: (record.title || record.question || id) + ' is no longer in the recorded design scope.'});
  };
  compare('requirement', previous?.requirement ? [previous.requirement] : [], [current.requirement]);
  for (const [kind, field] of [['driver', 'drivers'], ['decision', 'decisions'], ['constraint', 'constraints'], ['context', 'designContext']]) compare(kind, previous?.[field], current[field]);
  return changes;
}
