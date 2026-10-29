// The architecture drafter (round 12, workstream E; audit/round12/DESIGN.md D-10). A project in, a draft of its
// architecture out: per chapter, proposed records drawn from the requirement groups, not one record per requirement.
// Same input, same draft, byte for byte. Plain ES module: no DOM, no Node API, no model, no clock, no project writes.
//
// What it reads: the requirements, the requirement groups (requirement-groups.js) and what an import kept on each
// requirement (domain, capability theme, user group, delivery status, priority band), the brief when there is one
// (the brief interpreter's outcomes, constraints and scope), the domain lens the person chose (its concern cues, which
// are rules, not knowledge), and the SA Playbook (playbook-knowledge.js) for the alternatives a decision compares and,
// for an alternative that follows one of its styles or patterns, the assessments its marks draft (round 25, D-25-09).
// It never reads candidate or discovery knowledge: nothing a candidate set holds informs a record, a score, a
// constraint or a conformance result. No alternative is chosen, and none is recorded as preferred.
//
// What it drafts, each a proposal (state 'proposed', origin 'sol-draft', provenance.draft; never confirmed, approved or
// reviewed by a person), each linked to the requirement groups it answers so that every member is traced through its
// group (requirement-links.js linkedRequirementIds), each citing members of its own groups:
//   Chapter 1  outcomes (the brief's goals; outcomes the rows state more than once), one actor per user group with every
//              persona field open, one in-scope record per functional area, the brief's constraints and one constraint
//              per regulatory or mandated-technology concern the rows name, a rule for each business rate or charge a
//              row states, and one journey per functional area with a step per capability theme: every requirement is
//              placed on a step (a journey of the business, or a supporting or administrative process).
//   Chapter 2  drivers by kind: a functional driver per area (its requirement and gap counts), a quality driver per
//              quality concern the source's own headings name (functional rows never become quality scenarios; the
//              scenario is a stub and the target is not stated unless a row states a quality figure with its unit;
//              a business rate is a rule, never a target), business drivers from the brief's goals, a constraint
//              driver per constraint, and operational, data, technology-evolution and business-continuity drivers per
//              concern the requirements evidence (the chosen lens's concerns, else AIW's own vocabulary). Priority
//              from the bands of the rows it rests on, with basis "source band".
//   Chapter 3  one decision per architectural theme the requirements evidence, with its category, its drivers and its
//              alternatives from the Playbook; a style or pattern alternative assessed from the Playbook's marks against
//              the drivers of the qualities they mark, each assessment marked by: 'rules'; no alternative is chosen.
//   Chapter 4  a responsibility per requirement group, linked to it; with a module structure (round 24, D-24-03), one
//              responsibility group per module that realises it (logical.group requirementGroupIds) and a
//              responsibility per leaf (a sub-module, or a module without any) in its module's group.
//   Chapter 5  a component per functional area (with modules, per module) and the cross-cutting components the groups
//              evidence (channel entry, identity, notification, audit, reporting, integration, batch, approval
//              workflow), each realising responsibilities, named by a noun, of the kind its work calls for, naming the
//              drivers it serves (round 24, D-24-05), its properties left open.
//   Chapter 6  the capabilities the components need, by category, and two trust boundaries.
//   Chapter 7  an implementation per capability with two operating options, no product named.
//   Chapter 8  a party per external system the rows name with a contract per party and component, hand-overs from
//              each area to the cross-cutting components its steps need (batch contracts for periodic work), and one
//              data definition per entity noun the rows use (the canonical entity model).
//   Chapter 9  a dual-control (maker-checker) control on each component whose rows ask for one, an access control at
//              the channel entry and an audit control where the rows ask for history.
//   Chapter 10 one set of environments, one zone each, a placement per component with copies not stated, and the
//              batch window of the batch component with its times not stated.
//   Delivery   plateaus (the current platform and the target) with the groups placed on them by delivery status, one
//              candidate obligation per value-gap area, and a migration record when the source shows an existing system.
//   Chapter 11 the SDD's framing, when nothing frames it yet.
//
// The draft is a bundle of canonical commands, applied by applyDraftBundle through the chapters' own command handlers
// (every rule a person's save meets, the draft meets), in chapter order, at most DRAFT_BATCH commands a batch, on one
// working copy (document-memo.js handOver: no whole-project copy per record), one journal event per chapter. A
// command names a record drafted earlier in the bundle by its key ('@draft:<key>'; inside a sentence '{{code:<key>}}'
// for a driver's code and '{{ref:<key>}}' for an id), a technology need by its component and category
// ('@need:<key>|<category>') and a runtime plan by its environment and component ('@plan:<key>|<key>'). A later draft
// proposes only what is missing, and names the live records an earlier draft left by their keys; a proposal that
// names a record neither in the draft nor in the project is left out, and the draft says so (namedOnly).
//
// Sol's wording (groupDraftPackets, withWording): the model-assisted path rewords one chapter, one bounded request per
// requirement group, on the journey contract; its accepted answers make a new draft, previewed and applied the same way.
import {requirementGroups, groupIndex, groupById, GROUP_LIMITS} from './requirement-groups.js';
import {QUALITY_LIMITS, QUALITY_TYPES, DRIVER_KINDS, applyQualityCommand, driverCode, driverKind} from './quality-domain.js';
import {DECISION_LIMITS, RULES, applyDecisionCommand} from './decisions-domain.js';
// Round 25 (D-25-09): the Playbook's marks, read as a suggestion reads them (one reading for both).
import {playbookAssessments} from './decision-suggestions.js';
import {LOGICAL_LIMITS, applyLogicalCommand} from './logical-domain.js';
import {REALISATION_LIMITS, COMPONENT_KINDS, applyRealisationCommand} from './realisation-domain.js';
import {TECHNOLOGY_LIMITS, TECHNOLOGY_CATEGORIES, applyTechnologyCommand} from './technology-domain.js';
import {REALIZATION_LIMITS, applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {INTERFACE_LIMITS, NOT_CLASSIFIED, PARTY_KINDS, applyInterfacesCommand} from './interfaces-domain.js';
import {SECURITY_LIMITS, CONTROL_CATEGORIES, applySecurityCommand} from './security-domain.js';
import {RUNTIME_LIMITS, applyRuntimeCommand} from './runtime-domain.js';
import {ROADMAP_LIMITS} from './roadmap-domain.js';
import {PROJECT_LIMITS} from './intake-domain.js';
import {applyCommand} from './requirements-domain.js';
import {withFinalReview, applyFinalReviewCommand} from './review-domain.js';
import {withChanges} from './changes-domain.js';
import {handOver, documentClone, pinValue, unpinValues} from './document-memo.js';
import {locate, solDraftOf} from './record-lifecycle.js';
import {STYLES, PATTERNS, TACTICS} from './playbook-knowledge.js';
import {domainTopics} from './domain-knowledge.js';
import {lensSetting, lensById} from './domain-lens.js';
import {interpretBrief} from './brief-interpreter.js';
import {digest} from './brain-integrity.js';
import {redactSecrets} from './secret-redaction.js';
import {maskContactText} from './intelligence-context.js';
import {nounNameCheck} from './sdd-content.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES} from './chapter-names.js';
// Round 24 (D-24-03, D-24-04): the module structure, when the project has one, is what the draft works by.
import {moduleTree, moduleLabel, concernOf, concernTitle} from './module-model.js';
import {isBlankProject} from './model-scope.js';

export const DRAFT_SCHEMA = 'aiw.architecture-draft.v1';
export const DRAFT_ENGINE = 'aiw-architecture-drafter-1';
export const DRAFT_ORIGIN = 'sol-draft';
// The governed batch bound (workbench-domain.js previewWorkingChange stages 1-20 design changes).
export const DRAFT_BATCH = 20;
// The chapters of a draft, in the order they are applied.
export const DRAFT_CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'delivery', 11];
export const DRAFT_TITLES = {...CHAPTER_TITLES, 1: 'Requirements context', delivery: 'Delivery plan'};
// How many citations a record keeps, and how many records a chapter's preview samples.
const CITES = 12, SAMPLE = 5;

// ---------------------------------------------------------------- words

const list = v => (Array.isArray(v) ? v : []);
const str = v => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const clip = (s, n) => { const t = str(s).replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
const cap = s => { const t = str(s); return t ? t[0].toUpperCase() + t.slice(1) : t; };
const plural = (n, one, many = one + 's') => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
const uniq = xs => [...new Set(xs.filter(Boolean))];
export const slug = s => str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'x';
const joinAnd = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1));
const sentenceCase = s => { const t = str(s); return t && /^[A-Z][a-z]/.test(t) && !/^[A-Z][a-z]+[A-Z]/.test(t) ? t : cap(t); };
const STOP = new Set('the and for that this with from into its are was were have has will shall must should can could may might not any all each every per than then when where which who whom whose what how via our their your his her them they also only able need needs using use used within without about after before over under between there here been being such other more most less least very much many some'.split(' '));
const stem = w => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') ? w.slice(0, -1) : w);
const words = s => (str(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2 && !STOP.has(w)).map(stem);
const textOf = r => [r?.title, r?.description].map(str).filter(Boolean).join(' ');
const lowerText = r => textOf(r).toLowerCase();

// The noun phrase a requirement statement acts on (DRF-15), the one naming rule of both drafters (journey-drafter.js
// objectPhrase reads it too): a leading adverb ("Still", "Also"), the subject and modal ("The system shall", "Users
// must be able to"), a role and its verb ("A maker enters"), a leading "Ensure that", "Ability to", "Provide the
// facility to" or "It must be possible to", then the verb (or the verbs it lists: "Place, change and cancel"), the
// determiners and numbers are dropped, and the phrase is cut at the first preposition or clause. A statement that names
// its noun first ("The account balance is updated…") keeps the words before the verb. Never a modal verb. The words
// keep their case ("ISO message").
const MODAL = /\b(?:shall|must|should|will|can|could|may|might|needs? to|has to|have to|is to|are to)\b/i;
const LEADS = [
  /^(?:it\s+)?(?:must|shall|should|will)\s+be\s+possible\s+(?:for\s+[\w\s-]{1,40}?\s+)?to\s+/i,
  /^(?:the\s+)?(?:ability|capability|facility|functionality|function|option|possibility)\s+(?:for\s+[\w\s-]{1,40}?\s+)?to\s+/i,
  /^(?:able|abilities)\s+to\s+/i,
  /^ensure\s+(?:that\s+)?/i,
  /^(?:provide|offer|support|allow|enable|permit|give)\s+(?:the\s+|a\s+|an\s+)?(?:ability|capability|facility|functionality|means|option|support)?\s*(?:for\s+[\w\s-]{1,40}?\s+)?(?:to\s+|for\s+)/i,
  /^(?:allow|enable|permit|let)\s+(?:the\s+)?(?:users?|staff|operators?|officers?|customers?|administrators?|tellers?)\s+to\s+/i,
  /^support\s+(?:for\s+)?/i
];
const ADVERB = /^(?:still|also|always|only|automatically)\s+/i;
const SUBJECT = /^(?:the|a|an|each|every|all|any)?\s*(?:[\w-]+\s+){0,3}?(?:system|service|solution|platform|application|software|module|tool|product)s?\s+(?:shall|must|should|will|can|may|needs? to|has to|is (?:able|required) to)\s+(?:be\s+able\s+to\s+|also\s+|automatically\s+|only\s+)*/i;
const PEOPLE = '(?:users?|staff|operators?|officers?|customers?|administrators?|tellers?|managers?|supervisors?|clerks?|agents?|makers?|checkers?|approvers?|authori[sz]ers?|persons?|people|members?)';
const ACTOR_SUBJECT = new RegExp('^(?:the\\s+|a\\s+|an\\s+|each\\s+|every\\s+|all\\s+|any\\s+)?(?:[\\w-]+\\s+){0,3}?' + PEOPLE + '\\s+(?:shall|must|should|will|can|may|needs? to)\\s+(?:be\\s+able\\s+to\\s+)?', 'i');
const ROLE_ACTS = new RegExp('^(?:the\\s+|a\\s+|an\\s+|each\\s+|every\\s+|any\\s+)(?:[\\w-]+\\s+){0,2}?' + PEOPLE + '\\s+[a-z]+(?:s|es)\\s+(?=(?:a|an|the|each|every|its|their)\\s)', 'i');
const DETERMINERS = /\b(?:a|an|the|each|every|any|all|its|their|our|his|her|your|one|new|existing|current|relevant|appropriate|required|specific|selected|given)\s+/gi;
const CUT = /(?:\s+(?:for|with|to|from|by|within|when|in|on|at|so|that|and|or|before|after|until|while|without|under|over|into|via|across|per|through|during|if|unless|as|against|including|where|which|who|is|are|be|was|were|has|have|can|shall|must|should|will|above|below|beyond|between|among|except|than|upon|along|around|behind|beside|near|past|since|toward|towards|unlike|like)\b|[,;:(]|\s+-\s)[\s\S]*$/i;
const VERB_FIRST = /^[a-z]+(?:(?:,\s*|\s+(?:and|or|\/)\s+)[a-z]+)*\s+/i;
export function nounPhrase(statement) {
  let t = str(statement).replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  if (!t) return '';
  t = t.replace(ADVERB, '').replace(SUBJECT, '').replace(ACTOR_SUBJECT, '').replace(ROLE_ACTS, '');
  for (const re of LEADS) t = t.replace(re, '');
  // A statement that starts with its noun ("the account balance is updated") keeps the words before its verb.
  const passive = /^(?:the|a|an|each|every|all|any)\s+([\w\s-]{2,60}?)\s+(?:is|are|must|shall|should|will|can|may|needs?|has|have)\b/i.exec(t);
  if (passive) t = passive[1];
  else t = t.replace(VERB_FIRST, '');
  t = t.replace(DETERMINERS, '').replace(CUT, '').replace(/^\d[\d,.]*\s+/, '').replace(MODAL, '').replace(/\s+/g, ' ').trim();
  return clip(t, 80);
}
// The entity an object phrase names: its last one to three words, simple plurals folded ("standing instructions" →
// "standing instruction"); "statement of account" reads as one noun, and an entity never starts at "of" ("history of
// customer profile" is the customer profile).
export function entityOf(phrase) {
  const ws = str(phrase).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w) && !/^\d/.test(w));
  if (!ws.length) return '';
  let tail = ws.slice(-3);
  while (tail.length > 1 && tail[0] === 'of') tail = tail.slice(1);
  return tail.map((w, i) => (i === tail.length - 1 ? stem(w) : w)).join(' ');
}
// A field name for an entity's key ("standing instruction" → standingInstructionId).
const keyName = noun => { const c = words(noun).slice(0, 3).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join(''); return /^[a-z]/.test(c) ? c + 'Id' : 'recordId'; };

// ---------------------------------------------------------------- the vocabularies (AIW's own, domain-neutral)

// What a requirement's words say its work is. First match wins, in this order.
const WORK = [
  ['approval', /\b(?:approv\w*|authori[sz]\w*|dual control|maker|checker|four[- ]eyes|second (?:person|approver|approval|pair of eyes)|sign[- ]?off|counter[- ]?sign\w*)\b/],
  ['notification', /\b(?:notif\w*|alerts?|remind\w*|e-?mails?|sms|text messages?|inform(?:s|ed)? (?:the|a|an)?\s*\w+ (?:of|about))\b/],
  ['batch', /\b(?:batch\w*|end[- ]of[- ](?:the[- ])?(?:day|month|year|period)|day[- ]end|month[- ]end|year[- ]end|nightly|overnight|scheduled|schedul\w*|periodic\w*|daily run|cut[- ]?off)\b/],
  ['posting', /\b(?:post(?:s|ed|ing)?|ledger|journal entr\w*|revers(?:e|al|ed|es|ing)|settle\w*|reconcil\w*)\b/],
  ['calculation', /\b(?:calculat\w*|comput\w*|accru\w*|amortis\w*|amortiz\w*|revalu\w*|pric(?:e|es|ing)\b)/],
  ['reporting', /\b(?:reports?|reporting|export\w*|search\w*|enquir\w*|inquir\w*|display\w*|view(?:s|ed|ing)?|show(?:s|n|ing)?|retriev\w*|dashboards?|extracts?|lists?)\b/],
  ['access', /\b(?:restrict\w*|permission\w*|access|roles?|privileg\w*|log[- ]?ins?|sign[- ]?ins?|authenticat\w*|entitle\w*)\b/],
  ['audit', /\b(?:audit\w*|history|histories|trail|change log|log(?:s|ged|ging)? (?:of|every|each|all)|before and after)\b/],
  ['records', /\b(?:record(?:s|ed|ing)?|stor(?:e|es|ed|ing)|retain\w*|retention|archiv\w*|keep(?:s|ing)?|maintain\w*)\b/],
  ['validation', /\b(?:validat\w*|verif\w*|check(?:s|ed|ing)?|screen(?:s|ed|ing)?)\b/],
  ['integration', /\b(?:interfac\w*|integrat\w*|apis?|feeds?|file transfer|external systems?|third[- ]part\w*)\b/]
];
const WORD_OF = {approval: 'approval', notification: 'notification', batch: 'periodic processing', posting: 'posting and reconciliation', calculation: 'calculation', reporting: 'enquiry and reporting', access: 'access control', audit: 'audit history', records: 'record keeping', validation: 'validation', integration: 'integration', maintenance: 'maintenance'};
// The work its main verb names comes first ("record the balance after approval" is record keeping); the words of the
// whole statement decide only when the verb says nothing AIW knows.
const VERBS = [
  ['records', /^(?:record|store|retain|archive|keep|maintain|hold|save|persist|capture|register)$/],
  ['reporting', /^(?:display|view|show|retrieve|search|report|export|enquire|inquire|list|print|extract|generate|produce|query|filter|find|see|present)$/],
  ['validation', /^(?:validate|verify|check|screen|confirm|match)$/],
  ['approval', /^(?:approve|authorise|authorize|reject|sign|endorse|countersign|ratify)$/],
  ['calculation', /^(?:calculate|compute|accrue|price|revalue|amortise|amortize|estimate|derive)$/],
  ['notification', /^(?:notify|alert|send|inform|remind|email|message|warn)$/],
  ['posting', /^(?:post|reverse|settle|reconcile|book|debit|credit|transfer|pay)$/],
  ['batch', /^(?:schedule|run|batch)$/],
  ['access', /^(?:restrict|permit|grant|revoke|authenticate|block|lock|unlock|limit)$/],
  ['audit', /^(?:audit|log|track|trace)$/],
  ['integration', /^(?:integrate|interface|exchange|import|upload|download|transmit|receive|feed)$/],
  ['maintenance', /^(?:amend|update|change|modify|create|open|close|add|delete|remove|edit|configure|set|define|correct|cancel|suspend|reactivate|renew|manage|support|allow|enable|provide|handle|process)$/]
];
// A role that acts ("A maker enters …"): its verb leads.
const ROLE_SUBJECT = new RegExp('^(?:the\\s+|a\\s+|an\\s+|each\\s+|every\\s+|any\\s+)(?:[\\w-]+\\s+){0,2}?' + PEOPLE + '\\s+(?=[a-z]+(?:s|es)\\s+(?:a|an|the|each|every|its|their)\\s)', 'i');
export function leadVerb(statement) {
  let t = str(statement).replace(/\s+/g, ' ');
  t = t.replace(ADVERB, '').replace(SUBJECT, '').replace(ACTOR_SUBJECT, '').replace(ROLE_SUBJECT, '');
  for (const re of LEADS) t = t.replace(re, '');
  const w = (/^[A-Za-z]+/.exec(t)?.[0] || '').toLowerCase();
  return w.length > 3 && w.endsWith('es') && /(?:ss|sh|ch|x)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}
export const workOf = r => { const v = leadVerb(r?.title || r?.description); return VERBS.find(([, re]) => re.test(v))?.[0] || WORK.find(([, re]) => re.test(lowerText(r)))?.[0] || 'maintenance'; };
// What else a requirement's words ask of the design besides its main work: the cross-cutting concerns its qualifiers
// name ("under dual control", "at the end of the day", "with a full change history").
const ASKS = [['approval', WORK[0][1]], ['batch', WORK[2][1]], ['audit', WORK[7][1]], ['notification', WORK[1][1]]];
const asksOf = r => { const t = lowerText(r); return ASKS.filter(([, re]) => re.test(t)).map(([k]) => k); };

