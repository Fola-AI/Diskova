import * as Sentry from "@sentry/nextjs";
import type { ReactElement } from "react";
import { Resend } from "resend";

import { serverEnv } from "@/lib/env.server";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/email/send");

export interface SendResult {
  sent: boolean;
  skipped?: "no_api_key" | "no_recipient";
  id?: string;
}

let client: Resend | null | undefined;

function resend(): Resend | null {
  if (client === undefined) {
    const key = serverEnv().RESEND_API_KEY;
    client = key ? new Resend(key) : null;
  }
  return client;
}

/**
 * Send a transactional email. Never throws — email must not break the action that triggers it.
 * Without RESEND_API_KEY (DEV today) the send is skipped and logged.
 */
export async function sendEmail(opts: { to: string | string[] | null | undefined; subject: string; react: ReactElement }): Promise<SendResult> {
  const to = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter((v): v is string => Boolean(v));
  if (!to.length) return { sent: false, skipped: "no_recipient" };
  const r = resend();
  const from = serverEnv().EMAIL_FROM;
  if (!r || !from) {
    console.info(`[email] skipped (no RESEND_API_KEY): "${opts.subject}"`);
    return { sent: false, skipped: "no_api_key" };
  }
  try {
    const { data, error } = await r.emails.send({ from, to, subject: opts.subject, react: opts.react });
    if (error) throw new Error(error.message);
    return { sent: true, id: data?.id };
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "email" } });
    return { sent: false };
  }
}

/** Where admin notifications go: EMAIL_ADMIN_TO, else SUPER_ADMIN_EMAIL. */
export function adminRecipients(): string[] {
  const env = serverEnv();
  return [env.EMAIL_ADMIN_TO || env.SUPER_ADMIN_EMAIL].filter((v): v is string => Boolean(v));
}
