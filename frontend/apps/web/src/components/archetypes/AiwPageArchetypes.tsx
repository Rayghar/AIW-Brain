import type { ReactNode } from 'react';

export type AiwPageArchetype = 'cockpit' | 'design-studio' | 'command-center';

export function CockpitPageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`aiw-archetype aiw-archetype--cockpit ${className}`}>{children}</section>;
}

export function DesignStudioPageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`aiw-archetype aiw-archetype--design-studio ${className}`}>{children}</section>;
}

export function CommandCenterPageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`aiw-archetype aiw-archetype--command-center ${className}`}>{children}</section>;
}

export function AiwMetricCard({ label, value, detail, tone = 'neutral' }: { label: string; value: ReactNode; detail?: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'critical' | 'info' }) {
  return <article className={`aiw-metric-card tone-${tone}`}><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>;
}
