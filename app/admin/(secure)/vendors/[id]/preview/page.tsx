import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HoursTable } from "@/components/vendor/hours-table";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireRole } from "@/lib/auth/guards";
import { DEFAULT_TIMEZONE } from "@/lib/config";
import { FEATURES, formatNaira, priceBandSymbol } from "@/lib/directory/constants";
import { parseOpeningHours } from "@/lib/services/opening-hours";

/** Read-only view of any vendor, including drafts and pending listings (§11.2 view-as-vendor). */
export default async function AdminVendorPreview({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "/admin/vendors");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = getAdminSupabase();
  const [{ data: v }, { data: prices }] = await Promise.all([
    admin.from("vendors").select("*, category:categories(name), city:cities(name), area:areas(name)").eq("id", id).maybeSingle(),
    admin.from("vendor_prices").select("id, label, amount_ngn, note").eq("vendor_id", id).order("amount_ngn"),
  ]);
  if (!v) notFound();
  const meta = v as unknown as { category: { name: string } | null; city: { name: string } | null; area: { name: string } | null };
  const contacts: Array<[string, string | null]> = [
    ["Phone", v.phone], ["WhatsApp", v.whatsapp], ["Email", v.email], ["Website", v.website_url], ["Booking", v.booking_url],
    ["Instagram", v.instagram_handle], ["TikTok", v.tiktok_handle], ["X", v.x_handle],
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/vendors" className="text-sm text-muted-foreground hover:underline">← Vendor queue</Link>
      <div>
        <p className="text-sm text-muted-foreground">
          {[meta.category?.name, meta.area?.name, meta.city?.name].filter(Boolean).join(" · ")} · status {v.status} · {priceBandSymbol(v.price_band) ?? "no price band"}
        </p>
        <h1 className="text-3xl font-semibold">{v.name}</h1>
        {v.tagline ? <p className="text-muted-foreground">{v.tagline}</p> : null}
      </div>
      {v.cover_image_url ? (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border">
          <Image src={v.cover_image_url} alt="" fill sizes="720px" className="object-cover" />
        </div>
      ) : <p className="text-sm text-muted-foreground">No cover photo.</p>}
      <p className="whitespace-pre-line text-sm">{v.description_md ?? "No description."}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {contacts.map(([k, val]) => (
          <div key={k}><dt className="font-medium">{k}</dt><dd className="break-all text-muted-foreground">{val ?? "—"}</dd></div>
        ))}
      </dl>
      <p className="text-sm">Address: {v.address_line ?? "—"}</p>
      <p className="text-sm">Features: {v.features.map((f) => FEATURES[f] ?? f).join(", ") || "—"}</p>
      <div className="rounded-xl border px-4"><HoursTable hours={parseOpeningHours(v.opening_hours)} timeZone={DEFAULT_TIMEZONE} /></div>
      <ul className="divide-y rounded-xl border text-sm">
        {(prices ?? []).map((p) => (
          <li key={p.id} className="flex justify-between px-4 py-2"><span>{p.label}</span><span>{formatNaira(p.amount_ngn)}</span></li>
        ))}
        {!prices?.length ? <li className="px-4 py-2 text-muted-foreground">No prices.</li> : null}
      </ul>
    </div>
  );
}
