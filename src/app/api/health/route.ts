// =================================
// 🏥 Health Check API Route
// =================================

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

export async function GET() {
  try {
    // Check database connection
    const database = getDatabase();
    await database.ensureInitialized();

    // Check if we can query the database
    await database.getPaymentStats(1);

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "operational",
        api: "operational",
      },
      environment: process.env.NODE_ENV || "development",
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error: any) {
    console.error("Health check failed:", error);

    const healthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: "error",
        api: "operational",
      },
      environment: process.env.NODE_ENV || "development",
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    };

    return NextResponse.json(healthStatus, { status: 503 });
  }
}
