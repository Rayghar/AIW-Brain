import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Collapsible panel primitive — extends the workbench-disclosure idiom so
 *  every intelligence surface can fold away; keyboard/native by <details>. */
export function CollapsibleSection({ title, badge, defaultOpen = true, children }:
  { title: string; badge?: string | number; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="workbench-disclosure collapsible-section" open={defaultOpen}>
      <summary>
        <ChevronDown size={13} className="collapsible-section__chev" aria-hidden />
        <span className="collapsible-section__title">{title}</span>
        {badge !== undefined ? <span className="collapsible-section__badge">{badge}</span> : null}
      </summary>
      <div className="collapsible-section__body">{children}</div>
    </details>
  );
}
