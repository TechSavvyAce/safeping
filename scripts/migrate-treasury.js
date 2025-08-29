const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(process.cwd(), 'data', 'payments.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

console.log('🔄 Running treasury wallets migration...');

// Migration SQL
const migrationSQL = [
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
];

// Run migration
db.serialize(() => {
  // Begin transaction
  db.run('BEGIN TRANSACTION');
  
  // Execute migration statements
  migrationSQL.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        console.error(`❌ Migration statement ${index + 1} failed:`, err.message);
        db.run('ROLLBACK');
        process.exit(1);
      } else {
        console.log(`✅ Migration statement ${index + 1} executed successfully`);
      }
    });
  });
  
  // Commit transaction
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('❌ Failed to commit migration:', err.message);
      process.exit(1);
    } else {
      console.log('✅ Treasury wallets migration completed successfully!');
      
      // Insert default treasury wallets if they don't exist
      const defaultWallets = [
        {
          chain: 'ethereum',
          address: process.env.TREASURY_ADDRESS || '',
          name: 'Ethereum Treasury',
          description: 'Default Ethereum treasury wallet'
        },
        {
          chain: 'bsc',
          address: process.env.BSC_TREASURY_ADDRESS || '',
          name: 'BSC Treasury',
          description: 'Default BSC treasury wallet'
        },
        {
          chain: 'tron',
          address: process.env.TRON_TREASURY_ADDRESS || '',
          name: 'TRON Treasury',
          description: 'Default TRON treasury wallet'
        }
      ];
      
      defaultWallets.forEach(wallet => {
        if (wallet.address) {
          db.run(`
            INSERT OR IGNORE INTO treasury_wallets (chain, address, name, description, is_active) 
            VALUES (?, ?, ?, ?, 1)
          `, [wallet.chain, wallet.address, wallet.name, wallet.description], (err) => {
            if (err) {
              console.error(`❌ Failed to insert default ${wallet.chain} wallet:`, err.message);
            } else {
              console.log(`✅ Default ${wallet.chain} treasury wallet inserted`);
            }
          });
        } else {
          console.log(`⚠️  No ${wallet.chain} treasury address found in environment variables`);
        }
      });
      
      // Close database
      db.close((err) => {
        if (err) {
          console.error('❌ Failed to close database:', err.message);
        } else {
          console.log('✅ Database connection closed');
        }
      });
    }
  });
});
