export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateStructuredOutput(output: unknown, schemaName: string): ValidationResult {
  if (typeof output !== 'object' || output === null) {
    return { valid: false, errors: [`${schemaName} output must be an object.`] };
  }

  const record = output as Record<string, unknown>;
  const errors: string[] = [];

  if (!('confidence' in record) || typeof record.confidence !== 'number') {
    errors.push(`${schemaName} must include numeric confidence.`);
  }

  if ('requiresHumanReview' in record && typeof record.requiresHumanReview !== 'boolean') {
    errors.push(`${schemaName}.requiresHumanReview must be boolean when present.`);
  }

  if ('summary' in record && typeof record.summary !== 'string') {
    errors.push(`${schemaName}.summary must be string when present.`);
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}