// The cross-cutting components the groups may evidence (DESIGN D-10): a group whose title names one asks for it.
const CROSS = [
  {id: 'channel', title: 'Channel and API gateway', kind: 'channel', words: /\b(?:channels?|apis?|mobile|internet|online|portal|digital|self[- ]service|web)\b/, work: 'integration', purpose: 'the entry the channels and API consumers call'},
  {id: 'identity', title: 'Identity and access service', kind: 'service', words: /\b(?:roles?|access|users? admin\w*|permissions?|identity|authenticat\w*|entitlements?)\b/, work: 'access', purpose: 'who may do what: users, roles and their entitlements'},
  {id: 'approval', title: 'Approval workflow service', kind: 'service', words: /\b(?:approvals?|dual control|maker|checker|workflow|authori[sz]ation)\b/, work: 'approval', purpose: 'the approvals, the dual control and the work queues of the items that wait for a second person'},
  {id: 'notification', title: 'Notification adapter', kind: 'adapter', words: /\b(?:alerts?|notices?|notifications?|messages?|messaging)\b/, work: 'notification', purpose: 'the alerts and notices sent to people and systems'},
  {id: 'audit', title: 'Audit trail store', kind: 'store', words: /\b(?:audit\w*|history|histories|trail)\b/, work: 'audit', purpose: 'the history of changes, with what changed, who changed it and when'},
  {id: 'reporting', title: 'Reporting service', kind: 'service', words: /\b(?:reports?|reporting|exports?|search|analytics|statements?|enquir\w*|mis)\b/, work: 'reporting', purpose: 'the enquiries, searches, exports and reports'},
  {id: 'integration', title: 'Integration adapter', kind: 'adapter', words: /\b(?:integration|interfaces?|external|interchange)\b/, work: 'integration', purpose: 'the exchanges with the systems outside the design'},
  {id: 'batch', title: 'Batch scheduler', kind: 'worker', words: /\b(?:batch\w*|day[- ]end|end[- ]of[- ]day|period close|month[- ]end|year[- ]end|schedul\w*|closing)\b/, work: 'batch', purpose: 'the periodic and end-of-day runs, in their order, with their restart points'}
];
const crossOf = id => CROSS.find(x => x.id === id);
// A group's title names a cross-cutting concern: the first that matches, else none.
const crossFor = title => CROSS.find(x => x.words.test(str(title).toLowerCase()))?.id || null;
// Round 24: the drafter's cross-cutting components and the platform modules' concerns (module-model.js PLATFORM_CONCERNS)
// name the same concerns in two vocabularies; this is the one map between them.
export const CROSS_CONCERN = Object.freeze({channel: 'integration', identity: 'access', approval: 'workflow', notification: 'notification', audit: 'audit', reporting: 'reporting', integration: 'integration', batch: 'batch'});
// The concern a component's name is about (round 24, D-24-04: one component per concern within a module, one platform
// service per cross-cutting concern across the modules). Read from the name less the words that say what kind of thing
// it is ("Audit trail store" is about audit; "Interest accrual batch" is about interest accrual, not batch processing):
// the platform modules' vocabulary (concernOf) first, the drafter's CROSS lexicon to tell a channel entry from an
// integration with the outside, and to read a concern the first does not name. A channel by its own name ("Mobile
// banking app") is not folded into another channel. 'shared' names no concern. '' when the name is about none.
const KIND_WORDS = /\s+(?:services?|stores?|adapters?|engines?|workers?|components?|modules?|managers?|processors?|repositor(?:y|ies)|registr(?:y|ies)|hubs?|jobs?|batch(?:es)?|runs?)$/i;
export function concernKey(title) {
  let core = str(title).replace(/[.!?]+$/, '');
  for (let i = 0; i < 3 && KIND_WORDS.test(core); i++) core = core.replace(KIND_WORDS, '');
  const t = core.trim() || str(title), c = concernOf(t), x = crossFor(t);
  if (c === 'integration') return x === 'channel' ? 'channel' : 'integration';
  if (c && c !== 'shared') return c;
  return x && x !== 'channel' ? CROSS_CONCERN[x] : '';
}
// The title a concern key reads as ("channel" is the channel and API entry, apart from integration).
export const concernName = key => (key === 'channel' ? 'Channel and API entry' : concernTitle(key) || key);
// A component's name, normalised (round 24): its words less the stop words and the words every name may carry, plurals
// folded, so "Deposit accounts store" and "Deposit account store" are one name. The kind word stays: a store and a
// service of the same noun are two components.
const NAME_FILLER = new Set(['component', 'module', 'system', 'data', 'management']);
export const normalisedName = title => words(title).filter(w => !NAME_FILLER.has(w)).join(' ');

// The quality concerns the source's own headings may name (DRF-08): a group whose title names one is a quality heading.
const QUALITY_HEADINGS = [
  ['availability', /\b(?:availab\w*|uptime|stability|stable|resilien\w*|high availability)\b/],
  ['performance', /\b(?:performance|response times?|latency|speed)\b/],
  ['recoverability', /\b(?:recover\w*|backups?|restore|disaster|continuity)\b/],
  ['security', /\b(?:security|secure|access control|roles? and access|access and roles?|authenticat\w*|encrypt\w*)\b/],
  ['traceability', /\b(?:audit\w*|traceab\w*|change history|history and audit)\b/],
  ['scalability', /\b(?:scalab\w*|volumes?|growth)\b/],
  ['capacity', /\b(?:capacity|throughput|load)\b/],
  ['usability', /\b(?:usab\w*|accessib\w*|user experience|ease of use)\b/],
  ['interoperability', /\b(?:interoperab\w*|standards? compliance)\b/],
  ['maintainability', /\b(?:maintainab\w*|modifiab\w*|supportab\w*)\b/],
  ['compliance', /\b(?:compliance|regulatory|regulation)\b/],
  ['privacy', /\b(?:privacy|data protection|personal data|gdpr)\b/],
  ['reliability', /\b(?:reliab\w*)\b/],
  ['operability', /\b(?:operab\w*|monitoring|observab\w*)\b/]
].filter(([id]) => QUALITY_TYPES.some(t => t.id === id));
const qualityHeading = title => QUALITY_HEADINGS.find(([, re]) => re.test(str(title).toLowerCase()))?.[0] || null;
const qualityName = id => QUALITY_TYPES.find(t => t.id === id)?.name || id;

// A quality figure a row states with its unit, in a quality context (DRF-08); a business rate or charge is never one.
const QUALITY_FIGURE = /\b(?:(within|under|less than|no more than|at most|up to|below|maximum of|at least|minimum of|more than|over|above)\s+)?(\d+(?:\.\d+)?)\s*(%|percent|ms|milliseconds?|seconds?|secs?|minutes?|mins?|hours?|hrs?|(?:transactions?|requests?|users?|messages?|payments?) per (?:second|minute|hour)|concurrent users?)(?![a-z])/i;
const QUALITY_CONTEXT = /\b(?:availab\w*|uptime|respon\w*|latency|recover\w*|restor\w*|throughput|concurrent|peak|load|fail\w*|downtime|outages?|performance|process(?:ed|ing)? within)\b/i;
const BUSINESS_RATE = /\b(?:interest|rates?|fees?|charges?|tax(?:es)?|commissions?|prices?|tariffs?|discounts?|penalt\w*|margins?|spreads?|levy|levies|costs?|amounts?|balances?|limits?|premiums?|dividends?|coupons?)\b/i;
export function qualityFigure(text) {
  const t = str(text), m = QUALITY_FIGURE.exec(t);
  if (!m || !QUALITY_CONTEXT.test(t) || BUSINESS_RATE.test(t.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40))) return null;
  const cue = str(m[1]).toLowerCase(), unit = m[3].replace(/^per ?cent$/i, '%').replace(/^percent$/i, '%');
  const atLeast = /least|minimum|more|over|above/.test(cue) || (!cue && unit === '%');
  return {value: m[2], unit, operator: atLeast ? 'At least' : 'At most', phrase: m[0]};
}
// A business rate or charge a row states (DRF-08): a Chapter 1 rule, not a quality target.
const RATE_FIGURE = /\b(\d+(?:[.,]\d+)?)\s*(%|percent|per ?cent|basis points?|bps)(?![a-z])|\b(?:[A-Z]{3}|£|\$|€)\s?(\d[\d,]*(?:\.\d+)?)\b/;
export function businessRate(text) {
  const t = str(text), m = RATE_FIGURE.exec(t);
  if (!m || !BUSINESS_RATE.test(t)) return null;
  if (m[1]) return {value: m[1].replace(',', '.'), unit: /bps|basis/i.test(m[2]) ? 'basis points' : '%', currency: ''};
  const symbol = /^(?:[A-Z]{3}|£|\$|€)/.exec(m[0])?.[0] || '';
  return {value: m[3].replace(/,/g, ''), unit: '', currency: {'£': 'GBP', '$': 'USD', '€': 'EUR'}[symbol] || symbol};
}

// Constraint rows (Chapter 1 constraints, C drivers): a regulatory obligation, or a mandated technology or platform.
const CONSTRAINTS = [
  {id: 'regulatory', title: 'Regulatory obligations', words: /\b(?:regulat\w*|statutory|legislat\w*|laws?|directives?|comply with|compliance with|central bank|supervisory|prudential|regulators?)\b/i, impact: 'The design must show how each obligation the rows name is met, and keep the evidence a regulator may ask for.'},
  {id: 'technology', title: 'Mandated technology and platforms', words: /\b(?:(?:must|shall|should) (?:use|run on|be built on|be hosted (?:on|in)|be deployed (?:on|in)|integrate with the existing)|mandated?|only (?:use|run)|existing (?:platform|system|infrastructure|database|core))\b/i, impact: 'The choices the rows mandate bound the alternatives the decisions may compare.'}
];

// Supporting and administrative process kinds of a journey step (DRF-05), read from the area's or the theme's words.
const ADMINISTRATIVE = /\b(?:administration|admin|roles?|access|users?|permissions?|parameters?|settings?|configuration|setup|set-up|static data|reference data|products? setup|product parameters?)\b/i;
const SUPPORTING = /\b(?:audit\w*|history|reporting|reports?|exports?|search|batch\w*|day[- ]end|end[- ]of[- ]day|period close|closing|archiv\w*|resilien\w*|stability|platform|shared services?|monitoring|operations support)\b/i;
export const processKindOf = (...titles) => { const t = titles.map(str).join(' '); return ADMINISTRATIVE.test(t) ? 'administrative' : SUPPORTING.test(t) ? 'supporting' : ''; };

// The concerns behind operational, data, technology-evolution and business-continuity drivers. With a chosen lens, its
// concerns (its cues are rules, not knowledge) map to a kind; without one, AIW's own domain-neutral vocabulary.
const LENS_KINDS = {eod: 'operational', operations: 'operational', payments: 'operational', posting: 'data', privacy: 'data', 'value-dating': 'data', audit: 'data', migration: 'technology-evolution', 'product-config': 'technology-evolution', channels: 'technology-evolution', availability: 'business-continuity'};
const GENERIC_CONCERNS = [
  {id: 'periodic-operations', kind: 'operational', title: 'Periodic and end-of-day operations', cues: /\b(?:batch\w*|end[- ]of[- ](?:the[- ])?day|day[- ]end|month[- ]end|nightly|overnight|schedul\w*|reconcil\w*|cut[- ]?off)\b/},
  {id: 'monitoring', kind: 'operational', title: 'Monitoring and operational support', cues: /\b(?:monitor\w*|dashboards? for operations|operational alerts?|runbooks?|support team|incident\w*)\b/},
  {id: 'data-retention', kind: 'data', title: 'Data history, retention and archiving', cues: /\b(?:retain\w*|retention|archiv\w*|history|histories|before and after|purg\w*)\b/},
  {id: 'data-quality', kind: 'data', title: 'Data ownership and quality', cues: /\b(?:data quality|master data|reference data|duplicates?|data migration|single source)\b/},
  {id: 'evolution', kind: 'technology-evolution', title: 'Technology evolution and replacement', cues: /\b(?:upgrad\w*|moderni[sz]\w*|replac\w*|legacy|migrat\w*|cloud|decommission\w*)\b/},
  {id: 'continuity', kind: 'business-continuity', title: 'Business continuity and recovery', cues: /\b(?:disaster|continuity|backups?|failover|fail[- ]over|recover\w*|resilien\w*|standby|outages?)\b/}
];

// External systems a row names (DRF-09): the words before a system noun, after an integration verb or preposition, or
// an acronym before one. The name is the project's own words, read at run time.
const SYSTEM_NOUN = '(?:system|systems|gateway|switch|bureau|network|platform|interface|registry|exchange|hub|portal|provider|clearing house|clearinghouse|engine|service|application|database|feed)';
const NAMED_SYSTEM = new RegExp('\\b(?:to|from|with|via|into|through|by|using|against|in)\\s+(?:the\\s+|an?\\s+)?((?:external|third[- ]party|national|central|existing|legacy|core|[A-Z][\\w&.-]*)(?:\\s+[A-Z][\\w&.-]*){0,3}(?:\\s+[a-z]+){0,1})\\s+' + SYSTEM_NOUN + '\\b', 'g');
const ACRONYM_SYSTEM = new RegExp('\\b([A-Z][A-Z0-9]{1,6})\\s+' + SYSTEM_NOUN + '\\b', 'g');
const GENERIC_NAME = /^(?:the|a|an|this|that|same|our|their|internal|new|other|any|each|every|core banking|banking)$/i;
export function externalSystems(text) {
  const t = str(text), out = [];
  for (const re of [NAMED_SYSTEM, ACRONYM_SYSTEM]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t))) {
      const noun = /\s(\w+)$/.exec(m[0].trim())?.[1] || 'system', name = str(m[1]).replace(/\s+/g, ' ');
      if (!name || GENERIC_NAME.test(name) || name.split(' ').every(w => STOP.has(w.toLowerCase()))) continue;
      out.push(cap(name.replace(/^(?:the|an?)\s+/i, '')) + ' ' + noun.toLowerCase());
    }
  }
  return uniq(out);
}
const PARTY_KIND_WORDS = [['regulator', /\b(?:regulat\w*|central bank|authority|supervisor\w*|tax office|revenue)\b/i], ['payment network', /\b(?:payment|clearing|switch|card|swift|settlement|network)\b/i], ['verification service', /\b(?:bureau|credit|verification|screening|sanctions|kyc|identity check)\b/i], ['directory or identity', /\b(?:directory|identity|ldap|single sign[- ]on)\b/i], ['legacy system', /\b(?:legacy|existing|current|old)\b/i], ['channel', /\b(?:channel|portal|mobile|internet|atm)\b/i]];
const partyKindOf = name => PARTY_KIND_WORDS.find(([k, re]) => PARTY_KINDS.includes(k) && re.test(name))?.[0] || '';

// ---------------------------------------------------------------- reading the project

const openMap = (fields, extra = {}) => Object.fromEntries([...fields.map(f => [f, {state: 'not-stated'}]), ...Object.entries(extra)]);
const isDelivered = a => str(a.assessment?.delivery).toLowerCase() === 'delivered';
const isGap = a => !!str(a.assessment?.delivery) && !isDelivered(a);
const LEVEL = {Must: 1, Should: 2, Could: 3}, DRIVER_LEVEL = ['', 'High', 'Medium', 'Low'];
// A priority from the bands of the rows a record rests on: the strongest level at least a tenth of them hold (DESIGN
// D-02); basis "source band" when the rows were imported with a band, "rule" otherwise; not stated when none has one.
function priorityFrom(rows) {
  const n = {1: 0, 2: 0, 3: 0};
  for (const a of rows) { const l = LEVEL[a.priority]; if (l) n[l]++; }
  const stated = n[1] + n[2] + n[3];
  if (!stated) return {priority: '', basis: ''};
  const level = [1, 2, 3].find(l => n[l] >= Math.max(1, Math.ceil(stated / 10))) || 3;
  return {priority: DRIVER_LEVEL[level], basis: rows.some(a => a.provenance && a.priority) ? 'source band' : 'rule', counts: n};
}
// A priority's basis in one clause (the SDD prints "High, because the source bands of its requirements are 12 Must,
// 3 Should and 0 Could"): the rationale a drafted driver carries when its rows were banded.
const bandRationale = p => (p.counts ? `The source bands of its requirements are ${p.counts[1]} Must, ${p.counts[2]} Should and ${p.counts[3]} Could.` : '');
// The rules count and cite; they cannot describe a driver in the project's terms or say how it shapes the architecture
// (SDD-SPEC content standard, round 12 C2), so a drafted driver's description and impact are not stated, each with its
// question asked, and the counts and the rows it rests on go to its source line, never into a design field.
const asked = q => ({state: 'open-question', question: clip(q, 600)});
const rowsLine = rows => rows.slice(0, 6).map(a => a.externalId || a.id).join(', ') + (rows.length > 6 ? ` and ${plural(rows.length - 6, 'more row')}` : '');

// The units the draft works on: the requirement groups (functional areas first), or, with none, each requirement as a
// group of one. A group link is a stored group (RG-nnn); a unit of one links its requirement.
// Round 24 (D-24-04): where the project has a module structure (module-model.js), the modules are the areas, each with
// the requirements whose home it is (every requirement in one), and its leaves: its sub-modules (a sub-module of the
// requirements a module holds directly, when it has sub-modules too), or the module itself when it has none. Theme and
// other facet groups are not drafted then; a leaf stands where a theme stood (a journey step, a quality heading, the
// evidence of a decision), so nothing is drafted twice. Without a structure, the units are as before.
function readProject(p) {
  const reqs = list(p.artefacts).filter(a => a?.type === 'requirement'), byId = new Map(reqs.map(a => [a.id, a]));
  const index = groupIndex(p), groups = requirementGroups(p).filter(g => /^RG-\d+$/.test(g.id)), members = g => list(index.members.get(g.id)).map(id => byId.get(id)).filter(Boolean);
  const unit = (g, kind) => ({id: g.id, key: g.id, group: g, title: str(g.title), kind, members: members(g), stored: true});
  const tree = moduleTree(p), modular = tree.modules.length > 0;
  const modules = modular ? moduleAreas(p, tree, byId) : null;
  const functional = modular ? modules.areas : groups.filter(g => ['domain', 'module', 'functional-area'].includes(g.kind)).map(g => unit(g, 'area')).filter(u => u.members.length);
  const themes = modular ? [] : groups.filter(g => g.kind === 'theme').map(g => unit(g, 'theme')).filter(u => u.members.length);
  const people = groups.filter(g => g.kind === 'user-group').map(g => unit(g, 'people'));
  let areas = functional.length ? functional : themes.length ? themes : [];
  const covered = new Set(areas.flatMap(u => u.members.map(a => a.id)));
  const rest = reqs.filter(a => !covered.has(a.id));
  if (!groups.length) areas = reqs.map(a => ({id: null, key: 'REQ:' + a.id, group: null, title: cap(nounPhrase(a.title) || a.title), kind: 'area', members: [a], stored: false}));
  else if (rest.length) areas = [...areas, {id: null, key: 'rest', group: null, title: 'Other requirements', kind: 'area', members: rest, stored: false}];
  for (const u of areas) if (!u.leaves) u.leaves = [u];
  const themed = functional.length ? themes : [];
  const themeOf = new Map(); for (const t of themed) for (const a of t.members) if (!themeOf.has(a.id)) themeOf.set(a.id, t);
  if (modular) for (const u of areas) for (const leaf of u.leaves) if (leaf !== u) for (const a of leaf.members) themeOf.set(a.id, leaf);
  const areaOf = new Map(); for (const u of areas) for (const a of u.members) if (!areaOf.has(a.id)) areaOf.set(a.id, u);
  const work = new Map(reqs.map(a => [a.id, workOf(a)])), asks = new Map(reqs.map(a => [a.id, asksOf(a)]));
  // The leaves (with modules) are what Chapter 4 answers and the facets what a heading or a decision's evidence reads.
  const leaves = modular ? areas.flatMap(u => u.leaves) : [...areas, ...themed], facets = modular ? leaves.filter(u => u.stored && u.kind === 'sub-module') : themed;
  return {p, reqs, byId, groups, areas, themes: themed, people, themeOf, areaOf, work, asks, modular, tree, leaves, facets, imported: reqs.some(a => a.provenance?.datasetId), assessed: reqs.some(a => str(a.assessment?.delivery))};
}
// The module areas: each module with the requirements whose home it is, in register order, and its leaves.
function moduleAreas(p, tree, byId) {
  const homes = new Map(), bySub = new Map(), direct = new Map(), add = (m, k, a) => { if (!m.has(k)) m.set(k, []); m.get(k).push(a); };
  for (const a of byId.values()) { const h = tree.home.get(a.id); if (!h) continue; add(homes, h.moduleId, a); if (h.subId) add(bySub, h.subId, a); else add(direct, h.moduleId, a); }
  const areas = [];
  for (const m of tree.modules) {
    const g = m.group, own = homes.get(g.id) || [];
    if (!own.length) continue;
    const u = {id: g.id, key: g.id, group: g, title: str(g.title), kind: 'area', members: own, stored: true, module: g, role: g.role === 'platform' ? 'platform' : 'business', leaves: null};
    const kids = m.children.filter(s => bySub.has(s.id)).map(s => ({id: s.id, key: s.id, group: s, title: str(s.title), label: clip(moduleLabel(p, s), 160), kind: 'sub-module', members: bySub.get(s.id), stored: true, area: u}));
    const loose = kids.length ? direct.get(g.id) || [] : [];
    if (loose.length) kids.push({id: null, key: g.id + '.direct', group: null, title: `Other ${str(g.title)} requirements`, label: clip(`${str(g.title)} › other requirements`, 160), kind: 'sub-module', members: loose, stored: false, area: u});
    u.leaves = kids.length ? kids : [u];
    areas.push(u);
  }
  return {areas};
}
// Links to a unit: its stored group, or its requirements.
const linksOf = u => (u.stored ? {requirementGroupIds: [u.id]} : {requirementIds: u.members.map(a => a.id)});
const groupsOfUnits = us => uniq(us.filter(u => u.stored).map(u => u.id));
// The members a record cites (DRF-16): those whose words show the concern first, then the rest, in register order.
const citesOf = (rows, test = null) => { const hit = test ? rows.filter(test) : []; return uniq([...hit, ...rows].map(a => a.id)).slice(0, CITES); };
const countsOf = rows => ({members: rows.length, delivered: rows.filter(isDelivered).length, gaps: rows.filter(isGap).length, partly: rows.filter(a => /partly|partial/i.test(str(a.assessment?.delivery))).length});
const countWords = c => `${plural(c.members, 'requirement')}${c.delivered || c.gaps ? `: ${c.delivered.toLocaleString('en-GB')} delivered, ${plural(c.gaps, 'gap')}${c.partly ? ` (${c.partly.toLocaleString('en-GB')} partly delivered)` : ''}` : ''}`;
// The work a set of rows names most, as words ("record keeping (40), calculation (12)").
function workMix(R, rows, n = 3) {
  const c = new Map(); for (const a of rows) { const w = R.work.get(a.id); c.set(w, (c.get(w) || 0) + 1); }
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([w, k]) => ({work: w, count: k}));
}
const mixWords = mix => mix.map(x => `${WORD_OF[x.work] || x.work} (${x.count.toLocaleString('en-GB')})`).join(', ');
const sourceOf = (R, u) => (u.stored ? `Requirement group ${u.id} · ${u.title}${R.imported ? ' (imported)' : ''}` : `${plural(u.members.length, 'requirement')}: ${u.members.slice(0, 3).map(a => a.id).join(', ')}${u.members.length > 3 ? ' …' : ''}`);

