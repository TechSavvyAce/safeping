// =================================
// 🔄 Reset and Populate Treasury Wallets Script
// =================================

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database path
const dbPath = path.join(process.cwd(), "data", "payments.db");

console.log("🔄 Resetting and populating treasury wallets...");

// Open database
const db = new sqlite3.Database(dbPath);

// Clear existing treasury wallets
const clearWallets = () => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM treasury_wallets", function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
};

// Default treasury wallet data
const defaultWallets = [
  {
    chain: "ethereum",
    address:
      process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
      "0x0000000000000000000000000000000000000000",
    name: "Ethereum Treasury",
    description: "Default Ethereum treasury wallet",
  },
  {
    chain: "bsc",
    address:
      process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
      "0x0000000000000000000000000000000000000000",
    name: "BSC Treasury",
    description: "Default BSC treasury wallet",
  },
  {
    chain: "tron",
    address:
      process.env.NEXT_PUBLIC_TRON_TREASURY_ADDRESS ||
      "T0000000000000000000000000000000000000000",
    name: "TRON Treasury",
    description: "Default TRON treasury wallet",
  },
];

// Insert default wallets
const insertWallet = (wallet) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO treasury_wallets (chain, address, name, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    db.run(
      sql,
      [wallet.chain, wallet.address, wallet.name, wallet.description],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

// Reset and populate wallets
async function resetAndPopulateWallets() {
  try {
    console.log("🗑️ Clearing existing treasury wallets...");
    const deletedCount = await clearWallets();
    console.log(`✅ Deleted ${deletedCount} existing wallets`);

    console.log("📝 Inserting new treasury wallets...");

    for (const wallet of defaultWallets) {
      const id = await insertWallet(wallet);
      console.log(
        `✅ Inserted ${wallet.chain} wallet: ${wallet.address} (ID: ${id})`
      );
    }

    console.log("\n🎉 Treasury wallets reset and populated successfully!");

    // Verify the data
    db.all("SELECT * FROM treasury_wallets", (err, wallets) => {
      if (err) {
        console.error("❌ Error reading treasury_wallets:", err);
      } else {
        console.log("\n📋 Current treasury wallets:");
        wallets.forEach((wallet) => {
          console.log(
            `  - ${wallet.chain}: ${wallet.address} (${wallet.name})`
          );
        });
      }
      db.close();
    });
  } catch (error) {
    console.error("❌ Error resetting treasury wallets:", error);
    db.close();
  }
}

// Run the reset and population
resetAndPopulateWallets();
