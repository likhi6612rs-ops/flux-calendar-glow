import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props {
  children: ReactNode;
  /** Short label shown in the fallback, e.g. "Settings". */
  label?: string;
  fallback?: (reset: () => void, error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportLovableError(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset, error);

    return (
      <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
        <p className="mt-3 text-sm font-bold">
          {this.props.label ?? "This section"} couldn&apos;t load
        </p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
          Some data failed to fetch. The rest of the app is still fine — try
          again in a moment.
        </p>
        <button
          onClick={this.reset}
          className="mx-auto mt-4 flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2 text-sm font-semibold transition-colors hover:border-primary"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }
}
