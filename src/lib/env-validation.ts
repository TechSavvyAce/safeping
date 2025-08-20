// =================================
// 🔧 Environment Variable Validation
// =================================

import { z } from "zod";

// Environment validation schema - Only includes variables actually used
const envSchema = z.object({
  // App configuration
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Crypto Payment Platform"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("1.0.0"),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

  // Network mode
  NEXT_PUBLIC_NETWORK_MODE: z.enum(["mainnet", "testnet"]).default("testnet"),

  // Database
  DATABASE_URL: z.string().default("./data/payments.db"),

  // Payment limits
  PAYMENT_EXPIRY_MINUTES: z.string().transform((val) => parseInt(val) || 30),
  MAX_PAYMENT_AMOUNT: z.string().transform((val) => parseInt(val) || 10000),
  MIN_PAYMENT_AMOUNT: z.string().transform((val) => parseInt(val) || 1),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val) || 900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val) || 100),

  // Blockchain contracts (testnet)
  BSC_PAYMENT_PROCESSOR_TESTNET: z.string().optional(),
  ETHEREUM_PAYMENT_PROCESSOR_TESTNET: z.string().optional(),
  TRON_PAYMENT_PROCESSOR_TESTNET: z.string().optional(),

  // Blockchain contracts (mainnet) - only required if using mainnet
  BSC_PAYMENT_PROCESSOR_MAINNET: z.string().optional(),
  ETHEREUM_PAYMENT_PROCESSOR_MAINNET: z.string().optional(),
  TRON_PAYMENT_PROCESSOR_MAINNET: z.string().optional(),

  // Treasury
  TREASURY_ADDRESS: z.string().optional(),

  // RPC URLs
  BSC_RPC_URL: z.string().url().optional(),
  ETHEREUM_RPC_URL: z.string().url().optional(),
  TRON_RPC_URL: z.string().url().optional(),

  // API Keys (for contract deployment scripts)
  BSC_API_KEY: z.string().optional(),
  ETHEREUM_API_KEY: z.string().optional(),

  // Contract deployment (for scripts only)
  PRIVATE_KEY: z.string().optional(),

  // Logging (optional)
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  ENABLE_REQUEST_LOGGING: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true"),
});

export type Environment = z.infer<typeof envSchema>;

let validatedEnv: Environment | null = null;

export function validateEnvironment(): Environment {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);

    // Additional validation for production
    if (validatedEnv.NODE_ENV === "production") {
      validateProductionRequirements(validatedEnv);
    }

    return validatedEnv;
  } catch (error) {
    console.error("❌ Environment validation failed:");

    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
    } else {
      console.error(error);
    }

    throw new Error("Environment validation failed");
  }
}

function validateProductionRequirements(env: Environment) {
  const errors: string[] = [];

  // Base URL requirement
  if (!env.NEXT_PUBLIC_BASE_URL) {
    errors.push("NEXT_PUBLIC_BASE_URL is required in production");
  }

  // Mainnet contract requirements
  if (env.NEXT_PUBLIC_NETWORK_MODE === "mainnet") {
    if (!env.BSC_PAYMENT_PROCESSOR_MAINNET) {
      errors.push("BSC_PAYMENT_PROCESSOR_MAINNET is required for mainnet mode");
    }

    if (!env.ETHEREUM_PAYMENT_PROCESSOR_MAINNET) {
      errors.push(
        "ETHEREUM_PAYMENT_PROCESSOR_MAINNET is required for mainnet mode"
      );
    }

    if (!env.TRON_PAYMENT_PROCESSOR_MAINNET) {
      errors.push(
        "TRON_PAYMENT_PROCESSOR_MAINNET is required for mainnet mode"
      );
    }

    if (!env.TREASURY_ADDRESS) {
      errors.push("TREASURY_ADDRESS is required for mainnet mode");
    }
  }

  if (errors.length > 0) {
    console.error("❌ Production environment validation failed:");
    errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
    throw new Error("Production environment validation failed");
  }
}

export function getEnvironment(): Environment {
  return validateEnvironment();
}

// Helper functions for common environment values
export function isProduction(): boolean {
  return getEnvironment().NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return getEnvironment().NODE_ENV === "development";
}

export function isMainnet(): boolean {
  return getEnvironment().NEXT_PUBLIC_NETWORK_MODE === "mainnet";
}

export function getBaseUrl(): string {
  const env = getEnvironment();
  return env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

export function getDatabaseUrl(): string {
  return getEnvironment().DATABASE_URL;
}

export function getPaymentConfig() {
  const env = getEnvironment();
  return {
    expiryMinutes: env.PAYMENT_EXPIRY_MINUTES,
    maxAmount: env.MAX_PAYMENT_AMOUNT,
    minAmount: env.MIN_PAYMENT_AMOUNT,
  };
}

export function getRateLimitConfig() {
  const env = getEnvironment();
  return {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  };
}

export function getBlockchainConfig() {
  const env = getEnvironment();
  return {
    networkMode: env.NEXT_PUBLIC_NETWORK_MODE,
    bsc: {
      rpcUrl: env.BSC_RPC_URL,
      testnetProcessor: env.BSC_PAYMENT_PROCESSOR_TESTNET,
      mainnetProcessor: env.BSC_PAYMENT_PROCESSOR_MAINNET,
    },
    ethereum: {
      rpcUrl: env.ETHEREUM_RPC_URL,
      testnetProcessor: env.ETHEREUM_PAYMENT_PROCESSOR_TESTNET,
      mainnetProcessor: env.ETHEREUM_PAYMENT_PROCESSOR_MAINNET,
    },
    tron: {
      rpcUrl: env.TRON_RPC_URL,
      testnetProcessor: env.TRON_PAYMENT_PROCESSOR_TESTNET,
      mainnetProcessor: env.TRON_PAYMENT_PROCESSOR_MAINNET,
    },
  };
}
