import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import { bulkVendorFormAction } from "@/app/admin/(secure)/vendors/actions";
import { ActionForm } from "@/components/admin/action-form";
import { DataTable, type Column } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { flag, one, pageOf, pick, sortOf, uuidParam, type SearchParams } from "@/lib/admin/params";
import { PAGE_SIZE } from "@/lib/services/admin/common";
import { listVendorsTable } from "@/lib/services/admin/vendors";

const SORTS = ["name", "city", "status", "completeness", "posts_7d", "official_updates_7d", "open_reports", "last_activity_at", "created_at"] as const;
const STATUSES = ["draft", "pending_review", "published", "suspended", "rejected"] as const;

type Row = Awaited<ReturnType<typeof listVendorsTable>>["rows"][number];

const ago = (v: string | null) => (v ? formatDistanceToNowStrict(new Date(v), { addSuffix: true }) : "—");

/** §11.2 full vendor table: every column, filters incl. no prices / no photos / never posted, bulk actions, export. */
export async function VendorTable({ sp }: { sp: SearchParams }) {
  const page = pageOf(sp);
  const { sort, desc } = sortOf(sp, SORTS, "created_at");
  const filters = {
    q: one(sp, "q"),
    status: pick(one(sp, "status"), STATUSES),
    cityId: uuidParam(sp, "city"),
    categoryId: uuidParam(sp, "category"),
    verified: flag(sp, "verified"),
    claim: pick(one(sp, "claim"), ["unclaimed", "claimed"] as const),
    noPrices: flag(sp, "no_prices") ?? false,
    noPhotos: flag(sp, "no_photos") ?? false,
    neverPosted: flag(sp, "never_posted") ?? false,
  };
  const admin = getAdminSupabase();
  const [{ rows, total }, { data: cities }, { data: categories }] = await Promise.all([
    listVendorsTable({ ...filters, sort, desc, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    admin.from("cities").select("id, name").order("sort_order"),
    admin.from("categories").select("id, name").order("name"),
  ]);

  const columns: Column<Row>[] = [
    { key: "name", label: "Name", sortable: true, render: (r) => <Link href={`/admin/vendors/${r.id}`} className="font-medium underline-offset-4 hover:underline">{r.name}</Link> },
    { key: "city", label: "City", sortable: true },
    { key: "area", label: "Area", mobile: "detail" },
    { key: "category", label: "Category" },
    { key: "status", label: "Status", sortable: true, mobile: "meta", render: (r) => <Badge variant={r.status === "published" ? "secondary" : r.status === "suspended" ? "destructive" : "outline"}>{r.status.replace("_", " ")}</Badge> },
    { key: "verified", label: "Verified", render: (r) => (r.verified ? <Badge variant="gold">Verified</Badge> : "—") },
    { key: "claim_status", label: "Claim" },
    { key: "owner_username", label: "Owner", render: (r) => (r.owner_username ? `@${r.owner_username}` : r.is_seed ? "seed" : "—") },
    { key: "completeness", label: "Complete", sortable: true, render: (r) => `${r.completeness}%` },
    { key: "official_updates_7d", label: "Official 7d", sortable: true },
    { key: "posts_7d", label: "Posts 7d", sortable: true },
    { key: "open_reports", label: "Reports", sortable: true },
    { key: "last_activity_at", label: "Last activity", sortable: true, render: (r) => ago(r.last_activity_at) },
    { key: "created_at", label: "Created", sortable: true, render: (r) => ago(r.created_at) },
  ];

  const basePath = "/admin/vendors";
  const exportQuery = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "page" && k !== "tab" ? [[k, v]] : [])));
  return (
    <div className="space-y-4">
      <FilterBar
        basePath={basePath}
        sp={sp}
        presetKey="vendors"
        hidden={{ tab: "all" }}
        fields={[
          { name: "q", label: "Search", type: "text" },
          { name: "status", label: "Status", type: "select", options: STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") })) },
          { name: "city", label: "City", type: "select", options: (cities ?? []).map((c) => ({ value: c.id, label: c.name })) },
          { name: "category", label: "Category", type: "select", options: (categories ?? []).map((c) => ({ value: c.id, label: c.name })) },
          { name: "verified", label: "Verified", type: "select", options: [{ value: "1", label: "Verified" }, { value: "0", label: "Not verified" }] },
          { name: "claim", label: "Claim", type: "select", options: [{ value: "unclaimed", label: "Unclaimed" }, { value: "claimed", label: "Claimed" }] },
          { name: "no_prices", label: "No prices", type: "checkbox" },
          { name: "no_photos", label: "No photos", type: "checkbox" },
          { name: "never_posted", label: "Never posted", type: "checkbox" },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        basePath={basePath}
        sp={{ ...sp, tab: "all" }}
        sort={sort}
        desc={desc}
        exportHref={`/admin/export/vendors?${exportQuery.toString()}`}
        bulkFormId="vendor-bulk"
        testId="vendor-table"
      />
      <div className="surface space-y-3 rounded-2xl p-4">
        <div>
          <p className="text-callout font-semibold">Bulk action on selected rows</p>
          <p className="text-footnote text-muted-foreground">Tick rows above, then choose an action.</p>
        </div>
        <ActionForm formId="vendor-bulk" action={bulkVendorFormAction} choices={[{ value: "approve", label: "Approve selected" }, { value: "suspend", label: "Suspend selected", destructive: true }]} reasonPlaceholder="Reason (required to suspend)" />
      </div>
    </div>
  );
}
