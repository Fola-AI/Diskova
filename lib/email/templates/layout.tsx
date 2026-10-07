import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

import { BRAND_COLORS, BRAND_NAME } from "@/lib/config";

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f4f4f2", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, maxWidth: 520, padding: 28 }}>
          <Text style={{ color: BRAND_COLORS.green, fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>{BRAND_NAME}</Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0 12px" }} />
          <Text style={{ color: "#888", fontSize: 12, margin: 0 }}>
            You&apos;re receiving this because of activity on your {BRAND_NAME} account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const p = { color: "#222", fontSize: 15, lineHeight: "24px", margin: "0 0 12px" } as const;
export const button = {
  backgroundColor: BRAND_COLORS.green,
  borderRadius: 8,
  color: "#fff",
  display: "inline-block",
  fontSize: 15,
  fontWeight: 600,
  padding: "12px 20px",
  textDecoration: "none",
} as const;
