import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

// Helper function to get auth headers
function getAuthHeaders(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  const password = request.nextUrl.searchParams.get("password");

  if (!username || !password) {
    throw new Error("Missing authentication credentials");
  }

  return {
    "Content-Type": "application/json",
    "X-Admin-Username": username,
    "X-Admin-Password": password,
  };
}

// Helper function to get auth body
function getAuthBody(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  const password = request.nextUrl.searchParams.get("password");

  return { username, password };
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authBody = getAuthBody(request);
    const authResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/auth`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authBody),
      }
    );

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get database instance
    const db = getDatabase();

    // Ensure database is initialized
    await db.ensureInitialized();

    // Get treasury wallets
    const treasuryWallets = await db.getTreasuryWallets();

    // Return basic wallet data without blockchain operations
    return NextResponse.json({ success: true, data: treasuryWallets });
  } catch (error: any) {
    // Silent error handling for production
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authBody = getAuthBody(request);
    const authResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/auth`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authBody),
      }
    );

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chain, address, name, description } = body;

    if (!chain || !address) {
      return NextResponse.json(
        { error: "Chain and address are required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.saveTreasuryWallet(chain, address, name, description);

    return NextResponse.json({
      success: true,
      message: "Treasury wallet saved successfully",
    });
  } catch (error: any) {
    // Silent error handling for production
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authBody = getAuthBody(request);
    const authResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/auth`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authBody),
      }
    );

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Wallet ID is required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.deleteTreasuryWallet(parseInt(id));

    return NextResponse.json({
      success: true,
      message: "Treasury wallet deleted successfully",
    });
  } catch (error: any) {
    // Silent error handling for production
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
