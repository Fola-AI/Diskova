import { z } from "zod";

import { REPORT_REASON_VALUES } from "@/lib/validation/constants";

export { REPORT_REASONS, VIBES } from "@/lib/validation/constants";

const optionalNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().min(min).max(max).nullable());

const coords = {
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  /** The user ticked "use my location" just now — counts as explicit location consent (§7.12). */
  consentNow: z.boolean().optional(),
};

export const pulseSchema = z.object({
  vendorId: z.uuid(),
  crowdLevel: z.number().int().min(1).max(5),
  ...coords,
});

export const checkinSchema = z.object({
  vendorId: z.uuid(),
  crowdLevel: z.number().int().min(1).max(5),
  vibe: z.number().int().min(1).max(5),
  waitMinutes: optionalNumber(0, 600),
  coverFeeNgn: optionalNumber(0, 10_000_000),
  note: z
    .string()
    .trim()
    .max(500, "Keep notes under 500 characters.")
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  photoCount: z.number().int().min(0).max(4),
  ...coords,
});

export const reportSchema = z.object({
  entityType: z.enum(["post", "vendor", "event", "profile", "qa_question", "qa_answer"]),
  entityId: z.uuid(),
  reason: z.enum(REPORT_REASON_VALUES),
  details: z.string().trim().max(1000).optional().transform((v) => v || null),
});


