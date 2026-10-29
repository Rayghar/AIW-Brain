// The workbench's one HTML escaper (audit F-01, F-15). Every value placed into HTML goes through esc(),
// including identifiers, references and enumerated values. Those are validated on the command path and
// on restore (shared/document-safety.js), but what is rendered must not depend on that.
// Function declarations only, so the vm-based suites can inline this file next to others.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'));
}

// A long text shortened for a screen (round 12, G, GR-UX-12): whole when it is `max` characters or fewer, else cut at the
// last word boundary before `max` with an ellipsis, never mid-word (one word longer than half of `max` is cut with it).
// The full text belongs in a title, an aria-label or the details beside it.
export function shortText(value, max = 80) {
  const t = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max), at = cut.lastIndexOf(' ');
  return (at >= max * 0.5 ? cut.slice(0, at) : cut.slice(0, max - 1)).replace(/[\s,;:.\-–·]+$/, '') + '…';
}

// A link target taken from stored data. A URL with a scheme must be http, https or mailto; a relative
// reference must stay on this site. Anything else (javascript:, data:, vbscript:, //other.host, or text
// with whitespace or control characters a browser would strip) becomes an inert "#". The result still
// goes through esc() when it is placed in an attribute.
export function safeUrl(value) {
  const text = String(value ?? '').trim();
  if (!text || /[\s\u0000-\u001f\u007f]/.test(text)) return '#';
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(text);
  if (scheme) return /^(?:https?|mailto)$/i.test(scheme[1]) ? text : '#';
  return /^[\/\\]{2}|^\/\\|^\\/.test(text) ? '#' : text;
}
