import { z } from "zod";

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
  entityType: z.enum(["post", "vendor", "event", "profile"]),
  entityId: z.uuid(),
  reason: z.enum(["fake", "spam", "abuse", "dangerous", "wrong_venue", "rival_sabotage", "copyright", "other"]),
  details: z.string().trim().max(1000).optional().transform((v) => v || null),
});

export const VIBES = [
  { level: 1, label: "Flat" },
  { level: 2, label: "Easy" },
  { level: 3, label: "Good" },
  { level: 4, label: "Lit" },
  { level: 5, label: "Electric" },
] as const;

export const REPORT_REASONS: Array<{ value: z.infer<typeof reportSchema>["reason"]; label: string }> = [
  { value: "fake", label: "Fake or misleading" },
  { value: "wrong_venue", label: "Not from this venue" },
  { value: "spam", label: "Spam or advertising" },
  { value: "abuse", label: "Abusive or hateful" },
  { value: "dangerous", label: "Dangerous or illegal" },
  { value: "rival_sabotage", label: "Rival trying to harm the venue" },
  { value: "copyright", label: "My photo used without permission" },
  { value: "other", label: "Something else" },
];
