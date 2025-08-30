// =================================
// 🔍 Payment Details Checker Script
// =================================

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database file path
const dbPath = path.join(__dirname, "..", "data", "payments.db");

// Payment ID to check
const PAYMENT_ID = "3ae74d82-8a77-4735-b2d9-0d43530deaba";

// Connect to database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to database successfully");
});

// Helper function to run queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Main function to check payment details
async function checkPaymentDetails() {
  try {
    console.log("\n🔍 Checking Payment Details for ID:", PAYMENT_ID);
    console.log("=".repeat(60));

    // 1. Check main payment record
    console.log("\n📋 1. MAIN PAYMENT RECORD:");
    console.log("-".repeat(40));
    const payment = await runQuery(
      "SELECT * FROM payments WHERE payment_id = ?",
      [PAYMENT_ID]
    );

    if (payment.length === 0) {
      console.log("❌ Payment not found in database");
      return;
    }

    const paymentData = payment[0];
    console.log("Payment ID:", paymentData.payment_id);
    console.log("Service Name:", paymentData.service_name);
    console.log("Description:", paymentData.description);
    console.log("Amount:", paymentData.amount);
    console.log("Chain:", paymentData.chain);
    console.log("Status:", paymentData.status);
    console.log("Wallet Address:", paymentData.wallet_address || "Not set");
    console.log("Transaction Hash:", paymentData.tx_hash || "Not set");
    console.log("Webhook URL:", paymentData.webhook_url || "Not set");
    console.log("Language:", paymentData.language || "Not set");
    console.log("Created At:", paymentData.created_at);
    console.log("Updated At:", paymentData.updated_at);
    console.log("Expires At:", paymentData.expires_at);

    // 2. Check payment events
    console.log("\n📊 2. PAYMENT EVENTS:");
    console.log("-".repeat(40));
    const events = await runQuery(
      "SELECT * FROM payment_events WHERE payment_id = ? ORDER BY created_at ASC",
      [PAYMENT_ID]
    );

    if (events.length === 0) {
      console.log("No events recorded for this payment");
    } else {
      events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.event_type} at ${event.created_at}`);
        if (event.data) {
          console.log(`   Data: ${event.data}`);
        }
      });
    }

    // 3. Check webhook logs
    console.log("\n🌐 3. WEBHOOK LOGS:");
    console.log("-".repeat(40));
    const webhooks = await runQuery(
      "SELECT * FROM webhook_logs WHERE payment_id = ? ORDER BY created_at ASC",
      [PAYMENT_ID]
    );

    if (webhooks.length === 0) {
      console.log("No webhook logs for this payment");
    } else {
      webhooks.forEach((webhook, index) => {
        console.log(`${index + 1}. Webhook to: ${webhook.webhook_url}`);
        console.log(`   Status: ${webhook.response_status || "No response"}`);
        console.log(`   Sent at: ${webhook.created_at}`);
        if (webhook.response_data) {
          console.log(`   Response: ${webhook.response_data}`);
        }
      });
    }

    // 4. Check if wallet is recorded
    if (paymentData.wallet_address) {
      console.log("\n💼 4. WALLET INFORMATION:");
      console.log("-".repeat(40));
      const wallet = await runQuery("SELECT * FROM wallets WHERE address = ?", [
        paymentData.wallet_address,
      ]);

      if (wallet.length === 0) {
        console.log("❌ Wallet not found in wallets table");
      } else {
        const walletData = wallet[0];
        console.log("Address:", walletData.address);
        console.log("Chain:", walletData.chain);
        console.log("Connected At:", walletData.connected_at);
        console.log("Last Activity:", walletData.last_activity);
        console.log("USDT Balance:", walletData.usdt_balance);
        console.log("Payment Count:", walletData.payment_count);
        console.log("Status:", walletData.status);
      }
    }

    // 5. Check auto-transfer records (if any)
    console.log("\n🔄 5. AUTO-TRANSFER RECORDS:");
    console.log("-".repeat(40));
    const transfers = await runQuery(
      "SELECT * FROM auto_transfers WHERE from_address = ? ORDER BY created_at ASC",
      [paymentData.wallet_address || ""]
    );

    if (transfers.length === 0) {
      console.log("No auto-transfer records for this wallet");
    } else {
      transfers.forEach((transfer, index) => {
        console.log(
          `${index + 1}. Transfer: ${transfer.amount} on ${transfer.chain}`
        );
        console.log(`   From: ${transfer.from_address}`);
        console.log(`   To: ${transfer.to_address}`);
        console.log(`   Success: ${transfer.success ? "Yes" : "No"}`);
        console.log(`   TX Hash: ${transfer.tx_hash || "Not set"}`);
        console.log(`   Created: ${transfer.created_at}`);
        if (transfer.error_message) {
          console.log(`   Error: ${transfer.error_message}`);
        }
      });
    }

    // 6. Summary
    console.log("\n📈 6. SUMMARY:");
    console.log("-".repeat(40));
    console.log("Payment Status:", paymentData.status);
    console.log("Has Wallet Address:", !!paymentData.wallet_address);
    console.log("Has Transaction Hash:", !!paymentData.tx_hash);
    console.log("Event Count:", events.length);
    console.log("Webhook Count:", webhooks.length);
    console.log("Auto-Transfer Count:", transfers.length);
  } catch (error) {
    console.error("❌ Error checking payment details:", error);
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error("❌ Error closing database:", err.message);
      } else {
        console.log("\n✅ Database connection closed");
      }
    });
  }
}

// Run the check
checkPaymentDetails();
