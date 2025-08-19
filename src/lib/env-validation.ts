// =================================
// 🔧 Environment Variable Validation
// =================================

import { z } from "zod";

// Environment validation schema
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

  // Security (optional in development, required in production)
  WEBHOOK_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),

  // Payment limits
  PAYMENT_EXPIRY_MINUTES: z.string().transform((val) => parseInt(val) || 30),
  MAX_PAYMENT_AMOUNT: z.string().transform((val) => parseInt(val) || 10000),
  MIN_PAYMENT_AMOUNT: z.string().transform((val) => parseInt(val) || 1),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val) || 900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val) || 100),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),

  // Blockchain contracts (mainnet)
  BSC_PAYMENT_PROCESSOR_MAINNET: z.string().optional(),
  ETHEREUM_PAYMENT_PROCESSOR_MAINNET: z.string().optional(),
  TRON_PAYMENT_PROCESSOR_MAINNET: z.string().optional(),

  // Treasury
  TREASURY_ADDRESS: z.string().optional(),

  // RPC URLs
  BSC_RPC_URL: z.string().url().optional(),
  ETHEREUM_RPC_URL: z.string().url().optional(),
  TRON_RPC_URL: z.string().url().optional(),

  // API Keys
  BSC_API_KEY: z.string().optional(),
  ETHEREUM_API_KEY: z.string().optional(),

  // Optional services
  REDIS_URL: z.string().optional(),
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

  // Security requirements
  if (!env.WEBHOOK_SECRET) {
    errors.push("WEBHOOK_SECRET is required in production");
  }

  if (!env.JWT_SECRET) {
    errors.push("JWT_SECRET is required in production");
  }

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

export function getWebhookSecret(): string | undefined {
  return getEnvironment().WEBHOOK_SECRET;
}

export function getJwtSecret(): string | undefined {
  return getEnvironment().JWT_SECRET;
}

export function getAllowedOrigins(): string[] {
  const origins = getEnvironment().ALLOWED_ORIGINS;
  if (!origins) return [];
  return origins.split(",").map((origin) => origin.trim());
}
