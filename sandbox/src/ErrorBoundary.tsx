import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Sandbox render failed', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <header className="header">
            <div>
              <p className="eyebrow">Sandbox error</p>
              <h1>Something failed to load</h1>
              <p className="subtitle">{this.state.error.message}</p>
              <a className="back-link" href="/">
                ← Back to launcher
              </a>
            </div>
          </header>
        </div>
      );
    }

    return this.props.children;
  }
}
