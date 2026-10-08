import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import type { Database } from "@/lib/db/types";
import { guideHref } from "@/lib/db/guides";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";
import { guideSchema } from "@/lib/validation/guides";

assertServerOnly("lib/services/admin/content");

type GuideStatus = Database["public"]["Enums"]["guide_status"];

export async function listGuidesAdmin(filters: { type?: string; status?: string; q?: string }) {
  let q = getAdminSupabase()
    .from("guides")
    .select("id, slug, type, title, status, updated_at, published_at, city:cities(slug, name)")
    .is("deleted_at", null);
  if (filters.type) q = q.eq("type", filters.type as never);
  if (filters.status) q = q.eq("status", filters.status as never);
  if (filters.q) q = q.ilike("title", `%${filters.q.replace(/[%_\\]/g, "")}%`);
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getGuideAdmin(id: string) {
  const admin = getAdminSupabase();
  const [{ data: guide }, { data: revisions }] = await Promise.all([
    admin.from("guides").select("*, city:cities(slug, name)").eq("id", id).maybeSingle(),
    admin.from("guide_revisions").select("id, saved_at, saved_by, body_md").eq("guide_id", id).order("saved_at", { ascending: false }).limit(30),
  ]);
  return guide ? { guide, revisions: revisions ?? [] } : null;
}

function revalidateGuide(g: { type: Database["public"]["Enums"]["guide_type"]; slug: string; city: { slug: string } | null }) {
  safeRevalidatePath(guideHref(g));
  safeRevalidatePath(g.type === "toolkit" ? "/toolkit" : g.type === "blog" ? "/blog" : "/guides");
  if (g.city) safeRevalidatePath(`/guides/${g.city.slug}`);
  safeRevalidatePath("/sitemap.xml");
}

/** Create or update a guide (admin+). Body changes create a revision (trigger); every save is audited. */
export async function saveGuide(session: SessionContext, id: string | null, raw: unknown, meta: StaffMeta): Promise<{ id: string; slug: string }> {
  const input = guideSchema.parse(raw);
  const admin = getAdminSupabase();
  const { data: clash } = await admin.from("guides").select("id").eq("slug", input.slug).maybeSingle();
  if (clash && clash.id !== id) throw new AdminActionError("Another guide already uses that slug.");
  const row = { ...input, updated_by: session.user.id };

  if (id) {
    const { data: before } = await admin.from("guides").select("title, slug, status").eq("id", id).single();
    const { data, error } = await admin.from("guides").update(row).eq("id", id).select("id, slug, type, city:cities(slug)").single();
    if (error || !data) throw new AdminActionError("Couldn't save the guide.");
    await writeAudit({ action: "content.guide_saved", entityType: "public.guides", entityId: id, before, after: { title: input.title, slug: input.slug }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
    revalidateGuide(data as never);
    return { id: data.id, slug: data.slug };
  }
  const { data, error } = await admin
    .from("guides")
    .insert({ ...row, author_profile_id: session.user.id, status: "draft" })
    .select("id, slug")
    .single();
  if (error || !data) throw new AdminActionError("Couldn't create the guide.");
  await writeAudit({ action: "content.guide_created", entityType: "public.guides", entityId: data.id, after: { title: input.title, type: input.type }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  return data;
}

export async function setGuideStatus(session: SessionContext, id: string, status: GuideStatus, meta: StaffMeta): Promise<void> {
  const admin = getAdminSupabase();
  const { data: g } = await admin.from("guides").select("status, published_at, slug, type, body_md, city:cities(slug)").eq("id", id).single();
  if (!g) throw new AdminActionError("Guide not found.");
  if (status === "published" && g.body_md.trim().length < 20) throw new AdminActionError("Write the guide before publishing it.");
  const { error } = await admin
    .from("guides")
    .update({ status, updated_by: session.user.id, ...(status === "published" && !g.published_at ? { published_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) throw new AdminActionError("Couldn't change the status.");
  await writeAudit({ action: `content.guide_${status}`, entityType: "public.guides", entityId: id, before: { status: g.status }, after: { status }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  revalidateGuide(g as never);
}

export async function restoreRevision(session: SessionContext, guideId: string, revisionId: string, meta: StaffMeta): Promise<void> {
  const admin = getAdminSupabase();
  const { data: rev } = await admin.from("guide_revisions").select("body_md").eq("id", revisionId).eq("guide_id", guideId).single();
  if (!rev) throw new AdminActionError("Revision not found.");
  const { error } = await admin.from("guides").update({ body_md: rev.body_md, updated_by: session.user.id }).eq("id", guideId);
  if (error) throw new AdminActionError("Couldn't restore that revision.");
  await writeAudit({ action: "content.guide_revision_restored", entityType: "public.guides", entityId: guideId, after: { revision_id: revisionId }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}
