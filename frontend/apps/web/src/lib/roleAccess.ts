import type { ExperienceProfileId } from "./experienceProfiles";

export type ExperienceCapability =
  | "architecture.read"
  | "architecture.write"
  | "review.read"
  | "review.disposition"
  | "artifact.generate"
  | "portfolio.read"
  | "platform.evidence"
  | "knowledge.curate"
  | "admin.operate";

export const REFERENCE_PRINCIPAL_IDS: Record<ExperienceProfileId, string> = {
  "solution-architect": "reference-solution-architect",
  "enterprise-architect": "reference-enterprise-architect",
  "platform-architect": "reference-platform-architect",
  reviewer: "reference-reviewer",
  "knowledge-curator": "reference-knowledge-curator",
  administrator: "reference-administrator",
};

export const ROLE_API_ROLES: Record<ExperienceProfileId, string[]> = {
  "solution-architect": ["solution-architect"],
  "enterprise-architect": ["enterprise-architect"],
  "platform-architect": ["platform-architect"],
  reviewer: ["architecture-reviewer"],
  "knowledge-curator": ["knowledge-curator"],
  administrator: ["platform-admin"],
};

export const ROLE_CAPABILITIES: Record<ExperienceProfileId, ExperienceCapability[]> = {
  "solution-architect": ["architecture.read", "architecture.write", "review.read", "artifact.generate"],
  "enterprise-architect": ["architecture.read", "review.read", "review.disposition", "portfolio.read"],
  "platform-architect": ["architecture.read", "architecture.write", "review.read", "platform.evidence"],
  reviewer: ["architecture.read", "review.read", "review.disposition"],
  "knowledge-curator": ["architecture.read", "review.read", "knowledge.curate"],
  administrator: ["architecture.read", "review.read", "review.disposition", "portfolio.read", "platform.evidence", "knowledge.curate", "admin.operate"],
};

export function capabilitiesFor(role: ExperienceProfileId): ExperienceCapability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

export function can(role: ExperienceProfileId, capability: ExperienceCapability): boolean {
  return capabilitiesFor(role).includes(capability);
}

function persistedRole(): ExperienceProfileId {
  try {
    const raw = localStorage.getItem("aiw-sprint8-workspace");
    const parsed = raw ? JSON.parse(raw) as { state?: { experienceProfile?: ExperienceProfileId } } : null;
    return parsed?.state?.experienceProfile ?? "solution-architect";
  } catch {
    return "solution-architect";
  }
}

let installed = false;
export function installRoleAwareFetch(): void {
  if (installed || typeof window === "undefined") return;
  const hostname = (() => { try { return new URL(document.baseURI).hostname; } catch { return window.location.hostname; } })();
  const referenceBindingEnabled = import.meta.env.VITE_AIW_REFERENCE_ROLE_BINDING === "true" || ["localhost", "127.0.0.1", "aiw.test"].includes(hostname);
  if (!referenceBindingEnabled) return;
  installed = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const role = persistedRole();
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (headers.has("authorization")) return nativeFetch(input, { ...init, headers });
    headers.set("x-aiw-roles", ROLE_API_ROLES[role].join(","));
    headers.set("x-aiw-user-id", REFERENCE_PRINCIPAL_IDS[role]);
    headers.set("x-aiw-user-name", role.replaceAll("-", " "));
    headers.set("x-aiw-user-email", `${role}@reference.aiw.invalid`);
    headers.set("x-aiw-tenant-id", "tenant-reference");
    return nativeFetch(input, { ...init, headers });
  };
}
