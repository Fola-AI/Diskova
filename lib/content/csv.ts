/** RFC 4180 CSV reader (quoted fields, embedded commas/quotes/newlines). Returns records keyed by header. */
export function parseCsv(text: string): Array<{ line: number; row: Record<string, string> }> {
  const src = text.replace(/^﻿/, "");
  const rows: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowStart = 1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      cells.push(cell);
      rows.push({ line: rowStart, cells });
      cells = [];
      cell = "";
      line++;
      rowStart = line;
    } else cell += ch;
  }
  if (quoted) throw new Error(`unterminated quoted field starting on line ${rowStart}`);
  if (cell !== "" || cells.length) {
    cells.push(cell);
    rows.push({ line: rowStart, cells });
  }
  const nonEmpty = rows.filter((r) => r.cells.some((c) => c.trim() !== ""));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0]!.cells.map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((r) => ({ line: r.line, row: Object.fromEntries(header.map((h, i) => [h, (r.cells[i] ?? "").trim()])) }));
}
