export const ARCHITECTURE_BRAIN_RUNTIME_OWNER = "AIW Brain Orchestrator";
export const ARCHITECTURE_BRAIN_RUNTIME_BOUNDARY_VERSION =
  "0.10.0-rc.10.73.5";

/**
 * Marks a preserved route as a compatibility alias rather than an independent
 * architecture-intelligence authority. The alias must delegate to the Brain
 * Orchestrator and may be removed after all clients use the canonical surface.
 */
export function markArchitectureBrainCompatibilityAlias(
  reply: {
    header(name: string, value: string): unknown;
  },
  canonicalEntryPoint: string,
) {
  reply.header("deprecation", "true");
  reply.header("x-aiw-brain-authority", ARCHITECTURE_BRAIN_RUNTIME_OWNER);
  reply.header(
    "x-aiw-brain-boundary-version",
    ARCHITECTURE_BRAIN_RUNTIME_BOUNDARY_VERSION,
  );
  reply.header(
    "link",
    `<${canonicalEntryPoint}>; rel="successor-version"`,
  );
}
