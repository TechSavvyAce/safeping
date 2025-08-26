// =================================
// 💰 Admin Auto-Transfer API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { autoTransferService } from "@/lib/auto-transfer";
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

    // Basic auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const status = await autoTransferService.getStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error("Auto-transfer status API error:", error);

    return NextResponse.json(
      {
        error: "Failed to get auto-transfer status",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
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

    // Basic auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, config, walletAddress, amount, chain } = body;

    switch (action) {
      case "start":
        await autoTransferService.start();
        return NextResponse.json({
          success: true,
          message: "Auto-transfer service started",
        });

      case "stop":
        await autoTransferService.stop();
        return NextResponse.json({
          success: true,
          message: "Auto-transfer service stopped",
        });

      case "update-config":
        if (!config) {
          return NextResponse.json(
            { error: "Configuration required" },
            { status: 400 }
          );
        }
        await autoTransferService.updateConfig(config);
        return NextResponse.json({
          success: true,
          message: "Configuration updated",
        });

      case "force-transfer":
        if (!walletAddress || !amount || !chain) {
          return NextResponse.json(
            { error: "Wallet address, amount, and chain required" },
            { status: 400 }
          );
        }
        const result = await autoTransferService.forceTransfer(
          walletAddress,
          amount,
          chain
        );
        return NextResponse.json({
          success: true,
          data: result,
        });

      case "refresh-destinations":
        const destinations =
          await autoTransferService.refreshDestinationAddresses();
        return NextResponse.json({
          success: true,
          data: destinations,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Auto-transfer control API error:", error);

    return NextResponse.json(
      {
        error: "Failed to control auto-transfer service",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
