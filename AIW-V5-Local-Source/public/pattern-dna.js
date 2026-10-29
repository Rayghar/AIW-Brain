// Pattern DNA (rc39, PLAN §4.1): the knowledge that links an architecture driver to the design questions it opens, the
// decision methods and options that answer each, the playbook tactics, patterns and styles that bear on it, and the
// caution the playbook records. It is the owner's "when do I …" table: when a read copy (cache), which store, whether
// to shard, when a durable queue, a reverse proxy or a load balancer, where a circuit breaker and bulkhead belong,
// idempotency, throttling, observability, recovery, protection, and which style.
//
// Every rule is descriptive. A rule opens a question for a record when its trigger holds; it never chooses an option.
// The options are the existing methods' options (read-design-knowledge.js, persistence-knowledge.js,
// composition-knowledge.js, architecture-knowledge.js), so "Decide" lands in the same Conditions → Compare → Place →
// Verify comparison the Companion already runs. The tactic, pattern and style ids are the SA Playbook's
// (playbook-knowledge.js); pattern-dna-validate.mjs pins that every id here exists there. The posture is the
// playbook's own: user-supplied methodology and inspected vendor documentation; applicability to a project is a
// reading for the architect, never an approval.
import {ATTRIBUTES, FAMILIES, TACTICS, PATTERNS, STYLES, ANTI_PATTERNS} from './playbook-knowledge.js';

export const PATTERN_DNA = Object.freeze({
  id: 'AIW-PATTERN-DNA-1', version: 1, title: 'Pattern DNA',
  posture: 'Descriptive knowledge: a driver opens a design question; the architect decides it through the recorded comparison. Nothing here approves, selects or scores.',
  basis: ['SA Playbook (quality attributes, tactics, patterns, styles, anti-patterns)', 'The inspected references of the read, persistence, interaction and composition methods']
});

// Target shapes: what a quality driver's measurable target is about, read from its metric, unit and response words.
// A driver without a measurable target still has a category; a shape refines the question's wording and trigger.
export const TARGET_SHAPES = Object.freeze([
  {id: 'latency', words: 'a response-time or acknowledgement target', test: /latenc|respon(se|d) time|acknowledg|p9\d|percentile|within \d|seconds|millisecond|\bms\b/i},
  {id: 'throughput', words: 'a rate or volume-per-time target', test: /per second|per minute|per hour|\btps\b|throughput|requests? per|transactions? per|messages? per/i},
  {id: 'availability', words: 'an availability or uptime target', test: /availab|uptime|\d+(\.\d+)? ?%.*(month|year|window)|intake available|stays? up/i},
  {id: 'growth', words: 'a growth, volume or retention target', test: /growth|grow|volume|records? (per|a) (day|month|year)|\btb\b|\bgb\b|million|years? of|retain(ed)? for/i},
  {id: 'integrity', words: 'an exactly-once or no-duplicate target', test: /exactly|duplicate|extra debit|one financial|once|double|idempoten|consisten/i},
  {id: 'recovery', words: 'a recovery-time or data-loss target', test: /\brpo\b|\brto\b|recover|restore|minutes? to|data loss|lost (transactions?|records?)/i},
  {id: 'protection', words: 'an unauthorised-access or exposure target', test: /unauthori[sz]ed|breach|exposure|leak|forbidden|denied|zero .*operations/i},
  {id: 'trail', words: 'a traceability or audit target', test: /trail|audit|trace|correlat|reconcil|evidence/i}
]);

export function targetShape(driver) {
  const text = [driver?.metric, driver?.unit, driver?.response, driver?.title].filter(Boolean).join(' ');
  for (const s of TARGET_SHAPES) if (s.test.test(text)) return s.id;
  return null;
}

// Facts a question asks of the record it lands on (three-valued in the projection: true, false, or unknown when the
// model does not say). The projection derives them from the canonical records; the words explain them to a person.
export const RECORD_FACTS = Object.freeze({
  reads: 'reads data it does not own, or serves reads of its own data',
  writes: 'is the authority for data it writes',
  remote: 'calls another component or an external participant synchronously',
  exposed: 'is called by an external participant',
  handsOff: 'hands work to another component after a commit',
  stateful: 'holds state that must survive a restart',
  worker: 'processes work from a queue or a schedule'
});

