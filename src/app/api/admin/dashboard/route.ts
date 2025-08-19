// =================================
// 📊 Admin Dashboard API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { blockchainService } from "@/lib/blockchain";
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

    // Get network information
    const networkInfo = blockchainService.getNetworkInfo();

    // System health
    const systemHealth = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      services: {
        database: "operational",
        blockchain: "operational",
        api: "operational",
      },
      environment: process.env.NODE_ENV || "development",
      network: networkInfo.isMainnet ? "mainnet" : "testnet",
    };

    const dashboard = {
      system: systemHealth,
      stats: {
        last30Days: stats,
        last24Hours: recentStats,
      },
      network: networkInfo,
      metrics: {
        totalPayments: stats.total,
        successRate:
          stats.total > 0
            ? ((stats.completed / stats.total) * 100).toFixed(2)
            : "0",
        totalVolume: stats.totalAmount,
        averagePayment:
          stats.completed > 0
            ? (stats.totalAmount / stats.completed).toFixed(2)
            : "0",
      },
      breakdown: {
        completed: stats.completed,
        pending: stats.pending,
        failed: stats.failed,
        expired: stats.total - stats.completed - stats.pending - stats.failed,
      },
    };

    return NextResponse.json(dashboard);
  } catch (error: any) {
    console.error("Dashboard API error:", error);

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
