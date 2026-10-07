import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/rls/**/*.test.ts"],
    exclude: ["tests/smoke/**", "node_modules/**"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: { NODE_ENV: "test" },
  },
});
