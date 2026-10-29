// Necessary-condition evaluation only. It can detect these observed regressions;
// an empty result is not a semantic correctness certificate.
const ORDERING_RELAXATIONS = [
  ['Reopens fixed ordering as negotiable', /prioriti[sz]e strict global order versus|is preserving per.key order mandatory or negotiable|applying if eventual consistency suffices/i],
  ['Denies the incompatible alternative violates the constraint', /\b(?:no|neither)\s+(?:supplied\s+)?(?:alternative|option)(?:\s+(?:currently|directly|actually|necessarily|explicitly|inherently))*\s+violates?\b/i],
  ['Presents both alternatives as valid despite the fixed constraint', /\b(?:both|all)\s+(?:approaches|alternatives|options)\s+(?:have|are|offer|present|represent)\s+(?:equally\s+)?(?:valid|viable|acceptable)\b/i],
  ['Asks whether eventual consistency can replace the fixed ordering constraint', /\b(?:is|are|can|could|would|should|does|do|what|whether)\b[^.!?]{0,180}\beventual consistency\b[^.!?]{0,180}\?/i],
  ['Offers eventual consistency as a condition for using the incompatible alternative', /\b(?:if|when|provided|assuming)\b[^.!?]{0,80}\beventual consistency\b[^.!?]{0,80}\b(?:suffices|acceptable|accepted|permitted|allowed|tolerated)\b/i],
  ['Trades away fixed ordering for concurrency', /\btrade[- ]?off\s+between\s+(?:scaling\s+)?concurrency\b[^.!?]{0,100}\b(?:and|versus)\s+(?:strict\s+|global\s+|per.key\s+)?order(?:ing)?\b/i]
];
export function fixedOrderingIssues(result) {
  const prose = [result?.summary, ...(result?.assessments || []).flatMap(a => [a.headline, a.reasoning, ...(a.risks || []), ...(a.questions || []), ...(a.refinements || []).flatMap(r => [r.value, r.why]), ...(a.alternativeChecks || []).flatMap(c => [c.constraint, c.reason])])].filter(x => typeof x === 'string');
  const issues = [];
  for (const [criterion, pattern] of ORDERING_RELAXATIONS) {
    const passage = prose.find(text => pattern.test(text));
    if (passage) issues.push({criterion, excerpt: passage.match(pattern)[0]});
  }
  return issues;
}
