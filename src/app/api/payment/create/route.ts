// =================================
// 💳 Payment Creation API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { getDatabase } from "@/lib/database";
import { CreatePaymentRequest } from "@/types";
import { z } from "zod";
import { rateLimit, createRateLimitResponse } from "@/lib/rate-limit";

// Validation schema
const createPaymentSchema = z.object({
  service_name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  amount: z.number().min(0.01).max(10000),
  webhook_url: z.string().url().optional(),
  language: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(request, "payment");
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset
      );
    }

    const body = await request.json();

    // Validate request data
    const validationResult = createPaymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          error_cn: "验证失败",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate payment ID and expiration
    const paymentId = uuidv4();
    const expiryMinutes = Number(process.env.PAYMENT_EXPIRY_MINUTES) || 30;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Create payment in database
    const db = getDatabase();
    const payment = await db.createPayment({
      ...data,
      payment_id: paymentId,
      expires_at: expiresAt,
    });

    // Get base URL from environment configuration
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const paymentUrl = `${baseUrl}/pay/${paymentId}`;

    // Generate QR code for mobile
    let qrCode: string | undefined;
    try {
      qrCode = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 256,
      });
    } catch (qrError) {
      console.error("QR code generation failed:", qrError);
      // Continue without QR code
    }

    return NextResponse.json({
      payment_id: paymentId,
      payment_url: paymentUrl,
      base_url: baseUrl,
      qr_code: qrCode,
      expires_at: expiresAt.toISOString(),
      amount: data.amount,
      service_name: data.service_name,
      description: data.description,
    });
  } catch (error: any) {
    console.error("Payment creation error:", error);

    return NextResponse.json(
      {
        error: "Failed to create payment",
        error_cn: "创建支付失败",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Health check for payment creation endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: "payment/create",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
}
