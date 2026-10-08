/**
 * Minimal RFC 5545 iCalendar writer (no dependency): CRLF line endings, TEXT escaping, 75-octet line
 * folding, UTC DATE-TIMEs, DTSTAMP + UID on every VEVENT.
 */
export interface IcalEvent {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  start: Date;
  end?: Date | null;
  updated?: Date | null;
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
}

export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function formatUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Fold a content line to ≤ 75 octets (UTF-8), continuation lines start with one space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let limit = 75;
  for (const ch of line) {
    if (enc.encode(current + ch).length > limit) {
      parts.push(current);
      current = ch;
      limit = 74; // continuation lines carry a leading space
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildCalendar(opts: { name: string; prodId: string; events: IcalEvent[]; now?: Date }): string {
  const stamp = formatUtc(opts.now ?? new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${opts.prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    "X-WR-TIMEZONE:Africa/Lagos",
  ];
  for (const e of opts.events) {
    const end = e.end ?? new Date(e.start.getTime() + 3 * 3600_000); // default 3 hours
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatUtc(e.start)}`,
      `DTEND:${formatUtc(end)}`,
      `SUMMARY:${escapeText(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.updated) lines.push(`LAST-MODIFIED:${formatUtc(e.updated)}`);
    lines.push(`STATUS:${e.status ?? "CONFIRMED"}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
