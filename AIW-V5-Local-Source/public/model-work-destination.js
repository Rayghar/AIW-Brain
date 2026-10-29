// Evidence and risk treatments are immutable history. Their canonical inventory
// chapter is not an editor: review them in the owning control, threat or plan.
export function historyWorkDestination(project, id) {
  const security = project?.security, runtime = project?.runtime;
  const evidence = security?.evidence?.find(r => r.id === id);
  if (evidence) return {id: evidence.controlId, home: 9, section: 'assurance', label: 'Review evidence in Chapter 9 Work'};
  const exercise = runtime?.evidence?.find(r => r.id === id);
  if (exercise) return {id: exercise.planId, home: 10, section: 'operate', label: 'Review evidence in Chapter 10 Work'};
  const risk = security?.risks?.find(r => r.id === id);
  if (risk) return {id: risk.threatId, home: 9, section: 'assurance', label: 'Review risk treatment in Chapter 9 Work'};
  return null;
}
