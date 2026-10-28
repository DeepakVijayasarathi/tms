import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-ink">Something went wrong on this page</h1>
        <p className="mt-2 text-ink-mute">Reload to try again. If it keeps happening, let support know what you were doing.</p>
        <button onClick={() => location.reload()} className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">Reload</button>
      </div>
    );
  }
}
