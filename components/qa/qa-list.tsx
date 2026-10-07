"use client";

import { BadgeCheck, CheckCircle2, Loader2, MessageCircleQuestion, Pin, Store, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { acceptAnswerAction, answerQuestionAction, askQuestionAction, myQaStateAction, voteAction } from "@/app/actions/qa";
import { LazyReportButton } from "@/components/feed/lazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { UNVERIFIED_LABEL } from "@/lib/config";
import type { QaQuestion } from "@/lib/services/qa";
import { cn } from "@/lib/utils";

function toLogin() {
  window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
}

const ago = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

/** P3 community Q&A for a venue or a city: pinned first; accepted / official / venue answers first. */
export function QaList({ questions, scope, path, askLabel = "Ask a question", linkTitles = true }: { questions: QaQuestion[]; scope: { vendorId?: string; cityId?: string }; path: string; askLabel?: string; linkTitles?: boolean }) {
  const [me, setMe] = useState<{ userId: string | null; voted: Set<string> }>({ userId: null, voted: new Set() });
  const [votes, setVotes] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!hasAuthCookie()) return;
    void myQaStateAction(questions.flatMap((q) => q.answers.map((a) => a.id))).then((r) => setMe({ userId: r.userId, voted: new Set(r.voted) }));
  }, [questions]);

  return (
    <div className="space-y-4" data-testid="qa-list">
      <AskForm scope={scope} path={path} label={askLabel} />
      {questions.map((q) => (
        <article key={q.id} className="space-y-3 rounded-xl border bg-card p-4" data-testid="qa-question">
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {q.is_pinned ? <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent" data-testid="qa-pinned"><Pin className="h-3 w-3" aria-hidden /> Pinned</span> : null}
              <span>{q.author ? `@${q.author.username}` : "Someone"} asked · {ago(q.created_at)}</span>
              {q.vendor && !scope.vendorId ? <Link href={`/v/${q.vendor.slug}`} className="underline">{q.vendor.name}</Link> : null}
            </div>
            <h3 className="flex items-start gap-2 text-base font-semibold">
              <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden />
              {linkTitles ? <Link href={`/q/${q.id}`} className="underline-offset-4 hover:underline">{q.title}</Link> : q.title}
            </h3>
            {q.body ? <p className="whitespace-pre-line text-sm text-muted-foreground">{q.body}</p> : null}
          </header>
          <ul className="space-y-2">
            {q.answers.map((a) => {
              const accepted = q.accepted_answer_id === a.id;
              const count = votes[a.id] ?? a.vote_count;
              return (
                <li key={a.id} className={cn("rounded-lg border p-3 text-sm", accepted && "border-positive/60")} data-testid="qa-answer">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{a.author ? `@${a.author.username}` : "Someone"}</span>
                    {a.is_official ? <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-primary"><BadgeCheck className="h-3 w-3" aria-hidden /> Official</span> : null}
                    {a.is_vendor_answer ? <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-accent" data-testid="qa-vendor-badge"><Store className="h-3 w-3" aria-hidden /> Venue</span> : null}
                    {accepted ? <span className="inline-flex items-center gap-1 text-positive"><CheckCircle2 className="h-3 w-3" aria-hidden /> Accepted</span> : null}
                    {!a.is_official && !a.is_vendor_answer ? <span className="text-muted-foreground">{UNVERIFIED_LABEL}</span> : null}
                  </div>
                  <p className="whitespace-pre-line">{a.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <VoteButton answerId={a.id} count={count} voted={me.voted.has(a.id)} disabled={a.author_id === me.userId}
                      onChange={(voted, n) => { setVotes((v) => ({ ...v, [a.id]: n })); setMe((m) => { const s = new Set(m.voted); if (voted) s.add(a.id); else s.delete(a.id); return { ...m, voted: s }; }); }} />
                    {me.userId && me.userId === q.author_id ? <AcceptButton questionId={q.id} answerId={a.id} accepted={accepted} path={path} /> : null}
                    <LazyReportButton entityType="qa_answer" entityId={a.id} />
                  </div>
                </li>
              );
            })}
          </ul>
          <AnswerForm questionId={q.id} path={path} />
        </article>
      ))}
      {!questions.length ? <p className="text-sm text-muted-foreground">No questions yet — ask the first one.</p> : null}
    </div>
  );
}

function VoteButton({ answerId, count, voted, disabled, onChange }: { answerId: string; count: number; voted: boolean; disabled: boolean; onChange: (voted: boolean, count: number) => void }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" size="sm" variant={voted ? "secondary" : "ghost"} aria-pressed={voted} disabled={pending || disabled} aria-label={`Helpful (${count})`} data-testid="qa-vote"
      onClick={() => { if (!hasAuthCookie()) return toLogin(); start(async () => { const r = await voteAction(answerId); if (r.ok) onChange(r.voted, r.count); else if (r.needsLogin) toLogin(); else toast.error(r.error); }); }}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ThumbsUp aria-hidden />} {count}
    </Button>
  );
}

function AcceptButton({ questionId, answerId, accepted, path }: { questionId: string; answerId: string; accepted: boolean; path: string }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} data-testid="qa-accept"
      onClick={() => start(async () => { const r = await acceptAnswerAction({ questionId, answerId: accepted ? null : answerId, path }); if (r.ok) { toast.success(accepted ? "Unmarked" : "Marked as the answer"); window.location.reload(); } else toast.error(r.error); })}>
      <CheckCircle2 aria-hidden /> {accepted ? "Unaccept" : "This answered it"}
    </Button>
  );
}

function AnswerForm({ questionId, path }: { questionId: string; path: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  if (!open) return <Button type="button" size="sm" variant="outline" onClick={() => (hasAuthCookie() ? setOpen(true) : toLogin())} data-testid="qa-answer-open">Answer</Button>;
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await answerQuestionAction({ questionId, body, path });
      if (!r.ok) return void (r.needsLogin ? toLogin() : toast.error(r.error));
      toast.success(r.status === "published" ? "Answer posted" : "Thanks — your answer is being reviewed.");
      setBody(""); setOpen(false); window.location.reload();
    }); }}>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} placeholder="Share what you know. Be specific and kind." aria-label="Your answer" required />
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || body.trim().length < 2}>{pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Post answer</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}

function AskForm({ scope, path, label }: { scope: { vendorId?: string; cityId?: string }; path: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  if (!open) return <Button type="button" variant="secondary" onClick={() => (hasAuthCookie() ? setOpen(true) : toLogin())} data-testid="qa-ask-open"><MessageCircleQuestion aria-hidden /> {label}</Button>;
  return (
    <form className="space-y-2 rounded-xl border p-4" data-testid="qa-ask-form" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await askQuestionAction({ ...scope, title, body, path });
      if (!r.ok) return void (r.needsLogin ? toLogin() : toast.error(r.error));
      toast.success(r.status === "published" ? "Question posted" : "Thanks — your question is being reviewed.");
      setTitle(""); setBody(""); setOpen(false); window.location.reload();
    }); }}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="e.g. Is there parking after 10pm?" aria-label="Your question" required minLength={10} />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={1000} placeholder="Details (optional)" aria-label="Details" />
      <p className="text-xs text-muted-foreground">Questions and answers are public and moderated. No personal details, please.</p>
      <div className="flex gap-2"><Button type="submit" disabled={pending || title.trim().length < 10}>{pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Post question</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}
