// Secrets never leave for a model (audit C-34). Every text Sol reads is passed through redactSecrets()
// before it is shown as "what Sol will read" and again before it is sent: API keys and tokens, private
// keys, passwords and secrets written as `name: value` or `name=value`, and passwords inside connection
// strings. Contact details are masked separately when the project's disclosure policy asks for it.
// Patterns look for the shape of a credential, so ordinary architecture text ("the password policy
// requires rotation") is left as written. Nothing is guaranteed: this is a safeguard, not a scanner.

const RULES = [
  // PEM private keys.
  [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g, () => '[private key redacted]'],
  // Well-known token shapes: OpenAI and similar sk-/rk- keys, GitHub, Slack, Google, AWS access keys, JWTs.
  [/\b(?:sk|rk)-(?:proj-|live-|test-|ant-)?[A-Za-z0-9_-]{20,}/g, () => '[API key redacted]'],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g, () => '[token redacted]'],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/g, () => '[token redacted]'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/g, () => '[API key redacted]'],
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, () => '[access key redacted]'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, () => '[token redacted]'],
  // Authorization: Bearer <token> / Basic <credentials>.
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/-]{16,}=*/g, (_, scheme) => `${scheme} [token redacted]`],
  // scheme://user:password@host — keep the user and host, drop the password.
  [/\b([a-z][a-z0-9+.-]*:\/\/[^\s:@\/]+:)[^\s@\/]+@/gi, (_, prefix) => `${prefix}[password redacted]@`],
  // Connection-string and configuration pairs: Password=…; AccountKey=…; client_secret: …
  [/\b((?:password|passwd|pwd|secret|client[_-]?secret|api[_-]?key|access[_-]?key|secret[_-]?key|account[_-]?key|shared[_-]?access[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|private[_-]?key)\s*[:=]\s*)(["']?)([^\s"',;]+)\2/gi,
    (match, prefix, quote, value) => credentialLike(value) ? `${prefix}${quote}[secret redacted]${quote}` : match],
];

// A value looks like a credential when it is long, or mixes letters with digits or symbols such as @ # $.
// "must", "rotated" or "must-have" do not; "hunter2", "P@ssw0rd!" and random keys do.
function credentialLike(value) {
  if (value.length >= 20) return true;
  if (value.length < 6) return false;
  return /[A-Za-z]/.test(value) && /[\d!@#$%^&*]/.test(value);
}

export function redactSecrets(text) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  for (const [pattern, replace] of RULES) out = out.replace(pattern, replace);
  return out;
}

// Redacts every string inside a JSON-like value; objects and arrays are copied, other values kept.
export function redactSecretsDeep(value) {
  if (typeof value === 'string') return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactSecretsDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactSecretsDeep(v)]));
  return value;
}
