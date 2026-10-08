"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import type { FormState } from "@/components/forms/form-state";
import { writeAudit } from "@/lib/admin-db/audit";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requireRecentMfa } from "@/lib/auth/recent-mfa";
import { requestMeta } from "@/lib/http/request-meta";
import { createAgentKey, revokeAgentKey } from "@/lib/services/admin/agent-keys";
import { runPlatformExport } from "@/lib/services/admin/exports";
import { updateSettings } from "@/lib/services/admin/settings";

export async function saveSettingsForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("super_admin", "/admin/settings");
  try {
    await updateSettings(session, Object.fromEntries(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved." };
}

export async function requestExportForm(_prev: FormState): Promise<FormState> {
  void _prev;
  const session = await requireRole("super_admin", "/admin/settings");
  const meta = await requestMeta();
  await writeAudit({ action: "export.platform_requested", entityType: "storage.exports", entityId: null, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  after(async () => {
    try {
      await runPlatformExport(session, session.user.email ?? null, meta);
    } catch (err) {
      console.error("platform export failed", err);
    }
  });
  return { ok: true, message: "Export started. You'll get an email with a download link, and it will appear below in a minute." };
}

export interface CreateKeyState extends FormState {
  key?: string;
}

/** §12: super_admin + a fresh MFA code. The plaintext key is returned once and never stored. */
export async function createAgentKeyForm(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const session = await requireRole("super_admin", "/admin/settings");
  await requireRecentMfa(session, "/admin/settings#agent-keys");
  try {
    const res = await createAgentKey(
      session,
      {
        name: formData.get("name"),
        scopes: formData.getAll("scopes").map(String),
        ipAllowlist: String(formData.get("ip_allowlist") ?? "").split(/[\s,]+/).filter(Boolean),
        expiresInDays: formData.get("expires_in_days") || 90,
      },
      await requestMeta(),
    );
    revalidatePath("/admin/settings");
    return { ok: true, message: `Key created (expires ${res.expiresAt.slice(0, 10)}). Copy it now — it won't be shown again.`, key: res.key };
  } catch (err) {
    return toFormState(err);
  }
}

export async function revokeAgentKeyForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("super_admin", "/admin/settings");
  await requireRecentMfa(session, "/admin/settings#agent-keys");
  try {
    await revokeAgentKey(session, String(formData.get("id") ?? ""), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/settings");
  return { ok: true, message: "Revoked." };
}
