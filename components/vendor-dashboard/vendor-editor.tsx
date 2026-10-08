import { BasicsForm } from "@/components/vendor-dashboard/basics-form";
import { ContactForm } from "@/components/vendor-dashboard/contact-form";
import { DetailsForm } from "@/components/vendor-dashboard/details-form";
import { PhotosStep, type GalleryItem } from "@/components/vendor-dashboard/photos-step";
import { PricesEditor } from "@/components/vendor-dashboard/prices-editor";
import { ReviewStep } from "@/components/vendor-dashboard/review-step";
import { nextStep, prevStep, WizardNav } from "@/components/vendor-dashboard/wizard-nav";
import type { SessionContext } from "@/lib/auth/guards";
import { MAPBOX_TOKEN } from "@/lib/config";
import { listAllAreas, listCategories, listCities } from "@/lib/db/directory";
import type { PriceBand } from "@/lib/directory/constants";
import { parseOpeningHours } from "@/lib/services/opening-hours";
import { MAX_GALLERY } from "@/lib/services/vendor-assets";
import { checkSubmission, getVendorForEditing } from "@/lib/services/vendors";
import { VENDOR_STEPS, type VendorStep } from "@/lib/validation/vendor";

const EDIT_STEPS: readonly VendorStep[] = ["basics", "contact", "photos", "details", "prices"];

/**
 * The listing editor used by onboarding (all six steps, ends with Submit) and by /vendor/profile
 * (edit steps only). Each step autosaves.
 */
export async function VendorEditor({
  session,
  vendorId,
  step,
  basePath,
  mode,
}: {
  session: SessionContext;
  vendorId: string | null;
  step: VendorStep;
  basePath: string;
  mode: "onboarding" | "edit";
}) {
  const steps = mode === "onboarding" ? VENDOR_STEPS : EDIT_STEPS;
  const [categories, cities, areas] = await Promise.all([listCategories(), listCities(), listAllAreas()]);
  const href = (s: VendorStep | null) => (s ? `${basePath}?step=${s}` : null);
  const nav = <WizardNav basePath={basePath} current={vendorId ? step : "basics"} enabled={Boolean(vendorId)} steps={steps} />;

  if (!vendorId) {
    const lagos = cities.find((c) => c.slug === "lagos") ?? cities[0];
    return (
      <div className="space-y-5">
        {nav}
        <BasicsForm
          vendorId={null}
          initial={{ name: "", tagline: "", description_md: "", category_id: "", city_id: lagos?.id ?? "", area_id: "", address_line: "", lat: lagos?.lat ?? 6.5244, lng: lagos?.lng ?? 3.3792 }}
          categories={categories}
          cities={cities}
          areas={areas}
          mapboxToken={MAPBOX_TOKEN}
          basePath={basePath}
          nextHref={`${basePath}?step=contact`}
        />
      </div>
    );
  }

  const v = await getVendorForEditing(session, vendorId);
  const back = href(prevStep(step, steps)) ?? undefined;
  const next = href(nextStep(step, steps)) ?? "/vendor";

  let body: React.ReactNode;
  switch (step) {
    case "basics":
      body = (
        <BasicsForm
          vendorId={v.id}
          initial={{
            name: v.name, tagline: v.tagline ?? "", description_md: v.description_md ?? "", category_id: v.category_id,
            city_id: v.city_id, area_id: v.area_id ?? "", address_line: v.address_line ?? "",
            lat: (v as unknown as { lat: number }).lat, lng: (v as unknown as { lng: number }).lng,
          }}
          categories={categories}
          cities={cities}
          areas={areas}
          mapboxToken={MAPBOX_TOKEN}
          basePath={basePath}
          nextHref={next}
        />
      );
      break;
    case "contact":
      body = (
        <ContactForm
          vendorId={v.id}
          backHref={back ?? basePath}
          nextHref={next}
          initial={{
            phone: v.phone ?? "", whatsapp: v.whatsapp ?? "", email: v.email ?? "", website_url: v.website_url ?? "",
            booking_url: v.booking_url ?? "", instagram_handle: v.instagram_handle ?? "", tiktok_handle: v.tiktok_handle ?? "", x_handle: v.x_handle ?? "",
          }}
        />
      );
      break;
    case "photos":
      body = (
        <PhotosStep
          vendorId={v.id}
          coverUrl={v.cover_image_url}
          logoUrl={v.logo_url}
          gallery={((Array.isArray(v.gallery) ? v.gallery : []) as unknown as GalleryItem[]).map((g) => ({ url: g.url, path: g.path }))}
          maxGallery={MAX_GALLERY}
          backHref={back ?? basePath}
          nextHref={next}
        />
      );
      break;
    case "details":
      body = (
        <DetailsForm
          vendorId={v.id}
          backHref={back ?? basePath}
          nextHref={next}
          initial={{
            opening_hours: parseOpeningHours(v.opening_hours), price_band: (v.price_band ?? null) as PriceBand | null,
            dress_code: v.dress_code ?? "", age_policy: v.age_policy ?? "", parking_note: v.parking_note ?? "",
            late_night_area_note: v.late_night_area_note ?? "", features: v.features,
          }}
        />
      );
      break;
    case "prices": {
      const { data: prices } = await session.supabase
        .from("vendor_prices")
        .select("id, label, amount_ngn, note")
        .eq("vendor_id", v.id)
        .order("amount_ngn");
      body = (
        <PricesEditor
          vendorId={v.id}
          backHref={back}
          nextHref={next}
          initial={(prices ?? []).map((p) => ({ id: p.id, label: p.label, amount_ngn: String(p.amount_ngn), note: p.note ?? "" }))}
        />
      );
      break;
    }
    case "review": {
      const check = checkSubmission(v);
      const suggestions = [
        !v.cover_image_url && "Add a cover photo",
        !v.opening_hours || Object.keys(v.opening_hours as object).length === 0 ? "Add opening hours" : null,
        !v.price_band && "Set a price band",
        !v.tagline && "Add a tagline",
      ].filter((s): s is string => Boolean(s));
      body = (
        <ReviewStep
          vendorId={v.id}
          completeness={(v as unknown as { vendor_completeness: number | null }).vendor_completeness ?? 0}
          missing={check.missing}
          suggestions={suggestions}
          status={v.status}
          backHref={back ?? basePath}
        />
      );
      break;
    }
  }

  return (
    <div className="space-y-5">
      {nav}
      {body}
    </div>
  );
}
