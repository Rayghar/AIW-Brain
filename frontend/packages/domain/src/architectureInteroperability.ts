import type { ArchitectureProject, ArchitectureStage, EntityKind, RelationshipKind } from './types.js';

export const architectureExchangeFormats = ['structurizr-dsl','calm-json','likec4'] as const;
export type ArchitectureExchangeFormat = (typeof architectureExchangeFormats)[number];

export type ArchitectureExchangeSeverity = 'error' | 'warning' | 'information';

export interface ArchitectureExchangeIssue {
  id: string;
  severity: ArchitectureExchangeSeverity;
  code: string;
  message: string;
  elementId?: string;
  path?: string;
  remediation?: string;
}

export interface ArchitectureExchangeDocument {
  format: ArchitectureExchangeFormat;
  formatVersion: string;
  generatedAt: string;
  projectId: string;
  projectRevision: number;
  mediaType: string;
  fileName: string;
  content: string;
  fingerprint: string;
  source: 'generated' | 'imported';
}

export type ImportConflictType = 'id-collision' | 'semantic-identity' | 'property-divergence' | 'relationship-divergence' | 'unsupported-element';
export type ImportConflictResolution = 'keep-local' | 'use-imported' | 'merge-properties' | 'create-copy' | 'skip';

export interface ArchitectureImportConflict {
  id: string;
  type: ImportConflictType;
  elementType: 'node' | 'edge' | 'interface' | 'project';
  localId?: string;
  importedId?: string;
  message: string;
  localValue?: unknown;
  importedValue?: unknown;
  suggestedResolution: ImportConflictResolution;
}

export interface ArchitectureImportResult {
  format: ArchitectureExchangeFormat;
  formatVersion: string;
  project: ArchitectureProject;
  importedNodeIds: string[];
  importedEdgeIds: string[];
  issues: ArchitectureExchangeIssue[];
  conflicts: ArchitectureImportConflict[];
  metadata: Record<string, unknown>;
}

export interface ArchitectureRoundTripReport {
  format: ArchitectureExchangeFormat;
  exportedFingerprint: string;
  importedFingerprint: string;
  nodeIdentityPercent: number;
  edgeIdentityPercent: number;
  interfaceIdentityPercent: number;
  propertyFidelityPercent: number;
  overallFidelityPercent: number;
  lostNodeIds: string[];
  lostEdgeIds: string[];
  issues: ArchitectureExchangeIssue[];
  passed: boolean;
}

export interface ImportedElementDescriptor {
  id: string;
  semanticId?: string;
  name: string;
  description?: string;
  kind: EntityKind;
  stage: ArchitectureStage;
  parentId?: string;
  tags: string[];
  properties: Record<string, unknown>;
}

export interface ImportedRelationshipDescriptor {
  id: string;
  sourceId: string;
  targetId: string;
  kind: RelationshipKind;
  stage: ArchitectureStage;
  label?: string;
  properties: Record<string, unknown>;
}

export type ProviderId = 'portable' | 'aws' | 'azure' | 'gcp' | 'on-premises';
export type ProviderMappingStatus = 'approved-advisory' | 'candidate' | 'deprecated';

export interface ProviderProductCatalogEntry {
  id: string;
  neutralCapability: string;
  capabilityAliases: string[];
  provider: ProviderId;
  productName: string;
  productFamily: string;
  serviceModel: 'managed' | 'self-managed' | 'portable-standard' | 'enterprise-platform';
  requiredCharacteristics: string[];
  architectureConsequences: string[];
  portabilityRisks: string[];
  sourceConnectorIds: string[];
  status: ProviderMappingStatus;
  reviewedAt: string;
  reviewOwner: string;
}

export interface ProviderMappingRecommendation {
  capabilityNodeId: string;
  neutralCapability: string;
  candidates: ProviderProductCatalogEntry[];
  selectedEntryId?: string;
  status: 'neutral' | 'proposed' | 'approved';
  warnings: string[];
}

export interface AccessibleDocumentProfile {
  title: string;
  subject: string;
  author: string;
  language: string;
  tagged: boolean;
  bookmarks: boolean;
  pageNumbers: boolean;
  headersAndFooters: boolean;
  alternativeTextForDiagrams: boolean;
  generatedAt: string;
}
