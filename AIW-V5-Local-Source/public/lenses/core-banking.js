// The core-banking lens (round 12, workstream C; audit/round12/DESIGN.md, D-14).
//
// A rule set, not knowledge. It lists the seventeen concerns a core-banking platform must address and, for each one,
// the words that show a record speaks of it and the facets a design must cover. It cites no source and states no
// value: it never says what a cut-off, a day-count basis or a recovery target should be, only whether the design
// says. The domain-lens framework (public/domain-lens.js) reads it; the coverage rule is the framework's and is the
// same for every concern:
//   - a record speaks of a concern when its words match the concern's cues (`cues`);
//   - a facet is met by a design record (Chapters 3 to 11) that speaks of the concern and matches the facet's words
//     (`words`, or every pattern of `all`), or that passes the facet's field rule (`check`). A facet marked `alone`
//     needs no concern cue in the same record (its own words are specific enough); one marked `from: 'any'` may also
//     be met by a stated record (a Chapter 1 requirement or constraint, a Chapter 2 driver); `kinds` limits a facet to
//     some record kinds;
//   - addressed: every required facet is met and at least one design record speaks of the concern; partly: some
//     design record speaks of it or meets a facet, but a required facet is not met; not addressed: no design record
//     does; not applicable: the person said so, with a reason, through the governed command lens.concern.
// The questions are asked for the facets not met: the required ones first, then the optional ones.
// The text a pattern is matched against is the record's own words in lower case (domain-lens.js lensRecords), so
// every pattern here is written in lower case. Every word here is AIW's own; nothing is quoted from a client document.
import {list, str} from '../util.js';
import {CORE_BANKING_TERMS} from './core-banking-terms.js';

// The words of a field's name ("debitAccount" reads "debit account").
const nameWords = f => str(f?.name).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_+/g, ' ').toLowerCase();
// A data definition holds a debit field and a credit field (its entries have two sides).
const debitCredit = (raw, r) => r.kind === 'data' && list(raw.fields).some(f => /\b(?:debit|dr)\b/.test(nameWords(f))) && list(raw.fields).some(f => /\b(?:credit|cr)\b/.test(nameWords(f)));
// A data definition holds a field for the currency of its amounts.
const currencyField = (raw, r) => r.kind === 'data' && list(raw.fields).some(f => /curr|ccy/.test(nameWords(f)));
// A data definition carries a classification other than "not classified".
const classified = (raw, r) => r.kind === 'data' && !!str(raw.classification) && !/^(?:unclassified|not classified yet|not stated|inherited)$/i.test(str(raw.classification));
// A runtime plan keeps more than one copy ready, or names a standby zone. Round 12 (GR-DOM-14): a plan whose copies are
// not stated (and that names no standby zone) says nothing either way: 'not-stated', an open question, never met or unmet.
const redundantPlan = (raw, r) => r.kind !== 'plan' ? false : Number(raw.minReady) >= 2 || !!str(raw.backupZoneId) ? true : str(raw.minReady) === '' ? 'not-stated' : false;
// A Chapter 9 control of the dual control & segregation of duties category (round 12, GR-SEC-03) that names the role
// that makes and a different role that checks.
const dualControl = (raw, r) => r.kind === 'control' && raw.category === 'Dual control & segregation of duties' && !!str(raw.makerRole) && !!str(raw.checkerRole) && str(raw.makerRole).toLowerCase() !== str(raw.checkerRole).toLowerCase();
// A Chapter 2 availability or recovery driver states a target value.
const targetDriver = (raw, r) => r.kind === 'driver' && /availab|recover|reliab|continu/i.test(str(raw.category)) && str(raw.targetValue) !== '';
// The roadmap holds a plateau: the design says how it moves from the current state to the target.
const plateau = (raw, r) => r.kind === 'plateau';

