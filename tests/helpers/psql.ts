/**
 * Run SQL test scripts against the DEV database with psql (Session pooler URL from .env.local).
 * Credentials go through PG* environment variables, never argv. Refuses anything that isn't the
 * DEV project referenced by NEXT_PUBLIC_SUPABASE_URL.
 */
import { spawnSync } from "node:child_process";

function devConnectionEnv(): NodeJS.ProcessEnv | null {
  const raw = process.env.SUPABASE_DB_URL;
  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw || !apiUrl) return null;
  const ref = new URL(apiUrl).host.split(".")[0];
  const u = new URL(raw);
  if (!ref || !(u.username.includes(ref) || u.host.includes(ref))) throw new Error("SUPABASE_DB_URL is not the DEV project — refusing to run SQL tests.");
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: u.pathname.replace(/^\//, "") || "postgres",
    PGSSLMODE: "require",
  };
}

export const hasPsql = (() => {
  try {
    return Boolean(devConnectionEnv()) && spawnSync("psql", ["--version"]).status === 0;
  } catch {
    return false;
  }
})();

export function runPsql(args: { file?: string; sql?: string }): { ok: boolean; stdout: string; stderr: string } {
  const env = devConnectionEnv();
  if (!env) throw new Error("No DEV database URL");
  const argv = ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", ...(args.file ? ["-f", args.file] : ["-c", args.sql ?? ""])];
  const res = spawnSync("psql", argv, { env, encoding: "utf8", timeout: 120_000 });
  return { ok: res.status === 0, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}
