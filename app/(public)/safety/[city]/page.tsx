import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/content/markdown-content";
import { IssueReportForm } from "@/components/safety/issue-report-form";
import { SafetyBlock } from "@/components/safety/safety-block";
import { BRAND_NAME } from "@/lib/config";
import { getCityBySlug, listAreas } from "@/lib/db/directory";
import { listPublishedGuides } from "@/lib/db/guides";
import { listSafetyInfo } from "@/lib/db/safety";
import { SAFETY_SECTIONS } from "@/lib/safety/copy";

export const revalidate = 300;

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = await getCityBySlug((await params).city);
  if (!city) return {};
  return { title: `Safety information — ${city.name}`, description: `Emergency numbers, hospitals, travel advice and scam awareness for ${city.name}.`, alternates: { canonical: `/safety/${city.slug}` } };
}

/** §10 — information only. No incident feed, no map of reports. */
export default async function CitySafetyPage({ params }: { params: Params }) {
  const city = await getCityBySlug((await params).city);
  if (!city) notFound();
  const [blocks, areas, pages] = await Promise.all([
    listSafetyInfo(city.id),
    listAreas(city.id),
    listPublishedGuides({ types: ["safety_page"], cityId: city.id, limit: 1 }),
  ]);
  const page = pages[0];
  return (
    <div className="container max-w-3xl space-y-8 px-4 py-6">
      <header className="space-y-3">
        <h1 className="text-display font-semibold">Safety in {city.name}</h1>
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm font-medium" data-testid="emergency-banner">
          <PhoneCall className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <p className="flex-1">{BRAND_NAME} is not an emergency service. If you are in danger, call <a href="tel:112" className="underline">112</a>.</p>
          <a href="tel:112" className="pressable inline-flex h-11 shrink-0 items-center rounded-full bg-destructive px-4 font-semibold text-destructive-foreground" aria-label="Call 112 now">Call 112</a>
        </div>
      </header>
      {page ? <MarkdownContent markdown={page.body_md} /> : null}
      {SAFETY_SECTIONS.map((s) => {
        const list = blocks.filter((b) => b.section === s.value);
        if (!list.length) return null;
        return (
          <section key={s.value} aria-labelledby={`s-${s.value}`} className="space-y-3">
            <h2 id={`s-${s.value}`} className="text-title font-semibold">{s.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">{list.map((b) => <SafetyBlock key={b.id} block={b} />)}</div>
          </section>
        );
      })}
      <section id="report" aria-labelledby="report-heading" className="surface scroll-mt-20 space-y-3 rounded-3xl p-5">
        <h2 id="report-heading" className="text-title font-semibold">Report an issue privately</h2>
        <p className="text-sm text-muted-foreground">
          Tell our team about a safety concern, scam or problem. Reports are private — they are never published or shown on a map.
        </p>
        <IssueReportForm cityId={city.id} areas={areas.map((a) => ({ id: a.id, name: a.name }))} />
      </section>
    </div>
  );
}
