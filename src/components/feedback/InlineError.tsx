"use client";

import { AlertTriangle, X } from "lucide-react";

export default function InlineError({
  message,
  title = "Unable to complete the request",
  onDismiss,
}: {
  message?: string | null;
  title?: string;
  onDismiss?: () => void;
}) {
  if (!message) return null;

  return (
    <div role="alert" aria-live="assertive" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0" size={19} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{title}</p>
          <p className="mt-1 break-words text-sm leading-6 opacity-80">{message}</p>
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5">
            <X size={17} />
          </button>
        )}
      </div>
    </div>
  );
}