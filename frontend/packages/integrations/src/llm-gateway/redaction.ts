const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /ghp_[A-Za-z0-9_]{20,}/g,
  /xox[baprs]-[A-Za-z0-9-]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----/g,
];

export interface RedactionResult<T = Record<string, unknown>> {
  context: T;
  prompt: string;
  redactions: Array<{ kind: string; count: number }>;
}

export function redactPromptAndContext<T extends Record<string, unknown>>(prompt: string, context: T): RedactionResult<T> {
  const redactions: Array<{ kind: string; count: number }> = [];
  let safePrompt = prompt;
  let serialized = JSON.stringify(context);

  SECRET_PATTERNS.forEach((pattern, index) => {
    let count = 0;
    safePrompt = safePrompt.replace(pattern, () => {
      count += 1;
      return `[REDACTED_SECRET_${index}]`;
    });
    serialized = serialized.replace(pattern, () => {
      count += 1;
      return `[REDACTED_SECRET_${index}]`;
    });
    if (count > 0) redactions.push({ kind: `secret-pattern-${index}`, count });
  });

  return {
    prompt: safePrompt,
    context: JSON.parse(serialized) as T,
    redactions,
  };
}
