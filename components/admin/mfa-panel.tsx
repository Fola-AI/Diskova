"use client";

import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/db/client";
import { cn } from "@/lib/utils";

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
  // Purely presentational state: copy feedback, wrong-code shake, success tick.
  const [copied, setCopied] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [done, setDone] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

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
      setCode("");
      setShakeKey((k) => k + 1);
      return;
    }
    setDone(true);
    router.replace(next);
    router.refresh();
  }

  // The code field remounts on a wrong code (restarts the shake); keep focus in it.
  useEffect(() => {
    if (shakeKey) codeRef.current?.focus();
  }, [shakeKey]);

  const copySecret = (secret: string) => {
    void navigator.clipboard
      .writeText(secret)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  if (mode.kind === "loading") {
    return (
      <p className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }
  if (mode.kind === "error") return <p role="alert" className="text-sm text-destructive">{mode.message}</p>;

  const step = (n: number) => (
    <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-footnote font-semibold tabular-nums text-primary-foreground">
      {n}
    </span>
  );
  const digits = code.length;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mode.kind === "enroll" ? (
        <ol className="space-y-6">
          <li className="space-y-3">
            <div className="flex items-start gap-3">
              {step(1)}
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold">Scan</p>
                <p className="text-footnote text-muted-foreground">
                  Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy…).
                </p>
              </div>
            </div>
            {/* Supabase returns the QR as an SVG data URI */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mode.qr} alt="QR code for your authenticator app" width={196} height={196}
              className="mx-auto rounded-2xl bg-white p-2.5 shadow-[0_8px_24px_-12px_hsl(0_0%_0%/0.6)]" />
            <details className="group rounded-xl border bg-secondary/30 text-sm">
              <summary className="hit flex min-h-11 cursor-pointer list-none items-center px-3.5 font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                Can&apos;t scan? Enter this key instead
              </summary>
              <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3.5">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-background/70 px-3 py-2 font-mono text-footnote text-foreground" data-testid="totp-secret">
                  {mode.secret}
                </code>
                <Button type="button" size="sm" variant="secondary" onClick={() => copySecret(mode.secret)}>
                  {copied ? <Check className="pop" aria-hidden /> : <Copy aria-hidden />}
                  {copied ? "Copied" : "Copy secret"}
                </Button>
                <span className="sr-only" aria-live="polite">{copied ? "Secret copied to clipboard" : ""}</span>
              </div>
            </details>
          </li>
          <li className="flex items-start gap-3">
            {step(2)}
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold">Enter code</p>
              <p className="text-footnote text-muted-foreground">Type the 6-digit code your app shows, then tap Verify.</p>
            </div>
          </li>
        </ol>
      ) : (
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-5 w-5 shrink-0 text-positive" aria-hidden /> Enter the 6-digit code from your authenticator app.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="code">Authentication code</Label>
        <Input
          key={shakeKey}
          ref={codeRef}
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          placeholder="000000"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "code-hint code-error" : "code-hint"}
          className={cn(
            "h-14 text-center font-mono text-2xl font-semibold tabular-nums tracking-[0.5em] placeholder:text-muted-foreground/40 md:text-2xl",
            shakeKey > 0 && "shake",
          )}
        />
        <p id="code-hint" className="text-footnote text-muted-foreground">
          6-digit code from your authenticator app · <span className="tabular-nums">{digits}/6</span>
        </p>
        {error ? <p id="code-error" role="alert" className="enter-fade text-footnote text-destructive">{error}</p> : null}
      </div>
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={done || digits !== 6}>
        {done ? <Check className="pop" aria-hidden /> : null}
        Verify
      </Button>
    </form>
  );
}
