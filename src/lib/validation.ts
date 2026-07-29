import type { ValidationIssue } from "@/components/feedback/ValidationSummary";

export function required(value: unknown, field: string): ValidationIssue | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return { field, message: "This field is required." };
  }
  return null;
}

export function validEmail(value: string, field = "Email"): ValidationIssue | null {
  const email = value.trim();
  if (!email) return { field, message: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { field, message: "Enter a valid email address." };
  return null;
}

export function validKenyanPhone(value: string, field = "Phone"): ValidationIssue | null {
  const normalized = value.replace(/[\s()-]/g, "");
  if (!/^(?:\+254|254|0)(?:7|1)\d{8}$/.test(normalized)) {
    return { field, message: "Enter a valid Kenyan mobile number." };
  }
  return null;
}

export function positiveNumber(value: unknown, field: string): ValidationIssue | null {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return { field, message: "Enter a value greater than zero." };
  return null;
}

export function nonNegativeInteger(value: unknown, field: string): ValidationIssue | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return { field, message: "Enter a whole number of zero or more." };
  return null;
}

export function collectIssues(...issues: Array<ValidationIssue | null | undefined>): ValidationIssue[] {
  return issues.filter((issue): issue is ValidationIssue => Boolean(issue));
}

export function normalizeApiError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "An unexpected error occurred. Please try again.";
}

export async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
    if (typeof body.message === "string" && body.message.trim()) return body.message;
  } catch {}
  return `Request failed with status ${response.status}.`;
}