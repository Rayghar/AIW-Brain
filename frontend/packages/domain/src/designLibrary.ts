import type {
  ArchitectureStage,
  DesignLibraryRecord,
  DesignPortDefinition,
  DesignPropertyDefinition,
  EntityKind,
  KnowledgeLibrary,
  RelationshipKind,
} from './types.js';
import { patternDnaTopologyTemplates } from './patternDnaVisualBridge.js';
import {
  patternDnaAntiPatternRecords,
  patternDnaComponentArchetypeRecords,
  patternDnaPatternTooling,
} from './patternDnaToolsetBridge.js';

const bidirectionalPorts: DesignPortDefinition[] = [
  { id: 'in', label: 'Input', direction: 'input', relationshipKinds: ['communicatesWith','dependsOn','subscribes','reads','writes'], semanticTypes: ['request','command','event','data'], position: 'left' },
  { id: 'out', label: 'Output', direction: 'output', relationshipKinds: ['communicatesWith','dependsOn','publishes','reads','writes'], semanticTypes: ['response','command','event','data'], position: 'right' },
];

const eventPorts: DesignPortDefinition[] = [
  { id: 'publisher', label: 'Publisher', direction: 'input', relationshipKinds: ['publishes'], semanticTypes: ['event'], position: 'left' },
  { id: 'subscriber', label: 'Subscriber', direction: 'output', relationshipKinds: ['subscribes'], semanticTypes: ['event'], position: 'right' },
];

const dataPorts: DesignPortDefinition[] = [
  { id: 'read', label: 'Read', direction: 'input', relationshipKinds: ['reads','stores'], semanticTypes: ['query','data'], position: 'left' },
  { id: 'write', label: 'Write', direction: 'input', relationshipKinds: ['writes','stores'], semanticTypes: ['command','data'], position: 'right' },
];

function evidenceFor(category: string, tags: string[], recordType: 'component' | 'pattern' | 'anti-pattern' | 'style' | 'template'): string[] {
  const values = new Set<string>(['SRC-INTERNAL-PRINCIPLES']);
  if (recordType === 'style') values.add('SRC-SEI-QAW');
  if (recordType === 'component') { values.add('SRC-ISO-42010'); values.add('SRC-C4'); }
  const haystack = new Set([category, ...tags].map((value) => value.toLowerCase()));
  if ([...haystack].some((value) => /api|interface/.test(value))) values.add('SRC-OPENAPI');
  if ([...haystack].some((value) => /security|identity|auth/.test(value))) { values.add('SRC-OWASP-ASVS'); values.add('SRC-NIST-SSDF'); }
  if ([...haystack].some((value) => /observability|telemetry|tracing|logging|metrics/.test(value))) values.add('SRC-OTEL');
  if ([...haystack].some((value) => /integration|resilience|deployment|data|operations|cloud|messaging|cache/.test(value))) { values.add('SRC-AWS-WAF'); values.add('SRC-AZURE-AAC'); values.add('SRC-GCP-WAF'); }
  return [...values];
}


function enumProperty(key: string, label: string, description: string, values: string[], defaultValue?: string): DesignPropertyDefinition {
  return { key, label, type: 'enum', description, ...(defaultValue ? { defaultValue } : {}), options: values.map((value) => ({ label: value.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase()), value })) };
}

function specialistProperties(kind: EntityKind, category: string, tags: string[], defaultProperties: Record<string, unknown>): DesignPropertyDefinition[] {
  const tagSet = new Set([category, ...tags].map((value) => value.toLowerCase()));
  const properties: DesignPropertyDefinition[] = [
    { key: 'owner', label: 'Owning team', type: 'text', description: 'Accountable team or role for this architecture element.', required: true },
    enumProperty('lifecycleStatus', 'Lifecycle status', 'Current lifecycle state of the element.', ['proposed','active','retiring'], 'proposed'),
    { key: 'evidenceReference', label: 'Evidence reference', type: 'text', description: 'ADR, requirement, standard or source claim supporting this element.' },
  ];
  const has = (...values: string[]) => values.some((value) => tagSet.has(value) || [...tagSet].some((tag) => tag.includes(value)));
  const add = (...items: DesignPropertyDefinition[]) => properties.push(...items);

  if (kind === 'API' || kind === 'Interface' || has('api','interface','integration','gateway','webhook','grpc','graphql')) add(
    enumProperty('protocol', 'Protocol', 'Transport or interaction protocol.', ['REST','gRPC','GraphQL','HTTPS','SFTP','AMQP','Kafka','provider-neutral'], String(defaultProperties.protocol ?? 'provider-neutral')),
    { key: 'contractVersion', label: 'Contract version', type: 'text', description: 'Version of the API, event or interface contract.', required: true, defaultValue: '1.0' },
    enumProperty('authentication', 'Authentication', 'Identity mechanism used by the interface.', ['none','OIDC','OAuth2','mTLS','API-key','SPIFFE','provider-neutral'], 'provider-neutral'),
    { key: 'authorization', label: 'Authorization policy', type: 'text', description: 'Policy, role or scope required to use the interface.' },
    { key: 'timeoutMs', label: 'Timeout (ms)', type: 'number', description: 'Maximum request or operation duration.', min: 1, defaultValue: Number(defaultProperties.timeoutMs ?? 3000) },
    { key: 'retryPolicy', label: 'Retry policy', type: 'text', description: 'Retry limits, backoff and retryable conditions.' },
    { key: 'idempotency', label: 'Idempotency', type: 'text', description: 'Idempotency key and duplicate-handling semantics.' },
    enumProperty('dataClassification', 'Data classification', 'Highest data classification carried by the interface.', ['public','internal','confidential','restricted'], 'internal'),
  );

  if (kind === 'Event' || has('event','messaging','stream','queue','broker','producer','consumer','schema')) add(
    { key: 'schemaRef', label: 'Schema reference', type: 'text', description: 'AsyncAPI, JSON Schema, Avro or protobuf contract reference.', required: true },
    enumProperty('deliveryGuarantee', 'Delivery guarantee', 'Expected delivery semantics.', ['at-most-once','at-least-once','effectively-once'], String(defaultProperties.deliveryGuarantee ?? 'at-least-once')),
    enumProperty('ordering', 'Ordering', 'Ordering scope guaranteed to consumers.', ['none','partition','global'], 'partition'),
    { key: 'partitionKey', label: 'Partition key', type: 'text', description: 'Key used to preserve locality and ordering.' },
    { key: 'retentionHours', label: 'Retention (hours)', type: 'number', description: 'Duration messages remain available for replay.', min: 0, defaultValue: Number(defaultProperties.retentionHours ?? 24) },
    { key: 'deadLetterPolicy', label: 'Dead-letter policy', type: 'multiline', description: 'Routing, ownership, retention and replay rules for failed messages.' },
    { key: 'replayPolicy', label: 'Replay policy', type: 'multiline', description: 'Who can replay, from where and with which safeguards.' },
  );

  if (kind === 'DataDomain' || kind === 'DataEntity' || kind === 'DataStore' || has('data','database','storage','cache','analytics','warehouse','lake')) add(
    enumProperty('dataClassification', 'Data classification', 'Sensitivity of data owned or stored.', ['public','internal','confidential','restricted'], 'internal'),
    enumProperty('consistency', 'Consistency model', 'Consistency and transaction semantics.', ['strong','bounded-staleness','eventual','tunable'], String(defaultProperties.consistency ?? 'strong')),
    { key: 'retentionDays', label: 'Retention (days)', type: 'number', description: 'Required data retention period.', min: 0, defaultValue: Number(defaultProperties.retentionDays ?? 30) },
    { key: 'residency', label: 'Residency / sovereignty', type: 'text', description: 'Permitted regions, jurisdictions or sovereignty constraints.' },
    enumProperty('encryption', 'Encryption', 'Encryption requirements for data at rest and in transit.', ['at-rest-and-in-transit','at-rest','in-transit','provider-default'], 'at-rest-and-in-transit'),
    { key: 'backupPolicy', label: 'Backup policy', type: 'multiline', description: 'Backup frequency, retention and restore validation.' },
    { key: 'rpo', label: 'RPO', type: 'text', description: 'Recovery point objective.' },
    { key: 'rto', label: 'RTO', type: 'text', description: 'Recovery time objective.' },
  );

  if (kind === 'Control' || has('security','identity','auth','kms','waf','policy','trust')) add(
    { key: 'controlObjective', label: 'Control objective', type: 'multiline', description: 'Threat, policy or compliance objective enforced by this control.', required: true },
    { key: 'enforcementPoint', label: 'Enforcement point', type: 'text', description: 'Where the control is evaluated and enforced.' },
    { key: 'identityBoundary', label: 'Identity / trust boundary', type: 'text', description: 'Identity domain or trust zone governed by the control.' },
    { key: 'keyRotationDays', label: 'Key rotation (days)', type: 'number', description: 'Maximum rotation interval for applicable keys or credentials.', min: 1, defaultValue: 90 },
    { key: 'auditEvidence', label: 'Audit evidence', type: 'multiline', description: 'Logs, attestations or control evidence required for assurance.' },
  );

  if (kind === 'Runtime' || kind === 'DeploymentNode' || kind === 'TechnologyProduct' || kind === 'TechnologyComponent' || has('runtime','compute','deployment','cluster','container','serverless','product')) add(
    enumProperty('workloadType', 'Workload type', 'Execution model of the workload.', ['service','worker','batch','function','stateful','platform'], 'service'),
    enumProperty('scalingModel', 'Scaling model', 'How capacity is increased or reduced.', ['fixed','horizontal','vertical','event-driven','scheduled'], 'horizontal'),
    { key: 'replicas', label: 'Minimum replicas', type: 'number', description: 'Minimum concurrently available replicas.', min: 0, defaultValue: Number(defaultProperties.replicas ?? 2) },
    { key: 'availabilityZones', label: 'Availability zones', type: 'number', description: 'Independent failure domains used by the workload.', min: 1, defaultValue: Number(defaultProperties.availabilityZones ?? 2) },
    enumProperty('deploymentStrategy', 'Deployment strategy', 'Release strategy used for this workload.', ['rolling','blue-green','canary','recreate'], 'rolling'),
    { key: 'healthContract', label: 'Health contract', type: 'text', description: 'Readiness, liveness and dependency-health endpoints or probes.' },
    { key: 'patchingCadence', label: 'Patching cadence', type: 'text', description: 'Expected platform and runtime patching cadence.' },
  );

  if (has('observability','telemetry','monitoring','logs','metrics','tracing','synthetic')) add(
    { key: 'telemetrySignals', label: 'Telemetry signals', type: 'text', description: 'Metrics, logs, traces, events and profiles emitted.' },
    { key: 'samplingPolicy', label: 'Sampling policy', type: 'text', description: 'Trace, log or event sampling and tail-sampling rules.' },
    { key: 'sloRef', label: 'SLO reference', type: 'text', description: 'Service-level objective measured by this capability.' },
    { key: 'alertPolicy', label: 'Alert policy', type: 'multiline', description: 'Burn-rate, threshold and ownership rules for alerts.' },
  );

  if (kind === 'NetworkZone' || kind === 'Region' || kind === 'AvailabilityZone' || has('network','zone','egress','ingress','firewall','mesh')) add(
    { key: 'trustZone', label: 'Trust zone', type: 'text', description: 'Security zone and trust assumptions for the boundary.' },
    { key: 'ingressPolicy', label: 'Ingress policy', type: 'multiline', description: 'Permitted inbound flows and enforcement controls.' },
    { key: 'egressPolicy', label: 'Egress policy', type: 'multiline', description: 'Permitted outbound flows and enforcement controls.' },
    { key: 'encryptionInTransit', label: 'Encryption in transit', type: 'boolean', description: 'Whether all boundary crossings require encrypted transport.', defaultValue: true },
  );

  if (kind === 'Domain' || kind === 'Capability' || kind === 'LogicalService' || kind === 'ApplicationComponent' || kind === 'Module' || kind === 'DeployableUnit') add(
    { key: 'responsibility', label: 'Primary responsibility', type: 'multiline', description: 'Single, testable architectural responsibility of the element.', required: true },
    { key: 'boundedContext', label: 'Bounded context', type: 'text', description: 'Domain language and ownership boundary containing the element.' },
    { key: 'changeCadence', label: 'Change cadence', type: 'text', description: 'Expected independent change and release frequency.' },
  );

  const inferredType = (value: unknown): DesignPropertyDefinition['type'] => typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text';
  for (const [key, value] of Object.entries(defaultProperties)) {
    if (properties.some((item) => item.key === key)) continue;
    properties.push({ key, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()), type: inferredType(value), description: `Governed ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} attribute.`, defaultValue: value });
  }
  return properties.filter((item, index, all) => all.findIndex((candidate) => candidate.key === item.key) === index);
}

