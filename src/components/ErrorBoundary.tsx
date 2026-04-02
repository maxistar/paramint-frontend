import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  fallback?: ReactNode;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("STL viewer crashed", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-border-low bg-card p-4 text-sm text-muted">
            3D preview is temporarily unavailable in this browser build.
          </div>
        )
      );
    }

    return this.props.children;
  }
}
