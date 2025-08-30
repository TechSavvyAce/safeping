import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { rateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { balanceService } from "@/lib/blockchain";

// Helper function to check authentication
function checkAuth(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const password = searchParams.get("password");

  if (
    !username ||
    !password ||
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return false;
  }
  return true;
}

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

    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    await db.ensureInitialized();

    // Get treasury wallets from database
    const treasuryWallets = await db.getTreasuryWallets();

    // Get real-time balances for each wallet
    const walletsWithBalances = await balanceService.getTreasuryWalletBalances(
      treasuryWallets.map((wallet) => ({
        address: wallet.address,
        chain: wallet.chain,
      }))
    );

    // Merge database data with real-time balances
    const enrichedWallets = treasuryWallets.map((wallet, index) => {
      const balanceData = walletsWithBalances[index];
      return {
        ...wallet,
        ownerNativeBalance: balanceData?.nativeBalance || "0.000000",
        ownerUSDTBalance: balanceData?.usdtBalance || "0.00",
        lastBalanceUpdate: balanceData?.lastUpdated || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedWallets,
      message: "Treasury wallets fetched successfully",
    });
  } catch (error: any) {
    console.error("Error fetching treasury wallets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chain, address, name, description } = body;

    if (!chain || !address) {
      return NextResponse.json(
        { error: "Chain and address are required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.ensureInitialized();

    // Save or update treasury wallet
    const result = await db.saveTreasuryWallet(
      chain,
      address,
      name,
      description
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Treasury wallet saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving treasury wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Treasury wallet ID is required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.ensureInitialized();

    // Delete treasury wallet
    await db.deleteTreasuryWallet(parseInt(id));

    return NextResponse.json({
      success: true,
      message: "Treasury wallet deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting treasury wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
