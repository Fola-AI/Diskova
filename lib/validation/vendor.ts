import { z } from "zod";

import { FEATURE_KEYS } from "@/lib/directory/constants";
import { normaliseNgPhone, safeExternalUrl } from "@/lib/directory/links";
import { openingHoursSchema } from "@/lib/services/opening-hours";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v, ctx) => {
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const safe = safeExternalUrl(withScheme);
    if (!safe) {
      ctx.addIssue({ code: "custom", message: "Enter a valid web address." });
      return z.NEVER;
    }
    return safe;
  })
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .transform((v, ctx) => {
    if (!v) return null;
    if (!normaliseNgPhone(v)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 0803 123 4567." });
      return z.NEVER;
    }
    return v;
  })
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const handle = z
  .string()
  .trim()
  .max(31)
  .transform((v) => v.replace(/^@/, ""))
  .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), "Letters, numbers, dots and underscores only.")
  .transform((v) => v || null)
  .nullable()
  .optional()
  .transform((v) => v ?? null);

/** Nigeria bounding box (generous). */
export const latSchema = z.coerce.number().min(4).max(14);
export const lngSchema = z.coerce.number().min(2.5).max(15);

export const vendorBasicsSchema = z.object({
  name: z.string().trim().min(2, "Enter your venue's name.").max(120),
  tagline: optionalText(160),
  description_md: optionalText(10000),
  category_id: z.uuid("Choose a category."),
  secondary_category_ids: z.array(z.uuid()).max(3).default([]),
  city_id: z.uuid("Choose a city."),
  area_id: z.uuid("Choose an area."),
  address_line: optionalText(200),
  lat: latSchema,
  lng: lngSchema,
});

export const vendorContactSchema = z.object({
  phone: optionalPhone,
  whatsapp: optionalPhone,
  email: z
    .string()
    .trim()
    .max(254)
    .transform((v) => v.toLowerCase() || null)
    .pipe(z.email("Enter a valid email address.").nullable())
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  website_url: optionalUrl,
  booking_url: optionalUrl,
  instagram_handle: handle,
  tiktok_handle: handle,
  x_handle: handle,
});

export const vendorDetailsSchema = z.object({
  opening_hours: openingHoursSchema.default({}),
  price_band: z.enum(["free", "budget", "mid", "premium", "luxury"]).nullable().default(null),
  dress_code: optionalText(120),
  age_policy: optionalText(120),
  parking_note: optionalText(200),
  late_night_area_note: optionalText(300),
  features: z.array(z.enum(FEATURE_KEYS as [string, ...string[]])).max(15).default([]),
});

export const vendorPriceSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().trim().min(1, "Add a label.").max(80),
  amount_ngn: z.coerce.number().int("Whole naira only.").min(0).max(100_000_000),
  note: optionalText(200),
});
export const vendorPricesSchema = z.array(vendorPriceSchema).max(30);

export const VENDOR_STEPS = ["basics", "contact", "photos", "details", "prices", "review"] as const;
export type VendorStep = (typeof VENDOR_STEPS)[number];

export const officialUpdateSchema = z.object({
  vendorId: z.uuid(),
  crowdLevel: z.coerce.number().int().min(1).max(5),
  note: optionalText(280),
  incomingPath: z.string().max(200).nullable().optional(),
});

export type VendorBasicsInput = z.input<typeof vendorBasicsSchema>;
export type VendorContactInput = z.input<typeof vendorContactSchema>;
export type VendorDetailsInput = z.input<typeof vendorDetailsSchema>;
