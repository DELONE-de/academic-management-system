// FILE: frontend/src/components/layout/ErrorBoundary.tsx
'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors in a subtree so a single component failure does not
 * destroy the whole application. Shows a useful recovery screen instead of
 * a blank page or stack trace.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // Log for diagnostics (safe — no user data, no secrets)
    console.error('ErrorBoundary caught error:', error.message);
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center min-h-[50vh] p-6">
          <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">We couldn't load this section.</p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
