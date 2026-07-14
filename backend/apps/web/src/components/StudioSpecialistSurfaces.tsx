import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleDashed, AlertTriangle, ArrowRight, Sparkles, Search, X, Eye } from 'lucide-react';

export type StudioPipelineStep = {
  id: string;
  label: string;
  detail: string;
  status: 'ready' | 'active' | 'watch' | 'blocked' | 'done';
  metric?: string | number;
};

export type StudioChecklistItem = {
  id: string;
  title: string;
  detail: string;
  tone?: 'ok' | 'watch' | 'blocked' | 'neutral';
};

const statusLabels: Record<StudioPipelineStep['status'], string> = {
  ready: 'Ready',
  active: 'Active',
  watch: 'Needs attention',
  blocked: 'Blocked',
  done: 'Done',
};

export function StudioPipelineBoard({
  eyebrow,
  title,
  description,
  steps,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: StudioPipelineStep[];
}) {
  return (
    <section className="studio-pipeline-board" aria-label={title}>
      <header>
        <span className="eyebrow"><Sparkles size={14} /> {eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="studio-pipeline-steps">
        {steps.map((step, index) => (
          <article className={`studio-pipeline-step is-${step.status}`} key={step.id}>
            <div>
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
              {step.metric !== undefined ? <b>{step.metric}</b> : null}
            </div>
            <p>{step.detail}</p>
            <small>{statusLabels[step.status]}</small>
            {index < steps.length - 1 ? <ArrowRight className="studio-pipeline-step__arrow" size={14} /> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function StudioOperatorChecklist({
  title,
  description,
  items,
  action,
}: {
  title: string;
  description: string;
  items: StudioChecklistItem[];
  action?: ReactNode;
}) {
  return (
    <section className="studio-operator-card">
      <header>
        <div>
          <span className="eyebrow">Operator path</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {action ? <div className="studio-operator-card__action">{action}</div> : null}
      </header>
      <div className="studio-checklist-grid">
        {items.map((item) => {
          const Icon = item.tone === 'blocked' ? AlertTriangle : item.tone === 'watch' ? CircleDashed : CheckCircle2;
          return (
            <article className={`studio-checklist-item tone-${item.tone ?? 'neutral'}`} key={item.id}>
              <Icon size={16} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function StudioMarketplacePanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="studio-marketplace-panel">
      <header>
        <span className="eyebrow">Architecture marketplace UX</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="studio-marketplace-panel__body">{children}</div>
    </section>
  );
}


export type StudioWorkflowStep = {
  id: string;
  title: string;
  detail: string;
  status: 'complete' | 'current' | 'pending' | 'blocked';
};

export type StudioPreviewFact = {
  label: string;
  value: ReactNode;
  tone?: 'ok' | 'watch' | 'blocked' | 'neutral';
};

const workflowStatusLabels: Record<StudioWorkflowStep['status'], string> = {
  complete: 'Complete',
  current: 'Current',
  pending: 'Pending',
  blocked: 'Blocked',
};

export function StudioWorkflowPanel({
  eyebrow = 'Guided workflow',
  title,
  description,
  steps,
  previewFacts,
  validation = [],
  disabledReason,
  submitLabel,
  onSubmit,
  secondaryAction,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  steps: StudioWorkflowStep[];
  previewFacts: StudioPreviewFact[];
  validation?: string[] | undefined;
  disabledReason?: string | undefined;
  submitLabel: string;
  onSubmit: () => void;
  secondaryAction?: ReactNode | undefined;
  children: ReactNode;
}) {
  const [activeStep, setActiveStep] = useState(() => steps.findIndex((step) => step.status === 'current'));
  const selectedStep = steps[Math.max(0, activeStep >= 0 ? activeStep : 0)] ?? steps[0];
  const canSubmit = !disabledReason;
  return (
    <section className="studio-workflow-panel" aria-label={title}>
      <header className="studio-workflow-panel__header">
        <div>
          <span className="eyebrow"><Sparkles size={14} /> {eyebrow}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={canSubmit ? 'studio-workflow-panel__badge ok' : 'studio-workflow-panel__badge watch'}>
          {canSubmit ? 'Ready for preview' : 'Needs input'}
        </span>
      </header>
      <div className="studio-workflow-panel__grid">
        <ol className="studio-workflow-steps">
          {steps.map((step, index) => (
            <li key={step.id}>
              <button type="button" className={index === activeStep ? 'active' : ''} onClick={() => setActiveStep(index)}>
                <span>{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{workflowStatusLabels[step.status]}</small>
                </div>
              </button>
            </li>
          ))}
        </ol>
        <div className="studio-workflow-panel__body">
          {selectedStep ? <article className="studio-workflow-current"><strong>{selectedStep.title}</strong><p>{selectedStep.detail}</p></article> : null}
          {children}
          <div className="studio-workflow-validation">
            <strong>Validation checklist</strong>
            {validation.length ? (
              <ul>{validation.map((item) => <li key={item}><CheckCircle2 size={13} /> {item}</li>)}</ul>
            ) : (
              <p>No blocking validation issues detected.</p>
            )}
            {disabledReason ? <p className="studio-workflow-validation__warning"><AlertTriangle size={13} /> {disabledReason}</p> : null}
          </div>
        </div>
        <aside className="studio-workflow-preview" aria-label="Preview before submit">
          <strong>Preview before submit</strong>
          <p>AIW shows the governed change before the operation is executed, so users understand what will be recorded.</p>
          <dl>
            {previewFacts.map((fact) => (
              <div key={fact.label} className={`tone-${fact.tone ?? 'neutral'}`}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className="studio-workflow-actions">
            <button type="button" disabled={!canSubmit} onClick={onSubmit}>{submitLabel}</button>
            {secondaryAction}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function StudioActionStrip({
  title,
  detail,
  actions,
}: {
  title: string;
  detail: string;
  actions: Array<{ label: string; detail: string; tone?: 'ok' | 'watch' | 'blocked' | 'neutral' }>;
}) {
  return (
    <section className="studio-action-strip" aria-label={title}>
      <header>
        <span className="eyebrow">Task simplification</span>
        <h3>{title}</h3>
        <p>{detail}</p>
      </header>
      <div className="studio-action-strip__grid">
        {actions.map((action) => (
          <article key={action.label} className={`tone-${action.tone ?? 'neutral'}`}>
            <strong>{action.label}</strong>
            <p>{action.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}


export type StudioTableColumn = {
  key: string;
  title: string;
  width?: string;
};

export type StudioTableRow = {
  id: string;
  cells: Record<string, ReactNode>;
  status?: 'ok' | 'watch' | 'blocked' | 'neutral';
  summary?: string;
  preview?: ReactNode;
  actions?: ReactNode;
};

export function StudioEmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <article className="studio-empty-state">
      <span className="studio-empty-state__icon"><CircleDashed size={20} /></span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        {action ? <div className="studio-empty-state__action">{action}</div> : null}
      </div>
    </article>
  );
}

export function StudioPreviewDrawer({
  open,
  eyebrow = 'Preview',
  title,
  detail,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  eyebrow?: string;
  title: string;
  detail?: string | undefined;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode | undefined;
}) {
  if (!open) return null;
  return (
    <aside className="studio-preview-drawer" role="dialog" aria-modal="false" aria-label={title}>
      <header>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
          {detail ? <p>{detail}</p> : null}
        </div>
        <button type="button" aria-label="Close preview" onClick={onClose}><X size={16} /></button>
      </header>
      <div className="studio-preview-drawer__body">{children}</div>
      {actions ? <footer>{actions}</footer> : null}
    </aside>
  );
}

export function StudioDataTable({
  title,
  description,
  columns,
  rows,
  emptyTitle,
  emptyDetail,
}: {
  title: string;
  description?: string;
  columns: StudioTableColumn[];
  rows: StudioTableRow[];
  emptyTitle: string;
  emptyDetail: string;
}) {
  const [query, setQuery] = useState('');
  const [previewRow, setPreviewRow] = useState<StudioTableRow | null>(null);
  const normalized = query.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!normalized) return rows;
    return rows.filter((row) => {
      const haystack = [row.id, row.summary, ...Object.values(row.cells).map((cell) => String(cell ?? ''))].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [normalized, rows]);

  return (
    <section className="studio-data-table-card">
      <header className="studio-data-table-card__header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <label className="studio-table-search">
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rows" />
        </label>
      </header>
      {rows.length === 0 ? <StudioEmptyState title={emptyTitle} detail={emptyDetail} /> : null}
      {rows.length > 0 && filteredRows.length === 0 ? <StudioEmptyState title="No matching rows" detail="Clear the search or try a different term. The underlying work items are still available." /> : null}
      {filteredRows.length > 0 ? (
        <div className="studio-data-table-wrap">
          <table className="studio-data-table">
            <thead>
              <tr>{columns.map((column) => <th key={column.key} style={column.width ? { width: column.width } : undefined}>{column.title}</th>)}<th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className={`tone-${row.status ?? 'neutral'}`}>
                  {columns.map((column) => <td key={column.key}>{row.cells[column.key] ?? '—'}</td>)}
                  <td className="studio-data-table__actions">
                    {row.preview ? <button type="button" onClick={() => setPreviewRow(row)}><Eye size={13} /> Preview</button> : null}
                    {row.actions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <StudioPreviewDrawer
        open={Boolean(previewRow)}
        eyebrow="Row preview"
        title={previewRow?.id ?? 'Preview'}
        detail={previewRow?.summary}
        onClose={() => setPreviewRow(null)}
      >
        {previewRow?.preview ?? null}
      </StudioPreviewDrawer>
    </section>
  );
}
