"use client";

import { useActionState } from "react";

import { updateProfile } from "@/app/(user)/me/settings/actions";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const selectClass =
    "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

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
        <select id="home_city_id" name="home_city_id" defaultValue={values.home_city_id ?? ""} className={selectClass}>
          <option value="">Not set</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">We open the Tonight view on this city.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Are you visiting from abroad?</legend>
        <div className="flex flex-wrap gap-2 text-sm">
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
              <label key={value} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <input type="radio" name="is_diaspora" value={value} defaultChecked={checked} className="accent-[hsl(var(--primary))]" />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
        <input type="checkbox" name="location_consent" defaultChecked={values.location_consent}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" />
        <span>
          <span className="font-medium">Use my location when I check in</span>
          <span className="block text-muted-foreground">
            Optional. It only marks a check-in as &quot;at venue&quot; and is never shown publicly. You can turn it off any time.
          </span>
        </span>
      </label>
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
