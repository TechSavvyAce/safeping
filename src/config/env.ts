// =================================
// 🔧 Environment Configuration
// =================================

// Helper function to determine base URL based on environment
function getBaseUrl(): string {
  // If explicitly set, use that
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // Auto-detect based on environment
  if (process.env.NODE_ENV === "production") {
    // In production, try to get from Vercel or other hosting platform
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Default production fallback
    return "https://www.safeping.xyz";
  }

  // Development default
  return "http://localhost:3000";
}

// Environment variables with defaults
export const env = {
  // App configuration
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Crypto Payment Platform",
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  BASE_URL: getBaseUrl(),

  // Network mode
  NETWORK_MODE: process.env.NEXT_PUBLIC_NETWORK_MODE || "testnet",

  // Database
  DATABASE_URL: process.env.DATABASE_URL || "./data/payments.db",

  // Payment limits
  PAYMENT_EXPIRY_MINUTES: parseInt(process.env.PAYMENT_EXPIRY_MINUTES || "30"),
  MAX_PAYMENT_AMOUNT: parseInt(process.env.MAX_PAYMENT_AMOUNT || "10000"),
  MIN_PAYMENT_AMOUNT: parseInt(process.env.MIN_PAYMENT_AMOUNT || "1"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || "100"
  ),

  // WalletConnect
  WALLETCONNECT_PROJECT_ID:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    "eafad09429e587ca37ab547047bdfe3a",

  // Admin credentials
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",

  // Blockchain RPC URLs
  BSC_RPC_URL:
    process.env.BSC_RPC_URL || "https://bsc-testnet.public.blastapi.io",
  ETHEREUM_RPC_URL:
    process.env.ETHEREUM_RPC_URL || "https://eth-sepolia.public.blastapi.io",
  TRON_RPC_URL: process.env.TRON_RPC_URL || "https://api.shasta.trongrid.io",

  // Contract addresses
  BSC_PAYMENT_PROCESSOR_TESTNET:
    process.env.BSC_PAYMENT_PROCESSOR_TESTNET || "",
  ETHEREUM_PAYMENT_PROCESSOR_TESTNET:
    process.env.ETHEREUM_PAYMENT_PROCESSOR_TESTNET || "",
  TRON_PAYMENT_PROCESSOR_TESTNET:
    process.env.TRON_PAYMENT_PROCESSOR_TESTNET || "",

  // Telegram (optional)
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

  // Webhook (optional)
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "",

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING === "true",
};

// Helper functions
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTestnet = env.NETWORK_MODE === "testnet";
export const isMainnet = env.NETWORK_MODE === "mainnet";

// Validation
export function validateEnvironment() {
  const required = [
    "WALLETCONNECT_PROJECT_ID",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD",
  ];

  const missing = required.filter((key) => !env[key as keyof typeof env]);

  if (missing.length > 0) {
    console.warn("⚠️ Missing environment variables:", missing);
    console.warn("💡 Please check your .env.local file");
  }

  return missing.length === 0;
}

// Export for use in other files
export default env;