function component(
  id: string,
  name: string,
  kind: EntityKind,
  stages: ArchitectureStage[],
  category: string,
  description: string,
  icon: string,
  shape: DesignLibraryRecord['depiction']['shape'],
  tags: string[],
  defaultProperties: Record<string, unknown> = {},
  ports: DesignPortDefinition[] = bidirectionalPorts,
): DesignLibraryRecord {
  return {
    id, recordType: 'component', name, category, description, applicableStages: stages,
    applicableViewpoints: [category, 'application'], maturity: 'mature', approvalStatus: 'approved',
    owner: 'Architecture Knowledge Council', version: '0.8.6', tags,
    depiction: { renderer: `${kind}Renderer`, icon, shape, defaultSize: { width: shape === 'boundary' ? 340 : 230, height: shape === 'boundary' ? 220 : 118 }, canContainChildren: shape === 'boundary', ports, previewKind: category, notationMappings: { c4: kind, archimate: kind, custom: kind } },
    properties: specialistProperties(kind, category, tags, defaultProperties), qualityAttributeImpact: {}, whenToUse: [], whenToQuestion: [], requires: [], recommends: [], pairsWellWith: [], conflictsWith: [], obligations: [], risks: [], mitigations: [], evidenceIds: evidenceFor(category, tags, 'component'), componentKind: kind, defaultProperties,
  };
}

export const coreComponentLibrary: DesignLibraryRecord[] = [
  component('COMP-ACTOR','Actor','Actor',['logicalApplication'],'application','A person, role or persona that interacts with the system.','user','actor',['actor','external']),
  component('COMP-EXTERNAL-SYSTEM','External System','ExternalSystem',['logicalApplication'],'integration','A system outside the design boundary.','external-link','card',['external','integration']),
  component('COMP-DOMAIN','Business Domain','Domain',['logicalApplication'],'application','A cohesive business area containing related capabilities and services.','layers','boundary',['domain','boundary']),
  component('COMP-LOGICAL-SERVICE','Logical Service','LogicalService',['logicalApplication'],'application','A technology-neutral business or application responsibility.','boxes','card',['service','logical']),
  component('COMP-EVENT','Domain Event','Event',['logicalApplication','applicationRealization'],'integration','A fact published by one responsibility and consumed by others.','radio','event',['event','async'],{ deliveryGuarantee: 'at-least-once', schemaVersion: '1.0' },eventPorts),
  component('COMP-DEPLOYABLE','Deployable Unit','DeployableUnit',['applicationRealization'],'application','An independently buildable and deployable application unit.','package','card',['deployable','runtime'],{ runtime: 'TBD', stateless: true }),
  component('COMP-API','Application API','API',['applicationRealization'],'integration','A synchronous or asynchronous application interface.','plug-zap','card',['api','interface'],{ public: false, protocol: 'REST' }),
  component('COMP-MODULE','Application Module','Module',['applicationRealization'],'application','A cohesive internal module within a deployable application.','component','card',['module','internal']),
  component('COMP-WORKER','Worker Component','ApplicationComponent',['applicationRealization'],'application','A background processor, consumer or scheduled application component.','cog','card',['worker','processor'],{ processingMode: 'asynchronous' }),
  component('COMP-IAM-CONTROL','Identity & Access Control','Control',['applicationRealization','logicalTechnology'],'security','Authentication and authorization responsibility.','shield-check','control',['security','identity'],{ authentication: true, authorization: true }),
  component('COMP-MESSAGE-BROKER','Message Broker Capability','LogicalTechnologyCapability',['logicalTechnology'],'integration','Vendor-neutral reliable message transport and routing capability.','messages-square','infrastructure',['messaging','async'],{ deliveryGuarantee: 'at-least-once', orderingRequired: false, retentionHours: 24 },eventPorts),
  component('COMP-RELATIONAL-DATA','Relational Data Service','LogicalTechnologyCapability',['logicalTechnology'],'data','Vendor-neutral relational persistence capability.','database','cylinder',['data','relational'],{ consistency: 'strong', transactional: true },dataPorts),
  component('COMP-DOCUMENT-DATA','Document Data Service','LogicalTechnologyCapability',['logicalTechnology'],'data','Vendor-neutral document-oriented persistence capability.','database-zap','cylinder',['data','document'],{ consistency: 'tunable' },dataPorts),
  component('COMP-CACHE','Distributed Cache Capability','LogicalTechnologyCapability',['logicalTechnology'],'data','Low-latency distributed cache capability.','timer-reset','infrastructure',['cache','performance'],{ evictionPolicy: 'LRU' },dataPorts),
  component('COMP-API-MANAGEMENT','API Management Capability','LogicalTechnologyCapability',['logicalTechnology'],'integration','Gateway, policy and lifecycle management capability for APIs.','route','infrastructure',['api','gateway']),
  component('COMP-OBSERVABILITY','Observability Capability','LogicalTechnologyCapability',['logicalTechnology'],'operations','Metrics, logs, traces and alerting capability.','activity','infrastructure',['observability','operations']),
  component('COMP-TECH-PRODUCT','Technology Product','TechnologyProduct',['physicalTechnology'],'technology','A specific vendor product or managed service.','box','infrastructure',['product','vendor'],{ vendor: 'TBD', version: 'TBD' }),
  component('COMP-RUNTIME','Runtime','Runtime',['physicalTechnology'],'deployment','A process, container, function or execution runtime.','cpu','infrastructure',['runtime','compute'],{ orchestrated: true }),
  component('COMP-DEPLOYMENT-NODE','Deployment Node','DeploymentNode',['physicalTechnology'],'deployment','A physical or virtual execution node.','server','infrastructure',['compute','deployment'],{ replicas: 2, availabilityZones: 2 }),
  component('COMP-REGION','Region','Region',['physicalTechnology'],'deployment','A cloud or data-centre region boundary.','globe-2','boundary',['region','boundary']),
  component('COMP-AVAILABILITY-ZONE','Availability Zone','AvailabilityZone',['physicalTechnology'],'deployment','An isolated failure domain within a region.','map-pin','boundary',['zone','failure-domain']),
  component('COMP-NETWORK-ZONE','Network Zone','NetworkZone',['physicalTechnology'],'security','A network or trust boundary.','network','boundary',['network','security']),
  component('COMP-DATA-STORE','Managed Data Store','TechnologyProduct',['physicalTechnology'],'data','A concrete database or managed persistence product.','database','cylinder',['database','managed'],{ vendor: 'generic', replicas: 2, availabilityZones: 2 },dataPorts),
  component('COMP-STREAMING-PRODUCT','Managed Event Streaming','TechnologyProduct',['physicalTechnology'],'integration','A concrete managed event-streaming product.','radio-tower','infrastructure',['messaging','managed'],{ vendor: 'generic', replicas: 3 },eventPorts),
];

