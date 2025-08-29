import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const { username, password, balances } = await request.json();

    // Validate credentials
    if (
      !username ||
      !password ||
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Validate balances data
    if (!Array.isArray(balances)) {
      return NextResponse.json(
        { error: "Invalid balances data" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Update each wallet balance in the database
    for (const balance of balances) {
      if (balance.address && balance.usdtBalance !== undefined) {
        await db.updateWalletBalance(balance.address, balance.usdtBalance);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${balances.length} wallet balances`,
      updatedCount: balances.length,
    });
  } catch (error: any) {
    console.error("Failed to update wallet balances:", error);
    return NextResponse.json(
      { error: "Failed to update wallet balances", details: error.message },
      { status: 500 }
    );
  }
}
