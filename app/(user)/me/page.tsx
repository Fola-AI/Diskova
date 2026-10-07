import type { Metadata } from "next";
import { Award, ListChecks, Settings, ShieldCheck, Store, Trophy } from "lucide-react";
import Link from "next/link";

import { FormAlert } from "@/components/forms/form-alert";
import { Avatar } from "@/components/me/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      {params.welcome ? <FormAlert state={{ message: "Your email is confirmed. Welcome!" }} /> : null}
      {params.password ? <FormAlert state={{ message: "Your password has been updated." }} /> : null}
      {params.restricted || profile.status === "suspended" || profile.status === "banned" ? (
        <FormAlert
          state={{
            error: `Your account is ${profile.status}${profile.status_reason ? `: ${profile.status_reason}` : ""}. You can't post right now.`,
          }}
        />
      ) : null}

      <div className="flex items-center gap-4">
        <Avatar url={profile.avatar_url} name={name} size={72} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-5">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" aria-hidden />
            <span className="text-lg font-semibold">{profile.points}</span>
            <span className="text-sm text-muted-foreground">points</span>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {profile.badges.length ? (
              profile.badges.map((b) => (
                <Badge key={b} variant="gold">{b}</Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Badges appear as you check in</span>
            )}
          </div>
        </CardContent>
      </Card>

      {!profile.email_verified_at ? (
        <FormAlert state={{ error: "Confirm your email to start posting." }} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="secondary" className="justify-start">
          <Link href="/me/posts"><ListChecks aria-hidden /> My posts</Link>
        </Button>
        <Button asChild variant="secondary" className="justify-start">
          <Link href="/me/settings"><Settings aria-hidden /> Settings</Link>
        </Button>
        <Button asChild variant="secondary" className="justify-start">
          <Link href={`/u/${profile.username}`}><Award aria-hidden /> Public profile</Link>
        </Button>
        <Button asChild variant="secondary" className="justify-start">
          <Link href="/leaderboard"><Trophy aria-hidden /> Leaderboard</Link>
        </Button>
        <Button asChild variant="secondary" className="justify-start">
          <Link href="/vendor"><Store aria-hidden /> For venues</Link>
        </Button>
        {isStaffRole(profile.role) ? (
          <Button asChild variant="secondary" className="justify-start">
            <Link href="/admin"><ShieldCheck aria-hidden /> Admin</Link>
          </Button>
        ) : null}
      </div>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" className="text-muted-foreground">Sign out</Button>
      </form>
    </div>
  );
}
