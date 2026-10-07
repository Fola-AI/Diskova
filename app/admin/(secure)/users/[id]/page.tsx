import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { userActionForm } from "@/app/admin/(secure)/users/actions";
import { ActionForm, type ActionChoice } from "@/components/admin/action-form";
import { AuditList } from "@/components/admin/audit-list";
import { NoteForm } from "@/components/admin/note-form";
import { RoleForm } from "@/components/admin/role-form";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/roles";
import { getUserDetail } from "@/lib/services/admin/users";

/** §11.4 user detail: profile, sanctions, posts, informational network signals, timeline, notes. */
export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("moderator", `/admin/users/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getUserDetail(session, id);
  if (!d) notFound();
  const p = d.profile;
  const isAdmin = roleAtLeast(session.profile.role, "admin");
  const isSuper = session.profile.role === "super_admin";
  const self = id === session.user.id;
  const choices: ActionChoice[] = [
    { value: "warn", label: "Warn" },
    { value: "suspend", label: "Suspend (days)", destructive: true },
    { value: "shadowban", label: "Shadowban", destructive: true },
    { value: "lift", label: "Lift all sanctions" },
    ...(isAdmin
      ? [
          { value: "ban", label: "Ban", destructive: true },
          { value: "reset_trust", label: "Reset trust" },
          { value: "force_logout", label: "Force logout" },
          { value: "delete", label: "Delete & anonymise", destructive: true },
        ]
      : []),
  ];
  const base = `/admin/users/${id}`;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link href="/admin/users" className="text-xs text-muted-foreground underline-offset-4 hover:underline">← Users</Link>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
          @{p.username}
          <Badge variant="outline">{p.role.replace("_", " ")}</Badge>
          <Badge variant={p.status === "active" ? "secondary" : "destructive"}>{p.status}</Badge>
          {p.is_shadowbanned ? <Badge variant="destructive">shadowbanned</Badge> : null}
          {p.deleted_at ? <Badge variant="destructive">deleted</Badge> : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          {p.display_name ? `${p.display_name} · ` : ""}joined {format(new Date(p.created_at), "d MMM yyyy")} · trust {p.trust_score} · {p.points} points · {p.post_count} posts
          {p.last_seen_at ? ` · seen ${formatDistanceToNowStrict(new Date(p.last_seen_at), { addSuffix: true })}` : ""}
          {d.email ? ` · ${d.email}` : ""}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Actions</h2>
          {self ? <p className="text-sm text-muted-foreground">You can&apos;t sanction your own account.</p> : <ActionForm action={userActionForm} hidden={{ userId: id }} choices={choices} withDays testId="user-actions" reasonPlaceholder="Reason (required; recorded in the audit log)" />}
          {isSuper && !self ? (
            <div className="border-t pt-3">
              <h3 className="mb-2 text-sm font-medium">Role</h3>
              <RoleForm userId={id} role={p.role} />
            </div>
          ) : null}
        </section>

        <section className="space-y-2 rounded-xl border p-4 text-sm">
          <h2 className="font-semibold">Sanctions</h2>
          <ul className="space-y-1.5">
            {d.sanctions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline gap-2">
                <Badge variant={s.lifted_at ? "outline" : "destructive"}>{s.kind}</Badge>
                <span className="flex-1">{s.reason}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(s.issued_at), "d MMM")}
                  {s.expires_at ? ` → ${format(new Date(s.expires_at), "d MMM")}` : ""}
                  {s.lifted_at ? " · lifted" : ""}
                </span>
              </li>
            ))}
            {!d.sanctions.length ? <li className="text-muted-foreground">None.</li> : null}
          </ul>
          {d.network ? (
            <div className="mt-3 rounded-md border border-dashed p-2 text-xs" data-testid="network-info">
              <p className="font-medium">Network (informational only — shared IPs are normal on Nigerian mobile networks)</p>
              <p>Signup IP {d.network.signup_ip ?? "—"} · last IP {d.network.last_ip ?? "—"} · {d.network.accounts_sharing_ip} other account(s) on the same IP</p>
              <p className="truncate">UA {d.network.signup_ua ?? "—"}</p>
            </div>
          ) : null}
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Recent posts</h2>
        <ul className="divide-y rounded-xl border text-sm">
          {d.posts.map((post) => {
            const vendor = (post as unknown as { vendor: { slug: string; name: string } | null }).vendor;
            return (
              <li key={post.id} className="flex flex-wrap gap-2 p-3">
                <Badge variant="outline">{post.kind}</Badge>
                <Badge variant={post.status === "published" ? "secondary" : "destructive"}>{post.status}</Badge>
                <span className="flex-1">{post.body ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{vendor?.name} · {formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true })}</span>
              </li>
            );
          })}
          {!d.posts.length ? <li className="p-3 text-muted-foreground">No posts.</li> : null}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Notes</h2>
        <NoteForm entityType="public.profiles" entityId={id} back={base} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Timeline</h2>
        <AuditList rows={d.timeline} />
      </section>
    </div>
  );
}
