// =================================
// 💰 Admin Wallet Balances API Route
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

    // Get unique wallet addresses from payments
    const walletAddresses = await db.getUniqueWalletAddresses();

    // Get balances for each wallet address
    const balances = [];

    for (const wallet of walletAddresses) {
      if (wallet.address && wallet.chain) {
        // For now, return mock data since blockchain integration is complex
        // In production, you would implement real balance checking
        balances.push({
          address: wallet.address,
          chain: wallet.chain,
          balance: "0.0", // Mock native balance
          usdtBalance: "0.0", // Mock USDT balance
        });
      }
    }

    return NextResponse.json({
      balances,
      totalWallets: balances.length,
    });
  } catch (error: any) {
    console.error("Admin wallet balances API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load wallet balances",
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