export const supplementalComponentLibrary: DesignLibraryRecord[] = [
  component("COMP-WEB-CLIENT","Web Client","Actor",["logicalApplication"],"channels","Browser-based user channel.","monitor","actor",["web", "channel"],{"channel": "web"},bidirectionalPorts),
  component("COMP-MOBILE-CLIENT","Mobile Client","Actor",["logicalApplication"],"channels","Native or hybrid mobile user channel.","smartphone","actor",["mobile", "channel"],{"channel": "mobile"},bidirectionalPorts),
  component("COMP-PARTNER-CLIENT","Partner API Client","ExternalSystem",["logicalApplication"],"channels","External partner or ecosystem API consumer.","handshake","card",["partner", "api"],{"trustBoundary": true},bidirectionalPorts),
  component("COMP-BACKOFFICE-UI","Back-office Workspace","Actor",["logicalApplication"],"channels","Internal operations and administration channel.","layout-dashboard","actor",["back-office", "channel"],{"channel": "back-office"},bidirectionalPorts),
  component("COMP-IOT-DEVICE","IoT / Edge Device","ExternalSystem",["logicalApplication"],"channels","Device or edge actor producing commands and telemetry.","radio-receiver","card",["iot", "edge"],{"connectivity": "intermittent"},bidirectionalPorts),
  component("COMP-CLI-CLIENT","CLI / Automation Client","Actor",["logicalApplication"],"channels","Command-line or automation consumer.","terminal","actor",["cli", "automation"],{"channel": "cli"},bidirectionalPorts),
  component("COMP-BOUNDED-CONTEXT","Bounded Context","Domain",["logicalApplication"],"domain","Explicit domain language and ownership boundary.","box-select","boundary",["ddd", "bounded-context"],{"contextMapStatus": "draft"},bidirectionalPorts),
  component("COMP-BUSINESS-CAPABILITY","Business Capability","Capability",["logicalApplication"],"domain","Business outcome or capability served by the architecture.","target","card",["business", "capability"],{"owner": "TBD"},bidirectionalPorts),
  component("COMP-ORCHESTRATOR","Process Orchestrator","LogicalService",["logicalApplication", "applicationRealization"],"application","Coordinates a multi-step business process.","workflow","card",["orchestration", "workflow"],{"compensationRequired": false},bidirectionalPorts),
  component("COMP-WORKFLOW-ENGINE","Workflow Engine","ApplicationComponent",["applicationRealization"],"application","Executes durable workflows and human/system tasks.","git-merge","card",["workflow", "durable"],{"durable": true},bidirectionalPorts),
  component("COMP-SCHEDULER","Scheduler","ApplicationComponent",["applicationRealization"],"application","Triggers recurring or delayed work.","calendar-clock","card",["scheduler", "batch"],{"schedule": "TBD"},bidirectionalPorts),
  component("COMP-BATCH-PROCESSOR","Batch Processor","ApplicationComponent",["applicationRealization"],"application","Processes bounded datasets in scheduled windows.","layers-2","card",["batch", "processor"],{"restartable": true},bidirectionalPorts),
  component("COMP-RULES-ENGINE","Business Rules Engine","ApplicationComponent",["applicationRealization"],"application","Evaluates configurable decision rules.","scale","card",["rules", "decision"],{"ruleVersioning": true},bidirectionalPorts),
  component("COMP-FEATURE-FLAG","Feature Flag Service","ApplicationComponent",["applicationRealization", "logicalTechnology"],"platform","Controls runtime feature exposure and progressive delivery.","toggle-right","card",["feature-flag", "delivery"],{"auditChanges": true},bidirectionalPorts),
  component("COMP-SEARCH-SERVICE","Search Service","LogicalService",["logicalApplication", "applicationRealization"],"application","Provides search, ranking and retrieval responsibilities.","search","card",["search", "retrieval"],{"freshnessTarget": "TBD"},bidirectionalPorts),
  component("COMP-NOTIFICATION-SERVICE","Notification Service","LogicalService",["logicalApplication", "applicationRealization"],"application","Coordinates email, SMS, push and in-app notifications.","bell","card",["notification", "channel"],{"deliveryTracking": true},bidirectionalPorts),
  component("COMP-FILE-PROCESSOR","File Processing Service","ApplicationComponent",["applicationRealization"],"application","Validates, transforms and processes files.","file-cog","card",["file", "batch"],{"malwareScan": true},bidirectionalPorts),
  component("COMP-ANTI-CORRUPTION-LAYER","Anti-corruption Layer","ApplicationComponent",["applicationRealization"],"integration","Protects the domain model from an external or legacy model.","shield","card",["adapter", "legacy", "ddd"],{"translationOwned": true},bidirectionalPorts),
  component("COMP-EDGE-GATEWAY","Edge Gateway","DeployableUnit",["applicationRealization"],"integration","Entry point for external traffic and edge policies.","router","infrastructure",["gateway", "edge"],{"public": true},bidirectionalPorts),
  component("COMP-ESB","Enterprise Integration Bus","LogicalTechnologyCapability",["logicalTechnology"],"integration","Central integration routing and mediation capability.","shuffle","infrastructure",["esb", "integration"],{"governanceModel": "central"},bidirectionalPorts),
  component("COMP-INTEGRATION-ADAPTER","Integration Adapter","ApplicationComponent",["applicationRealization"],"integration","Translates and isolates an external contract.","plug","card",["adapter", "integration"],{"owner": "TBD"},bidirectionalPorts),
  component("COMP-WEBHOOK","Webhook Endpoint","Interface",["applicationRealization"],"integration","Callback endpoint for event notifications.","webhook","event",["webhook", "interface"],{"protocol": "HTTPS"},bidirectionalPorts),
  component("COMP-GRPC-API","gRPC Interface","API",["applicationRealization"],"integration","Versioned protobuf-based RPC contract.","network","card",["grpc", "api"],{"protocol": "gRPC"},bidirectionalPorts),
  component("COMP-GRAPHQL-API","GraphQL Interface","API",["applicationRealization"],"integration","GraphQL schema and resolver boundary.","share-2","card",["graphql", "api"],{"protocol": "GraphQL"},bidirectionalPorts),
  component("COMP-FILE-TRANSFER","Managed File Transfer","Interface",["applicationRealization", "logicalTechnology"],"integration","Governed file exchange interface.","file-up","card",["file-transfer", "integration"],{"protocol": "SFTP"},bidirectionalPorts),
  component("COMP-SERVICE-MESH-PROXY","Service Mesh Proxy","TechnologyComponent",["physicalTechnology"],"networking","Sidecar or ambient proxy enforcing service communication policy.","waypoints","infrastructure",["service-mesh", "proxy"],{"mtls": true},bidirectionalPorts),
  component("COMP-EVENT-PRODUCER","Event Producer","ApplicationComponent",["applicationRealization"],"integration","Publishes governed domain or integration events.","send","event",["event", "producer"],{"deliveryGuarantee": "at-least-once"},eventPorts),
  component("COMP-EVENT-CONSUMER","Event Consumer","ApplicationComponent",["applicationRealization"],"integration","Consumes events with retry and idempotency controls.","inbox","event",["event", "consumer"],{"idempotent": true},eventPorts),
  component("COMP-SCHEMA-REGISTRY","Schema Registry","LogicalTechnologyCapability",["logicalTechnology"],"integration","Manages event and data contract schemas and compatibility.","book-key","infrastructure",["schema", "contract"],{"compatibility": "backward"},bidirectionalPorts),
  component("COMP-DATA-DOMAIN","Data Domain","DataDomain",["logicalApplication", "applicationRealization"],"data","Business-aligned ownership boundary for data products.","database-zap","boundary",["data-domain", "ownership"],{"dataOwner": "TBD"},bidirectionalPorts),
  component("COMP-DATA-ENTITY","Data Entity","DataEntity",["logicalApplication", "applicationRealization"],"data","Canonical business information entity.","table-properties","card",["data", "entity"],{"classification": "internal"},bidirectionalPorts),
  component("COMP-OBJECT-STORAGE","Object Storage Capability","LogicalTechnologyCapability",["logicalTechnology"],"data","Durable object and blob storage capability.","archive","cylinder",["object-storage", "data"],{"durabilityTarget": "TBD"},dataPorts),
  component("COMP-TIME-SERIES","Time-series Data Service","LogicalTechnologyCapability",["logicalTechnology"],"data","Optimized storage for timestamped measurements.","chart-no-axes-combined","cylinder",["time-series", "data"],{"retentionDays": 30},dataPorts),
  component("COMP-SEARCH-INDEX","Search Index","LogicalTechnologyCapability",["logicalTechnology"],"data","Indexing and full-text/vector retrieval capability.","list-filter","cylinder",["search", "index"],{"refreshInterval": "TBD"},dataPorts),
  component("COMP-GRAPH-STORE","Graph Data Service","LogicalTechnologyCapability",["logicalTechnology"],"data","Graph persistence and traversal capability.","network","cylinder",["graph", "data"],{"consistency": "tunable"},dataPorts),
  component("COMP-DATA-LAKE","Data Lake","LogicalTechnologyCapability",["logicalTechnology"],"data","Raw and curated analytical data storage capability.","waves","cylinder",["data-lake", "analytics"],{"zones": "raw,curated"},dataPorts),
  component("COMP-DATA-WAREHOUSE","Data Warehouse","LogicalTechnologyCapability",["logicalTechnology"],"data","Governed analytical and reporting store.","warehouse","cylinder",["warehouse", "analytics"],{"dimensionalModel": "TBD"},dataPorts),
  component("COMP-STREAM-PROCESSOR","Stream Processor","LogicalTechnologyCapability",["logicalTechnology"],"data","Stateful event-stream transformation capability.","activity","infrastructure",["stream", "processor"],{"checkpointing": true},dataPorts),
  component("COMP-ETL-PIPELINE","ETL / ELT Pipeline","ApplicationComponent",["applicationRealization", "logicalTechnology"],"data","Extracts, transforms and loads governed datasets.","move-right","card",["etl", "pipeline"],{"lineageRequired": true},bidirectionalPorts),
  component("COMP-CDC-CONNECTOR","Change Data Capture Connector","ApplicationComponent",["applicationRealization", "logicalTechnology"],"data","Publishes source database changes as governed streams.","refresh-cw","card",["cdc", "integration"],{"snapshotMode": "initial"},bidirectionalPorts),
  component("COMP-BACKUP-VAULT","Backup Vault","TechnologyProduct",["physicalTechnology"],"resilience","Isolated backup and recovery storage.","vault","cylinder",["backup", "recovery"],{"immutable": true},bidirectionalPorts),
  component("COMP-WAF","Web Application Firewall","Control",["logicalTechnology", "physicalTechnology"],"security","Protects public interfaces from common web attacks.","shield-alert","control",["waf", "security"],{"managedRules": true},bidirectionalPorts),
  component("COMP-SECRETS-MANAGER","Secrets Manager","LogicalTechnologyCapability",["logicalTechnology"],"security","Stores and rotates application secrets.","key-round","infrastructure",["secrets", "security"],{"rotationRequired": true},bidirectionalPorts),
  component("COMP-KMS","Key Management Service","LogicalTechnologyCapability",["logicalTechnology"],"security","Manages cryptographic keys and signing operations.","key-square","infrastructure",["kms", "encryption"],{"hsmBacked": false},bidirectionalPorts),
  component("COMP-POLICY-ENGINE","Policy Engine","LogicalTechnologyCapability",["logicalTechnology"],"security","Evaluates authorization and compliance policy as code.","gavel","infrastructure",["policy", "authorization"],{"decisionLogging": true},bidirectionalPorts),
  component("COMP-CERTIFICATE-AUTHORITY","Certificate Authority","TechnologyProduct",["physicalTechnology"],"security","Issues and manages workload and endpoint certificates.","badge-check","infrastructure",["pki", "certificate"],{"rotationDays": 90},bidirectionalPorts),
  component("COMP-FIREWALL","Network Firewall","TechnologyProduct",["physicalTechnology"],"networking","Enforces network traffic policy between zones.","brick-wall","control",["firewall", "network"],{"defaultDeny": true},bidirectionalPorts),
  component("COMP-BASTION","Bastion / Privileged Access","DeploymentNode",["physicalTechnology"],"security","Controlled administrative access point.","door-open","infrastructure",["bastion", "pam"],{"sessionRecording": true},bidirectionalPorts),
  component("COMP-SIEM","Security Analytics / SIEM","LogicalTechnologyCapability",["logicalTechnology"],"security","Aggregates and correlates security telemetry.","scan-search","infrastructure",["siem", "security"],{"retentionDays": 365},bidirectionalPorts),
  component("COMP-CONTAINER-PLATFORM","Container Platform","LogicalTechnologyCapability",["logicalTechnology"],"platform","Schedules and operates containerized workloads.","container","infrastructure",["container", "platform"],{"multiZone": true},bidirectionalPorts),
  component("COMP-SERVERLESS-PLATFORM","Serverless Platform","LogicalTechnologyCapability",["logicalTechnology"],"platform","Runs event-driven functions and managed compute.","zap","infrastructure",["serverless", "platform"],{"scaleToZero": true},bidirectionalPorts),
  component("COMP-SERVICE-MESH-CONTROL","Service Mesh Control Plane","LogicalTechnologyCapability",["logicalTechnology"],"platform","Distributes service identity, routing and telemetry policy.","route","infrastructure",["service-mesh", "control-plane"],{"mtls": true},bidirectionalPorts),
  component("COMP-CICD","CI/CD Orchestrator","LogicalTechnologyCapability",["logicalTechnology"],"delivery","Builds, tests and promotes deployable artifacts.","git-pull-request-arrow","infrastructure",["cicd", "delivery"],{"signedArtifacts": true},bidirectionalPorts),
  component("COMP-ARTIFACT-REGISTRY","Artifact Registry","TechnologyProduct",["physicalTechnology"],"delivery","Stores signed software packages and images.","package-search","infrastructure",["artifact", "registry"],{"immutability": true},bidirectionalPorts),
  component("COMP-CONFIG-SERVICE","Configuration Service","LogicalTechnologyCapability",["logicalTechnology"],"platform","Manages runtime configuration and change rollout.","settings","infrastructure",["configuration", "platform"],{"versioned": true},bidirectionalPorts),
  component("COMP-DNS","DNS Service","TechnologyProduct",["physicalTechnology"],"networking","Provides governed name resolution and traffic steering.","globe","infrastructure",["dns", "network"],{"healthRouting": true},bidirectionalPorts),
  component("COMP-CDN","Content Delivery Network","TechnologyProduct",["physicalTechnology"],"networking","Caches and delivers content at the edge.","cloud","infrastructure",["cdn", "edge"],{"originShield": true},bidirectionalPorts),
  component("COMP-LOAD-BALANCER","Load Balancer","TechnologyProduct",["physicalTechnology"],"networking","Distributes traffic across healthy targets.","split","infrastructure",["load-balancer", "network"],{"healthChecks": true},bidirectionalPorts),
  component("COMP-INGRESS","Ingress Controller","TechnologyComponent",["physicalTechnology"],"networking","Routes external traffic into a runtime platform.","log-in","infrastructure",["ingress", "network"],{"tlsTermination": true},bidirectionalPorts),
  component("COMP-NAT-GATEWAY","NAT / Egress Gateway","TechnologyProduct",["physicalTechnology"],"networking","Controls outbound connectivity from private zones.","move-up-right","infrastructure",["nat", "egress"],{"egressFiltering": true},bidirectionalPorts),
  component("COMP-SYNTHETIC-MONITOR","Synthetic Monitoring","LogicalTechnologyCapability",["logicalTechnology"],"operations","Actively tests user journeys and endpoints.","bot","infrastructure",["synthetic", "monitoring"],{"criticalJourneys": "TBD"},bidirectionalPorts),
  component("COMP-LOG-ANALYTICS","Log Analytics","LogicalTechnologyCapability",["logicalTechnology"],"operations","Centralized structured log ingestion and search.","scroll-text","infrastructure",["logs", "observability"],{"retentionDays": 30},bidirectionalPorts),
  component("COMP-METRICS-STORE","Metrics Store","LogicalTechnologyCapability",["logicalTechnology"],"operations","Stores and queries service and platform metrics.","chart-line","infrastructure",["metrics", "observability"],{"highCardinalityPolicy": "TBD"},bidirectionalPorts),
  component("COMP-TRACE-BACKEND","Trace Backend","LogicalTechnologyCapability",["logicalTechnology"],"operations","Stores and analyses distributed traces.","route","infrastructure",["tracing", "observability"],{"samplingPolicy": "TBD"},bidirectionalPorts),
].map((record) => ({
  ...record,
  version: '0.10.59',
  applicableViewpoints: [...new Set([...record.applicableViewpoints, 'traceability'])],
  properties: specialistProperties(record.componentKind ?? 'ApplicationComponent', record.category, record.tags, record.defaultProperties ?? {}),
  sourceRecordId: record.id,
  knowledgeReleaseId: 'AKR-0.10.60',
  authorityState: 'approved-production',
}));


