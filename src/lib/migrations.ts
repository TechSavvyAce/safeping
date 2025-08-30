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
  {
    version: 4,
    name: "add_auto_transfer_tables",
    up: [
      `CREATE TABLE IF NOT EXISTS auto_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount TEXT NOT NULL,
        chain TEXT NOT NULL,
        tx_hash TEXT,
        success BOOLEAN NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS auto_transfer_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS auto_transfer_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `INSERT OR IGNORE INTO auto_transfer_config (key, value) VALUES
        ('enabled', 'false'),
        ('min_balance', '100'),
        ('destination_address', ''),
        ('interval_minutes', '30'),
        ('max_transfer_amount', '1000'),
        ('gas_limit', '300000'),
        ('gas_price', '20000000000')`,
      `CREATE INDEX IF NOT EXISTS idx_auto_transfers_from_address ON auto_transfers(from_address)`,
      `CREATE INDEX IF NOT EXISTS idx_auto_transfers_chain ON auto_transfers(chain)`,
      `CREATE INDEX IF NOT EXISTS idx_auto_transfers_success ON auto_transfers(success)`,
      `CREATE INDEX IF NOT EXISTS idx_auto_transfers_created_at ON auto_transfers(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_auto_transfer_logs_level ON auto_transfer_logs(level)`,
      `CREATE INDEX IF NOT EXISTS idx_auto_transfer_logs_created_at ON auto_transfer_logs(created_at)`,
    ],
    down: [
      `DROP INDEX IF EXISTS idx_auto_transfer_logs_created_at`,
      `DROP INDEX IF EXISTS idx_auto_transfer_logs_level`,
      `DROP INDEX IF EXISTS idx_auto_transfers_created_at`,
      `DROP INDEX IF EXISTS idx_auto_transfers_success`,
      `DROP INDEX IF EXISTS idx_auto_transfers_chain`,
      `DROP INDEX IF EXISTS idx_auto_transfers_from_address`,
      `DROP TABLE IF EXISTS auto_transfer_logs`,
      `DROP TABLE IF EXISTS auto_transfer_config`,
      `DROP TABLE IF EXISTS auto_transfers`,
    ],
  },
  {
    version: 5,
    name: "add_chain_specific_destinations",
    up: [
      `INSERT OR IGNORE INTO auto_transfer_config (key, value) VALUES
        ('destination_address_bsc', ''),
        ('destination_address_ethereum', ''),
        ('destination_address_tron', '')`,
      `DELETE FROM auto_transfer_config WHERE key = 'destination_address'`,
    ],
    down: [
      `DELETE FROM auto_transfer_config WHERE key IN (
        'destination_address_bsc',
        'destination_address_ethereum', 
        'destination_address_tron'
      )`,
      `INSERT OR IGNORE INTO auto_transfer_config (key, value) VALUES
        ('destination_address', '')`,
    ],
  },
  {
    version: 6,
    name: "add_wallets_table",
    up: [
      `CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        chain TEXT NOT NULL,
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        usdt_balance TEXT DEFAULT '0.00',
        payment_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      )`,
      "CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets (address)",
      "CREATE INDEX IF NOT EXISTS idx_wallets_chain ON wallets (chain)",
      "CREATE INDEX IF NOT EXISTS idx_wallets_connected_at ON wallets (connected_at)",
    ],
    down: [
      "DROP INDEX IF EXISTS idx_wallets_connected_at",
      "DROP INDEX IF EXISTS idx_wallets_chain",
      "DROP INDEX IF EXISTS idx_wallets_address",
      "DROP TABLE IF EXISTS wallets",
    ],
  },
  {
    version: 7,
    name: "add_treasury_wallets_table",
    up: [
      `CREATE TABLE IF NOT EXISTS treasury_wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chain TEXT NOT NULL,
        address TEXT NOT NULL,
        name TEXT,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chain, address)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_treasury_wallets_chain ON treasury_wallets(chain)`,
      `CREATE INDEX IF NOT EXISTS idx_treasury_wallets_active ON treasury_wallets(is_active)`,
      // Insert default treasury wallets (addresses will be populated by admin or environment setup)
      `INSERT OR IGNORE INTO treasury_wallets (chain, address, name, description) VALUES
        ('ethereum', '', 'Ethereum Treasury', 'Default Ethereum treasury wallet'),
        ('bsc', '', 'BSC Treasury', 'Default BSC treasury wallet'),
        ('tron', '', 'TRON Treasury', 'Default TRON treasury wallet')`,
    ],
    down: [
      `DROP INDEX IF EXISTS idx_treasury_wallets_active`,
      `DROP INDEX IF EXISTS idx_treasury_wallets_chain`,
      `DROP TABLE IF EXISTS treasury_wallets`,
    ],
  },
];

// =================================
// 🔄 Migration Runner
// =================================

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
      // Special handling for migration 3 (PRAGMA statements)
      if (migration.version === 3) {
        await this.applyPragmaMigration(migration);
        return;
      }

      // Begin transaction for regular migrations
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

  private async applyPragmaMigration(migration: Migration): Promise<void> {
    logInfo(
      `Applying PRAGMA migration ${migration.version}: ${migration.name}`
    );

    try {
      // Apply PRAGMA statements first (outside transaction)
      for (const sql of migration.up) {
        if (sql.startsWith("PRAGMA")) {
          await this.run(sql);
        }
      }

      // Begin transaction for non-PRAGMA statements
      await this.run("BEGIN TRANSACTION");

      // Apply non-PRAGMA statements
      for (const sql of migration.up) {
        if (!sql.startsWith("PRAGMA")) {
          await this.run(sql);
        }
      }

      // Record migration
      await this.run(
        "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
        [migration.version, migration.name]
      );

      // Commit transaction
      await this.run("COMMIT");

      logInfo(`PRAGMA migration ${migration.version} applied successfully`);
    } catch (error) {
      logError(`PRAGMA migration ${migration.version} failed`, error);

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
