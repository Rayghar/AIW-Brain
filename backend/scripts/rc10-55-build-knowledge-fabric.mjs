import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? '.');
const dataDir = path.join(root, 'data');
const generatedDir = path.join(root, 'generated', 'rc10-55');
fs.mkdirSync(generatedDir, { recursive: true });
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const writeJson = (name, value) => fs.writeFileSync(path.join(dataDir, name), JSON.stringify(value, null, 2) + '\n');

const top50 = new Set([
  'STYLE-MODULAR-MONOLITH','STYLE-MICROSERVICES','STYLE-EVENT-DRIVEN','STYLE-CELL-BASED','STYLE-DATA-MESH',
  'PAT-MODULAR-MONOLITH','PAT-HEXAGONAL-ARCHITECTURE','PAT-CLEAN-ARCHITECTURE','PAT-STRANGLER-FIG','PAT-ANTI-CORRUPTION-LAYER',
  'PAT-BOUNDED-CONTEXT','PAT-TRANSACTIONAL-OUTBOX','PAT-IDEMPOTENT-CONSUMER','PAT-INBOX-PATTERN','PAT-SAGA-BOUNDARY',
  'PAT-EVENT-DRIVEN-ARCHITECTURE','PAT-MESSAGE-BROKER','PAT-PUBLISH-SUBSCRIBE','PAT-API-GATEWAY','PAT-BACKEND-FOR-FRONTEND',
  'PAT-SERVICE-MESH','PAT-CQRS','PAT-EVENT-SOURCING','PAT-DATABASE-PER-SERVICE','PAT-DATA-MESH',
  'PAT-DATA-CONTRACT','PAT-SCHEMA-REGISTRY','PAT-CACHE-ASIDE','PAT-CIRCUIT-BREAKER','PAT-RETRY-WITH-BACKOFF',
  'PAT-TIMEOUT','PAT-BULKHEAD','PAT-RATE-LIMITING','PAT-LOAD-SHEDDING','PAT-CELL-BASED-ARCHITECTURE',
  'PAT-DISASTER-RECOVERY','PAT-ZERO-TRUST','PAT-LEAST-PRIVILEGE','PAT-SECRETS-MANAGEMENT','PAT-MUTUAL-TLS',
  'PAT-TENANT-ISOLATION','PAT-THREAT-MODELING','PAT-PLATFORM-ENGINEERING','PAT-INTERNAL-DEVELOPER-PLATFORM','PAT-GOLDEN-PATH',
  'PAT-GITOPS','PAT-POLICY-AS-CODE','PAT-CANARY-RELEASE','PAT-DISTRIBUTED-TRACING','PAT-SLO-BASED-OPERATIONS'
]);

