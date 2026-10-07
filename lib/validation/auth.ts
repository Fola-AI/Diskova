import { z } from "zod";

export const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

/** Mirrors the Supabase project policy: ≥ 8 chars with lower, upper and a digit. */
export const passwordSchema = z
  .string({ error: "Enter a password." })
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().max(512).optional(),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  terms: z.literal("on", { error: "Please accept the Terms and Privacy Policy." }),
});

export const emailOnlySchema = z.object({ email: emailSchema, next: z.string().max(512).optional() });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters.")
  .max(30, "Use 30 characters or fewer.")
  .regex(/^[A-Za-z0-9_]+$/, "Letters, numbers and underscores only.")
  .refine((v) => !/^deleted_/i.test(v), "That username isn't available.");

export const profileSchema = z.object({
  username: usernameSchema,
  display_name: z.string().trim().max(60, "Use 60 characters or fewer.").transform((v) => v || null),
  bio: z.string().trim().max(280, "Use 280 characters or fewer.").transform((v) => v || null),
  home_city_id: z
    .union([z.uuid(), z.literal("")])
    .transform((v) => v || null),
  is_diaspora: z.enum(["yes", "no", ""]).transform((v) => (v === "yes" ? true : v === "no" ? false : null)),
  location_consent: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((v) => v === "on"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Flatten zod issues into { field: [messages] } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function formObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") obj[k] = v;
  return obj;
}
