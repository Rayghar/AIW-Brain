export const canonicalEpistemicStatuses = [
  'normative-requirement',
  'source-stated-recommendation',
  'measured-result',
  'source-example',
  'implementation-observation',
  'expert-interpretation',
  'sol-inference',
  'hypothesis',
  'illustration',
  'unknown',
] as const;

export type CanonicalEpistemicStatus = (typeof canonicalEpistemicStatuses)[number];
export type EpistemicStatementOrigin = 'source' | 'sol' | 'hypothesis' | 'expert' | 'unknown';

export interface HistoricalEpistemicContext {
  bindingLanguage?: boolean;
  explicitSourceAdvice?: boolean;
  documentedExample?: boolean;
  implementationObservation?: boolean;
}

export interface HistoricalEpistemicMapping {
  input: string;
  status?: CanonicalEpistemicStatus;
  disposition: 'canonical' | 'mapped' | 'requires-context' | 'rejected';
  reviewRequired: boolean;
  rationale: string;
}

export function mapHistoricalEpistemicStatus(value: string, context: HistoricalEpistemicContext = {}): HistoricalEpistemicMapping {
  if (canonicalEpistemicStatuses.includes(value as CanonicalEpistemicStatus)) {
    return { input: value, status: value as CanonicalEpistemicStatus, disposition: 'canonical', reviewRequired: false, rationale: 'Already canonical.' };
  }
  if (value === 'model-inferred') {
    return { input: value, status: 'sol-inference', disposition: 'mapped', reviewRequired: true, rationale: 'A model inference is not a source statement and requires review.' };
  }
  if (value === 'uncertain') {
    return { input: value, status: 'unknown', disposition: 'mapped', reviewRequired: true, rationale: 'Uncertainty without a more precise epistemic basis maps to unknown.' };
  }
  if (value === 'source-asserted') {
    if (context.bindingLanguage) return { input: value, status: 'normative-requirement', disposition: 'mapped', reviewRequired: true, rationale: 'The source uses binding language; authority and scope still require review.' };
    if (context.explicitSourceAdvice) return { input: value, status: 'source-stated-recommendation', disposition: 'mapped', reviewRequired: true, rationale: 'The source explicitly advises an action.' };
    if (context.documentedExample) return { input: value, status: 'source-example', disposition: 'mapped', reviewRequired: true, rationale: 'The statement is supported only as a worked or documented example.' };
    if (context.implementationObservation) return { input: value, status: 'implementation-observation', disposition: 'mapped', reviewRequired: true, rationale: 'The statement describes observed implementation structure or behaviour.' };
    return { input: value, disposition: 'requires-context', reviewRequired: true, rationale: 'Generic source assertion is ambiguous and cannot be mapped without classification context.' };
  }
  return { input: value, disposition: 'rejected', reviewRequired: true, rationale: 'Unknown non-canonical epistemic status.' };
}
