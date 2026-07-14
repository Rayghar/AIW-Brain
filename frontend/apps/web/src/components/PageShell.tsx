import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface WorkspaceErrorBoundaryProps {
  title: string;
  children: React.ReactNode;
}

interface WorkspaceErrorBoundaryState {
  error: Error | null;
}

export class WorkspaceErrorBoundary extends React.Component<WorkspaceErrorBoundaryProps, WorkspaceErrorBoundaryState> {
  state: WorkspaceErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WorkspaceErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error(`[AIW workspace boundary] ${this.props.title}`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="studio-error-state" role="alert">
        <span className="studio-error-state__icon"><AlertTriangle size={22} /></span>
        <div>
          <span className="eyebrow">Workspace recovered safely</span>
          <h2>{this.props.title} could not render completely.</h2>
          <p>
            AIW kept the shell, navigation and project state alive. This usually means a partial API response or
            workspace-specific rendering fault. You can retry the workspace without refreshing the full application.
          </p>
          <small>{this.state.error.message}</small>
          <button onClick={() => this.setState({ error: null })}>
            <RefreshCw size={15} /> Retry workspace
          </button>
        </div>
      </section>
    );
  }
}

export function PageSkeleton({ title = 'Loading workspace' }: { title?: string }) {
  return (
    <section className="studio-page studio-skeleton" aria-busy="true">
      <div className="studio-skeleton__line studio-skeleton__line--hero" />
      <div className="studio-skeleton__grid">
        <div className="studio-skeleton__card" />
        <div className="studio-skeleton__card" />
        <div className="studio-skeleton__card" />
      </div>
      <span>{title}…</span>
    </section>
  );
}
