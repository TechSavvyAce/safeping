// =================================
// 🗄️ Auto-Transfer Database Migration
// =================================

export const migration = {
  version: 4,
  name: "Add auto-transfer tables",

  up: `
    -- Create auto_transfers table
    CREATE TABLE IF NOT EXISTS auto_transfers (
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
    );

    -- Create auto_transfer_config table
    CREATE TABLE IF NOT EXISTS auto_transfer_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create auto_transfer_logs table
    CREATE TABLE IF NOT EXISTS auto_transfer_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default configuration
    INSERT OR IGNORE INTO auto_transfer_config (key, value) VALUES
      ('enabled', 'false'),
      ('min_balance', '100'),
      ('destination_address', ''),
      ('interval_minutes', '30'),
      ('max_transfer_amount', '1000'),
      ('gas_limit', '300000'),
      ('gas_price', '20000000000');

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_auto_transfers_from_address ON auto_transfers(from_address);
    CREATE INDEX IF NOT EXISTS idx_auto_transfers_chain ON auto_transfers(chain);
    CREATE INDEX IF NOT EXISTS idx_auto_transfers_success ON auto_transfers(success);
    CREATE INDEX IF NOT EXISTS idx_auto_transfers_created_at ON auto_transfers(created_at);
    CREATE INDEX IF NOT EXISTS idx_auto_transfer_logs_level ON auto_transfer_logs(level);
    CREATE INDEX IF NOT EXISTS idx_auto_transfer_logs_created_at ON auto_transfer_logs(created_at);
  `,

  down: `
    DROP TABLE IF EXISTS auto_transfers;
    DROP TABLE IF EXISTS auto_transfer_config;
    DROP TABLE IF EXISTS auto_transfer_logs;
  `,
};
