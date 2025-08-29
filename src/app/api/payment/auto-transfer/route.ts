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
        await db.updatePaymentStatus(paymentId, "completed");
      } catch (dbError) {
        console.error("Failed to update payment status:", dbError);
        // Don't fail the response if DB update fails
      }

      return NextResponse.json({
        success: true,
        message: "Auto-transfer completed successfully",
        txHash: result.txHash,
        paymentStatus: "completed",
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
    console.error("Auto-transfer API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
        paymentStatus: "failed",
      },
      { status: 500 }
    );
  }
}
