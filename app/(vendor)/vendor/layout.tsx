import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "For venues", robots: { index: false, follow: false } };

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <div className="container max-w-2xl px-4 py-6">{children}</div>;
}