const Q = (id, o) => Object.freeze({id, ...o});

// The design questions. `trigger` is three-valued over the drivers reaching the record and the record's facts:
// `attributes` (any of the quality types), `shapes` (any of the target shapes, when the driver has one), `kinds` (any
// of the driver kinds beyond quality), `facts` (every fact must hold; unknown keeps the question "to confirm").
// `decide` says where the question is decided: a method topic the Companion runs for the record, or a chapter whose
// own record answers it. `answers` names what the projection reads as an answer, in order of authority.
export const DESIGN_QUESTIONS = Object.freeze([
  Q('read-path', {
    title: 'Read from the authority or keep a bounded read copy?',
    question: 'When a response-time or load target is read-heavy, a disposable read copy (a cache) can meet it; a copy adds staleness, invalidation and a second failure mode. Which does this component need?',
    chapter: 5,
    trigger: {attributes: ['performance', 'scalability', 'availability'], shapes: ['latency', 'throughput'], facts: ['reads']},
    decide: {topic: 'reads', options: ['direct-read', 'cache-aside']},
    products: ['Redis', 'Memcached'],
    answers: ['task:reads', 'need:caching', 'realization:caching'],
    tactics: ['T-PF-CACHE', 'T-PF-DEMAND', 'D-PF-1'],
    patterns: [], styles: [],
    caution: 'A cache is never a write authority; a stale read that the business cannot tolerate is a correctness fault, not a performance gain.',
    sources: [{title: 'SA Playbook · Performance tactics', locator: 'Architectural Tactics'}, {title: 'Cache-Aside, inspected reference of the read method', locator: 'read-design-knowledge.js · MS-CACHE-ASIDE'}]
  }),
  Q('persistence', {
    title: 'Relational records or an aggregate document, and which product?',
    question: 'A transaction-integrity or data driver fixes the transaction scope; the scope decides between relational records and an aggregate document, and the product comparison (PostgreSQL, MySQL or another) follows from the facts the project records. What does this component’s authoritative data need?',
    chapter: 5,
    trigger: {attributes: ['integrity', 'traceability', 'recoverability', 'performance'], kinds: ['data'], facts: ['writes']},
    decide: {topic: 'persistence', options: ['relational-transaction', 'aggregate-document']},
    products: ['PostgreSQL', 'MySQL', 'MongoDB'],
    answers: ['task:persistence', 'need:transactional', 'realization:transactional'],
    tactics: ['T-AV-ROLLBACK', 'T-AV-TIMESTAMP'],
    patterns: ['P-CHECK-POINTED-SYSTEM'], styles: [],
    caution: 'Choosing the product before the transaction scope is a known cause of rework: the scope is the fact, the product is the consequence.',
    sources: [{title: 'Persistence method, inspected references', locator: 'persistence-knowledge.js'}, {title: 'SA Playbook · Availability tactics (rollback, timestamp)', locator: 'Architectural Tactics'}]
  }),
  Q('partitioning', {
    title: 'One owned store or horizontal shards?',
    question: 'A growth or throughput target beyond what one tuned store can carry, or a locality or isolation constraint, is the only reason to shard; shards add a partition key, cross-partition reads, routing ownership and rebalancing. Does this data responsibility need them?',
    chapter: 5,
    trigger: {attributes: ['scalability', 'performance', 'capacity'], shapes: ['growth', 'throughput'], kinds: ['constraint', 'data'], facts: ['writes']},
    decide: {topic: 'partitioning', options: ['single-partition', 'sharded']},
    products: [],
    answers: ['task:partitioning'],
    tactics: ['D-SC-1', 'D-SC-2', 'D-SC-3'],
    patterns: [], styles: [],
    caution: 'Sharding for a forecast that the project has not recorded is premature; keep one store until the pressure is a recorded fact.',
    sources: [{title: 'Data partitioning method', locator: 'composition-knowledge.js · partitioning'}, {title: 'SA Playbook · Scalability decisions', locator: 'Architectural Tactics'}]
  }),
  Q('handoff', {
    title: 'Complete in the request or accept now and complete later through a durable queue?',
    question: 'When the final business result need not arrive in the response, or intake must survive a slow or absent processor, a durable queue levels the load and keeps the work; it adds delayed completion, a broker, backlog limits and duplicate protection. Which does this hand-off need?',
    chapter: 5,
    trigger: {attributes: ['availability', 'performance', 'integrity', 'scalability'], shapes: ['latency', 'availability', 'throughput', 'integrity'], facts: ['handsOff']},
    decide: {topic: 'interaction', options: ['request-reply', 'durable-queue']},
    products: ['Kafka', 'RabbitMQ'],
    answers: ['task:interaction', 'task:delivery', 'need:messaging', 'realization:messaging', 'decision:processing'],
    tactics: ['T-PF-SCHED', 'T-AV-DEGRADATION'],
    patterns: ['P-MEDIATOR', 'P-OBSERVER'], styles: [],
    caution: 'A queued acknowledgement is not a business result; the caller must be told which it received.',
    sources: [{title: 'Interaction method (request/reply, queue-based load leveling)', locator: 'architecture-knowledge.js · MS-QUEUE-LEVELING'}, {title: 'Publication method (direct, publish, outbox)', locator: 'composition-knowledge.js · delivery'}]
  }),
  Q('edge', {
    title: 'One endpoint, a reverse proxy, a balanced pool, or both?',
    question: 'A boundary that external callers reach needs edge policy (TLS, authentication, rate limits, routing: a reverse proxy) and, when one instance cannot carry the demand or the availability target, distribution across instances (a load balancer). They are separate responsibilities one product may carry. What does this boundary need?',
    chapter: 5,
    trigger: {attributes: ['availability', 'security', 'scalability', 'performance'], shapes: ['availability', 'throughput', 'protection'], facts: ['exposed']},
    decide: {topic: 'distribution', options: ['single-endpoint', 'reverse-proxy', 'balanced-pool', 'proxy-balanced-pool']},
    products: ['NGINX', 'Kong'],
    answers: ['task:distribution', 'need:connectivity', 'realization:connectivity'],
    tactics: ['D-AV-1', 'D-SC-4', 'T-SE-LIMIT'],
    patterns: ['P-FACADE', 'P-THROTTLING'], styles: [],
    caution: 'A load balancer does not make one failing backend available; it distributes what the backends can carry.',
    sources: [{title: 'Traffic and edge roles method', locator: 'composition-knowledge.js · distribution'}, {title: 'SA Playbook · Load balancing, limit exposure', locator: 'Architectural Tactics'}]
  }),
  Q('protected-call', {
    title: 'Bound each remote call, or isolate it and break the circuit?',
    question: 'An availability target with a remote dependency needs every call bounded (a deadline, classified retries); when a dependency can fail for long or its slowness can exhaust a shared pool, isolation (a bulkhead) and a circuit breaker belong at the caller. Which does this component’s calls need?',
    chapter: 5,
    trigger: {attributes: ['availability', 'performance', 'recoverability'], shapes: ['availability', 'latency'], facts: ['remote']},
    decide: {topic: 'resilience', options: ['bounded-call', 'protected-call']},
    products: [],
    answers: ['task:resilience', 'contract:timeout', 'need:connectivity'],
    tactics: ['T-AV-DEGRADATION', 'T-AV-HEARTBEAT', 'T-AV-REMOVAL'],
    patterns: ['P-PROTECTED-SYSTEM'], styles: [],
    caution: 'A retry without a deadline and an idempotent receiver turns one failure into many; the policy belongs to the caller and must be operated.',
    sources: [{title: 'Resilience method (bounded call, circuit breaker, bulkhead)', locator: 'composition-knowledge.js · resilience'}, {title: 'SA Playbook · Availability tactics', locator: 'Architectural Tactics'}]
  }),
  Q('idempotency', {
    title: 'How is a repeated instruction kept from a repeated effect?',
    question: 'An exactly-once or no-duplicate target means every entry point that can be retried needs an idempotency key or atomic deduplication, recorded in the contract. Which contracts into this component carry it?',
    chapter: 8,
    trigger: {attributes: ['integrity'], shapes: ['integrity'], facts: ['exposed']},
    decide: {chapter: 8, record: 'contract'},
    products: [],
    answers: ['contract:idempotency', 'decision:integrity'],
    tactics: ['T-AV-TIMESTAMP'],
    patterns: [], styles: [],
    caution: 'Deduplication inside the processor protects one path; a retry that reaches a different instance needs the key in the contract.',
    sources: [{title: 'Interaction method · controlled repeated business effects', locator: 'architecture-knowledge.js · durable-queue applicability'}]
  }),
  Q('throttling', {
    title: 'Where is demand admitted, limited and shed?',
    question: 'A throughput or availability target with external callers needs an admission limit (rate limiting, backlog bounds) so that peak demand degrades the service predictably rather than failing it. Where is it applied for this boundary?',
    chapter: 8,
    trigger: {attributes: ['availability', 'scalability', 'performance'], shapes: ['throughput', 'availability'], facts: ['exposed']},
    decide: {topic: 'distribution', options: ['reverse-proxy', 'proxy-balanced-pool']},
    products: ['Kong', 'NGINX'],
    answers: ['task:distribution', 'contract:admission'],
    tactics: ['T-PF-DEMAND', 'T-AV-DEGRADATION'],
    patterns: ['P-THROTTLING'], styles: [],
    caution: 'A limit without a stated degraded behaviour is an outage with a nicer name.',
    sources: [{title: 'SA Playbook · Throttling pattern', locator: 'Architectural Patterns'}]
  }),
  Q('observability', {
    title: 'How will the trail, the signals and the alarms be produced?',
    question: 'A traceability or availability target is only testable when every component emits correlated evidence (traces, metrics, logs) and someone is alerted on the target’s breach. Which capability gives this component that?',
    chapter: 6,
    trigger: {attributes: ['traceability', 'availability', 'recoverability', 'operability'], kinds: ['operational']},
    decide: {chapter: 6, record: 'need', category: 'observability'},
    products: ['OpenTelemetry'],
    answers: ['need:observability', 'realization:observability'],
    tactics: ['D-AV-2', 'T-SE-DETECT', 'T-AV-HEARTBEAT'],
    patterns: [], styles: [],
    caution: 'Logs without a correlation key do not make a trail; the key is a contract fact, not an operations afterthought.',
    sources: [{title: 'SA Playbook · Monitoring and alerting', locator: 'Architectural Tactics'}]
  }),
  Q('recovery', {
    title: 'How is state recovered within the recovery target?',
    question: 'A recovery-time or data-loss target needs recoverable state copies and a rehearsed restore (checkpoint, standby or failover) whose time fits the target. What gives this component’s state that?',
    chapter: 10,
    trigger: {attributes: ['recoverability', 'availability'], shapes: ['recovery', 'availability'], kinds: ['business-continuity'], facts: ['stateful']},
    decide: {chapter: 10, record: 'plan'},
    products: ['pgBackRest', 'Patroni'],
    answers: ['need:backup', 'need:recovery', 'realization:backup', 'plan:recovery'],
    tactics: ['T-AV-REDUNDANCY', 'T-AV-ROLLBACK', 'D-AV-3'],
    patterns: ['P-CHECK-POINTED-SYSTEM', 'P-STANDBY'], styles: [],
    caution: 'A backup that has not been restored in rehearsal is a hope; the target is met by the restore, not the copy.',
    sources: [{title: 'SA Playbook · Check-pointed System, Standby', locator: 'Architectural Patterns'}]
  }),
  Q('protection', {
    title: 'Which control enforces the protection target at this boundary?',
    question: 'A security or privacy target names a threat; the control that counters it (identity and consent, secure communication, validation, limiting exposure) must be recorded against the component or contract it protects, with its failure mode. Which control protects this component?',
    chapter: 9,
    trigger: {attributes: ['security', 'privacy', 'compliance'], shapes: ['protection'], facts: ['exposed']},
    decide: {chapter: 9, record: 'control'},
    products: ['Keycloak'],
    answers: ['control:target', 'need:identity', 'realization:identity'],
    tactics: ['T-SE-VALIDATE', 'T-SE-LIMIT', 'T-SE-DETECT'],
    patterns: ['P-PROTECTED-SYSTEM', 'P-SECURE-COMMUNICATION'], styles: [],
    caution: 'An unavailable control is not permission; the failure mode must be recorded with the control.',
    sources: [{title: 'SA Playbook · Security tactics and patterns', locator: 'Architectural Tactics; Architectural Patterns'}]
  }),
  Q('structure', {
    title: 'Which responsibilities share one deployment boundary?',
    question: 'Maintainability, deployability and independent scaling decide whether responsibilities stay in one modular application or become separately deployed services; the playbook’s style questions weigh it. Which style fits this part of the design?',
    chapter: 5,
    trigger: {attributes: ['maintainability', 'deployability', 'scalability', 'testability'], kinds: ['technology-evolution', 'business']},
    decide: {topic: 'structure', options: ['layered-module', 'service-boundaries']},
    products: [],
    answers: ['task:structure', 'decision:structure'],
    tactics: ['T-MD-SEM', 'T-MD-HIDE', 'T-MD-PATH', 'D-DP-1'],
    patterns: ['P-STRANGLER', 'P-FACADE'], styles: ['S-MODMONO', 'S-MICROSERVICES', 'S-LAYERED', 'S-SOA'],
    caution: 'Tight coupling and god services (the playbook’s anti-patterns) follow a split made for fashion rather than for a recorded ownership, scaling or release need.',
    sources: [{title: 'Structure method', locator: 'composition-knowledge.js · structure'}, {title: 'SA Playbook · Architecture style suitability assessment', locator: 'Arch Style Suitability Ass'}]
  })
]);

