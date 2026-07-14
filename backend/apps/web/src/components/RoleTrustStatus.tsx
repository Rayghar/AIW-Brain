import { useEffect, useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import type { ExperienceProfileId } from "../lib/experienceProfiles";
import { ROLE_API_ROLES } from "../lib/roleAccess";

type Principal = { subject?: string; roles?: string[]; authMode?: string; tenantId?: string; roleSource?: string };
type SessionEnvelope = { principal?: Principal; accessMode?: string; authenticated?: boolean; developmentAuthEnabled?: boolean };
export function RoleTrustStatus({ role }: { role: ExperienceProfileId }) {
  const [session, setSession] = useState<SessionEnvelope | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/auth/session").then(async (response) => response.ok ? response.json() : null).then((value) => { if (live) setSession(value as SessionEnvelope | null); }).catch(() => { if (live) setSession(null); });
    return () => { live = false; };
  }, [role]);
  const expected = ROLE_API_ROLES[role];
  const principal = session?.principal;
  const aligned = Boolean(principal?.roles?.some((item) => expected.includes(item)));
  const productionIdentity = Boolean(session?.authenticated && principal?.authMode && !principal.authMode.startsWith("development"));
  return <div className={`role-trust-status ${aligned ? "aligned" : "reference"}`} title="Role experience and API principal alignment">
    {aligned ? <BadgeCheck size={14}/> : <ShieldAlert size={14}/>}
    <span><strong>{aligned ? (productionIdentity ? "Identity-bound" : "Role-bound reference") : "Role mismatch"}</strong><small>{principal ? `${principal.authMode ?? session?.accessMode ?? "unknown"} · ${(principal.roles ?? []).join(", ") || "no roles"}` : `Expected ${expected.join(", ")}`}</small></span>
  </div>;
}
