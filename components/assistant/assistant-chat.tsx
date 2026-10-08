"use client";

import { ArrowDown, ArrowUp, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { segmentAnswer } from "@/lib/assistant/guardrails";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string; offered?: Record<string, string>; error?: boolean; done?: boolean }

const EXAMPLES = ["Where is busy in Lekki now?", "Rooftop bars with cocktails tonight?", "Cheap suya near Victoria Island?", "What's on this weekend?"];

function Answer({ text, offered }: { text: string; offered: Record<string, string> }) {
  return (
    <p className="whitespace-pre-line">
      {segmentAnswer(text, offered).map((s, i) =>
        s.type === "venue" ? <Link key={i} href={`/v/${s.slug}`} className="font-semibold text-positive underline underline-offset-4" data-testid="assistant-venue-link">{s.name}</Link>
        : s.type === "safety" ? <Link key={i} href={s.href} className="font-semibold underline underline-offset-4" data-testid="assistant-safety-link">our safety information</Link>
        : s.type === "unknown" ? <span key={i}>{s.slug.replace(/-/g, " ")}</span>
        : <span key={i}>{s.text}</span>,
      )}
    </p>
  );
}

function Thinking() {
  return (
    <span className="flex items-center gap-1.5 py-1" role="status" aria-label="Thinking">
      {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} aria-hidden />)}
    </span>
  );
}

/**
 * PRD P5 chat: streamed answers; only venues we supplied become links.
 * The composer is pinned above the tab bar; the log only auto-scrolls when you're already at the bottom.
 */
export function AssistantChat({ cities, defaultCity }: { cities: Array<{ slug: string; name: string }>; defaultCity: string }) {
  const [city, setCity] = useState(defaultCity);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      const gap = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      nearBottom.current = gap < 160;
      if (nearBottom.current) setShowJump(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-grow the composer up to ~4 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [question]);

  const follow = () => {
    if (nearBottom.current) endRef.current?.scrollIntoView({ block: "end" });
    else setShowJump(true);
  };

  async function send(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion("");
    setBusy(true);
    nearBottom.current = true;
    const history = messages.filter((m) => !m.error).slice(-4).map(({ role, content }) => ({ role, content: content.slice(0, 2000) }));
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "", offered: {} }]);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
    const update = (patch: Partial<Msg>) => setMessages((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, ...patch } : x)));
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, city, history }) });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        update({ content: err.error ?? "Something went wrong. Please try again.", error: true, done: true });
        return;
      }
      const meta = res.headers.get("X-Assistant-Venues");
      const offered = meta ? ((JSON.parse(atob(meta)) as { offered: Record<string, string> }).offered ?? {}) : {};
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        update({ content: acc, offered });
        follow();
      }
      if (!acc.trim()) update({ content: "Sorry — I couldn't answer that. Try asking another way.", error: true });
      update({ done: true });
    } catch {
      update({ content: "You seem to be offline. Please try again.", error: true, done: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5" data-testid="assistant">
      <label className="inline-flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-positive" aria-hidden />
        <span className="sr-only">City</span>
        <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" className="h-10 rounded-full border bg-secondary/50 pl-3.5 text-sm font-semibold">
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>

      {!messages.length ? (
        <div className="space-y-3">
          <p className="font-sans text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Try asking</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((e, i) => (
              <button
                key={e}
                type="button"
                onClick={() => void send(e)}
                className="surface pressable enter-up flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium hover:border-primary/50"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                {e}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ol className="space-y-4" role="log" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
        {messages.map((m, i) => (
          <li key={i} className={cn("enter-up flex", m.role === "user" ? "justify-end" : "justify-start gap-2.5")} data-testid={m.role === "user" ? "assistant-q" : "assistant-a"}>
            {m.role === "assistant" ? (
              <>
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-[hsl(146_60%_35%)] text-primary-foreground" aria-hidden>
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 max-w-[85%] space-y-1.5">
                  <div className={cn("rounded-3xl rounded-tl-lg border bg-card px-4 py-3 text-[15px] leading-relaxed", m.error && "border-destructive/40")}>
                    {m.content ? <Answer text={m.content} offered={m.offered ?? {}} /> : <Thinking />}
                  </div>
                  {m.done && !m.error ? <p className="px-2 text-caption text-muted-foreground">AI can be wrong — check before you go.</p> : null}
                </div>
              </>
            ) : (
              <p className="max-w-[85%] rounded-3xl rounded-tr-lg bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">{m.content}</p>
            )}
          </li>
        ))}
      </ol>
      <div ref={endRef} className="scroll-mb-40" />

      {showJump ? (
        <button
          type="button"
          onClick={() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); setShowJump(false); }}
          className="enter-fade fixed bottom-[calc(var(--tabbar-h)+5.5rem)] left-1/2 z-30 inline-flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full border bg-card px-4 text-footnote font-semibold shadow-lg"
        >
          <ArrowDown className="h-4 w-4" aria-hidden /> New reply
        </button>
      ) : null}

      <form
        className="sticky bottom-[calc(var(--tabbar-h)+0.5rem)] z-20 flex items-end gap-2 rounded-3xl border bg-background/85 p-2 pl-4 shadow-[0_12px_32px_-8px_hsl(0_0%_0%/0.7)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
        onSubmit={(e) => { e.preventDefault(); void send(question); }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(question); } }}
          placeholder="Ask about places, crowds, events, prices…"
          aria-label="Your question"
          maxLength={500}
          disabled={busy}
          enterKeyHint="send"
          className="max-h-[120px] min-h-10 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground/80 focus-visible:outline-none disabled:opacity-60"
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-full" disabled={question.trim().length < 3} loading={busy} aria-label="Ask">
          {busy ? null : <ArrowUp aria-hidden />}
        </Button>
      </form>
      <p className="flex items-start gap-1.5 text-footnote text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        AI answers can be wrong. Crowd levels come from community reports and listings from venues — check before you go. Not for safety questions or emergencies: call 112.
      </p>
    </div>
  );
}
