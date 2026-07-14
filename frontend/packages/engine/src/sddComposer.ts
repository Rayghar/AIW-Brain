import type { ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';
import { renderSddMarkdown } from './sddSections.js';

/**
 * Compose the governed System Design Description from the canonical model.
 * The composer deliberately renders missing evidence as missing; it never fills
 * gaps with model-authored prose or treats a generated narrative as approval.
 */
export function composeSdd(project: ArchitectureProject, library: KnowledgeLibrary): string {
  return renderSddMarkdown(project, library);
}
