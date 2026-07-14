import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Route-level error boundary (Studio UX audit, Gap 10). A crashing workspace —
// the console showed Admin dying on an undefined queues.claimReview — must
// degrade to a recoverable panel, never take down navigation or the shell.
// Product-grade error state: what happened, that work is safe, how to recover.

interface Props { workspace: string; onReset?: () => void; children: ReactNode; }
interface State { error: Error | null }

export class WorkspaceErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(`[AIW] workspace "${this.props.workspace}" crashed`, error, info.componentStack);
  }
  private reset = () => { this.setState({ error: null }); this.props.onReset?.(); };
  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <section className="workspace-error" role="alert" aria-live="assertive">
        <AlertTriangle size={22} aria-hidden />
        <h2>This workspace hit an error</h2>
        <p>The <strong>{this.props.workspace}</strong> view failed to render. Your project and unsaved work are safe — the rest of AIW is unaffected. You can retry this view or switch to another workspace from the sidebar.</p>
        <code className="workspace-error__detail">{this.state.error.message}</code>
        <button type="button" className="workspace-error__retry" onClick={this.reset}>
          <RotateCcw size={13} aria-hidden /> Retry this workspace
        </button>
      </section>
    );
  }
}
