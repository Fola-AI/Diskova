/** Crowd levels (§6.9): 1 empty, 2 chill, 3 busy, 4 packed, 5 at capacity. */
export const CROWD_LEVELS = [
  { level: 1, label: "Empty", className: "bg-crowd-1" },
  { level: 2, label: "Chill", className: "bg-crowd-2" },
  { level: 3, label: "Busy", className: "bg-crowd-3" },
  { level: 4, label: "Packed", className: "bg-crowd-4" },
  { level: 5, label: "At capacity", className: "bg-crowd-5" },
] as const;

export function crowdLabel(level: number | null | undefined): string | null {
  if (!level) return null;
  return CROWD_LEVELS[Math.min(5, Math.max(1, Math.round(level))) - 1].label;
}

export function crowdClass(level: number | null | undefined): string {
  if (!level) return "bg-muted";
  return CROWD_LEVELS[Math.min(5, Math.max(1, Math.round(level))) - 1].className;
}
