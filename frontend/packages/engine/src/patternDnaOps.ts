import type { KnowledgeLibrary } from '@aiw/domain';

// =============================================================================
// PATTERN DNA OPERATIONS (Sprint 8.8.4) — governed editing of pattern records.
// Doctrine: Pattern DNA edits NEVER mutate the live library. They are staged,
// validated, and materialized into a knowledge-release CANDIDATE, which then
// walks diff → validate → promote like every other knowledge change.
// =============================================================================

export interface PatternDnaEdit {
  patternId: string;
  field: 'qualityAttributeImpact' | 'obligations' | 'risks' | 'mitigations' | 'compatibleWith' | 'conflictsWith' | 'aliases' | 'vendorRealizations' | 'impactNote';
  value: unknown;
  editor: string;
  rationale: string;
  stagedAt: string;
}

const IMPACT_MIN = -2, IMPACT_MAX = 2;

export function validatePatternDnaEdit(edit: Partial<PatternDnaEdit>, library: KnowledgeLibrary): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const pattern = library.patterns.find((p) => p.id === edit.patternId);
  if (!pattern) reasons.push(`unknown pattern '${edit.patternId}'`);
  if (!edit.editor || edit.editor.trim().length < 2) reasons.push('a named editor is required');
  if (!edit.rationale?.trim()) reasons.push('a rationale is required (recorded in the audit trail and the diff)');
  const attributeIds = new Set(library.qualityAttributes.map((a) => a.id));
  const patternIds = new Set(library.patterns.map((p) => p.id));
  switch (edit.field) {
    case 'qualityAttributeImpact': {
      const impacts = edit.value as Record<string, unknown>;
      if (!impacts || typeof impacts !== 'object' || !Object.keys(impacts).length) { reasons.push('impact map must be a non-empty object'); break; }
      for (const [attributeId, raw] of Object.entries(impacts)) {
        if (!attributeIds.has(attributeId)) reasons.push(`unknown attribute '${attributeId}'`);
        const value = Number(raw);
        if (!Number.isInteger(value) || value < IMPACT_MIN || value > IMPACT_MAX) reasons.push(`impact for '${attributeId}' must be an integer in [${IMPACT_MIN}, ${IMPACT_MAX}]`);
      }
      break;
    }
    case 'compatibleWith':
    case 'conflictsWith': {
      for (const id of (edit.value as unknown[]) ?? []) if (!patternIds.has(String(id))) reasons.push(`references unknown pattern '${String(id)}'`);
      break;
    }
    case 'obligations': case 'risks': case 'mitigations': case 'aliases': case 'vendorRealizations': {
      const items = (edit.value as unknown[]) ?? [];
      if (!Array.isArray(items) || !items.length) reasons.push(`${edit.field} must be a non-empty array`);
      else if (items.some((item) => typeof item !== 'string' || !(item as string).trim())) reasons.push(`${edit.field} entries must be non-empty strings`);
      break;
    }
    case 'impactNote': {
      if (typeof edit.value !== 'string' || !edit.value.trim()) reasons.push('impactNote must be a non-empty string');
      break;
    }
    default: reasons.push(`field '${String(edit.field)}' is not editable through Pattern DNA ops`);
  }
  return { valid: reasons.length === 0, reasons };
}

/** Materialize staged edits into a proposed library for the release-candidate flow. */
export function applyStagedPatternEdits(library: KnowledgeLibrary, edits: PatternDnaEdit[]): KnowledgeLibrary {
  const proposed: KnowledgeLibrary = JSON.parse(JSON.stringify(library));
  for (const edit of edits) {
    const pattern = proposed.patterns.find((p) => p.id === edit.patternId) as Record<string, unknown> | undefined;
    if (!pattern) continue;
    pattern[edit.field] = edit.value;
    if (edit.field === 'qualityAttributeImpact') pattern.impactProvenance = `staged-edit ${edit.stagedAt.slice(0, 10)} by ${edit.editor} — pending release promotion`;
  }
  return proposed;
}

/** Stage a calibration ratification (the board's act) as a release-candidate change. */
export function stageCalibrationRatification(library: KnowledgeLibrary, attributeId: string, ratifiedBy: string): { proposed: KnowledgeLibrary | null; reason?: string } {
  const attribute = library.qualityAttributes.find((a) => a.id === attributeId) as { calibrationStatus?: string } | undefined;
  if (!attribute) return { proposed: null, reason: `unknown attribute '${attributeId}'` };
  if (attribute.calibrationStatus === 'production') return { proposed: null, reason: 'already production-calibrated' };
  if (!ratifiedBy || ratifiedBy.trim().length < 2) return { proposed: null, reason: 'a named ratifier is required' };
  const proposed: KnowledgeLibrary = JSON.parse(JSON.stringify(library));
  const target = proposed.qualityAttributes.find((a) => a.id === attributeId) as unknown as Record<string, unknown>;
  target.calibrationStatus = 'production';
  target.ratifiedBy = ratifiedBy;
  target.ratifiedAt = new Date().toISOString();
  return { proposed };
}
