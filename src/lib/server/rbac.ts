import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export const APP_ROLES = [
  "admin",
  "operations",
  "order_manager",
  "inventory_manager",
  "finance",
  "accountant",
  "support",
  "supplier",
  "customer",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthenticatedPrincipal = {
  uid: string;
  email?: string;
  emailVerified: boolean;
  role: AppRole;
  token: DecodedIdToken;
};

export class AuthenticationError extends Error {
  readonly status = 401;

  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

function resolveRole(token: DecodedIdToken): AppRole {
  if (token.admin === true) return "admin";
  if (token.supplier === true) return "supplier";
  return isAppRole(token.role) ? token.role : "customer";
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthenticationError("A Firebase bearer token is required.");
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    throw new AuthenticationError("The Firebase bearer token is empty.");
  }

  return token;
}

export async function authenticateRequest(
  request: Request,
  options: {
    checkRevoked?: boolean;
    requireVerifiedEmail?: boolean;
  } = {}
): Promise<AuthenticatedPrincipal> {
  const idToken = bearerToken(request);

  let token: DecodedIdToken;

  try {
    token = await adminAuth.verifyIdToken(
      idToken,
      options.checkRevoked ?? true
    );
  } catch {
    throw new AuthenticationError("The session is invalid or has expired.");
  }

  if (options.requireVerifiedEmail && token.email_verified !== true) {
    throw new AuthorizationError(
      "Verify your email address before performing this action."
    );
  }

  return {
    uid: token.uid,
    email: token.email,
    emailVerified: token.email_verified === true,
    role: resolveRole(token),
    token,
  };
}

export async function requireRoles(
  request: Request,
  allowedRoles: readonly AppRole[],
  options: {
    checkRevoked?: boolean;
    requireVerifiedEmail?: boolean;
  } = {}
): Promise<AuthenticatedPrincipal> {
  const principal = await authenticateRequest(request, options);

  if (!allowedRoles.includes(principal.role)) {
    throw new AuthorizationError();
  }

  return principal;
}

export async function requireAdmin(
  request: Request
): Promise<AuthenticatedPrincipal> {
  return requireRoles(request, ["admin"]);
}

export async function requireOperations(
  request: Request
): Promise<AuthenticatedPrincipal> {
  return requireRoles(request, [
    "admin",
    "operations",
    "order_manager",
  ]);
}

export async function requireInventoryManager(
  request: Request
): Promise<AuthenticatedPrincipal> {
  return requireRoles(request, [
    "admin",
    "operations",
    "inventory_manager",
  ]);
}

export async function requireFinance(
  request: Request
): Promise<AuthenticatedPrincipal> {
  return requireRoles(request, [
    "admin",
    "finance",
    "accountant",
  ]);
}

export async function requireSupport(
  request: Request
): Promise<AuthenticatedPrincipal> {
  return requireRoles(request, [
    "admin",
    "operations",
    "support",
  ]);
}

export function authorizationErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { error: error.message, code: "UNAUTHENTICATED" },
      { status: error.status }
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: error.message, code: "FORBIDDEN" },
      { status: error.status }
    );
  }

  console.error("Unexpected authorization failure", error);

  return NextResponse.json(
    { error: "Authorization could not be completed.", code: "AUTH_ERROR" },
    { status: 500 }
  );
}