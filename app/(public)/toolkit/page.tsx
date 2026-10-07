import type { Metadata } from "next";
import { Plane } from "lucide-react";

import { GuideCard } from "@/components/content/guide-card";
import { listPublishedGuides } from "@/lib/db/guides";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Diaspora toolkit",
  description: "Visas, airport arrival, SIM cards, money, getting around and your first 48 hours in Nigeria.",
  alternates: { canonical: "/toolkit" },
};

export default async function ToolkitIndex() {
  const guides = await listPublishedGuides({ types: ["toolkit"], limit: 50 });
  return (
    <div className="container max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl"><Plane className="h-8 w-8 text-accent" aria-hidden />Diaspora toolkit</h1>
        <p className="max-w-2xl text-muted-foreground">Everything practical for visiting Nigeria — visas, arrival, SIM cards, money and your first 48 hours.</p>
      </header>
      {guides.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guides.map((g) => <li key={g.id}><GuideCard guide={g} /></li>)}</ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">The toolkit is being written. Check back soon.</p>
      )}
    </div>
  );
}
