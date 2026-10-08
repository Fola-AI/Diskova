import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";

/** Route-handler input schemas (§7.4: zod on every Route Handler, including GET params). */
export const slugParam = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);

export const calendarQuery = z.object({
  city: slugParam.optional().catch(undefined),
  season: z.literal("december").optional().catch(undefined),
});

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const satisfies readonly EmailOtpType[];

export const authCallbackQuery = z.object({
  code: z.string().min(8).max(512).regex(/^[A-Za-z0-9_-]+$/).optional().catch(undefined),
  token_hash: z.string().min(8).max(512).regex(/^[A-Za-z0-9_.-]+$/).optional().catch(undefined),
  type: z.enum(OTP_TYPES).optional().catch(undefined),
  next: z.string().max(512).optional().catch(undefined),
});
