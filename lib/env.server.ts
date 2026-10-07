import { z } from "zod";

import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/env.server");

/**
 * Server-side secrets. Validated lazily so builds without optional keys still succeed;
 * each accessor throws a clear error naming the missing variable when actually needed.
 */
const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optional,
  SUPABASE_PROJECT_REF: optional,
  SUPABASE_DB_URL: optional,
  SUPER_ADMIN_EMAIL: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  EMAIL_ADMIN_TO: optional,
  OPENAI_API_KEY: optional,
  GROQ_API_KEY: optional,
  GROQ_MODEL: optional,
  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,
  CRON_SECRET: optional,
  TOKEN_ENCRYPTION_KEY: optional,
  META_APP_ID: optional,
  META_APP_SECRET: optional,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ServerEnvKey = keyof ServerEnv;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) cached = serverEnvSchema.parse(process.env);
  return cached;
}

/** Returns a required server secret or throws naming the missing variable (never its value). */
export function requireServerEnv(key: ServerEnvKey): string {
  const value = serverEnv()[key];
  if (!value) throw new Error(`Missing required server environment variable: ${key}`);
  return value;
}
