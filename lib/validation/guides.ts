import slugify from "slugify";
import { z } from "zod";

export const GUIDE_TYPES = [
  { value: "city_guide", label: "City guide" },
  { value: "area_guide", label: "Area guide" },
  { value: "daytime", label: "Daytime" },
  { value: "toolkit", label: "Diaspora toolkit" },
  { value: "blog", label: "Blog" },
  { value: "safety_page", label: "Safety page" },
] as const;
export type GuideTypeValue = (typeof GUIDE_TYPES)[number]["value"];
export const CITY_SCOPED: GuideTypeValue[] = ["city_guide", "area_guide", "daytime", "safety_page"];

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

export const guideSchema = z
  .object({
    title: z.string().trim().min(3, "Add a title.").max(160),
    slug: z.string().trim().max(90).optional().transform((v) => v ?? ""),
    type: z.enum(GUIDE_TYPES.map((t) => t.value) as [GuideTypeValue, ...GuideTypeValue[]]),
    city_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
    excerpt: opt(400),
    body_md: z.string().max(100_000, "That's too long for one guide."),
    cover_image_url: z.union([z.url(), z.literal("")]).optional().transform((v) => v || null),
    tags: z
      .string()
      .optional()
      .transform((v) => [...new Set((v ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12)),
    seo_title: opt(70),
    seo_description: opt(170),
  })
  .transform((v) => ({ ...v, slug: slugify(v.slug || v.title, { lower: true, strict: true }).slice(0, 90).replace(/-+$/, "") }))
  .superRefine((v, ctx) => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug)) ctx.addIssue({ code: "custom", path: ["slug"], message: "Use letters, numbers and dashes." });
    if (CITY_SCOPED.includes(v.type) && !v.city_id) ctx.addIssue({ code: "custom", path: ["city_id"], message: "Choose a city for this type." });
  });

export type GuideInput = z.input<typeof guideSchema>;
