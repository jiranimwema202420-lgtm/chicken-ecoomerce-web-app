"use client";

import { AlertCircle } from "lucide-react";

export type ValidationIssue = { field?: string; message: string };

export default function ValidationSummary({
  issues,
  title = "Please correct the following",
}: {
  issues: ValidationIssue[];
  title?: string;
}) {
  if (issues.length === 0) return null;

  return (
    <section role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0" size={20} />
        <div>
          <h2 className="font-bold">{title}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {issues.map((issue, index) => (
              <li key={`${issue.field ?? "general"}-${index}`}>
                {issue.field ? <><strong>{issue.field}:</strong> {issue.message}</> : issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}