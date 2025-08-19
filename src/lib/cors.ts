// =================================
// 🌐 CORS Middleware
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getAllowedOrigins, isDevelopment } from "./env-validation";

export function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const isDev = isDevelopment();

  // In development, allow all origins
  let allowOrigin = "*";

  // In production, check against allowed origins
  if (!isDev && origin) {
    if (allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = "null"; // Explicitly deny
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

export function handleCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders(origin || undefined),
    });
  }

  return null;
}

export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin || undefined);

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
