"use client";

import { useActionState } from "react";

import { requestExportForm, saveSettingsForm } from "@/app/admin/(secure)/settings/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface SettingsValues {
  listing_is_free: boolean; monetisation_notice_md: string | null; checkin_expiry_hours: number; max_posts_per_user_per_hour: number;
  moderation_auto_block_threshold: number; moderation_auto_flag_threshold: number; media_hold_trust_below: number; media_hold_account_age_days: number;
  december_season_start: string | null; december_season_end: string | null; fx_gbp_per_ngn: number | null; fx_usd_per_ngn: number | null;
  maintenance_mode: boolean; blocklist_phrases: string[];
}

function Field({ name, label, hint, ...rest }: { name: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <Input id={`s-${name}`} name={name} aria-describedby={hint ? `s-${name}-hint` : undefined} {...rest} />
      {hint ? <p id={`s-${name}-hint`} className="text-footnote text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** §11.14 platform_settings editor (super_admin). Server re-validates everything with zod. */
export function SettingsForm({ v }: { v: SettingsValues }) {
  const [state, action] = useActionState(saveSettingsForm, initialFormState);
  return (
    <form action={action} className="space-y-5" data-testid="settings-form">
      <FormAlert state={state} />
      <fieldset className="surface rounded-2xl p-4">
        <legend className="float-left mb-3 w-full text-callout font-semibold">Moderation</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Field name="moderation_auto_flag_threshold" label="Auto-flag threshold (0–1)" type="number" step="0.01" min={0} max={1} defaultValue={v.moderation_auto_flag_threshold} />
          <Field name="moderation_auto_block_threshold" label="Auto-block threshold (0–1)" type="number" step="0.01" min={0} max={1} defaultValue={v.moderation_auto_block_threshold} />
          <Field name="media_hold_trust_below" label="Hold media when trust below" type="number" min={0} max={100} defaultValue={v.media_hold_trust_below} />
          <Field name="media_hold_account_age_days" label="Hold media when account younger than (days)" type="number" min={0} max={365} defaultValue={v.media_hold_account_age_days} />
          <Field name="max_posts_per_user_per_hour" label="Max posts per user per hour" type="number" min={1} max={100} defaultValue={v.max_posts_per_user_per_hour} />
          <Field name="checkin_expiry_hours" label="Check-in expiry (hours)" type="number" min={1} max={72} defaultValue={v.checkin_expiry_hours} />
        </div>
      </fieldset>
      <fieldset className="surface rounded-2xl p-4">
        <legend className="float-left mb-3 w-full text-callout font-semibold">Season &amp; currency</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Field name="december_season_start" label="December in Nigeria starts" type="date" defaultValue={v.december_season_start ?? ""} />
          <Field name="december_season_end" label="December in Nigeria ends" type="date" defaultValue={v.december_season_end ?? ""} />
          <Field name="fx_gbp_per_ngn" label="GBP per ₦1" type="number" step="any" min={0} defaultValue={v.fx_gbp_per_ngn ?? ""} hint="Used for indicative diaspora prices." />
          <Field name="fx_usd_per_ngn" label="USD per ₦1" type="number" step="any" min={0} defaultValue={v.fx_usd_per_ngn ?? ""} />
        </div>
      </fieldset>
      <fieldset className="surface rounded-2xl p-4">
        <legend className="float-left mb-3 w-full text-callout font-semibold">Listings, notices &amp; maintenance</legend>
        <div className="clear-both space-y-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-secondary/40 px-3.5 text-sm font-medium has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"><input type="checkbox" name="listing_is_free" defaultChecked={v.listing_is_free} className="h-4 w-4 accent-primary" /> Listing is free</label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-secondary/40 px-3.5 text-sm font-medium has-[:checked]:border-destructive/50 has-[:checked]:bg-destructive/10"><input type="checkbox" name="maintenance_mode" defaultChecked={v.maintenance_mode} className="h-4 w-4 accent-primary" /> Maintenance mode (posting paused)</label>
          <p className="text-footnote text-muted-foreground">Maintenance mode pauses posting for every user until you turn it off.</p>
          <div className="space-y-1.5">
            <Label htmlFor="s-notice">Monetisation notice (markdown)</Label>
            <Textarea id="s-notice" name="monetisation_notice_md" rows={3} defaultValue={v.monetisation_notice_md ?? ""} />
          </div>
        </div>
      </fieldset>
      <fieldset className="surface rounded-2xl p-4">
        <legend className="float-left mb-3 w-full text-callout font-semibold">Blocklist</legend>
        <div className="clear-both space-y-2">
          <Label htmlFor="s-blocklist">One phrase per line. Posts containing these are blocked before AI moderation.</Label>
          <Textarea id="s-blocklist" name="blocklist_phrases" rows={6} defaultValue={v.blocklist_phrases.join("\n")} className="font-mono text-footnote" />
        </div>
      </fieldset>
      <div className="space-y-3 border-t pt-4">
        <Input name="reason" placeholder="Why are you changing settings? (required, audited)" aria-label="Reason" required minLength={5} />
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}

export function ExportButton() {
  const [state, action] = useActionState(requestExportForm, initialFormState);
  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <SubmitButton variant="secondary" pendingText="Starting…">Start a data export</SubmitButton>
    </form>
  );
}
