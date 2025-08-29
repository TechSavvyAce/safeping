const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(process.cwd(), "data", "payments.db");

async function markExpiredPayments() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    const sql = `
      UPDATE payments 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP
    `;

    db.run(sql, function (err) {
      if (err) {
        console.error("❌ Failed to mark expired payments:", err.message);
        reject(err);
      } else {
        const expiredCount = this.changes || 0;
        console.log(`✅ Marked ${expiredCount} payments as expired`);
        resolve(expiredCount);
      }
      db.close();
    });
  });
}

async function main() {
  try {
    console.log("🔄 Starting expired payments cleanup...");
    const expiredCount = await markExpiredPayments();
    console.log(
      `✅ Cleanup completed. ${expiredCount} payments marked as expired.`
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { markExpiredPayments };
