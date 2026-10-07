import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/me/avatar";
import { Badge } from "@/components/ui/badge";
import { FEATURES, SEASON_NAME } from "@/lib/config";
import { getCityBySlug, listCities } from "@/lib/db/directory";
import { getLeaderboard } from "@/lib/db/leaderboard";
import { cn } from "@/lib/utils";

export const revalidate = 300;

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = await getCityBySlug((await params).city);
  return city ? { title: `${city.name} leaderboard`, alternates: { canonical: `/leaderboard/${city.slug}` } } : { title: "Leaderboard" };
}

export default async function LeaderboardPage({ params, searchParams }: { params: Params; searchParams: Promise<{ board?: string }> }) {
  if (!FEATURES.points) notFound();
  const city = await getCityBySlug((await params).city);
  if (!city) notFound();
  const board = (await searchParams).board === "december" ? "december" : "month";
  const [rows, cities] = await Promise.all([getLeaderboard(board, city.id), listCities()]);
  const tab = (b: "month" | "december", label: string) => (
    <Link href={`/leaderboard/${city.slug}${b === "december" ? "?board=december" : ""}`} aria-current={board === b ? "page" : undefined}
      className={cn("rounded-full border px-4 py-1.5 text-sm", board === b && "border-primary bg-primary text-primary-foreground")}>{label}</Link>
  );

  return (
    <div className="container max-w-2xl space-y-5 px-4 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-semibold"><Trophy className="h-7 w-7 text-accent" aria-hidden /> {city.name} leaderboard</h1>
        <p className="text-sm text-muted-foreground">Points for check-ins and pulses. Updated hourly. No cash value.</p>
      </div>
      <div className="flex flex-wrap gap-2">{tab("month", "This month")}{tab("december", SEASON_NAME)}</div>
      <nav aria-label="Cities" className="-mx-4 flex gap-2 overflow-x-auto px-4 text-sm [scrollbar-width:none]">
        {cities.map((c) => (
          <Link key={c.slug} href={`/leaderboard/${c.slug}${board === "december" ? "?board=december" : ""}`} className={cn("shrink-0 rounded-full border px-3 py-1", c.slug === city.slug && "border-foreground")}>{c.name}</Link>
        ))}
      </nav>
      {rows.length ? (
        <ol className="divide-y rounded-xl border bg-card" data-testid="leaderboard">
          {rows.map((r) => (
            <li key={r.username} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-right font-semibold tabular-nums">{r.rank}</span>
              <Avatar url={r.avatar_url} name={r.display_name ?? r.username} size={36} />
              <Link href={`/u/${r.username}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{r.display_name ?? r.username}</Link>
              <div className="hidden gap-1 sm:flex">{r.badges.slice(0, 2).map((b) => <Badge key={b} variant="gold">{b}</Badge>)}</div>
              <span className="font-semibold tabular-nums">{r.points}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {board === "december" ? `The ${SEASON_NAME} leaderboard opens on 15 November.` : "No points yet this month — check in to get on the board."}
        </p>
      )}
    </div>
  );
}