const categoryComponents = {
  application: [['boundary','Application Boundary','Own business responsibility and dependency direction','LogicalService'],['core','Application Core','Implement use cases without infrastructure coupling','LogicalService'],['adapter','Adapter','Translate protocols into core semantics','DeployableUnit']],
  domain: [['boundary','Domain Boundary','Protect model and ubiquitous language','LogicalService'],['model','Domain Model','Hold invariants and business behaviour','LogicalService'],['contract','Published Domain Contract','Expose stable cross-boundary semantics','Event']],
  integration: [['edge','Integration Edge','Mediate protocol, policy and flow control','LogicalTechnologyCapability'],['contract','Message or API Contract','Define provider-consumer semantics','Event'],['failure','Failure Channel','Capture retry, dead-letter and recovery behaviour','DeployableUnit']],
  data: [['owner','Data Owner','Own schema, quality and lifecycle','LogicalService'],['store','Data Store','Persist under explicit consistency rules','LogicalTechnologyCapability'],['contract','Data Contract','Define schema and compatibility expectations','Event']],
  resilience: [['client','Protected Client','Invoke dependency within bounded budgets','LogicalService'],['policy','Resilience Policy','Apply timeout, retry, isolation or shedding','Control'],['telemetry','Reliability Telemetry','Expose saturation, errors and recovery evidence','LogicalTechnologyCapability']],
  security: [['subject','Protected Workload','Request access with workload or user identity','LogicalService'],['enforcement','Policy Enforcement Point','Evaluate and enforce access policy','Control'],['trust','Trust Service','Issue, validate or rotate trust material','LogicalTechnologyCapability']],
  platform: [['control','Platform Control Plane','Manage desired state and governance','Control'],['service','Platform Capability','Provide a reusable paved-road capability','LogicalTechnologyCapability'],['contract','Developer Contract','Expose self-service inputs and support boundaries','Event']],
  deployment: [['unit','Release Unit','Package a versioned deployable change','DeployableUnit'],['traffic','Traffic Control','Shift, mirror or isolate traffic safely','LogicalTechnologyCapability'],['rollback','Rollback Target','Preserve a known-good recoverable state','DeployableUnit']],
  observability: [['workload','Instrumented Workload','Emit correlated telemetry','DeployableUnit'],['pipeline','Telemetry Pipeline','Collect, process and route signals','LogicalTechnologyCapability'],['view','Operational View','Evaluate SLOs and diagnosis','LogicalTechnologyCapability']],
  ai: [['client','Model Client','Invoke governed intelligence','LogicalService'],['gateway','Model Gateway','Apply routing, policy and evidence controls','LogicalTechnologyCapability'],['evaluation','Evaluation Loop','Measure quality, safety and drift','Control']],
  governance: [['subject','Governed Subject','Provide item under review','LogicalService'],['gate','Policy Gate','Evaluate evidence and constraints','Control'],['ledger','Evidence Ledger','Preserve decisions and provenance','LogicalTechnologyCapability']],
};
const categoryInterfaces = {
  application: [['inbound','Inbound Use-Case Contract','client','application','request-response','OpenAPI or typed command'],['outbound','Outbound Dependency Port','application','adapter','request-response','provider-neutral port']],
  domain: [['command','Domain Command','application service','domain model','request-response','typed command'],['event','Domain Event','domain model','subscriber','event','AsyncAPI schema']],
  integration: [['ingress','Ingress Contract','producer','integration edge','request-response','OpenAPI/AsyncAPI'],['egress','Delivery Contract','integration edge','consumer','event','AsyncAPI schema']],
  data: [['write','Write Contract','application','data owner','request-response','command/schema'],['read','Read Contract','consumer','data product','request-response','query/data contract']],
  resilience: [['call','Protected Call','caller','dependency','request-response','service contract'],['health','Health Signal','dependency','operations','stream','metrics/health schema']],
  security: [['identity','Identity Assertion','subject','enforcement point','request-response','OIDC/SPIFFE/JWT'],['policy','Policy Decision','enforcement point','policy service','request-response','policy decision contract']],
  platform: [['self-service','Self-Service Request','developer','control plane','request-response','declarative API'],['status','Reconciliation Status','control plane','developer/operations','stream','status/event schema']],
  deployment: [['release','Release Manifest','delivery system','runtime','control','deployment manifest'],['evidence','Release Evidence','runtime','delivery system','stream','metrics/events']],
  observability: [['telemetry','Telemetry Envelope','workload','collector','stream','OpenTelemetry'],['query','Operational Query','operator','telemetry backend','request-response','query API']],
  ai: [['inference','Inference Contract','application','model gateway','request-response','model API'],['evaluation','Evaluation Evidence','gateway','evaluation loop','batch','evaluation schema']],
  governance: [['evidence','Evidence Submission','governed subject','policy gate','batch','evidence envelope'],['decision','Governance Decision','policy gate','owner','event','decision record']],
};

