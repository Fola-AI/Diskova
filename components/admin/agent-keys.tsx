"use client";

import { Copy } from "lucide-react";
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
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-accent/60 bg-accent/10 p-2" data-testid="agent-key-once">
          <code className="flex-1 break-all font-mono text-xs">{state.key}</code>
          <Button type="button" size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(state.key!).then(() => setCopied(true))}>
            <Copy aria-hidden /> {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="ak-name">Name</Label><Input id="ak-name" name="name" placeholder="e.g. Ops assistant" required minLength={2} maxLength={80} /></div>
        <div className="space-y-1"><Label htmlFor="ak-exp">Expires in (days)</Label><Input id="ak-exp" name="expires_in_days" type="number" min={1} max={365} defaultValue={90} /></div>
      </div>
      <fieldset className="space-y-1 text-sm">
        <legend className="mb-1 font-medium">Scopes</legend>
        {SCOPES.map((s) => (
          <label key={s.value} className="flex items-center gap-2">
            <input type="checkbox" name="scopes" value={s.value} defaultChecked={s.value === "read"} disabled={s.value === "read"} className="h-4 w-4" />
            <code className="text-xs">{s.label}</code> <span className="text-xs text-muted-foreground">— {s.hint}</span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="ak-ip">IP allowlist (optional)</Label>
        <Input id="ak-ip" name="ip_allowlist" placeholder="e.g. 203.0.113.10, 198.51.100.0/24" />
        <p className="text-xs text-muted-foreground">Leave empty to allow any IP. Requests from other IPs get 403.</p>
      </div>
      <SubmitButton size="sm">Create key</SubmitButton>
      <p className="text-xs text-muted-foreground">Asks for a fresh authenticator code if your last one is older than 5 minutes.</p>
    </form>
  );
}

export function RevokeAgentKeyButton({ id }: { id: string }) {
  const [state, action] = useActionState(revokeAgentKeyForm, initialFormState);
  if (state.ok) return <span className="text-xs text-muted-foreground">Revoked</span>;
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="destructive">Revoke</SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}
