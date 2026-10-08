import type { Metadata } from "next";
import { Medal, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/me/avatar";
import { Badge } from "@/components/ui/badge";
import { chipClass } from "@/components/ui/chip";
import { SegmentedLinks } from "@/components/ui/segmented-links";
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
  const MEDAL = ["text-accent", "text-zinc-300", "text-amber-600"];

  return (
    <div className="container max-w-2xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2.5 text-display font-semibold"><Trophy className="h-7 w-7 text-accent" aria-hidden /> {city.name} leaderboard</h1>
        <p className="text-sm text-muted-foreground">Points for check-ins and pulses. Updated hourly. No cash value.</p>
      </div>
      <SegmentedLinks
        label="Leaderboard period"
        className="w-full"
        items={[
          { href: `/leaderboard/${city.slug}`, label: "This month", active: board === "month" },
          { href: `/leaderboard/${city.slug}?board=december`, label: SEASON_NAME, active: board === "december" },
        ]}
      />
      <nav aria-label="Cities" className="rail fade-x -mx-4 gap-2 px-4 py-1">
        {cities.map((c) => (
          <Link key={c.slug} href={`/leaderboard/${c.slug}${board === "december" ? "?board=december" : ""}`} aria-current={c.slug === city.slug ? "page" : undefined} className={chipClass(c.slug === city.slug)}>{c.name}</Link>
        ))}
        <span className="w-2 shrink-0" aria-hidden />
      </nav>
      {rows.length ? (
        <ol className="surface divide-y overflow-hidden rounded-2xl" data-testid="leaderboard">
          {rows.map((r) => (
            <li key={r.username}>
              <Link href={`/u/${r.username}`} className={cn("flex min-h-16 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/60 active:bg-secondary", r.rank <= 3 && "bg-accent/[0.04]")}>
                <span className="flex w-7 shrink-0 justify-center font-semibold tabular-nums">
                  {r.rank <= 3 ? <Medal className={cn("h-6 w-6", MEDAL[r.rank - 1])} aria-hidden /> : null}
                  <span className={r.rank <= 3 ? "sr-only" : "text-muted-foreground"}>{r.rank}</span>
                </span>
                <Avatar url={r.avatar_url} name={r.display_name ?? r.username} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.display_name ?? r.username}</span>
                  {r.badges.length ? <span className="mt-0.5 flex gap-1">{r.badges.slice(0, 2).map((b) => <Badge key={b} variant="gold">{b}</Badge>)}</span> : null}
                </span>
                <span className="text-callout font-semibold tabular-nums">{r.points}<span className="ml-1 text-caption font-normal text-muted-foreground">pts</span></span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="flex items-center gap-3 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          <Trophy className="h-5 w-5 shrink-0" aria-hidden />
          {board === "december" ? `The ${SEASON_NAME} leaderboard opens on 15 November.` : "No points yet this month — check in to get on the board."}
        </p>
      )}
    </div>
  );
}
