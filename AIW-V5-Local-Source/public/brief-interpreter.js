// The interpreted brief (round 4, Contract 1; audit/round4/DESIGN.md). The contract's entry point is
// shared/brief-interpreter.js, which re-exports this module: the rules live in public/ because the browser loads only
// public/ (server.js serves it as the page root) and the Projects page counts what a brief holds before the project
// exists. Plain ES module: no DOM, no Node API, no knowledge, no model, no project writes.
//
// interpretBrief(text, {name}) splits a brief into passages (sentences and list items, with offsets into the text)
// and proposes Chapter 1 records from them by deterministic rules: one rule per record kind, each documented below
// with its cue list. The journey drafter (shared/journey-drafter.js) turns proposals into creation answers that the
// person reviews and commits through the governed guide.* commands; nothing here writes a project.
//
// Every proposal is shaped for the Chapter 1 `artefact` command (public/requirements-domain.js): type, title,
// description, owner and source; acceptance and priority for a requirement; scopeMode for a scope boundary; order for
// a journey step. It also carries
//   key         a stable name within this interpretation ('requirement-3');
//   passages    the ids of the passages it was read from (at least one; every id is in passages[]);
//   confidence  'stated' when the passage declares the record (a "must", a "Goal:" label, "out of scope", a numbered
//               step, a role in a Users list); 'inferred' when a rule derived it (an actor from a noun phrase);
//   inferred    the fields whose value is not in the words of the cited passages (an acceptance stub, a default
//               priority). It is worked out by comparing the value with the passages, so no derived value can pass as
//               stated;
//   accountable (stakeholders only, when true) the passage names it as owner, sponsor or accountable.
// The owner is always empty: a brief rarely names one per record, and an owner is never guessed. questions[] lists
// what the brief does not say and Chapter 1 needs, as {key, question, forType}; a question the brief itself asks keeps
// its passage ({..., passages: ['P-007']}). Round 12 (DRF-19): problem is what a Problem section states, read whole
// ({text, passages}), or null; notes[] lists what to check in the reading, as {passages, note} (a listed item kept
// whole although it is long).
export const BRIEF_LIMIT = 20000;
export const BRIEF_RULES = 'brief-rules-1';
export const BRIEF_KINDS = ['outcomes', 'stakeholders', 'actors', 'scope', 'journeys', 'constraints', 'assumptions', 'requirements'];
const TYPE_OF = {outcomes: 'outcome', stakeholders: 'stakeholder', actors: 'actor', scope: 'scope', journeys: 'journey', constraints: 'constraint', assumptions: 'assumption', requirements: 'requirement'};
const MAX_PASSAGES = 1500, MAX_PER_KIND = 250, TITLE = 120, DESCRIPTION = 4000;

