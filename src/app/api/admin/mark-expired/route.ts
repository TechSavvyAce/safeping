import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { rateLimit, createRateLimitResponse } from "@/lib/rate-limit";

// Helper function to check authentication
function checkAuth(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const password = searchParams.get("password");

  if (
    !username ||
    !password ||
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
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

    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const db = getDatabase();
    await db.ensureInitialized();
    const expiredCount = await db.markExpiredPayments();

    return NextResponse.json({
      success: true,
      message: `Marked ${expiredCount} payments as expired`,
      expiredCount,
    });
  } catch (error: any) {
    console.error("Mark expired error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Options for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
