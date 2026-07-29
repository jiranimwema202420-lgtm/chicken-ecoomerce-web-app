"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

type Props = { children: ReactNode; fallbackTitle?: string; fallbackMessage?: string };
type State = { hasError: boolean; error?: Error };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary captured an error", { error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section role="alert" className="mx-auto my-8 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
            <AlertTriangle size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold">{this.props.fallbackTitle ?? "Something went wrong"}</h2>
            <p className="mt-2 text-sm leading-6 opacity-80">{this.props.fallbackMessage ?? "This part of the app could not be displayed. Try again or refresh the page."}</p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/5">{this.state.error.message}</pre>
            )}
            <button type="button" onClick={() => this.setState({ hasError: false, error: undefined })} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800">
              <RefreshCcw size={16} /> Try again
            </button>
          </div>
        </div>
      </section>
    );
  }
}