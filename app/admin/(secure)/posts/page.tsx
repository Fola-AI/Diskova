import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import { bulkPostForm } from "@/app/admin/(secure)/posts/actions";
import { ActionForm } from "@/components/admin/action-form";
import { DataTable, type Column } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { flag, one, pageOf, pick, sortOf, type SearchParams } from "@/lib/admin/params";
import { requireRole } from "@/lib/auth/guards";
import { Constants } from "@/lib/db/types";
import { PAGE_SIZE } from "@/lib/services/admin/common";
import { listPostsAdmin } from "@/lib/services/admin/posts";

const E = Constants.public.Enums;
const SORTS = ["created_at", "report_count", "like_count", "crowd_level"] as const;
type Row = Awaited<ReturnType<typeof listPostsAdmin>>["rows"][number];
const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x.replace(/_/g, " ") }));

/** §11.5 posts in every status, full filters, bulk hide/remove (reason required, audited). */
export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("moderator", "/admin/posts");
  const sp = await searchParams;
  const page = pageOf(sp);
  const { sort, desc } = sortOf(sp, SORTS, "created_at");
  const since = one(sp, "since");
  const { rows, total } = await listPostsAdmin({
    status: pick(one(sp, "status"), E.post_status),
    kind: pick(one(sp, "kind"), E.post_kind),
    hold: pick(one(sp, "hold"), E.hold_reason),
    decision: pick(one(sp, "decision"), E.moderation_decision),
    vendor: one(sp, "vendor"),
    author: one(sp, "author"),
    since: since && /^\d{4}-\d{2}-\d{2}$/.test(since) ? `${since}T00:00:00+01:00` : undefined,
    reported: flag(sp, "reported"),
    sort,
    desc,
    offset: (page - 1) * PAGE_SIZE,
  });

  const columns: Column<Row>[] = [
    { key: "kind", label: "Kind", render: (r) => <Badge variant="outline">{r.kind}</Badge> },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "published" ? "secondary" : "destructive"}>{r.status}{r.hold_reason !== "none" ? ` · ${r.hold_reason.replace(/_/g, " ")}` : ""}</Badge> },
    { key: "body", label: "Body", className: "md:max-w-xs", mobile: "title", render: (r) => <span className="line-clamp-2">{r.body ?? "—"}</span> },
    { key: "vendor", label: "Venue", render: (r) => <Link href={`/v/${r.vendor.slug}`} className="underline-offset-4 hover:underline">{r.vendor.name}</Link> },
    { key: "author", label: "Author", render: (r) => `@${r.author.username} (${r.author.trust_score})` },
    { key: "moderation_decision", label: "Decision" },
    { key: "crowd_level", label: "Crowd", sortable: true },
    { key: "report_count", label: "Reports", sortable: true },
    { key: "like_count", label: "Likes", sortable: true },
    { key: "created_at", label: "Posted", sortable: true, render: (r) => formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true }) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-title font-semibold sm:text-display">Posts</h1>
      <FilterBar
        basePath="/admin/posts"
        sp={sp}
        presetKey="posts"
        fields={[
          { name: "status", label: "Status", type: "select", options: opts(E.post_status) },
          { name: "kind", label: "Kind", type: "select", options: opts(E.post_kind) },
          { name: "hold", label: "Hold", type: "select", options: opts(E.hold_reason) },
          { name: "decision", label: "Decision", type: "select", options: opts(E.moderation_decision) },
          { name: "vendor", label: "Venue", type: "text" },
          { name: "author", label: "Author", type: "text" },
          { name: "since", label: "Since", type: "date" },
          { name: "reported", label: "Reported only", type: "checkbox" },
        ]}
      />
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} total={total} page={page} pageSize={PAGE_SIZE} basePath="/admin/posts" sp={sp} sort={sort} desc={desc} bulkFormId="post-bulk" testId="post-table" />
      <div className="surface space-y-3 rounded-2xl p-4">
        <div>
          <p className="text-callout font-semibold">Bulk action on selected posts</p>
          <p className="text-footnote text-muted-foreground">Tick rows above, then choose an action.</p>
        </div>
        <ActionForm formId="post-bulk" action={bulkPostForm} testId="post-bulk-form" choices={[{ value: "hide", label: "Hide selected", destructive: true }, { value: "remove", label: "Remove selected", destructive: true }]} reasonPlaceholder="Reason (required)" />
      </div>
    </div>
  );
}
