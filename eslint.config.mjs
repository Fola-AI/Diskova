import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** Server-only modules that must never reach client code (PRD §7.2). */
const serverOnlyImportPatterns = [
  {
    group: ["@/lib/admin-db", "@/lib/admin-db/*", "**/admin-db", "**/admin-db/*"],
    message:
      "admin-db uses the service-role key and is server-only. Use a service or Server Action.",
  },
  {
    group: ["@/lib/env.server", "**/env.server"],
    message: "env.server holds secrets and is server-only.",
  },
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Components and client hooks may never import server-only modules.
    files: ["components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}", "**/*.client.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: serverOnlyImportPatterns }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "supabase/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
