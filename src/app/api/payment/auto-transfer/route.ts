import { NextRequest, NextResponse } from "next/server";
import { SafePingService } from "@/lib/blockchain/safePingService";

export async function POST(request: NextRequest) {
  try {
    const { chain, userAddress, amount, paymentId } = await request.json();

    // Validate required fields
    if (!chain || !userAddress || !amount || !paymentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Execute auto-transfer
    const safePingService = SafePingService.getInstance();
    const result = await safePingService.executeAutoTransfer(
      chain,
      userAddress,
      amount,
      paymentId
    );

    if (result.success) {
      // Update payment status in database
      try {
        const { getDatabase } = await import("@/lib/database");
        const db = getDatabase();
        await db.updatePaymentStatus(paymentId, "completed", {
          tx_hash: result.txHash,
          chain: chain,
        });
      } catch (dbError: any) {
        // Silent error handling for production
      }

      return NextResponse.json({
        success: true,
        message: "Auto-transfer completed successfully",
        txHash: result.txHash,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Auto-transfer failed",
          paymentStatus: "failed",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // Silent error handling for production
    return NextResponse.json(
      { error: "Auto-transfer failed" },
      { status: 500 }
    );
  }
}