// ---------------------------------------------------------------- the draft, chapter by chapter

// A record of the draft: its key, chapter, kind and title, the groups it answers, its citations and the commands that
// make it (the first creates it; '@self' in a later one names what the first created).
function rec(key, chapter, kind, title, commands, {groups = [], cites = [], also = [], note = ''} = {}) {
  return {key, chapter, kind, title: clip(title, 160), groups: uniq(groups), cites: uniq(cites).slice(0, CITES), commands, ...(also.length ? {also} : {}), ...(note ? {note} : {})};
}
const ref = key => '@draft:' + key, codeRef = key => '{{code:' + key + '}}';
// What the project holds already, so a draft proposes only what is missing: the keys of records drafted before (their
// provenance.draft.key, kept when a person edits them) and, per kind, what a person made.
// What an earlier draft left: its records by draft key, in the order a chapter made them (the first record of a key
// is the one its first command made). A retired record's key is held (never drafted again) but not live: nothing in
// a later draft names it.
const heldRecords = p => [...list(p.artefacts), ...list(p.quality?.drivers), ...list(p.decisions?.records), ...list(p.logical?.groups), ...list(p.logical?.responsibilities), ...list(p.logical?.connections), ...list(p.realisation?.components), ...list(p.technology?.capabilities), ...list(p.technology?.boundaries), ...list(p.technology?.needs), ...list(p.technologyRealisation?.records), ...list(p.interfaces?.contracts), ...list(p.interfaces?.data), ...list(p.interfaces?.invariants), ...list(p.interfaces?.parties), ...list(p.security?.threats), ...list(p.security?.controls), ...list(p.runtime?.environments), ...list(p.runtime?.zones), ...list(p.runtime?.plans), ...list(p.runtime?.placements), ...list(p.roadmap?.plateaus), ...list(p.roadmap?.migrations), ...list(p.finalReview?.actions)];
export function heldDraftIds(p) {
  const ids = new Map();
  for (const r of heldRecords(p)) { const k = r?.provenance?.draft?.key; if (k && r.id && r.state !== 'retired' && !ids.has(k)) ids.set(k, r.id); }
  return ids;
}
function heldIndex(p) {
  const keys = new Set(), ids = heldDraftIds(p);
  for (const r of heldRecords(p)) { const k = r?.provenance?.draft?.key; if (k) keys.add(k); }
  for (const r of list(p.retired?.records)) { const k = r?.record?.provenance?.draft?.key; if (k) keys.add(k); }
  const titled = (xs, field = 'title') => new Set(list(xs).map(r => slug(r?.[field])));
  return {keys, ids, placedGroups: new Set(Object.keys(p.roadmap?.groups || {})), needs: list(p.technology?.needs), connections: list(p.logical?.connections), invariants: list(p.interfaces?.invariants), artefacts: new Set(list(p.artefacts).map(a => a.type + ':' + slug(a.title))), drivers: list(p.quality?.drivers), responsibilities: list(p.logical?.responsibilities), components: titled(p.realisation?.components), decisions: titled(p.decisions?.records, 'question'), capabilities: new Set(list(p.technology?.capabilities).map(c => c.category)), parties: titled(p.interfaces?.parties), data: titled(p.interfaces?.data), environments: new Set(list(p.runtime?.environments).map(e => e.stage)), plateaus: list(p.roadmap?.plateaus), narrative: !!str(p.finalReview?.narrative?.summary)};
}

function chapterOne(R, H, B, out) {
  const recs = [], at = (key, ...xs) => { if (!H.keys.has(key)) recs.push(rec(key, 1, ...xs)); };
  const skip = (type, title) => H.artefacts.has(type + ':' + slug(title));
  // Outcomes: the brief's goals, then the outcomes the rows state (an intended outcome other than the statement, stated
  // by at least two rows), each citing the rows it rests on and linked to them as the outcome they deliver.
  // A brief's outcome carries the problem its Problem section states (brief-interpreter.js problem), else that is open.
  B.outcomes.forEach((x, i) => { if (!skip('outcome', x.title)) at('c1.outcome.brief.' + (i + 1), 'outcome', x.title, [{type: 'artefact', payload: {type: 'outcome', title: clip(x.title, 160), description: str(x.description) || str(x.title), ...(B.problem ? {problem: clip(B.problem.text, 2000)} : {}), owner: '', source: 'Project brief' + (x.passages?.length ? ' · ' + x.passages.slice(0, 6).join(', ') : ''), confirmed: false, open: openMap(['owner', ...(B.problem ? [] : ['problem']), 'measure', 'baseline', 'target', 'by'])}}], {note: 'From the brief.'}); });
  const stated = new Map();
  for (const a of R.reqs) { const o = str(a.assessment?.outcome); if (o && o.toLowerCase() !== str(a.description).toLowerCase() && o.toLowerCase() !== str(a.title).toLowerCase()) { const k = slug(o); if (!stated.has(k)) stated.set(k, {text: o, rows: []}); stated.get(k).rows.push(a); } }
  const outcomes = [...stated.values()].filter(x => x.rows.length >= 2).sort((a, b) => b.rows.length - a.rows.length || a.text.localeCompare(b.text)).slice(0, 12);
  for (const x of outcomes) if (!skip('outcome', x.text)) at('c1.outcome.' + slug(x.text), 'outcome', x.text, [{type: 'artefact', payload: {type: 'outcome', title: clip(x.text, 160), description: `${x.text} Stated as the intended outcome of ${plural(x.rows.length, 'requirement')}.`, owner: '', source: 'Intended outcome column · ' + x.rows.slice(0, 6).map(a => a.externalId || a.id).join(', '), confirmed: false, links: x.rows.slice(0, 500).map(a => [a.id, 'delivers', 'new']), open: openMap(['owner', 'measure', 'baseline', 'target', 'by'])}}], {cites: x.rows.map(a => a.id)});
  if (stated.size > outcomes.length) out.notes.push(`${plural(stated.size - outcomes.length, 'outcome')} stated by one row only, or past the first 12, are not drafted.`);
  // Actors: one per user group the rows name, a persona with every field open.
  const people = new Map();
  for (const a of R.reqs) { const u = str(a.userGroup); if (u) { if (!people.has(u)) people.set(u, []); people.get(u).push(a); } }
  const peopleGroups = new Map(R.people.map(u => [str(u.group.rule?.[0]?.value || u.title).toLowerCase(), u.id]));
  const ranked = [...people].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [name, rows] of ranked.slice(0, 40)) {
    if (skip('actor', name)) continue;
    const areas = new Map(); for (const a of rows) { const u = R.areaOf.get(a.id); if (u) areas.set(u.title, (areas.get(u.title) || 0) + 1); }
    const top = [...areas].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 3).map(([t, n]) => `${t} (${n})`);
    const gid = peopleGroups.get(name.toLowerCase());
    at('c1.actor.' + slug(name), 'actor', name, [{type: 'artefact', payload: {type: 'actor', title: clip(name, 160), description: `Takes part in the work of ${plural(rows.length, 'requirement')}${top.length ? ', most in ' + joinAnd(top) : ''}.`, owner: '', source: 'User group column · ' + plural(rows.length, 'row'), category: '', confirmed: false, ...(gid ? {requirementGroupIds: [gid]} : {}), open: openMap(['owner', 'role', 'motivations', 'wishes', 'concerns', 'usage', 'benefits'])}}], {groups: gid ? [gid] : [], cites: rows.map(a => a.id)});
  }
  if (ranked.length > 40) out.notes.push(`${plural(ranked.length - 40, 'user group')} beyond the 40 largest are not drafted as actors.`);
  // Scope: the brief's scope, then one in-scope record per functional area.
  B.scope.forEach((x, i) => { if (!skip('scope', x.title)) at('c1.scope.brief.' + (i + 1), 'scope', x.title, [{type: 'artefact', payload: {type: 'scope', title: clip(x.title, 160), description: str(x.description) || str(x.title), scopeMode: x.scopeMode === 'out' || /\bout of scope|exclud/i.test(textOf(x)) ? 'out' : 'in', owner: '', source: 'Project brief', confirmed: false}}]); });
  for (const u of R.areas.filter(u => u.stored)) if (!skip('scope', u.title)) at('c1.scope.' + u.key, 'scope', u.title, [{type: 'artefact', payload: {type: 'scope', title: clip(u.title, 160), description: `In scope: the ${countWords(countsOf(u.members))} of ${u.title}.`, scopeMode: 'in', owner: '', source: sourceOf(R, u), confirmed: false, requirementGroupIds: [u.id]}}], {groups: [u.id], cites: citesOf(u.members)});
  // Constraints: the brief's, then one per regulatory or mandated-technology concern the rows name, which constrains them.
  B.constraints.forEach((x, i) => { if (!skip('constraint', x.title)) at('c1.constraint.brief.' + (i + 1), 'constraint', x.title, [{type: 'artefact', payload: {type: 'constraint', title: clip(x.title, 160), description: str(x.description) || str(x.title), owner: '', source: 'Project brief', confirmed: false}}]); });
  for (const c of CONSTRAINTS) {
    const rows = R.reqs.filter(a => c.words.test(textOf(a)));
    if (!rows.length || skip('constraint', c.title)) continue;
    out.constraints.push({key: 'c1.constraint.' + c.id, ...c, rows});
    at('c1.constraint.' + c.id, 'constraint', c.title, [{type: 'artefact', payload: {type: 'constraint', title: c.title, description: `${plural(rows.length, 'requirement')} name ${c.id === 'regulatory' ? 'a regulatory obligation' : 'a mandated technology or platform'}: ${rows.slice(0, 3).map(a => clip(a.title, 80)).join('; ')}${rows.length > 3 ? '; …' : ''}.`, owner: '', source: 'Requirement rows · ' + rows.slice(0, 6).map(a => a.externalId || a.id).join(', '), confirmed: false, links: rows.slice(0, 500).map(a => ['new', 'constrains', a.id])}}], {cites: rows.map(a => a.id)});
  }
  // Business rules: a rate or charge a row states is a rule (its value and unit), never a quality target (DRF-08).
  const rules = new Map();
  for (const a of R.reqs) { const r = businessRate(textOf(a)); if (!r) continue; const subject = nounPhrase(a.title) || 'business rate', k = slug(subject + '-' + r.value + r.unit + r.currency); if (!rules.has(k)) rules.set(k, {subject, r, rows: []}); rules.get(k).rows.push(a); }
  for (const [k, x] of [...rules].slice(0, 200)) { const title = cap(`${x.subject}: ${x.r.currency ? x.r.currency + ' ' : ''}${x.r.value}${x.r.unit === '%' ? '%' : x.r.unit ? ' ' + x.r.unit : ''}`); if (!skip('rule', title)) at('c1.rule.' + k, 'rule', title, [{type: 'artefact', payload: {type: 'rule', title: clip(title, 160), description: `The value ${plural(x.rows.length, 'requirement')} state${x.rows.length === 1 ? 's' : ''} for ${x.subject}: ${clip(x.rows[0].description || x.rows[0].title, 400)}`, owner: '', source: 'Requirement rows · ' + x.rows.slice(0, 6).map(a => a.externalId || a.id).join(', '), value: x.r.value, unit: x.r.unit, currency: x.r.currency, requirementIds: x.rows.slice(0, 5000).map(a => a.id), confirmed: false, open: openMap(['owner', 'effectiveDate', 'authority', 'instrument', 'section'])}}], {cites: x.rows.map(a => a.id)}); }
  // Journeys: one per functional area, a step per capability theme (the largest seven, the rest one step), every
  // requirement on the step of its theme; a step of administrative or supporting work is that kind of process. With a
  // module structure (round 24), one per module, a step per leaf: its sub-modules are its own decomposition, so none is
  // folded into another.
  const leafId = t => t.id || t.key;
  for (const u of R.areas) {
    const steps = new Map();
    for (const a of u.members) { const t = R.themeOf.get(a.id), k = t ? leafId(t) : '-'; if (!steps.has(k)) steps.set(k, {theme: t, rows: []}); steps.get(k).rows.push(a); }
    let ordered = [...steps.values()].sort((a, b) => b.rows.length - a.rows.length || (a.theme ? leafId(a.theme) : '~').localeCompare(b.theme ? leafId(b.theme) : '~'));
    if (ordered.length > 8 && !R.modular) { const keep = ordered.slice(0, 7), rest = ordered.slice(7); ordered = [...keep, {theme: null, other: true, rows: rest.flatMap(s => s.rows)}]; }
    ordered.forEach((s, i) => {
      const title = s.theme ? s.theme.title : s.other || ordered.length > 1 ? `Other ${u.title} work` : u.title, key = 'c1.step.' + u.key + '.' + (s.theme ? leafId(s.theme) : s.other ? 'other' : 'all');
      out.steps.push({key, title, area: u, theme: s.theme, rows: s.rows});
      if (H.keys.has(key)) return;
      const kind = processKindOf(u.title, s.theme?.title || ''), mix = workMix(R, s.rows, 2);
      out.placed.push(...s.rows.map(a => a.id));
      at(key, 'journey', title, [{type: 'artefact', payload: {type: 'journey', title: clip(title, 160), description: `${kind === 'administrative' ? 'An administrative process' : kind === 'supporting' ? 'A supporting process' : 'A step of the business'} in ${u.title}: the ${plural(s.rows.length, 'requirement')}${s.theme ? ' of ' + s.theme.title : ''}, mostly ${mixWords(mix)}.`, journeyId: clip(u.title, 120), order: i + 1, processKind: kind, owner: '', source: sourceOf(R, u) + (s.theme ? ' · ' + (s.theme.id ? s.theme.id + ' ' : '') + s.theme.title : ''), confirmed: false, links: s.rows.map(a => ['new', 'requires', a.id]), open: openMap(['owner'])}}], {groups: uniq([u.id, s.theme?.id]), cites: citesOf(s.rows), note: 'The order of the steps is the order of their size; the source does not state the sequence.'});
    });
  }
  return recs;
}

function chapterTwo(R, H, B, L, out) {
  const recs = [], at = (key, ...xs) => { if (!H.keys.has(key)) recs.push(rec(key, 2, ...xs)); };
  const base = {responsibilityIds: [], confirmed: false, targetConfirmed: false, owner: ''};
  const driverOpen = (...f) => openMap(['owner', ...f]);
  // The quality drivers come first: their codes (QD1 …) then follow the order of the draft, as a project's own do.
  // Quality drivers: one per quality concern the source's own headings name; the rows under it are cited, never turned
  // into scenarios; the scenario is a stub; the target only when a row states a quality figure with its unit.
  const concerns = new Map();
  for (const u of [...R.areas, ...R.facets].filter(u => u.stored)) { const q = qualityHeading(u.title); if (q) { if (!concerns.has(q)) concerns.set(q, []); concerns.get(q).push(u); } }
  for (const [q, units] of concerns) {
    if (H.drivers.some(d => (d.kind || 'quality') === 'quality' && d.category === q)) continue;
    const rows = uniq(units.flatMap(u => u.members.map(a => a.id))).map(id => R.byId.get(id)), fig = rows.map(a => ({a, f: qualityFigure(textOf(a))})).find(x => x.f), pr = priorityFrom(rows), key = 'c2.qd.' + q;
    out.qualities.set(q, key);
    const qn = qualityName(q).toLowerCase();
    at(key, 'driver', `${qualityName(q)}: ${units.map(u => u.title).join(', ')}`, [{type: 'quality.driver', payload: {...base, kind: 'quality', category: q, title: clip(`${qualityName(q)}: ${units.map(u => u.title).join(', ')}`, 160), description: '', impact: '', stimulus: '', conditions: '', response: '', metric: '', operator: fig ? fig.f.operator : 'At most', targetValue: fig ? fig.f.value : '', unit: fig ? fig.f.unit : '', window: '', measurement: '', priority: pr.priority, priorityBasis: pr.basis, rationale: pr.priority ? bandRationale(pr) : '', requirementIds: uniq([...(fig ? [fig.a.id] : []), ...citesOf(rows)]).slice(0, CITES), requirementGroupIds: units.map(u => u.id), source: units.map(u => sourceOf(R, u)).join('; ') + ` · ${units.length === 1 ? 'its heading names' : 'their headings name'} ${qn} as a concern (${plural(rows.length, 'requirement')})` + (fig ? ` · the figure "${fig.f.phrase}" is stated in ${fig.a.id}` : ''), open: {...driverOpen('stimulus', 'conditions', 'response', 'metric', 'window', 'measurement', ...(fig ? [] : ['unit']), ...(pr.priority ? [] : ['rationale'])), description: asked(`What does ${qn} mean for ${joinAnd(units.map(u => u.title))}, in the project's terms?`), impact: asked(`How does ${qn} shape the architecture?`)}}}], {groups: units.map(u => u.id), cites: [...(fig ? [fig.a.id] : []), ...citesOf(rows)], note: fig ? 'The target is the figure a row states.' : 'The target is not stated: no row states a quality figure with its unit.'});
  }
  // Business drivers: the brief's goals.
  B.outcomes.forEach((x, i) => at('c2.bd.' + (i + 1), 'driver', x.title, [{type: 'quality.driver', payload: {...base, kind: 'business', title: clip(x.title, 160), description: str(x.description) || str(x.title), impact: '', priority: '', priorityBasis: '', rationale: '', outcomeIds: [ref('c1.outcome.brief.' + (i + 1))], requirementIds: [], source: 'Project brief', open: {...driverOpen('rationale'), impact: asked(`How does the goal "${clip(x.title, 120)}" shape the architecture?`)}}}], {note: 'From the brief\'s goals.'}));
  // Functional drivers: one per functional area; its requirement and gap counts on its source line, its description a
  // question for a person (the SDD's group line prints the counts).
  for (const u of R.areas) {
    const key = 'c2.fd.' + u.key;
    if (u.stored && H.drivers.some(d => d.kind === 'functional' && list(d.requirementGroupIds).includes(u.id))) continue;
    const c = countsOf(u.members), pr = priorityFrom(u.members);
    out.drivers.set(u.key, key);
    at(key, 'driver', u.title, [{type: 'quality.driver', payload: {...base, kind: 'functional', title: clip(u.title, 160), description: '', impact: '', priority: pr.priority, priorityBasis: pr.basis, rationale: pr.priority ? bandRationale(pr) : '', ...linksOf(u), source: `${sourceOf(R, u)} · ${countWords(c)}; mostly ${mixWords(workMix(R, u.members))}`, open: {...driverOpen(...(pr.priority ? [] : ['rationale'])), description: asked(`What does ${u.title} ask of the architecture, in the project's terms?`), impact: asked(`How does the work of ${u.title} shape the architecture?`)}}}], {groups: u.stored ? [u.id] : [], cites: citesOf(u.members)});
  }
  // Constraint drivers: one per constraint the brief or the rows name.
  B.constraints.forEach((x, i) => at('c2.c.brief.' + (i + 1), 'driver', x.title, [{type: 'quality.driver', payload: {...base, kind: 'constraint', title: clip(x.title, 160), description: str(x.description) || str(x.title), impact: '', priority: '', priorityBasis: '', rationale: '', constraintIds: [ref('c1.constraint.brief.' + (i + 1))], requirementIds: [], source: 'Project brief', open: {...driverOpen('rationale'), impact: asked(`How does the constraint "${clip(x.title, 120)}" shape the architecture?`)}}}]));
  for (const c of out.constraints) { const pr = priorityFrom(c.rows), what = c.id === 'regulatory' ? 'regulatory obligations' : 'a mandated technology or platform'; out.concerns.set('constraint:' + c.id, 'c2.c.' + c.id); at('c2.c.' + c.id, 'driver', c.title, [{type: 'quality.driver', payload: {...base, kind: 'constraint', title: c.title, description: '', impact: c.impact, priority: pr.priority, priorityBasis: pr.basis, rationale: pr.priority ? bandRationale(pr) : '', constraintIds: [ref(c.key)], requirementIds: c.rows.slice(0, QUALITY_LIMITS.requirements).map(a => a.id), source: `Requirement rows · ${rowsLine(c.rows)} (${plural(c.rows.length, 'requirement')} name ${what})`, open: {...driverOpen(...(pr.priority ? [] : ['rationale'])), description: asked(`What do the ${c.id === 'regulatory' ? 'regulatory obligations' : 'mandated technologies and platforms'} the requirements name constrain, in the project's terms?`)}}}], {cites: c.rows.map(a => a.id)}); }
  // Operational, data, technology-evolution and business-continuity drivers: per concern the requirements evidence (at
  // least three rows): the chosen lens's concerns, else AIW's own vocabulary.
  const sources = L ? L.concerns.filter(c => LENS_KINDS[c.id]).map(c => ({id: c.id, kind: LENS_KINDS[c.id], title: c.title, cues: c.cues, lens: true})) : GENERIC_CONCERNS;
  for (const c of sources) {
    const rows = R.reqs.filter(a => c.cues.test(lowerText(a)));
    if (rows.length < 3) continue;
    const kind = DRIVER_KINDS.find(k => k.id === c.kind), pr = priorityFrom(rows), key = 'c2.' + kind.prefix.toLowerCase() + '.' + c.id;
    if (H.drivers.some(d => d.kind === c.kind && slug(d.title) === slug(c.title))) continue;
    out.concerns.set(c.id, key);
    out.concerns.set(c.kind, out.concerns.get(c.kind) || key);
    at(key, 'driver', c.title, [{type: 'quality.driver', payload: {...base, kind: c.kind, title: c.title, description: '', impact: '', priority: pr.priority, priorityBasis: pr.basis, rationale: pr.priority ? bandRationale(pr) : '', requirementIds: rows.slice(0, QUALITY_LIMITS.requirements).map(a => a.id), source: `${c.lens ? `Domain lens ${L.title} (rules, not knowledge) · requirement rows` : 'Requirement rows'} · ${rowsLine(rows)} (${plural(rows.length, 'requirement')} speak of it)`, open: {...driverOpen(...(pr.priority ? [] : ['rationale'])), description: asked(`What does the concern "${c.title}" ask of the architecture, in the project's terms?`), impact: asked(`How does the concern "${c.title}" shape the architecture?`)}}}], {cites: rows.map(a => a.id)});
  }
  return recs;
}

