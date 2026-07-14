import type { DesignLibraryRecord } from './types.js';

/** Generated from the approved Pattern DNA topology records in AKR-0.10.60. */
export const patternDnaTopologyTemplates: DesignLibraryRecord[] = [
  {
    "id": "TPL-SECURE-API-SERVICE",
    "recordType": "template",
    "name": "Secure API Service",
    "category": "security",
    "description": "Secure API Service normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "security",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "security",
      "topology-template",
      "secure-api-service",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-secure-api-service",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "security": 5,
      "usability": 2
    },
    "whenToUse": [
      "Use when Secure API Service is relevant to the selected security scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Secure API Service only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Secure API Service."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [
      "ANTI-BIG-BALL-OF-MUD"
    ],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Secure API Service."
    ],
    "risks": [
      "Misapplying Secure API Service can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Secure API Service",
        "description": "Secure API Service generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "SECURE-API-SERVICE"
        },
        "tags": [
          "security",
          "secure-api-service"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Control",
        "stage": "applicationRealization",
        "label": "Secure API Service Support",
        "description": "Secure API Service Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "security",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-SECURE-API-SERVICE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-EVENT-DRIVEN-SERVICE",
    "recordType": "template",
    "name": "Event-Driven Service",
    "category": "integration",
    "description": "Event-Driven Service normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "integration",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "integration",
      "topology-template",
      "event-driven-service",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-event-driven-service",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "interoperability": 4,
      "reliability": 3
    },
    "whenToUse": [
      "Use when Event-Driven Service is relevant to the selected integration scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Event-Driven Service only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Event-Driven Service."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Event-Driven Service."
    ],
    "risks": [
      "Misapplying Event-Driven Service can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Event-Driven Service",
        "description": "Event-Driven Service generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "EVENT-DRIVEN-SERVICE"
        },
        "tags": [
          "integration",
          "event-driven-service"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Event",
        "stage": "applicationRealization",
        "label": "Event-Driven Service Support",
        "description": "Event-Driven Service Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "integration",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "publishes",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-EVENT-DRIVEN-SERVICE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-TRANSACTIONAL-OUTBOX-TOPOLOGY",
    "recordType": "template",
    "name": "Transactional Outbox Topology",
    "category": "resilience",
    "description": "Transactional Outbox Topology normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "resilience",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "resilience",
      "topology-template",
      "transactional-outbox-topology",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-transactional-outbox-topology",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "availability": 5,
      "operability": 3
    },
    "whenToUse": [
      "Use when Transactional Outbox Topology is relevant to the selected resilience scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Transactional Outbox Topology only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Transactional Outbox Topology."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Transactional Outbox Topology."
    ],
    "risks": [
      "Misapplying Transactional Outbox Topology can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Transactional Outbox Topology",
        "description": "Transactional Outbox Topology generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "TRANSACTIONAL-OUTBOX-TOPOLOGY"
        },
        "tags": [
          "resilience",
          "transactional-outbox-topology"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "Transactional Outbox Topology Support",
        "description": "Transactional Outbox Topology Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "resilience",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-TRANSACTIONAL-OUTBOX-TOPOLOGY",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-CQRS-SERVICE",
    "recordType": "template",
    "name": "CQRS Service",
    "category": "platform",
    "description": "CQRS Service normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "platform",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "platform",
      "topology-template",
      "cqrs-service",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-cqrs-service",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 4,
      "cost": 3
    },
    "whenToUse": [
      "Use when CQRS Service is relevant to the selected platform scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt CQRS Service only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for CQRS Service."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by CQRS Service."
    ],
    "risks": [
      "Misapplying CQRS Service can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "CQRS Service",
        "description": "CQRS Service generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "CQRS-SERVICE"
        },
        "tags": [
          "platform",
          "cqrs-service"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "CQRS Service Support",
        "description": "CQRS Service Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "platform",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-CQRS-SERVICE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-RESILIENT-EXTERNAL-CALL",
    "recordType": "template",
    "name": "Resilient External Call",
    "category": "ai",
    "description": "Resilient External Call normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "ai",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "ai",
      "topology-template",
      "resilient-external-call",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-resilient-external-call",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "intelligence-quality": 4,
      "security": 4
    },
    "whenToUse": [
      "Use when Resilient External Call is relevant to the selected ai scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Resilient External Call only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Resilient External Call."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Resilient External Call."
    ],
    "risks": [
      "Misapplying Resilient External Call can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Resilient External Call",
        "description": "Resilient External Call generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "RESILIENT-EXTERNAL-CALL"
        },
        "tags": [
          "ai",
          "resilient-external-call"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "Resilient External Call Support",
        "description": "Resilient External Call Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "ai",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-RESILIENT-EXTERNAL-CALL",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-MULTI-REGION-ACTIVE-ACTIVE",
    "recordType": "template",
    "name": "Multi-Region Active-Active",
    "category": "deployment",
    "description": "Multi-Region Active-Active normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "deployment",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "deployment",
      "topology-template",
      "multi-region-active-active",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-multi-region-active-active",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 5,
      "availability": 3
    },
    "whenToUse": [
      "Use when Multi-Region Active-Active is relevant to the selected deployment scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Multi-Region Active-Active only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Multi-Region Active-Active."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Multi-Region Active-Active."
    ],
    "risks": [
      "Misapplying Multi-Region Active-Active can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "Multi-Region Active-Active",
        "description": "Multi-Region Active-Active generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "MULTI-REGION-ACTIVE-ACTIVE"
        },
        "tags": [
          "deployment",
          "multi-region-active-active"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "Multi-Region Active-Active Support",
        "description": "Multi-Region Active-Active Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "deployment",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-MULTI-REGION-ACTIVE-ACTIVE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-ZERO-TRUST-SERVICE-BOUNDARY",
    "recordType": "template",
    "name": "Zero-Trust Service Boundary",
    "category": "security",
    "description": "Zero-Trust Service Boundary normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "security",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "security",
      "topology-template",
      "zero-trust-service-boundary",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-zero-trust-service-boundary",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "security": 5,
      "usability": 2
    },
    "whenToUse": [
      "Use when Zero-Trust Service Boundary is relevant to the selected security scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Zero-Trust Service Boundary only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Zero-Trust Service Boundary."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Zero-Trust Service Boundary."
    ],
    "risks": [
      "Misapplying Zero-Trust Service Boundary can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Zero-Trust Service Boundary",
        "description": "Zero-Trust Service Boundary generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "ZERO-TRUST-SERVICE-BOUNDARY"
        },
        "tags": [
          "security",
          "zero-trust-service-boundary"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Control",
        "stage": "applicationRealization",
        "label": "Zero-Trust Service Boundary Support",
        "description": "Zero-Trust Service Boundary Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "security",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-ZERO-TRUST-SERVICE-BOUNDARY",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-OBSERVABLE-MICROSERVICE",
    "recordType": "template",
    "name": "Observable Microservice",
    "category": "integration",
    "description": "Observable Microservice normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "integration",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "integration",
      "topology-template",
      "observable-microservice",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-observable-microservice",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "interoperability": 4,
      "reliability": 3
    },
    "whenToUse": [
      "Use when Observable Microservice is relevant to the selected integration scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Observable Microservice only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Observable Microservice."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Observable Microservice."
    ],
    "risks": [
      "Misapplying Observable Microservice can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Observable Microservice",
        "description": "Observable Microservice generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "OBSERVABLE-MICROSERVICE"
        },
        "tags": [
          "integration",
          "observable-microservice"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Event",
        "stage": "applicationRealization",
        "label": "Observable Microservice Support",
        "description": "Observable Microservice Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "integration",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "publishes",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-OBSERVABLE-MICROSERVICE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-MODULAR-MONOLITH-STARTER",
    "recordType": "template",
    "name": "Modular Monolith Starter",
    "category": "resilience",
    "description": "Modular Monolith Starter normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "resilience",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "resilience",
      "topology-template",
      "modular-monolith-starter",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-modular-monolith-starter",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "availability": 5,
      "operability": 3
    },
    "whenToUse": [
      "Use when Modular Monolith Starter is relevant to the selected resilience scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Modular Monolith Starter only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Modular Monolith Starter."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Modular Monolith Starter."
    ],
    "risks": [
      "Misapplying Modular Monolith Starter can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Modular Monolith Starter",
        "description": "Modular Monolith Starter generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "MODULAR-MONOLITH-STARTER"
        },
        "tags": [
          "resilience",
          "modular-monolith-starter"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "Modular Monolith Starter Support",
        "description": "Modular Monolith Starter Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "resilience",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-MODULAR-MONOLITH-STARTER",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-DATA-LAKEHOUSE-PLATFORM",
    "recordType": "template",
    "name": "Data Lakehouse Platform",
    "category": "platform",
    "description": "Data Lakehouse Platform normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "platform",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "platform",
      "topology-template",
      "data-lakehouse-platform",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-data-lakehouse-platform",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 4,
      "cost": 3
    },
    "whenToUse": [
      "Use when Data Lakehouse Platform is relevant to the selected platform scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Data Lakehouse Platform only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Data Lakehouse Platform."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Data Lakehouse Platform."
    ],
    "risks": [
      "Misapplying Data Lakehouse Platform can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "Data Lakehouse Platform",
        "description": "Data Lakehouse Platform generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "DATA-LAKEHOUSE-PLATFORM"
        },
        "tags": [
          "platform",
          "data-lakehouse-platform"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "Data Lakehouse Platform Support",
        "description": "Data Lakehouse Platform Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "platform",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-DATA-LAKEHOUSE-PLATFORM",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-RAG-APPLICATION",
    "recordType": "template",
    "name": "RAG Application",
    "category": "ai",
    "description": "RAG Application normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "ai",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "ai",
      "topology-template",
      "rag-application",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-rag-application",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "intelligence-quality": 4,
      "security": 4
    },
    "whenToUse": [
      "Use when RAG Application is relevant to the selected ai scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt RAG Application only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for RAG Application."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by RAG Application."
    ],
    "risks": [
      "Misapplying RAG Application can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "RAG Application",
        "description": "RAG Application generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "RAG-APPLICATION"
        },
        "tags": [
          "ai",
          "rag-application"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "RAG Application Support",
        "description": "RAG Application Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "ai",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-RAG-APPLICATION",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-AGENTIC-WORKFLOW-WITH-APPROVAL",
    "recordType": "template",
    "name": "Agentic Workflow with Approval",
    "category": "deployment",
    "description": "Agentic Workflow with Approval normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "deployment",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "deployment",
      "topology-template",
      "agentic-workflow-with-approval",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-agentic-workflow-with-approval",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 5,
      "availability": 3
    },
    "whenToUse": [
      "Use when Agentic Workflow with Approval is relevant to the selected deployment scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Agentic Workflow with Approval only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Agentic Workflow with Approval."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [
      "ANTI-BIG-BALL-OF-MUD"
    ],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Agentic Workflow with Approval."
    ],
    "risks": [
      "Misapplying Agentic Workflow with Approval can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "Agentic Workflow with Approval",
        "description": "Agentic Workflow with Approval generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "AGENTIC-WORKFLOW-WITH-APPROVAL"
        },
        "tags": [
          "deployment",
          "agentic-workflow-with-approval"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "Agentic Workflow with Approval Support",
        "description": "Agentic Workflow with Approval Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "deployment",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-AGENTIC-WORKFLOW-WITH-APPROVAL",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-ASYNCAPI-EVENT-MESH",
    "recordType": "template",
    "name": "AsyncAPI Event Mesh",
    "category": "security",
    "description": "AsyncAPI Event Mesh normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "security",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "security",
      "topology-template",
      "asyncapi-event-mesh",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-asyncapi-event-mesh",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "security": 5,
      "usability": 2
    },
    "whenToUse": [
      "Use when AsyncAPI Event Mesh is relevant to the selected security scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt AsyncAPI Event Mesh only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for AsyncAPI Event Mesh."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by AsyncAPI Event Mesh."
    ],
    "risks": [
      "Misapplying AsyncAPI Event Mesh can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "AsyncAPI Event Mesh",
        "description": "AsyncAPI Event Mesh generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "ASYNCAPI-EVENT-MESH"
        },
        "tags": [
          "security",
          "asyncapi-event-mesh"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Control",
        "stage": "applicationRealization",
        "label": "AsyncAPI Event Mesh Support",
        "description": "AsyncAPI Event Mesh Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "security",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-ASYNCAPI-EVENT-MESH",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-SERVICE-MESH-BASELINE",
    "recordType": "template",
    "name": "Service Mesh Baseline",
    "category": "integration",
    "description": "Service Mesh Baseline normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "integration",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "integration",
      "topology-template",
      "service-mesh-baseline",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-service-mesh-baseline",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "interoperability": 4,
      "reliability": 3
    },
    "whenToUse": [
      "Use when Service Mesh Baseline is relevant to the selected integration scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Service Mesh Baseline only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Service Mesh Baseline."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Service Mesh Baseline."
    ],
    "risks": [
      "Misapplying Service Mesh Baseline can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Service Mesh Baseline",
        "description": "Service Mesh Baseline generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "SERVICE-MESH-BASELINE"
        },
        "tags": [
          "integration",
          "service-mesh-baseline"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Event",
        "stage": "applicationRealization",
        "label": "Service Mesh Baseline Support",
        "description": "Service Mesh Baseline Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "integration",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "publishes",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-SERVICE-MESH-BASELINE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-PLATFORM-GOLDEN-PATH",
    "recordType": "template",
    "name": "Platform Golden Path",
    "category": "resilience",
    "description": "Platform Golden Path normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "resilience",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "resilience",
      "topology-template",
      "platform-golden-path",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-platform-golden-path",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "availability": 5,
      "operability": 3
    },
    "whenToUse": [
      "Use when Platform Golden Path is relevant to the selected resilience scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Platform Golden Path only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Platform Golden Path."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Platform Golden Path."
    ],
    "risks": [
      "Misapplying Platform Golden Path can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Platform Golden Path",
        "description": "Platform Golden Path generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "PLATFORM-GOLDEN-PATH"
        },
        "tags": [
          "resilience",
          "platform-golden-path"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "Platform Golden Path Support",
        "description": "Platform Golden Path Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "resilience",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-PLATFORM-GOLDEN-PATH",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-GITOPS-DELIVERY-PIPELINE",
    "recordType": "template",
    "name": "GitOps Delivery Pipeline",
    "category": "platform",
    "description": "GitOps Delivery Pipeline normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "platform",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "platform",
      "topology-template",
      "gitops-delivery-pipeline",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-gitops-delivery-pipeline",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 4,
      "cost": 3
    },
    "whenToUse": [
      "Use when GitOps Delivery Pipeline is relevant to the selected platform scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt GitOps Delivery Pipeline only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for GitOps Delivery Pipeline."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by GitOps Delivery Pipeline."
    ],
    "risks": [
      "Misapplying GitOps Delivery Pipeline can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "GitOps Delivery Pipeline",
        "description": "GitOps Delivery Pipeline generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "GITOPS-DELIVERY-PIPELINE"
        },
        "tags": [
          "platform",
          "gitops-delivery-pipeline"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "GitOps Delivery Pipeline Support",
        "description": "GitOps Delivery Pipeline Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "platform",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-GITOPS-DELIVERY-PIPELINE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-CELL-BASED-WORKLOAD",
    "recordType": "template",
    "name": "Cell-Based Workload",
    "category": "ai",
    "description": "Cell-Based Workload normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "ai",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "ai",
      "topology-template",
      "cell-based-workload",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-cell-based-workload",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "intelligence-quality": 4,
      "security": 4
    },
    "whenToUse": [
      "Use when Cell-Based Workload is relevant to the selected ai scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Cell-Based Workload only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Cell-Based Workload."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Cell-Based Workload."
    ],
    "risks": [
      "Misapplying Cell-Based Workload can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Cell-Based Workload",
        "description": "Cell-Based Workload generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "CELL-BASED-WORKLOAD"
        },
        "tags": [
          "ai",
          "cell-based-workload"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "Cell-Based Workload Support",
        "description": "Cell-Based Workload Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "ai",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-CELL-BASED-WORKLOAD",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-MULTI-TENANT-SAAS",
    "recordType": "template",
    "name": "Multi-Tenant SaaS",
    "category": "deployment",
    "description": "Multi-Tenant SaaS normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "deployment",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "deployment",
      "topology-template",
      "multi-tenant-saas",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-multi-tenant-saas",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 5,
      "availability": 3
    },
    "whenToUse": [
      "Use when Multi-Tenant SaaS is relevant to the selected deployment scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Multi-Tenant SaaS only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Multi-Tenant SaaS."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Multi-Tenant SaaS."
    ],
    "risks": [
      "Misapplying Multi-Tenant SaaS can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "Multi-Tenant SaaS",
        "description": "Multi-Tenant SaaS generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "MULTI-TENANT-SAAS"
        },
        "tags": [
          "deployment",
          "multi-tenant-saas"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "Multi-Tenant SaaS Support",
        "description": "Multi-Tenant SaaS Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "deployment",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-MULTI-TENANT-SAAS",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-EDGE-PROCESSING-TOPOLOGY",
    "recordType": "template",
    "name": "Edge Processing Topology",
    "category": "security",
    "description": "Edge Processing Topology normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "security",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "security",
      "topology-template",
      "edge-processing-topology",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-edge-processing-topology",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "security": 5,
      "usability": 2
    },
    "whenToUse": [
      "Use when Edge Processing Topology is relevant to the selected security scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Edge Processing Topology only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Edge Processing Topology."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Edge Processing Topology."
    ],
    "risks": [
      "Misapplying Edge Processing Topology can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Edge Processing Topology",
        "description": "Edge Processing Topology generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "EDGE-PROCESSING-TOPOLOGY"
        },
        "tags": [
          "security",
          "edge-processing-topology"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Control",
        "stage": "applicationRealization",
        "label": "Edge Processing Topology Support",
        "description": "Edge Processing Topology Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "security",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-EDGE-PROCESSING-TOPOLOGY",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-HYBRID-INTEGRATION-HUB",
    "recordType": "template",
    "name": "Hybrid Integration Hub",
    "category": "integration",
    "description": "Hybrid Integration Hub normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "integration",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "integration",
      "topology-template",
      "hybrid-integration-hub",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-hybrid-integration-hub",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "interoperability": 4,
      "reliability": 3
    },
    "whenToUse": [
      "Use when Hybrid Integration Hub is relevant to the selected integration scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Hybrid Integration Hub only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Hybrid Integration Hub."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Hybrid Integration Hub."
    ],
    "risks": [
      "Misapplying Hybrid Integration Hub can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Hybrid Integration Hub",
        "description": "Hybrid Integration Hub generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "HYBRID-INTEGRATION-HUB"
        },
        "tags": [
          "integration",
          "hybrid-integration-hub"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "Event",
        "stage": "applicationRealization",
        "label": "Hybrid Integration Hub Support",
        "description": "Hybrid Integration Hub Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "integration",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "publishes",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-HYBRID-INTEGRATION-HUB",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-PAYMENT-PROCESSING-CELL",
    "recordType": "template",
    "name": "Payment Processing Cell",
    "category": "resilience",
    "description": "Payment Processing Cell normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "resilience",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "resilience",
      "topology-template",
      "payment-processing-cell",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-payment-processing-cell",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "availability": 5,
      "operability": 3
    },
    "whenToUse": [
      "Use when Payment Processing Cell is relevant to the selected resilience scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Payment Processing Cell only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Payment Processing Cell."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Payment Processing Cell."
    ],
    "risks": [
      "Misapplying Payment Processing Cell can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Payment Processing Cell",
        "description": "Payment Processing Cell generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "PAYMENT-PROCESSING-CELL"
        },
        "tags": [
          "resilience",
          "payment-processing-cell"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "Payment Processing Cell Support",
        "description": "Payment Processing Cell Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "resilience",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-PAYMENT-PROCESSING-CELL",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-LOW-CONNECTIVITY-SYNC",
    "recordType": "template",
    "name": "Low-Connectivity Sync",
    "category": "platform",
    "description": "Low-Connectivity Sync normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "platform",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "platform",
      "topology-template",
      "low-connectivity-sync",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-low-connectivity-sync",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 4,
      "cost": 3
    },
    "whenToUse": [
      "Use when Low-Connectivity Sync is relevant to the selected platform scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Low-Connectivity Sync only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Low-Connectivity Sync."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Low-Connectivity Sync."
    ],
    "risks": [
      "Misapplying Low-Connectivity Sync can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "Low-Connectivity Sync",
        "description": "Low-Connectivity Sync generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "LOW-CONNECTIVITY-SYNC"
        },
        "tags": [
          "platform",
          "low-connectivity-sync"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "Low-Connectivity Sync Support",
        "description": "Low-Connectivity Sync Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "platform",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-LOW-CONNECTIVITY-SYNC",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-SECURE-DATA-EXCHANGE",
    "recordType": "template",
    "name": "Secure Data Exchange",
    "category": "ai",
    "description": "Secure Data Exchange normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "applicationRealization",
      "logicalTechnology"
    ],
    "applicableViewpoints": [
      "ai",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "ai",
      "topology-template",
      "secure-data-exchange",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-secure-data-exchange",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "intelligence-quality": 4,
      "security": 4
    },
    "whenToUse": [
      "Use when Secure Data Exchange is relevant to the selected ai scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt Secure Data Exchange only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for Secure Data Exchange."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [
      "ANTI-BIG-BALL-OF-MUD"
    ],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by Secure Data Exchange."
    ],
    "risks": [
      "Misapplying Secure Data Exchange can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalService",
        "stage": "applicationRealization",
        "label": "Secure Data Exchange",
        "description": "Secure Data Exchange generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "SECURE-DATA-EXCHANGE"
        },
        "tags": [
          "ai",
          "secure-data-exchange"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "applicationRealization",
        "label": "Secure Data Exchange Support",
        "description": "Secure Data Exchange Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "ai",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "applicationRealization",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-SECURE-DATA-EXCHANGE",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  },
  {
    "id": "TPL-AI-MODEL-GATEWAY",
    "recordType": "template",
    "name": "AI Model Gateway",
    "category": "deployment",
    "description": "AI Model Gateway normalized as an AIW topology-template record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.",
    "applicableStages": [
      "logicalTechnology",
      "physicalTechnology"
    ],
    "applicableViewpoints": [
      "deployment",
      "model",
      "traceability"
    ],
    "maturity": "mature",
    "approvalStatus": "approved",
    "owner": "AIW Architecture Knowledge Council",
    "version": "0.8.8",
    "tags": [
      "deployment",
      "topology-template",
      "ai-model-gateway",
      "pattern-dna",
      "governed-template"
    ],
    "depiction": {
      "renderer": "PatternTopology",
      "icon": "network",
      "shape": "boundary",
      "defaultSize": {
        "width": 360,
        "height": 210
      },
      "canContainChildren": true,
      "ports": [],
      "previewKind": "tpl-ai-model-gateway",
      "notationMappings": {
        "custom": "topology-template",
        "calm": "pattern",
        "c4": "dynamic-view"
      }
    },
    "properties": [],
    "qualityAttributeImpact": {
      "deployability": 5,
      "availability": 3
    },
    "whenToUse": [
      "Use when AI Model Gateway is relevant to the selected deployment scope.",
      "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
    ],
    "whenToQuestion": [
      "Do not adopt AI Model Gateway only because a technology or repository is popular."
    ],
    "requires": [
      "Named owner and measurable quality scenario for AI Model Gateway."
    ],
    "recommends": [],
    "pairsWellWith": [],
    "conflictsWith": [],
    "obligations": [
      "Define ownership, monitoring, failure handling and review criteria introduced by AI Model Gateway."
    ],
    "risks": [
      "Misapplying AI Model Gateway can add complexity without improving the priority quality attributes."
    ],
    "mitigations": [
      "Use an architecture decision record, measurable acceptance criteria and implementation fitness functions."
    ],
    "evidenceIds": [],
    "nodeTemplate": [
      {
        "key": "primary",
        "kind": "LogicalTechnologyCapability",
        "stage": "logicalTechnology",
        "label": "AI Model Gateway",
        "description": "AI Model Gateway generated from approved Pattern DNA.",
        "properties": {
          "architectureIntent": "AI-MODEL-GATEWAY"
        },
        "tags": [
          "deployment",
          "ai-model-gateway"
        ],
        "offset": {
          "x": 0,
          "y": 0
        }
      },
      {
        "key": "support",
        "kind": "DeployableUnit",
        "stage": "logicalTechnology",
        "label": "AI Model Gateway Support",
        "description": "AI Model Gateway Support generated from approved Pattern DNA.",
        "properties": {
          "responsibility": "supporting-capability"
        },
        "tags": [
          "deployment",
          "support"
        ],
        "offset": {
          "x": 290,
          "y": 0
        }
      }
    ],
    "edgeTemplate": [
      {
        "sourceKey": "primary",
        "targetKey": "support",
        "kind": "dependsOn",
        "stage": "logicalTechnology",
        "label": "uses",
        "properties": {}
      }
    ],
    "sourceRecordId": "TPL-AI-MODEL-GATEWAY",
    "knowledgeReleaseId": "AKR-0.10.60",
    "authorityState": "approved-production"
  }
] as DesignLibraryRecord[];
