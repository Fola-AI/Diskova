import { BookOpen, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/guards";
import { listGuidesAdmin } from "@/lib/services/admin/content";
import { GUIDE_TYPES } from "@/lib/validation/guides";

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
        <h1 className="text-title font-semibold sm:text-display">Content</h1>
        <Button asChild><Link href="/admin/content/new"><Plus aria-hidden />New guide</Link></Button>
      </div>
      <nav aria-label="Guide type" className="rail fade-x -mx-4 gap-2 px-4 py-1">
        {[{ v: undefined, l: "All types" }, ...GUIDE_TYPES.map((t) => ({ v: t.value, l: t.label }))].map((t) => (
          <Link key={t.l} href={`/admin/content${qs({ type: t.v })}`} aria-current={type === t.v ? "page" : undefined} className={chipClass(type === t.v)}>{t.l}</Link>
        ))}
      </nav>
      <nav aria-label="Guide status" className="rail fade-x -mx-4 gap-2 px-4 py-1">
        {[undefined, "draft", "review", "published", "archived"].map((s) => (
          <Link key={s ?? "all"} href={`/admin/content${qs({ status: s })}`} aria-current={status === s ? "page" : undefined} className={chipClass(status === s)}>{s ?? "Any status"}</Link>
        ))}
      </nav>
      <form role="search" className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" name="q" defaultValue={p.q} placeholder="Search titles…" aria-label="Search titles" className="pl-10" />
      </form>
      <ul className="surface divide-y rounded-2xl">
        {guides.map((g) => (
          <li key={g.id}>
            <Link href={`/admin/content/${g.id}`} className="group flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm transition-colors duration-micro hover:bg-secondary/40">
              <span className="min-w-0">
              <span className="block truncate font-medium group-hover:underline">{g.title}</span>
              <span className="text-footnote text-muted-foreground">{GUIDE_TYPES.find((t) => t.value === g.type)?.label}{(g.city as unknown as { name: string } | null)?.name ? ` · ${(g.city as unknown as { name: string }).name}` : ""} · {g.slug}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant={g.status === "published" ? "default" : "secondary"}>{g.status}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
        {!guides.length ? <li className="p-2"><EmptyState icon={BookOpen} title="No guides match." compact className="border-0 shadow-none" /></li> : null}
      </ul>
    </div>
  );
}