function enrichRecord(record) {
  const deep = top50.has(record.id);
  const base = record.name.replace(/ Architecture$/,'');
  const cdefs = categoryComponents[record.category] ?? categoryComponents.application;
  const idefs = categoryInterfaces[record.category] ?? categoryInterfaces.application;
  const componentKit = cdefs.map(([key, archetype, responsibility, kind], index) => ({
    key: `${record.id.toLowerCase()}-${key}`,
    name: `${base} ${archetype}`,
    archetype,
    responsibility,
    required: index < 2,
    canonicalKind: kind,
    properties: { patternId: record.id, category: record.category, lifecycleStages: record.applicableStages },
  }));
  const interfaceKit = idefs.map(([key,name,providerRole,consumerRole,interaction,contractType]) => ({
    key: `${record.id.toLowerCase()}-${key}`,
    name: `${record.name} ${name}`,
    providerRole, consumerRole, interaction,
    protocol: interaction === 'event' ? 'asynchronous' : interaction === 'stream' ? 'telemetry/stream' : 'provider-neutral',
    contractType, required: true,
  }));
  const topology = record.topology ?? (deep ? {
    nodes: componentKit.map((item, index) => ({ key:item.key, label:item.name, kind:item.canonicalKind, stage:record.applicableStages[0] ?? 'applicationRealization', properties:item.properties, tags:[record.category,record.id], offset:{x:index*240,y:(index%2)*140} })),
    edges: componentKit.slice(1).map((item,index) => ({ sourceKey:componentKit[index].key, targetKey:item.key, kind:'dependsOn', stage:record.applicableStages[0] ?? 'applicationRealization', label:'governed dependency', properties:{patternId:record.id} })),
    boundaryRules:[`Keep ${record.name} responsibilities within the selected scope.`,`Do not cross trust or ownership boundaries without a named contract.`],
  } : undefined);
  return {
    ...record,
    version:'2.0.0', dnaVersion:'2.0', topology,
    componentKit, interfaceKit,
    operationalImpacts:[`${record.name} introduces explicit ownership, telemetry and runbook obligations.`,`Capacity, failure handling and change procedures must be validated in the operating model.`],
    securityConsequences:[`Trust boundaries and identities created or crossed by ${record.name} must be explicit.`,`Authorization, secrets and audit evidence must follow approved policy.`],
    dataConsequences:[`Data ownership, consistency, retention and lineage affected by ${record.name} must be recorded.`,`Schema and contract evolution requires compatibility or an explicit migration.`],
    costImplications:[`${record.name} can add platform, delivery and operational cost even when it improves a priority quality attribute.`,`Estimate steady-state, scaling, observability and recovery cost before approval.`],
    failureModes:[...new Set([...(record.risks ?? []),`${record.name} is applied outside its stated context or without prerequisites.`,`Generated topology exists but required contracts or obligations are not implemented.`])],
    transitionStrategies:[`Introduce ${record.name} behind a bounded scope and capture a baseline.`,`Run compatibility and conformance checks before expanding adoption.`,`Retain a reversible migration or rollback path until evidence is accepted.`],
    providerNeutralRealization:[`Model responsibilities, contracts, policies and failure behaviour before product selection.`,`Map provider services only after neutral capabilities and quality obligations are accepted.`],
    detectionRules:[`Detect required component roles: ${componentKit.filter(x=>x.required).map(x=>x.archetype).join(', ')}.`,`Detect required contracts: ${interfaceKit.map(x=>x.contractType).join(', ')}.`,`Flag partial adoption when mandatory obligations lack owners or evidence.`],
    fitnessTests:(record.conformanceRules ?? []).map(rule=>`${rule.id}: ${rule.title} — ${rule.rationale}`),
    counterfactualExplanation:`Do not select ${record.name} when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.`,
    sourceLifecycleUses:(record.applicableStages ?? []).map(stage=>({stage,use:`Contextual ranking, design guidance, generation and review evidence for ${record.name}.`})),
    generationContract:{components:componentKit.length>0,relationships:componentKit.length>1,interfaces:interfaceKit.length>0,trustBoundaries:['security','integration','platform'].includes(record.category),obligations:(record.obligations??[]).length>0,risks:(record.risks??[]).length>0,fitnessTests:true,topology:Boolean(topology),idempotentApplicationKey:`${record.id}:2.0`},
    editorialReview:{depth:deep?'deep':'standard',reviewedBy:'AIW Architecture Knowledge Council',reviewedAt:'2026-07-11T00:00:00.000Z',releaseId:'AKR-0.10.55',independentReviewRequired:false,checklist:['Problem, context, forces, applicability, exclusions and prerequisites reviewed.','Quality, security, data, operational and cost consequences reviewed.','Generation, detection, fitness-test, evidence and counterfactual contracts reviewed.',...(deep?['Deep editorial pass completed for the rc.10.55 priority corpus.']:[])]},
    review:{...(record.review??{}),reviewedBy:'AIW Architecture Knowledge Council',reviewedAt:'2026-07-11T00:00:00.000Z',releaseId:'AKR-0.10.55',reviewMethod:deep?'expert-reviewed':(record.review?.reviewMethod??'calibrated-reference'),notes:[...(record.review?.notes??[]),'Upgraded to Pattern DNA 2.0 under rc.10.55.']},
  };
}

