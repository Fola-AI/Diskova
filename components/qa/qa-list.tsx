"use client";

import { BadgeCheck, CheckCircle2, Loader2, MessageCircleQuestion, Pin, Store, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { acceptAnswerAction, answerQuestionAction, askQuestionAction, myQaStateAction, voteAction } from "@/app/actions/qa";
import { LazyReportButton } from "@/components/feed/lazy";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
export function QaList({ questions, scope, path, askLabel = "Ask a question", linkTitles = true, titleAs = "h3" }: { questions: QaQuestion[]; scope: { vendorId?: string; cityId?: string }; path: string; askLabel?: string; linkTitles?: boolean; titleAs?: "h1" | "h3" }) {
  const [me, setMe] = useState<{ userId: string | null; voted: Set<string> }>({ userId: null, voted: new Set() });
  const [votes, setVotes] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!hasAuthCookie()) return;
    void myQaStateAction(questions.flatMap((q) => q.answers.map((a) => a.id))).then((r) => setMe({ userId: r.userId, voted: new Set(r.voted) }));
  }, [questions]);

  const Title = titleAs;
  return (
    <div className="space-y-4" data-testid="qa-list">
      <AskForm scope={scope} path={path} label={askLabel} />
      {questions.map((q) => (
        <article key={q.id} className="surface space-y-4 rounded-2xl p-4" data-testid="qa-question">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-footnote text-muted-foreground">
              {q.is_pinned ? <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-caption font-semibold text-accent" data-testid="qa-pinned"><Pin className="h-3 w-3" aria-hidden /> Pinned</span> : null}
              <span>{q.author ? `@${q.author.username}` : "Someone"} asked · {ago(q.created_at)}</span>
              {q.vendor && !scope.vendorId ? <Link href={`/v/${q.vendor.slug}`} className="font-medium text-foreground/85 underline underline-offset-4">{q.vendor.name}</Link> : null}
            </div>
            <Title className={cn("flex items-start gap-2 font-semibold", titleAs === "h1" ? "text-title" : "font-sans text-callout tracking-normal")}>
              <MessageCircleQuestion className={cn("shrink-0 text-positive", titleAs === "h1" ? "mt-1 h-6 w-6" : "mt-0.5 h-5 w-5")} aria-hidden />
              {linkTitles ? <Link href={`/q/${q.id}`} className="underline-offset-4 hover:underline">{q.title}</Link> : q.title}
            </Title>
            {q.body ? <p className="whitespace-pre-line text-[15px] text-muted-foreground">{q.body}</p> : null}
          </header>
          {q.answers.length ? (
            <ul className="space-y-2.5">
              {q.answers.map((a) => {
                const accepted = q.accepted_answer_id === a.id;
                const count = votes[a.id] ?? a.vote_count;
                return (
                  <li key={a.id} id={a.id} className={cn("rounded-xl border bg-background/40 p-3.5 text-[15px]", accepted && "border-l-[3px] border-l-positive bg-primary/[0.06]")} data-testid="qa-answer">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-footnote">
                      <span className="font-semibold">{a.author ? `@${a.author.username}` : "Someone"}</span>
                      {a.is_official ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-caption font-semibold text-positive"><BadgeCheck className="h-3 w-3" aria-hidden /> Official</span> : null}
                      {a.is_vendor_answer ? <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-caption font-semibold text-accent" data-testid="qa-vendor-badge"><Store className="h-3 w-3" aria-hidden /> Venue</span> : null}
                      {accepted ? <span className="inline-flex items-center gap-1 text-caption font-semibold text-positive"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Accepted</span> : null}
                    </div>
                    {!a.is_official && !a.is_vendor_answer ? <p className="mb-1.5 text-caption text-muted-foreground">{UNVERIFIED_LABEL}</p> : null}
                    <p className="whitespace-pre-line leading-relaxed">{a.body}</p>
                    <div className="-mb-1 -ml-1.5 mt-2 flex flex-wrap items-center gap-1">
                      <VoteButton answerId={a.id} count={count} voted={me.voted.has(a.id)} disabled={a.author_id === me.userId}
                        onChange={(voted, n) => { setVotes((v) => ({ ...v, [a.id]: n })); setMe((m) => { const s = new Set(m.voted); if (voted) s.add(a.id); else s.delete(a.id); return { ...m, voted: s }; }); }} />
                      {me.userId && me.userId === q.author_id ? <AcceptButton questionId={q.id} answerId={a.id} accepted={accepted} path={path} /> : null}
                      <LazyReportButton entityType="qa_answer" entityId={a.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No answers yet. Know the answer?</p>
          )}
          <AnswerForm questionId={q.id} path={path} />
        </article>
      ))}
      {!questions.length ? (
        <EmptyState icon={MessageCircleQuestion} title="No questions yet" compact>
          Ask the first one — locals and venues answer here.
        </EmptyState>
      ) : null}
    </div>
  );
}

function VoteButton({ answerId, count, voted, disabled, onChange }: { answerId: string; count: number; voted: boolean; disabled: boolean; onChange: (voted: boolean, count: number) => void }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" size="sm" variant={voted ? "secondary" : "ghost"} aria-pressed={voted} disabled={pending || disabled} aria-label={`Helpful (${count})`} data-testid="qa-vote"
      onClick={() => { if (!hasAuthCookie()) return toLogin(); start(async () => { const r = await voteAction(answerId); if (r.ok) onChange(r.voted, r.count); else if (r.needsLogin) toLogin(); else toast.error(r.error); }); }}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ThumbsUp className={cn("transition-transform duration-200 ease-spring", voted && "scale-110 fill-current text-positive")} aria-hidden />}
      <span aria-hidden>Helpful</span>
      <span aria-hidden className="tabular-nums">{count}</span>
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
    <form className="enter-up space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await answerQuestionAction({ questionId, body, path });
      if (!r.ok) return void (r.needsLogin ? toLogin() : toast.error(r.error));
      toast.success(r.status === "published" ? "Answer posted" : "Thanks — your answer is being reviewed.");
      setBody(""); setOpen(false); window.location.reload();
    }); }}>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} placeholder="Share what you know. Be specific and kind." aria-label="Your answer" required autoFocus />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={body.trim().length < 2} loading={pending}>Post answer</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <span className="ml-auto text-caption tabular-nums text-muted-foreground">{body.length}/1000</span>
      </div>
    </form>
  );
}

