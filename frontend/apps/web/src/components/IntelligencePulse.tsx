import { useEffect, useRef, useState } from "react";
import { BrainCircuit, TrendingUp, TrendingDown, Sparkles, ShieldCheck } from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";

// =============================================================================
// INTELLIGENCE PULSE — the mind, felt. A compact ambient presence that reacts
// the moment the kernel does: the health score TWEENS to its new value and
// pulses, new significant findings surface as "AIW noticed…" moments, and the
// top next-best-action stays one glance away. Pure projection of the kernel's
// IntelligenceResponse — it renders reactions, it never invents them.
// Honors prefers-reduced-motion.
// =============================================================================

type Noticed = { id: string; title: string };

export function IntelligencePulse() {
  const intelligence = useWorkspaceStore((s) => s.intelligence);
  const setWorkspaceMode = useWorkspaceStore((s) => s.setWorkspaceMode);
  const prev = useRef<{ score: number; findingIds: Set<string> } | null>(null);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);
  const [noticed, setNoticed] = useState<Noticed[]>([]);
  const raf = useRef<number>(0);

  const health = intelligence?.health;
  const nba = intelligence?.nextBestActions?.[0] as { title?: string; label?: string; description?: string } | undefined;
  const nbaText = nba?.title ?? nba?.label ?? nba?.description ?? null;

  useEffect(() => {
    if (!health) return;
    const target = health.score;
    const findings = (intelligence?.findings ?? []) as Array<{ id?: string; title?: string; severity?: string }>;
    const sigIds = new Set(findings.filter((f) => f.severity === "SIGNIFICANT").map((f) => String(f.id ?? f.title)));

    if (prev.current === null) {
      prev.current = { score: target, findingIds: sigIds };
      setDisplayScore(target);
      return;
    }
    const from = prev.current.score;
    if (from !== target) {
      setPulse(target > from ? "up" : "down");
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduced) { setDisplayScore(target); }
      else {
        const start = performance.now(); const dur = 650;
        cancelAnimationFrame(raf.current);
        const step = (t: number) => {
          const k = Math.min(1, (t - start) / dur);
          setDisplayScore(Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))));
          if (k < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
      }
      window.setTimeout(() => setPulse(null), 900);
    }
    const fresh = findings.filter((f) => f.severity === "SIGNIFICANT" && !prev.current!.findingIds.has(String(f.id ?? f.title)));
    if (fresh.length) {
      setNoticed((q) => [...fresh.map((f) => ({ id: String(f.id ?? f.title), title: String(f.title ?? "New finding") })), ...q].slice(0, 3));
      window.setTimeout(() => setNoticed((q) => q.slice(0, Math.max(0, q.length - fresh.length))), 6000);
    }
    prev.current = { score: target, findingIds: sigIds };
    return () => cancelAnimationFrame(raf.current);
  }, [health, intelligence]);

  if (!health) return null;
  return (
    <div className="intel-pulse" role="status" aria-live="polite">
      <button type="button" className={`intel-pulse__health intel-pulse__health--${health.level}${pulse ? ` intel-pulse__health--pulse-${pulse}` : ""}`}
        onClick={() => setWorkspaceMode("cockpit")} title="Architecture health — open the cockpit">
        <BrainCircuit size={14} aria-hidden />
        <strong>{displayScore ?? health.score}</strong>
        {pulse === "up" ? <TrendingUp size={12} aria-hidden /> : pulse === "down" ? <TrendingDown size={12} aria-hidden /> : null}
      </button>
      {nbaText ? (
        <button type="button" className="intel-pulse__nba" onClick={() => setWorkspaceMode("cockpit")} title="Next best action">
          <Sparkles size={12} aria-hidden /><span>{nbaText}</span>
        </button>
      ) : null}
      {noticed.length ? (
        <div className="intel-pulse__noticed" aria-label="AIW noticed">
          {noticed.map((n) => <span key={n.id} className="intel-pulse__notice"><ShieldCheck size={11} aria-hidden /> AIW noticed: {n.title}</span>)}
        </div>
      ) : null}
    </div>
  );
}