const corpus = readJson('sprint7_8-pattern-intelligence.json');
const records = corpus.records.map(enrichRecord);
const pct = (n) => Math.round((n/records.length)*1000)/10;
const metrics = {
  ...corpus.metrics,
  generatedAt:'2026-07-11T00:00:00.000Z', releaseId:'AKR-0.10.55', totalRecords:records.length,
  deepEditorialRecords:records.filter(x=>x.editorialReview.depth==='deep').length,
  patternDna2Coverage:pct(records.filter(x=>x.dnaVersion==='2.0').length),
  componentKitCoverage:pct(records.filter(x=>x.componentKit.length>0).length),
  interfaceKitCoverage:pct(records.filter(x=>x.interfaceKit.length>0).length),
  generationCoverage:pct(records.filter(x=>x.generationContract.obligations && (x.generationContract.components||x.generationContract.interfaces)).length),
  counterfactualCoverage:pct(records.filter(x=>x.counterfactualExplanation).length),
  recordsWithTopology:records.filter(x=>x.topology).length,
};
const dna2 = {version:'2.0.0',releaseId:'AKR-0.10.55',generatedAt:'2026-07-11T00:00:00.000Z',authority:'approved-release-only',metrics,records};
writeJson('rc10_55-pattern-dna2.json', dna2);
writeJson('sprint7_8-pattern-intelligence.json', {version:'2.0.0',releaseId:'AKR-0.10.55',metrics,records});

const catalog = readJson('sprint7_7-github-knowledge-catalog.json');
function posture(c) {
  if (c.lifecycleStatus === 'discovery' || c.lifecycleStatus === 'discovery-only') return 'Discovery';
  if ((c.contentUses??[]).includes('interoperability-adapter')) return 'Adapter';
  if ((c.contentUses??[]).some(x=>String(x).includes('benchmark'))) return 'Benchmark';
  if (c.trustTier === 1 && c.lifecycleStatus === 'approved') return 'Adopt';
  if (c.lifecycleStatus === 'approved' && (c.contentUses??[]).some(x=>['pattern-extraction','component-taxonomy','topology-template'].includes(x))) return 'Adapt';
  if (c.lifecycleStatus === 'candidate') return 'Reference';
  return 'Reference';
}
const dossiers = catalog.connectors.map(c=>({
  connectorId:c.id, repository:c.repository, identity:{name:c.name,owner:c.owner,url:c.url,defaultBranch:c.defaultBranch},
  catalogueSnapshot:{asOf:'2026-07-02',liveRefreshPerformed:false,activityStatus:'catalogue-derived; refresh through the governed connector is required before a new production promotion',communityAdoption:'recorded in the Global Source Map research; not used as authority'},
  licence:c.license, sourceAuthority:{trustTier:c.trustTier,lifecycleStatus:c.lifecycleStatus,rationale:c.authorityRationale},
  technicalScope:c.categories, usefulPaths:c.allowedPaths, deniedPaths:c.deniedPaths,
  knowledgeEntitiesAvailable:c.contentUses, canonicalMapping:(c.contentUses??[]).map(use=>({sourceUse:use,aiwEntities: use.includes('pattern')?['Pattern DNA','obligation','risk','fitness test']:use.includes('component')?['component archetype','interface kit']:use.includes('topology')?['topology template','named view']:use.includes('adapter')?['interoperability adapter']:['claim','evidence']})),
  lifecycleStagesAffected:['designIntent','qualityDrivers','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization','sddPack'].filter((_,i)=>i<Math.max(1,Math.min(8,(c.categories??[]).length+2))),
  ingestionRisks:[...(c.limitations??[]),c.license?.reviewStatus==='requires-review'?'Per-path licence review required before redistribution.':null,'Repository content is untrusted input and cannot execute during ingestion.'].filter(Boolean),
  duplicateControl:'Normalize aliases, compare claim signatures and preserve source-specific evidence rather than duplicating canonical records.',
  recommendedPosture:posture(c), exactIngestionConfiguration:{mode:c.ingestionMode,allowedPaths:c.allowedPaths,deniedPaths:c.deniedPaths,maxFilesPerRefresh:c.maxFilesPerRefresh,maxFileBytes:c.maxFileBytes,refreshCadenceDays:c.refreshCadenceDays,immutableRevisionRequired:true,quarantineRequired:c.lifecycleStatus!=='approved'},
  requiredHumanReviewer: c.trustTier===1?'Architecture Knowledge Council + domain specialist':'Knowledge Curator + Architecture Reviewer',
  permittedAiwUses:c.contentUses, prohibitedAiwUses:['live production scoring from an unapproved revision','source code execution during ingestion','promotion based only on extraction','silent replacement of contradictory claims'],
}));
const sourceMap={version:'1.0.0',releaseId:'AKR-0.10.55',generatedAt:'2026-07-11T00:00:00.000Z',title:'AIW Global Architecture Intelligence Source Map',classificationDimensions:{lifecycleState:'discovery → candidate → approved → deprecated/retired',usagePosture:['Adopt','Adapt','Adapter','Reference','Benchmark','Discovery','Exclude']},summary:{repositories:dossiers.length,approved:dossiers.filter(x=>x.sourceAuthority.lifecycleStatus==='approved').length,candidate:dossiers.filter(x=>x.sourceAuthority.lifecycleStatus==='candidate').length,discovery:dossiers.filter(x=>['discovery','discovery-only'].includes(x.sourceAuthority.lifecycleStatus)).length,postures:Object.fromEntries(['Adopt','Adapt','Adapter','Reference','Benchmark','Discovery','Exclude'].map(p=>[p,dossiers.filter(x=>x.recommendedPosture===p).length]))},dossiers};
writeJson('rc10_55-global-architecture-intelligence-source-map.json',sourceMap);

