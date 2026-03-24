import React from 'react';
import { ErrorState } from './ui/ux-components';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

/**
 * Prevents dashboard crashes from turning into blank screens.
 * Scope: wraps major app sections (routes) so vendor dashboard users
 * still see a recovery UI.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // Errors are already captured by React DevTools; avoid noisy logging here.
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#F5F7FA] p-6 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <ErrorState
            title="Something went wrong"
            description="The dashboard failed to render. Retry to recover, or go back to the login page."
            onRetry={() => window.location.reload()}
            retryText="Retry"
          />
          {this.state.error?.message ? (
            <p className="mt-4 text-xs text-slate-500 break-words">
              {this.state.error.message}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
}

