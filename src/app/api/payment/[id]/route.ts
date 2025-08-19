// =================================
// 📄 Payment Details API Route
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

    // Check if payment is expired
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);

    if (payment.status === "pending" && now > expiresAt) {
      // Mark as expired
      await db.updatePaymentStatus(paymentId, "expired");
      payment.status = "expired";
    }

    const response = {
      payment_id: payment.payment_id,
      service_name: payment.service_name,
      description: payment.description,
      amount: payment.amount,
      chain: payment.chain,
      status: payment.status,
      tx_hash: payment.tx_hash,
      created_at: payment.created_at,
      expires_at: payment.expires_at,
      language: payment.language,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Payment fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch payment",
        error_cn: "获取支付信息失败",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
