// =================================
// 🔐 Admin Authentication API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

export async function POST(request: NextRequest) {
  try {
    // Debug: Check environment variables
    console.log("🔍 Environment Check:", {
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_USERNAME: process.env.ADMIN_USERNAME,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "***" : "undefined",
      envUsername: env.ADMIN_USERNAME,
      envPassword: env.ADMIN_PASSWORD ? "***" : "undefined",
    });

    const { username, password } = await request.json();

    // Debug logging
    console.log("🔐 Admin Auth Debug:", {
      receivedUsername: username,
      receivedPassword: password ? "***" : "undefined",
      envUsername: env.ADMIN_USERNAME,
      envPassword: env.ADMIN_PASSWORD ? "***" : "undefined",
      usernameMatch: username === env.ADMIN_USERNAME,
      passwordMatch: password === env.ADMIN_PASSWORD,
    });

    // Check credentials using environment configuration
    if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
      console.log("✅ Admin authentication successful");
      return NextResponse.json(
        {
          success: true,
          message: "Authentication successful",
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    } else {
      console.log("❌ Admin authentication failed");
      return NextResponse.json(
        { error: "用户名或密码错误" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      );
    }
  } catch (error: any) {
    console.error("Admin auth API error:", error);
    return NextResponse.json(
      { error: "认证失败" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
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
