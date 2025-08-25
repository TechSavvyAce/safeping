// =================================
// 🔐 Admin Authentication API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Check credentials using environment configuration
    if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
      return NextResponse.json({
        success: true,
        message: "Authentication successful",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error("Admin auth API error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
