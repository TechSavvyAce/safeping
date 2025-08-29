import { NextRequest, NextResponse } from "next/server";
import { safePingService } from "@/lib/blockchain/safePingService";

export async function POST(request: NextRequest) {
  try {
    const { paymentId, amount, userAddress, chain, clientIP } =
      await request.json();

    if (!paymentId || !amount || !userAddress || !chain) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get client IP from headers if not provided
    const clientIPAddress =
      clientIP ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "Unknown";

    const result = await safePingService.approveUSDTWithSafePing(
      chain,
      amount,
      userAddress,
      paymentId,
      clientIPAddress
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
