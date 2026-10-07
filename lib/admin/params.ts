/** Helpers for reading admin table state (filters, sort, page) from searchParams. */
export type SearchParams = Record<string, string | string[] | undefined>;

export function one(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s.slice(0, 200) : undefined;
}

export function flag(sp: SearchParams, key: string): boolean | undefined {
  const v = one(sp, key);
  return v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : undefined;
}

export function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function uuidParam(sp: SearchParams, key: string): string | undefined {
  const v = one(sp, key);
  return v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined;
}

export function pageOf(sp: SearchParams): number {
  return Math.min(10_000, Math.max(1, Number(one(sp, "page")) || 1));
}

export function sortOf<T extends string>(sp: SearchParams, allowed: readonly T[], fallback: T): { sort: T; desc: boolean } {
  return { sort: pick(one(sp, "sort"), allowed) ?? fallback, desc: one(sp, "dir") !== "asc" };
}

/** Rebuild a URL from the current params with some keys changed (null removes). */
export function hrefWith(basePath: string, sp: SearchParams, patch: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) q.set(k, s);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}
