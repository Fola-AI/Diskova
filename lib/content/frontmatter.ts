/**
 * Minimal front matter for /content markdown (no YAML dependency — PRD §4). Supports:
 *   key: value            (string; quotes optional)
 *   key: [a, b, "c, d"]   (string list)
 *   key: true | false | 12 | 3.5
 * between `---` lines at the very top of the file.
 */
export type FrontValue = string | number | boolean | string[];

function scalar(raw: string): FrontValue {
  const v = raw.trim();
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
  if (v === "true" || v === "false") return v === "true";
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function list(raw: string): string[] {
  const inner = raw.trim().slice(1, -1);
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ",") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function parseFrontmatter(src: string): { data: Record<string, FrontValue>; body: string } {
  const text = src.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return { data: {}, body: text };
  const end = text.indexOf("\n---", 4);
  if (end === -1) throw new Error("front matter opened with --- but never closed");
  const data: Record<string, FrontValue> = {};
  for (const [i, line] of text.slice(4, end).split("\n").entries()) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!m) throw new Error(`front matter line ${i + 2}: expected "key: value"`);
    const value = m[2]!.trim();
    data[m[1]!] = value.startsWith("[") && value.endsWith("]") ? list(value) : scalar(value);
  }
  return { data, body: text.slice(end + 4).replace(/^\n+/, "") };
}
