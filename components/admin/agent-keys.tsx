"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useActionState, useState } from "react";

import { createAgentKeyForm, revokeAgentKeyForm, type CreateKeyState } from "@/app/admin/(secure)/settings/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SCOPES = [
  { value: "read", label: "read", hint: "always included" },
  { value: "tasks:write", label: "tasks:write", hint: "create admin tasks" },
  { value: "notes:write", label: "notes:write", hint: "add internal notes" },
  { value: "pii:read", label: "pii:read", hint: "emails, IPs, private issue reports — grant sparingly" },
] as const;

export function CreateAgentKeyForm() {
  const [state, action] = useActionState<CreateKeyState, FormData>(createAgentKeyForm, initialFormState);
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="space-y-3" data-testid="agent-key-form">
      <FormAlert state={state} />
      {state.key ? (
        <div className="enter-up space-y-2 rounded-2xl border border-accent/60 bg-accent/10 p-3" data-testid="agent-key-once">
          <p className="inline-flex items-center gap-1.5 text-footnote font-semibold">
            <KeyRound className="h-4 w-4 text-accent" aria-hidden /> Copy this key now. It is shown once and never again.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-background/60 px-3 py-2 font-mono text-footnote">{state.key}</code>
            <Button type="button" size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(state.key!).then(() => setCopied(true))}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <span className="sr-only" aria-live="polite">{copied ? "Key copied to clipboard" : ""}</span>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="ak-name">Name</Label><Input id="ak-name" name="name" placeholder="e.g. Ops assistant" required minLength={2} maxLength={80} /></div>
        <div className="space-y-1.5"><Label htmlFor="ak-exp">Expires in (days)</Label><Input id="ak-exp" name="expires_in_days" type="number" min={1} max={365} defaultValue={90} /></div>
      </div>
      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1.5 text-sm font-medium">Scopes</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCOPES.map((s) => (
            <label key={s.value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-secondary/40 px-3.5 py-2 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10 has-[:disabled]:cursor-default">
              <input type="checkbox" name="scopes" value={s.value} defaultChecked={s.value === "read"} disabled={s.value === "read"} className="h-4 w-4 shrink-0 accent-primary" />
              <span className="min-w-0">
                <code className="font-mono text-footnote font-semibold">{s.label}</code>
                <span className="block text-caption text-muted-foreground">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="ak-ip">IP allowlist (optional)</Label>
        <Input id="ak-ip" name="ip_allowlist" placeholder="e.g. 203.0.113.10, 198.51.100.0/24" aria-describedby="ak-ip-hint" />
        <p id="ak-ip-hint" className="text-footnote text-muted-foreground">Leave empty to allow any IP. Requests from other IPs get 403.</p>
      </div>
      <div className="space-y-2 border-t pt-4">
        <SubmitButton pendingText="Creating…">Create key</SubmitButton>
        <p className="text-footnote text-muted-foreground">Asks for a fresh authenticator code if your last one is older than 5 minutes.</p>
      </div>
    </form>
  );
}

export function RevokeAgentKeyButton({ id }: { id: string }) {
  const [state, action] = useActionState(revokeAgentKeyForm, initialFormState);
  if (state.ok) return <span className="inline-flex h-10 items-center text-footnote font-semibold text-muted-foreground">Revoked</span>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="destructive" title="Stops this key working immediately. This can't be undone.">Revoke</SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}