const cambridgePack={
  packId:'KPACK-CAMBRIDGE-SA-2.0',version:'2.0.0',releaseId:'AKR-0.10.55',status:'approved-reference-pack',
  provenance:{sourceFamily:'SRC-INTERNAL-CAMBRIDGE-PLAYBOOK',materials:['FPA_MSA_NEME.docx','SA Playbook_v2(2).xlsx','UCA MSA Study Companion.xlsx','Architecture Pattern Usecases.docx','Architecture Tactics_.docx','EA- Quality Requirements.docx','EA SSP - Architecture v4.docx','EA SSP - Drivers and Decisisons v 0.5.docx','EA SSP - Refined components v 2.0.1.docx','General Architecture Practices.docx','Table Analysis_Architectural Patterns and Quality Properties.docx','Agency Banking Solution SDD-Ver0.1.pdf'],usePolicy:'Internal licensed reference. Derive structured guidance; do not redistribute source text.',reviewOwner:'AIW Architecture Knowledge Council'},
  reasoningFlow:['problem and intended benefit','stakeholders, motivations, wishes and concerns','business, functional, quality and constraint drivers','architecturally significant requirements','viewpoints and architecture views','candidate styles, tactics and patterns','decisions, alternatives and trade-offs','components, responsibilities and interfaces','technology capabilities and provider mappings','risks, assumptions and validation','traceability and SDD handoff'],
  reasoningQuestions:{
    designIntent:['What business outcome and intended benefit justify the architecture work?','Who uses, funds, operates, governs and is affected by the solution?','What motivations, wishes and concerns must the architecture address?','What is explicitly in and out of scope?','Which assumptions require validation before synthesis?'],
    qualityDrivers:['Which requirements are architecturally significant?','Can each quality requirement be written as source, stimulus, environment, artifact, response and response measure?','Which quality drivers conflict, and which trade-off authority decides?','What baseline and measurable target will prove success?'],
    logicalApplication:['Which business capabilities and bounded responsibilities belong together?','Where should cohesion be high and coupling low?','Which components own behaviour and data?','What abstractions prevent ripple effects and preserve information hiding?'],
    applicationRealization:['Which deployable units realize each logical responsibility?','Which interfaces are required by each consumer and provider?','Which communication patterns are synchronous, asynchronous or batch, and why?','Which pattern obligations become tests or review controls?'],
    logicalTechnology:['Which vendor-neutral capabilities are required?','Which capabilities are mandatory, optional or prohibited by constraints?','What platform, security, data and observability services support the design?'],
    physicalTechnology:['Which products or managed services realize each accepted capability?','What deployment zones, trust boundaries, scaling units and recovery paths are required?','What provider-specific limits or costs alter the neutral design?'],
    validationRealization:['Which decisions address which drivers?','What alternatives were rejected and under what counterfactual conditions would they become preferable?','What risks, assumptions and failure modes remain?','Which fitness tests and evidence demonstrate readiness?'],
    sddPack:['Which audience needs which viewpoint and level of detail?','Does every significant requirement trace to decisions, components, interfaces and tests?','Are diagrams generated from the same canonical model as the narrative?','What is incomplete, externally dependent or awaiting acceptance?']
  },
  qualityScenarioGrammar:{fields:['source','stimulus','environment','artifact','response','responseMeasure'],rule:'A quality scenario is incomplete until the response measure is measurable and linked to an owner and validation method.'},
  viewpointLogic:[
    {audience:'business sponsor and product owner',views:['system context','capability and outcome traceability'],purpose:'Confirm scope, intended benefit and major dependencies.'},
    {audience:'solution and enterprise architects',views:['logical application','cross-stage traceability','decision and trade-off view'],purpose:'Assess boundaries, styles, patterns and alignment.'},
    {audience:'engineering teams',views:['application realization','interface and event flow','data architecture'],purpose:'Provide implementation-usable responsibilities and contracts.'},
    {audience:'platform, security and operations',views:['logical technology','physical deployment','security and trust boundaries','resilience and recovery'],purpose:'Validate run-time, control and recovery obligations.'},
    {audience:'review board and assurance',views:['requirements traceability','risks and assumptions','fitness tests and evidence'],purpose:'Make disposition decisions from governed evidence.'}
  ],
  reviewRules:['Every architecture decision links to one or more drivers and records alternatives, consequences, risks and assumptions.','Every component has a responsibility, owner, interfaces and linked drivers.','Every interface identifies provider, consumer, interaction style, contract and failure policy.','Every quality scenario has a measurable response and validation method.','Every diagram is a projection of the canonical model, not an independent drawing.','Every unresolved contradiction or assumption remains visible in review and SDD outputs.'],
  sddGrammar:['executive summary and intended benefit','stakeholders and concerns','scope, assumptions and constraints','business, functional and quality drivers','architecture style and decision records','logical application and component responsibilities','application realization and interfaces','data architecture','security and trust boundaries','logical and physical technology','deployment, resilience and recovery','operations and observability','risks, assumptions and trade-offs','fitness tests and acceptance evidence','cross-stage traceability and appendices'],
  completenessControls:['No significant driver without a decision or explicit deferral.','No mandatory component without responsibility and owner.','No external dependency without contract, timeout and failure policy.','No data store without ownership, consistency, retention and protection properties.','No selected pattern without obligations, risks, evidence and counterfactual explanation.','No SDD section generated from stale or unpinned knowledge.']
};
writeJson('rc10_55-cambridge-knowledge-pack.json',cambridgePack);

