import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import { DataTable, type Column } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { flag, one, pageOf, pick, sortOf, type SearchParams } from "@/lib/admin/params";
import { requireRole } from "@/lib/auth/guards";
import { roleAtLeast, USER_ROLES } from "@/lib/auth/roles";
import { PAGE_SIZE } from "@/lib/services/admin/common";
import { listUsers } from "@/lib/services/admin/users";

const SORTS = ["created_at", "username", "trust_score", "points", "post_count", "last_seen_at"] as const;
const STATUSES = ["active", "warned", "suspended", "banned"] as const;
type Row = Awaited<ReturnType<typeof listUsers>>["rows"][number];

/** §11.4 users. Email for admin+, IP info for super_admin only — both labelled informational. */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole("moderator", "/admin/users");
  const sp = await searchParams;
  const page = pageOf(sp);
  const { sort, desc } = sortOf(sp, SORTS, "created_at");
  const { rows, total } = await listUsers(session, {
    q: one(sp, "q"),
    role: pick(one(sp, "role"), USER_ROLES),
    status: pick(one(sp, "status"), STATUSES),
    shadowbanned: flag(sp, "shadowbanned"),
    sort,
    desc,
    offset: (page - 1) * PAGE_SIZE,
  });
  const showEmail = roleAtLeast(session.profile.role, "admin");
  const showIp = session.profile.role === "super_admin";
  const ago = (v: string | null) => (v ? formatDistanceToNowStrict(new Date(v), { addSuffix: true }) : "—");

  const columns: Column<Row>[] = [
    { key: "username", label: "Username", sortable: true, render: (r) => <Link href={`/admin/users/${r.id}`} className="font-medium underline-offset-4 hover:underline">@{r.username}</Link> },
    ...(showEmail ? [{ key: "email", label: "Email", render: (r: Row) => <span>{r.email}{r.email_verified ? "" : <span className="text-footnote text-muted-foreground"> (unverified)</span>}</span> }] : []),
    { key: "role", label: "Role", render: (r) => (r.role === "user" ? "user" : <Badge variant="outline">{r.role.replace("_", " ")}</Badge>) },
    { key: "status", label: "Status", render: (r) => <span>{r.status}{r.is_shadowbanned ? <Badge variant="destructive" className="ml-1">shadowbanned</Badge> : null}{r.deleted_at ? " (deleted)" : ""}</span> },
    { key: "trust_score", label: "Trust", sortable: true },
    { key: "points", label: "Points", sortable: true },
    { key: "post_count", label: "Posts", sortable: true },
    { key: "last_seen_at", label: "Last seen", sortable: true, render: (r) => ago(r.last_seen_at) },
    { key: "created_at", label: "Joined", sortable: true, render: (r) => ago(r.created_at) },
    ...(showIp ? [{ key: "last_ip", label: "Last IP (informational)", render: (r: Row) => <span className="font-mono text-footnote">{r.last_ip ?? "—"}</span> }] : []),
  ];
  const exportQuery = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "page" ? [[k, v]] : [])));

  return (
    <div className="space-y-4">
      <h1 className="text-title font-semibold sm:text-display">Users</h1>
      {showIp ? <p className="text-footnote text-muted-foreground">IP addresses are informational only — many Nigerian mobile users share one IP (carrier-grade NAT). Never sanction on IP alone.</p> : null}
      <FilterBar
        basePath="/admin/users"
        sp={sp}
        presetKey="users"
        fields={[
          { name: "q", label: showEmail ? "Username, name or email" : "Username or name", type: "text" },
          { name: "role", label: "Role", type: "select", options: USER_ROLES.map((r) => ({ value: r, label: r.replace("_", " ") })) },
          { name: "status", label: "Status", type: "select", options: STATUSES.map((s) => ({ value: s, label: s })) },
          { name: "shadowbanned", label: "Shadowbanned only", type: "checkbox" },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        basePath="/admin/users"
        sp={sp}
        sort={sort}
        desc={desc}
        exportHref={showIp ? `/admin/export/users?${exportQuery.toString()}` : undefined}
        testId="user-table"
      />
    </div>
  );
}
