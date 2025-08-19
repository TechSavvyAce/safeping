// =================================
// 🔄 Database Migration System
// =================================

import sqlite3 from "sqlite3";
import { promisify } from "util";
import { logInfo, logError } from "./logger";

interface Migration {
  version: number;
  name: string;
  up: string[];
  down: string[];
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT UNIQUE NOT NULL,
        service_name TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        chain TEXT,
        status TEXT DEFAULT 'pending',
        wallet_address TEXT,
        tx_hash TEXT,
        webhook_url TEXT,
        language TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS payment_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
      )`,
      `CREATE TABLE IF NOT EXISTS webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        payload TEXT NOT NULL,
        response_status INTEGER,
        response_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
      )`,
    ],
    down: [
      "DROP TABLE IF EXISTS webhook_logs",
      "DROP TABLE IF EXISTS payment_events",
      "DROP TABLE IF EXISTS payments",
      "DROP TABLE IF EXISTS schema_migrations",
    ],
  },
  {
    version: 2,
    name: "add_indexes",
    up: [
      "CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments (payment_id)",
      "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)",
      "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at)",
      "CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments (expires_at)",
      "CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment_events (payment_id)",
      "CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events (created_at)",
      "CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs (payment_id)",
      "CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs (created_at)",
    ],
    down: [
      "DROP INDEX IF EXISTS idx_webhook_logs_created_at",
      "DROP INDEX IF EXISTS idx_webhook_logs_payment_id",
      "DROP INDEX IF EXISTS idx_payment_events_created_at",
      "DROP INDEX IF EXISTS idx_payment_events_payment_id",
      "DROP INDEX IF EXISTS idx_payments_expires_at",
      "DROP INDEX IF EXISTS idx_payments_created_at",
      "DROP INDEX IF EXISTS idx_payments_status",
      "DROP INDEX IF EXISTS idx_payments_payment_id",
    ],
  },
  {
    version: 3,
    name: "add_performance_optimizations",
    up: [
      // Add PRAGMA optimizations
      "PRAGMA journal_mode = WAL",
      "PRAGMA synchronous = NORMAL",
      "PRAGMA cache_size = -64000", // 64MB cache
      "PRAGMA temp_store = MEMORY",
      "PRAGMA mmap_size = 268435456", // 256MB mmap
      // Add compound indexes for better query performance
      "CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments (status, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_payments_chain_status ON payments (chain, status)",
    ],
    down: [
      "DROP INDEX IF EXISTS idx_payments_chain_status",
      "DROP INDEX IF EXISTS idx_payments_status_created",
      "PRAGMA journal_mode = DELETE",
      "PRAGMA synchronous = FULL",
      "PRAGMA cache_size = -2000",
      "PRAGMA temp_store = DEFAULT",
      "PRAGMA mmap_size = 0",
    ],
  },
];

export class MigrationRunner {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  private async run(sql: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (params) {
        this.db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve(this);
        });
      } else {
        this.db.run(sql, function (err) {
          if (err) reject(err);
          else resolve(this);
        });
      }
    });
  }

  private async get(sql: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (params) {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      } else {
        this.db.get(sql, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }
    });
  }

  private async all(sql: string, params?: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (params) {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.db.all(sql, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }
    });
  }

  async getCurrentVersion(): Promise<number> {
    try {
      // Check if migrations table exists
      const table = await this.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='schema_migrations'
      `);

      if (!table) {
        return 0;
      }

      // Get the latest applied migration
      const latest = await this.get(`
        SELECT MAX(version) as version FROM schema_migrations
      `);

      return latest?.version || 0;
    } catch (error) {
      logError("Failed to get current migration version", error);
      return 0;
    }
  }

  async getTargetVersion(): Promise<number> {
    return Math.max(...migrations.map((m) => m.version));
  }

  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = await this.getTargetVersion();

    if (currentVersion === targetVersion) {
      logInfo(`Database is up to date (version ${currentVersion})`);
      return;
    }

    logInfo(
      `Migrating database from version ${currentVersion} to ${targetVersion}`
    );

    // Apply pending migrations
    const pendingMigrations = migrations.filter(
      (m) => m.version > currentVersion
    );

    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    logInfo(`Database migration completed successfully`);
  }

  private async applyMigration(migration: Migration): Promise<void> {
    logInfo(`Applying migration ${migration.version}: ${migration.name}`);

    try {
      // Begin transaction
      await this.run("BEGIN TRANSACTION");

      // Apply each SQL statement
      for (const sql of migration.up) {
        await this.run(sql);
      }

      // Record migration
      await this.run(
        "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
        [migration.version, migration.name]
      );

      // Commit transaction
      await this.run("COMMIT");

      logInfo(`Migration ${migration.version} applied successfully`);
    } catch (error) {
      logError(`Migration ${migration.version} failed`, error);

      try {
        await this.run("ROLLBACK");
      } catch (rollbackError) {
        logError("Failed to rollback transaction", rollbackError);
      }

      throw error;
    }
  }

  async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      logInfo(
        `No rollback needed (current: ${currentVersion}, target: ${targetVersion})`
      );
      return;
    }

    logInfo(
      `Rolling back database from version ${currentVersion} to ${targetVersion}`
    );

    // Find migrations to rollback (in reverse order)
    const migrationsToRollback = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    logInfo(`Database rollback completed successfully`);
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    logInfo(`Rolling back migration ${migration.version}: ${migration.name}`);

    try {
      // Begin transaction
      await this.run("BEGIN TRANSACTION");

      // Apply rollback statements
      for (const sql of migration.down) {
        await this.run(sql);
      }

      // Remove migration record
      await this.run("DELETE FROM schema_migrations WHERE version = ?", [
        migration.version,
      ]);

      // Commit transaction
      await this.run("COMMIT");

      logInfo(`Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      logError(`Rollback of migration ${migration.version} failed`, error);

      try {
        await this.run("ROLLBACK");
      } catch (rollbackError) {
        logError("Failed to rollback transaction", rollbackError);
      }

      throw error;
    }
  }

  async getMigrationHistory(): Promise<
    Array<{ version: number; name: string; applied_at: string }>
  > {
    try {
      return await this.all(`
        SELECT version, name, applied_at
        FROM schema_migrations
        ORDER BY version ASC
      `);
    } catch (error) {
      logError("Failed to get migration history", error);
      return [];
    }
  }
}
