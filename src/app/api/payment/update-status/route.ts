// =================================
// 💰 Payment Status Update API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { logger } from "@/lib/logger";
import { PaymentStatus } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, status, walletAddress, txHash } = body;

    // Validate required fields
    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: paymentId and status" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: PaymentStatus[] = [
      "pending",
      "processing",
      "completed",
      "failed",
      "expired",
    ];
    if (!validStatuses.includes(status as PaymentStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    logger.info(`Updating payment ${paymentId} status to: ${status}`);

    // Get database instance (server-side only)
    const db = getDatabase();
    await db.ensureInitialized();

    // Update payment status
    await db.updatePaymentStatus(paymentId, status as PaymentStatus, {
      wallet_address: walletAddress,
      tx_hash: txHash,
    });

    logger.info(
      `Successfully updated payment ${paymentId} status to: ${status}`
    );

    return NextResponse.json({
      success: true,
      message: "Payment status updated successfully",
      data: { paymentId, status, walletAddress, txHash },
    });
  } catch (error: any) {
    logger.error("Error updating payment status:", error);
    return NextResponse.json(
      { error: "Failed to update payment status", details: error.message },
      { status: 500 }
    );
  }
}
