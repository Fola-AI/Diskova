"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/(user)/me/settings/actions";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nativeSelectClass } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface ProfileFormValues {
  username: string;
  display_name: string | null;
  bio: string | null;
  home_city_id: string | null;
  is_diaspora: boolean | null;
  location_consent: boolean;
}

export function ProfileForm({
  values,
  cities,
}: {
  values: ProfileFormValues;
  cities: Array<{ id: string; name: string }>;
}) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={values.username} autoComplete="username" required
          aria-invalid={Boolean(fe.username)} />
        <FieldError errors={fe.username} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={values.display_name ?? ""} maxLength={60}
          autoComplete="nickname" aria-invalid={Boolean(fe.display_name)} />
        <FieldError errors={fe.display_name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={values.bio ?? ""} maxLength={280} rows={3}
          aria-invalid={Boolean(fe.bio)} />
        <FieldError errors={fe.bio} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="home_city_id">Home city</Label>
        <select id="home_city_id" name="home_city_id" defaultValue={values.home_city_id ?? ""} className={nativeSelectClass}>
          <option value="">Not set</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-footnote text-muted-foreground">We open the Tonight view on this city.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Are you visiting from abroad?</legend>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          {[
            ["yes", "Yes, diaspora / visitor"],
            ["no", "No, I live here"],
            ["", "Prefer not to say"],
          ].map(([value, label]) => {
            const checked =
              (value === "yes" && values.is_diaspora === true) ||
              (value === "no" && values.is_diaspora === false) ||
              (value === "" && values.is_diaspora === null);
            return (
              <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border bg-secondary/30 px-3.5 py-2.5 transition-colors has-[:checked]:border-positive has-[:checked]:bg-primary/10">
                <input type="radio" name="is_diaspora" value={value} defaultChecked={checked} className="h-5 w-5 shrink-0" />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-secondary/30 p-4 text-sm">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Use my location when I check in</span>
          <span id="loc-consent-help" className="block text-footnote text-muted-foreground">
            Optional. It only marks a check-in as &quot;at venue&quot; and is never shown publicly. You can turn it off any time.
          </span>
        </span>
        <Switch name="location_consent" defaultChecked={values.location_consent} aria-describedby="loc-consent-help" />
      </label>
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
