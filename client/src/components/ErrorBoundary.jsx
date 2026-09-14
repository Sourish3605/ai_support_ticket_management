import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SupportPilot ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-2xl border border-red-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-base font-bold text-slate-900">Something went wrong</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred while loading this view."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/dashboard";
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
