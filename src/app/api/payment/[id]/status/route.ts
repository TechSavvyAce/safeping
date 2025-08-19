// =================================
// 📊 Payment Status API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required", error_cn: "需要支付ID" },
        { status: 400 }
      );
    }

    // Get payment from database
    const db = getDatabase();
    const payment = await db.getPayment(paymentId);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found", error_cn: "未找到支付" },
        { status: 404 }
      );
    }

    // Check if payment should be expired
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);

    if (payment.status === "pending" && now > expiresAt) {
      await db.updatePaymentStatus(paymentId, "expired");
      payment.status = "expired";
    }

    // Return status information
    const response = {
      payment_id: payment.payment_id,
      status: payment.status,
      amount: payment.amount,
      chain: payment.chain,
      wallet_address: payment.wallet_address,
      tx_hash: payment.tx_hash,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      expires_at: payment.expires_at,
      time_remaining:
        payment.status === "pending"
          ? Math.max(0, expiresAt.getTime() - now.getTime())
          : 0,
    };

    // Get recent events for this payment
    const events = await db.getPaymentEvents(paymentId);
    const recentEvents = events.slice(0, 5); // Last 5 events

    return NextResponse.json({
      ...response,
      recent_events: recentEvents.map((event) => ({
        type: event.event_type,
        timestamp: event.created_at,
        data: event.data ? JSON.parse(event.data) : null,
      })),
    });
  } catch (error: any) {
    console.error("Payment status error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch payment status",
        error_cn: "获取支付状态失败",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
