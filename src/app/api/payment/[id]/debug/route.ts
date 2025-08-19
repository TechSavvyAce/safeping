// =================================
// 🐛 Payment Debug API Route
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

    // Parse metadata
    let parsedMetadata = null;
    if (payment.metadata) {
      try {
        parsedMetadata = JSON.parse(payment.metadata);
      } catch (error) {
        parsedMetadata = {
          error: "Failed to parse metadata",
          raw: payment.metadata,
        };
      }
    }

    // Return debug information
    return NextResponse.json({
      payment_id: payment.payment_id,
      service_name: payment.service_name,
      amount: payment.amount,
      chain: payment.chain,
      status: payment.status,
      metadata_raw: payment.metadata,
      metadata_parsed: parsedMetadata,
      created_at: payment.created_at,
      expires_at: payment.expires_at,
      debug_info: {
        has_metadata: !!payment.metadata,
        metadata_type: typeof payment.metadata,
        metadata_length: payment.metadata ? payment.metadata.length : 0,
      },
    });
  } catch (error: any) {
    console.error("Payment debug error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch payment debug info",
        error_cn: "获取支付调试信息失败",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
