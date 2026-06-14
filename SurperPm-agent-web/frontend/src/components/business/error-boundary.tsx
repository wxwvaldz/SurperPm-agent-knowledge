import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/retroui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
          <div className="border border-border bg-card p-6 max-w-md w-full text-center space-y-3">
            <h2 className="text-lg font-bold font-head">Something went wrong</h2>
            <p className="text-sm text-foreground/60 break-words">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              Reload
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
