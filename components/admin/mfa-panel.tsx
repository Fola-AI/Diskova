"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/db/client";

type Mode =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "error"; message: string };

export function MfaPanel({ next, issuer }: { next: string; issuer: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mfa = getBrowserSupabase().auth.mfa;
      const { data, error: listError } = await mfa.listFactors();
      if (listError) return !cancelled && setMode({ kind: "error", message: "Couldn't load your security settings." });

      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return !cancelled && setMode({ kind: "verify", factorId: verified.id });

      // Clean up abandoned enrolments, then start a fresh one.
      for (const f of data.all.filter((f) => f.status === "unverified")) await mfa.unenroll({ factorId: f.id });
      const { data: enrolled, error: enrollError } = await mfa.enroll({
        factorType: "totp",
        issuer,
        friendlyName: `${issuer} admin`,
      });
      if (enrollError || !enrolled) {
        return !cancelled && setMode({ kind: "error", message: "Couldn't start MFA setup. Please refresh." });
      }
      if (!cancelled) {
        setMode({ kind: "enroll", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issuer]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode.kind !== "enroll" && mode.kind !== "verify") return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await getBrowserSupabase().auth.mfa.challengeAndVerify({
      factorId: mode.factorId,
      code: code.replace(/\s/g, ""),
    });
    setBusy(false);
    if (verifyError) {
      setError("That code didn't work. Check the time on your phone and try the newest code.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (mode.kind === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }
  if (mode.kind === "error") return <p role="alert" className="text-sm text-destructive">{mode.message}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {mode.kind === "enroll" ? (
        <div className="space-y-3">
          <p className="text-sm">
            1. Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy…).
          </p>
          {/* Supabase returns the QR as an SVG data URI */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mode.qr} alt="QR code for your authenticator app" width={180} height={180}
            className="rounded-lg bg-white p-2" />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Can&apos;t scan? Enter this key instead</summary>
            <code className="mt-2 block break-all rounded bg-secondary p-2 font-mono text-foreground" data-testid="totp-secret">
              {mode.secret}
            </code>
          </details>
          <p className="text-sm">2. Enter the 6-digit code it shows.</p>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-5 w-5 text-positive" aria-hidden /> Enter the 6-digit code from your authenticator app.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="code">Authentication code</Label>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}"
          maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} required
          aria-invalid={Boolean(error)} />
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={busy || code.replace(/\s/g, "").length !== 6}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Verify
      </Button>
    </form>
  );
}
