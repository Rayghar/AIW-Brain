// One applicability reading for product mechanisms, reused by the comparison,
// source explanations and suggestion adoption. A mechanism outside its scope
// does not by itself rule out the product: another design may satisfy the driver.
import {traitsFor} from './product-knowledge.js';
import {evaluateApplicability, optionFacts} from './architecture-facts.js';
import {traitReceipt} from './model-knowledge.js';

const list = x => Array.isArray(x) ? x : [];
const qualityKey = value => String(value || '').trim().toLowerCase().replace(/^transaction integrity$/, 'integrity').replace(/\s+/g, '-');

export function productMechanisms(option = {}, context = {}) {
  const facts = optionFacts(option, context);
  const traits = context.products === false ? [] : traitsFor(option.product);
  const mechanisms = traits.map(trait => {
    const declared = trait.applicability;
    const rule = declared || {requires: [{id: trait.id + ':conditions', fact: 'mechanism.' + trait.id + '.reviewed', op: 'eq', value: true,
      label: 'Mechanism configuration', question: 'Review and record the configuration required by ' + trait.id + ' before treating it as support.'}]};
    const applicability = evaluateApplicability({...rule, id: trait.id,
      requires: [{id: trait.id + ':version', fact: 'version', op: 'present', label: 'Product version', question: 'Record and check the product version against the cited documentation.'}, ...list(rule.requires)],
      obligations: trait.obligations || rule.obligations, placement: trait.placement || rule.placement}, facts);
    return {...trait, sourceKind: 'product-documentation', receipt:traitReceipt(trait), applicability};
  });
  for (const claim of list(context.claims)) {
    const unit = claim.unit || claim.claim?.architectureUnit, receipt = claim.receipt;
    if (!unit || unit.kind!=='product-mechanism') continue;
    const supported = !!unit.applicability && claim.applicability?.state === 'context-match';
    const applicability = supported ? claim.applicability : {...claim.applicability, state: claim.applicability?.state === 'excluded' ? 'excluded' : 'needs-context',
      reasons: [...list(claim.applicability?.reasons), ...(!unit.applicability ? ['The written claim conditions need a typed applicability interpretation before suggesting an effect.'] : [])]};
    for (const [i, effect] of list(unit.effects).entries()) mechanisms.push({id: 'claim:' + (receipt?.releaseId || '') + ':' + (receipt?.claimId || '') + ':' + i,
      attrs: [qualityKey(effect.quality)], effect: effect.direction === 'tradeoff' ? 'tension' : effect.direction || 'unknown', text: effect.rationale || unit.mechanism,
      src: receipt?.path || receipt?.sourceId || 'Reviewed architecture claim', receipt, sourceKind: 'reviewed-claim', applicability,
      obligations: unit.obligations || [], placement: unit.placement || []});
  }
  return mechanisms;
}

export const applicableProductMechanisms = (option, context = {}) => productMechanisms(option, context).filter(m => m.applicability.state === 'context-match');