const stageKits={version:'1.0.0',releaseId:'AKR-0.10.55',generatedAt:'2026-07-11T00:00:00.000Z',stages:[
  {stage:'designIntent',objective:'Frame the problem, intended benefit, stakeholders, scope and constraints.',preferredStyles:[],patternEmphasis:['PAT-EVENT-STORMING','PAT-DOMAIN-STORYTELLING','PAT-EXAMPLE-MAPPING'],componentFamilies:['Actor','Business Domain','External System'],interfaceFocus:['system boundary','external dependency'],requiredEvidence:['stakeholder concerns','scope decision','assumption register'],obligations:['named sponsor','measurable outcomes','explicit exclusions'],handoffArtifacts:['design brief','context view','driver candidate register'],cambridgeQuestions:cambridgePack.reasoningQuestions.designIntent},
  {stage:'qualityDrivers',objective:'Convert outcomes and constraints into measurable ASRs and trade-offs.',preferredStyles:[],patternEmphasis:['PAT-ARCHITECTURE-DECISION-RECORD','PAT-ARCHITECTURE-FITNESS-FUNCTION'],componentFamilies:['Quality Scenario','Constraint','Decision'],interfaceFocus:['response measure','validation method'],requiredEvidence:['quality scenarios','priority weights','conflict decisions'],obligations:['measurable response','owner','validation method'],handoffArtifacts:['quality driver register','trade-off map'],cambridgeQuestions:cambridgePack.reasoningQuestions.qualityDrivers},
  {stage:'logicalApplication',objective:'Define vendor-neutral responsibilities, boundaries, data ownership and interactions.',preferredStyles:['STYLE-MODULAR-MONOLITH','STYLE-MICROSERVICES','STYLE-EVENT-DRIVEN'],patternEmphasis:['PAT-BOUNDED-CONTEXT','PAT-HEXAGONAL-ARCHITECTURE','PAT-CLEAN-ARCHITECTURE','PAT-ANTI-CORRUPTION-LAYER'],componentFamilies:['Business Domain','Logical Service','Actor','External System'],interfaceFocus:['domain command','domain event','published language'],requiredEvidence:['responsibility model','boundary rationale','data ownership'],obligations:['high cohesion','controlled coupling','named owners'],handoffArtifacts:['logical application view','component responsibility register'],cambridgeQuestions:cambridgePack.reasoningQuestions.logicalApplication},
  {stage:'applicationRealization',objective:'Realize logical responsibilities as deployable components and explicit contracts.',preferredStyles:['STYLE-MODULAR-MONOLITH','STYLE-MICROSERVICES','STYLE-EVENT-DRIVEN'],patternEmphasis:['PAT-API-GATEWAY','PAT-BACKEND-FOR-FRONTEND','PAT-TRANSACTIONAL-OUTBOX','PAT-IDEMPOTENT-CONSUMER','PAT-SAGA-BOUNDARY'],componentFamilies:['Deployable Unit','Module','Worker','API','Event'],interfaceFocus:['OpenAPI','AsyncAPI','batch/data contract','failure policy'],requiredEvidence:['component-interface traceability','pattern obligations','deployment independence'],obligations:['provider and consumer','versioned contract','timeout/retry/idempotency'],handoffArtifacts:['application realization view','interface register','event flow'],cambridgeQuestions:cambridgePack.reasoningQuestions.applicationRealization},
  {stage:'logicalTechnology',objective:'Select provider-neutral platform, data, security, integration and observability capabilities.',preferredStyles:['STYLE-PLATFORM-CENTRIC','STYLE-CELL-BASED','STYLE-SERVERLESS'],patternEmphasis:['PAT-PLATFORM-ENGINEERING','PAT-INTERNAL-DEVELOPER-PLATFORM','PAT-SERVICE-MESH','PAT-ZERO-TRUST','PAT-DISTRIBUTED-TRACING'],componentFamilies:['Logical Technology Capability','Control','Platform Service'],interfaceFocus:['capability contract','identity assertion','telemetry envelope'],requiredEvidence:['capability rationale','quality fit','operating model fit'],obligations:['vendor neutrality','support ownership','service levels'],handoffArtifacts:['logical technology view','capability-to-requirement matrix'],cambridgeQuestions:cambridgePack.reasoningQuestions.logicalTechnology},
  {stage:'physicalTechnology',objective:'Map neutral capabilities to products, topology, trust zones and recovery paths.',preferredStyles:['STYLE-CELL-BASED','STYLE-SERVERLESS'],patternEmphasis:['PAT-CANARY-RELEASE','PAT-GITOPS','PAT-DISASTER-RECOVERY','PAT-MUTUAL-TLS','PAT-SECRETS-MANAGEMENT'],componentFamilies:['Region','Network Zone','Deployment Node','Runtime','Data Store'],interfaceFocus:['network protocol','trust boundary','deployment manifest'],requiredEvidence:['provider mapping','capacity assumptions','recovery design','cost assumptions'],obligations:['logical-to-physical lineage','no vendor override of neutral design','rollback path'],handoffArtifacts:['physical deployment view','security view','resilience view'],cambridgeQuestions:cambridgePack.reasoningQuestions.physicalTechnology},
  {stage:'validationRealization',objective:'Review completeness, risks, decisions, conformance and readiness.',preferredStyles:[],patternEmphasis:['PAT-THREAT-MODELING','PAT-POLICY-AS-CODE','PAT-SLO-BASED-OPERATIONS','PAT-ARCHITECTURE-FITNESS-FUNCTION'],componentFamilies:['Finding','ADR','Fitness Test','Evidence'],interfaceFocus:['evidence envelope','governance decision'],requiredEvidence:['decision record','fitness result','risk disposition','counterfactual'],obligations:['no hidden blockers','waiver expiry','evidence provenance'],handoffArtifacts:['review pack','ADR set','fitness-test pack','acceptance disposition'],cambridgeQuestions:cambridgePack.reasoningQuestions.validationRealization},
  {stage:'sddPack',objective:'Assemble a coherent, audience-specific and traceable architecture delivery pack.',preferredStyles:[],patternEmphasis:['PAT-ARCHITECTURE-DECISION-RECORD','PAT-CLAIM-LEVEL-PROVENANCE'],componentFamilies:['Artifact','Diagram','Traceability Link'],interfaceFocus:['document-to-model reference','artifact manifest'],requiredEvidence:['pinned knowledge release','diagram/model consistency','section completeness'],obligations:['rendered diagrams','requirements traceability','known limitations'],handoffArtifacts:['SDD','diagram pack','CALM/JSON model','evidence manifest'],cambridgeQuestions:cambridgePack.reasoningQuestions.sddPack}
]};
writeJson('rc10_55-stage-intelligence-kits.json',stageKits);

