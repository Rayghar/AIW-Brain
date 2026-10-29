// A shared, three-valued check for declared architecture facts. Missing facts are
// questions, never false facts. No expression evaluation, prose inference or
// quality-achievement claim occurs here; specialised methods retain their models.
import {list} from './util.js';
export const APPLICABILITY_OPERATORS = Object.freeze(['eq', 'neq', 'oneOf', 'includes', 'gte', 'lte', 'gt', 'lt', 'present']);
export const safeFactKey = key => typeof key === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,95}$/.test(key) && !key.split('.').some(x => ['__proto__', 'constructor', 'prototype'].includes(x));
const scalar = v => typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v);
export const unknownValue = v => v == null || v === '' || typeof v === 'string' && ['unknown', 'not-stated', 'not stated', 'unspecified'].includes(v.trim().toLowerCase());
const display = v => Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? v ? 'yes' : 'no' : String(v);

export function readArchitectureFact(facts, key) {
  if (!safeFactKey(key) || !facts || !Object.hasOwn(facts, key)) return {value: null, status: 'unknown'};
  const raw = facts[key], fact = raw && typeof raw === 'object' && !Array.isArray(raw) && Object.hasOwn(raw, 'value') ? raw : {value: raw, status: 'declared'};
  if (fact.status && !['declared','measured'].includes(fact.status) || unknownValue(fact.value) || !scalar(fact.value) && !(Array.isArray(fact.value) && fact.value.every(scalar))) return {...fact, status: 'unknown'};
  return {...fact, status: fact.status === 'measured' ? 'measured' : 'declared'};
}

function predicateResult(predicate, fact) {
  if (fact.status === 'unknown' || !APPLICABILITY_OPERATORS.includes(predicate?.op)) return null;
  const a = fact.value, b = predicate.value;
  if (predicate.op === 'present') return true;
  if (predicate.op === 'eq') return scalar(a) && scalar(b) && typeof a === typeof b ? a === b : null;
  if (predicate.op === 'neq') return scalar(a) && scalar(b) && typeof a === typeof b ? a !== b : null;
  if (predicate.op === 'oneOf') return scalar(a) && Array.isArray(b) && b.every(scalar) && b.some(v=>typeof v===typeof a) ? b.includes(a) : null;
  if (predicate.op === 'includes') return Array.isArray(a) && scalar(b) ? a.includes(b) : null;
  if (typeof a !== 'number' || !Number.isFinite(a) || typeof b !== 'number' || !Number.isFinite(b)) return null;
  return predicate.op === 'gte' ? a >= b : predicate.op === 'lte' ? a <= b : predicate.op === 'gt' ? a > b : a < b;
}

export function evaluateApplicability(rule = {}, facts = {}) {
  const checks = [];
  for (const [kind, predicates] of [['requires', list(rule.requires)], ['excludes', list(rule.excludes)]]) for (const [i, p] of predicates.entries()) {
    const fact = readArchitectureFact(facts, p?.fact), result = predicateResult(p, fact), blocked = result !== null && (kind === 'requires' ? !result : result);
    const state = result === null ? 'unknown' : blocked ? 'blocked' : 'known', label = p?.label || p?.fact || 'Architecture condition';
    const detail = state === 'unknown' ? p?.question || 'Record ' + label.toLowerCase() + ' before applying this mechanism.'
      : state === 'blocked' ? label + ' conflicts with the recorded value (' + display(fact.value) + ').'
      : label + ' is consistent with the recorded value (' + display(fact.value) + '); outcome verification remains separate.';
    checks.push({id: p?.id || (rule.id || 'condition') + ':' + kind + ':' + i, fact: p?.fact || '', title: label, state, detail,
      value: fact.status === 'unknown' ? null : fact.value, expected: p?.value ?? null, evidenceStatus: fact.status, ...(fact.source ? {source: fact.source} : {}), sourceIds: list(p?.sourceIds)});
  }
  const blockers = checks.filter(c => c.state === 'blocked'), unknown = checks.filter(c => c.state === 'unknown');
  return {state: blockers.length ? 'excluded' : unknown.length ? 'needs-context' : 'context-match', checks, blockers, unknown, ready: !blockers.length && !unknown.length,
    reasons: [...blockers, ...unknown].map(c => c.detail), obligations: list(rule.obligations), placement: rule.placement || []};
}

// Existing option specification fields keep their identity. Additional typed
// facts live on that same option; they never overwrite a standard field.
export function optionFacts(option = {}, context = {}) {
  const out = Object.create(null), standard = {product: option.product, version: option.version, topology: option.topology,
    tier: option.serviceTier || option.tier, operatingModel: option.operatingModel,
    replicaCount: option.replicaCount === '' || option.replicaCount == null ? null : Number(option.replicaCount),
    failureDomains: option.failureDomains, workloadProfile: option.workloadProfile};
  for (const [key, value] of Object.entries(standard)) out[key] = {value, status: unknownValue(value) ? 'unknown' : 'declared', source: {kind: 'option', id: option.id || '', field: key === 'tier' ? 'serviceTier' : key}};
  for (const [key, value] of Object.entries(option.configurationFacts || {})) if (safeFactKey(key) && !Object.hasOwn(standard, key)) out[key] = {value, status: 'declared', source: {kind: 'option', id: option.id || '', field: 'configurationFacts.' + key}};
  for (const [key, value] of Object.entries(context.facts || {})) if (safeFactKey(key) && !Object.hasOwn(out, key)) out[key] = value;
  // Numeric documentation families are derived only from an explicit dotted
  // version, never from a product name or a user-supplied configuration fact.
  const version=String(option.version||'').trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  for(const [key,index] of [['version.major',1],['version.minor',2]])out[key]={value:version?.[index]===undefined?null:Number(version[index]),status:version?.[index]===undefined?'unknown':'declared',source:{kind:'option',id:option.id||'',field:'version'}};
  return out;
}

const scopeKey = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
const versionKey = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
// The caller supplies canonical product identities when aliases are available;
// otherwise comparison remains exact after harmless formatting normalisation.
export function evaluateArchitectureScope(unit = {}, choice = {}, {productIdentity = scopeKey} = {}) {
  const scope = unit.scope || {}, facts = optionFacts(choice, choice), requires = [];
  const predicate = (fact, value, label, op = 'eq') => requires.push({id: 'scope:' + fact, fact, op, value, label, question: 'Record the ' + label.toLowerCase() + ' before applying this claim.'});
  if (scope.product) { facts.product = choice.product ? productIdentity(choice.product) : null; predicate('product', productIdentity(scope.product), 'Product'); }
  const caps = [choice.capability, ...list(choice.capabilities)].filter(Boolean).flatMap(c => typeof c === 'string' ? [c] : [c.id, c.title, c.category]).filter(Boolean).map(scopeKey);
  if (scope.capability) { facts.capabilities = caps.length ? caps : null; predicate('capabilities', scopeKey(scope.capability), 'Capability', 'includes'); }
  for (const [field, label] of [['version', 'Version'], ['topology', 'Topology'], ['tier', 'Service tier'], ['operatingModel', 'Operating model']]) {
    if (!scope[field]) continue;
    const normalize = field === 'version' ? versionKey : scopeKey, value = field === 'tier' ? choice.tier || choice.serviceTier : choice[field];
    facts['scope.' + field] = unknownValue(value) ? null : normalize(value);
    predicate('scope.' + field, normalize(scope[field]), label);
  }
  const rule = unit.applicability || {};
  return evaluateApplicability({...rule, requires: [...requires, ...list(rule.requires)], obligations: unit.obligations || rule.obligations, placement: unit.placement || rule.placement}, facts);
}

