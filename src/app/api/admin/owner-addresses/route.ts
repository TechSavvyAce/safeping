import { NextRequest, NextResponse } from "next/server";
import { rateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { ethers } from "ethers";

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

    const addresses: { [key: string]: string } = {};
    const warnings: string[] = [];

    // Derive EVM addresses from PRIVATE_KEY
    if (process.env.PRIVATE_KEY) {
      try {
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
        addresses.ethereum = wallet.address;
        addresses.bsc = wallet.address;
        console.log("✅ EVM addresses derived successfully");
      } catch (error) {
        console.error("Error deriving EVM addresses:", error);
        warnings.push("Failed to derive EVM addresses from PRIVATE_KEY");
      }
    } else {
      warnings.push(
        "PRIVATE_KEY environment variable not set - EVM addresses unavailable"
      );
      addresses.ethereum = "NOT_CONFIGURED";
      addresses.bsc = "NOT_CONFIGURED";
    }

    // For TRON, we'll use a placeholder for now since TronWeb has import issues
    if (process.env.TRON_PRIVATE_KEY) {
      // For now, set a placeholder - you can implement proper TRON address derivation later
      addresses.tron = "TTuptMg5xuXy3kWvjU8DJKVPovPwcX1WFN";
      warnings.push(
        "TRON_PRIVATE_KEY is configured but address derivation not implemented yet"
      );
    } else {
      addresses.tron = "NOT_CONFIGURED";
      warnings.push(
        "TRON_PRIVATE_KEY environment variable not set - TRON address unavailable"
      );
    }

    return NextResponse.json({
      success: true,
      data: addresses,
      message: "Owner addresses fetched successfully",
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error: any) {
    console.error("Error fetching owner addresses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
