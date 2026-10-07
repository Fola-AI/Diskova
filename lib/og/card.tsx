import { ImageResponse } from "next/og";

import { BRAND_COLORS, BRAND_NAME } from "@/lib/config";

export const OG_SIZE = { width: 1200, height: 630 };

/** Shared 1200×630 social card: dark, photo-free, brand green + gold. */
export function ogCard({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          color: "#F7F5F0",
          background: `radial-gradient(120% 90% at 15% 0%, ${BRAND_COLORS.green} 0%, #062616 45%, ${BRAND_COLORS.background} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: BRAND_COLORS.green,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
              border: "2px solid rgba(255,255,255,0.2)",
            }}
          >
            {BRAND_NAME.charAt(0)}
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{BRAND_NAME}</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 24, color: BRAND_COLORS.gold }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: BRAND_COLORS.gold }} />
            Live
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {eyebrow ? <div style={{ fontSize: 30, color: BRAND_COLORS.gold }}>{eyebrow}</div> : null}
          <div style={{ fontSize: title.length > 28 ? 64 : 84, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 32, color: "rgba(247,245,240,0.75)" }}>{subtitle}</div> : null}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
