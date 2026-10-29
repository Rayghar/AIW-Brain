// The interaction method's two options (rc39): the knowledge the method reads, in a module of its own like the read
// and persistence methods' options, so that a projection can name an option (design-questions.js optionTitle) without
// loading the method's evaluation. architecture-knowledge.js composes them with their applicability conditions.
export const INTERACTION_OPTIONS = [
  {id:'request-reply', title:'Complete in the request', pattern:'Request / reply', style:'Request-driven collaboration', tactic:'Bound waiting and resolve uncertain outcomes', benefit:'A caller can receive the final result in one interaction.', cost:'Caller and processor share a time budget and availability dependency.', counterfactual:'Reconsider if processing cannot fit the response budget or callers need intake during processor outages.'},
  {id:'durable-queue', title:'Accept now, complete later', pattern:'Queue-based load leveling', style:'Asynchronous collaboration', tactic:'Buffer work and bound consumer demand', benefit:'Intake and processing can run at different rates.', cost:'Adds delayed completion, a broker, backlog management and delivery recovery.', counterfactual:'Reconsider if a final result is mandatory before the response, or the workload does not justify another operating dependency.'}
];
