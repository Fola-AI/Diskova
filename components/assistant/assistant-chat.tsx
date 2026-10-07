"use client";

import { Loader2, SendHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { segmentAnswer } from "@/lib/assistant/guardrails";

interface Msg { role: "user" | "assistant"; content: string; offered?: Record<string, string>; error?: boolean }

const EXAMPLES = ["Where is busy in Lekki now?", "Rooftop bars with cocktails tonight?", "Cheap suya near Victoria Island?", "What's on this weekend?"];

function Answer({ text, offered }: { text: string; offered: Record<string, string> }) {
  return (
    <p className="whitespace-pre-line">
      {segmentAnswer(text, offered).map((s, i) =>
        s.type === "venue" ? <Link key={i} href={`/v/${s.slug}`} className="font-medium text-positive underline underline-offset-4" data-testid="assistant-venue-link">{s.name}</Link>
        : s.type === "safety" ? <Link key={i} href={s.href} className="font-medium underline underline-offset-4" data-testid="assistant-safety-link">our safety information</Link>
        : s.type === "unknown" ? <span key={i}>{s.slug.replace(/-/g, " ")}</span>
        : <span key={i}>{s.text}</span>,
      )}
    </p>
  );
}

/** PRD P5 chat: streamed answers; only venues we supplied become links. */
export function AssistantChat({ cities, defaultCity }: { cities: Array<{ slug: string; name: string }>; defaultCity: string }) {
  const [city, setCity] = useState(defaultCity);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setQuestion("");
    setBusy(true);
    const history = messages.filter((m) => !m.error).slice(-4).map(({ role, content }) => ({ role, content: content.slice(0, 2000) }));
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "", offered: {} }]);
    const update = (patch: Partial<Msg>) => setMessages((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, ...patch } : x)));
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, city, history }) });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        update({ content: err.error ?? "Something went wrong. Please try again.", error: true });
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
        endRef.current?.scrollIntoView({ block: "nearest" });
      }
      if (!acc.trim()) update({ content: "Sorry — I couldn't answer that. Try asking another way.", error: true });
    } catch {
      update({ content: "You seem to be offline. Please try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="assistant">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">City</span>
        <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" className="h-9 rounded-md border bg-background px-2">
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>

      {!messages.length ? (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => <Button key={e} type="button" variant="secondary" size="sm" onClick={() => void send(e)}>{e}</Button>)}
        </div>
      ) : null}

      <ol className="space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={m.role === "user" ? "ml-8 rounded-xl bg-primary/15 p-3 text-sm" : "mr-4 rounded-xl border bg-card p-3 text-sm"} data-testid={m.role === "user" ? "assistant-q" : "assistant-a"}>
            {m.role === "assistant" ? (
              m.content ? <Answer text={m.content} offered={m.offered ?? {}} /> : <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Thinking…</span>
            ) : m.content}
          </li>
        ))}
      </ol>
      <div ref={endRef} />

      <form className="sticky bottom-2 flex gap-2 rounded-xl border bg-background/95 p-2 backdrop-blur" onSubmit={(e) => { e.preventDefault(); void send(question); }}>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about places, crowds, events, prices…" aria-label="Your question" maxLength={500} disabled={busy} />
        <Button type="submit" size="icon" disabled={busy || question.trim().length < 3} aria-label="Ask">{busy ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}</Button>
      </form>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        AI answers can be wrong. Crowd levels come from community reports and listings from venues — check before you go. Not for safety questions or emergencies: call 112.
      </p>
    </div>
  );
}