// The architectural themes a decision is drafted for (DESIGN D-10), each with its category, what evidences it, the
// drivers it weighs and its alternatives from the Playbook (styles, patterns, tactics and design decisions, by id).
// Round 25 (D-25-09): the style decision also weighs the project's quality drivers of the qualities the Playbook's style
// table marks, the qualities its styles are compared on; a project whose sources name none of them weighs as before.
const STYLE_QUALITIES = uniq(STYLES.flatMap(s => Object.keys(s.effects || {})));
const THEMES = [
  {id: 'style', category: 'foundational', question: 'Which architectural style should structure the platform?', always: true, drivers: ['functional', ...STYLE_QUALITIES], alternatives: ['S-LAYERED', 'S-MODMONO', 'S-SOA', 'S-MICROSERVICES', 'S-MICROKERNEL'], why: 'every component the draft proposes'},
  {id: 'hosting', category: 'foundational', question: 'How and where should the platform be hosted and deployed?', always: true, drivers: ['business-continuity', 'technology-evolution', 'availability'], alternatives: ['D-DP-3', 'D-DP-2', 'D-DP-4', 'D-DP-5'], why: 'the environments the draft proposes'},
  {id: 'integration', category: 'structural', question: 'How should the components and the external systems exchange information?', cross: ['integration', 'channel'], work: 'integration', drivers: ['technology-evolution', 'interoperability'], alternatives: ['P-FACADE', 'P-MEDIATOR', 'P-ADAPTER', 'D-SC-4'], why: 'the exchanges between areas and with external systems'},
  {id: 'data', category: 'structural', question: 'Which component owns each kind of data, and how are copies kept consistent?', always: true, drivers: ['data', 'integrity', 'traceability'], alternatives: ['T-MD-SPR', 'D-SC-3', 'D-AV-6'], why: 'the entities the rows name'},
  {id: 'identity', category: 'cross-cutting', question: 'How are people and systems identified, and their access decided and enforced?', cross: ['identity', 'approval'], work: 'access', drivers: ['security'], alternatives: ['T-SE-LIMIT', 'P-PROTECTED-SYSTEM', 'P-SECURE-COMMUNICATION', 'T-SE-DETECT'], why: 'the access, roles and dual-control rows'},
  {id: 'batch', category: 'trade-off', question: 'How should end-of-day and periodic processing run beside the online service?', cross: ['batch'], work: 'batch', drivers: ['operational'], alternatives: ['T-PF-SCHED', 'P-CHECK-POINTED-SYSTEM', 'D-SC-4', 'T-PF-CONC'], why: 'the periodic and end-of-day rows'},
  {id: 'observability', category: 'cross-cutting', question: 'How will the platform be monitored, and its faults detected and traced?', always: true, drivers: ['operational', 'operability'], alternatives: ['D-AV-3', 'T-AV-HEARTBEAT', 'T-TE-CONTROL', 'P-OBSERVER'], why: 'the components and the operations they need'},
  {id: 'resilience', category: 'cross-cutting', question: 'How does the platform keep running and recover when a part fails?', always: true, drivers: ['business-continuity', 'availability', 'recoverability'], alternatives: ['D-AV-1', 'P-STANDBY', 'D-AV-4', 'D-AV-5', 'T-AV-REDUNDANCY'], why: 'the continuity the platform must keep'},
  {id: 'channels', category: 'structural', question: 'How are the services exposed to channels and API consumers?', cross: ['channel'], drivers: ['functional', 'security'], alternatives: ['P-FACADE', 'P-THROTTLING', 'P-SECURE-COMMUNICATION', 'D-SC-6'], why: 'the channel and API rows'}
];
const PLAYBOOK = new Map([...STYLES.map(s => [s.id, {...s, form: 'style'}]), ...PATTERNS.map(s => [s.id, {...s, form: 'pattern'}]), ...TACTICS.map(s => [s.id, {...s, form: s.kind === 'tactic' ? 'tactic' : 'design decision'}])]);
const MARKS = {x: 'helps', '(x)': 'partly helps'};
// drivers: the keys of the drivers the decision weighs; qualityOf: the quality one of them is of, or null.
function alternativeOf(id, drivers = [], qualityOf = () => null) {
  const x = PLAYBOOK.get(id);
  if (!x) return null;
  const marks = Object.entries(x.effects || {}).map(([q, m]) => `${MARKS[m] || 'helps'} ${q}`).concat(Object.entries(x.also || {}).map(([q, m]) => `${MARKS[m] || 'helps'} ${q.toLowerCase()}`));
  const src = typeof x.src === 'string' ? x.src : '';
  const alt = {title: clip(x.form === 'style' ? `Adopt the ${x.name} style` : x.name, 160), summary: clip(str(x.text || x.concept || `The SA Playbook's ${x.name} ${x.form}.`), 4000), benefits: marks.length ? clip(`The SA Playbook marks it: ${marks.join('; ')}. A mark is the Playbook's qualitative judgement, not a score.`, 4000) : '', costs: '', consequences: '', pattern: clip(x.name, 4000), source: clip(`SA Playbook · ${x.id}${src ? ' · ' + src : ''}`, 4000), rejectionReason: '', responsibilityIds: [], relationships: [], assessments: {}, open: openMap(['costs', 'consequences'])};
  return {...alt, assessments: playbookAssessed(x, alt, drivers, qualityOf)};
}
// Round 25 (D-25-09, E2): the assessments AIW's rules draft for an alternative that follows a Playbook style or
// pattern: against each driver the decision weighs whose quality the Playbook marks for it, the mark as a suggestion
// reads it (decision-suggestions.js playbookAssessments, the one reading): "x", strong support, drafts supports; "(x)",
// potential or conditional support, drafts unknown with the question whether the condition holds; each citing the
// Playbook's cell and marked by: 'rules' until a person sends it again. A tactic or a design decision drafts none:
// D-25-08 and D-25-09 read the marks of styles and patterns only. Nothing here chooses or prefers: the drivers' lean is
// the decision reading's, worked out when read (decision-reading.js), and never stored.
function playbookAssessed(x, alt, drivers, qualityOf) {
  if (x.form !== 'style' && x.form !== 'pattern') return {};
  const out = {};
  for (const key of drivers) {
    const quality = qualityOf(key), mark = quality ? playbookAssessments(alt, {category: quality}).find(m => m.name === x.name) : null;
    if (mark) out[ref(key)] = {effect: mark.effect === 'supports' ? 'supports' : 'unknown', reason: mark.reason, evidence: mark.evidence, by: RULES};
  }
  return out;
}

