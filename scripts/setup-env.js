#!/usr/bin/env node

// =================================
// 🔧 Environment Setup Script
// =================================

const fs = require("fs");
const path = require("path");

console.log(
  "🚀 Setting up environment variables for Crypto Payment Platform...\n"
);

// Check if .env.local already exists
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  console.log("⚠️  .env.local already exists. Skipping setup.");
  console.log(
    "   If you want to reconfigure, please delete .env.local and run this script again.\n"
  );
  process.exit(0);
}

// Read the example file
const envExamplePath = path.join(process.cwd(), "env.example");
if (!fs.existsSync(envExamplePath)) {
  console.error(
    "❌ env.example not found. Please ensure you have the correct project structure."
  );
  process.exit(1);
}

const envExample = fs.readFileSync(envExamplePath, "utf8");

// Create .env.local with the example content
try {
  fs.writeFileSync(envLocalPath, envExample);
  console.log("✅ Created .env.local file with default values");
  console.log("📝 Please update the following important variables:");
  console.log("");
  console.log("   🔑 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  console.log("      Get this from: https://cloud.walletconnect.com/");
  console.log("      This is required for WalletConnect functionality");
  console.log("");
  console.log("   🔑 NEXT_PUBLIC_BASE_URL");
  console.log("      Set to your domain in production");
  console.log("");
  console.log("   🔑 DATABASE_URL");
  console.log("      Set to your database connection string");
  console.log("");
  console.log("   🔑 JWT_SECRET and ENCRYPTION_KEY");
  console.log("      Generate secure random strings for these");
  console.log("");
  console.log("📖 See env.example for all available options");
  console.log("");
  console.log("🚀 After updating .env.local, restart your development server");
  console.log("   npm run dev");
} catch (error) {
  console.error("❌ Failed to create .env.local:", error.message);
  process.exit(1);
}
