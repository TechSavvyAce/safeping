#!/usr/bin/env node

// =================================
// 🗄️ Database Management Script
// =================================

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Import from the compiled JavaScript (this assumes the project is built)
let MigrationRunner, logInfo, logError;

// Try to use the production build first
let hasProductionBuild = false;

try {
  const migrations = require("../.next/standalone/src/lib/migrations.js");
  const logger = require("../.next/standalone/src/lib/logger.js");

  MigrationRunner = migrations.MigrationRunner;
  logInfo = logger.logInfo;
  logError = logger.logError;
  hasProductionBuild = true;
} catch (error) {
  // Try server build
  try {
    const migrations = require("../.next/server/src/lib/migrations.js");
    const logger = require("../.next/server/src/lib/logger.js");

    MigrationRunner = migrations.MigrationRunner;
    logInfo = logger.logInfo;
    logError = logger.logError;
    hasProductionBuild = true;
  } catch (serverError) {
    // Use fallback with simplified migration system
    console.log("Using direct migration implementation...");

    logInfo = (msg, data) =>
      // Silent handling for production
    logError = (msg, data) =>
      // Silent error handling for production

    // Simplified migration runner for development
    MigrationRunner = class {
      constructor(db) {
        this.db = db;
      }

      async run(sql, params) {
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

      async get(sql, params) {
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

      async migrate() {
        logInfo("Running basic database initialization...");

        // Create schema_migrations table
        await this.run(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create main tables
        await this.run(`
          CREATE TABLE IF NOT EXISTS payments (
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
          )
        `);

        await this.run(`
          CREATE TABLE IF NOT EXISTS payment_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
          )
        `);

        await this.run(`
          CREATE TABLE IF NOT EXISTS webhook_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id TEXT NOT NULL,
            webhook_url TEXT NOT NULL,
            payload TEXT NOT NULL,
            response_status INTEGER,
            response_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
          )
        `);

        // Create indexes
        await this.run(
          "CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments (payment_id)"
        );
        await this.run(
          "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)"
        );
        await this.run(
          "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at)"
        );

        logInfo("Database initialization completed");
      }

      async getCurrentVersion() {
        try {
          const table = await this.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='schema_migrations'
          `);

          if (!table) return 0;

          const latest = await this.get(`
            SELECT MAX(version) as version FROM schema_migrations
          `);

          return latest?.version || 0;
        } catch (error) {
          return 0;
        }
      }

      async getTargetVersion() {
        return 3; // Latest migration version
      }

      async getMigrationHistory() {
        try {
          const { all } = require("util").promisify(this.db.all.bind(this.db));
          return await all(`
            SELECT version, name, applied_at
            FROM schema_migrations
            ORDER BY version ASC
          `);
        } catch (error) {
          return [];
        }
      }

      async rollback(targetVersion) {
        logInfo(
          `Rollback to version ${targetVersion} not implemented in fallback mode`
        );
        throw new Error("Rollback requires full build");
      }
    };
  }
}

async function openDatabase() {
  const dbPath =
    process.env.DATABASE_URL || path.join(process.cwd(), "data", "payments.db");
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  const fs = require("fs");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

async function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function runMigrations() {
  logInfo("Starting database migrations...");

  const db = await openDatabase();
  const migrationRunner = new MigrationRunner(db);

  try {
    await migrationRunner.migrate();
    logInfo("Database migrations completed successfully");
  } catch (error) {
    logError("Migration failed", error);
    throw error;
  } finally {
    await closeDatabase(db);
  }
}

async function checkStatus() {
  logInfo("Checking database status...");

  const db = await openDatabase();
  const migrationRunner = new MigrationRunner(db);

  try {
    const currentVersion = await migrationRunner.getCurrentVersion();
    const targetVersion = await migrationRunner.getTargetVersion();
    const history = await migrationRunner.getMigrationHistory();

    console.log("\n📊 Database Status:");
    console.log(`   Current Version: ${currentVersion}`);
    console.log(`   Target Version: ${targetVersion}`);
    console.log(
      `   Status: ${
        currentVersion === targetVersion
          ? "✅ Up to date"
          : "⚠️  Migrations pending"
      }`
    );

    if (history.length > 0) {
      console.log("\n📋 Migration History:");
      history.forEach((migration) => {
        console.log(
          `   v${migration.version}: ${migration.name} (${migration.applied_at})`
        );
      });
    }
  } catch (error) {
    logError("Status check failed", error);
    throw error;
  } finally {
    await closeDatabase(db);
  }
}

async function rollbackDatabase(targetVersion) {
  logInfo(`Rolling back database to version ${targetVersion}...`);

  const db = await openDatabase();
  const migrationRunner = new MigrationRunner(db);

  try {
    await migrationRunner.rollback(targetVersion);
    logInfo("Database rollback completed successfully");
  } catch (error) {
    logError("Rollback failed", error);
    throw error;
  } finally {
    await closeDatabase(db);
  }
}

async function resetDatabase() {
  logInfo("Resetting database...");

  const dbPath =
    process.env.DATABASE_URL || path.join(process.cwd(), "data", "payments.db");
  const fs = require("fs");

  // Remove database file
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    logInfo("Database file removed");
  }

  // Run migrations to recreate
  await runMigrations();
  logInfo("Database reset completed");
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case "migrate":
        await runMigrations();
        break;

      case "status":
        await checkStatus();
        break;

      case "rollback":
        if (!arg) {
          console.error("Error: Please specify target version for rollback");
          console.log("Usage: node scripts/db.js rollback <version>");
          process.exit(1);
        }
        await rollbackDatabase(parseInt(arg));
        break;

      case "reset":
        console.log("⚠️  WARNING: This will delete all data in the database!");
        console.log('Type "yes" to confirm:');

        const readline = require("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question("Confirm reset: ", async (answer) => {
          if (answer.toLowerCase() === "yes") {
            await resetDatabase();
          } else {
            console.log("Reset cancelled");
          }
          rl.close();
        });
        break;

      default:
        console.log("Database Management Tool");
        console.log("");
        console.log("Usage:");
        console.log(
          "  node scripts/db.js migrate          - Run pending migrations"
        );
        console.log(
          "  node scripts/db.js status           - Check migration status"
        );
        console.log(
          "  node scripts/db.js rollback <ver>   - Rollback to version"
        );
        console.log(
          "  node scripts/db.js reset            - Reset database (DANGER)"
        );
        console.log("");
        console.log("Environment Variables:");
        console.log("  DATABASE_URL - Path to SQLite database file");
        console.log("");
        break;
    }
  } catch (error) {
    logError("Command failed", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runMigrations,
  checkStatus,
  rollbackDatabase,
  resetDatabase,
};
