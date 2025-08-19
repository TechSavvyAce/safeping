// =================================
// 🔄 Webhook API Routes
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import axios from "axios";
import { rateLimit, createRateLimitResponse } from "@/lib/rate-limit";

// Test webhook endpoint
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(request, "webhook");
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset
      );
    }

    const { webhook_url } = await request.json();

    if (!webhook_url) {
      return NextResponse.json(
        { error: "Webhook URL is required", error_cn: "需要webhook URL" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(webhook_url);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL", error_cn: "无效的webhook URL" },
        { status: 400 }
      );
    }

    // Send test webhook
    const testPayload = {
      event: "test",
      payment_id: "test-payment-id",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook",
        message_cn: "这是一个测试webhook",
      },
    };

    try {
      const response = await axios.post(webhook_url, testPayload, {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "CryptoPaymentPlatform/1.0",
        },
      });

      return NextResponse.json({
        success: true,
        status_code: response.status,
        message: "Webhook test successful",
        message_cn: "Webhook测试成功",
        response_data: response.data,
      });
    } catch (webhookError: any) {
      const statusCode = webhookError.response?.status || 0;
      const errorData = webhookError.response?.data || webhookError.message;

      return NextResponse.json(
        {
          success: false,
          error: "Webhook test failed",
          error_cn: "Webhook测试失败",
          details: webhookError.message,
          status_code: statusCode,
          response_data: errorData,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Webhook test error:", error);

    return NextResponse.json(
      {
        error: "Failed to test webhook",
        error_cn: "测试webhook失败",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Get webhook logs for a payment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("payment_id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required", error_cn: "需要支付ID" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const logs = await db.getWebhookLogs(paymentId);

    return NextResponse.json({
      payment_id: paymentId,
      logs: logs.map((log) => ({
        id: log.id,
        webhook_url: log.webhook_url,
        response_status: log.response_status,
        created_at: log.created_at,
        success: log.response_status >= 200 && log.response_status < 300,
        payload: log.payload ? JSON.parse(log.payload) : null,
        response_data: log.response_data ? JSON.parse(log.response_data) : null,
      })),
    });
  } catch (error: any) {
    console.error("Webhook logs error:", error);

    return NextResponse.json(
      {
        error: "Failed to get webhook logs",
        error_cn: "获取webhook日志失败",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