// ------------------------------------------------------------------------------------------------ text helpers
const squash = (s) => String(s).replace(/\s+/g, ' ').trim();
const count = (s) => (String(s).match(/\S+/g) || []).length;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Letters and digits in lower case: the form in which a value is compared with its passages.
const plain = (s) => String(s).toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// A verbatim span without its outer quotes and closing punctuation, cut at a word boundary with no ellipsis, so that a
// cut value is still a span of its passage.
function clip(s, max = TITLE) {
  let v = squash(s).replace(/^["'“‘(\[*_]+/, '').replace(/[\s.;:,!?)\]"'”’*_]+$/, '');
  if (v.length <= max) return v;
  v = v.slice(0, max);
  const cut = v.lastIndexOf(' ');
  return (cut > max / 3 ? v.slice(0, cut) : v.slice(0, max - 1)).replace(/[\s,;:]+$/, '') + '…';
}
const describe = (s) => squash(s).length <= DESCRIPTION ? squash(s) : clip(s, DESCRIPTION);

// ------------------------------------------------------------------------------------------------ passages
// The text is read line by line. A blank line or a horizontal rule ends a block. A heading names the section of what
// follows: a Markdown heading (until the next heading), a line ending in a colon, or a short unpunctuated line that
// names a section (Goals, Out of scope, Users …) and is followed by a list or, after the first line, by text. A list
// item (- * • + – 1. 1) (1) a.) is a block, and an indented line under it continues it. A "Label: value" line whose
// label names a section (Goal:, Users:, Budget:, In scope:, Step 1: …) is a block. Other lines join into a paragraph
// while the previous line reads as wrapped (no closing punctuation, and the next line starts in lower case or the
// previous line is long). Blocks are cut into sentences at . ! ? followed by a capital, a digit, a quote or the end,
// except after an abbreviation or an initial. A passage's text is exactly text.slice(start, end).
// Round 12 (DRF-19): a Problem section (a heading or label that opens with problem, problem statement, pain points,
// challenges, as-is, or current state or situation) is the problem the work answers, read whole as the brief's problem
// (problem in the result), never as records: it says what is wrong today, not what to build.
const SECTIONS = [
  ['problem', /^(?:#+\s*)?(?:the |our |key |business )?(?:problems?(?: statement)?|pain points?|challenges?|as[- ]is(?: state| process)?|current (?:state|situation))\b/i],
  ['scopeOut', /\b(out[- ]of[- ]scope|not in scope|exclu(?:ded|sions?)|non[- ]goals?|not included)\b/i],
  ['scopeIn', /\b(in[- ]scope|scope)\b/i],
  ['question', /\b(open questions?|questions|unknowns|to be decided|tbd)\b/i],
  ['assumption', /\b(assumptions?|dependenc(?:y|ies))\b/i],
  ['constraint', /\b(constraints?|limitations?|restrictions?|compliance|regulat\w*|budget|timeline|deadlines?|non[- ]functional)\b/i],
  ['journey', /\b(journey|steps?|process|flow|workflow|how it works|sequence|procedure)\b/i],
  ['stakeholder', /\b(stakeholders?|sponsors?|owners?|accountab\w+|governance)\b/i],
  ['actor', /\b(users?|actors?|personas?|roles?|audiences?|who uses)\b/i],
  ['outcome', /\b(goals?|objectives?|outcomes?|benefits?|success|aims?|purpose|vision|why)\b/i],
  ['requirement', /\b(requirements?|features?|capabilities|must[- ]haves?|should[- ]haves?|needs|functions?)\b/i],
];
const sectionOf = (line) => (SECTIONS.find(([, re]) => re.test(line)) || [null])[0];
const LIST = /^([-*•+–]|\d{1,3}[.)]|\(\d{1,3}\)|[a-z][.)])\s+/;
const LABEL = /^([A-Z][A-Za-z0-9 /&'-]{1,38}):\s*/;
const ABBREVIATIONS = new Set(['e.g', 'i.e', 'eg', 'ie', 'vs', 'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'no', 'approx', 'incl', 'fig', 'cf', 'jr', 'sr', 'dept', 'nr']);

function lines(text) {
  const out = [];
  for (let at = 0; at <= text.length;) {
    const nl = text.indexOf('\n', at), stop = nl < 0 ? text.length : nl;
    let a = at, b = stop;
    while (a < b && /\s/.test(text[a])) a++;
    while (b > a && /\s/.test(text[b - 1])) b--;
    out.push({start: a, end: b, line: text.slice(a, b), indented: a > at});
    if (nl < 0) break;
    at = nl + 1;
  }
  return out;
}

function blocks(text) {
  const rows = lines(text), out = [];
  let section = null, lead = null, paragraph = null, item = null, seenText = false;
  const close = () => { if (paragraph) out.push(paragraph); paragraph = null; };
  for (let i = 0; i < rows.length; i++) {
    const {start, end, line, indented} = rows[i], next = rows.slice(i + 1, i + 40).find((r) => r.line)?.line || '';
    if (!line || /^([-*_=])\1{2,}$/.test(line)) { close(); item = null; if (!line && lead && !LIST.test(next)) lead = null; continue; }
    const markdown = /^#{1,6}\s+/.test(line), listed = LIST.test(line), named = sectionOf(line) || (/:$/.test(line) && /\b(must|shall|should|needs? to)\b/i.test(line) ? 'requirement' : null);
    const leadsList = !listed && LIST.test(next) && (/:$/.test(line) || (line.length <= 60 && !/[.!?;,]$/.test(line)));
    const namesSection = !listed && seenText && named && line.length <= 60 && !/[.!?;,:]$/.test(line) && count(line) <= 8 && next;
    if (markdown || leadsList || namesSection || (!listed && /:$/.test(line) && line.length <= 80)) {
      close(); item = null;
      out.push({start, end, shape: 'heading', section: named});
      if (markdown || namesSection) { section = named; lead = null; } else lead = named;
      seenText = true;
      continue;
    }
    seenText = true;
    const marker = LIST.exec(line);
    if (marker) {
      close();
      item = {start: start + marker[0].length, end, shape: 'item', section: lead ?? section, ordinal: /\d/.test(marker[1]) ? Number(marker[1].replace(/\D/g, '')) : null};
      out.push(item);
      continue;
    }
    if (item && indented) { item.end = end; continue; }
    item = null;
    if (lead) lead = null;
    const label = LABEL.exec(line), labelled = label && sectionOf(label[1]);
    if (labelled) { close(); out.push({start, end, shape: 'label', section: labelled, valueStart: start + label[0].length}); continue; }
    if (paragraph && !/[.!?:;]$/.test(text.slice(paragraph.start, paragraph.end)) && (/^[a-z0-9(]/.test(line) || rows[i - 1].line.length >= 50)) paragraph.end = end;
    else { close(); paragraph = {start, end, shape: 'sentence', section}; }
  }
  close();
  return out;
}

function sentences(text, block) {
  const out = [], body = text.slice(block.start, block.end);
  let from = 0;
  for (const m of body.matchAll(/[.!?]+["'”’)\]]*(?=\s|$)/g)) {
    const stop = m.index + m[0].length;
    let next = stop;
    while (next < body.length && /\s/.test(body[next])) next++;
    const after = body.slice(next, next + 1), word = (/([\p{L}.]+)$/u.exec(body.slice(Math.max(from, m.index - 40), m.index)) || ['', ''])[1].toLowerCase().replace(/\.$/, '');
    if (after && !/^[\p{Lu}\p{N}"'“‘(\[]/u.test(after)) continue;
    if (m[0] === '.' && (ABBREVIATIONS.has(word) || /^\p{L}$/u.test(word))) continue;
    out.push([from, stop]);
    from = stop;
  }
  out.push([from, body.length]);
  return out.map(([a, b]) => {
    while (a < b && /\s/.test(body[a])) a++;
    while (b > a && /\s/.test(body[b - 1])) b--;
    return {...block, start: block.start + a, end: block.start + b};
  }).filter((s) => s.end > s.start);
}

function segment(text) {
  const units = [];
  let truncated = false;
  for (const block of blocks(text)) {
    for (const s of block.shape === 'heading' ? [block] : sentences(text, block)) {
      if (units.length >= MAX_PASSAGES) { truncated = true; break; }
      const raw = text.slice(s.start, s.end), label = s.shape !== 'heading' && LABEL.exec(raw), named = label && sectionOf(label[1]);
      // A sentence that opens with its own section label ("Out of scope: billing." after "In scope: …") is that section.
      const unit = named ? {...s, shape: s.shape === 'item' ? 'item' : 'label', section: named, valueStart: s.start + label[0].length} : s;
      const labelled = unit.valueStart >= unit.start && unit.valueStart <= unit.end && (named || unit.shape === 'label');
      units.push({...unit, id: 'P-' + String(units.length + 1).padStart(3, '0'), text: raw, clean: squash(raw), value: labelled ? squash(text.slice(unit.valueStart, unit.end)) : squash(raw)});
    }
  }
  return {units, truncated};
}

// ------------------------------------------------------------------------------------------------ the rules
// Requirement. A positive modal: must, shall, has to, have to, need(s) to, is/are required to, will need to (Must);
// should, is/are expected to (Should); could, would like to, nice to have (Could). The title is what follows the modal
// (without "be able to"); a "so that" or "in order to" clause becomes an outcome. A user story, "As a <role>, I want
// <behaviour> so that <outcome>", is a requirement, a stated actor and an outcome. Every list item under a
// Requirements / Features / Capabilities heading is a requirement. The priority is marked inferred unless the passage
// says must, should or could itself (a user story or an unmarked item is Must, inferred). The acceptance criterion is
// always an inferred stub with bracketed blanks for the person to replace.
const MODAL = /\b(must|shall|has to|have to|needs? to|(?:is|are) required to|will need to|should|(?:is|are) expected to|could|would like to|nice to have)\b/i;
const priorityOf = (cue) => /^(should|is expected|are expected)/i.test(cue) ? 'Should' : /^(could|would like|nice)/i.test(cue) ? 'Could' : 'Must';
const USER_STORY = /^as an?\s+(.{2,80}?),?\s+I\s+(?:want|need|would like|must be able|should be able|can)\s+(?:to\s+)?(.+?)(?:,?\s+so that\s+(.+?))?[.!]?$/i;
const NOT_A_REQUIREMENT = /^(?:consider|think about|discuss|explore|decide|investigate)\b/i;
// Constraint: what limits the answer. Firm cues win over a positive modal: a negative modal (must not, mustn't, shall
// not, should not, must never, may not, is/are not allowed or permitted, prohibited, forbidden); regulation (regulation,
// regulatory, comply, compliance, GDPR, HIPAA, PCI DSS, ISO nnnn, WCAG, accessibility standards, legislation,
// statutory, data protection, by law); a fixed technology (must use, run on, integrate with, be hosted, reuse; an
// existing system, platform, ledger, database, CRM, ERP or infrastructure; on premises); a deadline (deadline, go
// live, no later than, launch in/by/before, live / launched / delivered / in place / ready / operational by a date).
// Soft cues count only without a positive modal (with one they are that requirement's own target): money (budget,
// funding, a currency amount), a date (by / before a month, quarter or year), "within" a duration.
const WHEN = 'january|february|march|april|may|june|july|august|september|october|november|december|q[1-4]|\\d{4}|next (?:year|month|quarter|spring|summer|autumn|fall|winter)|the end of (?:the )?(?:year|month|quarter)';
const FIRM = [
  /\b(must not|mustn't|shall not|should not|must never|may not|(?:is|are) not (?:allowed|permitted)|prohibited|forbidden)\b/i,
  /\b(regulat(?:ion|ions|ory|or|ors)|comply|complies|compliance|compliant|gdpr|hipaa|pci(?:[- ]dss)?|iso ?\d{4,5}|wcag|accessibility standards?|legislation|statutory|data protection|by law)\b/i,
  /\b(must (?:use|run on|integrate with|be hosted|reuse)|existing (?:system|platform|ledger|database|crm|erp|infrastructure)|on[- ]premises?)\b/i,
  new RegExp(`\\b(deadline|go[- ]live|no later than|launch(?:es|ed)? (?:in|by|before) (?:${WHEN})|(?:live|launched|delivered|in place|ready|operational|in production) (?:by|before|in) (?:${WHEN}))\\b`, 'i'),
];
const SOFT = [
  /\b(budget|funding)\b|[£$€]\s?\d|\b\d[\d,.]*\s?(?:k|m|million|thousand)\s+(?:pounds|dollars|euros|gbp|usd|eur)\b/i,
  new RegExp(`\\b(?:by|before) (?:${WHEN})\\b`, 'i'),
  /\bwithin\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a|an)\s+(?:working\s+|business\s+|calendar\s+)?(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/i,
];
// Assumption: we assume, assume(s/d), assuming, assumption(s), we expect, it is expected that, presumably, we believe,
// depends on, dependent on, relies on, rely on, provided that, as long as, to be confirmed, TBC. The title is what
// follows "assume (that)" when the sentence has it.
const ASSUMPTION = /\b(we assume|assum(?:e|es|ed|ing|ptions?)|we expect|it is expected that|presumably|we believe|depends on|dependent on|relies on|rely on|provided that|as long as|to be confirmed|tbc)\b/i;
// Outcome: a declared goal ("the goal / objective / aim / purpose / outcome / vision is (to) …"), an intention ("we /
// the council / business / organisation / company / team / service / department / clinic / hospital / bank want(s) /
// aim(s) / hope(s) / intend(s) / plan(s) to …"), a purpose clause (so that, in order to), or a measurable change
// (reduce, increase, improve, cut, lower, raise, halve, double, shorten, speed up, eliminate, minimise, maximise …
// with a number, a percentage or "by half"); and every item under a Goals / Objectives / Outcomes / Success heading.
const GOAL = /\b(?:goal|objective|aim|purpose|intended outcome|outcome|vision)s?\s+(?:is|are|will be)\s+(?:to\s+)?(.+)$/i;
const INTENT = /\b(?:we|the (?:council|business|organi[sz]ation|company|team|service|department|clinic|hospital|bank))\s+(?:want|wants|aim|aims|hope|hopes|intend|intends|plan|plans)\s+to\s+(.+)$/i;
const PURPOSE = /\b(?:so that|in order to)\s+(.+)$/i;
const CHANGE = /\b(?:reduce|increase|improve|cut|lower|raise|halve|double|shorten|speed up|eliminate|minimi[sz]e|maximi[sz]e)\b[^.]{0,200}?(?:\d+(?:\.\d+)?\s?%|\d+\s+(?:seconds?|minutes?|hours?|days?|weeks?|percent)|by half|in half)/i;
const MEASURE = /\d|%|\b(?:half|halve|halved|double|doubled|twice|percent)\b/i;
// Scope: "<subject> is/are in scope, included, out of scope, not in scope, excluded or outside (the) scope"; "will
// not / won't / does not / do not / is not going to cover, include, handle, support or address …" (out); "the project
// / service / (first) release / pilot / phase / MVP / first version / scope (only) covers / includes / is limited to /
// focuses on …" (in); and every item under an In scope / Out of scope heading or label. Enumerations ("requests,
// status and replies") give one boundary each.
const SCOPE_IS = /^(.{3,120}?)\s+(?:is|are)\s+(out of scope|not in scope|excluded|outside (?:the )?scope|in scope|included)\b/i;
const SCOPE_NOT = /\b(?:will not|won't|does not|do not|is not going to)\s+(?:cover|include|handle|support|address)\s+(.+)$/i;
const SCOPE_ONLY = /^(?:the |this |our )?(?:project|service|first release|release|pilot|phase(?: \w+)?|mvp|first version|scope)\s+(?:only\s+)?(?:covers|includes|is limited to|focuses on)\s+(.+)$/i;
// Journey step: a numbered list item that no other rule claimed, every item under a Journey / Steps / Process / Flow
// heading or a "Step n:" label, and each sentence or clause a sequence word opens (first, firstly, then, next, after
// that / this, afterwards, finally, lastly, subsequently; ", then" and "and then" inside a sentence), counted only
// when the brief has at least two of them. A sentence opening with if, when or unless is a condition, not a step.
const SEQUENCE = /^(?:first(?:ly)?(?![-\w])|then|next|after (?:that|this)|afterwards|finally|lastly|subsequently)\b[,\s]*/i;
const THEN = /(?:[,;]\s*(?:and\s+)?|\s+and\s+)then\s+/i;
// Actor and stakeholder: role and organisation nouns with up to two qualifiers before them (a known qualifier such as
// case, warehouse, front desk, operations, or a capitalised name). People who use or work the service are actors;
// organisations, teams, sponsors and owners are stakeholders. A role named in a Users / Stakeholders list or label,
// after "As a", with an accountability verb (owns, sponsors, funds, approves, is accountable / responsible, leads,
// commissioned, is the owner / sponsor) or after "owned / sponsored / funded / commissioned / led by" is stated; one
// found anywhere else in a sentence is inferred. A role noun followed by a noun of a thing (customer data, user
// interface) is not a role, and a bare generic noun (the team, the board, the owner) needs a qualifier.
const PEOPLE = ['citizen', 'resident', 'customer', 'client', 'user', 'member', 'patient', 'applicant', 'student', 'visitor', 'caller', 'guest', 'traveller', 'traveler', 'passenger', 'tenant', 'driver', 'courier', 'picker', 'packer', 'receptionist', 'clinician', 'doctor', 'nurse', 'physician', 'pharmacist', 'therapist', 'caseworker', 'worker', 'officer', 'agent', 'operator', 'administrator', 'admin', 'manager', 'supervisor', 'clerk', 'analyst', 'engineer', 'technician', 'inspector', 'auditor', 'reviewer', 'approver', 'planner', 'dispatcher', 'staff', 'employee', 'volunteer', 'teacher', 'buyer', 'seller', 'merchant', 'shopper', 'subscriber', 'claimant', 'taxpayer', 'contractor', 'landlord', 'parent', 'carer', 'caregiver', 'developer', 'tester'];
const ORGANISATIONS = ['council', 'department', 'ministry', 'agency', 'authority', 'regulator', 'government', 'board', 'committee', 'team', 'bank', 'company', 'organisation', 'organization', 'firm', 'office', 'directorate', 'trust', 'union', 'association', 'partner', 'supplier', 'vendor', 'provider', 'insurer', 'sponsor', 'owner', 'executive', 'director', 'leadership', 'management', 'helpdesk', 'unit', 'division', 'hospital', 'clinic', 'school', 'university', 'charity', 'retailer', 'carrier'];
const GENERIC = new Set(['team', 'unit', 'office', 'division', 'board', 'committee', 'management', 'leadership', 'owner', 'sponsor', 'member', 'partner', 'provider', 'authority', 'trust', 'union', 'association']);
const QUALIFIERS = new Set(['case', 'front', 'desk', 'front-desk', 'field', 'council', 'clinic', 'hospital', 'support', 'service', 'customer', 'operations', 'ops', 'finance', 'legal', 'compliance', 'security', 'it', 'call', 'contact', 'centre', 'center', 'delivery', 'store', 'branch', 'back-office', 'duty', 'senior', 'junior', 'external', 'internal', 'third-party', 'business', 'product', 'project', 'programme', 'program', 'account', 'area', 'site', 'shift', 'warehouse', 'fleet', 'hr', 'procurement', 'sales', 'marketing', 'claims', 'billing', 'payments', 'payment', 'planning', 'city', 'county', 'state', 'federal', 'local', 'national', 'regional', 'health', 'care', 'social', 'housing', 'transport', 'medical', 'dental', 'nursing', 'reception', 'records', 'admissions', 'logistics', 'inventory', 'dispatch', 'quality', 'risk', 'audit', 'platform', 'engineering', 'end', 'help', 'steering', 'web', 'mobile', 'online', 'data', 'system']);
const THING_AFTER = new Set(['data', 'record', 'records', 'interface', 'interfaces', 'experience', 'account', 'accounts', 'id', 'ids', 'number', 'numbers', 'details', 'information', 'portal', 'journey', 'journeys', 'satisfaction', 'feedback', 'request', 'requests', 'service', 'services', 'support', 'base', 'name', 'names', 'profile', 'profiles', 'group', 'groups', 'story', 'stories', 'needs', 'research', 'testing', 'acceptance', 'input', 'inputs', 'list', 'lists', 'role', 'roles', 'type', 'types', 'onboarding', 'contact', 'address', 'email', 'emails', 'history', 'app', 'application', 'applications', 'login', 'access', 'guide', 'manual', 'training', 'model', 'meeting', 'meetings', 'review', 'reviews', 'approval', 'approvals', 'decision', 'decisions', 'report', 'reports', 'level', 'levels', 'facing', 'side', 'owned', 'led', 'based', 'friendly', 'panel', 'dashboard', 'screen', 'screens', 'page', 'pages', 'tool', 'tools', 'system', 'systems', 'view', 'views', 'centric', 'focused', 'safety', 'portal', 'self-service', 'charter', 'policy', 'policies']);
const STOP = new Set(['the', 'a', 'an', 'our', 'their', 'its', 'his', 'her', 'all', 'each', 'every', 'any', 'some', 'many', 'most', 'other', 'new', 'existing', 'when', 'if', 'once', 'then', 'and', 'or', 'for', 'by', 'to', 'of', 'in', 'on', 'at', 'with', 'from', 'as', 'that', 'which', 'who', 'this', 'these', 'those', 'we', 'i', 'it', 'they', 'can', 'must', 'should', 'will', 'shall', 'may', 'not', 'no', 'is', 'are', 'be', 'so', 'than', 'also', 'only', 'first', 'then', 'next', 'finally']);
const plural = (w) => /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /(s|sh|ch|x)$/.test(w) ? w + 'es' : w + 's';
const ROLE_FORMS = new Map([...PEOPLE.map((w) => [w, 'actor']), ...ORGANISATIONS.map((w) => [w, 'stakeholder'])].flatMap(([w, kind]) => [[w, {kind, head: w}], [plural(w), {kind, head: w}]]));
const ROLE = new RegExp('\\b(' + [...ROLE_FORMS.keys()].sort((a, b) => b.length - a.length).join('|') + ')\\b', 'gi');
const ACCOUNTABLE = /^\s*(?:will\s+|must\s+)?(?:owns?|sponsors?|funds?|approves?|(?:is|are) (?:accountable|responsible)|leads?|commissioned|(?:is|are) the (?:owner|sponsor))\b/i;
const OWNED_BY = /\b(?:owned|sponsored|funded|commissioned|led) by\s+((?:the\s+)?[^,;.()]{2,80}?)(?=[,;.()]|\s+(?:and|who|which|with|to|for)\b|$)/i;
const HEAD_OF = /\b((?:Head|Director|Chief \w+ Officer|Manager) of(?: (?:the )?[A-Z][\w&'-]*)+)/g;

// Role phrases in one sentence: [{phrase, kind, accountable}].
function roles(sentence) {
  const found = [];
  for (const m of sentence.matchAll(ROLE)) {
    const form = ROLE_FORMS.get(m[1].toLowerCase()), after = sentence.slice(m.index + m[1].length);
    const next = (/^\s+([\p{L}-]+)/u.exec(after) || [])[1]?.toLowerCase();
    if (next && (THING_AFTER.has(next) || ROLE_FORMS.has(next))) continue;
    if (/^['’]s?\s+(?:data|records?|accounts?|details|information)\b/i.test(after)) continue;
    let start = m.index;
    for (let n = 0; n < 2; n++) {
      const before = /([\p{L}&'-]+)\s+$/u.exec(sentence.slice(0, start));
      if (!before) break;
      const word = before[1], at = start - before[0].length, opens = sentence.slice(0, at).trim() === '';
      const proper = /^\p{Lu}/u.test(word) && !STOP.has(word.toLowerCase()) && !ROLE_FORMS.has(word.toLowerCase()) && (!opens || /^\p{Lu}/u.test(m[1]));
      if (!QUALIFIERS.has(word.toLowerCase()) && !proper) break;
      start = at;
    }
    const accountable = ACCOUNTABLE.test(after), phrase = sentence.slice(start, m.index + m[1].length);
    if (start === m.index && GENERIC.has(form.head) && !accountable) continue;
    found.push({phrase, kind: form.kind, accountable});
  }
  for (const m of sentence.matchAll(HEAD_OF)) found.push({phrase: m[1], kind: 'stakeholder', accountable: ACCOUNTABLE.test(sentence.slice(m.index + m[1].length))});
  const owned = OWNED_BY.exec(sentence);
  if (owned) found.push({phrase: owned[1].replace(/^the\s+/i, ''), kind: 'stakeholder', accountable: true});
  return found;
}

// The values of a label or list item ("In scope: requests, status and replies") as verbatim spans. A comma between
// digits is a thousands separator, not a list ("1,400 requirements across 18 modules" is one value). Round 12
// (DRF-19): a long value is kept whole, never dropped; LONG_ITEM words or more and the caller notes it to check.
const LONG_ITEM = 13;
const SEPARATOR = /\s*;\s*|\s*(?:(?<!\d),|,(?!\d))\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+(?=[^,]*$)/i;
function enumerate(value) {
  const v = clip(value, 2000);
  if (!/;|(?<!\d),|,(?!\d)/.test(v)) return v ? [v] : [];
  return v.split(SEPARATOR).map((x) => clip(x)).filter(Boolean);
}
// The role an item or label names: the words before a dash, colon or bracket, and before a comma unless the name
// lists its parts ("Finance, ledger and control" is one name; "Branch staff, who serve customers" is Branch staff).
const NAME_LIST = /^[\p{L}&'’-]+(?:\s+[\p{L}&'’-]+)?(?:,\s+[\p{L}&'’-]+(?:\s+[\p{L}&'’-]+)?)*,?\s+(?:and|&)\s+[\p{L}&'’-]+(?:\s+[\p{L}&'’-]+)?$/u;
const roleName = (value) => { const head = value.split(/\s+[—–-]\s+|:\s|\s*\(/)[0].trim(); return clip(NAME_LIST.test(head) && count(head) <= 6 ? head : head.split(/,\s/)[0]).replace(/^(?:the|our|all)\s+/i, ''); };

function requirementParts(sentence) {
  const m = MODAL.exec(sentence);
  if (!m) return null;
  const subject = sentence.slice(0, m.index).trim().replace(/[,:]$/, '');
  let predicate = sentence.slice(m.index + m[0].length).replace(/^\s*(?:also\s+|always\s+)?(?:be able to\s+|to\s+)?/i, '');
  const purpose = PURPOSE.exec(predicate);
  if (purpose) predicate = predicate.slice(0, purpose.index);
  return {cue: m[1], subject: count(subject) <= 8 ? subject : '', predicate: clip(predicate), purpose: purpose ? clip(purpose[1]) : ''};
}

function acceptanceStub(subject, predicate) {
  const who = !subject ? '[the actor]' : /^\p{Lu}\p{Ll}/u.test(subject) ? subject.charAt(0).toLowerCase() + subject.slice(1) : subject;
  const what = predicate ? predicate.charAt(0).toLowerCase() + predicate.slice(1) : '[perform the behaviour]';
  return `Given [the starting condition], when [the triggering event] occurs, then ${who} can ${what} and [the observable result] is verified.`;
}

// ------------------------------------------------------------------------------------------------ interpretBrief
export function interpretBrief(text, {name} = {}) {
  if (typeof text !== 'string') throw TypeError('A brief is read from text.');
  if (text.length > BRIEF_LIMIT) throw RangeError('Keep the brief within 20,000 characters.');
  const project = typeof name === 'string' && name.trim() ? squash(name).slice(0, 100) : 'this project';
  const {units, truncated} = segment(text);
  const out = Object.fromEntries(BRIEF_KINDS.map((k) => [k, []])), asked = new Set(), declared = [], sequenced = [], problems = [], notes = [];
  // A list item or sentence under a heading cites the heading too: the heading is what says what it is.
  let lastHeading = null;
  const headingOf = new Map(units.map((u) => { if (u.shape === 'heading') lastHeading = u; return [u.id, u.shape !== 'heading' && lastHeading?.section && lastHeading.section === u.section ? lastHeading : null]; }));
  const cite = (u) => u.bySection && headingOf.get(u.id) ? [headingOf.get(u.id).id, u.id] : [u.id];
  // One proposal per title within a kind: a repeat adds its passages to the first.
  const kept = Object.fromEntries(BRIEF_KINDS.map((k) => [k, new Map()]));
  const add = (kind, u, record, defaulted = []) => {
    if (!record.title) return;
    const key = plain(record.title) + (record.scopeMode ? ':' + record.scopeMode : ''), first = kept[kind].get(key);
    if (first) { for (const id of cite(u)) if (!first.passages.includes(id)) first.passages.push(id); return; }
    if (out[kind].length >= MAX_PER_KIND) return;
    const proposal = {type: TYPE_OF[kind], ...record, owner: '', passages: cite(u), confidence: 'stated', defaulted};
    kept[kind].set(key, proposal); out[kind].push(proposal);
  };
  const outcome = (u, title) => add('outcomes', u, {title: cap(clip(title)), description: describe(u.clean)});
  const scope = (u, title, mode) => add('scope', u, {title: cap(clip(title)), description: describe(u.clean), scopeMode: mode});
  const constraint = (u) => add('constraints', u, {title: cap(clip(u.clean)), description: describe(u.clean)});
  const assumption = (u, s) => add('assumptions', u, {title: cap(clip(s.replace(/^.*?\b(?:we\s+)?assum(?:e|es|ed|ing)\s+(?:that\s+)?/i, ''))), description: describe(u.clean)});
  const step = (u, clause) => add('journeys', u, {title: cap(clip(clause.replace(SEQUENCE, ''))), description: describe(clause)});
  // The items a value lists; one of LONG_ITEM words or more is kept whole, with a note to check it (DRF-19).
  const items = (u, value) => { const xs = enumerate(value); if (xs.length > 1) for (const x of xs) if (count(x) >= LONG_ITEM) notes.push({passages: [u.id], note: `${u.id} lists an item of ${count(x)} words, kept whole: check that it is one item and not a sentence that lists several.`}); return xs; };
  // The priority is stated only when the passage says must, should or could; shall, needs to, would like to, a user
  // story or a listed item without a modal give a priority the rule chose, marked inferred.
  const requirement = (u, parts) => {
    const said = parts.predicate && count(parts.predicate) >= 2 ? parts.predicate : clip(u.value);
    add('requirements', u, {title: cap(said), description: describe(u.clean), acceptance: acceptanceStub(parts.subject, said), priority: parts.cue ? priorityOf(parts.cue) : 'Must'}, /^(must|should|could)$/i.test(parts.cue) ? [] : ['priority']);
    if (parts.purpose) outcome(u, parts.purpose);
  };

  for (const u of units) {
    if (u.shape === 'heading') continue;
    const s = u.clean, value = u.value, section = u.section, modal = MODAL.test(s), firm = FIRM.some((re) => re.test(s));
    if (/\?["'”’)]*$/.test(s) || section === 'question') { asked.add(u); continue; }
    // What a heading, list or label declares. A sentence under a heading that has its own modal or a firm constraint
    // cue is read by its shape instead.
    u.bySection = !!section && (u.shape !== 'sentence' || (!modal && !firm));
    if (u.bySection) {
      if (section === 'problem') { problems.push(u); continue; }
      if (section === 'outcome') { outcome(u, value); continue; }
      if (section === 'scopeIn' || section === 'scopeOut') { for (const v of items(u, value)) scope(u, v, section === 'scopeOut' ? 'out' : 'in'); continue; }
      if (section === 'stakeholder' || section === 'actor') {
        const named = u.shape === 'label' ? enumerate(value).map(roleName) : u.shape === 'item' ? [roleName(value)] : [];
        const listed = named.filter((v) => v && count(v) <= 6);
        for (const phrase of listed.length ? listed : roles(s).map((r) => r.phrase)) declared.push({u, phrase, kind: section, accountable: section === 'stakeholder' && /\b(owner|sponsor|accountab)/i.test((headingOf.get(u.id)?.clean || '') + ' ' + s.slice(0, s.length - value.length))});
        continue;
      }
      if (section === 'journey') { step(u, value); continue; }
      if (section === 'constraint') { constraint(u); continue; }
      if (section === 'assumption') { assumption(u, value); continue; }
      if (section === 'requirement') { requirement(u, requirementParts(value) || {cue: '', subject: '', predicate: clip(value.replace(PURPOSE, '')), purpose: clip((PURPOSE.exec(value) || ['', ''])[1])}); continue; }
    }
    // Sentence shapes, in this order: user story, scope, assumption, constraint, requirement, outcome, journey step.
    const story = USER_STORY.exec(s);
    if (story) {
      declared.push({u, phrase: clip(story[1]).replace(/^(?:the|our)\s+/i, ''), kind: 'actor'});
      requirement(u, {cue: '', subject: 'the ' + clip(story[1]).replace(/^(?:the|our)\s+/i, ''), predicate: clip(story[2]), purpose: story[3] ? clip(story[3]) : ''});
      continue;
    }
    const scoped = SCOPE_IS.exec(s), excluded = !scoped && SCOPE_NOT.exec(s), only = !scoped && !excluded && SCOPE_ONLY.exec(s);
    if (scoped) { for (const v of items(u, scoped[1])) scope(u, v, /^(in scope|included)$/i.test(scoped[2]) ? 'in' : 'out'); continue; }
    if (excluded || only) { for (const v of items(u, (excluded || only)[1])) scope(u, v, excluded ? 'out' : 'in'); continue; }
    if (ASSUMPTION.test(s)) { assumption(u, s); continue; }
    if (firm || (!modal && SOFT.some((re) => re.test(s)))) { constraint(u); continue; }
    const parts = modal && requirementParts(s);
    if (parts && !NOT_A_REQUIREMENT.test(parts.predicate)) { requirement(u, parts); continue; }
    const declaredGoal = GOAL.exec(s) || INTENT.exec(s) || PURPOSE.exec(s), change = CHANGE.exec(s);
    if (declaredGoal) { outcome(u, declaredGoal[1]); continue; }
    if (change) { outcome(u, s.slice(change.index)); continue; }
    if (u.shape === 'item' && u.ordinal != null) { step(u, s); continue; }
    if (/^(?:if|when|unless)\b/i.test(s)) continue;
    const clauses = s.split(THEN).filter((c) => c.trim());
    if (SEQUENCE.test(s) || clauses.length > 1) for (const c of clauses) sequenced.push({u, c});
  }
  // Steps read from sequence words count only when there are at least two of them.
  if (sequenced.length >= 2) for (const {u, c} of sequenced) step(u, c);

  // Actors and stakeholders: the declared ones (stated), then every role phrase in a sentence (inferred unless an
  // accountability verb names it). One per role; the first passage describes it and the others are cited too.
  const people = new Map();
  const roleKey = (phrase) => plain(phrase).replace(/^(?:the|our|all|each|every|a|an)\s+/, '').split(' ').map((w, i, all) => i < all.length - 1 ? w : ROLE_FORMS.get(w)?.head || w.replace(/(?<=[^s])s$/, '')).join(' ');
  const person = (u, phrase, kind, confidence, accountable) => {
    const key = roleKey(phrase), seen = key && people.get(kind + ':' + key), other = key && people.get((kind === 'actor' ? 'stakeholder' : 'actor') + ':' + key);
    if (!key || (!seen && other?.confidence === 'stated' && confidence === 'inferred')) return;
    if (seen) { for (const id of cite(u)) if (!seen.passages.includes(id)) seen.passages.push(id); if (confidence === 'stated') seen.confidence = 'stated'; seen.accountable ||= accountable; return; }
    if (people.size < 2 * MAX_PER_KIND) people.set(kind + ':' + key, {type: kind, title: cap(clip(phrase)), description: describe(u.clean), owner: '', passages: cite(u), confidence, accountable, defaulted: []});
  };
  for (const d of declared) person(d.u, d.phrase.replace(/\s*\(.*$/, ''), d.kind === 'stakeholder' || roles(d.phrase)[0]?.kind === 'stakeholder' ? 'stakeholder' : 'actor', 'stated', !!d.accountable);
  for (const u of units) if (u.shape !== 'heading' && !asked.has(u)) for (const r of roles(u.clean)) person({...u, bySection: false}, r.phrase, r.kind, r.accountable ? 'stated' : 'inferred', r.accountable);
  for (const p of people.values()) { const kind = p.type === 'stakeholder' ? 'stakeholders' : 'actors'; if (out[kind].length < MAX_PER_KIND) out[kind].push(p); }

  // The key, the source line and the inferred fields of each proposal.
  const byId = new Map(units.map((u) => [u.id, u]));
  for (const kind of BRIEF_KINDS) out[kind] = out[kind].map((p, i) => finish(p, kind, i, byId));
  out.journeys.forEach((j, i) => { j.order = i + 1; });
  // The problem the brief states in a Problem section, whole, with the passages it rests on (and its heading's).
  const problem = problems.length ? {text: describe(problems.map((u) => u.value).join(' ')), passages: [...new Set(problems.flatMap(cite))]} : null;
  return {passages: units.map((u) => ({id: u.id, start: u.start, end: u.end, text: u.text})), ...out, problem, notes, questions: questions(out, asked, project, truncated)};
}

// A field is inferred when its value is not in the words of the passages it cites (letters and digits compared); a
// rule adds an enumerated field it defaulted (a listed requirement's priority when no modal said Must, Should, Could).
function finish(p, kind, index, byId) {
  const {defaulted, accountable, ...record} = p;
  const said = plain(record.passages.map((id) => byId.get(id).text).join(' '));
  const inferred = ['title', 'description', 'acceptance'].filter((f) => record[f] && !said.includes(plain(record[f])));
  return {key: TYPE_OF[kind] + '-' + (index + 1), ...record, source: 'Opening brief · ' + record.passages.join(', '), ...(accountable ? {accountable: true} : {}), inferred: [...inferred, ...defaulted]};
}

function questions(out, asked, project, truncated) {
  const q = [], ask = (key, question, forType) => q.push({key, question, forType});
  for (const u of asked) {
    const s = u.clean;
    const forType = /\b(own|owns|owner|accountab\w*|sponsor\w*|approv\w*)\b/i.test(s) ? 'stakeholder' : /\b(scope|include|exclude|cover)\b/i.test(s) ? 'scope' : /\b(users?|who)\b/i.test(s) ? 'actor' : /\b(assum\w*|depend\w*)\b/i.test(s) ? 'assumption' : /\b(budget|deadline|regulat\w*|comply|limit\w*)\b/i.test(s) ? 'constraint' : /\b(goal|success|measure\w*|outcome|why)\b/i.test(s) ? 'outcome' : /\b(steps?|order|process|flow)\b/i.test(s) ? 'journey' : 'requirement';
    q.push({key: 'brief-' + u.id, question: clip(s, 600) + '?', forType, passages: [u.id]});
  }
  if (!out.stakeholders.some((s) => s.accountable)) ask('owner', `Who owns ${project} and is accountable for its outcome?`, 'stakeholder');
  if (!out.stakeholders.length) ask('stakeholders', 'Which organisations, teams or roles are affected by this work or must approve it?', 'stakeholder');
  if (!out.outcomes.length) ask('outcome', 'What outcome should this work achieve, and for whom?', 'outcome');
  if (!out.outcomes.some((o) => MEASURE.test(o.title + ' ' + o.description))) ask('success-measure', 'How will you know it succeeded: which number, date or observable change?', 'outcome');
  if (!out.actors.length) ask('actors', 'Who uses or operates the service, and in which role?', 'actor');
  if (!out.scope.some((s) => s.scopeMode === 'out')) ask('scope-boundary', out.scope.length ? 'What is explicitly out of scope?' : 'What is in scope for this work, and what is explicitly out of scope?', 'scope');
  if (!out.journeys.length) ask('journey', 'What are the main steps, from the first request to the outcome?', 'journey');
  if (!out.requirements.length) ask('requirements', 'Which behaviours must the service provide, and for whom?', 'requirement');
  else {
    ask('acceptance', 'The acceptance criteria proposed here are stubs with blanks: what observable result shows that each requirement is met?', 'requirement');
    ask('requirement-owner', 'Who is accountable for each requirement?', 'requirement');
  }
  if (!out.constraints.length) ask('constraints', 'What limits the solution: budget, deadline, regulation or systems that must be kept?', 'constraint');
  if (!out.assumptions.length) ask('assumptions', 'What are you assuming that nobody has confirmed yet?', 'assumption');
  if (truncated) ask('truncated', `Only the first ${MAX_PASSAGES} sentences and list items were read: can the brief be split or shortened so that all of it is read?`, 'requirement');
  return q;
}

// What a project keeps of its interpreted brief (brief.interpreted): counts of what was read, never the proposals.
export function briefCounts(r) {
  const proposals = BRIEF_KINDS.flatMap((k) => r[k]);
  return {passages: r.passages.length, ...Object.fromEntries(BRIEF_KINDS.map((k) => [k, r[k].length])), questions: r.questions.length, inferred: proposals.filter((p) => p.confidence === 'inferred').length};
}
