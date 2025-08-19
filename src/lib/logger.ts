// =================================
// 📝 Production Logging Utility
// =================================

import { getEnvironment } from "./env-validation";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  service?: string;
  traceId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private enableRequestLogging: boolean;

  constructor() {
    const env = getEnvironment();
    this.logLevel = env.LOG_LEVEL;
    this.enableRequestLogging = env.ENABLE_REQUEST_LOGGING;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["error", "warn", "info", "debug"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex <= currentLevelIndex;
  }

  private formatLog(
    level: LogLevel,
    message: string,
    data?: any,
    service?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      service,
      traceId: this.generateTraceId(),
    };
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private output(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry, null, 2);

    switch (logEntry.level) {
      case "error":
        console.error(logString);
        break;
      case "warn":
        console.warn(logString);
        break;
      case "info":
        console.info(logString);
        break;
      case "debug":
        console.debug(logString);
        break;
    }
  }

  error(message: string, data?: any, service?: string): void {
    if (this.shouldLog("error")) {
      this.output(this.formatLog("error", message, data, service));
    }
  }

  warn(message: string, data?: any, service?: string): void {
    if (this.shouldLog("warn")) {
      this.output(this.formatLog("warn", message, data, service));
    }
  }

  info(message: string, data?: any, service?: string): void {
    if (this.shouldLog("info")) {
      this.output(this.formatLog("info", message, data, service));
    }
  }

  debug(message: string, data?: any, service?: string): void {
    if (this.shouldLog("debug")) {
      this.output(this.formatLog("debug", message, data, service));
    }
  }

  // Specific logging methods for different services
  apiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration?: number,
    userAgent?: string
  ): void {
    if (!this.enableRequestLogging) return;

    this.info(
      "API Request",
      {
        method,
        url,
        statusCode,
        duration,
        userAgent,
      },
      "api"
    );
  }

  paymentCreated(paymentId: string, amount: number, serviceName: string): void {
    this.info(
      "Payment Created",
      {
        paymentId,
        amount,
        serviceName,
      },
      "payment"
    );
  }

  paymentUpdated(paymentId: string, status: string, chain?: string): void {
    this.info(
      "Payment Updated",
      {
        paymentId,
        status,
        chain,
      },
      "payment"
    );
  }

  blockchainTransaction(chain: string, txHash: string, status: string): void {
    this.info(
      "Blockchain Transaction",
      {
        chain,
        txHash,
        status,
      },
      "blockchain"
    );
  }

  webhookSent(
    paymentId: string,
    url: string,
    statusCode: number,
    attempt: number
  ): void {
    this.info(
      "Webhook Sent",
      {
        paymentId,
        url,
        statusCode,
        attempt,
      },
      "webhook"
    );
  }

  databaseError(operation: string, error: string, table?: string): void {
    this.error(
      "Database Error",
      {
        operation,
        error,
        table,
      },
      "database"
    );
  }

  securityAlert(type: string, ip: string, details?: any): void {
    this.warn(
      "Security Alert",
      {
        type,
        ip,
        details,
      },
      "security"
    );
  }

  rateLimitExceeded(ip: string, endpoint: string, limit: number): void {
    this.warn(
      "Rate Limit Exceeded",
      {
        ip,
        endpoint,
        limit,
      },
      "rate-limit"
    );
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logDebug = logger.debug.bind(logger);

// Service-specific logging
export const logApiRequest = logger.apiRequest.bind(logger);
export const logPaymentCreated = logger.paymentCreated.bind(logger);
export const logPaymentUpdated = logger.paymentUpdated.bind(logger);
export const logBlockchainTransaction =
  logger.blockchainTransaction.bind(logger);
export const logWebhookSent = logger.webhookSent.bind(logger);
export const logDatabaseError = logger.databaseError.bind(logger);
export const logSecurityAlert = logger.securityAlert.bind(logger);
export const logRateLimitExceeded = logger.rateLimitExceeded.bind(logger);
