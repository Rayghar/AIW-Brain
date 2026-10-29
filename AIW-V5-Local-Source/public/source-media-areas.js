// One vocabulary for the repository's server-side filters and the Design Resources view.
// These labels organize discovery; they are not release or approval classifications.
export const SOURCE_MEDIA_AREAS=Object.freeze([
 {id:'principles',name:'Principles & controls',matches:/Principle|Governance|Policy|Exception|Approval|SecurityControl|Guardrail|Standard|Control/},
 {id:'options',name:'Patterns & choices',matches:/Pattern|Tradeoff|Decision|Option|ReferenceArchitecture|SelectionCriterion|TechnologyComparison|ArchitectureConsideration/},
 {id:'realization',name:'Components & assets',matches:/Component|CodeTemplate|ImplementationAsset|AutomationRecipe|PipelineTemplate|Toolchain|DeploymentAsset/},
 {id:'assurance',name:'Quality & evidence',matches:/Evidence|Test|Benchmark|Metric|ReleaseProcess|PromotionGate|ConfigurationStandard|ImpactAssessment/},
 {id:'portfolio',name:'Investment & portfolio',matches:/Portfolio|Demand|Investment|Benefit|Funding|Cost|ProjectLifecycle|StageGate|Prioritization|HealthMetric|StatusReport/}
]);
export const sourceMediaAreas=scene=>SOURCE_MEDIA_AREAS.filter(area=>[
 ...(Array.isArray(scene?.assetTypes)?scene.assetTypes:[]),
 ...(Array.isArray(scene?.relatedNodes)?scene.relatedNodes:[]).map(node=>node.type)
].some(type=>typeof type==='string'&&area.matches.test(type)));
