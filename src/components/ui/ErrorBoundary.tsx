import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-6">
          <div className="max-w-lg w-full rounded-2xl border border-line bg-surface-2/60 p-6 shadow-xl space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400">
              <AlertTriangleIcon className="h-6 w-6" />
            </div>
            
            <div>
              <h2 className="text-lg font-black tracking-tight text-fg">Something went wrong</h2>
              <p className="mt-1 text-xs text-muted">
                An unexpected interface error occurred. You can reload the page or return to dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="rounded-xl bg-surface border border-line p-3 text-left overflow-auto max-h-40">
                <p className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-1 font-mono text-[0.625rem] text-muted whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition-all"
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('linkbus_token');
                  localStorage.removeItem('linkbus_session');
                  window.location.href = '/login';
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-fg hover:bg-surface-2 transition-all"
              >
                Clear Cache &amp; Re-login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
