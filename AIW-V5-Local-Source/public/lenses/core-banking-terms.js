// The core-banking lens's vocabulary for retrieval (round 12, workstream K; GR-DOM-01). Part of the lens: lenses/
// core-banking.js carries it as CORE_BANKING.vocabulary, and the Brain's retrieval (architecture-brain.js) reads it
// from here, so the Projects page does not load the whole lens to ask a question.
//
// For each of the lens's concerns, two lists:
//   - the terms that name the concern in a question: synonyms, phrases and acronyms, in lower case, words separated by
//     spaces (a hyphen in a question reads as a space, so "multi-currency" is written "multi currency");
//   - `asks`: the words AIW's own method packs use for the qualities the concern raises (a question about posting asks
//     about consistency), so that the passages on those qualities are found.
// A question that names a term is read as naming the concern: the term's words stop matching on their own (the
// "exchange" of "currency exchange" is not a token exchange) and the concern's asks are asked with it.
//
// These are AIW's words. They decide what retrieval shows, never what is true: no score, constraint, conformance
// result or drafted value reads them. No person has reviewed them yet (audit/round12/DOMAIN-KNOWLEDGE-REVIEW-PACK.md lists
// them for review), and the lens applies them only to a project that uses the lens.
const T = (terms, asks = '') => ({terms: terms.split('|'), asks: asks ? asks.split(' ') : []});
export const CORE_BANKING_TERMS = {
  posting: T('general ledger|ledger|ledgers|sub ledger|subledger|gl|posting|postings|journal entry|journal entries|double entry|debit and credit|debits and credits|debit entries|credit entries|trial balance|chart of accounts|suspense account|suspense accounts', 'consistency'),
  eod: T('end of day|eod|close of business|cob|day end|end of month|month end|end of year|year end|business date|date roll|date rollover|batch window|nightly batch|overnight batch', 'batch nightly'),
  interest: T('interest accrual|interest accruals|accrual|accruals|day count|day count basis|capitalisation|capitalization|interest calculation|charges and fees|fees and charges|tariff|tariffs', 'batch'),
  fx: T('currency exchange|foreign exchange|fx|forex|exchange rate|exchange rates|fx rate|fx rates|multi currency|multicurrency|currency|currencies|cross currency|revaluation|iso 4217|base currency|local currency', 'consistency stale'),
  kyc: T('kyc|know your customer|customer due diligence|cdd|enhanced due diligence|edd|customer onboarding|account opening|identity verification', ''),
  aml: T('aml|anti money laundering|money laundering|sanctions|sanctions screening|watch list|watchlist|pep|peps|politically exposed|transaction monitoring|suspicious activity|suspicious transaction|cft', ''),
  reporting: T('regulatory reporting|regulatory returns|regulatory return|statutory reporting|statutory returns|prudential returns|supervisory reporting|xbrl|central bank returns', 'batch'),
  'maker-checker': T('maker checker|four eyes|4 eyes|dual control|dual authorisation|dual authorization|segregation of duties|separation of duties|sod|authoriser|authorizer|inputter|second approver', ''),
  audit: T('audit trail|audit trails|audit log|audit logs|audit history|tamper evident|before and after values|change history', ''),
  'product-config': T('product factory|product configuration|product parameters|parameterisation|parameterization|product definition|product definitions|product catalogue|product catalog|rate table|rate tables|tariff table|tariff tables', ''),
  'value-dating': T('value date|value dates|value dating|value dated|backdating|back dating|backdated|booking date|forward dating|forward dated', ''),
  payments: T('payment|payments|funds transfer|funds transfers|remittance|remittances|clearing|settlement|settlements|rtgs|ach|swift|iso 20022|iso 8583|instant payment|instant payments|payment switch|standing order|standing orders|direct debit|direct debits', 'asynchronous'),
  channels: T('mobile banking|internet banking|online banking|ussd|atm|atms|pos|teller|tellers|agent banking|open banking|delivery channel|delivery channels', 'api'),
  availability: T('availability|high availability|uptime|rto|rpo|recovery time objective|recovery point objective|disaster recovery|dr site|failover|fail over|standby site|business continuity', 'availability'),
  privacy: T('data residency|residency|data sovereignty|sovereignty|in country|data localisation|data localization|cross border|personal data|pii|gdpr|data protection|data privacy', 'location provider'),
  migration: T('data migration|migration|legacy system|legacy platform|legacy core|coexistence|parallel run|parallel runs|cut over|cutover|go live|strangler|decommissioning', ''),
  operations: T('reconciliation|reconciliations|nostro|vostro|exception queue|exception queues|runbook|runbooks|on call|service desk', 'batch')
};
