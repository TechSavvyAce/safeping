// =================================
// 🛡️ Next.js Middleware for Security & Logging
// =================================

import { NextRequest, NextResponse } from "next/server";
import { handleCors, addCorsHeaders } from "@/lib/cors";
import { logApiRequest, logSecurityAlert } from "@/lib/logger";

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;
  const userAgent = request.headers.get("user-agent") || "unknown";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  // Security checks
  performSecurityChecks(request, ip);

  // Continue with request
  const response = NextResponse.next();

  // Add security headers
  addSecurityHeaders(response);

  // Add CORS headers
  addCorsHeaders(response, request);

  // Log API requests
  const duration = Date.now() - startTime;
  if (pathname.startsWith("/api/")) {
    // We'll log after response, so we use a timer
    setTimeout(() => {
      logApiRequest(method, pathname, response.status, duration, userAgent);
    }, 0);
  }

  return response;
}

function performSecurityChecks(request: NextRequest, ip: string) {
  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";

  // Check for suspicious user agents
  const suspiciousUAs = ["bot", "crawler", "spider", "scraper"];
  if (suspiciousUAs.some((ua) => userAgent.toLowerCase().includes(ua))) {
    logSecurityAlert("suspicious_user_agent", ip, { userAgent });
  }

  // Check for SQL injection patterns in query params
  const queryString = request.nextUrl.search;
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
  ];

  if (sqlPatterns.some((pattern) => pattern.test(queryString))) {
    logSecurityAlert("sql_injection_attempt", ip, { queryString });
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  if (xssPatterns.some((pattern) => pattern.test(queryString))) {
    logSecurityAlert("xss_attempt", ip, { queryString });
  }
}

function addSecurityHeaders(response: NextResponse) {
  // Security headers
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Permissions Policy
  const permissionsPolicy = [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=(self)",
    "usb=()",
    "magnetometer=()",
    "accelerometer=()",
    "gyroscope=()",
  ].join(", ");

  response.headers.set("Permissions-Policy", permissionsPolicy);

  // Remove powered by header
  response.headers.delete("X-Powered-By");
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|public|icons|manifest.json|sw.js|workbox-).*)",
  ],
};