export const QUESTION_INDEX = Object.freeze(Object.fromEntries(DESIGN_QUESTIONS.map(q => [q.id, q])));

const byId = xs => new Map((Array.isArray(xs) ? xs : Object.values(xs || {})).map(x => [x.id, x]));
const tacticIndex = byId(TACTICS), patternIndex = byId(PATTERNS), styleIndex = byId(STYLES), attributeIndex = byId(ATTRIBUTES), familyIndex = byId(FAMILIES);

// The playbook entries a question names, resolved (for the readings and Sol's packet).
export function questionKnowledge(id) {
  const q = QUESTION_INDEX[id]; if (!q) return null;
  return {
    tactics: q.tactics.map(t => tacticIndex.get(t)).filter(Boolean).map(t => ({id: t.id, name: t.name, attribute: t.attribute, concept: t.concept, src: t.src})),
    patterns: q.patterns.map(x => patternIndex.get(x)).filter(Boolean).map(x => ({id: x.id, name: x.name, text: x.text, src: x.src})),
    styles: q.styles.map(x => styleIndex.get(x)).filter(Boolean).map(x => ({id: x.id, name: x.name})),
    antiPatterns: q.id === 'structure' ? (Array.isArray(ANTI_PATTERNS) ? ANTI_PATTERNS : Object.values(ANTI_PATTERNS)).map(a => ({id: a.id, name: a.name})) : []
  };
}

// The attribute and family a quality driver belongs to in the playbook, with the tactics the playbook lists for it.
export function attributeOf(category) {
  const a = attributeIndex.get(category);
  const family = a ? familyIndex.get(a.family) : null;
  const tactics = (Array.isArray(TACTICS) ? TACTICS : Object.values(TACTICS)).filter(t => t.attribute === category).map(t => ({id: t.id, name: t.name, group: t.group}));
  return {id: category, name: a?.name || category, family: family ? {id: family.id, name: family.name, question: family.question} : null, inPlaybook: !!a, tactics};
}

// Whether a question's trigger holds for one driver's reading (attribute, shape, kind). Facts are the projection's.
export function driverOpens(question, reading) {
  const t = question.trigger;
  if (reading.kind && reading.kind !== 'quality') return (t.kinds || []).includes(reading.kind);
  if (!(t.attributes || []).includes(reading.category)) return false;
  if (t.shapes && t.shapes.length && reading.shape) return t.shapes.includes(reading.shape);
  return true;
}
