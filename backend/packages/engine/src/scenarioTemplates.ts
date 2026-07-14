import type { KnowledgeLibrary } from '@aiw/domain';

// Scenario templates (8.8.5): guided starting points. Advisory seed material —
// applied through the store, validated here against the governed vocabulary.

export interface ScenarioTemplate {
  id: string; name: string; sector: string; brief: string;
  drivers: Record<string, number>;
  scenarios: Array<{ attributeId: string; stimulus: string; response: string; responseMeasure: string }>;
  seedNodes: Array<{ kind: string; label: string; description?: string | undefined }>;
  suggestedPatterns: string[];
  risks: string[];
  governanceChecklist: string[];
}

export function validateScenarioTemplate(template: ScenarioTemplate, library: KnowledgeLibrary): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const attributeIds = new Set(library.qualityAttributes.map((attribute) => attribute.id));
  const patternIds = new Set(library.patterns.map((pattern) => pattern.id));
  for (const [attributeId, weight] of Object.entries(template.drivers)) {
    if (!attributeIds.has(attributeId)) reasons.push(`${template.id}: unknown driver '${attributeId}'`);
    if (!Number.isInteger(weight) || weight < 1 || weight > 5) reasons.push(`${template.id}: driver weight for '${attributeId}' out of range`);
  }
  for (const scenario of template.scenarios) {
    if (!attributeIds.has(scenario.attributeId)) reasons.push(`${template.id}: scenario references unknown attribute '${scenario.attributeId}'`);
    if (!/\d/.test(scenario.responseMeasure)) reasons.push(`${template.id}: scenario measure must be quantitative`);
  }
  for (const patternId of template.suggestedPatterns) if (!patternIds.has(patternId)) reasons.push(`${template.id}: unknown pattern '${patternId}'`);
  if (!template.seedNodes.length) reasons.push(`${template.id}: seed topology required`);
  return { valid: reasons.length === 0, reasons };
}

export function validateTemplateCatalog(catalog: { templates: ScenarioTemplate[] }, library: KnowledgeLibrary): { valid: boolean; reasons: string[] } {
  const reasons = catalog.templates.flatMap((template) => validateScenarioTemplate(template, library).reasons);
  const ids = new Set<string>();
  for (const template of catalog.templates) { if (ids.has(template.id)) reasons.push(`duplicate template id ${template.id}`); ids.add(template.id); }
  return { valid: reasons.length === 0, reasons };
}
