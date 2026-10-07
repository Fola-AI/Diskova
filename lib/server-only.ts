/**
 * Runtime guard for server-only modules. Throws if evaluated in a browser bundle.
 * (Compile-time protection: ESLint no-restricted-imports + tests/unit/service-role-isolation.test.ts.)
 */
export function assertServerOnly(moduleName: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`${moduleName} is server-only and must never be imported into client code.`);
  }
}
