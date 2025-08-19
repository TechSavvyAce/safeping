// =================================
// ⚡ Payment Processing API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { z } from "zod";

const processPaymentSchema = z.object({
  wallet_address: z.string().min(1, "Wallet address is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;
    const body = await request.json();

    // Validate request
    const validationResult = processPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          error_cn: "请求无效",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { wallet_address } = validationResult.data;

    // Get payment from database
    const db = getDatabase();
    const payment = await db.getPayment(paymentId);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found", error_cn: "未找到支付" },
        { status: 404 }
      );
    }

    // Check payment status - allow processing of pending or already processing payments
    if (payment.status !== "pending" && payment.status !== "processing") {
      return NextResponse.json(
        {
          error: "Payment cannot be processed in current status",
          error_cn: "当前状态下无法处理支付",
          current_status: payment.status,
        },
        { status: 400 }
      );
    }

    // Check if payment is expired
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);

    if (now > expiresAt) {
      await db.updatePaymentStatus(paymentId, "expired");
      return NextResponse.json(
        { error: "Payment has expired", error_cn: "支付已过期" },
        { status: 400 }
      );
    }

    // Update payment status to processing
    await db.updatePaymentStatus(paymentId, "processing", { wallet_address });

    // Log the processing event
    await db.logEvent(paymentId, "processing_started", {
      wallet_address,
      timestamp: now.toISOString(),
    });

    // Get chain from payment
    const chain = payment.chain;
    if (!chain) {
      return NextResponse.json(
        {
          error: "Payment chain not specified",
          error_cn: "未指定支付链",
        },
        { status: 400 }
      );
    }

    console.log(
      `🔄 Processing payment ${paymentId} from wallet ${wallet_address} on ${chain}`
    );

    // Import and execute real blockchain transaction
    const { BlockchainService } = await import("@/lib/blockchain");
    const blockchainService = BlockchainService.getInstance();

    // Execute the actual blockchain transaction
    const result = await blockchainService.processPayment(
      paymentId,
      payment.amount,
      wallet_address,
      chain
    );

    if (result.success && result.txHash) {
      // Update payment with real transaction hash and completed status
      await db.updatePaymentStatus(paymentId, "completed", {
        wallet_address,
        tx_hash: result.txHash,
      });

      console.log(
        `✅ Payment ${paymentId} completed with real tx: ${result.txHash}`
      );

      return NextResponse.json({
        payment_id: paymentId,
        status: "completed",
        wallet_address,
        tx_hash: result.txHash,
        message: "Payment completed successfully",
        message_cn: "支付完成",
      });
    } else {
      // Update payment as failed
      await db.updatePaymentStatus(paymentId, "failed");

      console.error(`❌ Payment ${paymentId} failed:`, result.error);

      return NextResponse.json(
        {
          error: result.error || "Blockchain transaction failed",
          error_cn: "区块链交易失败",
          payment_id: paymentId,
          status: "failed",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Payment processing error:", error);

    return NextResponse.json(
      {
        error: "Failed to process payment",
        error_cn: "处理支付失败",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
