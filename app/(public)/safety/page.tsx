import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";
import Link from "next/link";

import { SafetyBlock } from "@/components/safety/safety-block";
import { BRAND_NAME } from "@/lib/config";
import { listCities } from "@/lib/db/directory";
import { listSafetyInfo } from "@/lib/db/safety";

export const revalidate = 300;
export const metadata: Metadata = { title: "Safety information", description: "Emergency numbers and practical safety information for Nigerian cities.", alternates: { canonical: "/safety" } };

export default async function SafetyIndex() {
  const [cities, national] = await Promise.all([listCities(), listSafetyInfo(null)]);
  return (
    <div className="container max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-display font-semibold">Safety information</h1>
      <p className="flex items-start gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm font-medium">
        <PhoneCall className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {BRAND_NAME} is not an emergency service. If you are in danger, call <a href="tel:112" className="underline">112</a>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">{national.filter((b) => b.section === "emergency_numbers").map((b) => <SafetyBlock key={b.id} block={b} />)}</div>
      <nav aria-label="Cities" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cities.map((c) => <Link key={c.slug} href={`/safety/${c.slug}`} className="rounded-xl border bg-card px-4 py-3 font-medium hover:border-primary/60">{c.name}</Link>)}
      </nav>
    </div>
  );
}
