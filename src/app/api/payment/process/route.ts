import { NextRequest, NextResponse } from "next/server";
import { processPayment } from "@/lib/blockchain";

export async function POST(request: NextRequest) {
  try {
    const { paymentId, amount, userAddress, chain } = await request.json();

    if (!paymentId || !amount || !userAddress || !chain) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const result = await processPayment(paymentId, amount, userAddress, chain);

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
