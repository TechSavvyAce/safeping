// =================================
// 🏥 Health Check API Route
// =================================

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { autoTransferService } from "@/lib/auto-transfer";
import { telegramService } from "@/lib/telegram";

// Define types for health checks
type HealthCheckStatus = "healthy" | "unhealthy" | "unknown" | "error";

interface HealthCheck {
  status: HealthCheckStatus;
  responseTime: number;
  details?: any;
  error?: string;
}

interface HealthSummary {
  totalChecks: number;
  healthyChecks: number;
  unhealthyChecks: number;
  totalResponseTime: number;
}

interface HealthResponse {
  status: "healthy" | "unhealthy" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: HealthCheck;
    autoTransfer: HealthCheck;
    telegram: HealthCheck;
    system: HealthCheck;
  };
  summary: HealthSummary;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const health: HealthResponse = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: { status: "unknown", responseTime: 0 },
      autoTransfer: { status: "unknown", responseTime: 0 },
      telegram: { status: "unknown", responseTime: 0 },
      system: { status: "unknown", responseTime: 0 },
    },
    summary: {
      totalChecks: 4,
      healthyChecks: 0,
      unhealthyChecks: 0,
      totalResponseTime: 0,
    },
  };

  try {
    // Database health check
    const dbStart = Date.now();
    try {
      const db = getDatabase();
      await db.ensureInitialized();
      const dbResponseTime = Date.now() - dbStart;
      health.checks.database = {
        status: "healthy",
        responseTime: dbResponseTime,
      };
      health.summary.healthyChecks++;
      health.summary.totalResponseTime += dbResponseTime;
    } catch (error) {
      const dbResponseTime = Date.now() - dbStart;
      health.checks.database = {
        status: "unhealthy",
        responseTime: dbResponseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      health.summary.unhealthyChecks++;
      health.summary.totalResponseTime += dbResponseTime;
    }

    // Auto-transfer service health check
    const atStart = Date.now();
    try {
      const atStatus = await autoTransferService.getStatus();
      const atResponseTime = Date.now() - atStart;
      health.checks.autoTransfer = {
        status: "healthy",
        responseTime: atResponseTime,
        details: {
          isRunning: atStatus.isRunning,
          lastRun: atStatus.lastRun,
        },
      };
      health.summary.healthyChecks++;
      health.summary.totalResponseTime += atResponseTime;
    } catch (error) {
      const atResponseTime = Date.now() - atStart;
      health.checks.autoTransfer = {
        status: "unhealthy",
        responseTime: atResponseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      health.summary.unhealthyChecks++;
      health.summary.totalResponseTime += atResponseTime;
    }

    // Telegram service health check
    const tgStart = Date.now();
    try {
      const tgConfig = telegramService.getConfig();
      const tgResponseTime = Date.now() - tgStart;
      health.checks.telegram = {
        status: "healthy",
        responseTime: tgResponseTime,
        details: {
          isConfigured: tgConfig.isEnabled,
          hasToken: !!tgConfig.token,
          hasChannelId: !!tgConfig.channelId,
        },
      };
      health.summary.healthyChecks++;
      health.summary.totalResponseTime += tgResponseTime;
    } catch (error) {
      const tgResponseTime = Date.now() - tgStart;
      health.checks.telegram = {
        status: "unhealthy",
        responseTime: tgResponseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      health.summary.unhealthyChecks++;
      health.summary.totalResponseTime += tgResponseTime;
    }

    // System health check
    const sysStart = Date.now();
    try {
      const memoryUsage = process.memoryUsage();
      const sysResponseTime = Date.now() - sysStart;
      health.checks.system = {
        status: "healthy",
        responseTime: sysResponseTime,
        details: {
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
          },
          cpu: process.cpuUsage(),
          platform: process.platform,
          arch: process.arch,
        },
      };
      health.summary.healthyChecks++;
      health.summary.totalResponseTime += sysResponseTime;
    } catch (error) {
      const sysResponseTime = Date.now() - sysStart;
      health.checks.system = {
        status: "unhealthy",
        responseTime: sysResponseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      health.summary.unhealthyChecks++;
      health.summary.totalResponseTime += sysResponseTime;
    }

    // Determine overall health status
    if (health.summary.unhealthyChecks > 0) {
      health.status = "unhealthy";
    } else if (health.summary.healthyChecks === health.summary.totalChecks) {
      health.status = "healthy";
    } else {
      health.status = "degraded";
    }

    // Add total response time
    health.summary.totalResponseTime = Date.now() - startTime;

    // Return appropriate HTTP status
    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
        ? 200
        : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    // If health check itself fails, return 500
    health.status = "error";
    health.checks.system = {
      status: "error",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Health check failed",
    };
    health.summary.unhealthyChecks++;
    health.summary.totalResponseTime = Date.now() - startTime;

    return NextResponse.json(health, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
