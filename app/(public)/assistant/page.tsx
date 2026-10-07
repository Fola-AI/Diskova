import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { BRAND_NAME, DEFAULT_CITY_SLUG, FEATURES } from "@/lib/config";
import { listCities } from "@/lib/db/directory";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Ask", description: `Ask ${BRAND_NAME} where's busy, what's on and what things cost.`, robots: { index: false, follow: true } };

/** PRD P5 in-app AI assistant. */
export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  if (!FEATURES.aiAssistant) notFound();
  const [cities, sp] = await Promise.all([listCities(), searchParams]);
  const def = cities.find((c) => c.slug === sp.city)?.slug ?? DEFAULT_CITY_SLUG;
  return (
    <div className="container max-w-2xl space-y-4 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Ask {BRAND_NAME}</h1>
        <p className="text-sm text-muted-foreground">Where&apos;s busy right now, what&apos;s on, and what it costs — answered from live community reports and venue listings.</p>
      </header>
      <AssistantChat cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} defaultCity={def} />
    </div>
  );
}
