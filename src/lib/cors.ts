// =================================
// 🌐 CORS Middleware
// =================================

import { NextRequest, NextResponse } from "next/server";
import { isDevelopment } from "./env-validation";

export function corsHeaders(origin?: string): Record<string, string> {
  const isDev = isDevelopment();

  // In development, allow all origins
  let allowOrigin = "*";

  // In production, allow all origins for now (can be configured later)
  // TODO: Add CORS configuration when needed
  if (!isDev && origin) {
    allowOrigin = origin; // Allow the requesting origin
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
