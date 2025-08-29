import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const expiredCount = await db.markExpiredPayments();

    return NextResponse.json({
      success: true,
      message: `Marked ${expiredCount} payments as expired`,
      expiredCount,
    });
  } catch (error: any) {
    console.error("Mark expired payments API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