export const CORE_BANKING = {
  id: 'core-banking',
  version: 1,
  title: 'Core banking',
  ref: 'Domain lens · core banking',
  noun: 'a core-banking platform',
  summary: 'What a core-banking platform must address: the ledger, end of day, interest and charges, currencies, customers and their checks, regulation, controls, data and operations.',
  // The lens is suggested when the brief and the requirements use its words: a strong cue and five concerns, or
  // eight concerns without one. A suggestion is only shown; the person chooses.
  suggest: {strong: /\b(?:core[- ]banking|cbs|cba|general ledger|chart of accounts|deposit accounts?|savings accounts?|current accounts?|loan accounts?|tellers?|end[- ]of[- ]day|interest accruals?|kyc|aml)\b/, withStrong: 5, without: 8},
  // Round 12 (workstream K): the words that name each concern in a question, and the qualities it asks about, for the
  // Brain's retrieval in a project that uses the lens (core-banking-terms.js). The coverage rule never reads them.
  vocabulary: CORE_BANKING_TERMS,
  concerns: [
    // 1. Posting and general-ledger integrity. Cues: ledger, general ledger, GL, posting, journal entry, double entry,
    // debit with credit, chart of accounts, suspense. Facets: double entry (a data definition with a debit field and a
    // credit field counts), balanced postings, references on postings, suspense, reversal (all required).
    {id: 'posting', title: 'Posting and ledger integrity',
      why: 'Every financial event must leave balanced, referenced entries in the ledger, and a posted entry is changed only by a new entry.',
      lead: 'Which component keeps the general ledger, and how does it record each financial event?',
      cues: /\b(?:general[- ]ledger|ledgers?|sub[- ]?ledgers?|gl (?:accounts?|codes?|entr(?:y|ies)|postings?|lines?)|postings?|post(?:ed|s)? (?:to|into|in) the (?:ledger|gl|general ledger|account)|journal entr(?:y|ies)|double[- ]entry|debits?(?! cards?)\b[^.]{0,60}\bcredits?(?! cards?)\b|credits?(?! cards?)\b[^.]{0,60}\bdebits?(?! cards?)\b|dr\b[^.]{0,20}\bcr|chart of accounts|suspense|contra entr\w*|booking entr\w*)/,
      facets: [
        {id: 'double-entry', label: 'double entry', required: true, check: debitCredit, question: 'How is each financial event recorded as debit and credit entries?',
          words: /\b(?:double[- ]entry|debits? and credits?|credits? and debits?|debit ?\/ ?credit|dr ?\/ ?cr|both legs|two legs|(?:debit|credit) legs?|contra (?:accounts?|legs?|entr\w*)|(?:debit|credit) (?:and|&) (?:credit|debit) (?:entr\w*|legs?|sides?|postings?)|(?:dr|cr|debit|credit) (?:indicators?|sides?))/},
        {id: 'balanced', label: 'balanced postings', required: true, question: 'Where is it checked that a posting\'s debits equal its credits, per currency, before it is committed?',
          words: /(?:(?<!load[- ])\bbalanced\b|\bbalance checks?\b|\bin balance\b|\bout[- ]of[- ]balance\b|\bimbalance|\bunbalanced\b|\bdebits? (?:=|equals?|matches?|must equal) (?:the )?credits?|\bsum of (?:the )?debits\b|\bzero[- ]sum\b|\bnets? to zero\b|\btrial balance\b|\bdebits? and credits? (?:must |always )?(?:balance|agree|be equal|are equal))/},
        {id: 'referenced', label: 'a reference on every posting', required: true, question: 'What unique reference does each posting carry, and how is a repeated posting recognised?',
          words: /\b(?:(?:posting|transaction|journal|entry|batch|event) (?:references?|refs?|ids?|numbers?|keys?)|unique references?|reference numbers?|idempoten\w*|correlation (?:keys?|ids?)|duplicate (?:checks?|detection|postings?|polic(?:y|ies)))\b/},
        {id: 'suspense', label: 'suspense for entries that cannot be applied', required: true, question: 'Where do entries that cannot be applied go, who clears them, and by when?',
          words: /\b(?:suspense|unapplied|unallocated|clearing accounts?|wash accounts?|exception accounts?|unmatched (?:entr\w*|postings?|items?))\b/},
        {id: 'reversal', label: 'correction by reversal', required: true, question: 'How is a posted entry corrected: by a reversing entry, never by editing or deleting it?',
          words: /\b(?:reversals?|revers(?:e|ed|es|ing)\b(?! proxy)|contra entr\w*|correcting entr\w*|correction entr\w*|storno|append[- ]only|immutable (?:entr\w*|postings?|ledgers?|journals?)|never (?:edited|updated|deleted|changed)|not (?:be )?(?:edited|updated|deleted|changed) (?:once|after) (?:it is |they are )?posted)/}
      ]},
    // 2. End-of-day and periodic processing. Cues: end of day, month or year, EOD, close of business, batch, business
    // date, date roll, scheduler, nightly. Facets: the window, the cut-off and the date roll, the order of the steps,
    // restart (required); what stays online during the run (optional).
    {id: 'eod', title: 'End-of-day and periodic processing',
      why: 'Interest, charges, statements and the business date depend on a periodic run that must finish in its window and restart safely.',
      lead: 'Which jobs run at end of day, in what order, and in what window?',
      cues: /\b(?:end[- ]of[- ](?:day|month|year|period|cycle)|eod|eom|eoy|close of business|cob|day[- ]end|month[- ]end|year[- ]end|period[- ]end|batch(?:es)?|business dates?|date roll\w*|roll(?:ing)? over|rollover|schedulers?|scheduled (?:jobs?|runs?|process\w*)|nightly|overnight)\b/,
      facets: [
        {id: 'window', label: 'the processing window', required: true, question: 'When does the end-of-day window start, and how long may it run?',
          words: /\b(?:batch window|processing window|(?:eod|end[- ]of[- ]day|overnight|nightly|batch) (?:windows?|schedules?)|operating (?:schedule|calendar|hours)|online day|maintenance window|(?:starts?|runs?|begins?) (?:at|from|between) \d|\d{1,2}[:.]\d{2} ?(?:-|to|until|–) ?\d{1,2}[:.]\d{2}|calendars?)/},
        {id: 'cut-off', label: 'the cut-off and the date roll', required: true, question: 'What is the cut-off for postings, and how does the business date roll?',
          words: /\b(?:cut[- ]?offs?|business date (?:change|roll\w*|switch\w*|advance\w*|moves?)|date roll\w*|roll\w* (?:the )?(?:business )?date|close (?:the )?(?:business )?day|day close|posting deadline|last (?:posting|transaction) time|freez\w* (?:the )?(?:postings?|ledger|business date))/},
        {id: 'order', label: 'the order of the steps', required: true, question: 'In what order do the end-of-day steps run, and which step waits for which?',
          words: /\b(?:job (?:chains?|order|sequence|dependenc\w*|streams?|flows?)|predecessors?|dependenc(?:y|ies) between|run order|sequence of (?:jobs|steps|tasks)|in (?:this|the following|a fixed|a set) order|step order|(?:eod|end[- ]of[- ]day|batch) (?:steps|stages|chain|sequence|jobs|tasks)|after (?:the )?[a-z ]{1,40} (?:completes|finishes|has run)|waits? for (?:the )?[a-z ]{1,40} (?:job|step|run))/},
        {id: 'restart', label: 'a safe restart', required: true, question: 'If a step fails, how does the run restart without posting twice?',
          words: /\b(?:restart\w*|re[- ]?runs?|re[- ]?runnable|checkpoint\w*|resum(?:e|es|ed|ing) (?:from|after|at)|recover\w* (?:of|from) (?:a )?(?:failed|aborted|interrupted) (?:batch|job|run|step)|idempotent (?:jobs?|steps?|batch(?:es)?|runs?))/},
        {id: 'online', label: 'service during the run', required: false, question: 'Which services stay online while end of day runs, and how are their postings dated?',
          words: /\b(?:(?:stays?|remains?|kept|keeps?) online|24 ?[x×/] ?7|memo[- ]post\w*|stand[- ]?in|online (?:during|while)|without (?:stopping|downtime|closing))/}
      ]},
    // 3. Interest accrual and charges. Cues: interest, accrual, day count, capitalisation, charges, fees, commissions,
    // tariffs, penalties, levies, VAT. Facets: accrual, the day-count basis, charges (required); capitalisation and
    // where rates are kept (optional).
    {id: 'interest', title: 'Interest accrual and charges',
      why: 'Interest and charges are where customers most often see an error, so the basis and the timing must be explicit.',
      lead: 'Which component accrues interest and applies charges, and on what basis?',
      cues: /(?:\b(?:interest|accru\w*|day[- ]count|capitali[sz]\w*|fees?|commissions?|tariffs?|penalt(?:y|ies)|levy|levies|stamp duty|vat|withholding tax|amorti[sz]\w*)\b|(?<!in )\bcharges?\b)/,
      facets: [
        {id: 'accrual', label: 'interest accrual', required: true, question: 'How often is interest accrued, and where are the accruals recorded?',
          words: /\b(?:accru\w*|interest (?:calculation|computation|engine|runs?|posting|application)|calculat\w* (?:the )?interest|daily interest|interest (?:is|are) calculated|effective interest)/},
        {id: 'day-count', label: 'the day-count basis', required: true, question: 'Which day-count basis applies to each product?',
          words: /\b(?:day[- ]count|30e?\/360|act(?:ual)?\/(?:360|365|actual)|day basis|days? in (?:the |a )?year|rate basis|compound(?:ing|ed)? (?:daily|monthly|quarterly|annually|frequency)|simple interest|compound interest)/},
        {id: 'charges', label: 'charges and fees', required: true, question: 'Which component calculates charges and fees, and where are the tariffs kept?',
          words: /(?:(?<!in )\bcharges?\b|\bfees?\b|\bcommissions?\b|\btariffs?\b|\bpenalt(?:y|ies)\b|\blevy\b|\blevies\b|\bstamp duty\b|\bvat\b|\bwithholding tax\b)/},
        {id: 'capitalisation', label: 'when interest is posted', required: false, question: 'When is accrued interest posted to the account, and how is it rounded?',
          words: /\b(?:capitali[sz]\w*|interest (?:posting|application)|apply interest|credit(?:ed)? interest to|interest (?:is|are) (?:posted|paid|credited|debited))/},
        {id: 'rates', label: 'where rates are kept', required: false, question: 'Where are interest rates and tariffs kept, and how does a rate change take effect?',
          words: /\b(?:rate (?:tables?|sheets?|schedules?|tiers?|cards?|changes?)|tiered rates?|base rates?|reference rates?|rates? takes? effect|effective[- ]dated rates?)/}
      ]},
    // 4. Multi-currency and FX. Cues: multi-currency, currency, foreign exchange, FX, exchange rate, cross-currency,
    // revaluation, ISO 4217. Facets: a currency on every amount (a currency field on a data definition counts), the
    // rate source, revaluation (required); positions and rounding (optional).
    {id: 'fx', title: 'Multi-currency and FX',
      why: 'Amounts in different currencies must never be added together, and foreign balances must be valued at known rates.',
      lead: 'Which currencies does the platform hold, and how is each amount kept with its currency?',
      cues: /\b(?:multi[- ]?currenc\w*|currenc(?:y|ies)|foreign exchange|fx|forex|exchange rates?|cross[- ]currency|revalu\w*|iso ?4217|conversion rates?|spot rates?|forward (?:rates?|contracts?)|base currency|local currency|functional currency|ccy)\b/,
      facets: [
        {id: 'currency', label: 'a currency on every amount', required: true, question: 'Does every amount carry its currency code, and which currencies are held?', check: currencyField,
          words: /\b(?:currency (?:codes?|fields?)|amounts? (?:and|with|in) (?:its|their|the) currency|currency (?:per|of each|of every|of the) (?:amount|entry|posting|account|transaction)|iso ?4217|ccy|account currency|transaction currency)\b/},
        {id: 'rates', label: 'the source of exchange rates', required: true, question: 'Where do exchange rates come from, and which rate applies to a transaction?',
          words: /\b(?:(?:exchange|fx|conversion|spot|mid|buying|selling|cross) rates?|rate (?:sources?|feeds?|providers?|tables?)|rates? (?:from|by|published by) the (?:central bank|treasury|market))/},
        {id: 'revaluation', label: 'revaluation', required: true, question: 'When are foreign-currency balances revalued, and where are the gains and losses posted?',
          words: /\b(?:revalu\w*|unreali[sz]ed (?:gains?|loss(?:es)?)|(?:fx|exchange|translation) (?:gains?|loss(?:es)?|differences?)|retranslat\w*)/},
        {id: 'position', label: 'currency positions', required: false, question: 'How is a cross-currency posting balanced in each currency, through a position account?',
          words: /\b(?:position accounts?|currency positions?|fx positions?|cross[- ]currency (?:postings?|legs?|entr\w*)|contra currency)/},
        {id: 'rounding', label: 'decimal places and rounding', required: false, question: 'How many decimal places does each currency carry, and how are amounts rounded?',
          words: /\b(?:minor units?|decimal places|rounding|precision)\b/}
      ]},
    // 5. Customer onboarding with identity and KYC checks. Cues: onboarding, account opening, customer creation, KYC,
    // know your customer, due diligence, identity verification, biometrics, national identity numbers. Facets:
    // onboarding, the identity check, customer risk (required); refresh and record keeping (optional).
    {id: 'kyc', title: 'Customer onboarding and KYC',
      why: 'A bank must know who its customer is before an account is used.',
      lead: 'Which part of the design opens a customer and verifies their identity?',
      cues: /\b(?:onboard\w*|on[- ]board\w*|account opening|open(?:ing|s)? (?:an? |new |the )?(?:customer )?accounts?|customer (?:creation|registration|records?|information|master|profiles?)|cif|kyc|know your customer|customer due diligence|cdd|enhanced due diligence|identity (?:verification|checks?|documents?|numbers?)|verif(?:y|ies|ied|ication of) (?:the )?(?:customer'?s? )?identit\w*|biometric\w*|bvn|nin|national (?:id|identity)|proof of (?:address|identity)|kyc tiers?)\b/,
      facets: [
        {id: 'onboarding', label: 'onboarding', required: true, question: 'Which component opens a customer and an account, and what must be complete first?',
          words: /\b(?:onboard\w*|on[- ]board\w*|account opening|open(?:ing|s)? (?:an? |new |the )?(?:customer )?accounts?|customer (?:creation|registration)|creat\w* (?:a |the )?customers?)\b/},
        {id: 'identity', label: 'the identity check', required: true, question: 'How is the customer\'s identity verified, and against which source?',
          words: /\b(?:identity (?:verification|checks?|providers?|services?|registry)|verif(?:y|ies|ied|ication of) (?:the )?(?:customer'?s? )?identit\w*|kyc (?:checks?|verification)|biometric\w*|bvn|nin|national (?:id|identity)|proof of identity)\b/},
        {id: 'risk', label: 'customer risk', required: true, question: 'How is a customer\'s risk rated, and what extra checks does a high rating trigger?',
          words: /\b(?:due diligence|(?:customer )?risk (?:ratings?|scores?|scoring|categor\w*|tiers?|levels?|profiles?)|kyc tiers?|tiered (?:kyc|accounts?))\b/},
        {id: 'refresh', label: 'periodic review', required: false, question: 'When is a customer\'s identity checked again, and what happens when a document expires?',
          words: /\b(?:periodic (?:reviews?|refresh\w*)|(?:kyc|identity) (?:refresh\w*|updates?|reviews?|expir\w*)|re[- ]?kyc|expir\w* (?:of )?(?:the )?(?:id|identity|documents?))\b/},
        {id: 'records', label: 'record keeping', required: false, question: 'How long are identity records kept, and where?',
          words: /\b(?:record[- ]keeping|retain\w* (?:the )?(?:customer|kyc|identity|onboarding) (?:records|documents|data)|(?:five|5) years)\b/}
      ]},
    // 6. AML monitoring and sanctions screening. Cues: AML, money laundering, sanctions, watch lists, screening, PEP,
    // suspicious, transaction monitoring, terrorist financing, financial intelligence unit, STR, SAR, CTR. Facets:
    // screening, transaction monitoring, reporting (required); case handling and list updates (optional).
    {id: 'aml', title: 'AML monitoring and sanctions screening',
      why: 'Customers and payments must be screened and monitored, and suspicious activity reported.',
      lead: 'Which part of the design screens customers and payments, and monitors transactions?',
      cues: /\b(?:aml|anti[- ]money|money[- ]laundering|sanctions?|watch ?lists?|blacklists?|screen(?:ing|ed|s)?|peps?|politically exposed|suspicious|transaction monitoring|terroris(?:t|m) financing|cft|financial intelligence|fiu|str|sar|ctr|currency transaction reports?)\b/,
      facets: [
        {id: 'screening', label: 'sanctions and watch-list screening', required: true, question: 'Where are customers and payments screened against sanctions and watch lists?',
          words: /\b(?:sanctions? (?:screening|lists?|checks?)|screen\w* (?:\w+ ){0,3}against (?:the )?(?:sanctions?|watch ?lists?|peps?|lists?)|watch ?lists?|peps?|politically exposed|blacklists?|(?:un|ofac|eu) (?:sanctions?|lists?)|name screening)\b/},
        {id: 'monitoring', label: 'transaction monitoring', required: true, question: 'Which rules monitor transactions for suspicious activity, and where do they run?',
          words: /\b(?:transaction monitoring|aml (?:monitoring|rules?|scenarios?|engine|system|checks?)|suspicious (?:activity|activities|transactions?|patterns?|behaviou?r)|unusual (?:activity|transactions?)|monitor\w* (?:transactions?|payments?|accounts?) for|structuring|velocity (?:rules?|checks?))\b/},
        {id: 'reporting', label: 'suspicious-activity reporting', required: true, question: 'How is a suspicious transaction reported, to whom, and by when?',
          words: /\b(?:suspicious (?:activity|transaction) reports?|str|sar|currency transaction reports?|ctr|report\w* (?:\w+ ){0,3}(?:to|for) (?:the )?(?:financial intelligence|fiu|regulator)|financial intelligence units?)\b/},
        {id: 'cases', label: 'alert handling', required: false, question: 'Who reviews an alert, and how is the decision recorded?',
          words: /\b(?:case management|investigat\w*|alert (?:queues?|reviews?|triage|disposition)|false positives?)\b/},
        {id: 'lists', label: 'list updates', required: false, question: 'How often are the screening lists updated, and is screening repeated when they change?',
          words: /\b(?:list (?:updates?|refresh\w*|versions?)|(?:daily|real[- ]time|intraday) (?:lists?|screening)|screening lists?)\b/}
      ]},
    // 7. Regulatory and statutory reporting. Cues: regulator, regulatory, statutory, supervisory, central bank,
    // prudential, returns, XBRL, Basel, IFRS, capital adequacy, credit bureau, regulator acronyms. Facets: which returns
    // and when, the data each is built from (required); automation and sign-off (optional).
    {id: 'reporting', title: 'Regulatory and statutory reporting',
      why: 'Returns to regulators must come from the same data as the ledger and reach them on time.',
      lead: 'Which regulatory and statutory returns does the platform produce, and from which data?',
      cues: /(?:\b(?:regulat(?:or|ors|ory)|statutory|supervis(?:or|ors|ory)|central bank|prudential|compliance reports?|xbrl|basel|ifrs|capital adequacy|liquidity (?:ratios?|coverage|returns?)|credit bureau|cbn|ndic|fca|pra|eba|occ|fdic|apra)\b|\breturns? (?=to |for |schedule|calendar|deadline|submission))/,
      facets: [
        {id: 'returns', label: 'the returns and their deadlines', required: true, question: 'Which returns are due, to which authority, and by when?',
          words: /\b(?:(?:regulatory|statutory|prudential|supervisory|monthly|quarterly|daily|weekly|annual) (?:returns?|reports?|submissions?|filings?)|reports? (?:to|for) (?:the )?(?:regulator|central bank|supervisor)|submi\w* (?:\w+ ){0,3}(?:to|for) (?:the )?(?:regulator|central bank|supervisor)|returns? (?:schedule|calendar|deadlines?)|submission deadlines?)\b/},
        {id: 'lineage', label: 'the data behind each return', required: true, question: 'From which records is each return built, and how does it reconcile to the ledger?',
          words: /\b(?:lineage|reconcil\w* (?:to|with|against) (?:the )?(?:ledger|gl|general ledger|accounting|accounts)|single source of (?:truth|record)|authoritative source|from the (?:ledger|gl|general ledger)|reporting (?:store|database|data ?mart|warehouse|data)|data ?marts?|data warehouse)\b/},
        {id: 'automation', label: 'automated production', required: false, question: 'Which returns are produced automatically, and which by hand?',
          words: /\b(?:automat\w* (?:reports?|generation|submissions?|extraction|returns?)|scheduled reports?|generated automatically|automatically generated)\b/},
        {id: 'signoff', label: 'sign-off before submission', required: false, question: 'Who checks and signs off a return before it is submitted?',
          words: /\b(?:validation rules?|sign[- ]?off|signed off|approv\w* before submission|reviewed before (?:it is )?(?:submitted|filed))\b/}
      ]},
    // 8. Maker-checker and segregation of duties. Cues: maker, checker, four eyes, dual control, segregation,
    // separation of duties, authoriser, inputter, approval, override. Facets: dual control, segregation of duties
    // (required); approval limits and checks on changes to parameters and users (optional).
    {id: 'maker-checker', title: 'Maker-checker and segregation of duties',
      why: 'No one person should be able to enter and approve the same financial item.',
      lead: 'Which actions need a second person to approve them, and where is that enforced?',
      cues: /\b(?:makers?|checkers?|four[- ]eyes|4[- ]eyes|dual (?:control|authori[sz]\w*|approval|sign\w*)|segregation|separation of duties|sod|authori[sz]ers?|inputters?|approv(?:al|als|er|ers|e|ed|es|ing)|supervisor\w* (?:approval|override)|overrides?|second (?:approver|authori[sz]er|pair of eyes))\b/,
      facets: [
        {id: 'dual', label: 'dual control', required: true, check: dualControl, question: 'Which transactions and changes need a checker, and which component enforces it?',
          words: /\b(?:maker[- ]?(?:and[- ]?)?checker|four[- ]eyes|4[- ]eyes|dual (?:control|authori[sz]\w*|approval)|(?:second|independent|another|different) (?:approver|authori[sz]er|person|user|officer|checker)|inputters? (?:and|&|\/) authori[sz]ers?|approv\w* by (?:a |an )?(?:second|another|different|independent) (?:person|user|officer)|authori[sz]ation queues?|approval (?:queues?|workflows?|steps?))\b/},
        {id: 'segregation', label: 'segregation of duties', required: true, check: dualControl, question: 'How is one person prevented from both entering and approving the same item?',
          words: /\b(?:segregation of duties|separation of duties|sod|incompatible (?:roles|duties)|conflicting (?:roles|duties)|(?:cannot|can not|must not|may not) (?:both )?(?:create|initiate|input|enter|make|capture|raise) and (?:approve|authori[sz]e|check|verify)|(?:not|never|cannot) (?:approve|authori[sz]e|check) (?:their|his|her|its|the user'?s?) own|no (?:user|one|person|officer|maker)s? (?:may|can|is allowed to) (?:approve|authori[sz]e|check) (?:their|his|her|its) own|own (?:entries|transactions|changes|requests) (?:cannot|may not|must not))\b/},
        {id: 'limits', label: 'approval limits', required: false, question: 'What limits decide who may approve what, and where do they escalate?',
          words: /\b(?:(?:approval|authori[sz]ation|transaction|posting) limits?|limits? (?:matrix|by role|per role)|escalat\w*|delegat\w* (?:authority|limits?))\b/},
        {id: 'static', label: 'checks on changes to parameters and users', required: false, question: 'Do changes to parameters, users and limits also need a second person?',
          words: /\b(?:parameter|configuration|user|role|limit|static data|product|rate|tariff)s? (?:changes?|maintenance|updates?) (?:require|requires|need|needs|go through|are|is) (?:\w+ )?(?:approv\w*|authori[sz]\w*|check\w*)/}
      ]},
    // 9. Audit history with before and after values. Cues: audit, trail, change log, change history, who changed,
    // before and after, old and new, tamper, immutable, append-only, WORM. Facets: the audit trail, before and after
    // values, protection from change (required); retention and who, when and where (optional).
    {id: 'audit', title: 'Audit history with before and after values',
      why: 'Every change to money or master data must be traceable to a person, a time, and its old and new values.',
      lead: 'Where is the audit history kept, and does it show each change with its old and new values?',
      cues: /\b(?:audit\w*|trails?|change (?:logs?|history|records?)|history of changes|activity logs?|(?:who|which user) (?:changed|did|approved|made)|before (?:and|&|\/|-) ?after|old (?:and|&|\/) new|tamper\w*|immutable|append[- ]only|worm|logs? of (?:changes|actions|access))\b/,
      facets: [
        {id: 'trail', label: 'an audit trail', required: true, question: 'Which component records the audit history of financial and master-data changes?',
          words: /\b(?:audit (?:trails?|logs?|history|records?|events?|entr\w*|store|service)|change (?:logs?|history)|activity logs?|history of changes|(?:who|which user) (?:changed|did|approved|made) what)\b/},
        {id: 'before-after', label: 'before and after values', required: true, question: 'Does each audit record keep the value before and after the change?',
          words: /\b(?:before (?:and|&|\/|-) ?after|old (?:and|&|\/) new (?:values?|data)|(?:previous|prior|original) (?:and|&|\/) (?:new|current|amended|changed) values?|(?:prior|previous|old) values?|values? before (?:and after )?(?:the )?change)\b/},
        {id: 'protected', label: 'protection from change', required: true, question: 'How is the audit history protected from change, including by administrators?',
          words: /\b(?:tamper[- ]?(?:evident|proof|resistant)|immutable|append[- ]only|write[- ]once|worm|hash[- ]chain\w*|signed (?:logs?|records?)|cannot be (?:altered|changed|edited|deleted)|read[- ]only (?:audit|logs?|store))\b/},
        {id: 'retention', label: 'retention', required: false, question: 'How long are audit records kept, and how are they found for an inspection?',
          words: /\b(?:retention|retain\w* for|\d+ (?:years?|months?)|archiv\w*)\b/},
        {id: 'actor', label: 'who, when and where', required: false, question: 'Does every audit record say who acted, when, and from where?',
          words: /\b(?:user (?:ids?|names?|identity)|timestamps?|who and when|terminals?|ip address(?:es)?|workstations?)\b/}
      ]},
    // 10. Product and parameter configuration. Cues: product factory, catalogue, definition or parameters,
    // parameterisation, configuration, static and reference data, tariff tables, business rules. Facets: where products
    // are defined, dated parameter versions (required); change control and configuration without code (optional).
    {id: 'product-config', title: 'Product and parameter configuration',
      why: 'Products, rates and tariffs change often and must change without new code and without rewriting history.',
      lead: 'Where are products and their parameters defined, and how does a change take effect?',
      cues: /\b(?:products? (?:factory|catalogu?e|definitions?|configuration|set[- ]?up|parameters?|templates?|rules?|engine|types?)|parameteri[sz]\w*|parameters?|configurab\w*|configur\w*|static data|reference data|tariff (?:tables?|set[- ]?up)|rate tables?|business rules?|rules engine)\b/,
      facets: [
        {id: 'definition', label: 'where products are defined', required: true, question: 'Which component holds the product definitions and their parameters?',
          words: /\b(?:products? (?:factory|catalogu?e|definitions?|configuration|set[- ]?up|templates?|engine|parameters?)|define (?:a |new )?products?|new products? (?:without|by configuration)|product (?:types?|variants?) (?:are|is) (?:defined|configured))\b/},
        {id: 'versioned', label: 'dated parameter versions', required: true, question: 'How are parameter changes dated, so that past transactions keep the values that applied then?',
          words: /\b(?:effective (?:dates?|from|dated)|valid (?:from|until|to)|versioned|versions? of (?:the )?(?:products?|parameters?|rates?|tariffs?)|(?:parameter|product|rate|tariff) (?:versions?|history)|future[- ]dated (?:rates?|parameters?|changes?|products?))\b/},
        {id: 'change-control', label: 'approval of changes', required: false, question: 'Who approves a change to a product or a parameter before it takes effect?',
          words: /\b(?:(?:parameter|product|configuration|rate|tariff) changes? (?:approval|control|authori[sz]\w*|review)|maker[- ]?checker|approv\w* before (?:activation|use|going live))\b/},
        {id: 'no-code', label: 'configuration without code', required: false, question: 'Can a new product be set up by configuration, without a code change?',
          words: /\b(?:without (?:code|coding|development|a (?:new )?release|deployment|a developer)|no[- ]code|low[- ]code|configuration (?:rather|instead) (?:than|of) code|business users? (?:can|may) (?:define|configure|change))\b/}
      ]},
    // 11. Backdating and value-dating controls. Cues: value date, backdating, forward and future dating, effective,
    // booking, posting and business dates, retrospective. Facets: a value date apart from the booking date, a control
    // on backdating (a backdating word with a limit or approval word in the same record) (required); recalculation and
    // which date a posting carries (optional).
    {id: 'value-dating', title: 'Backdating and value dating',
      why: 'The date money moves can differ from the date it is booked, and backdating needs limits.',
      lead: 'How does the platform date postings, and who may backdate one?',
      cues: /\b(?:value[- ]?dat(?:e|ed|es|ing)|back[- ]?dat(?:e|ed|es|ing)|forward[- ]?dat(?:e|ed|es|ing)|post[- ]?dated|postdat(?:e|es|ing)|future[- ]?dat(?:e|ed|es|ing)|effective dates?|booking dates?|posting dates?|business dates?|as[- ]of dates?|retrospective\w*)\b/,
      facets: [
        {id: 'value-date', label: 'a value date apart from the booking date', required: true, question: 'Does each posting carry a value date apart from its booking date?',
          words: /\bvalue[- ]?dat(?:e|ed|es|ing)\b/},
        {id: 'backdating', label: 'a control on backdating', required: true, question: 'How far back may a posting be dated, and who must approve it?',
          all: [/\b(?:back[- ]?dat(?:e|ed|es|ing)|retrospective\w*|past[- ]dated)\b/, /\b(?:limit\w*|control\w*|approv\w*|authori[sz]\w*|restrict\w*|maximum|max|window|tolerance|not (?:allowed|permitted)|only (?:within|up to)|days?)\b/]},
        {id: 'recalculation', label: 'recalculation of interest', required: false, question: 'When a posting is backdated, how is interest recalculated for the past days?',
          words: /\b(?:recalculat\w*|back[- ]?valu\w*|interest adjust\w*|adjust\w* (?:the )?interest|retrospective (?:interest|adjust\w*))\b/},
        {id: 'business-date', label: 'the date each posting carries', required: false, question: 'Which date does each posting carry: the business date, the value date, or both?',
          words: /\b(?:business dates?|system dates?|posting dates?|booking dates?)\b/}
      ]},
    // 12. Payments and switch integration. Cues: payment, transfer, remittance, switch, clearing, settlement, ACH,
    // RTGS, SWIFT, ISO 20022, ISO 8583, card schemes, ATM, POS, interbank, standing orders, direct debits. Facets: the
    // interface to each network (a contract or a component), recognising a repeated instruction, an uncertain outcome
    // (a timeout policy, a status enquiry before a retry, a reversal advice; a session time-out is not one) (required);
    // settlement reconciliation and the message standard (optional).
    {id: 'payments', title: 'Payments and switch integration',
      why: 'Payments leave and enter through switches and networks that can repeat, delay or lose a message.',
      lead: 'Which payment networks and switches does the platform connect to, and through which interfaces?',
      cues: /\b(?:payments?|transfers?|remittances?|switch(?:es|ing)?|clearing|settlements?|ach|rtgs|swift|iso ?20022|iso ?8583|card (?:schemes?|networks?|switch\w*)|atms?|pos|instant payments?|interbank|nip|nibss|standing orders?|direct debits?)\b/,
      facets: [
        {id: 'interface', label: 'an interface to each network', required: true, kinds: ['contract', 'component'], question: 'Which interface connects the platform to each payment switch or network?',
          words: /\b(?:switch(?:es|ing)?|clearing(?: house| system)?|settlement (?:systems?|networks?|banks?|agents?)|swift|iso ?20022|iso ?8583|rtgs|ach|card (?:schemes?|networks?)|interbank|payment (?:networks?|schemes?|gateways?|systems?|rails?|hubs?)|nip|nibss|central bank)\b/},
        {id: 'duplicates', label: 'one posting for a repeated instruction', required: true, question: 'How is a repeated payment instruction recognised, so that it is posted once?',
          words: /\b(?:idempoten\w*|duplicate (?:checks?|detection|polic(?:y|ies)|payments?|requests?|instructions?)|exactly[- ]once|de-?dup\w*|unique (?:payment|transaction|instruction|end[- ]to[- ]end) (?:references?|ids?)|end[- ]to[- ]end (?:references?|ids?))\b/},
        {id: 'uncertain', label: 'an outcome found before a retry', required: true, question: 'What happens when a switch does not answer in time: how is the outcome found before a retry?',
          words: /\b(?:time[- ]?out polic(?:y|ies)|(?:on|after|when|if) (?:a |the )?(?:switch )?time[- ]?outs?\b[^.]{0,80}\b(?:enquir\w*|inquir\w*|query|status|retry|revers\w*)|uncertain (?:outcomes?|status|results?|responses?)|unknown (?:outcomes?|status)|status (?:enquir\w*|inquir\w*|query|queries)|transaction status (?:enquir\w*|inquir\w*|query|queries)|enquir\w* before (?:a |any )?retry|pending (?:status|outcomes?|state)|reversal (?:advices?|messages?|requests?)|repeat (?:advices?|messages?)|tsq|requery)\b/},
        {id: 'reconciliation', label: 'settlement reconciliation', required: false, question: 'How are the settlement reports of each switch reconciled with the ledger every day?',
          words: /\b(?:settlement (?:reports?|files?|reconciliation)|reconcil\w*)\b/},
        {id: 'standard', label: 'the message standard', required: false, question: 'Which message standard and version does each payment interface use?',
          words: /\b(?:iso ?20022|iso ?8583|swift mt\d*|pacs\.\d+|camt\.\d+|pain\.\d+)/}
      ]},
    // 13. Channels. Cues: channel, mobile app or banking, internet and online banking, USSD, ATM, POS, branch, teller,
    // agent banking, open banking, API gateway, contact centre, IVR. Facets: the layer the channels call (a component,
    // contract, responsibility or decision), channel security (alone) (required); the same view in every channel and
    // limits per channel (optional).
    {id: 'channels', title: 'Channels',
      why: 'Customers and staff reach the platform through several channels that must see the same truth and be secured.',
      lead: 'Which channels reach the platform, and through which layer?',
      cues: /\b(?:channels?|mobile (?:apps?|banking|applications?)|internet banking|online banking|web (?:portal|banking|apps?)|ussd|atms?|pos|branch (?:tellers?|banking|systems?|staff)|tellers?|agent banking|open banking|api gateway|contact cent(?:er|re)s?|ivr|chat ?bots?|front[- ]ends?)\b/,
      facets: [
        {id: 'access', label: 'the layer the channels call', required: true, kinds: ['component', 'contract', 'responsibility', 'decision'], question: 'Which layer do the channels call, and which services does it expose?',
          words: /\b(?:api (?:gateways?|layer|management)|channel (?:integration|layer|gateways?|adapters?|services?|apis?|hub)|(?:mobile|internet|online|web|ussd|branch|teller|agent|atm) (?:banking|channels?|apps?|portals?|interfaces?|integration|gateways?)|omni[- ]?channel|digital channels?|backends? for frontends?|bff)\b/},
        {id: 'security', label: 'channel security', required: true, alone: true, question: 'How are channel users authenticated, and how does a customer confirm a payment?',
          words: /\b(?:strong (?:customer )?authentication|sca|multi[- ]factor|mfa|2fa|two[- ]factor|otps?|one[- ]time (?:passwords?|passcodes?|pins?)|device (?:binding|registration)|session (?:time[- ]?outs?|management|expiry)|transaction signing|rate limit\w*|throttl\w*)\b/},
        {id: 'consistency', label: 'the same view in every channel', required: false, question: 'Does every channel read balances and statuses from the same service?',
          words: /\b(?:same (?:balances?|status|view) (?:across|in every|in all) channels?|channel[- ]agnostic|single (?:api|service) layer|omni[- ]?channel|consistent across channels)\b/},
        {id: 'limits', label: 'limits per channel', required: false, question: 'What transaction limits apply per channel, and where are they enforced?',
          words: /\b(?:(?:daily|transaction|channel|per[- ]channel|cumulative) limits?|limits? (?:per|by) channel)\b/}
      ]},
    // 14. Availability and recovery targets. Cues: availability, uptime, 24/7, a percentage of the form 99.9 %,
    // recovery, RTO, RPO, disaster, failover, backup, standby, redundancy, high availability, business continuity,
    // resilience, outage, downtime. Facets: stated targets (from any record: a requirement, a driver with a target
    // value, or a plan's recovery figures), how each part recovers, a standby or a second copy (a plan with two ready
    // copies or a backup zone counts; "no standby" and a replica count do not) (required); backup and restore, failover
    // tests (optional).
    {id: 'availability', title: 'Availability and recovery targets',
      why: 'A core banking outage stops the bank, so availability and recovery need targets and a design that meets them.',
      lead: 'What availability and recovery targets does the platform carry, and how does the design meet them?',
      cues: /(?:\b(?:availab\w*|uptime|up[- ]time|24 ?[x×/] ?7|recover\w*|rto|rpo|disaster|fail[- ]?overs?|back[- ]?ups?|standby|redundan\w*|high availability|business continuity|resilien\w*|outages?|downtime)\b|99[.,]\d+ ?%)/,
      facets: [
        {id: 'targets', label: 'stated targets', required: true, from: 'any', check: targetDriver, question: 'What availability, recovery time and data-loss targets apply, per module?',
          words: /(?:\b\d+(?:[.,]\d+)? ?%|\brto\b|\brpo\b|\brecovery (?:time|point)(?: objectives?)?\b|\b(?:within|in under|in less than) \d+ (?:minutes?|hours?|seconds?)\b|\bdowntime of\b|\bmaximum (?:tolerable )?(?:downtime|outage)\b|\b(?:recovery|loss) minutes\b)/},
        {id: 'recovery', label: 'how each part recovers', required: true, question: 'How is each running part recovered, and in how many minutes?',
          words: /\b(?:(?:recovery|loss) minutes|recovery (?:plans?|strateg(?:y|ies)|procedures?|runbooks?|steps)|restore (?:procedures?|plans?|from)|disaster recovery (?:plans?|sites?|procedures?)|dr (?:plans?|sites?|procedures?|runbooks?)|backup plans?)\b/},
        {id: 'redundancy', label: 'a standby or a second copy', required: true, check: redundantPlan, question: 'Where is the standby, and what fails together with the primary?',
          words: /(?<!\bno )(?<!\bwithout )\b(?:standby|fail[- ]?overs?|secondary (?:sites?|regions?|zones?|data cent(?:er|re)s?)|dr sites?|recovery (?:sites?|zones?|regions?)|active[- ]active|active[- ]passive|hot sites?|warm sites?|replicat\w* (?:to|across|between|into) (?:a |an |the |two |both |its )?(?:standby|secondary|second|other|dr|recovery|another|remote|zones?|sites?|regions?|data cent\w*)|redundan\w*)\b/},
        {id: 'backup', label: 'backup and restore', required: false, question: 'How is the ledger backed up, and how long does a restore take?',
          words: /\b(?:back[- ]?ups?|restores?|point[- ]in[- ]time|pitr|snapshots?)\b/},
        {id: 'test', label: 'failover tests', required: false, question: 'How often is failover tested, and with what result?',
          words: /\b(?:(?:dr|disaster recovery|fail[- ]?over|recovery) (?:tests?|testing|drills?|exercises?|rehearsals?))\b/}
      ]},
    // 15. Data privacy and residency. Cues: privacy, personal data, PII, data protection laws, consent, residency,
    // sovereignty, in-country, jurisdiction, cross-border, masking, encryption, classification, confidential. Facets:
    // personal data marked (a data definition with a classification counts), where data may live, protection (alone)
    // (required); retention and the rights of the person (optional).
    {id: 'privacy', title: 'Data privacy and residency',
      why: 'Customer data is personal data, and it may be bound to a country.',
      lead: 'Where may customer data live, and how is personal data marked and protected?',
      cues: /\b(?:privacy|personal (?:data|information)|pii|personally identifiable|gdpr|ndpr|ndpa|data protection|consent|residency|data sovereignty|in[- ]country|jurisdictions?|cross[- ]border|locali[sz]ation|mask\w*|anonymi[sz]\w*|pseudonymi[sz]\w*|encrypt\w*|classif\w*|confidential|sensitive data)\b/,
      facets: [
        {id: 'classification', label: 'personal data marked', required: true, check: classified, question: 'Which data definitions hold personal data, and how is each classified?',
          words: /\b(?:personal data|pii|personally identifiable|sensitive (?:personal )?data|special categor\w* of (?:personal )?data)\b/},
        {id: 'residency', label: 'where data may live', required: true, question: 'In which country or region must customer data stay, and which zones may hold it?',
          words: /\b(?:residency|data sovereignty|in[- ]country|(?:stored|hosted|kept|processed|held) (?:\w+ ){0,2}(?:in|within) (?:the )?(?:country|jurisdiction|region|territory)|jurisdictions?|cross[- ]border (?:transfers?|data|flows?)|data locali[sz]ation|region (?:pinning|restrictions?|locks?))\b/},
        {id: 'protection', label: 'protection of personal data', required: true, alone: true, question: 'How is personal data protected at rest, in transit, and outside production?',
          words: /\b(?:encrypt\w* (?:\w+ ){0,2}(?:at rest|in transit)|(?:at rest|in transit) (?:\w+ ){0,2}encrypt\w*|encrypt\w* (?:of )?(?:personal|customer|sensitive) data|mask(?:ing|ed)|tokeni[sz]\w*|pseudonymi[sz]\w*|anonymi[sz]\w*|field[- ]level encryption|key management)\b/},
        {id: 'rights', label: 'retention and the rights of the person', required: false, question: 'How long is personal data kept, and how is a request to see or erase it handled?',
          words: /\b(?:retention (?:periods?|polic(?:y|ies)|days?)|right to (?:erasure|be forgotten|access|rectification)|data subjects?|consent (?:management|records?|capture)|purg\w*|deletion (?:schedules?|polic(?:y|ies)))\b/}
      ]},
    // 16. Migration from and coexistence with the current platform. Cues: migration, legacy, current or existing
    // platform, coexistence, parallel run, cut-over, go-live, data conversion, decommission, strangler, phase-out,
    // transition plan (a past go-live, "after go-live" or "post-go-live", is not a cue). Facets: the migration plan,
    // reconciliation of migrated data, coexistence and cut-over (a roadmap plateau counts; go-live counts as a plan, a
    // date or criteria) (required); rehearsals and decommissioning (optional).
    {id: 'migration', title: 'Migration and coexistence',
      why: 'A core platform rarely starts empty: balances and accounts come from the current platform, which may run beside it for a while.',
      lead: 'How does the platform take over from the current one, and what runs in between?',
      cues: /\b(?:migrat\w*|legacy|current (?:platform|system|core|cba|cbs)|existing (?:core|platform|system|cba|cbs)|old (?:core|platform|system)|coexist\w*|co-exist\w*|parallel runs?|cut[- ]?overs?|(?<!post[- ])(?<!pre[- ])(?<!after )go[- ]live|data conversion|decommission\w*|sunset\w*|strangler|phas(?:e|ed|ing)[- ]?out|transition (?:plans?|states?|architecture|plateaus?))\b/,
      facets: [
        {id: 'plan', label: 'the migration plan', required: true, question: 'What data moves from the current platform, in what order, and how?',
          words: /\b(?:data migration|migrat\w* (?:of|from) (?:the )?(?:legacy|existing|current|old)|migration (?:plans?|strateg(?:y|ies)|approach|tools?|runs?|waves?|scope|rehearsals?)|data conversion|extract,? transform|etl|conversion (?:of|from) (?:the )?(?:legacy|existing|old))\b/},
        {id: 'reconciliation', label: 'reconciliation of migrated data', required: true, question: 'How are migrated balances and accounts reconciled before go-live?',
          words: /\b(?:reconcil\w*|control totals?|hash totals?|balances? (?:match|agree|tie)|(?:compare|comparison of) (?:the )?(?:balances|accounts|records))\b/},
        {id: 'coexistence', label: 'coexistence and cut-over', required: true, check: plateau, question: 'How do the old and new platforms run side by side, and how is a failed cut-over rolled back?',
          words: /\b(?:coexist\w*|co-exist\w*|parallel runs?|cut[- ]?overs?|go[- ]live (?:plans?|readiness|criteria|dates?|checklists?|rehearsals?|decisions?)|big[- ]bang|phased (?:roll[- ]?outs?|migrations?|cut[- ]?overs?)|strangler|fall[- ]?backs?|roll[- ]?backs?|transition (?:plans?|states?|architecture|plateaus?))\b/},
        {id: 'rehearsal', label: 'rehearsals', required: false, question: 'How many rehearsals of the migration are planned, and what must each prove?',
          words: /\b(?:rehears\w*|mock (?:migrations?|cut[- ]?overs?|conversions?)|dry[- ]runs?|trial (?:migrations?|runs?|conversions?))\b/},
        {id: 'decommission', label: 'switching off the current platform', required: false, question: 'When is the current platform switched off, and what happens to its data?',
          words: /\b(?:decommission\w*|retir\w* (?:the )?(?:legacy|old|existing|current)|sunset\w*|archiv\w* (?:the )?(?:legacy|old))\b/}
      ]},
    // 17. Operational support and reconciliation. Cues: reconciliation, operations, support, monitoring, alerts,
    // runbooks, incidents, exception queues, nostro and vostro, SLA, service desk, on call, observability. Facets:
    // reconciliation, monitoring (not transaction monitoring, which is AML), runbooks and support (each alone)
    // (required); exception queues (optional).
    {id: 'operations', title: 'Operations and reconciliation',
      why: 'The platform has to be run every day: reconciled, monitored and supported.',
      lead: 'Who runs the platform day to day, and how are accounts and settlements reconciled?',
      cues: /\b(?:reconcil\w*|operations?|operational|support|monitor\w*|alert\w*|runbooks?|incidents?|exception (?:queues?|handling|management|reports?)|nostro|vostro|sla|service desk|on[- ]call|observab\w*|dashboards?)\b/,
      facets: [
        {id: 'reconciliation', label: 'daily reconciliation', required: true, alone: true, question: 'Which reconciliations run each day (ledger, switch, nostro), and who clears the breaks?',
          words: /\b(?:reconcil\w*|nostro|vostro|matching (?:engine|process|rules?)|break (?:management|resolution)|unmatched (?:items|entries|transactions))\b/},
        {id: 'monitoring', label: 'monitoring', required: true, alone: true, kinds: ['plan', 'capability', 'realisation', 'component', 'control', 'environment', 'decision'], question: 'How does the operations team know a part is failing before customers do?',
          words: /(?:(?<!transaction )\bmonitor\w*|\balert\w*|\bobservab\w*|\bdashboards?\b|\btelemetry\b|\bheartbeats?\b|\bhealth checks?\b)/},
        {id: 'support', label: 'runbooks and support', required: true, alone: true, question: 'Which runbooks cover end of day, failures and recovery, and who is on call?',
          words: /\b(?:runbooks?|support (?:models?|teams?|desk|tiers?|levels?|process\w*)|incident (?:management|response|process\w*)|on[- ]call|service desk|operations (?:teams?|manuals?|procedures?)|escalation (?:paths?|matrix|process\w*))\b/},
        {id: 'exceptions', label: 'exception queues', required: false, question: 'Where do failed or rejected items wait, and who works them?',
          words: /\b(?:exception (?:queues?|handling|management|reports?)|repair queues?|manual (?:intervention|repair)|pending (?:items|queues?))\b/}
      ]}
  ]
};
