import { ChevronDown } from "lucide-react";

import { saveAreaForm, saveCityForm } from "@/app/admin/(secure)/cities/actions";
import { PlaceForm } from "@/components/admin/place-form";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/guards";
import { listCitiesAdmin } from "@/lib/services/admin/cities";

/** §11.10 cities & areas: data, not code — add a city or area without a deploy. */
export default async function AdminCitiesPage() {
  await requireRole("admin", "/admin/cities");
  const { cities, areas } = await listCitiesAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-title font-semibold sm:text-display">Cities &amp; areas</h1>
      <section className="surface space-y-3 rounded-2xl p-4">
        <h2 className="text-callout font-semibold">Add a city</h2>
        <PlaceForm kind="city" action={saveCityForm} values={{ slug: "", name: "", state: "", lat: 9.0765, lng: 7.3986, is_active: false, sort_order: 100 }} />
      </section>
      {cities.map((c) => {
        const cityAreas = areas.filter((a) => a.city_id === c.id);
        return (
          <details key={c.id} className="surface group rounded-2xl" data-testid="admin-city">
            <summary className="hit flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2 font-semibold [&::-webkit-details-marker]:hidden">
              {c.name} <Badge variant={c.is_active ? "secondary" : "outline"}>{c.is_active ? "active" : "inactive"}</Badge>
              <span className="text-footnote font-normal text-muted-foreground">{cityAreas.length} areas</span>
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-micro group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-4 border-t p-4">
              <PlaceForm kind="city" action={saveCityForm} values={{ ...c }} />
              <div className="space-y-3 border-t pt-3">
                <h3 className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Areas</h3>
                {cityAreas.map((a) => (
                  <PlaceForm key={a.id} kind="area" action={saveAreaForm} values={{ ...a, lat: a.lat ?? c.lat, lng: a.lng ?? c.lng }} />
                ))}
                <div className="rounded-xl border border-dashed p-3">
                  <p className="mb-2 text-footnote text-muted-foreground">New area in {c.name}</p>
                  <PlaceForm kind="area" action={saveAreaForm} values={{ city_id: c.id, slug: "", name: "", lat: c.lat, lng: c.lng, is_active: true, sort_order: 100 }} />
                </div>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