function AskForm({ scope, path, label }: { scope: { vendorId?: string; cityId?: string }; path: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, start] = useTransition();
  const tooShort = title.trim().length < 10;
  return (
    <>
      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => (hasAuthCookie() ? setOpen(true) : toLogin())} data-testid="qa-ask-open"><MessageCircleQuestion aria-hidden /> {label}</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title={label} description="Questions and answers are public and moderated. No personal details, please.">
          <form className="space-y-4" data-testid="qa-ask-form" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (tooShort) return; start(async () => {
            const r = await askQuestionAction({ ...scope, title, body, path });
            if (!r.ok) return void (r.needsLogin ? toLogin() : toast.error(r.error));
            toast.success(r.status === "published" ? "Question posted" : "Thanks — your question is being reviewed.");
            setTitle(""); setBody(""); setOpen(false); window.location.reload();
          }); }}>
            <label className="block space-y-1.5 text-sm">
              <span className="flex items-center justify-between font-medium">Your question <span className="text-caption font-normal tabular-nums text-muted-foreground">{title.length}/140</span></span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setTouched(true)} maxLength={140} placeholder="e.g. Is there parking after 10pm?" required minLength={10}
                aria-invalid={touched && tooShort ? true : undefined} aria-describedby="qa-title-help" autoFocus />
              <span id="qa-title-help" className={cn("block text-footnote", touched && tooShort ? "text-destructive" : "text-muted-foreground")}>
                {touched && tooShort ? "A little more detail — at least 10 characters." : "Make it specific so locals can answer quickly."}
              </span>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Details <span className="font-normal text-muted-foreground">(optional)</span></span>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} placeholder="Anything that helps — day, time, group size." />
            </label>
            <Button type="submit" size="lg" className="w-full" loading={pending}>Post question</Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
