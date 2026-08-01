import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BLOCKED_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /acunetix/i,
  /nessus/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
];

const SUSPICIOUS_PATH_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /wp-admin/i,
  /wp-login/i,
  /phpmyadmin/i,
  /xmlrpc\.php/i,
  /config\.php/i,
  /server-status/i,
];

const NOINDEX_PATH_PREFIXES = [
  "/account",
  "/admin",
  "/api",
  "/cart",
  "/checkout",
  "/forgot-password",
  "/login",
  "/offline",
  "/orders",
  "/register",
  "/settings",
  "/supplier",
];

function shouldNoIndex(pathname: string): boolean {
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function securityHeaders(
  response: NextResponse,
  pathname: string,
): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups",
  );
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  if (shouldNoIndex(pathname)) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
  }

  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent") ?? "";

  const blockedUserAgent = BLOCKED_USER_AGENTS.some((pattern) =>
    pattern.test(userAgent),
  );

  const suspiciousPath = SUSPICIOUS_PATH_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );

  if (blockedUserAgent || suspiciousPath) {
    return securityHeaders(
      NextResponse.json(
        {
          success: false,
          error: "Request blocked",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      ),
      pathname,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (
    ["POST", "PUT", "PATCH"].includes(request.method) &&
    contentLength > 1_000_000
  ) {
    return securityHeaders(
      NextResponse.json(
        {
          success: false,
          error: "Request body is too large",
        },
        {
          status: 413,
        },
      ),
      pathname,
    );
  }

  return securityHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
