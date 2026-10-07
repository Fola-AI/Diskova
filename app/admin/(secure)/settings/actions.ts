"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import type { FormState } from "@/components/forms/form-state";
import { writeAudit } from "@/lib/admin-db/audit";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
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
