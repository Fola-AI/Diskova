import Link from "next/link";

import { VendorCard } from "@/components/directory/vendor-card";
import { MapToggle } from "@/components/map/map-toggle";
import { MAPBOX_TOKEN } from "@/lib/config";
import { getVendorBySlug, listVendorPrices } from "@/lib/db/directory";
import { formatNaira } from "@/lib/directory/constants";
import { staticMapUrl } from "@/lib/directory/links";

export async function VendorEmbed({ slug }: { slug: string }) {
  const v = await getVendorBySlug(slug);
  if (!v) return null; // unpublished / unknown venues simply don't render
  return (
    <div className="not-prose my-5 max-w-sm" data-testid="embed-vendor">
      <VendorCard vendor={v} />
    </div>
  );
}

export async function MapEmbed({ slugs }: { slugs: string[] }) {
  const vendors = (await Promise.all(slugs.map((s) => getVendorBySlug(s)))).filter((v): v is NonNullable<typeof v> => Boolean(v && v.lat !== null && v.lng !== null));
  if (!vendors.length) return null;
  const center = { lat: vendors[0].lat!, lng: vendors[0].lng! };
  return (
    <div className="not-prose my-5" data-testid="embed-map">
      <MapToggle
        token={MAPBOX_TOKEN}
        center={center}
        zoom={13}
        points={vendors.map((v) => ({ id: v.id, slug: v.slug, name: v.name, subtitle: v.category?.name, lat: v.lat!, lng: v.lng! }))}
        staticImageUrl={staticMapUrl(MAPBOX_TOKEN, center, { zoom: 12, width: 640, height: 280 })}
        label={`Map of ${vendors.length} ${vendors.length === 1 ? "place" : "places"}`}
      />
    </div>
  );
}

export async function PriceTableEmbed({ vendor }: { vendor: string }) {
  const v = await getVendorBySlug(vendor);
  if (!v) return null;
  const prices = await listVendorPrices(v.id);
  if (!prices.length) return null;
  return (
    <figure className="not-prose my-5" data-testid="embed-prices">
      <figcaption className="mb-2 text-sm font-medium">
        Prices at <Link href={`/v/${v.slug}`} className="underline underline-offset-4">{v.name}</Link>
      </figcaption>
      <table className="w-full overflow-hidden rounded-xl border text-sm">
        <tbody>
          {prices.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-3 py-2">{p.label}{p.note ? <span className="block text-xs text-muted-foreground">{p.note}</span> : null}</td>
              <td className="px-3 py-2 text-right font-semibold">{formatNaira(p.amount_ngn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