// A released topic frames a comparison only where this project's requirements speak of its concern. The exact
// claim's receipt stays in the proposal's source; its method supplies a question, never a chosen answer.
function topicAlternatives(t) {
  const comparison = /\bCompare\s+([^\n]+?)\s+with\s+([^\n]+?)(?:,\s+against\b|\s+against\b|[.]|$)/i.exec(t.method);
  return comparison ? [comparison[1], comparison[2]].map(title => ({title: clip(cap(title), 160), summary: 'An approach named by the released decision method; its consequences need assessment in this project.', benefits: '', costs: '', consequences: '', source: `Released decision topic · ${t.receipt.releaseId} · ${t.receipt.claimId}`, assessments: {}, open: openMap(['benefits', 'costs', 'consequences'])})) : [];
}
function chapterThree(R, H, L, out) {
  const recs = [];
  // The quality a driver the decision weighs is of: one drafted here by its category, one an earlier draft left by its
  // record as it stands now (a person may have changed it since); a driver of another kind is of none.
  const drafted = new Map([...out.qualities].map(([q, k]) => [k, q]));
  const qualityOf = key => { const id = H.ids.get(key); if (!id) return drafted.get(key) || null; const d = H.drivers.find(x => x.id === id); return d && driverKind(d) === 'quality' ? d.category || null : null; };
  for (const t of THEMES) {
    const key = 'c3.' + t.id;
    if (H.keys.has(key) || H.decisions.has(slug(t.question))) continue;
    // Evidence: the groups whose titles name its cross-cutting concerns, the rows whose work is the theme's, and the
    // drivers of its kinds. A theme no requirement evidences is not drafted, except those every architecture decides.
    const groups = [...R.areas, ...R.facets].filter(u => u.stored && list(t.cross).includes(crossFor(u.title)));
    const rows = t.work ? R.reqs.filter(a => R.work.get(a.id) === t.work) : [];
    // Drivers to weigh: the theme's own kinds, then the functional drivers of the groups that evidence it and of the
    // areas that hold most of its rows; a theme none of those reaches weighs the first functional drivers.
    const held = new Map(); for (const a of rows) { const u = R.areaOf.get(a.id); if (u) held.set(u.key, (held.get(u.key) || 0) + 1); }
    const evidenced = [...groups.map(u => out.drivers.get(u.key)), ...[...held].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k]) => out.drivers.get(k))];
    let drivers = uniq([...t.drivers.flatMap(k => [...(k === 'functional' ? [...out.drivers.values()].slice(0, 6) : []), out.concerns.get(k), out.qualities.get(k)]), ...evidenced]).filter(Boolean);
    if (!drivers.length) drivers = [...out.drivers.values()].slice(0, 6);
    drivers = drivers.slice(0, DECISION_LIMITS.links);
    if (!t.always && !groups.length && rows.length < 3) continue;
    const alts = t.alternatives.map(id => alternativeOf(id, drivers, qualityOf)).filter(Boolean), assessed = alts.filter(a => Object.keys(a.assessments).length).length;
    const evidence = [groups.length ? `${plural(groups.length, 'requirement group')} (${groups.slice(0, 4).map(u => u.title).join('; ')}${groups.length > 4 ? '; …' : ''})` : '', rows.length ? `${plural(rows.length, 'requirement')} whose work is ${WORD_OF[t.work]}` : ''].filter(Boolean);
    out.decisions.set(t.id, key);
    recs.push(rec(key, 3, 'decision', t.question, [
      {type: 'decision.save', payload: {question: t.question, context: `Raised by ${evidence.length ? joinAnd(evidence) : t.why}. Drivers to weigh: ${drivers.length ? drivers.map(codeRef).join(', ') : 'none drafted yet'}. No alternative is chosen: a person compares them and decides.${assessed ? ` AIW's rules drafted the assessments of ${plural(assessed, 'alternative')} from the SA Playbook's marks, for a person to review.` : ''}`, category: t.category, topic: t.id === 'style' ? 'style' : 'custom', requirementIds: citesOf(rows), requirementGroupIds: groups.map(u => u.id).slice(0, DECISION_LIMITS.links), driverIds: drivers.map(ref), owner: '', source: 'Drafted by Sol from the requirement groups and the SA Playbook', rationale: '', open: openMap(['owner', 'rationale', 'impact', 'stakeholderNote', 'dependencies', 'licensing', 'skills', 'documentation'])}},
      ...alts.map(a => ({type: 'decision.alternative', payload: {id: '@self', ...a}}))
    ], {groups: groups.map(u => u.id), cites: citesOf(rows), note: `${plural(alts.length, 'alternative')} from the SA Playbook${assessed ? `, ${plural(assessed, 'of them', 'of them')} assessed from its marks by AIW's rules` : ''}; none is chosen.`}));
  }
  for (const t of domainTopics(H.p)) {
    const key = 'c3.topic.' + slug(t.id);
    if (!str(t.question) || H.keys.has(key) || H.decisions.has(slug(t.question)) || recs.some(r => slug(r.title) === slug(t.question))) continue;
    const concern = L?.concerns.find(c => c.id === t.concern), anchors = new Set(words(t.title + ' ' + t.concern));
    const rows = R.reqs.filter(a => concern?.cues.test(lowerText(a)) || [...anchors].some(w => words(textOf(a)).includes(w)));
    if (!rows.length) continue;
    const groups = uniq(rows.map(a => R.areaOf.get(a.id)?.id)).filter(Boolean).slice(0, DECISION_LIMITS.links);
    const drivers = uniq([...out.concerns.entries()].filter(([k]) => k === t.concern).map(([, v]) => v).concat(groups.map(id => out.drivers.get(id)), [...out.drivers.values()].slice(0, 3))).filter(Boolean).slice(0, DECISION_LIMITS.links);
    const alternatives = topicAlternatives(t), receipt = t.receipt;
    const source = `Released decision topic ${t.title} · ${receipt.releaseId} · ${receipt.claimId} · source SHA-256 ${receipt.sourceHash}; exact source passage lines ${receipt.lineStart}–${receipt.lineEnd}. Applicability and alternatives remain for the architect to judge.`;
    out.decisions.set('topic.' + t.id, key);
    recs.push(rec(key, 3, 'decision', t.question, [
      {type: 'decision.save', payload: {question: t.question, context: `Raised by the requirements about ${t.title}: ${plural(rows.length, 'requirement')} in ${joinAnd(groups.map(id => R.areas.find(u => u.id === id)?.title).filter(Boolean))}. The released method asks: ${clip(t.method, 1600)} No alternative is chosen; assess the method's conditions in this project.`, category: 'additional', topic: t.id, requirementIds: citesOf(rows), requirementGroupIds: groups, driverIds: drivers.map(ref), owner: '', source, rationale: '', open: openMap(['owner', 'rationale', 'impact', 'stakeholderNote', 'dependencies', 'licensing', 'skills', 'documentation'])}},
      ...alternatives.map(a => ({type: 'decision.alternative', payload: {id: '@self', ...a}}))
    ], {groups, cites: citesOf(rows), note: `Framed by an eligible released topic; ${plural(alternatives.length, 'approach')} to assess, none chosen. If the method gives no comparison, the architect must add alternatives.`}));
  }
  return recs;
}

// The component each unit is realised by: a functional area's own component, or the cross-cutting component its title
// names; a theme's cross-cutting component, else the component of the area that holds most of its requirements.
function components(R, H) {
  const cross = new Map(), own = new Map(), comps = [];
  const crossComp = id => { if (!cross.has(id)) { const x = crossOf(id); cross.set(id, {key: 'c5.x.' + id, cross: x, title: x.title, kind: x.kind, units: []}); } return cross.get(id); };
  const ownComp = u => {
    const mix = workMix(R, u.members, 1)[0], share = mix ? mix.count / u.members.length : 0;
    const kind = share >= 0.6 && mix.work === 'records' ? 'store' : share >= 0.6 && mix.work === 'batch' ? 'worker' : share >= 0.6 && mix.work === 'integration' ? 'adapter' : share >= 0.6 && mix.work === 'notification' ? 'adapter' : 'service';
    const noun = sentenceCase(u.title).replace(/\s+(?:services?|systems?|applications?)$/i, ''), title = kind === 'store' ? `${noun} store` : kind === 'worker' ? `${noun} batch` : kind === 'adapter' ? `${noun} adapter` : `${noun} service`;
    return {key: 'c5.' + u.key, title, kind, units: [], area: u};
  };
  if (R.modular) {
    // Round 24: a module's component realises its leaves; a leaf that names a cross-cutting concern (a module's
    // "Approval workflow and dual control" sub-module) is realised by that concern's component, as a platform module is
    // (by its title, else the concern it serves). A business module is its own, whatever its title's words ("Period
    // Close" is a module of the business, not the batch processing it uses). Each cross-cutting component is led by the
    // platform module that serves its concern, where there is one.
    const crossOfConcern = concern => Object.keys(CROSS_CONCERN).find(id => CROSS_CONCERN[id] === concern && id !== 'channel') || null;
    for (const u of R.areas) {
      const mc = u.stored && u.role === 'platform' ? crossFor(u.title) || crossOfConcern(u.module?.concern) : null;
      for (const leaf of u.leaves) {
        const c = (leaf !== u && leaf.stored ? crossOfConcern(leaf.group?.concern) || crossFor(leaf.title) : null) || mc;
        if (c) { crossComp(c).units.push(leaf); continue; }
        if (!own.has(u.key)) own.set(u.key, ownComp(u));
        own.get(u.key).units.push(leaf);
      }
    }
    const platform = R.tree.modules.filter(m => m.group.role === 'platform' && m.group.concern);
    for (const c of cross.values()) c.platform = platform.find(m => m.group.concern === CROSS_CONCERN[c.cross.id])?.group.id || null;
  } else {
    for (const u of R.areas) {
      const c = u.stored ? crossFor(u.title) : null;
      if (c) { crossComp(c).units.push(u); continue; }
      const c2 = ownComp(u);
      c2.units.push(u);
      own.set(u.key, c2);
    }
    for (const t of R.themes) {
      const c = crossFor(t.title);
      if (c) { crossComp(c).units.push(t); continue; }
      const n = new Map(); for (const a of t.members) { const u = R.areaOf.get(a.id); if (u) n.set(u.key, (n.get(u.key) || 0) + 1); }
      const best = [...n].filter(([k]) => own.has(k)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      const target = best ? own.get(best[0]) : [...cross.values()][0];
      if (target) target.units.push(t);
    }
  }
  for (const c of [...own.values(), ...cross.values()]) if (c.units.length && !H.keys.has(c.key) && !H.components.has(slug(c.title))) comps.push(c);
  // A component the project holds already (drafted before, or the same name) still realises: the draft names it. An
  // area's component is the one that realises it, else its own (with modules, the module's), else its title's concern.
  const all = [...own.values(), ...cross.values()];
  return {comps, all: all.filter(c => c.units.length), compOfUnit: unit => all.find(c => c.units.includes(unit)) || (own.get(unit.key)?.units.length ? own.get(unit.key) : null) || (unit.stored && crossFor(unit.title) ? cross.get(crossFor(unit.title)) : null) || undefined};
}

// The responsibility groups that realise the modules (round 24, D-24-03): one per module of the structure, titled as the
// module (a title another group holds is told apart), its purpose from the module, realising it (requirementGroupIds),
// so every record a draft puts in it, and every record those reach, is in the module (module-scope.js). Both drafters
// draft them (the rules here, Sol's bundle in architecture-contract.js) under the same keys, so a rules record a Sol
// draft keeps finds its group. A group the project holds that realises the module already is used as it is; one an
// earlier draft made and a person retired is not drafted again. refOf: module id -> the group's reference for a groupId.
export function moduleGroupDrafts(p, H = null) {
  const tree = moduleTree(p), records = [], refOf = new Map();
  if (!tree.modules.length) return {records, refOf};
  const held = H || {...heldIndex(p), p}, logical = list(p?.logical?.groups), taken = new Set(logical.map(g => str(g.title).toLowerCase()));
  const own = new Map(), served = new Map();
  for (const [, h] of tree.home) own.set(h.moduleId, (own.get(h.moduleId) || 0) + 1);
  for (const [rid, ms] of tree.served) for (const m of ms) if (tree.home.get(rid)?.moduleId !== m) served.set(m, (served.get(m) || 0) + 1);
  for (const m of tree.modules) {
    const g = m.group, key = 'c4.group.' + g.id, existing = logical.find(x => list(x.requirementGroupIds).includes(g.id));
    if (existing) { refOf.set(g.id, existing.id); continue; }
    if (held.keys.has(key)) { if (held.ids.get(key)) refOf.set(g.id, held.ids.get(key)); continue; }
    let title = clip(g.title, 120);
    if (taken.has(title.toLowerCase())) title = clip(g.title, 112) + ' module';
    for (let n = 2; taken.has(title.toLowerCase()); n++) title = clip(g.title, 100) + ` (${g.id}${n > 2 ? ' ' + n : ''})`;
    taken.add(title.toLowerCase());
    const n = own.get(g.id) || 0, s = served.get(g.id) || 0, subs = m.children.map(x => str(x.title));
    const purpose = g.role === 'platform'
      ? `Realises the platform module ${str(g.title)}, a shared service${g.concern ? ' for ' + concernTitle(g.concern).toLowerCase() : ''}${n ? `: ${plural(n, 'requirement')} of its own` : ''}${s ? `${n ? ', and' : ':'} the ${plural(s, 'requirement')} of the business modules it serves` : ''}.`
      : `Realises the business module ${str(g.title)}: ${plural(n, 'requirement')}${subs.length ? ` in ${plural(subs.length, 'sub-module')} (${subs.slice(0, 6).join('; ')}${subs.length > 6 ? '; …' : ''})` : ''}.`;
    refOf.set(g.id, ref(key));
    records.push(rec(key, 4, 'group', title, [{type: 'logical.group', payload: {title, purpose: clip(purpose, 4000), requirementGroupIds: [g.id]}}], {groups: [g.id], note: 'The responsibility group that realises the module; its responsibilities are drafted in it.'}));
  }
  return {records, refOf};
}

function chapterFour(R, H, out) {
  // Round 24 (D-24-03): with modules, the responsibility groups that realise them come first, and each responsibility
  // is drafted in its module's group.
  const groups = moduleGroupDrafts(R.p, H), recs = [...groups.records];
  for (const u of R.leaves) {
    const key = 'c4.' + u.key;
    if (H.keys.has(key) || (u.stored && H.responsibilities.some(r => list(r.requirementGroupIds).includes(u.id)))) continue;
    const c = countsOf(u.members), mix = workMix(R, u.members), mixed = mix.length > 1 && mix[0].count / u.members.length < 0.5, own = citesOf(u.members).slice(0, 3);
    const title = sentenceCase(u.label || u.title), module = R.modular ? (u.area || u).id : null, groupId = module ? groups.refOf.get(module) : null;
    out.responsibilities.set(u.key, key);
    recs.push(rec(key, 4, 'responsibility', title, [{type: 'logical.responsibility', payload: {title: clip(title, 160), purpose: `Owns the behaviour of the ${countWords(c)} of ${u.title}: mostly ${mixWords(mix)}.${mixed ? ' The group mixes these kinds of work; a person may split it into narrower responsibilities, each with a group of its own.' : ''}`, boundary: `Inside: the work of ${u.title}, for example ${own.map(id => clip(R.byId.get(id)?.title, 70)).join('; ')}. Outside: the work of the other ${u.kind === 'theme' ? 'themes' : u.kind === 'sub-module' ? 'sub-modules' : R.modular ? 'modules' : 'areas'}, each in its own responsibility.`, owner: '', ...linksOf(u), ...(groupId ? {groupId} : {}), decisionIds: [], source: sourceOf(R, u), confirmed: false, open: openMap(['owner'])}}], {groups: u.stored ? [u.id] : [], cites: own}));
  }
  // A responsibility serves a journey step by its saved identity. The area's responsibility serves every step in
  // that area; the narrower theme responsibility realises the steps carrying that theme. Neither link depends on a
  // title remaining the same. The connection is a proposal until the architect keeps it. Only a project that draws its
  // own steps (model-scope.js isBlankProject) draws a drafted step in Chapter 4; the Bank Payment reference draws its
  // seeded model, so a connection to a step it drafts would be refused (round 25: its draft could not be applied).
  const drawn = isBlankProject(R.p);
  for (const step of drawn ? out.steps : []) for (const [u, kind] of [[step.area, 'serves'], [step.theme, 'realises']]) {
    if (!u) continue;
    const respKey = 'c4.' + u.key, respId = H.ids.get(respKey), stepId = H.ids.get(step.key);
    if ((!out.responsibilities.has(u.key) && !respId) || (H.keys.has(step.key) && !stepId)) continue;
    if (respId && stepId && H.connections.some(c => c.from === respId && c.to === stepId && c.kind === kind)) continue;
    const key = 'c4.link.' + slug(step.key) + '.' + slug(u.key) + '.' + kind;
    if (H.keys.has(key)) continue;
    recs.push(rec(key, 4, 'connection', `${u.title} ${kind} ${step.title}`, [{type: 'logical.connection', payload: {from: ref(respKey), to: ref(step.key), label: `${kind === 'realises' ? 'Realises' : 'Serves'} ${step.title}`, kind, condition: ''}}], {groups: uniq([step.area.id, step.theme?.id]).filter(Boolean), cites: citesOf(step.rows), note: 'Typed connection to the journey step by id, awaiting a person.'}));
  }
  return recs;
}

function chapterFive(R, H, C, out) {
  const recs = [];
  for (const c of C.comps) {
    const rows = uniq(c.units.flatMap(u => u.members.map(a => a.id))).map(id => R.byId.get(id));
    // The drivers it serves (round 24, D-24-05): the functional drivers of the areas (with modules, the modules) whose
    // work it realises, each with why, not every driver its requirements share.
    const areas = uniq(c.units.map(u => u.area || u)), served = areas.map(u => [u, out.drivers.get(u.key)]).filter(([, k]) => k).slice(0, 12);
    const drivers = served.map(([, k]) => k).slice(0, 8);
    const allocations = c.units.filter(u => out.responsibilities.has(u.key) || H.ids.has('c4.' + u.key)).map(u => ({logicalId: ref('c4.' + u.key), scope: `Realises ${u.label || u.title} (${plural(u.members.length, 'requirement')}).`}));
    const links = uniq([c.platform, ...groupsOfUnits(c.units)]);
    out.components.set(c.key, c);
    // The counts go to the source line; a purpose is a design field (SDD-SPEC content standard), as is the rationale,
    // which says why the component exists, never who drafted it (the provenance says that).
    recs.push(rec(c.key, 5, 'component', c.title, [{type: 'realisation.component', payload: {title: clip(c.title, 160), kind: COMPONENT_KINDS.includes(c.kind) ? c.kind : 'service', purpose: c.cross ? `Realises ${c.cross.purpose}, for ${plural(rows.length, 'requirement')} in ${plural(c.units.length, 'group')}.` : `Realises the work of ${(c.area || c.units[0]).title}.`, boundary: `Owns ${c.units.map(u => u.label || u.title).slice(0, 8).join('; ')}${c.units.length > 8 ? '; …' : ''}. What other components own stays with them, reached through their contracts.`, inputs: '', outputs: '', owner: '', rationale: `One component per ${c.cross ? 'cross-cutting concern the groups name' : R.modular ? 'module' : 'functional area'}; it serves ${drivers.length ? drivers.map(codeRef).join(', ') : 'the drivers of the groups it realises'}.`, source: c.units.map(u => sourceOf(R, u)).slice(0, 6).join('; ') + ` · ${countWords(countsOf(rows))}`, status: 'draft', allocations, requirementGroupIds: links.slice(0, REALISATION_LIMITS.links), serves: served.map(([u, k]) => ({driverId: ref(k), reason: clip(c.cross ? `It realises ${c.cross.purpose} for the work of ${u.title}, which this functional driver states.` : `It realises the work of ${u.title}, which this functional driver states.`, 600)})), properties: [], patternIds: [], open: openMap(['owner', 'inputs', 'outputs', 'architecturalSolution', 'technologyNeeds'])}}], {groups: links, cites: citesOf(rows), note: `${c.kind === 'channel' ? 'A UI or channel entry' : c.kind === 'store' ? 'A data store' : c.kind === 'worker' ? 'A batch component' : c.kind === 'adapter' ? 'An integration adapter' : 'An application service'}; its quality properties and solution are open.`}));
  }
  return recs;
}

// What each kind of component needs, by capability category (not everything is compute).
const NEEDS = {service: ['compute', 'transactional'], store: ['transactional', 'backup'], worker: ['compute', 'messaging'], adapter: ['connectivity', 'messaging'], channel: ['connectivity', 'identity'], queue: ['messaging'], module: ['compute']};
// A newer category is added only when the component's own work calls for it. This drafts a need to compare, never a
// product, a tier or a selected implementation.
const specialisedNeeds = c => {
  const text = c.units.flatMap(u => u.members.map(a => textOf(a))).join(' ').toLowerCase();
  return [
    ...(c.cross?.id === 'batch' || c.kind === 'worker' && /\b(?:batch|scheduled|end.of.day|periodic)\b/.test(text) ? ['scheduling'] : []),
    ...(c.cross?.id === 'approval' ? ['workflow'] : []),
    ...(/\b(?:search|query|index)\b/.test(text) ? ['search'] : []),
    ...(c.cross?.id === 'reporting' ? ['reporting'] : []),
    ...(c.cross?.id === 'audit' || /\b(?:archive|retention|retain)\b/.test(text) ? ['archive'] : [])
  ];
};
const CATEGORY_NAME = id => TECHNOLOGY_CATEGORIES.find(([k]) => k === id)?.[1] || id;
function chapterSixSeven(R, H, C, out) {
  const six = [], seven = [], at6 = (key, ...xs) => { if (!H.keys.has(key)) six.push(rec(key, 6, ...xs)); };
  const named = C.all.filter(c => out.components.has(c.key) || H.ids.has(c.key));
  if (!named.length) return {six, seven};
  const outward = c => ['channel', 'adapter'].includes(c.kind);
  at6('c6.tb.internal', 'boundary', 'Internal application boundary', [{type: 'technology.boundary', payload: {title: 'Internal application boundary', owner: '', policy: '', open: openMap(['owner', 'policy'])}}], {note: 'Its crossing policy is open.'});
  if (named.some(outward)) at6('c6.tb.external', 'boundary', 'External integration boundary', [{type: 'technology.boundary', payload: {title: 'External integration boundary', owner: '', policy: '', open: openMap(['owner', 'policy'])}}]);
  const continuity = out.concerns.has('business-continuity') || out.qualities.has('availability') || out.qualities.has('recoverability'), observed = out.decisions.has('observability');
  const needs = new Map();
  for (const c of named) {
    // A component that holds needs already keeps them (a needs save replaces a component's whole set): the draft
    // proposes needs only for a component that has none, and maps the needs each component will have.
    const had = H.ids.has(c.key) ? H.needs.filter(n => n.applicationId === H.ids.get(c.key)) : [], drafting = !had.length && !H.keys.has('c6.need.' + c.key);
    const cats = drafting ? uniq([...(NEEDS[c.kind] || ['compute']), ...specialisedNeeds(c), ...(observed ? ['observability'] : []), ...(continuity && c.kind === 'store' ? ['recovery'] : [])]).filter(k => TECHNOLOGY_CATEGORIES.some(([id]) => id === k)) : uniq(had.map(n => n.category));
    for (const k of cats) { if (!needs.has(k)) needs.set(k, []); needs.get(k).push(c); }
    if (drafting) at6('c6.need.' + c.key, 'need', `${c.title} needs`, [{type: 'technology.needs', payload: {applicationId: ref(c.key), boundaryId: ref(outward(c) && named.some(outward) ? 'c6.tb.external' : 'c6.tb.internal'), needs: cats.map(k => ({category: k, description: `${c.title} needs ${CATEGORY_NAME(k).toLowerCase()} for ${c.cross ? c.cross.purpose : 'the work of ' + c.units[0].title}.`, criticality: '', open: openMap(['criticality'])}))}}], {groups: groupsOfUnits(c.units), note: 'The needs follow from the kind of component.'});
  }
  for (const [k, cs] of needs) {
    const key = 'c6.cap.' + k;
    if (H.keys.has(key) || H.capabilities.has(k)) continue;
    out.capabilities.set(k, key);
    six.push(rec(key, 6, 'capability', CATEGORY_NAME(k), [{type: 'technology.capability', payload: {category: k, title: CATEGORY_NAME(k), purpose: `Provides ${CATEGORY_NAME(k).toLowerCase()} to ${plural(cs.length, 'component')}: ${cs.slice(0, 6).map(c => c.title).join(', ')}${cs.length > 6 ? ', …' : ''}.`, boundary: `Provides ${CATEGORY_NAME(k).toLowerCase()}; each component's own logic and data rules stay with it.`, owner: '', rationale: `What the components that need it call for: ${plural(cs.length, 'need')}.`, source: 'Drafted by Sol from the components\' needs', status: 'draft', boundaryId: ref('c6.tb.internal'), mappings: cs.map(c => ({needId: '@need:' + c.key + '|' + k, scope: `${CATEGORY_NAME(k)} for ${c.title}`})), failureDomain: '', recoveryPlan: '', continuity: '', open: openMap(['owner', 'failureDomain', 'recoveryPlan', 'continuityPlan', 'recoveryOwner'])}}], {note: 'One capability per category, shared by the components that need it.'}));
    const plan = 'c7.' + k;
    if (H.keys.has(plan)) continue;
    seven.push(rec(plan, 7, 'realisation', `${CATEGORY_NAME(k)} implementation`, [
      {type: 'techrealisation.plan', payload: {capabilityId: ref(key), title: `${CATEGORY_NAME(k)} implementation`, purpose: `How ${CATEGORY_NAME(k).toLowerCase()} is provided. No product is named: the options are operating models to compare.`, owner: '', operationsPlan: '', lifecyclePlan: '', mappings: [{capabilityId: ref(key), scope: `Realises ${CATEGORY_NAME(k)}`}], source: 'Drafted by Sol from the capability', open: openMap(['owner', 'operationsPlan', 'lifecyclePlan'])}},
      {type: 'techrealisation.option', payload: {id: '@self', option: {title: `Self-managed ${CATEGORY_NAME(k).toLowerCase()}`, product: '', operatingModel: 'Self managed', evidence: 'An operating model, not a product. Product and lifecycle evidence remain to be assessed.'}}},
      {type: 'techrealisation.option', payload: {id: '@self', option: {title: `Provider-managed ${CATEGORY_NAME(k).toLowerCase()}`, product: '', operatingModel: 'Provider managed', evidence: 'An operating model, not a product. Product and lifecycle evidence remain to be assessed.'}}}
    ], {note: 'Two operating options; no product is named and none is chosen.'}));
  }
  return {six, seven};
}

function chapterEight(R, H, C, out) {
  const recs = [], at = (key, ...xs) => { if (!H.keys.has(key)) recs.push(rec(key, 8, ...xs)); };
  const compOf = a => { const u = R.areaOf.get(a.id); return u ? C.compOfUnit(u) : null; };
  const live = c => c && (out.components.has(c.key) || H.ids.has(c.key));
  // The canonical entity model (DRF-11): the entity nouns the rows use most, one data definition each, held by the
  // component of the area that names it most. Names are the project's own words, read here at run time.
  const nouns = new Map();
  for (const a of R.reqs) { const e = entityOf(nounPhrase(a.title)); if (e && e.length > 2) { if (!nouns.has(e)) nouns.set(e, []); nouns.get(e).push(a); } }
  const floor = Math.max(2, Math.min(5, Math.ceil(R.reqs.length / 400)));
  const candidates = [...nouns].filter(([, rows]) => rows.length >= floor).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  // Only a noun phrase names an entity (sdd-content.js nounNameCheck; SDD-SPEC content standard, round 12 C2): a verb
  // fragment the statements leave ("Ensure", "Verify", "System s ability") names nothing, so no data definition is
  // drafted for it and the draft asks a person which entity those rows act on.
  const fragments = candidates.filter(([noun]) => nounNameCheck(noun)), entities = candidates.filter(([noun]) => !nounNameCheck(noun)).slice(0, 60);
  if (fragments.length) out.asks.push({chapter: 8, field: 'data', question: `Which entities do ${plural(uniq(fragments.flatMap(([, rows]) => rows.map(a => a.id))).length, 'requirement')} act on? Their statements name no noun AIW can read as an entity (${fragments.slice(0, 6).map(([noun, rows]) => `"${cap(noun)}" in ${rows.slice(0, 3).map(a => a.id).join(', ')}${rows.length > 3 ? ' and ' + plural(rows.length - 3, 'more') : ''}`).join('; ')}${fragments.length > 6 ? '; …' : ''}), so no data definition is drafted for them.`});
  const entityKey = new Map(), dataOfOwner = new Map();
  for (const [noun, rows] of entities) {
    const by = new Map(); for (const a of rows) { const c = compOf(a); if (live(c)) by.set(c.key, (by.get(c.key) || 0) + 1); }
    const owner = [...by].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    if (!owner) continue;
    const key = 'c8.data.' + slug(noun);
    entityKey.set(noun, H.p.interfaces?.data?.find(d => slug(d.title) === slug(noun))?.id || ref(key));
    if (!dataOfOwner.has(owner)) dataOfOwner.set(owner, []);
    dataOfOwner.get(owner).push({key, title: cap(noun), rows, reference: H.p.interfaces?.data?.find(d => slug(d.title) === slug(noun))?.id || ref(key)});
    if (H.data.has(slug(noun))) continue;
    at(key, 'data', cap(noun), [
      {type: 'interfaces.data', payload: {title: cap(noun), purpose: `The ${noun} the requirements act on (${plural(rows.length, 'requirement')}).`, authorityId: ref(owner), classification: NOT_CLASSIFIED, owner: '', evidence: 'Entity noun of ' + rows.slice(0, 6).map(a => a.id).join(', '), requirementIds: citesOf(rows), open: openMap(['owner'])}},
      {type: 'interfaces.field', payload: {id: '@self', field: {name: keyName(noun), type: 'string', key: true, required: true, classification: 'Inherited', description: `The stable reference of a ${noun}.`, example: '', enumeration: '', constraints: ''}}},
      {type: 'interfaces.field', payload: {id: '@self', field: {name: 'status', type: 'string', key: false, required: true, classification: 'Inherited', description: `Where a ${noun} stands.`, example: '', enumeration: '', constraints: ''}}}
    ], {cites: rows.map(a => a.id), note: 'Named by the entity noun the rows use; its classification is not decided yet.'});
  }
  // A posting store needs a data definition to bind its proposed invariant. Reuse an entity already derived from
  // the requirements; if none was named often enough, propose one with its classification and ownership still open.
  const postingStores = C.all.filter(c => c.kind === 'store' && (out.components.has(c.key) || H.ids.has(c.key)) && /\b(?:postings?|ledgers?|journals?)\b/i.test(c.title + ' ' + c.units.map(u => u.title).join(' ')));
  for (const c of postingStores) {
    if (list(dataOfOwner.get(c.key)).some(d => /\b(?:postings?|ledgers?|journals?)\b/i.test(d.title)) || H.invariants.some(x => x.title === `Posting integrity at ${c.title}`)) continue;
    const rows = uniq(c.units.flatMap(u => u.members.map(a => a.id))).map(id => R.byId.get(id));
    const key = 'c8.data.posting.' + slugKey(c.key), title = 'Posting record of ' + c.title;
    dataOfOwner.set(c.key, [{key, title, rows, reference: H.p.interfaces?.data?.find(d => slug(d.title) === slug(title))?.id || ref(key)}]);
    if (H.data.has(slug(title))) continue;
    at(key, 'data', title, [
      {type: 'interfaces.data', payload: {title, purpose: `The posting record ${c.title} keeps for the work of ${joinAnd(c.units.map(u => u.title))}.`, authorityId: ref(c.key), classification: NOT_CLASSIFIED, owner: '', evidence: 'Requirements of ' + joinAnd(c.units.map(u => u.title)), requirementIds: citesOf(rows), open: openMap(['owner'])}},
      {type: 'interfaces.field', payload: {id: '@self', field: {name: 'sourceReference', type: 'string', key: true, required: true, classification: 'Inherited', description: 'The reference to the instruction from which the posting came.', example: '', enumeration: '', constraints: ''}}}
    ], {groups: groupsOfUnits(c.units), cites: citesOf(rows), note: 'A proposed posting record, not a claim that the source has already defined one.'});
  }
  const entityFor = rows => { const n = new Map(); for (const a of rows) { const e = entityOf(nounPhrase(a.title)), k = entityKey.get(e); if (k) n.set(k, (n.get(k) || 0) + 1); } return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null; };
  // The operation is a verb phrase built from the hand-over the contract carries (GR-DRF-24), never a slug of its ends.
  const contract = (key, from, to, title, kind, rows, purpose, operation, extra = {}) => {
    const data = entityFor(rows);
    at(key, 'contract', title, [{type: 'interfaces.contract', payload: {from, to, title: clip(title, 160), kind, purpose: clip(purpose, 4000), operation: operationPhrase(operation), owner: '', failurePolicy: '', authorization: '', evidence: `Drafted by Sol from ${plural(rows.length, 'requirement')}: ${rows.slice(0, 6).map(a => a.id).join(', ')}`, requirementIds: citesOf(rows), exchanges: data ? [{dataId: data, role: 'request'}] : [], open: openMap(['owner', 'failurePolicy', 'authorization', ...(kind === 'batch' ? ['batchTrigger', 'batchSchedule', 'batchWindow', 'cutOff', 'restartPoint', 'volume', 'predecessorIds'] : [])]), ...extra}}], {groups: uniq(rows.map(a => R.areaOf.get(a.id)?.id)), cites: rows.map(a => a.id), note: kind === 'batch' ? 'A batch contract: its trigger, schedule, window, cut-off, predecessors, restart point and volume are not stated.' : ''});
    if (kind === 'batch') out.batch.push(key);
  };
  // Parties (DRF-09): one per external system the rows name, and a contract per party and component. What the rows do
  // not say of the integration is not stated, each field with its question (SDD-SPEC content standard).
  const systems = new Map();
  for (const a of R.reqs) for (const name of externalSystems(textOf(a))) { const k = slug(name); if (!systems.has(k)) systems.set(k, {name, rows: []}); systems.get(k).rows.push(a); }
  const partyAsks = name => ({dataFormats: asked(`Which data formats are exchanged with ${name}?`), protocols: asked(`Which protocols carry the exchange with ${name}?`), securityConsiderations: asked(`What protects the exchange with ${name}?`), challenges: asked(`What makes the integration with ${name} hard?`), facilitation: asked(`How does the architecture ease the integration with ${name}?`)});
  for (const [k, s] of [...systems].sort((a, b) => b[1].rows.length - a[1].rows.length || a[0].localeCompare(b[0])).slice(0, 40)) {
    const key = 'c8.party.' + k;
    if (!H.parties.has(slug(s.name))) at(key, 'party', s.name, [{type: 'interfaces.party', payload: {title: clip(s.name, 160), purpose: `An external system ${plural(s.rows.length, 'requirement')} name${s.rows.length === 1 ? 's' : ''}: ${clip(s.rows[0].title, 160)}`, owner: '', kind: partyKindOf(s.name), status: '', source: 'Named in ' + s.rows.slice(0, 6).map(a => a.externalId || a.id).join(', '), confirmed: false, open: openMap(['owner', 'status', ...(partyKindOf(s.name) ? [] : ['kind'])], partyAsks(s.name))}}], {cites: s.rows.map(a => a.id)});
    out.parties.set(k, key);
    const by = new Map(); for (const a of s.rows) { const c = compOf(a); if (live(c)) { if (!by.has(c.key)) by.set(c.key, []); by.get(c.key).push(a); } }
    for (const [ck, rows] of by) { const c = C.all.find(x => x.key === ck), batch = rows.some(a => R.work.get(a.id) === 'batch' || WORK[2][1].test(lowerText(a))); contract('c8.ext.' + slugKey(ck) + '.' + k, ref(ck), ref(key), `${c.title} to ${s.name}`, batch ? 'batch' : 'request', rows, `What ${c.title} exchanges with ${s.name}, as ${plural(rows.length, 'requirement')} name it.`, (batch ? 'send the periodic file to ' : 'exchange with ') + s.name); }
  }
  // Hand-overs (DRF-04): from each area's component to the cross-cutting component its steps need; periodic work is a
  // batch contract with its trigger, window and cut-off not stated.
  for (const u of R.areas) {
    const from = C.compOfUnit(u);
    if (!live(from)) continue;
    const need = new Map();
    const want = (y, a) => { if (!need.has(y)) need.set(y, []); if (need.get(y).at(-1) !== a) need.get(y).push(a); };
    for (const a of u.members) { const t = R.themeOf.get(a.id), x = t ? crossFor(t.title) : null, w = R.work.get(a.id), y = CROSS.find(c => c.work === w)?.id; if (x) want(x, a); if (y) want(y, a); for (const k of R.asks.get(a.id)) want(CROSS.find(c => c.work === k)?.id || k, a); }
    for (const [x, rows] of [...need].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
      const to = [...C.all].find(c => c.cross?.id === x);
      if (!live(to) || to === from || rows.length < 2) continue;
      const kind = x === 'batch' ? 'batch' : ['notification', 'audit'].includes(x) ? 'event' : 'request';
      const [a, b] = x === 'channel' ? [to, from] : [from, to];
      contract('c8.ho.' + slugKey(a.key) + '.' + slugKey(b.key), ref(a.key), ref(b.key), `${a.title} to ${b.title}`, kind, rows, `${a.title} hands ${WORD_OF[crossOf(x).work] || x} work to ${b.title} for ${plural(rows.length, 'requirement')} of ${u.title}.`, HAND_OVER[crossOf(x).work] || 'hand over ' + (WORD_OF[crossOf(x).work] || x) + ' work');
    }
  }
  // Read-only access is a separate contract. A reporting/search component reading a posting store is not the same
  // interaction as a write or an event. The operation describes the hand-over; its authorization remains open.
  for (const store of postingStores) {
    const data = list(dataOfOwner.get(store.key)).find(d => /\b(?:postings?|ledgers?|journals?)\b/i.test(d.title));
    if (!data) continue;
    for (const reader of C.all.filter(c => c.key !== store.key && (out.components.has(c.key) || H.ids.has(c.key)) && (c.cross?.id === 'reporting' || c.units.some(u => u.members.some(a => R.work.get(a.id) === 'reporting'))))) {
      const rows = reader.units.flatMap(u => u.members).filter(a => /\b(?:postings?|ledgers?|journals?)\b/i.test(textOf(a)));
      if (!rows.length) continue;
      const key = 'c8.read.' + slugKey(reader.key) + '.' + slugKey(store.key);
      if (H.keys.has(key) || H.p.interfaces?.contracts?.some(x => x.from === H.ids.get(reader.key) && x.to === H.ids.get(store.key) && x.operation === operationPhrase('read ' + data.title))) continue;
      contract(key, ref(reader.key), ref(store.key), `${reader.title} reads ${data.title}`, 'request', rows, `${reader.title} reads ${data.title} held by ${store.title}; what it may see and how remains to be decided.`, 'read ' + data.title, {exchanges: [{dataId: data.reference, role: 'request'}]});
    }
    const title = `Posting integrity at ${store.title}`, key = 'c8.invariant.' + slugKey(store.key);
    if (H.keys.has(key) || H.invariants.some(x => x.title === title)) continue;
    const linked = recs.filter(r => r.kind === 'contract' && r.commands[0].payload.to === ref(store.key) && /\b(?:post|posting|ledger|journal)\b/i.test(r.commands[0].payload.operation)).map(r => ref(r.key)).slice(0, 50);
    at(key, 'invariant', title, [{type: 'interfaces.invariant', payload: {title, kind: 'uniqueness', condition: '', check: '', owner: '', dataIds: [data.reference], contractIds: linked, requirementIds: citesOf(data.rows), open: {...openMap(['check', 'owner']), condition: asked(`What balance and repeat-posting rules must ${data.title} keep, and where are they enforced?`)}}}], {groups: groupsOfUnits(store.units), cites: citesOf(data.rows), note: 'Proposed invariant per posting store; the condition and check need an architect.'});
  }
  return recs;
}
const slugKey = k => k.replace(/^c5\./, '').replace(/[^A-Za-z0-9-]+/g, '-');
// The verb phrase a hand-over's operation reads as (GR-DRF-24), by the work it hands over.
const HAND_OVER = {approval: 'request approval of an item', notification: 'send a notice', batch: 'schedule the periodic run', audit: 'record the change history', reporting: 'provide records for enquiry and reporting', access: 'check the caller’s access', integration: 'exchange records with the outside', posting: 'post the entries', calculation: 'calculate the figures', records: 'keep the records', validation: 'validate the item', maintenance: 'maintain the records'};
// An operation as a reader expects it: a verb phrase in plain words, at most 80 characters, never ending in a hyphen or
// a stop. Words that are not a verb phrase ("Deposit accounts to audit") are led by "exchange".
export function operationPhrase(words) {
  const t = str(words).replace(/[-–—\s.:;,]+$/, '').replace(/\s+/g, ' ');
  if (!t) return 'exchange records';
  const lead = t.split(' ')[0].toLowerCase(), verb = /^(?:send|request|schedule|record|provide|check|exchange|post|calculate|keep|validate|maintain|run|close|accrue|produce|reconcile|submit|receive|notify|hand|publish|read|write|fetch|look|update|create|verify|screen|settle|archive|export|import|apply|approve|reverse|migrate|restore|start|stop|report|retrieve|search|enquire|register|allocate|match|generate|compute|issue|release|route|deliver|collect|load|refresh|sync|synchronise|synchronize|order|place|cancel|amend|open|renew|convert|distribute|transfer|debit|credit|accept|reject|hold|expire|roll|book)$/.test(lead);
  const phrase = verb ? t[0].toLowerCase() + t.slice(1) : 'exchange ' + t[0].toLowerCase() + t.slice(1);
  return clip(phrase, 80).replace(/[-–—…\s.:;,]+$/, '');
}

function chapterNine(R, H, C, out) {
  const recs = [], at = (key, ...xs) => { if (!H.keys.has(key)) recs.push(rec(key, 9, ...xs)); };
  const live = c => c && (out.components.has(c.key) || H.ids.has(c.key));
  const dual = CONTROL_CATEGORIES.find(c => /dual control|segregation/i.test(c)) || 'Identity & access';
  const pair = (key, target, threat, control, rows, extra = '') => {
    at(key + '.threat', 'threat', threat.title, [{type: 'security.threat', payload: {targetIds: [ref(target.key)], title: clip(threat.title, 160), category: threat.category, scenario: threat.scenario, consequence: threat.consequence, priority: '', priorityBasis: '', owner: '', requirementIds: citesOf(rows), open: openMap(['owner', 'priorityBasis'])}}], {groups: groupsOfUnits(target.units), cites: rows.map(a => a.id)});
    at(key, 'control', control.title, [{type: 'security.control', payload: {title: clip(control.title, 160), category: control.category, purpose: control.purpose, owner: '', mechanism: '', enforcement: '', verificationPlan: '', failureMode: 'Unspecified', targetIds: [ref(target.key)], threatIds: [ref(key + '.threat')], requirementIds: citesOf(rows), assumptions: '', open: openMap(['owner', 'mechanism', 'enforcement', 'verificationPlan'])}}], {groups: groupsOfUnits(target.units), cites: rows.map(a => a.id), note: extra || 'Its mechanism and enforcement are open.'});
  };
  // Dual control (DRF-10): on each component whose rows ask for a maker, a checker or an authoriser.
  const MAKER_CHECKER = /\b(?:dual control|maker|checker|four[- ]eyes|second (?:person|approver|approval|pair of eyes)|authori[sz]er|authori[sz]ation by (?:a|another)|approv(?:e|al|ed) by (?:a|another|a second))\b/i;
  const owners = new Map();
  for (const a of R.reqs.filter(a => MAKER_CHECKER.test(textOf(a)))) { const u = R.areaOf.get(a.id), c = u ? C.compOfUnit(u) : null; if (live(c)) { if (!owners.has(c.key)) owners.set(c.key, {c, rows: []}); owners.get(c.key).rows.push(a); } }
  for (const {c, rows} of [...owners.values()].sort((a, b) => b.rows.length - a.rows.length || a.c.key.localeCompare(b.c.key))) pair('c9.dual.' + slugKey(c.key), c, {title: `One person enters and approves the same item at ${c.title}`, category: 'Unauthorised action', scenario: `A person enters an item at ${c.title} and approves it too, with no second person.`, consequence: 'An item takes effect without the dual control the requirements ask for.'}, {title: `Dual control (maker-checker) at ${c.title}`, category: dual, purpose: `A second person approves what a first person enters at ${c.title}, as ${plural(rows.length, 'requirement')} ask.`}, rows, 'A dual-control proposal on the owning component; its mechanism and enforcement are open.');
  // Access at the channel entry, and the audit history where the rows ask for it.
  const channel = C.all.find(c => c.cross?.id === 'channel'), access = R.reqs.filter(a => R.work.get(a.id) === 'access');
  if (live(channel)) pair('c9.access', channel, {title: `A caller without the right access uses ${channel.title}`, category: 'Unauthorised action', scenario: `A person or system without the entitlement calls ${channel.title}.`, consequence: 'An action is taken without the authority it needs.'}, {title: `Authenticate and authorise callers of ${channel.title}`, category: 'Identity & access', purpose: `Every caller of ${channel.title} is identified and its entitlement checked.`}, access.length ? access : R.reqs.slice(0, 1));
  const audit = C.all.find(c => c.cross?.id === 'audit'), history = R.reqs.filter(a => R.work.get(a.id) === 'audit');
  if (live(audit) && history.length) pair('c9.audit', audit, {title: `A change leaves no history at ${audit.title}`, category: 'Missing evidence', scenario: 'A change is made and its before and after values, who made it and when are not recorded.', consequence: 'A change cannot be explained to an auditor.'}, {title: 'Record the history of every change', category: 'Detection & audit', purpose: `${audit.title} keeps what changed, who changed it and when, as ${plural(history.length, 'requirement')} ask.`}, history);
  return recs;
}

function chapterTen(R, H, C, out) {
  const recs = [], at = (key, ...xs) => { if (!H.keys.has(key)) recs.push(rec(key, 10, ...xs)); };
  const named = C.all.filter(c => out.components.has(c.key) || H.ids.has(c.key));
  if (!named.length) return recs;
  // One set of environments (DRF-16), not one per component: production and pre-production, and a recovery
  // environment when the drivers ask for continuity. A plan per component is AIW's proposal (runtime-domain.js); each
  // is placed in its environment's zone, its copies not stated.
  const stages = [['production', 'Production design', 'Production'], ['preproduction', 'Pre-production design', 'Pre-production'], ...(out.concerns.has('business-continuity') || out.qualities.has('availability') || out.qualities.has('recoverability') ? [['recovery', 'Recovery design', 'Recovery']] : [])];
  for (const [id, stage, title] of stages) {
    const env = 'c10.env.' + id, zone = 'c10.zone.' + id;
    if (H.environments.has(stage)) continue;
    out.environments.set(id, env);
    at(env, 'environment', title, [{type: 'runtime.environment', payload: {title, stage, purpose: `The ${title.toLowerCase()} environment of the platform: one set for every component.`, owner: '', assetIds: named.map(c => ref(c.key)), basis: '', confirmed: false, open: openMap(['owner', 'basis'])}}], {note: 'One environment per stage; a plan per component follows it as AIW\'s proposal.'});
    at(zone, 'zone', `${title} zone`, [{type: 'runtime.zone', payload: {environmentId: ref(env), title: `${title} zone`, failureDomain: '', owner: '', open: openMap(['failureDomain', 'owner'])}}]);
    at('c10.place.' + id, 'placement', `${title} placements`, named.map(c => ({type: 'runtime.placement', payload: {planId: '@plan:' + env + '|' + c.key, zoneId: ref(zone), role: 'active', replicas: '', basis: '', confirmed: false, open: openMap(['replicas'])}})), {note: `${plural(named.length, 'placement')}, the copies of each not stated.`});
  }
  // The batch window of the batch component: what runs (the batch contracts), its start, end and cut-off not stated.
  const batch = named.find(c => c.cross?.id === 'batch');
  if (batch && out.batch.length && out.environments.has('production')) at('c10.window', 'schedule', 'End-of-day batch window', [{type: 'runtime.plan', payload: {id: '@plan:' + out.environments.get('production') + '|' + batch.key, schedule: {serviceHours: '', basis: '', maintenanceWindows: [], batchWindows: [{name: 'End-of-day run', start: '', end: '', timeZone: '', cutOff: '', contents: `The periodic work of ${plural(out.batch.length, 'batch contract')}.`, contractIds: out.batch.slice(0, 50).map(ref), onlineDuring: '', driverId: out.concerns.has('operational') ? ref(out.concerns.get('operational')) : ''}]}}}], {note: 'Its start, end and cut-off are not stated.'});
  return recs;
}

function delivery(R, H, C, out) {
  const recs = [], at = (key, ...xs) => { if (!H.keys.has(key)) recs.push(rec(key, 'delivery', ...xs)); };
  if (!R.assessed) return recs;
  const delivered = R.reqs.filter(isDelivered).length, gaps = R.reqs.filter(isGap).length;
  // The plateaus (DRF-14): the platform as delivered now, and the target with the value gaps closed.
  const orders = list(H.plateaus).map(x => x.order), base = orders.length ? Math.max(...orders) : 0;
  const hasCurrent = list(H.plateaus).some(x => x.kind === 'current');
  if (!hasCurrent) at('d.plateau.current', 'plateau', 'Current platform', [{type: 'review.plateau', payload: {title: 'Current platform', kind: 'current', order: base + 1, purpose: `What the platform delivers today: ${plural(delivered, 'requirement')} delivered.`}}]);
  at('d.plateau.target', 'plateau', 'Target platform', [{type: 'review.plateau', payload: {title: 'Target platform', kind: 'target', order: base + 2, purpose: `The platform with its value gaps closed: ${plural(gaps, 'requirement')} not yet fully delivered.`}}]);
  const current = hasCurrent ? list(H.plateaus).find(x => x.kind === 'current').id : ref('d.plateau.current');
  // Each group on the plateau its delivery status proposes: delivered whole on the current platform, with gaps on the
  // target. A group placed already (by a person, or an earlier draft) keeps its place.
  for (const u of [...R.areas, ...R.themes].filter(u => u.stored && !H.placedGroups.has(u.id))) { const c = countsOf(u.members); at('d.place.' + u.key, 'placement', u.title, [{type: 'review.plateau-group', payload: {groupId: u.id, plateauId: c.gaps ? ref('d.plateau.target') : current, basis: 'delivery status'}}], {groups: [u.id], note: c.gaps ? `${plural(c.gaps, 'gap')}: on the target.` : 'Delivered: on the current platform.'}); }
  // One candidate obligation per value-gap area (DRF-13), on the component that realises it.
  for (const u of R.areas) {
    const gapRows = u.members.filter(isGap), c = C.compOfUnit(u);
    if (!gapRows.length || !c || !(out.components.has(c.key) || H.ids.has(c.key))) continue;
    out.obligations.push('d.ob.' + u.key);
    at('d.ob.' + u.key, 'obligation', `Close the value gaps of ${u.title}`, [{type: 'review.action', payload: {title: clip(`Close the value gaps of ${u.title}`, 180), owner: '', due: '', acceptance: `The ${plural(gapRows.length, 'requirement')} of ${u.title} not yet fully delivered are delivered and verified: ${gapRows.slice(0, 12).map(a => clip(a.title, 100)).join('; ')}${gapRows.length > 12 ? ' and ' + (gapRows.length - 12) + ' more' : ''}.`, objectIds: [ref(c.key)], findingId: '', plateauId: ref('d.plateau.target')}}], {groups: u.stored ? [u.id] : [], cites: gapRows.map(a => a.id), note: 'A candidate obligation for a person to accept.'});
  }
  // The migration, coexistence and cut-over record (GR-RUN-05): the source shows an existing system (rows delivered
  // today, a legacy party, or migration words).
  const legacy = R.reqs.filter(a => /\b(?:migrat\w*|legacy|existing system|current system|cut[- ]?over|coexist\w*|data conversion|decommission\w*)\b/i.test(textOf(a)));
  if ((delivered || legacy.length) && !list(H.p.roadmap?.migrations).length) {
    const objects = [...out.components.keys()].slice(0, 12);
    if (objects.length) at('d.migration.action', 'obligation', 'Migrate from the current platform and cut over', [{type: 'review.action', payload: {title: 'Migrate from the current platform and cut over', owner: '', due: '', acceptance: 'The data and the work move from the current platform to the target, reconciled, with a rehearsed cut-over and a rollback.', objectIds: objects.map(ref), findingId: '', plateauId: ref('d.plateau.target')}}], {cites: legacy.map(a => a.id), note: 'A candidate obligation for a person to accept.'});
    at('d.migration', 'migration', 'Migration from the current platform', [{type: 'review.migration', payload: {title: 'Migration from the current platform', source: delivered ? `The current platform, which delivers ${plural(delivered, 'requirement')} today` : 'The existing system the requirements name', target: 'The target platform', scope: '', volumes: '', reconciliation: '', parallelRun: '', rollback: '', rehearsal: '', plateauIds: [current, ref('d.plateau.target')], actionIds: objects.length ? [ref('d.migration.action')] : [], open: openMap(['scope', 'volumes', 'reconciliation', 'parallelRun', 'rollback', 'rehearsal'])}}], {cites: legacy.map(a => a.id), note: 'Its scope, volumes, reconciliation, parallel run, rollback and rehearsal are not stated.'});
  }
  return recs;
}

function chapterEleven(R, H, B, out, name) {
  if (H.narrative || H.keys.has('c11.narrative')) return [];
  const areas = R.areas.filter(u => u.stored), c = countsOf(R.reqs);
  return [rec('c11.narrative', 11, 'narrative', `${name} — Solution Design`, [{type: 'review.narrative', payload: {title: clip(`${name} — Solution Design`, 180), owner: '', audience: '', summary: clip(`${name}: ${countWords(c)}${areas.length ? `, in ${plural(areas.length, R.modular ? 'module' : 'functional area')}` : ''}.${B.text ? ' ' + clip(B.text, 600) : ''} Drafted by Sol from the requirement groups; not reviewed by a person.`, 6000), scope: clip(areas.length ? 'In scope: ' + areas.map(u => `${u.title} (${u.members.length})`).join('; ') + '.' : 'Scope: the requirements the project holds.', 6000), approach: clip(`Decisions to make: ${[...out.decisions.keys()].map(id => THEMES.find(t => t.id === id)?.question).filter(Boolean).join(' ')} Nothing is chosen yet.`, 6000), confirmed: false}}], {note: 'The SDD\'s framing; its owner and audience are for a person to name.'})];
}

// The brief as the draft reads it: the brief interpreter's outcomes, constraints, scope and problem from the kept brief text.
function readBrief(text) {
  const t = str(text);
  if (!t) return {text: '', outcomes: [], constraints: [], scope: [], problem: null};
  const b = interpretBrief(t, {});
  const take = xs => list(xs).filter(x => str(x?.title || x?.description)).map(x => ({...x, title: str(x.title) || clip(x.description, 120)}));
  return {text: t, outcomes: take(b.outcomes), constraints: take(b.constraints), scope: take(b.scope), problem: b.problem && str(b.problem.text) ? b.problem : null};
}

// ---------------------------------------------------------------- the draft

// A draft names only what the apply will have made by the time it names it: a record earlier in the bundle, or a live
// record an earlier draft left (present). A reference to anything else is left out where it is one item of a list or
// the key of one entry of a map (an assessment keyed by its driver);
// a command that cannot do without it is left out; a record whose first command is left out (or that keeps no
// command) is left out whole, and anything that names it in turn. present gains each record kept.
// The lists of links a command cannot do without (its chapter refuses it empty).
const NEEDED = {'security.threat': ['targetIds'], 'security.control': ['targetIds'], 'review.action': ['objectIds']};
function namedOnly(records, present, dropped) {
  const kept = [];
  for (const r of records) {
    let changed = false;
    const ok = k => present.has(k);
    const clean = v => {
      if (typeof v === 'string') {
        const fine = v.startsWith('@draft:') ? ok(v.slice(7)) : v.startsWith('@need:') ? ok(v.slice(6).split('|')[0]) : v.startsWith('@plan:') ? v.slice(6).split('|').every(ok) : true;
        if (!fine) changed = true;
        return fine ? v : undefined;
      }
      if (Array.isArray(v)) { const xs = v.map(clean).filter(x => x !== undefined); return xs; }
      if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) { if (k.startsWith('@draft:') && !ok(k.slice(7))) { changed = true; continue; } const y = clean(x); if (y === undefined) return undefined; o[k] = y; } return o; }
      return v;
    };
    const commands = r.commands.map(c => { const payload = clean(c.payload || {}); return {...c, payload: payload && list(NEEDED[c.type]).some(k => list(c.payload[k]).length && !list(payload[k]).length) ? undefined : payload}; });
    const usable = commands.filter(c => c.payload !== undefined), selfish = r.commands.slice(1).some(c => c.payload?.id === '@self');
    if (!usable.length || (commands[0].payload === undefined && selfish)) { dropped.push(r); continue; }
    present.add(r.key);
    kept.push(changed ? {...r, commands: usable} : r);
  }
  return kept;
}

