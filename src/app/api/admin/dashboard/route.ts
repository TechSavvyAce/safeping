// =================================
// 📊 Admin Dashboard API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { rateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(request, "api");
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset
      );
    }

    // Basic auth check (in production, implement proper authentication)
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = getDatabase();
    await db.ensureInitialized();

    // Get payment statistics
    const stats = await db.getPaymentStats(30); // Last 30 days
    const recentStats = await db.getPaymentStats(1); // Last 24 hours

    // Simple network info since blockchainService.getNetworkInfo() no longer exists
    const networkInfo = {
      isMainnet: process.env.NEXT_PUBLIC_NETWORK_MODE === "mainnet",
      networks: ["ethereum", "bsc", "tron"],
    };

    // Debug logging
    console.log("🔍 Environment configuration:", {
      NODE_ENV: process.env.NODE_ENV,
      NETWORK_MODE: process.env.NEXT_PUBLIC_NETWORK_MODE,
      DATABASE_URL: process.env.DATABASE_URL,
      WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
        ? "Set"
        : "Not set",
    });

    console.log("🔍 Network info:", networkInfo);

    // System health
    const systemHealth = {
      timestamp: new Date().toISOString(),
      database: "connected",
      blockchain: "available",
      environment: process.env.NODE_ENV,
      networkMode: process.env.NEXT_PUBLIC_NETWORK_MODE,
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentStats,
        networkInfo,
        systemHealth,
      },
    });
  } catch (error: any) {
    console.error("Admin dashboard API error:", error);
    return NextResponse.json(
      {
        error: "Failed to load dashboard data",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
