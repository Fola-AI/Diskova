import Link from "next/link";
import { notFound } from "next/navigation";

import { ItineraryEditor, type EditorValue } from "@/components/admin/itinerary-editor";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireRole } from "@/lib/auth/guards";
import { getItineraryAdmin } from "@/lib/services/itineraries";

export default async function EditItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("admin", `/admin/itineraries/${id}`);
  const { data: cities } = await getAdminSupabase().from("cities").select("id, name").order("sort_order");
  let initial: EditorValue = { slug: "", title: "", cityId: "", days: 2, excerpt: "", intro_md: "", seo_title: "", seo_description: "", items: [{ day: 1, time_label: "", title: "", vendor_slug: "", description_md: "", cost_ngn: "", cost_note: "" }] };
  if (id !== "new") {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const it = await getItineraryAdmin(id);
    if (!it) notFound();
    initial = {
      id: it.id, slug: it.slug, title: it.title, cityId: it.city?.id ?? "", days: it.days, excerpt: it.excerpt ?? "", intro_md: it.intro_md, seo_title: it.seo_title ?? "", seo_description: it.seo_description ?? "", status: it.status,
      items: it.items.map((s) => ({ day: s.day, time_label: s.time_label ?? "", title: s.title, vendor_slug: s.vendor?.slug ?? "", description_md: s.description_md ?? "", cost_ngn: s.cost_ngn === null ? "" : String(s.cost_ngn), cost_note: s.cost_note ?? "" })),
    };
  }
  return (
    <div className="space-y-4">
      <Link href="/admin/itineraries" className="hit inline-flex h-10 items-center text-footnote font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">← Itineraries</Link>
      <h1 className="text-title font-semibold sm:text-display">{id === "new" ? "New itinerary" : "Edit itinerary"}</h1>
      <ItineraryEditor initial={initial} cities={cities ?? []} />
    </div>
  );
}
