// Exact source-field prompts for the Chapter 11 SDD content report. Loaded only when an architect opens that report.
const list = v => Array.isArray(v) ? v : [];

// An authoring task points back to the record and field that produced a sentence in the SDD. These are questions,
// not proposed answers: an absent client fact remains absent until the owner supplies and reviews it. The SDD itself
// continues to be derived only from saved chapter records. Keep this map beside the content reader so the diagnostic
// and its repair path cannot silently disagree about which field is being judged.
export function contentAuthoringTask(f) {
  const base = {section: f.section, ref: f.ref, title: f.title, issue: f.detail, check: f.check, level: f.level};
  const task = (chapter, recordRef, field, label, question, editor = '') => ({...base, chapter, recordRef, field, label, question, editor: editor || f.kind});
  if (f.kind === 'driver') {
    const fields = {
      title: ['title', 'Driver title', 'Name the expectation in terms an architect and its owner can recognise.'],
      description: ['description', 'Description', 'What does the source require? State the design expectation in one to three sentences and cite the requirement or agreement in Source.'],
      impact: ['impact', 'Impact on the architecture', 'Which boundaries, behaviours, controls or runtime obligations does this expectation change, and why? Name the affected objects.'],
      priority: ['priority', 'Priority and basis', 'Who assigned the priority, on what agreed basis, and what evidence supports it?'],
      scenario: ['stimulus', 'Stimulus and operating conditions', 'What event or load starts this scenario, under which conditions, and what response is expected?'],
      target: ['metric', 'Target and verification', 'What measurable target and window were agreed, and how will the response be verified?']
    };
    const [field, label, question] = fields[f.field] || [f.field, f.field, 'Review this driver against its source and state the missing design fact.'];
    return task(2, f.ref, field, label, question);
  }
  if (f.kind === 'decision') {
    if (f.field.startsWith('alternative:')) {
      const alternative = f.field.slice('alternative:'.length);
      return task(3, alternative, f.check === 'why-not' ? 'rejectionReason' : ['slug', 'verb-fragment'].includes(f.check) ? 'title' : 'summary', f.check === 'why-not' ? 'Why this alternative was not preferred' : ['slug', 'verb-fragment'].includes(f.check) ? 'Alternative name' : 'Alternative approach',
        f.check === 'why-not' ? 'What evidence and driver trade-off explains why this option was not preferred?' : 'Describe this option as an implementable approach, with its benefits, costs and evidence.', 'decision-alternative');
    }
    if (f.field.startsWith('driver:')) return {...task(3, f.ref, 'reason', 'Comparison reason for ' + f.field.slice(7), 'For the preferred option, what is its effect on this driver? Explain the judgement and cite evidence in the alternative comparison.', 'decision-assessment'), driverRef: f.field.slice(7)};
    const fields = {
      question: ['question', 'Design question', 'State the architectural choice this decision must settle.'],
      decision: ['selectedAlternativeId', 'Working choice', 'Compare the recorded alternatives, then select the working choice. If authority or evidence is missing, leave the decision open.'],
      alternatives: ['alternatives', 'Alternative approaches', 'Record at least two viable approaches, including what each gains, costs and requires.'],
      justification: ['rationale', 'Decision rationale', 'Why does the working choice best serve the linked drivers and constraints? State the evidence, assumptions and trade-offs.'],
      impact: ['impact', 'Impact and consequences', 'What does this choice gain, cost and change in the architecture and its quality drivers?']
    };
    const [field, label, question] = fields[f.field] || [f.field, f.field, 'Review this decision against its source and explain the design choice.'];
    return task(3, f.ref, field, label, question);
  }
  if (f.kind === 'component') {
    const fields = {
      title: ['title', 'Component name', 'Name the owned architectural responsibility in words.'],
      responsibilities: ['purpose', 'Purpose and responsibilities', 'Describe what this component owns, the responsibilities it realises and its quality properties. The source may need purpose, boundary and architectural solution, not merely another sentence.'],
      drivers: ['logicalIds', 'Driver trace', 'Which requirements and drivers reach this component through its logical responsibilities? Repair the allocation and source links.'],
      kind: ['kind', 'Component kind', 'What kind of component is this, and what evidence supports that classification?'],
      solution: ['architecturalSolution', 'Architectural solution', 'Which style, pattern and tactic realise this component, and why do they fit the linked drivers?']
    };
    const [field, label, question] = fields[f.field] || [f.field, f.field, 'Complete this component using the supporting project evidence.'];
    return task(5, f.ref, field, label, question);
  }
  if (f.kind === 'external party') {
    const fields = {
      title: ['title', 'Participant name', 'Name the external participant and its boundary.'],
      purpose: ['purpose', 'Purpose and boundary', 'What does this external party do, and who owns the boundary?'],
      dataFormats: ['dataFormats', 'Data formats', 'Which agreed formats cross this boundary? Cite the provider or consumer contract.'],
      protocols: ['protocols', 'Protocols', 'Which agreed protocol or exchange style connects this party? Cite its contract.'],
      securityConsiderations: ['securityConsiderations', 'Security considerations', 'Which access, confidentiality and integrity obligations apply at this boundary?'],
      challenges: ['challenges', 'Integration challenges', 'What uncertainty, failure or compatibility issue remains here?'],
      facilitation: ['facilitation', 'Architecture response', 'How does the proposed architecture address the recorded integration issue?']
    };
    const [field, label, question] = fields[f.field] || [f.field, f.field, 'Confirm this boundary with its owner and record the source.'];
    return task(8, f.ref, field, label, question, 'external-party');
  }
  // A data definition in section 4 is written from the Chapter 8 dictionary, even when a component owns it.
  return task(8, f.ref, 'title', 'Data definition name', 'Name the business information in the authoritative data definition and confirm its owner.', 'data-definition');
}

export function contentAuthoringQueue(reading) {
  const tasks = list(reading?.findings).map(contentAuthoringTask);
  const records = new Map();
  for (const t of tasks) {
    const key = t.section + '\u0000' + t.ref;
    if (!records.has(key)) records.set(key, {section: t.section, ref: t.ref, title: t.title, chapter: t.chapter, tasks: []});
    records.get(key).tasks.push(t);
  }
  return {records: [...records.values()], tasks: tasks.length, missing: tasks.filter(t => ['not-stated', 'open-decision', 'alternatives', 'why-not', 'driver-reason'].includes(t.check)).length};
}
