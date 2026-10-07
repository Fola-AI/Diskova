import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Services under test import React Email templates (TSX); tsconfig keeps jsx: "preserve" for Next.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/rls/**/*.test.ts"],
    exclude: ["tests/smoke/**", "node_modules/**"],
    setupFiles: ["tests/setup/load-env.ts"],
    // RLS tests share DEV fixtures; run files one at a time to avoid auth rate limits.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: { NODE_ENV: "test" },
  },
});
