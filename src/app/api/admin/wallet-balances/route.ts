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
        try {
          // Get payment statistics for this wallet
          const walletStats = await db.getWalletPaymentStats(
            wallet.address,
            wallet.chain
          );

          // For now, return realistic mock data based on payment history
          // In production, you would implement real blockchain balance checking
          const mockBalance = generateMockBalance(wallet.chain, walletStats);

          balances.push({
            address: wallet.address,
            chain: wallet.chain,
            balance: mockBalance.native,
            usdtBalance: mockBalance.usdt,
            paymentCount: walletStats.total,
            totalVolume: walletStats.totalAmount,
            lastActivity: walletStats.lastPaymentDate,
          });
        } catch (error) {
          console.error(
            `Error getting stats for wallet ${wallet.address}:`,
            error
          );
          // Add wallet with minimal data if stats fail
          balances.push({
            address: wallet.address,
            chain: wallet.chain,
            balance: "0.0",
            usdtBalance: "0.0",
            paymentCount: 0,
            totalVolume: 0,
            lastActivity: null,
          });
        }
      }
    }

    return NextResponse.json({
      balances,
      totalWallets: balances.length,
      lastUpdated: new Date().toISOString(),
      note: "Balances are simulated based on payment history. Real blockchain integration coming soon.",
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

// Helper function to generate realistic mock balances based on payment history
function generateMockBalance(chain: string, stats: any) {
  const baseMultiplier = Math.max(1, stats.total || 1);
  const volumeMultiplier = Math.max(0.1, (stats.totalAmount || 0) / 100);

  let nativeBalance = "0.0";
  let usdtBalance = "0.0";

  switch (chain) {
    case "ethereum":
      nativeBalance = `${(0.01 + Math.random() * 0.5 * baseMultiplier).toFixed(
        4
      )} ETH`;
      usdtBalance = `${(10 + Math.random() * 1000 * volumeMultiplier).toFixed(
        2
      )} USDT`;
      break;
    case "bsc":
      nativeBalance = `${(0.1 + Math.random() * 2 * baseMultiplier).toFixed(
        4
      )} BNB`;
      usdtBalance = `${(5 + Math.random() * 500 * volumeMultiplier).toFixed(
        2
      )} USDT`;
      break;
    case "tron":
      nativeBalance = `${(100 + Math.random() * 1000 * baseMultiplier).toFixed(
        0
      )} TRX`;
      usdtBalance = `${(1 + Math.random() * 100 * volumeMultiplier).toFixed(
        2
      )} USDT`;
      break;
    default:
      nativeBalance = "0.0";
      usdtBalance = "0.0";
  }

  return { native: nativeBalance, usdt: usdtBalance };
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
