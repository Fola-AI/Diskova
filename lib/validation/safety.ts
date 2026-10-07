import { z } from "zod";

import { ISSUE_CATEGORIES } from "@/lib/safety/copy";

export const issueReportSchema = z.object({
  category: z.enum(ISSUE_CATEGORIES.map((c) => c.value) as [string, ...string[]], { error: "Choose what this is about." }),
  description: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((v) => v.toLowerCase() || null)
    .pipe(z.email("Enter a valid email address.").nullable())
    .optional()
    .transform((v) => v ?? null),
  city_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
  area_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  /** Honeypot — real people never fill this in. */
  website: z.string().optional(),
});
