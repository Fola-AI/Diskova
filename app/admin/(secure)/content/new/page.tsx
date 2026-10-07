import { GuideEditor } from "@/components/admin/guide-editor";
import { requireRole } from "@/lib/auth/guards";
import { listCities } from "@/lib/db/directory";

export default async function NewGuidePage() {
  await requireRole("admin", "/admin/content/new");
  const cities = await listCities();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New guide</h1>
      <GuideEditor
        id={null}
        status={null}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        revisions={[]}
        previewHref={null}
        publicHref={null}
        initial={{ title: "", slug: "", type: "city_guide", city_id: "", excerpt: "", body_md: "", cover_image_url: "", tags: "", seo_title: "", seo_description: "" }}
      />
    </div>
  );
}
