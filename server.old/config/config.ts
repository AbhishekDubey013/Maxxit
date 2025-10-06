import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().default("dev-secret-change-in-production"),
  X_API_KEY: z.string().optional(),
  RELAYER_URL: z.string().optional(),
  SAFE_MODULE_ADDR: z.string().optional(),
  BILL_INFRA_FEE_USDC: z.string().default("0.20"),
  BILL_PROFIT_SHARE_BPS: z.string().default("1000"),
  SUBSCRIPTION_USD_MONTH: z.string().default("20"),
});

export type Config = z.infer<typeof configSchema>;

export function validateConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables:");
    console.error(error);
    process.exit(1);
  }
}

export const config = validateConfig();