// The draft of a project's architecture: the bundle of proposed records per chapter, with the counts, a sample and the
// caps with their headroom, the requirements traced through their groups, and what the draft leaves for a person.
// Options: briefText (the brief to read; the project's own brief otherwise), lens (a lens object; the chosen lens
// otherwise), chapters (a subset). draftSteps yields each chapter as it is drafted (a job reports it and may stop
// between chapters) and returns the bundle; draftArchitecture runs it through.
export function* draftSteps(p, {briefText = null, lens = undefined, chapters = DRAFT_CHAPTERS} = {}) {
  const R = readProject(p), H = {...heldIndex(p), p}, text = briefText == null ? [str(p?.brief?.problem), str(p?.brief?.goal)].filter(Boolean).join('\n\n') : str(briefText);
  const B = readBrief(text), L = lens === undefined ? lensById(lensSetting(p)?.lensId) : lens;
  const out = {notes: [], asks: [], placed: [], steps: [], constraints: [], drivers: new Map(), qualities: new Map(), concerns: new Map(), decisions: new Map(), responsibilities: new Map(), components: new Map(), capabilities: new Map(), parties: new Map(), environments: new Map(), batch: [], obligations: []};
  const C = components(R, H), want = new Set(chapters.map(String)), made = [], present = new Set(H.ids.keys()), dropped = [];
  let six = null;
  const all = [[1, () => chapterOne(R, H, B, out)], [2, () => chapterTwo(R, H, B, L, out)], [3, () => chapterThree(R, H, L, out)], [4, () => chapterFour(R, H, out)], [5, () => chapterFive(R, H, C, out)], [6, () => (six = chapterSixSeven(R, H, C, out)).six], [7, () => six.seven], [8, () => chapterEight(R, H, C, out)], [9, () => chapterNine(R, H, C, out)], [10, () => chapterTen(R, H, C, out)], ['delivery', () => delivery(R, H, C, out)], [11, () => chapterEleven(R, H, B, out, str(p?.name) || 'The solution')]];
  for (const [ch, fn] of all) {
    // Every chapter is drafted (later chapters name what earlier ones draft); a chapter left out is not returned, and
    // what names its records is left out with it (namedOnly).
    const drafted = fn();
    if (!want.has(String(ch))) continue;
    const records = namedOnly(drafted, present, dropped);
    const chapter = {chapter: ch, title: DRAFT_TITLES[ch], records, commands: records.reduce((n, r) => n + r.commands.length, 0)};
    made.push(chapter);
    yield chapter;
  }
  // Every requirement traced through its group: linked by a drafted or held record through a group it belongs to (or,
  // in a project without groups, named by one).
  const tracedGroups = new Set([...made.flatMap(c => c.records.flatMap(r => r.groups)), ...list(p.logical?.responsibilities).flatMap(r => list(r.requirementGroupIds))]);
  const named = new Set(R.groups.length ? [] : made.flatMap(c => c.records.flatMap(r => r.commands.flatMap(x => list(x.payload?.requirementIds)))));
  const index = groupIndex(p), traced = new Set(R.reqs.filter(a => (index.of.get(a.id) || []).some(g => tracedGroups.has(g)) || named.has(a.id)).map(a => a.id));
  const placed = new Set(out.placed), heldSteps = new Set(list(p.relationships).filter(r => r.kind === 'requires').map(r => r.to));
  if (dropped.length) out.notes.push(`${plural(dropped.length, 'proposal')} left out: ${dropped.length === 1 ? 'it names a record' : 'they name records'} neither in this draft nor in the project (${dropped.slice(0, 4).map(r => r.title).join('; ')}${dropped.length > 4 ? '; …' : ''}).`);
  if (!B.text) out.asks.push({chapter: 1, field: 'brief', question: 'Write the project brief: the business outcomes and business drivers, and the constraints and scope it states, are drafted from it. Everything else is drafted from the requirement groups.'});
  const bundle = {schema: DRAFT_SCHEMA, engine: DRAFT_ENGINE, basis: basisOf(p, B, L), chapters: made, notes: out.notes, asks: out.asks,
    trace: {requirements: R.reqs.length, traced: traced.size, untraced: R.reqs.filter(a => !traced.has(a.id)).map(a => a.id).slice(0, 50), placed: R.reqs.filter(a => placed.has(a.id) || heldSteps.has(a.id)).length, groups: R.groups.length, areas: R.areas.length, themes: R.themes.length, ...(R.modular ? {modules: R.tree.modules.length} : {})},
    doctrine: 'Every record is a proposal drafted by Sol: not confirmed, not approved and not reviewed by a person. No alternative is chosen. Candidate and discovery knowledge inform nothing here.'};
  return {...bundle, counts: countsOfBundle(bundle), caps: capsOf(p, bundle), stamp: digest(bundle)};
}
// Runs a step generator to its end and returns what it returns.
export function runSteps(steps, onStep = null) { for (;;) { const x = steps.next(); if (x.done) return x.value; if (onStep) onStep(x.value); } }
export const draftArchitecture = (p, options = {}) => runSteps(draftSteps(p, options), options.onChapter || null);

