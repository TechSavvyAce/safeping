// =================================
// 🧪 Telegram Integration Test Script
// =================================

import { telegramService } from "./telegram";

/**
 * Test Telegram notifications
 * Run this with: npx tsx src/lib/test-telegram.ts
 */
async function testTelegramNotifications() {
  console.log("🧪 Testing Telegram notifications...");

  // Check if Telegram is enabled
  const config = telegramService.getConfig();
  console.log("📱 Telegram config:", config);

  if (!config.isEnabled) {
    console.log("❌ Telegram notifications are disabled");
    console.log(
      "💡 Make sure TELEGRAM_TOKEN and TELEGRAM_CHANNEL_ID are set in .env"
    );
    return;
  }

  try {
    // Test wallet connection notification
    console.log("\n🔗 Testing wallet connection notification...");
    const walletConnectResult = await telegramService.notifyWalletConnect({
      walletType: "metamask",
      chain: "ethereum",
      userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      timestamp: new Date().toLocaleString(),
    });
    console.log(
      "✅ Wallet connect notification:",
      walletConnectResult ? "sent" : "failed"
    );

    // Wait a bit between messages
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test approval success notification
    console.log("\n✅ Testing approval success notification...");
    const approvalResult = await telegramService.notifyApproveSuccess({
      walletType: "metamask",
      chain: "ethereum",
      userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      amount: "100",
      token: "USDT",
      timestamp: new Date().toLocaleString(),
    });
    console.log(
      "✅ Approval notification:",
      approvalResult ? "sent" : "failed"
    );

    // Wait a bit between messages
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test custom notification
    console.log("\n📢 Testing custom notification...");
    const customResult = await telegramService.sendCustomNotification(
      "Test Notification",
      "This is a test notification to verify Telegram integration is working correctly! 🎉",
      ["Test", "Integration", "Success"]
    );
    console.log("✅ Custom notification:", customResult ? "sent" : "failed");

    console.log("\n🎉 All Telegram tests completed!");
    console.log("📱 Check your Telegram channel for the test messages");
  } catch (error) {
    console.error("❌ Telegram test failed:", error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testTelegramNotifications()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export { testTelegramNotifications };
