// =================================
// 🗄️ Professional Database Layer
// =================================

import sqlite3 from "sqlite3";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import {
  Payment,
  PaymentEvent,
  WebhookLog,
  CreatePaymentRequest,
  PaymentStatus,
  ChainType,
} from "@/types";
import { MigrationRunner } from "./migrations";
import { logInfo, logError } from "./logger";

class Database {
  private db: sqlite3.Database | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const dbPath =
        process.env.DATABASE_URL ||
        path.join(process.cwd(), "data", "payments.db");
      const dbDir = path.dirname(dbPath);

      // Ensure data directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath);

      // Run migrations
      await this.runMigrations();
      this.isInitialized = true;

      logInfo("✅ Database initialized successfully");
    } catch (error) {
      logError("❌ Database initialization failed", error);
      throw error;
    }
  }

  private async runMigrations() {
    if (!this.db) throw new Error("Database not initialized");

    const migrationRunner = new MigrationRunner(this.db);
    await migrationRunner.migrate();
  }

  // Database migration and schema management now handled by MigrationRunner

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  // Payment operations
  async createPayment(
    data: CreatePaymentRequest & { payment_id: string; expires_at: Date }
  ): Promise<Payment> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const run = (sql: string, params?: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (params) {
          this.db!.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        } else {
          this.db!.run(sql, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        }
      });
    };

    const get = (sql: string, params?: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (params) {
          this.db!.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        } else {
          this.db!.get(sql, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        }
      });
    };

    const {
      payment_id,
      service_name,
      description,
      amount,
      webhook_url,
      language,
      expires_at,
    } = data;

    await run(
      `INSERT INTO payments (
        payment_id, service_name, description,
        amount, webhook_url, language, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payment_id,
        service_name,
        description || null,
        amount,
        webhook_url || null,
        language || null,
        expires_at.toISOString(),
      ]
    );

    const payment = (await get("SELECT * FROM payments WHERE payment_id = ?", [
      payment_id,
    ])) as Payment;

    await this.logEvent(payment_id, "created", { amount });

    return payment;
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const get = (sql: string, params?: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (params) {
          this.db!.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        } else {
          this.db!.get(sql, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        }
      });
    };

    return (await get("SELECT * FROM payments WHERE payment_id = ?", [
      paymentId,
    ])) as Payment | null;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    data?: { wallet_address?: string; tx_hash?: string }
  ): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const run = (sql: string, params?: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (params) {
          this.db!.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        } else {
          this.db!.run(sql, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        }
      });
    };

    let sql = "UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP";
    const params: any[] = [status];

    if (data?.wallet_address) {
      sql += ", wallet_address = ?";
      params.push(data.wallet_address);
    }

    if (data?.tx_hash) {
      sql += ", tx_hash = ?";
      params.push(data.tx_hash);
    }

    sql += " WHERE payment_id = ?";
    params.push(paymentId);

    await run(sql, params);
    await this.logEvent(paymentId, "status_updated", { status, ...data });
  }

  async updatePaymentChain(paymentId: string, chain: ChainType): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const run = (sql: string, params?: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (params) {
          this.db!.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        } else {
          this.db!.run(sql, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        }
      });
    };

    await run(
      "UPDATE payments SET chain = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?",
      [chain, paymentId]
    );
    await this.logEvent(paymentId, "chain_updated", { chain });
  }

  async getExpiredPayments(): Promise<Payment[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const all = promisify(this.db.all.bind(this.db));

    return (await all(`
      SELECT * FROM payments 
      WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
    `)) as Payment[];
  }

  async markExpiredPayments(): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const run = promisify(this.db.run.bind(this.db));

    const result = await run(`
      UPDATE payments 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
    `);

    return (result as any).changes || 0;
  }

  // Event logging
  async logEvent(
    paymentId: string,
    eventType: string,
    data?: any
  ): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const run = (sql: string, params?: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (params) {
          this.db!.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        } else {
          this.db!.run(sql, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        }
      });
    };

    await run(
      `INSERT INTO payment_events (payment_id, event_type, data) VALUES (?, ?, ?)`,
      [paymentId, eventType, data ? JSON.stringify(data) : null]
    );
  }

  async getPaymentEvents(paymentId: string): Promise<PaymentEvent[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const all = (sql: string, params?: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        if (params) {
          this.db!.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        } else {
          this.db!.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }
      });
    };

    return (await all(
      "SELECT * FROM payment_events WHERE payment_id = ? ORDER BY created_at DESC",
      [paymentId]
    )) as PaymentEvent[];
  }

  // Webhook operations
  async logWebhook(
    paymentId: string,
    webhookUrl: string,
    payload: any,
    responseStatus: number,
    responseData?: any
  ): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const run = (sql: string, params?: any[]) => {
      return new Promise<any>((resolve, reject) => {
        if (params) {
          this.db!.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        } else {
          this.db!.run(sql, function (err) {
            if (err) reject(err);
            else resolve(this);
          });
        }
      });
    };

    await run(
      `INSERT INTO webhook_logs (payment_id, webhook_url, payload, response_status, response_data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        paymentId,
        webhookUrl,
        JSON.stringify(payload),
        responseStatus,
        responseData ? JSON.stringify(responseData) : null,
      ]
    );
  }

  async getWebhookLogs(paymentId: string): Promise<WebhookLog[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const all = (sql: string, params?: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        if (params) {
          this.db!.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        } else {
          this.db!.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }
      });
    };

    return (await all(
      "SELECT * FROM webhook_logs WHERE payment_id = ? ORDER BY created_at DESC",
      [paymentId]
    )) as WebhookLog[];
  }

  // Admin operations
  async getPaymentCount(): Promise<{ total: number }> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const get = promisify(this.db.get.bind(this.db));

    const result = (await get("SELECT COUNT(*) as total FROM payments")) as any;
    return { total: result.total || 0 };
  }

  async getAllPayments(limit: number, offset: number): Promise<Payment[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const all = (sql: string, params?: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        if (params) {
          this.db!.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        } else {
          this.db!.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }
      });
    };

    return (await all(
      "SELECT * FROM payments ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    )) as Payment[];
  }

  async getUniqueWalletAddresses(): Promise<
    { address: string; chain: string }[]
  > {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const all = (sql: string, params?: any[]) => {
      return new Promise<any[]>((resolve, reject) => {
        if (params) {
          this.db!.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        } else {
          this.db!.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }
      });
    };

    return (await all(
      "SELECT DISTINCT wallet_address as address, chain FROM payments WHERE wallet_address IS NOT NULL AND wallet_address != '' ORDER BY chain, address"
    )) as { address: string; chain: string }[];
  }

  // Analytics and reporting
  async getPaymentStats(days = 30): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    totalAmount: number;
  }> {
    await this.ensureInitialized();
    if (!this.db) throw new Error("Database not initialized");

    const get = promisify(this.db.get.bind(this.db));

    const stats = (await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as totalAmount
      FROM payments 
      WHERE created_at >= datetime('now', '-${days} days')
    `)) as any;

    return {
      total: stats.total || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      pending: stats.pending || 0,
      totalAmount: stats.totalAmount || 0,
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      const close = promisify(this.db.close.bind(this.db));
      await close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

export default Database;
