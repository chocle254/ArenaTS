import { AlertTriangle, RotateCcw } from 'lucide-react';
import React from 'react';
import { isChunkLoadError } from '@/lib/lazy-with-retry';

interface Props {
  children: React.ReactNode;
  /** Changing this value (e.g. the route path) clears a previous error. */
  resetKey?: string;
  /** Compact variant renders inside the page area instead of full screen. */
  compact?: boolean;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleRetry = () => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const outdated = isChunkLoadError(this.state.error);

    return (
      <div
        role="alert"
        className={
          this.props.compact
            ? 'flex min-h-[50vh] items-center justify-center p-6'
            : 'flex min-h-screen items-center justify-center bg-background p-6'
        }
      >
        <div className="surface max-w-md w-full p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-2xl">{outdated ? 'A new version of Arena is ready' : 'This screen failed to load'}</h2>
          <p className="text-sm text-muted-foreground">
            {outdated
              ? 'Reload to get the latest update. Your account and balances are not affected.'
              : 'Something on this page broke. Try again, or head back to your dashboard.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              {outdated ? 'Reload' : 'Try again'}
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"
            >
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
