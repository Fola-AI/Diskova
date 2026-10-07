import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { listGuidesAdmin } from "@/lib/services/admin/content";
import { GUIDE_TYPES } from "@/lib/validation/guides";
import { cn } from "@/lib/utils";

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; q?: string }> }) {
  await requireRole("admin", "/admin/content");
  const p = await searchParams;
  const type = GUIDE_TYPES.some((t) => t.value === p.type) ? p.type : undefined;
  const status = ["draft", "review", "published", "archived"].includes(p.status ?? "") ? p.status : undefined;
  const guides = await listGuidesAdmin({ type, status, q: p.q?.slice(0, 80) });
  const qs = (o: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ type, status, q: p.q, ...o }).filter(([, v]) => v) as [string, string][]).toString();
    return s ? `?${s}` : "";
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Content</h1>
        <Button asChild><Link href="/admin/content/new"><Plus aria-hidden />New guide</Link></Button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {[{ v: undefined, l: "All types" }, ...GUIDE_TYPES.map((t) => ({ v: t.value, l: t.label }))].map((t) => (
          <Link key={t.l} href={`/admin/content${qs({ type: t.v })}`} className={cn("rounded-full border px-3 py-1", type === t.v && "border-primary bg-primary text-primary-foreground")}>{t.l}</Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {[undefined, "draft", "review", "published", "archived"].map((s) => (
          <Link key={s ?? "all"} href={`/admin/content${qs({ status: s })}`} className={cn("rounded-full border px-3 py-1", status === s && "border-primary bg-primary text-primary-foreground")}>{s ?? "Any status"}</Link>
        ))}
      </div>
      <form className="max-w-sm"><input name="q" defaultValue={p.q} placeholder="Search titles…" className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></form>
      <ul className="divide-y rounded-xl border">
        {guides.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <Link href={`/admin/content/${g.id}`} className="min-w-0 hover:underline">
              <span className="block truncate font-medium">{g.title}</span>
              <span className="text-xs text-muted-foreground">{GUIDE_TYPES.find((t) => t.value === g.type)?.label}{(g.city as unknown as { name: string } | null)?.name ? ` · ${(g.city as unknown as { name: string }).name}` : ""} · {g.slug}</span>
            </Link>
            <Badge variant={g.status === "published" ? "default" : "secondary"}>{g.status}</Badge>
          </li>
        ))}
        {!guides.length ? <li className="px-4 py-6 text-sm text-muted-foreground">No guides match.</li> : null}
      </ul>
    </div>
  );
}