export const coreTopologyTemplates: DesignLibraryRecord[] = [
  {
    id: 'TPL-SECURE-API-SERVICE', recordType: 'template', name: 'Secure API Service', category: 'application', description: 'Deployable API, access-control responsibility and service boundary starter.',
    applicableStages: ['applicationRealization'], applicableViewpoints: ['application','security','integration'], maturity: 'mature', approvalStatus: 'approved', owner: 'Architecture Knowledge Council', version: '0.8.6', tags: ['api','security','starter'],
    depiction: { renderer: 'PatternTopology', icon: 'shield-check', shape: 'boundary', defaultSize: { width: 340, height: 190 }, canContainChildren: true, ports: bidirectionalPorts, previewKind: 'client-api-auth-service', notationMappings: { custom: 'topology-template' } },
    properties: [], qualityAttributeImpact: { security: 4, modifiability: 2 }, whenToUse: ['Starting an externally or internally exposed application service.'], whenToQuestion: ['Pure event-consumer workloads with no request interface.'], requires: [], recommends: ['PAT-API-GATEWAY','PAT-ZERO-TRUST'], pairsWellWith: ['PAT-CIRCUIT-BREAKER','PAT-OBSERVABILITY'], conflictsWith: [], obligations: ['Define authentication and authorization policy','Define API lifecycle and versioning','Define telemetry and rate limits'], risks: ['Gateway or identity dependency concentration'], mitigations: ['High availability and cached policy decisions'], evidenceIds: ['EVID-INTERNAL-ARCH-PRINCIPLES'],
    nodeTemplate: [
      { key: 'api', kind: 'API', stage: 'applicationRealization', label: 'Service API', description: 'Typed request interface.', properties: { public: false, protocol: 'REST' }, tags: ['api','template'], offset: { x: 0, y: 0 } },
      { key: 'control', kind: 'Control', stage: 'applicationRealization', label: 'Identity & Access Control', description: 'Authentication and authorization.', properties: { authentication: true, authorization: true }, tags: ['security','template'], offset: { x: 260, y: 0 } },
      { key: 'service', kind: 'DeployableUnit', stage: 'applicationRealization', label: 'Application Service', description: 'Deployable business responsibility.', properties: { stateless: true }, tags: ['deployable','template'], offset: { x: 520, y: 0 } }
    ],
    edgeTemplate: [
      { sourceKey: 'api', targetKey: 'control', kind: 'communicatesWith', stage: 'applicationRealization', label: 'Authenticates', properties: { protocolStyle: 'synchronous' } },
      { sourceKey: 'control', targetKey: 'service', kind: 'communicatesWith', stage: 'applicationRealization', label: 'Authorizes request', properties: { protocolStyle: 'synchronous' } }
    ]
  },
  {
    id: 'TPL-EVENT-PROCESSING', recordType: 'template', name: 'Reliable Event Processing', category: 'integration', description: 'Producer, event broker and consumer starter with failure-handling obligations.',
    applicableStages: ['logicalTechnology'], applicableViewpoints: ['integration','resilience','operations'], maturity: 'mature', approvalStatus: 'approved', owner: 'Architecture Knowledge Council', version: '0.8.6', tags: ['event','messaging','starter'],
    depiction: { renderer: 'PatternTopology', icon: 'radio-tower', shape: 'card', defaultSize: { width: 330, height: 170 }, canContainChildren: false, ports: eventPorts, previewKind: 'producer-broker-consumer-dlq', notationMappings: { custom: 'topology-template' } },
    properties: [], qualityAttributeImpact: { reliability: 4, scalability: 4, operationalComplexity: -2 }, whenToUse: ['Decoupled processing and independently scalable consumers.'], whenToQuestion: ['Simple request-response operations requiring immediate consistency.'], requires: [], recommends: ['PAT-IDEMPOTENT','PAT-DLQ','PAT-OBSERVABILITY'], pairsWellWith: ['STYLE-EVENT-DRIVEN','PAT-OUTBOX'], conflictsWith: [], obligations: ['Define delivery semantics','Define schema ownership and versioning','Define retry, dead-letter and replay strategy'], risks: ['Duplicate delivery','Ordering constraints','Operational complexity'], mitigations: ['Idempotency keys','Partition strategy','Consumer lag monitoring'], evidenceIds: ['EVID-INTERNAL-ARCH-PRINCIPLES'],
    nodeTemplate: [
      { key: 'broker', kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology', label: 'Message Broker Capability', description: 'Reliable message transport.', properties: { deliveryGuarantee: 'at-least-once' }, tags: ['messaging','template'], offset: { x: 0, y: 0 } },
      { key: 'dlq', kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology', label: 'Dead Letter Channel', description: 'Isolates failed messages.', properties: { retentionHours: 168 }, tags: ['failure-handling','template'], offset: { x: 290, y: 150 } },
      { key: 'observability', kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology', label: 'Messaging Observability', description: 'Lag, error and replay visibility.', properties: {}, tags: ['observability','template'], offset: { x: 290, y: 0 } }
    ],
    edgeTemplate: [
      { sourceKey: 'broker', targetKey: 'dlq', kind: 'publishes', stage: 'logicalTechnology', label: 'Failed messages', properties: { protocolStyle: 'asynchronous' } },
      { sourceKey: 'broker', targetKey: 'observability', kind: 'supports', stage: 'logicalTechnology', label: 'Telemetry', properties: {} }
    ]
  },
  {
    id: 'TPL-RESILIENT-EXTERNAL', recordType: 'template', name: 'Resilient External Integration', category: 'resilience', description: 'Gateway and resilience controls for a remote third-party dependency.',
    applicableStages: ['applicationRealization'], applicableViewpoints: ['integration','resilience'], maturity: 'mature', approvalStatus: 'approved', owner: 'Architecture Knowledge Council', version: '0.8.6', tags: ['external','resilience','starter'],
    depiction: { renderer: 'PatternTopology', icon: 'shield-alert', shape: 'card', defaultSize: { width: 330, height: 160 }, canContainChildren: false, ports: bidirectionalPorts, previewKind: 'service-breaker-external', notationMappings: { custom: 'topology-template' } },
    properties: [], qualityAttributeImpact: { availability: 4, faultTolerance: 4, latency: -1 }, whenToUse: ['Any important synchronous external dependency.'], whenToQuestion: ['Fire-and-forget interactions better modelled asynchronously.'], requires: [], recommends: ['PAT-CIRCUIT-BREAKER','PAT-RETRY','PAT-BULKHEAD'], pairsWellWith: ['PAT-OBSERVABILITY'], conflictsWith: [], obligations: ['Define timeout budget','Define retry safety and idempotency','Define fallback or degradation behaviour'], risks: ['Retry storms','Hidden partial failure'], mitigations: ['Retry budgets','Bulkhead isolation','Dependency SLOs'], evidenceIds: ['EVID-INTERNAL-ARCH-PRINCIPLES'],
    nodeTemplate: [
      { key: 'adapter', kind: 'ApplicationComponent', stage: 'applicationRealization', label: 'External Service Adapter', description: 'Isolates third-party contract and translation.', properties: {}, tags: ['adapter','template'], offset: { x: 0, y: 0 } },
      { key: 'breaker', kind: 'ApplicationComponent', stage: 'applicationRealization', label: 'Circuit Breaker', description: 'Fails fast and protects the caller.', properties: { timeoutMs: 3000, failureThresholdPercent: 50 }, tags: ['resilience','template'], offset: { x: 270, y: 0 } },
      { key: 'external', kind: 'ExternalSystem', stage: 'applicationRealization', label: 'External Provider', description: 'Third-party dependency.', properties: {}, tags: ['external','template'], offset: { x: 540, y: 0 } }
    ],
    edgeTemplate: [
      { sourceKey: 'adapter', targetKey: 'breaker', kind: 'communicatesWith', stage: 'applicationRealization', label: 'Protected call', properties: { protocolStyle: 'synchronous' } },
      { sourceKey: 'breaker', targetKey: 'external', kind: 'communicatesWith', stage: 'applicationRealization', label: 'Remote request', properties: { protocolStyle: 'synchronous' } }
    ]
  },
  {
    id: 'TPL-MULTI-ZONE-DEPLOYMENT', recordType: 'template', name: 'Multi-Zone Deployment', category: 'deployment', description: 'Region, availability-zone and replicated deployment starter.',
    applicableStages: ['physicalTechnology'], applicableViewpoints: ['deployment','resilience'], maturity: 'mature', approvalStatus: 'approved', owner: 'Architecture Knowledge Council', version: '0.8.6', tags: ['ha','deployment','starter'],
    depiction: { renderer: 'PatternTopology', icon: 'server-cog', shape: 'boundary', defaultSize: { width: 360, height: 210 }, canContainChildren: true, ports: bidirectionalPorts, previewKind: 'region-two-zones-replicas', notationMappings: { custom: 'deployment-template' } },
    properties: [], qualityAttributeImpact: { availability: 4, resilience: 4, costEfficiency: -2 }, whenToUse: ['Critical services with explicit availability and recovery objectives.'], whenToQuestion: ['Non-critical workloads where added cost is not justified.'], requires: [], recommends: ['PAT-ACTIVE-ACTIVE','PAT-OBSERVABILITY'], pairsWellWith: ['PAT-BLUE-GREEN'], conflictsWith: [], obligations: ['Define failure-domain independence','Define data replication and recovery semantics','Test zone-failure behaviour'], risks: ['Cross-zone cost','Correlated dependencies'], mitigations: ['Dependency mapping','Failure injection testing'], evidenceIds: ['EVID-INTERNAL-ARCH-PRINCIPLES'],
    nodeTemplate: [
      { key: 'region', kind: 'Region', stage: 'physicalTechnology', label: 'Primary Region', description: 'Regional deployment boundary.', properties: {}, tags: ['region','template'], offset: { x: 0, y: 0 } },
      { key: 'zone-a', kind: 'AvailabilityZone', stage: 'physicalTechnology', label: 'Availability Zone A', description: 'Failure domain A.', properties: {}, tags: ['zone','template'], offset: { x: 40, y: 70 } },
      { key: 'zone-b', kind: 'AvailabilityZone', stage: 'physicalTechnology', label: 'Availability Zone B', description: 'Failure domain B.', properties: {}, tags: ['zone','template'], offset: { x: 340, y: 70 } },
      { key: 'node-a', kind: 'DeploymentNode', stage: 'physicalTechnology', label: 'Service Replica A', description: 'Replica in zone A.', properties: { replicas: 1, availabilityZones: 1 }, tags: ['compute','template'], offset: { x: 70, y: 150 } },
      { key: 'node-b', kind: 'DeploymentNode', stage: 'physicalTechnology', label: 'Service Replica B', description: 'Replica in zone B.', properties: { replicas: 1, availabilityZones: 1 }, tags: ['compute','template'], offset: { x: 370, y: 150 } }
    ],
    edgeTemplate: [
      { sourceKey: 'region', targetKey: 'zone-a', kind: 'contains', stage: 'physicalTechnology', properties: {} },
      { sourceKey: 'region', targetKey: 'zone-b', kind: 'contains', stage: 'physicalTechnology', properties: {} },
      { sourceKey: 'zone-a', targetKey: 'node-a', kind: 'contains', stage: 'physicalTechnology', properties: {} },
      { sourceKey: 'zone-b', targetKey: 'node-b', kind: 'contains', stage: 'physicalTechnology', properties: {} }
    ]
  }
];

const structuralPatternTemplates: Record<string, Pick<DesignLibraryRecord,'nodeTemplate'|'edgeTemplate'|'depiction'>> = {
  'PAT-API-GATEWAY': {
    depiction: { renderer: 'PatternTopology', icon: 'route', shape: 'card', defaultSize: { width: 250, height: 128 }, canContainChildren: false, ports: bidirectionalPorts, previewKind: 'client-gateway-services', notationMappings: { custom: 'topology' } },
    nodeTemplate: [
      { key: 'gateway', kind: 'ApplicationComponent', stage: 'applicationRealization', label: 'API Gateway', description: 'Central entry point and policy enforcement.', properties: { responsibility: 'routing-auth-rate-limit' }, tags: ['gateway','pattern'], offset: { x: 0, y: 0 } },
    ], edgeTemplate: [],
  },
  'PAT-OUTBOX': {
    depiction: { renderer: 'PatternTopology', icon: 'send', shape: 'card', defaultSize: { width: 250, height: 128 }, canContainChildren: false, ports: eventPorts, previewKind: 'service-outbox-publisher', notationMappings: { custom: 'topology' } },
    nodeTemplate: [
      { key: 'outbox', kind: 'ApplicationComponent', stage: 'applicationRealization', label: 'Transactional Outbox', description: 'Persists pending integration events in the local transaction.', properties: { atomicWithBusinessData: true }, tags: ['outbox','pattern'], offset: { x: 0, y: 0 } },
      { key: 'publisher', kind: 'ApplicationComponent', stage: 'applicationRealization', label: 'Outbox Publisher', description: 'Publishes persisted events reliably.', properties: { idempotent: true }, tags: ['publisher','pattern'], offset: { x: 270, y: 0 } },
    ], edgeTemplate: [{ sourceKey: 'outbox', targetKey: 'publisher', kind: 'publishes', stage: 'applicationRealization', label: 'Publishes pending events', properties: { protocolStyle: 'asynchronous' } }],
  },
  'PAT-CIRCUIT-BREAKER': {
    depiction: { renderer: 'PatternTopology', icon: 'shield-alert', shape: 'card', defaultSize: { width: 250, height: 128 }, canContainChildren: false, ports: bidirectionalPorts, previewKind: 'caller-breaker-dependency', notationMappings: { custom: 'edge-pattern' } },
    nodeTemplate: [{ key: 'breaker', kind: 'ApplicationComponent', stage: 'applicationRealization', label: 'Circuit Breaker', description: 'Fails fast and protects a remote dependency.', properties: { timeoutMs: 3000, failureThresholdPercent: 50 }, tags: ['resilience','pattern'], offset: { x: 0, y: 0 } }], edgeTemplate: [],
  },
  'PAT-DLQ': {
    depiction: { renderer: 'PatternTopology', icon: 'inbox', shape: 'card', defaultSize: { width: 250, height: 128 }, canContainChildren: false, ports: eventPorts, previewKind: 'consumer-dead-letter', notationMappings: { custom: 'topology' } },
    nodeTemplate: [{ key: 'dlq', kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology', label: 'Dead Letter Channel', description: 'Isolates messages that cannot be processed.', properties: { retentionHours: 168 }, tags: ['messaging','failure-handling','pattern'], offset: { x: 0, y: 0 } }], edgeTemplate: [],
  },
  'PAT-SIDECAR': {
    depiction: { renderer: 'PatternTopology', icon: 'panel-right', shape: 'card', defaultSize: { width: 250, height: 128 }, canContainChildren: false, ports: bidirectionalPorts, previewKind: 'workload-sidecar', notationMappings: { custom: 'contained-pattern' } },
    nodeTemplate: [{ key: 'sidecar', kind: 'TechnologyComponent', stage: 'physicalTechnology', label: 'Sidecar', description: 'Auxiliary runtime deployed alongside the workload.', properties: { lifecycleCoupled: true }, tags: ['sidecar','pattern'], offset: { x: 0, y: 0 } }], edgeTemplate: [],
  },
  'PAT-BLUE-GREEN': {
    depiction: { renderer: 'PatternTopology', icon: 'copy', shape: 'boundary', defaultSize: { width: 310, height: 170 }, canContainChildren: true, ports: bidirectionalPorts, previewKind: 'blue-green-environments', notationMappings: { custom: 'deployment-topology' } },
    nodeTemplate: [
      { key: 'blue', kind: 'Environment', stage: 'physicalTechnology', label: 'Blue Environment', description: 'Current production environment.', properties: { active: true }, tags: ['blue','deployment','pattern'], offset: { x: 0, y: 0 } },
      { key: 'green', kind: 'Environment', stage: 'physicalTechnology', label: 'Green Environment', description: 'Candidate production environment.', properties: { active: false }, tags: ['green','deployment','pattern'], offset: { x: 300, y: 0 } },
    ], edgeTemplate: [],
  },
};

function qualityNarrative(impacts: Record<string, number>): { positive: string[]; negative: string[] } {
  const entries = Object.entries(impacts);
  return {
    positive: entries.filter(([,value]) => value >= 1).sort((a,b) => b[1]-a[1]).slice(0,4).map(([key]) => key),
    negative: entries.filter(([,value]) => value < 0).sort((a,b) => a[1]-b[1]).slice(0,4).map(([key]) => key),
  };
}

const stablePatternToDnaSourceId: Record<string, string> = {
  'PAT-OUTBOX': 'PAT-TRANSACTIONAL-OUTBOX',
  'PAT-IDEMPOTENT': 'PAT-IDEMPOTENT-CONSUMER',
  'PAT-SAGA': 'PAT-SAGA-BOUNDARY',
  'PAT-DLQ': 'PAT-DEAD-LETTER-CHANNEL',
  'PAT-DB-PER-SERVICE': 'PAT-DATABASE-PER-SERVICE',
  'PAT-STRANGLER': 'PAT-STRANGLER-FIG',
};

export function createDesignLibrary(library: KnowledgeLibrary): DesignLibraryRecord[] {
  const patternRecords = library.patterns.map((pattern): DesignLibraryRecord => {
    const template = structuralPatternTemplates[pattern.id];
    const dnaTooling = patternDnaPatternTooling[pattern.id] ?? patternDnaPatternTooling[stablePatternToDnaSourceId[pattern.id] ?? ''];
    const narrative = qualityNarrative(pattern.qualityAttributeImpact);
    return {
      id: pattern.id,
      recordType: 'pattern',
      name: pattern.name,
      category: pattern.category,
      description: dnaTooling?.description ?? `Reusable ${pattern.category} pattern with explicit prerequisites, risks and design obligations.`,
      applicableStages: dnaTooling?.applicableStages ?? pattern.applicableStages,
      applicableViewpoints: dnaTooling?.applicableViewpoints ?? [pattern.category],
      maturity: dnaTooling?.maturity ?? 'established',
      approvalStatus: pattern.status.toLowerCase().includes('deprecated') ? 'deprecated' : 'draft',
      owner: pattern.owner,
      version: pattern.version,
      tags: [...new Set([pattern.category, 'pattern', ...narrative.positive, ...(dnaTooling?.tags ?? [])])],
      depiction: template?.depiction ?? dnaTooling?.depiction ?? {
        renderer: 'PatternBadge',
        icon: 'puzzle',
        shape: 'card',
        defaultSize: { width: 240, height: 118 },
        canContainChildren: false,
        ports: bidirectionalPorts,
        previewKind: pattern.category,
        notationMappings: { custom: 'pattern-badge' },
      },
      properties: dnaTooling?.properties ?? [],
      qualityAttributeImpact: dnaTooling?.qualityAttributeImpact ?? pattern.qualityAttributeImpact,
      whenToUse: dnaTooling?.whenToUse ?? (narrative.positive.length ? [`Use when ${narrative.positive.join(', ')} are important.`] : [`Use when the ${pattern.name} problem is present.`]),
      whenToQuestion: dnaTooling?.whenToQuestion ?? [...pattern.risks, ...narrative.negative.map((item) => `Question when ${item} is a dominant driver.`)],
      requires: dnaTooling?.requires ?? pattern.requires,
      recommends: dnaTooling?.recommends ?? [],
      pairsWellWith: dnaTooling?.pairsWellWith ?? pattern.pairsWellWith,
      conflictsWith: dnaTooling?.conflictsWith ?? pattern.conflictsWith,
      obligations: [...new Set([...pattern.obligations, ...(dnaTooling?.obligations ?? [])])],
      risks: [...new Set([...pattern.risks, ...(dnaTooling?.risks ?? [])])],
      mitigations: [...new Set([...pattern.mitigations, ...(dnaTooling?.mitigations ?? [])])],
      evidenceIds: [...new Set([
        ...pattern.evidence.map(String).map((id) => id === 'EVID-INTERNAL-ARCH-PRINCIPLES' ? 'SRC-INTERNAL-PRINCIPLES' : id),
        ...(dnaTooling?.evidenceIds ?? []),
        ...evidenceFor(pattern.category, [pattern.category, pattern.name], 'pattern'),
      ])],
      nodeTemplate: template?.nodeTemplate ?? dnaTooling?.nodeTemplate,
      edgeTemplate: template?.edgeTemplate ?? dnaTooling?.edgeTemplate,
    };
  });

  const styleRecords = library.architectureStyles.map((style): DesignLibraryRecord => ({
    id: style.id, recordType: 'style', name: style.name, category: 'architecture-style',
    description: `Scoped architecture style evaluated against quality drivers, context and existing design choices.`,
    applicableStages: style.applicableStages, applicableViewpoints: ['application','integration','deployment'], maturity: 'established',
    approvalStatus: style.status.toLowerCase().includes('deprecated') ? 'deprecated' : 'draft', owner: style.owner, version: style.version,
    tags: ['style',...Object.entries(style.qualityAttributeRatings).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key])=>key)],
    depiction: { renderer: 'StyleScope', icon: 'layers-3', shape: 'boundary', defaultSize: { width: 320, height: 210 }, canContainChildren: true, ports: [], previewKind: 'style-scope', notationMappings: { custom: 'scope-overlay' } },
    properties: [], qualityAttributeImpact: style.qualityAttributeRatings, whenToUse: style.whenToConsider, whenToQuestion: style.whenToAvoidOrQuestion,
    requires: style.requires, recommends: style.recommends, pairsWellWith: [], conflictsWith: style.tensions, obligations: style.obligations,
    risks: style.tensions, mitigations: [], evidenceIds: [...new Set([...style.evidence.map(String).map((id) => id === 'EVID-INTERNAL-ARCH-PRINCIPLES' ? 'SRC-INTERNAL-PRINCIPLES' : id), ...evidenceFor('architecture-style', [style.name], 'style')])],
  }));

  const archetypeRecords = patternDnaComponentArchetypeRecords.map((record): DesignLibraryRecord => ({
    ...record,
    properties: record.componentKind
      ? specialistProperties(record.componentKind, record.category, record.tags, record.defaultProperties ?? {})
      : record.properties,
  }));

  const templateIds = new Set(coreTopologyTemplates.map((record) => record.id));
  const bridgedTemplates = patternDnaTopologyTemplates.filter((record) => !templateIds.has(record.id));
  const candidates = [
    ...coreComponentLibrary,
    ...supplementalComponentLibrary,
    ...archetypeRecords,
    ...patternRecords,
    ...styleRecords,
    ...patternDnaAntiPatternRecords,
    ...coreTopologyTemplates,
    ...bridgedTemplates,
  ];
  const records = [...new Map(candidates.map((record) => [record.id, record])).values()];

  return records.map((record) => ({
    ...record,
    approvalStatus: record.approvalStatus === 'deprecated' ? 'deprecated' : 'approved',
    sourceRecordId: record.sourceRecordId ?? record.id,
    knowledgeReleaseId: record.knowledgeReleaseId ?? 'AKR-0.10.60',
    authorityState: record.approvalStatus === 'deprecated' ? 'deprecated' : 'approved-production',
    evidenceIds: record.evidenceIds.length ? record.evidenceIds : ['SRC-INTERNAL-PRINCIPLES'],
  }));
}

function setProperties(id: string, properties: DesignLibraryRecord['properties']): void {
  const record = coreComponentLibrary.find((item) => item.id === id);
  if (record) record.properties = properties;
}
setProperties('COMP-LOGICAL-SERVICE', [
  { key: 'responsibility', label: 'Primary responsibility', type: 'multiline', description: 'The business or application responsibility owned by this service.', required: true },
  { key: 'criticality', label: 'Criticality', type: 'enum', description: 'Business importance of the capability.', defaultValue: 'medium', options: [{label:'Low',value:'low'},{label:'Medium',value:'medium'},{label:'High',value:'high'},{label:'Mission critical',value:'mission-critical'}] },
  { key: 'changeFrequency', label: 'Change frequency', type: 'enum', description: 'Expected independent rate of change.', defaultValue: 'monthly', options: [{label:'Daily',value:'daily'},{label:'Weekly',value:'weekly'},{label:'Monthly',value:'monthly'},{label:'Rare',value:'rare'}] },
]);
setProperties('COMP-DEPLOYABLE', [
  { key: 'runtime', label: 'Runtime', type: 'text', description: 'Runtime technology or execution model.', required: true, defaultValue: 'TBD' },
  { key: 'stateless', label: 'Stateless', type: 'boolean', description: 'Whether runtime instances can be replaced without local state loss.', defaultValue: true },
  { key: 'independentDeployment', label: 'Independent deployment', type: 'boolean', description: 'Whether this unit can be deployed without coordinated release.', defaultValue: true },
]);
setProperties('COMP-API', [
  { key: 'protocol', label: 'Protocol', type: 'enum', description: 'Primary interface protocol.', defaultValue: 'REST', options: [{label:'REST',value:'REST'},{label:'GraphQL',value:'GraphQL'},{label:'gRPC',value:'gRPC'},{label:'WebSocket',value:'WebSocket'}] },
  { key: 'public', label: 'Publicly exposed', type: 'boolean', description: 'Whether the interface is reachable outside the trusted boundary.', defaultValue: false },
  { key: 'versioningStrategy', label: 'Versioning strategy', type: 'text', description: 'How compatibility changes are managed.', defaultValue: 'URI versioning' },
]);
setProperties('COMP-MESSAGE-BROKER', [
  { key: 'deliveryGuarantee', label: 'Delivery guarantee', type: 'enum', description: 'Required message-delivery semantics.', defaultValue: 'at-least-once', options: [{label:'At most once',value:'at-most-once'},{label:'At least once',value:'at-least-once'},{label:'Effectively once',value:'effectively-once'}] },
  { key: 'orderingRequired', label: 'Ordering required', type: 'boolean', description: 'Whether consumers require deterministic ordering.', defaultValue: false },
  { key: 'retentionHours', label: 'Retention hours', type: 'number', description: 'Minimum replay and retention window.', defaultValue: 24, min: 1, max: 8760 },
  { key: 'containsSensitiveData', label: 'Sensitive payloads', type: 'boolean', description: 'Whether messages may contain confidential or restricted data.', defaultValue: false },
]);
setProperties('COMP-RELATIONAL-DATA', [
  { key: 'consistency', label: 'Consistency', type: 'enum', description: 'Required consistency guarantee.', defaultValue: 'strong', options: [{label:'Strong',value:'strong'},{label:'Session',value:'session'},{label:'Eventual',value:'eventual'}] },
  { key: 'transactional', label: 'Transactional', type: 'boolean', description: 'Whether multi-record ACID transactions are required.', defaultValue: true },
  { key: 'dataClassification', label: 'Data classification', type: 'enum', description: 'Highest classification stored.', defaultValue: 'internal', options: [{label:'Public',value:'public'},{label:'Internal',value:'internal'},{label:'Confidential',value:'confidential'},{label:'Restricted',value:'restricted'}] },
]);
setProperties('COMP-DEPLOYMENT-NODE', [
  { key: 'replicas', label: 'Replicas', type: 'number', description: 'Number of runtime instances.', defaultValue: 2, min: 1, max: 1000 },
  { key: 'availabilityZones', label: 'Availability zones', type: 'number', description: 'Independent failure domains used.', defaultValue: 2, min: 1, max: 10 },
  { key: 'autoscaling', label: 'Autoscaling', type: 'boolean', description: 'Whether capacity adjusts automatically.', defaultValue: true },
]);

setProperties('COMP-DOMAIN', [
  { key: 'businessCapability', label: 'Business capability', type: 'text', description: 'Primary business capability or domain outcome.', required: true },
  { key: 'boundedContext', label: 'Bounded context', type: 'text', description: 'Name of the bounded context represented by this domain.', required: true },
  { key: 'dataOwner', label: 'Data owner', type: 'text', description: 'Role or team accountable for core data in this domain.' },
]);
setProperties('COMP-ACTOR', [
  { key: 'persona', label: 'Persona / role', type: 'text', description: 'The user, role or external persona represented.', required: true },
  { key: 'accessChannel', label: 'Access channel', type: 'enum', description: 'How this actor reaches the system.', defaultValue: 'web', options: [{ label: 'Web', value: 'web' }, { label: 'Mobile', value: 'mobile' }, { label: 'API', value: 'api' }, { label: 'Back office', value: 'back-office' }] },
]);
setProperties('COMP-EXTERNAL-SYSTEM', [
  { key: 'owner', label: 'Owning party', type: 'text', description: 'Team, vendor or external party that owns the system.' },
  { key: 'integrationCriticality', label: 'Integration criticality', type: 'enum', description: 'Impact if this integration fails.', defaultValue: 'medium', options: [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }, { label: 'Mission critical', value: 'mission-critical' }] },
  { key: 'trustBoundary', label: 'Across trust boundary', type: 'boolean', description: 'Whether calls/data cross a security or organizational trust boundary.', defaultValue: true },
]);
setProperties('COMP-EVENT', [
  { key: 'eventName', label: 'Event name', type: 'text', description: 'Business event name in past tense.', required: true },
  { key: 'schemaOwner', label: 'Schema owner', type: 'text', description: 'Team responsible for schema compatibility.', required: true },
  { key: 'deliveryGuarantee', label: 'Delivery guarantee', type: 'enum', description: 'Required event-delivery semantics.', defaultValue: 'at-least-once', options: [{ label: 'At most once', value: 'at-most-once' }, { label: 'At least once', value: 'at-least-once' }, { label: 'Effectively once', value: 'effectively-once' }] },
]);
setProperties('COMP-MODULE', [
  { key: 'moduleBoundary', label: 'Module boundary', type: 'text', description: 'Cohesive responsibility owned by this module.', required: true },
  { key: 'publicInterface', label: 'Public module interface', type: 'text', description: 'Public interface used by other modules.' },
  { key: 'internalOnly', label: 'Internal only', type: 'boolean', description: 'Whether this module should avoid direct external coupling.', defaultValue: true },
]);
setProperties('COMP-WORKER', [
  { key: 'trigger', label: 'Trigger', type: 'enum', description: 'How the worker is invoked.', defaultValue: 'event', options: [{ label: 'Event', value: 'event' }, { label: 'Schedule', value: 'schedule' }, { label: 'Queue', value: 'queue' }, { label: 'Manual', value: 'manual' }] },
  { key: 'idempotent', label: 'Idempotent', type: 'boolean', description: 'Whether repeated processing produces safe outcomes.', defaultValue: true },
  { key: 'failureHandling', label: 'Failure handling', type: 'text', description: 'Retry, DLQ or compensation strategy.' },
]);
setProperties('COMP-IAM-CONTROL', [
  { key: 'authentication', label: 'Authentication required', type: 'boolean', description: 'Whether this control authenticates callers.', defaultValue: true },
  { key: 'authorizationModel', label: 'Authorization model', type: 'enum', description: 'Primary authorization approach.', defaultValue: 'RBAC', options: [{ label: 'RBAC', value: 'RBAC' }, { label: 'ABAC', value: 'ABAC' }, { label: 'Policy based', value: 'policy' }, { label: 'Custom', value: 'custom' }] },
  { key: 'identityProvider', label: 'Identity provider', type: 'text', description: 'Identity provider or federation source.' },
]);
setProperties('COMP-API-MANAGEMENT', [
  { key: 'rateLimitPolicy', label: 'Rate-limit policy', type: 'text', description: 'How consumers are throttled and protected.' },
  { key: 'authPolicy', label: 'Auth policy', type: 'text', description: 'Authentication/authorization policy enforced at the gateway.' },
  { key: 'publicExposure', label: 'Public exposure', type: 'boolean', description: 'Whether APIs can be reached outside private network boundaries.', defaultValue: false },
]);
setProperties('COMP-OBSERVABILITY', [
  { key: 'metrics', label: 'Metrics', type: 'boolean', description: 'Whether metrics are collected.', defaultValue: true },
  { key: 'tracing', label: 'Tracing', type: 'boolean', description: 'Whether distributed tracing is required.', defaultValue: true },
  { key: 'slo', label: 'Service level objective', type: 'text', description: 'Primary availability, latency or error budget target.' },
]);
setProperties('COMP-CACHE', [
  { key: 'evictionPolicy', label: 'Eviction policy', type: 'enum', description: 'How the cache evicts entries.', defaultValue: 'LRU', options: [{ label: 'LRU', value: 'LRU' }, { label: 'LFU', value: 'LFU' }, { label: 'TTL', value: 'TTL' }, { label: 'Custom', value: 'custom' }] },
  { key: 'ttlSeconds', label: 'TTL seconds', type: 'number', description: 'Default cache time-to-live.', defaultValue: 300, min: 0, max: 86400 },
  { key: 'sourceOfTruth', label: 'Source of truth', type: 'text', description: 'Authoritative data source protected by the cache.' },
]);
setProperties('COMP-RUNTIME', [
  { key: 'runtimeType', label: 'Runtime type', type: 'enum', description: 'Execution model.', defaultValue: 'container', options: [{ label: 'Container', value: 'container' }, { label: 'Function', value: 'function' }, { label: 'VM', value: 'vm' }, { label: 'Process', value: 'process' }] },
  { key: 'scalingModel', label: 'Scaling model', type: 'enum', description: 'How the runtime scales.', defaultValue: 'horizontal', options: [{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }, { label: 'Event driven', value: 'event-driven' }, { label: 'Manual', value: 'manual' }] },
]);
setProperties('COMP-REGION', [
  { key: 'regionName', label: 'Region name', type: 'text', description: 'Cloud or data-centre region name.', required: true },
  { key: 'dataResidency', label: 'Data residency', type: 'text', description: 'Residency, sovereignty or regulatory constraint.' },
]);
setProperties('COMP-NETWORK-ZONE', [
  { key: 'trustLevel', label: 'Trust level', type: 'enum', description: 'Network trust classification.', defaultValue: 'private', options: [{ label: 'Public', value: 'public' }, { label: 'DMZ', value: 'dmz' }, { label: 'Private', value: 'private' }, { label: 'Restricted', value: 'restricted' }] },
  { key: 'ingressPolicy', label: 'Ingress policy', type: 'text', description: 'Permitted inbound traffic and source zones.' },
  { key: 'egressPolicy', label: 'Egress policy', type: 'text', description: 'Permitted outbound traffic and destination zones.' },
]);
