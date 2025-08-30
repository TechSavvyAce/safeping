import { NextRequest, NextResponse } from "next/server";
import { TronService } from "@/lib/blockchain/tronService";

export async function POST(request: NextRequest) {
  try {
    const { from, to, amount } = await request.json();

    // Validate input
    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: "Missing required parameters: from, to, amount" },
        { status: 400 }
      );
    }

    // Use TronService to perform the transfer
    const result = await TronService.transferFromUserAsOwner(from, to, amount);

    if (result.success) {
      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "TRON transfer failed" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("TRON transfer error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
