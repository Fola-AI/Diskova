import type { Metadata } from "next";
import { CalendarDays, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CountListView } from "@/components/lists/count-view";
import type { MapPoint } from "@/components/map/vendor-map";
import { MapToggle } from "@/components/map/map-toggle";
import { ShareButtons } from "@/components/vendor/share-buttons";
import { BRAND_NAME, MAPBOX_TOKEN, SITE_URL } from "@/lib/config";
import { formatNaira } from "@/lib/directory/constants";
import { estimateCost, getSharedList } from "@/lib/services/lists";

export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ token: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const list = await getSharedList((await params).token);
  if (!list) return { title: "List not found", robots: { index: false } };
  const description = `${list.items.length} places and events${list.city ? ` in ${list.city.name}` : ""}, planned by @${list.owner.username} on ${BRAND_NAME}.`;
  // Personal lists are shareable but not for search engines.
  return { title: list.title, description, robots: { index: false, follow: true }, openGraph: { title: list.title, description, type: "website", url: `/l/${list.token}` }, twitter: { card: "summary_large_image", title: list.title, description } };
}

/** P2 public share page: works logged-out; only lists their owner made public. */
export default async function SharedListPage({ params }: { params: Params }) {
  const list = await getSharedList((await params).token);
  if (!list) notFound();
  const cost = estimateCost(list.items);
  const points: MapPoint[] = list.items.flatMap((it) => {
    if (it.kind === "vendor" && it.vendor.lat !== null && it.vendor.lng !== null) return [{ id: it.vendor.id, slug: it.vendor.slug, name: it.vendor.name, subtitle: it.vendor.category ?? undefined, lat: it.vendor.lat, lng: it.vendor.lng, weight: 0 }];
    return [];
  });
  const center = points[0] ?? (list.city ? { lat: list.city.lat, lng: list.city.lng } : null);
  const url = `${SITE_URL}/l/${list.token}`;

  return (
    <article className="container max-w-2xl space-y-6 px-4 py-6" data-testid="shared-list">
      <CountListView token={list.token} />
      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-caption font-semibold text-muted-foreground">Shared plan · by @{list.owner.username}{list.city ? ` · ${list.city.name}` : ""}</p>
        <h1 className="text-display font-semibold sm:text-display-lg">{list.title}</h1>
        <p className="text-sm text-muted-foreground">{list.items.length} {list.items.length === 1 ? "stop" : "stops"}</p>
      </header>

      <section className="surface flex items-start gap-3 rounded-2xl p-4" data-testid="cost-estimate">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-positive"><Wallet className="h-5 w-5" aria-hidden /></span>
        <div className="text-sm">
          <p className="text-callout font-semibold">
            {cost.priced ? (cost.low === cost.high ? `About ${formatNaira(cost.low)} per person` : `About ${formatNaira(cost.low)}–${formatNaira(cost.high)} per person`) : "No prices listed yet"}
          </p>
          <p className="mt-0.5 text-footnote text-muted-foreground">
            Rough guide from listed entry/drink prices and ticket prices{cost.unpriced ? ` · ${cost.unpriced} item${cost.unpriced === 1 ? "" : "s"} without prices` : ""}. Check with venues before you go.
          </p>
        </div>
      </section>

      {center && points.length ? (
        <MapToggle token={MAPBOX_TOKEN} center={center} zoom={12} points={points} staticImageUrl={list.city && MAPBOX_TOKEN ? `/api/map/city/${list.city.slug}` : null} label="Show on map" />
      ) : null}

      <ol className="space-y-3">
        {list.items.map((it, i) => (
          <li key={it.id} className="surface enter-up rounded-2xl p-4" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }} data-testid="shared-item">
            <div className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary font-display text-base font-semibold text-muted-foreground" aria-hidden>{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-1">
                {it.kind === "vendor" ? (
                  <>
                    <Link href={`/v/${it.vendor.slug}`} className="text-callout font-semibold underline-offset-4 hover:underline">{it.vendor.name}</Link>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {[it.vendor.category, it.vendor.area].filter(Boolean).join(" · ")}
                      {it.vendor.min_price ? ` · from ${formatNaira(it.vendor.min_price)}` : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <Link href={`/events/${it.event.slug}`} className={`text-callout font-semibold underline-offset-4 hover:underline ${it.event.status === "cancelled" ? "line-through" : ""}`}>{it.event.title}</Link>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {new Date(it.event.starts_at).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })}
                      {it.event.venue_name ? ` · ${it.event.venue_name}` : ""}
                      {it.event.status === "cancelled" ? " · cancelled" : it.event.is_free ? " · free" : it.event.price_from_ngn ? ` · from ${formatNaira(it.event.price_from_ngn)}` : ""}
                    </p>
                  </>
                )}
                {it.note ? <p className="mt-1 rounded-xl bg-secondary/60 px-3 py-2 text-sm italic">“{it.note}”</p> : null}
              </div>
            </div>
          </li>
        ))}
        {!list.items.length ? <li className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">This list is empty.</li> : null}
      </ol>

      <section className="space-y-2">
        <h2 className="font-sans text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Share this plan</h2>
        <ShareButtons url={url} title={list.title} text={`${list.title} — the plan:`} />
      </section>
      <p className="text-footnote text-muted-foreground">
        Made with {BRAND_NAME}. <Link href="/" className="underline underline-offset-4">See what&apos;s happening tonight</Link>
      </p>
    </article>
  );
}
