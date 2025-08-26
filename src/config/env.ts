// =================================
// 🔧 Environment Configuration
// =================================

import { z } from "zod";

const envSchema = z.object({
  // App Configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().default("sqlite:./data/payments.db"),

  // Network Mode
  NEXT_PUBLIC_NETWORK_MODE: z.enum(["mainnet", "testnet"]).default("testnet"),

  // WalletConnect
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),

  // Telegram Bot
  NEXT_PUBLIC_TELEGRAM_TOKEN: z.string().optional(),
  NEXT_PUBLIC_TELEGRAM_CHANNEL_ID: z.string().optional(),

  // Webhook
  WEBHOOK_SECRET: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default("900000"),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100"),

  // Blockchain API Keys
  ETHERSCAN_API_KEY: z.string().optional(),
  BSCSCAN_API_KEY: z.string().optional(),
  TRONGRID_API_KEY: z.string().optional(),

  // Admin Configuration
  ADMIN_SECRET_KEY: z.string().optional(),
  ADMIN_WALLET_ADDRESS: z.string().optional(),
  ADMIN_PRIVATE_KEY: z.string().optional(),

  // Security
  JWT_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
});

// Parse and validate environment variables
const envParseResult = envSchema.safeParse(process.env);

if (!envParseResult.success) {
  console.error(
    "❌ Environment validation failed:",
    envParseResult.error.format()
  );
  throw new Error("Invalid environment configuration");
}

export const env = envParseResult.data;

// Helper function to get environment variable with fallback
export function getEnvVar(key: keyof typeof env, fallback?: string): string {
  const value = env[key];
  if (typeof value === "string" && value) {
    return value;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error(`Environment variable ${key} is required`);
}

// Helper function to check if feature is enabled
export function isFeatureEnabled(feature: keyof typeof env): boolean {
  const value = env[feature];
  return value === "true" || value === "1";
}

// Export validated environment variables
export default env;