// ---------------------------------------------------------------- what the model-drafted architecture reads (round 12, BRAIN)
// The architecture contract (architecture-contract.js) drafts the same project one theme at a time: it reads the units
// the rules draft from (draftUnits: the functional areas, then the capability themes, each with its members), builds its
// bundle with the same record shape (draftRecord, openFields, draftRef, codeRef) and the same clean (cleanDraft), lets
// the rules draft the chapters that follow from the components (supportingChapters: needs, capabilities,
// implementations, environments, placements and the batch window), and seals the bundle as draftSteps does (sealBundle).
export const draftReading = p => readProject(p);
// What one unit's packet holds at most (the contract's THEME_LIMITS.requirements reads it): its own requirements, and the
// sample of the requirements a platform module that only serves sends.
export const UNIT_LIMITS = Object.freeze({requirements: 150, served: 60});
export function draftUnits(p) {
  const R = readProject(p);
  if (R.modular) return moduleUnits(R);
  return [...R.areas, ...R.themes].map(u => ({id: u.id, key: u.key, title: u.title, kind: u.kind, stored: u.stored, members: u.members, themeOf: id => R.themeOf.get(id) || null, work: id => R.work.get(id) || ''}));
}
// Round 24 (D-24-04): the units of a project with a module structure are its modules, each requirement sent once, in
// the unit of its home. The platform modules come first (they define the shared services the business modules then use),
// the largest first by the requirements they own and serve; then the business modules by size. A module above the
// packet's bound is drafted in parts of whole sub-modules (first fit, in the module's own order; a sub-module above the
// bound is split in requirement order), each part naming its module and sub-modules. A platform module that only serves
// sends a bounded sample of the requirements it serves, taken in turn from each module it serves; they stay in their
// own modules' units (served, not members). Theme and other facet groups are not drafted.
function moduleUnits(R) {
  const tree = R.tree, LIMIT = UNIT_LIMITS.requirements, areaOf = new Map(R.areas.filter(u => u.module).map(u => [u.id, u]));
  const servedBy = new Map(), leafOf = new Map();
  for (const [rid, ms] of tree.served) for (const m of ms) if (tree.home.get(rid)?.moduleId !== m) { if (!servedBy.has(m)) servedBy.set(m, []); servedBy.get(m).push(rid); }
  for (const u of R.areas) for (const leaf of u.leaves || [u]) for (const a of leaf.members) leafOf.set(a.id, leaf);
  const titleOf = new Map(tree.modules.map(m => [m.group.id, str(m.group.title)]));
  const entries = tree.modules.map(m => ({m, g: m.group, role: m.group.role === 'platform' ? 'platform' : 'business', area: areaOf.get(m.group.id) || null, served: servedBy.get(m.group.id) || []})).map(e => ({...e, own: e.area ? e.area.members : []}));
  const platform = entries.filter(e => e.role === 'platform').sort((a, b) => b.own.length + b.served.length - (a.own.length + a.served.length) || a.g.id.localeCompare(b.g.id));
  const business = entries.filter(e => e.role === 'business').sort((a, b) => b.own.length - a.own.length || a.g.id.localeCompare(b.g.id));
  // The platform modules that serve most of a sub-module's requirements: the shared services its work is served by.
  const servingOf = leaf => { const n = new Map(); for (const a of leaf.members) for (const m of tree.served.get(a.id) || []) n.set(m, (n.get(m) || 0) + 1); return [...n].filter(([, k]) => k * 2 >= leaf.members.length).map(([m]) => titleOf.get(m)).filter(Boolean); };
  const units = [];
  for (const e of [...platform, ...business]) {
    if (!e.own.length && !e.served.length) continue;
    const leaves = e.area ? e.area.leaves.filter(l => l !== e.area) : [];
    let parts = [{leaves: leaves.length ? leaves : [], members: e.own}];
    if (e.own.length > LIMIT && leaves.length) {
      const pieces = [];
      for (const leaf of leaves) for (let i = 0; i < leaf.members.length; i += LIMIT) pieces.push({leaf, members: leaf.members.slice(i, i + LIMIT)});
      parts = [];
      for (const piece of pieces) { const part = parts.find(x => x.members.length + piece.members.length <= LIMIT); if (part) { if (!part.leaves.includes(piece.leaf)) part.leaves.push(piece.leaf); part.members = [...part.members, ...piece.members]; } else parts.push({leaves: [piece.leaf], members: [...piece.members]}); }
    } else if (e.own.length > LIMIT) {
      parts = [];
      for (let i = 0; i < e.own.length; i += LIMIT) parts.push({leaves: [], members: e.own.slice(i, i + LIMIT)});
    }
    // The sample a platform module that only serves sends: in turn from each module it serves, within the bound.
    let sample = [];
    if (!e.own.length && e.served.length) {
      const queues = new Map();
      for (const rid of e.served) { const h = tree.home.get(rid)?.moduleId || ''; if (!queues.has(h)) queues.set(h, []); queues.get(h).push(rid); }
      const qs = tree.modules.map(m => queues.get(m.group.id)).filter(Boolean).concat(queues.has('') ? [queues.get('')] : []);
      for (let i = 0; sample.length < Math.min(UNIT_LIMITS.served, e.served.length); i++) { const q = qs[i % qs.length]; if (q.length) sample.push(q.shift()); if (qs.every(x => !x.length)) break; }
      sample = sample.map(id => R.byId.get(id)).filter(Boolean);
    }
    const title = str(e.g.title), n = parts.length;
    parts.forEach((part, i) => {
      const counted = new Map(); for (const a of part.members) { const leaf = leafOf.get(a.id); if (leaf && leaf !== e.area) counted.set(leaf, (counted.get(leaf) || 0) + 1); }
      units.push({id: e.g.id, key: n > 1 ? `${e.g.id}.${i + 1}` : e.g.id, title: n > 1 ? clip(`${title}, part ${i + 1} of ${n}`, 160) : title, kind: 'module', stored: true,
        moduleId: e.g.id, moduleTitle: title, role: e.role, concern: str(e.g.concern), part: n > 1 ? {n: i + 1, of: n} : null,
        subs: [...counted].map(([leaf, k]) => ({id: leaf.id || leaf.key, title: leaf.title, requirements: k, ...(e.role === 'business' && servingOf(leaf).length ? {servedBy: servingOf(leaf)} : {})})),
        subIds: uniq([...counted.keys()].map(leaf => leaf.id)),
        members: part.members, served: i === 0 ? sample : [], servedTotal: e.served.length, serves: list(e.g.serves).flatMap(c => list(c.values).length ? c.values : [c.value]).filter(Boolean).slice(0, 12),
        themeOf: id => { const leaf = leafOf.get(id); return leaf && leaf !== e.area ? {id: leaf.id || leaf.key, title: leaf.title} : null; },
        homeOf: id => { const h = tree.home.get(id); return h ? {module: titleOf.get(h.moduleId) || '', sub: h.subId ? str(tree.byId.get(h.subId)?.title) : ''} : null; },
        work: id => R.work.get(id) || ''});
    });
  }
  // Requirements the structure leaves in no module, or in two (Chapter 1 raises them), are still drafted once, last.
  const rest = R.areas.find(u => !u.module && u.members.length);
  if (rest) for (let i = 0, n = Math.ceil(rest.members.length / LIMIT); i < n; i++) units.push({id: null, key: n > 1 ? `rest.${i + 1}` : 'rest', title: n > 1 ? `Requirements in no module, part ${i + 1} of ${n}` : 'Requirements in no module', kind: 'area', stored: false, members: rest.members.slice(i * LIMIT, (i + 1) * LIMIT), themeOf: () => null, work: id => R.work.get(id) || ''});
  return units;
}
export const draftRecord = rec, openFields = openMap, draftRef = ref, cleanDraft = namedOnly;
export {codeRef};
export function supportingChapters(p, comps, {concerns = new Map(), qualities = new Map(), decisions = new Map(), batch = []} = {}) {
  const H = {...heldIndex(p), p}, C = {comps, all: comps}, out = {components: new Map(comps.map(c => [c.key, c])), concerns, qualities, decisions, capabilities: new Map(), environments: new Map(), batch: [...batch]};
  const {six, seven} = chapterSixSeven(null, H, C, out), ten = chapterTen(null, H, C, out);
  return {six, seven, ten};
}
export function sealBundle(p, bundle) { return {...bundle, counts: countsOfBundle(bundle), caps: capsOf(p, bundle), stamp: digest(bundle)}; }
export const draftBasis = (p, briefText, lens) => basisOf(p, readBrief(briefText), lens);
function basisOf(p, B, L) {
  const reqs = list(p.artefacts).filter(a => a?.type === 'requirement');
  return {projectId: str(p?.id), contentVersion: p?.contentVersion || 0, requirements: reqs.length, groups: requirementGroups(p).length, brief: !!B.text, lens: L ? L.id : null, inputs: digest([reqs.map(a => [a.id, a.title, a.description, a.domain, a.capability, a.userGroup, a.priority, a.assessment?.delivery, a.assessment?.outcome]), requirementGroups(p).map(g => [g.id, g.kind, g.title, g.rule, g.memberIds]), B.text, L?.id || null])};
}
function countsOfBundle(b) {
  const byChapter = Object.fromEntries(b.chapters.map(c => [c.chapter, c.records.length])), byKind = {};
  for (const c of b.chapters) for (const r of c.records) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  return {records: b.chapters.reduce((n, c) => n + c.records.length, 0), commands: b.chapters.reduce((n, c) => n + c.commands, 0), byChapter, byKind};
}
// The caps a draft meets (DRF-03): per collection, what the project holds, what the draft adds, the bound and the
// headroom left. A draft never passes a bound and never has a record refused for count.
const CAPS = [
  ['artefacts', 1, 'Chapter 1 records', PROJECT_LIMITS.artefacts, p => list(p.artefacts).length, r => r.commands.filter(c => c.type === 'artefact').length],
  ['relationships', 1, 'Chapter 1 links', PROJECT_LIMITS.relationships, p => list(p.relationships).length, r => r.commands.reduce((n, c) => n + list(c.payload?.links).length, 0)],
  ['drivers', 2, 'Drivers', QUALITY_LIMITS.drivers, p => list(p.quality?.drivers).length, r => r.commands.filter(c => c.type === 'quality.driver').length],
  ['decisions', 3, 'Decisions', DECISION_LIMITS.records, p => list(p.decisions?.records).length, r => r.commands.filter(c => c.type === 'decision.save').length],
  ['alternatives', 3, 'Alternatives of one decision', DECISION_LIMITS.alternatives, () => 0, r => r.commands.filter(c => c.type === 'decision.alternative').length, true],
  ['responsibilities', 4, 'Responsibilities', LOGICAL_LIMITS.responsibilities, p => list(p.logical?.responsibilities).length, r => r.commands.filter(c => c.type === 'logical.responsibility').length],
  ['connections', 4, 'Journey connections', LOGICAL_LIMITS.connections, p => list(p.logical?.connections).length, r => r.commands.filter(c => c.type === 'logical.connection').length],
  ['components', 5, 'Components', REALISATION_LIMITS.components, p => list(p.realisation?.components).length, r => r.commands.filter(c => c.type === 'realisation.component').length],
  ['capabilities', 6, 'Capabilities', TECHNOLOGY_LIMITS.capabilities, p => list(p.technology?.capabilities).length, r => r.commands.filter(c => c.type === 'technology.capability').length],
  ['realisations', 7, 'Implementations', REALIZATION_LIMITS.records, p => list(p.technologyRealisation?.records).length, r => r.commands.filter(c => c.type === 'techrealisation.plan').length],
  ['contracts', 8, 'Contracts', INTERFACE_LIMITS.contracts, p => list(p.interfaces?.contracts).length, r => r.commands.filter(c => c.type === 'interfaces.contract').length],
  ['invariants', 8, 'Data invariants', INTERFACE_LIMITS.contracts, p => list(p.interfaces?.invariants).length, r => r.commands.filter(c => c.type === 'interfaces.invariant').length],
  ['data', 8, 'Data definitions', INTERFACE_LIMITS.data, p => list(p.interfaces?.data).length, r => r.commands.filter(c => c.type === 'interfaces.data').length],
  ['fields', 8, 'Data fields', INTERFACE_LIMITS.fields, p => list(p.interfaces?.data).reduce((n, d) => n + list(d.fields).length, 0), r => r.commands.filter(c => c.type === 'interfaces.field').length],
  ['threats', 9, 'Threats', SECURITY_LIMITS.threats, p => list(p.security?.threats).length, r => r.commands.filter(c => c.type === 'security.threat').length],
  ['controls', 9, 'Controls', SECURITY_LIMITS.controls, p => list(p.security?.controls).length, r => r.commands.filter(c => c.type === 'security.control').length],
  ['environments', 10, 'Environments', RUNTIME_LIMITS.environments, p => list(p.runtime?.environments).length, r => r.commands.filter(c => c.type === 'runtime.environment').length],
  ['placements', 10, 'Placements', RUNTIME_LIMITS.placements, p => list(p.runtime?.placements).length, r => r.commands.filter(c => c.type === 'runtime.placement').length],
  ['plateaus', 'delivery', 'Plateaus', ROADMAP_LIMITS.plateaus, p => list(p.roadmap?.plateaus).length, r => r.commands.filter(c => c.type === 'review.plateau').length],
  ['groups', 1, 'Requirement groups', GROUP_LIMITS.groups, p => requirementGroups(p).length, () => 0]
];
export function capsOf(p, bundle) {
  return CAPS.map(([id, chapter, label, limit, have, adds, per]) => {
    const records = bundle.chapters.flatMap(c => c.records);
    const drafted = per ? Math.max(0, ...records.map(adds)) : records.reduce((n, r) => n + adds(r), 0), held = have(p), after = per ? drafted : held + drafted;
    return {id, chapter, label, limit, have: per ? 0 : held, drafted, after, headroom: limit - after, ...(per ? {per: 'decision'} : {})};
  });
}
// What a person previews before applying (DRF-20): per chapter its count and a sample, the caps with their headroom,
// the trace, the notes and the questions left open; stamped with the bundle and the project revision it applies to.
export function draftPreview(p, bundle, revision) {
  const chapters = bundle.chapters.map(c => ({chapter: c.chapter, title: c.title, records: c.records.length, commands: c.commands, sample: c.records.slice(0, SAMPLE).map(r => ({key: r.key, kind: r.kind, title: r.title, groups: r.groups.slice(0, 4), cites: r.cites.slice(0, 4), ...(r.note ? {note: r.note} : {})}))}));
  const caps = capsOf(p, bundle), over = caps.filter(c => c.headroom < 0);
  return {chapters, counts: bundle.counts, caps, over, trace: bundle.trace, notes: bundle.notes, asks: bundle.asks, doctrine: bundle.doctrine, basis: bundle.basis, ...(bundle.assisted ? {assisted: bundle.assisted} : {}), stamp: digest([bundle.stamp, revision])};
}

