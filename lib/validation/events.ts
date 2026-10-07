import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";

import { DEFAULT_TIMEZONE } from "@/lib/config";
import { safeExternalUrl } from "@/lib/directory/links";

import { EVENT_CATEGORIES, type EventCategory } from "@/lib/validation/constants";

export { EVENT_CATEGORIES, type EventCategory } from "@/lib/validation/constants";

/** "2026-12-20T21:00" (venue-local, from <input type="datetime-local">) → UTC ISO string. */
export function localToUtcIso(local: string, timeZone = DEFAULT_TIMEZONE): string {
  return fromZonedTime(local, timeZone).toISOString();
}

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.");
const money = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(/[₦,\s]/g, ""))), z.number().int().min(0).max(100_000_000).nullable());

export const eventSubmitSchema = z
  .object({
    title: z.string().trim().min(3, "Give the event a title.").max(140),
    description_md: z.string().trim().max(20000).optional().transform((v) => v || null),
    city_id: z.uuid("Choose a city."),
    area_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
    venue_vendor_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
    venue_name_freeform: z.string().trim().max(140).optional().transform((v) => v || null),
    vendor_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
    starts_local: localDateTime,
    ends_local: z.union([localDateTime, z.literal("")]).optional().transform((v) => v || null),
    category: z.enum(EVENT_CATEGORIES.map((c) => c.value) as [EventCategory, ...EventCategory[]]),
    ticket_url: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const safe = safeExternalUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`);
        if (!safe) {
          ctx.addIssue({ code: "custom", message: "Enter a valid ticket link." });
          return z.NEVER;
        }
        return safe;
      }),
    is_free: z.union([z.literal("on"), z.literal(""), z.boolean()]).optional().transform((v) => v === "on" || v === true),
    price_from_ngn: money.optional().transform((v) => v ?? null),
    price_to_ngn: money.optional().transform((v) => v ?? null),
  })
  .superRefine((v, ctx) => {
    if (!v.venue_vendor_id && !v.venue_name_freeform) {
      ctx.addIssue({ code: "custom", path: ["venue_name_freeform"], message: "Choose a listed venue or type the venue name." });
    }
    if (v.ends_local && v.ends_local <= v.starts_local) {
      ctx.addIssue({ code: "custom", path: ["ends_local"], message: "The end must be after the start." });
    }
    if (v.price_from_ngn !== null && v.price_to_ngn !== null && v.price_to_ngn < v.price_from_ngn) {
      ctx.addIssue({ code: "custom", path: ["price_to_ngn"], message: "Max price must be at least the min price." });
    }
  });

export type EventSubmitInput = z.input<typeof eventSubmitSchema>;
