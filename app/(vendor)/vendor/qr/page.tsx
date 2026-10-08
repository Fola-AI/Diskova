import { Printer } from "lucide-react";
import { redirect } from "next/navigation";
import QRCode from "qrcode";

import { PrintButton } from "@/components/vendor-dashboard/print-button";
import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getCurrentVendor } from "@/lib/services/vendors";
import { BackLink } from "@/components/ui/back-link";

/** Printable QR poster linking to /v/[slug]?pulse=1 (one-tap pulse, §8.9). */
export default async function QrPosterPage() {
  const session = await requireVerifiedUser("/vendor/qr");
  const current = await getCurrentVendor(session);
  if (!current) redirect("/vendor/onboarding");
  const url = `${SITE_URL}/v/${current.slug}?pulse=1`;
  // SVG generated locally from our own URL — safe to inline.
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B0F0D", light: "#FFFFFF" } });

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <BackLink href="/vendor">Dashboard</BackLink>
        <h1 className="mt-1 text-display font-semibold">QR poster</h1>
        <p className="text-sm text-muted-foreground">Print it for your entrance or bar. Guests scan it to tell everyone how busy it is.</p>
      </div>
      <div className="mx-auto max-w-sm rounded-3xl bg-white p-7 text-center text-black shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8)] print:max-w-none print:shadow-none" data-testid="qr-poster">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#0B7A3B]">{BRAND_NAME}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">{current.name}</h2>
        <p className="mt-2 text-base">How busy is it? Scan &amp; tap — no app needed.</p>
        <div className="mx-auto mt-4 w-56" aria-label={`QR code linking to ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-3 break-all text-xs text-neutral-600">{url.replace(/^https?:\/\//, "")}</p>
      </div>
      <div className="flex justify-center print:hidden [&_button]:h-12 [&_button]:px-6">
        <PrintButton><Printer aria-hidden /> Print poster</PrintButton>
      </div>
    </div>
  );
}