// ---------------------------------------------------------------- applying a draft

const HANDLERS = [['quality.', applyQualityCommand], ['decision.', applyDecisionCommand], ['logical.', applyLogicalCommand], ['realisation.', applyRealisationCommand], ['techrealisation.', applyTechnologyRealisationCommand], ['technology.', applyTechnologyCommand], ['interfaces.', applyInterfacesCommand], ['security.', applySecurityCommand], ['runtime.', applyRuntimeCommand], ['review.', applyFinalReviewCommand], ['artefact', applyCommand], ['relationship', applyCommand]];
// The command types a draft may carry: the chapters' creation commands only; review, approval and adoption commands
// keep their own gates (a draft carries no decision.choose, no confirmation and no governance step).
export const DRAFT_COMMANDS = new Set(['artefact', 'quality.driver', 'decision.save', 'decision.alternative', 'logical.group', 'logical.responsibility', 'logical.connection', 'realisation.component', 'technology.boundary', 'technology.needs', 'technology.capability', 'techrealisation.plan', 'techrealisation.option', 'interfaces.party', 'interfaces.data', 'interfaces.field', 'interfaces.contract', 'interfaces.invariant', 'security.threat', 'security.control', 'runtime.environment', 'runtime.zone', 'runtime.placement', 'runtime.plan', 'review.plateau', 'review.plateau-group', 'review.action', 'review.migration', 'review.narrative']);
const handlerOf = type => HANDLERS.find(([k]) => (k.endsWith('.') ? type.startsWith(k) : type === k))?.[1];
// Resolves the references of a command's payload against what earlier records created.
function resolver(doc, ids, self) {
  const plans = () => list(doc.runtime?.plans);
  const one = v => {
    if (v === '@self') return self ?? v;
    if (typeof v === 'string' && v.startsWith('@draft:')) { const id = ids.get(v.slice(7)); if (!id) throw Error(`The draft names ${v.slice(7)}, which was not created.`); return id; }
    if (typeof v === 'string' && v.startsWith('@need:')) { const [k, cat] = v.slice(6).split('|'), app = ids.get(k), n = list(doc.technology?.needs).find(x => x.applicationId === app && x.category === cat); if (!n) throw Error(`No ${cat} need of ${k} was created.`); return n.id; }
    if (typeof v === 'string' && v.startsWith('@plan:')) { const [e, c] = v.slice(6).split('|'), env = ids.get(e), asset = ids.get(c), r = plans().find(x => x.environmentId === env && x.assetId === asset); if (!r) throw Error(`No runtime plan of ${c} in ${e}.`); return r.id; }
    // '@alt:<n>' (round 12, BRAIN): the n-th alternative (from 0) of the decision this record created.
    if (typeof v === 'string' && v.startsWith('@alt:')) { const d = list(doc.decisions?.records).find(x => x.id === self), a = list(d?.alternatives)[Number(v.slice(5))]; if (!a) throw Error(`The draft names alternative ${v.slice(5)} of a decision that does not hold it.`); return a.id; }
    if (typeof v === 'string' && v.includes('{{')) return v.replace(/\{\{(code|ref):([^}]+)\}\}/g, (m, kind, k) => { const id = ids.get(k); if (!id) return kind === 'code' ? 'a driver not drafted' : k; if (kind === 'ref') return id; const d = list(doc.quality?.drivers).find(x => x.id === id); return d ? driverCode(doc, d) : id; });
    if (Array.isArray(v)) return v.map(one);
    // A key of an object may name a drafted record too (an assessment keyed by its driver).
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k.startsWith('@draft:') ? ids.get(k.slice(7)) || k : k, one(x)]));
    return v;
  };
  return one;
}
// Marks a created record as Sol's proposal: state proposed (counted in no chapter check until a person keeps it),
// origin sol-draft, and provenance.draft {by, job, key, bundle, reviewed: false, appliedBy, appliedAt, groups, cites}:
// the person who applied the bundle applied it; Sol drafted it; nobody has reviewed it.
export function markDrafted(r, mark) {
  if (!r || typeof r !== 'object') return;
  if (r.state !== 'retired') r.state = 'proposed';
  r.origin = DRAFT_ORIGIN;
  r.provenance = {...(r.provenance && typeof r.provenance === 'object' && !Array.isArray(r.provenance) ? r.provenance : {}), draft: {...mark}};
}
export {solDraftOf};
// The records a command created that the mark reaches: the record it selected, a decision's or an option's record,
// a need's own records, a party a contract made, the plans an environment made, the action of the delivery plan.
function created(doc, type, selected, before) {
  if (type === 'logical.connection') return list(doc.logical?.connections).filter(x => !before.connections.has(x.id));
  if (type === 'logical.group') return list(doc.logical?.groups).filter(x => x.id === selected && !before.groups.has(x.id));
  if (type === 'technology.needs') { const had = before.needs; return list(doc.technology?.needs).filter(n => n.applicationId === selected && !had.has(n.id)); }
  if (type === 'runtime.environment') return [...locate(doc, selected).map(x => x.record), ...list(doc.runtime?.plans).filter(r => r.environmentId === selected && !before.plans.has(r.id)), ...list(doc.runtime?.paths).filter(r => r.environmentId === selected && !before.paths.has(r.id))];
  if (type === 'review.plateau') return list(doc.roadmap?.plateaus).filter(x => x.id === selected);
  if (type === 'review.migration') return list(doc.roadmap?.migrations).filter(x => x.id === selected);
  if (type === 'review.action') return list(doc.finalReview?.actions).filter(x => x.id === selected);
  if (type === 'review.narrative') return doc.finalReview?.narrative ? [doc.finalReview.narrative] : [];
  if (type === 'runtime.placement') return list(doc.runtime?.placements).filter(x => !before.placements.has(x.id));
  if (type === 'review.plateau-group') return [];
  return selected ? locate(doc, selected).map(x => x.record) : [];
}
const snapshotIds = doc => ({groups: new Set(list(doc.logical?.groups).map(r => r.id)), connections: new Set(list(doc.logical?.connections).map(r => r.id)), needs: new Set(list(doc.technology?.needs).map(n => n.id)), plans: new Set(list(doc.runtime?.plans).map(r => r.id)), paths: new Set(list(doc.runtime?.paths).map(r => r.id)), placements: new Set(list(doc.runtime?.placements).map(r => r.id))});

// Applies a draft bundle as one reviewed step (DRF-20, DRF-12): the chapters in order, at most DRAFT_BATCH commands a
// batch, each through its chapter's own handler on one working copy handed over from command to command; every
// created record marked as Sol's proposal; one journal event per chapter, naming who applied it, that Sol drafted it
// and that nobody has reviewed it. applySteps yields {chapter, done, total} after each batch (a job reports it and may
// stop between batches) and returns {document, created: {key: id}, counts, events}; applyDraftBundle runs it through.
// A command a chapter refuses stops the apply: nothing of it is kept. The input document is never changed.
// reason: why the batch was applied (round 12, GR-GOV-08: every journal event says who, of what kind and why); by
// default, that it is Sol's draft of the bundle, applied as proposals for a person to review.
export function* applySteps(project, bundle, {at = new Date().toISOString(), actor = null, jobId = '', reason = ''} = {}) {
  const why = String(reason || '').trim().slice(0, 600) || `Sol's architecture draft (bundle ${String(bundle?.stamp || '').slice(0, 12)}), applied as proposals for a person to review.`;
  if (!bundle || bundle.schema !== DRAFT_SCHEMA || !Array.isArray(bundle.chapters)) throw Error('This is not an architecture draft AIW can apply.');
  const over = capsOf(project, bundle).filter(c => c.headroom < 0);
  if (over.length) throw Error(`The draft would pass ${over.map(c => `${c.label.toLowerCase()} (${c.after.toLocaleString('en-GB')} of ${c.limit.toLocaleString('en-GB')})`).join(', ')}. Nothing was applied.`);
  let doc = documentClone(withFinalReview(project));
  // A draft adds no requirement and no requirement group, so the group index its records read is the same for the
  // whole apply: worked out once and pinned to the working copy (document-memo.js pinValue), not once per command.
  const pin = d => pinValue(d, 'requirement-groups', 'index', groupIndex(d));
  pin(doc);
  // A draft may name what an earlier draft left (its live records, by draft key): the apply starts from those.
  const ids = heldDraftIds(project), held = new Set(ids.keys()), events = [], counts = {};
  // The engine that drafted the record (round 12 C2; sdd-content.js draftEngine): the rules, or Sol's model-assisted
  // wording of them; the SDD prints a skeleton banner above a section that is mostly rules.
  // The engine that drafted a record (round 12, BRAIN): the model, through the architecture contract (its provider,
  // model, run and packet stamp travel with it), or the rules; a record that says nothing was drafted by the rules.
  const engineOf = r => (r.sol?.engine === 'model' ? {engine: 'model', provider: str(r.sol.provider), model: str(r.sol.model), runId: str(r.sol.runId), packetStamp: str(r.sol.packetStamp), theme: str(r.sol.theme)} : {engine: 'rules'});
  const mark = (r, key, groups, cites, wording, sol) => markDrafted(r, {by: 'sol', kind: DRAFT_ORIGIN, ...(sol?.engine === 'model' ? sol : {engine: wording ? 'model-assisted' : 'rules'}), job: jobId, key, bundle: bundle.stamp, reviewed: false, appliedBy: actor || null, appliedAt: at, groups: groups.slice(0, 50), cites: cites.slice(0, CITES), ...(wording ? {wording: wording.slice(0, 20)} : {})});
  try {
    for (const chapter of bundle.chapters) {
      const total = chapter.records.reduce((n, r) => n + r.commands.length, 0);
      let done = 0, inBatch = 0, made = 0;
      const requirementIds = [];
      for (const r of chapter.records) {
        let self = null;
        for (const [i, c] of r.commands.entries()) {
          if (!DRAFT_COMMANDS.has(c.type) || (c.type === 'artefact' && (c.payload?.type === 'requirement' || c.payload?.id))) throw Error(`A draft does not carry ${c.type === 'artefact' ? 'a requirement, or a change to a record a person made' : c.type}.`);
          const handler = handlerOf(c.type), payload = resolver(doc, ids, self)(c.payload || {}), before = snapshotIds(doc);
          let result;
          try { result = handler(handOver(doc), {type: c.type, payload}, at, actor || ''); }
          catch (e) { throw Error(`Chapter ${chapter.chapter === 'delivery' ? '11 (delivery plan)' : chapter.chapter}, ${r.title}: ${e?.message || e}`); }
          doc = result.document;
          const sel = c.type === 'technology.needs' ? payload.applicationId : c.type === 'logical.connection' ? list(doc.logical?.connections).find(x => !before.connections.has(x.id))?.id || null : c.type === 'logical.group' ? list(doc.logical?.groups).find(x => !before.groups.has(x.id))?.id || null : result.selected ?? null;
          if (i === 0) { self = sel; if (sel && !ids.has(r.key)) ids.set(r.key, sel); }
          for (const x of created(doc, c.type, sel, before)) { mark(x, r.key, r.groups, r.cites, i === 0 && Array.isArray(r.wording) ? r.wording : null, engineOf(r)); made++; }
          if (c.type === 'artefact') for (const l of list(payload.links)) if (l[1] === 'requires') requirementIds.push(l[2]);
          done++; inBatch++;
          if (inBatch >= DRAFT_BATCH) { inBatch = 0; yield {chapter: chapter.chapter, done, total}; }
        }
      }
      if (inBatch) yield {chapter: chapter.chapter, done, total};
      doc = withFinalReview(handOver(doc));
      pin(doc);
      counts[chapter.chapter] = {records: chapter.records.length, commands: total, marked: made};
      if (!chapter.records.length) continue;
      // One journal event per chapter: who applied it, that Sol drafted it, that nobody has reviewed it.
      withChanges(doc);
      const event = {id: 'CHG-' + String(++doc.changes.counter).padStart(3, '0'), source: {chapter: Number(chapter.chapter) || 11, id: 'draft-apply:' + chapter.chapter, ref: 'Chapter ' + (chapter.chapter === 'delivery' ? '11 · delivery plan' : chapter.chapter), kind: 'draft-apply', title: `Sol's draft of ${chapter.title}`}, title: `Applied Sol's draft of ${chapter.title}: ${plural(chapter.records.length, 'proposal')}, not reviewed by a person`, at, before: {state: 'Not drafted'}, after: {state: 'Proposed by Sol, not reviewed', count: chapter.records.length}, fields: [{key: 'draft-apply', label: 'Sol draft', before: 'none', after: plural(chapter.records.length, 'proposal')}], items: [], requirementIds: uniq(requirementIds).slice(0, 5000), actor: actor || null, appliedBy: actor || null, authorKind: DRAFT_ORIGIN, reviewed: false, reason: why, jobId, bundle: bundle.stamp};
      doc.changes.events.push(event);
      events.push(event.id);
    }
  } finally { unpinValues(doc); }
  return {document: doc, created: Object.fromEntries([...ids].filter(([k]) => !held.has(k))), counts, events};
}
export const applyDraftBundle = (project, bundle, options = {}) => runSteps(applySteps(project, bundle, options), options.onBatch ? x => options.onBatch(x.chapter, x.done, x.total) : null);

// ---------------------------------------------------------------- Sol's wording, one requirement group at a time

// The model-assisted path of the architecture draft (DRF-18) works per requirement group: one packet per group of a
// chapter, holding the group's own requirements (at most GROUP_SOL_LIMITS.requirements, by title, statement and
// acceptance; those the records cite first) and the chapter's drafted records that answer the group (at most
// GROUP_SOL_LIMITS.records), each with its wording fields only — a title, a question, a description, a purpose, a
// boundary, a context, a scenario, a consequence, a summary — and their current value. It is the journey contract's
// packet (intelligence-provider.js journeyDraftSchema, validateJourneyDraft, guardJourneyDraft): Sol may reword a
// value, citing the requirements it rests on; a link, a kind, a count, a priority, an alternative or an open field is
// never offered. A chapter of n groups is n bounded requests, whatever the size of the project. The disclosure policy
// and redaction are the journey's. Nothing here is sent or applied.
export const GROUP_SOL_LIMITS = Object.freeze({requirements: 40, records: 12, value: 1200});
const WORDING = [['title', 'Title'], ['question', 'Question'], ['description', 'Description'], ['purpose', 'Purpose'], ['boundary', 'Boundary'], ['context', 'Context'], ['scenario', 'Scenario'], ['consequence', 'Consequence'], ['summary', 'Summary']];
export function groupDraftPackets(p, bundle, chapter, {instructions = null} = {}) {
  const ch = list(bundle?.chapters).find(c => String(c.chapter) === String(chapter));
  if (!ch) throw Error('Draft the architecture with this chapter before asking Sol to word it.');
  const policy = p?.workspace?.aiPolicy || {}, excluded = new Set(list(policy.excludedObjectIds)), redact = t => redactSecrets(policy.redactContacts ? maskContactText(t) : String(t));
  const byId = new Map(list(p.artefacts).filter(a => a?.type === 'requirement').map(a => [a.id, a])), index = groupIndex(p), byGroup = new Map();
  // Each record goes to the packet of its first group; a record of no group keeps the deterministic wording.
  for (const r of ch.records) { const g = r.groups[0]; if (!g) continue; if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(r); }
  const out = [];
  for (const [groupId, sourceRecords] of byGroup) {
    if (excluded.has(groupId)) continue;
    const g = groupById(p, groupId), members = list(index.members.get(groupId)).filter(id => byId.has(id) && !excluded.has(id));
    if (!members.length) continue;
    // A drafted title or wording field can repeat its cited requirement. Never send that record when its basis is excluded.
    const recs = sourceRecords.filter(r => !list(r.cites).some(id => excluded.has(id)) && !list(r.groups).some(id => excluded.has(id)));
    if (!recs.length) continue;
    const records = recs.slice(0, GROUP_SOL_LIMITS.records).map(r => { const x = r.commands[0].payload || {}; return {key: r.key, title: redact(r.title).slice(0, 200), fields: WORDING.filter(([k]) => typeof x[k] === 'string' && x[k].trim()).map(([key, label]) => ({key, label, current: redact(x[key]).slice(0, GROUP_SOL_LIMITS.value), basis: 'inferred'}))}; }).filter(r => r.fields.length);
    if (!records.length) continue;
    const own = new Set(members), refs = uniq([...recs.flatMap(r => r.cites).filter(id => own.has(id)), ...members]).slice(0, GROUP_SOL_LIMITS.requirements);
    const upstream = refs.map(id => byId.get(id)).map(a => ({ref: a.id, title: redact(a.title).slice(0, 200), fields: Object.fromEntries([['description', a.description], ['acceptance', a.acceptance]].filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, redact(v).slice(0, 300)]))}));
    const request = {chapter: Number(ch.chapter) || 11, group: groupId};
    const packet = {version: 1, task: 'journey-draft', request, chapter: {id: request.chapter, title: ch.title}, group: {id: groupId, title: redact(g?.title || groupId).slice(0, 160), kind: g?.kind || '', members: members.length}, records, passages: [], upstream,
      omissions: {records: recs.length - records.length, upstream: members.length - upstream.length, withheld: sourceRecords.length - recs.length},
      brainReceipt: {engine: DRAFT_ENGINE, policy: 'evidence-before-proposal-1', reasoning: 'aiw-architecture-wording-1', instructions, claimIds: [], scoring: false},
      disclosure: {version: 2, redactContacts: !!policy.redactContacts, redactSecrets: true, excludedObjectCount: excluded.size}};
    out.push({groupId, packet: {...packet, stamp: digest(packet)}});
  }
  return out;
}
// A new draft with the wording Sol's accepted answers give (results: [{groupId, runId, answers: [{record, field, value,
// sourceRefs}]}]): each answered field of the chapter's records takes the value, the record lists what was reworded
// (wording: [{field, by: 'sol', kind: 'model-assisted', runId, sourceRefs}]) and markDrafted keeps it in
// provenance.draft. Only a field the record holds is reworded; everything else, and every other chapter, is the source
// draft's. The new draft has its own stamp and is previewed and applied like any other.
export function withWording(p, bundle, chapter, results) {
  const answers = new Map();
  for (const r of list(results)) for (const a of list(r.answers)) answers.set(a.record + '\u0000' + a.field, {...a, runId: r.runId});
  let reworded = 0;
  const chapters = bundle.chapters.map(c => String(c.chapter) !== String(chapter) ? c : {...c, records: c.records.map(rec => {
    const payload = rec.commands[0].payload || {}, mine = WORDING.map(([f]) => answers.get(rec.key + '\u0000' + f)).filter(a => a && typeof payload[a.field] === 'string' && payload[a.field].trim() && str(a.value));
    if (!mine.length) return rec;
    reworded += mine.length;
    const next = {...payload}; for (const a of mine) next[a.field] = a.value;
    const title = mine.find(a => a.field === 'title' || a.field === 'question');
    return {...rec, ...(title ? {title: clip(title.value, 160)} : {}), commands: [{...rec.commands[0], payload: next}, ...rec.commands.slice(1)], wording: mine.map(a => ({field: a.field, by: 'sol', kind: 'model-assisted', runId: a.runId, sourceRefs: list(a.sourceRefs).slice(0, 12)}))};
  })});
  const {counts: _c, caps: _k, stamp: _s, ...base} = bundle;
  const note = `${plural(reworded, 'value')} of ${String(chapter) === 'delivery' ? 'the delivery plan' : 'Chapter ' + chapter} reworded by Sol with the model, each marked on its record; nothing else changed.`;
  const next = {...base, chapters, notes: [...list(base.notes), note], assisted: {from: bundle.stamp, chapter: String(chapter), reworded, groups: list(results).map(r => ({groupId: r.groupId, runId: r.runId || null, status: r.status, answers: list(r.answers).length}))}};
  return {...next, counts: countsOfBundle(next), caps: capsOf(p, next), stamp: digest(next)};
}
