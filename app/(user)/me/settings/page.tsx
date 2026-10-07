import type { Metadata } from "next";
import Link from "next/link";

import { AvatarUploader } from "@/components/me/avatar-uploader";
import { DeleteAccountForm } from "@/components/me/delete-account-form";
import { ProfileForm } from "@/components/me/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const { supabase, profile } = await requireUser("/me/settings");
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link href="/me" className="text-sm text-muted-foreground hover:underline">← Back to profile</Link>
        <h1 className="mt-2 text-3xl font-semibold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your username, photo and bio are public.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUploader url={profile.avatar_url} name={profile.display_name ?? profile.username} />
          <ProfileForm
            values={{
              username: profile.username,
              display_name: profile.display_name,
              bio: profile.bio,
              home_city_id: profile.home_city_id,
              is_diaspora: profile.is_diaspora,
              location_consent: profile.location_consent,
            }}
            cities={cities ?? []}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm username={profile.username} />
        </CardContent>
      </Card>
    </div>
  );
}