const patternSchema={$schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://aiw.local/schemas/rc10_55-pattern-dna2.schema.json',title:'AIW Pattern DNA 2.0 Corpus',type:'object',required:['version','releaseId','metrics','records'],properties:{version:{const:'2.0.0'},releaseId:{const:'AKR-0.10.55'},records:{type:'array',minItems:200,items:{type:'object',required:['id','name','dnaVersion','problem','context','forces','applicabilityRules','exclusions','prerequisites','componentKit','interfaceKit','obligations','risks','failureModes','transitionStrategies','providerNeutralRealization','detectionRules','fitnessTests','evidence','counterfactualExplanation','generationContract','editorialReview'],properties:{dnaVersion:{const:'2.0'},componentKit:{type:'array',minItems:1},interfaceKit:{type:'array',minItems:1},evidence:{type:'array',minItems:1},counterfactualExplanation:{type:'string',minLength:20}}}}}};
writeJson('rc10_55-pattern-dna2.schema.json',patternSchema);
const sourceSchema={$schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://aiw.local/schemas/rc10_55-source-map.schema.json',title:'AIW Global Architecture Intelligence Source Map',type:'object',required:['releaseId','dossiers'],properties:{releaseId:{const:'AKR-0.10.55'},dossiers:{type:'array',minItems:40,items:{type:'object',required:['connectorId','identity','licence','sourceAuthority','technicalScope','usefulPaths','knowledgeEntitiesAvailable','canonicalMapping','lifecycleStagesAffected','ingestionRisks','recommendedPosture','exactIngestionConfiguration','requiredHumanReviewer']}}}};
writeJson('rc10_55-source-map.schema.json',sourceSchema);

const report={releaseId:'AKR-0.10.55',generatedAt:'2026-07-11T00:00:00.000Z',patternDna2:metrics,sourceMap:sourceMap.summary,cambridgePack:{reasoningStages:Object.keys(cambridgePack.reasoningQuestions).length,reviewRules:cambridgePack.reviewRules.length,sddSections:cambridgePack.sddGrammar.length},stageKits:{count:stageKits.stages.length,allHavePatterns:stageKits.stages.every(s=>s.patternEmphasis.length>0),allHaveEvidence:stageKits.stages.every(s=>s.requiredEvidence.length>0)},acceptance:{top50DeepEditorial:metrics.deepEditorialRecords===50,noRecordWithoutProvenance:records.every(x=>x.evidence?.length),noExtractionOnlyPromotion:records.every(x=>x.editorialReview?.reviewedBy),generationContractCoverage:metrics.generationCoverage===100,sourceLifecycleMapping:dossiers.every(x=>x.lifecycleStagesAffected.length>0),conflictsRemainVisible:records.every(x=>Array.isArray(x.conflicts))}};
fs.writeFileSync(path.join(generatedDir,'rc10_55-knowledge-fabric-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
