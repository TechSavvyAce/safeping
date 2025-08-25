// =================================
// ✅ Admin Payment Status Update API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { rateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimit(request, "api");
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset
      );
    }

    // Basic auth check (in production, implement proper authentication)
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { status } = await request.json();

    // Validate status
    const validStatuses = ["pending", "completed", "failed", "expired"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Must be one of: pending, completed, failed, expired",
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.ensureInitialized();

    // First get the payment to access the old status
    const existingPayment = await db.getPayment(id);
    if (!existingPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    await db.updatePaymentStatus(id, status);

    // Log the status change
    await db.logEvent(id, "status_updated", {
      oldStatus: existingPayment.status,
      newStatus: status,
      updatedBy: "admin",
      timestamp: new Date().toISOString(),
    });

    // Get the updated payment to return
    const updatedPayment = await db.getPayment(id);

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: `Payment status updated to ${status}`,
    });
  } catch (error: any) {
    console.error("Admin payment status update API error:", error);

    return NextResponse.json(
      {
        error: "Failed to update payment status",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
