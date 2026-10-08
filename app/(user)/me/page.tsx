import type { Metadata } from "next";
import { Award, Bookmark, ListChecks, LogOut, Settings, ShieldCheck, Sparkles, Store, Trophy, UserRound } from "lucide-react";

import { FormAlert } from "@/components/forms/form-alert";
import { Avatar } from "@/components/me/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { requireUser } from "@/lib/auth/guards";
import { isStaffRole } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; password?: string; restricted?: string }>;
}) {
  const { profile } = await requireUser("/me");
  const params = await searchParams;
  const name = profile.display_name ?? profile.username;

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-6">
      {params.welcome ? <FormAlert state={{ message: "Your email is confirmed. Welcome!" }} /> : null}
      {params.password ? <FormAlert state={{ message: "Your password has been updated." }} /> : null}
      {params.restricted || profile.status === "suspended" || profile.status === "banned" ? (
        <FormAlert
          state={{
            error: `Your account is ${profile.status}${profile.status_reason ? `: ${profile.status_reason}` : ""}. You can't post right now.`,
          }}
        />
      ) : null}

      <section className="surface relative overflow-hidden rounded-3xl p-5">
        <div aria-hidden className="absolute inset-x-0 top-0 -z-0 h-20 bg-[radial-gradient(90%_100%_at_0%_0%,rgba(11,122,59,0.3),transparent_70%)]" />
        <div className="relative flex items-center gap-4">
          <Avatar url={profile.avatar_url} name={name} size={72} className="ring-2 ring-background" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title font-semibold sm:text-display">{name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
        <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" aria-hidden />
            <span className="text-title font-semibold tabular-nums">{profile.points}</span>
            <span className="text-sm text-muted-foreground">points</span>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {profile.badges.length ? (
              profile.badges.map((b) => (
                <Badge key={b} variant="gold">{b}</Badge>
              ))
            ) : (
              <span className="text-footnote text-muted-foreground">Check in to earn badges</span>
            )}
          </div>
        </div>
      </section>

      {!profile.email_verified_at ? (
        <FormAlert state={{ error: "Confirm your email to start posting." }} />
      ) : null}

      <ListGroup title="Activity">
        <ListRow href="/me/posts" icon={ListChecks} label="My posts" detail="Check-ins and pulses" />
        <ListRow href="/me/lists" icon={Bookmark} label="My lists" detail="Saved places and plans" />
        <ListRow href={`/u/${profile.username}`} icon={UserRound} label="Public profile" detail="What others see" />
        <ListRow href="/leaderboard" icon={Trophy} label="Leaderboard" />
        <ListRow href="/assistant" icon={Sparkles} label="Ask the assistant" prefetch={false} />
      </ListGroup>

      <ListGroup title="Account">
        <ListRow href="/me/settings" icon={Settings} label="Settings" detail="Profile, photo, location, delete account" />
      </ListGroup>

      <ListGroup title="Venues">
        <ListRow href="/vendor" icon={Store} label="For venues" detail="List or manage your venue" prefetch={false} />
        {isStaffRole(profile.role) ? <ListRow href="/admin" icon={ShieldCheck} label="Admin" prefetch={false} /> : null}
      </ListGroup>

      <form action="/auth/signout" method="post" className="pt-2">
        <Button type="submit" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut aria-hidden /> Sign out
        </Button>
      </form>
    </div>
  );
}
