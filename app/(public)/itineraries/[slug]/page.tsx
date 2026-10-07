import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/content/markdown-content";
import { ItineraryView } from "@/components/itineraries/itinerary-view";
import { JsonLd } from "@/components/seo/json-ld";
import { ShareButtons } from "@/components/vendor/share-buttons";
import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { breadcrumbJsonLd } from "@/lib/content/jsonld";
import { getPublicSettings } from "@/lib/db/settings-public";
import { computeTotals } from "@/lib/itineraries/totals";
import { getPublishedItinerary } from "@/lib/services/itineraries";

export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const it = await getPublishedItinerary((await params).slug);
  if (!it) return { title: "Itinerary not found" };
  const description = it.seo_description ?? it.excerpt ?? `${it.days}-day plan${it.city ? ` for ${it.city.name}` : ""} with costs.`;
  return { title: it.seo_title ?? it.title, description, alternates: { canonical: `/itineraries/${it.slug}` }, openGraph: { title: it.title, description, type: "article" } };
}

/** P4 itinerary page: day tabs, running ₦ total with £/$ toggle, TouristTrip JSON-LD. */
export default async function ItineraryPage({ params }: { params: Params }) {
  const [it, settings] = await Promise.all([getPublishedItinerary((await params).slug), getPublicSettings()]);
  if (!it) notFound();
  const url = `${SITE_URL}/itineraries/${it.slug}`;
  const totals = computeTotals(it.items, it.days);
  const fx = { gbpPerNgn: settings?.fx_gbp_per_ngn ?? null, usdPerNgn: settings?.fx_usd_per_ngn ?? null };
  const updated = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(it.updated_at));

  return (
    <article className="pb-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "TouristTrip",
            name: it.title,
            description: it.excerpt ?? undefined,
            url,
            touristType: "Visitors to Nigeria",
            provider: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
            ...(totals.priced ? { offers: { "@type": "Offer", price: totals.total, priceCurrency: "NGN", description: "Rough per-person total of listed costs" } } : {}),
            itinerary: {
              "@type": "ItemList",
              itemListElement: it.items.map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: s.vendor
                  ? { "@type": "TouristAttraction", name: s.vendor.name, url: `${SITE_URL}/v/${s.vendor.slug}`, description: `Day ${s.day}${s.time_label ? `, ${s.time_label}` : ""}: ${s.title}` }
                  : { "@type": "TouristAttraction", name: s.title, description: `Day ${s.day}${s.time_label ? `, ${s.time_label}` : ""}` },
              })),
            },
          },
          breadcrumbJsonLd([{ name: "Itineraries", path: "/itineraries" }, { name: it.title, path: `/itineraries/${it.slug}` }]),
        ]}
      />
      {it.cover_image_url ? (
        <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden">
          <Image src={it.cover_image_url} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="container max-w-2xl space-y-6 px-4 pt-6">
        <nav className="text-sm text-muted-foreground"><Link href="/itineraries" className="hover:underline">Itineraries</Link>{it.city ? <> / {it.city.name}</> : null}</nav>
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">{it.title}</h1>
          {it.excerpt ? <p className="text-lg text-muted-foreground">{it.excerpt}</p> : null}
          <p className="text-xs text-muted-foreground">{it.days} day{it.days === 1 ? "" : "s"} · {it.items.length} stops · Last updated {updated}</p>
        </header>
        {it.intro_md ? <MarkdownContent markdown={it.intro_md} /> : null}
        <ItineraryView days={it.days} fx={fx} items={it.items.map((s) => ({ id: s.id, day: s.day, time_label: s.time_label, title: s.title, description_md: s.description_md, cost_ngn: s.cost_ngn, cost_note: s.cost_note, vendor: s.vendor ? { slug: s.vendor.slug, name: s.vendor.name } : null, event: s.event ? { slug: s.event.slug, title: s.event.title } : null }))} />
        <ShareButtons url={url} title={it.title} text={`${it.title} on ${BRAND_NAME}:`} />
      </div>
    </article>
  );
}
