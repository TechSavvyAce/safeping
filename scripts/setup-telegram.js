#!/usr/bin/env node

// =================================
// 📱 Telegram Setup Helper Script
// =================================

const fs = require("fs");
const path = require("path");

console.log("📱 Telegram Bot Notification Setup");
console.log("==================================\n");

// Check if .env file exists
const envPath = path.join(process.cwd(), ".env");
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log("✅ Found existing .env file");
} else {
  console.log("📝 Creating new .env file...");
}

// Read existing .env content
let envContent = "";
if (envExists) {
  envContent = fs.readFileSync(envPath, "utf8");
}

// Check if Telegram config already exists
const hasTelegramToken = envContent.includes("TELEGRAM_TOKEN=");
const hasTelegramChannel = envContent.includes("TELEGRAM_CHANNEL_ID=");

if (hasTelegramToken && hasTelegramChannel) {
  console.log("✅ Telegram configuration already exists in .env");
  console.log("\n📱 Current Telegram config:");

  const tokenMatch = envContent.match(/TELEGRAM_TOKEN=(.+)/);
  const channelMatch = envContent.match(/TELEGRAM_CHANNEL_ID=(.+)/);

  if (tokenMatch) {
    const token = tokenMatch[1];
    const maskedToken =
      token.length > 10 ? `${token.substring(0, 10)}...` : "***";
    console.log(`   Token: ${maskedToken}`);
  }

  if (channelMatch) {
    console.log(`   Channel ID: ${channelMatch[1]}`);
  }

  console.log(
    "\n💡 To update, edit your .env file manually or delete the existing lines and run this script again."
  );
  process.exit(0);
}

console.log("🔧 Setting up Telegram configuration...\n");

// Get user input
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupTelegram() {
  try {
    console.log("📋 Please provide the following information:\n");

    // Get bot token
    const token = await askQuestion("🤖 Enter your Telegram bot token: ");
    if (!token || token.trim() === "") {
      console.log("❌ Bot token is required");
      rl.close();
      return;
    }

    // Get channel ID
    const channelId = await askQuestion(
      "📢 Enter your Telegram channel ID (e.g., -1002940840996): "
    );
    if (!channelId || channelId.trim() === "") {
      console.log("❌ Channel ID is required");
      rl.close();
      return;
    }

    // Validate channel ID format
    if (!channelId.startsWith("-100")) {
      console.log("⚠️  Warning: Channel ID should typically start with -100");
      console.log("   If you're sure about this ID, we'll proceed anyway.\n");
    }

    // Prepare new environment variables
    const telegramConfig = `# Telegram Bot Configuration
TELEGRAM_TOKEN=${token.trim()}
TELEGRAM_CHANNEL_ID=${channelId.trim()}`;

    // Add to .env file
    let newEnvContent = envContent;
    if (newEnvContent && !newEnvContent.endsWith("\n")) {
      newEnvContent += "\n";
    }
    newEnvContent += "\n" + telegramConfig;

    // Write to .env file
    fs.writeFileSync(envPath, newEnvContent);

    console.log("\n✅ Telegram configuration added to .env file!");
    console.log("\n📱 Configuration summary:");
    console.log(`   Bot Token: ${token.substring(0, 10)}...`);
    console.log(`   Channel ID: ${channelId}`);

    console.log("\n🚀 Next steps:");
    console.log("   1. Restart your development server");
    console.log(
      "   2. Test the integration with: npx tsx src/lib/test-telegram.ts"
    );
    console.log("   3. Try connecting a wallet to see notifications");

    console.log("\n📚 For more information, see TELEGRAM_SETUP.md");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  } finally {
    rl.close();
  }
}

// Run setup
setupTelegram();
