// Restore and import boundary (audit F-01). A project document that arrives whole, rather than through
// commands, must carry identifiers, references and enumerated values as plain values, as the command path
// produces them, and its stored links must not use a script-bearing scheme. Rendering escapes every value
// as well (html-escape.js); this check refuses a crafted file before anything is saved.

// Markup or control characters: none of these can appear in a generated identifier or an enumerated value.
const MARKUP = /[<>"`\u0000-\u001f\u007f]/;
const ID_KEY = /^(?:id|ref|from|to)$|(?:Id|Ids|Ref|Refs)$/;
// Workbook identifiers are the customer's own text (intake-domain.js) and are escaped when shown.
const FREE_TEXT_IDS = new Set(['externalId']);
const ENUM_KEYS = new Set(['status', 'kind', 'type', 'priority', 'category', 'role', 'effect', 'severity', 'criticality', 'classification', 'mode', 'layer', 'origin', 'polarity', 'claimType', 'state', 'chapter', 'tab', 'tier', 'likelihood', 'verdict']);
// Where a key that names an enumerated value elsewhere holds the architect's own text, as the command path writes it: a
// quality conflict's effect describes what the competing expectations do (quality.js, quality-domain.js: free text, escaped
// wherever it is shown), in the project's quality chapter and in every copy of it (a frozen baseline's design source).
// Round 12 (A3): the drafted design's conflict quoted, and its restore was refused.
const FREE_TEXT_PATHS = [/(?:^\$|\.)quality\.conflicts\[\d+\]\.effect$/];
const URL_KEY = /^(?:url|href|src|locator)$|Url$/;
const SCRIPT_SCHEME = /^(?:javascript|data|vbscript|file):/i;

const describe = (value) => JSON.stringify(String(value).slice(0, 60));

// Returns up to `limit` problems, each naming the JSON path of an unsafe value.
export function documentSafetyProblems(document, {limit = 5} = {}) {
  const problems = [];
  const seen = new Set();
  function check(value, path, key) {
    if (problems.length >= limit) return;
    if (typeof value === 'string') {
      if (ID_KEY.test(key) && !FREE_TEXT_IDS.has(key) && MARKUP.test(value)) problems.push(`${path} is an identifier or reference but holds ${describe(value)}`);
      else if (ENUM_KEYS.has(key) && MARKUP.test(value) && !FREE_TEXT_PATHS.some((free) => free.test(path))) problems.push(`${path} is an enumerated value but holds ${describe(value)}`);
      else if (URL_KEY.test(key) && SCRIPT_SCHEME.test(value.replace(/[\t\n\r]/g, '').replace(/^[\u0000- ]+/, ''))) problems.push(`${path} is a link with a script-bearing scheme`);
      return;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      // An array of identifiers (for example requirementIds) is checked under its own key.
      value.forEach((item, index) => check(item, `${path}[${index}]`, key));
      return;
    }
    for (const [childKey, child] of Object.entries(value)) check(child, `${path}.${childKey}`, childKey);
  }
  check(document, '$', '');
  return problems;
}

export function assertDocumentSafe(document) {
  const problems = documentSafetyProblems(document);
  if (problems.length) throw Error(`This file carries markup or a script link where plain values belong, so it was not restored: ${problems.join('; ')}.`);
}
