/** Inline-SVG sparkline (§11.1 — no chart library). */
export function Sparkline({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={`${label}: last ${values.length} days, latest ${values.at(-1) ?? 0}`} className={className}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
