import { createHash } from 'node:crypto';

export type RedactionKind = 'private-key' | 'authorization' | 'api-key' | 'credential' | 'email' | 'phone' | 'financial-identifier';

export interface RedactionFinding {
  kind: RedactionKind;
  marker: string;
  fingerprint: string;
}

export interface RedactionResult {
  value: string;
  changed: boolean;
  findings: RedactionFinding[];
  counts: Partial<Record<RedactionKind, number>>;
}

type Classification = 'public' | 'internal' | 'confidential' | 'restricted';

interface PatternRule { kind: RedactionKind; pattern: RegExp; classifications?: Classification[]; }

const RULES: PatternRule[] = [
  { kind: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { kind: 'authorization', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi },
  { kind: 'api-key', pattern: /\b(?:sk|xai|ghp|github_pat|AIza|AKIA)[-_A-Za-z0-9]{12,}\b/g },
  { kind: 'credential', pattern: /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*["']?([^\s,"'}]{6,})["']?/gi },
  { kind: 'credential', pattern: /\b(?:postgres(?:ql)?|mongodb(?:\+srv)?|mysql|redis):\/\/[^\s:@/]+:[^\s@/]+@/gi },
  { kind: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, classifications: ['confidential', 'restricted'] },
  { kind: 'phone', pattern: /(?<!\d)(?:\+?\d[\d\s().-]{8,}\d)(?!\d)/g, classifications: ['restricted'] },
  { kind: 'financial-identifier', pattern: /(?<!\d)\d{10,16}(?!\d)/g, classifications: ['restricted'] },
];

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function redactForModel(value: string, classification: Classification = 'internal'): RedactionResult {
  let output = value;
  const findings: RedactionFinding[] = [];
  const counts: Partial<Record<RedactionKind, number>> = {};
  for (const rule of RULES) {
    if (rule.classifications && !rule.classifications.includes(classification)) continue;
    output = output.replace(rule.pattern, (match) => {
      const next = (counts[rule.kind] ?? 0) + 1;
      counts[rule.kind] = next;
      const marker = `<REDACTED:${rule.kind}:${next}>`;
      findings.push({ kind: rule.kind, marker, fingerprint: fingerprint(match) });
      if (rule.kind === 'credential' && /\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]/i.test(match)) {
        const prefix = match.match(/^\b(password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*/i)?.[0] ?? '';
        return `${prefix}${marker}`;
      }
      if (rule.kind === 'credential' && match.includes('://')) return match.replace(/:\/\/[^@]+@/, `://${marker}@`);
      return marker;
    });
  }
  return { value: output, changed: findings.length > 0, findings, counts };
}
