import { BadgeCheck, CalendarDays, Check, ChevronRight, CircleDollarSign, ExternalLink, Megaphone, Pencil, QrCode, Radio, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";

import { switchVendorAction } from "@/app/(vendor)/vendor/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { DisputeList } from "@/components/vendor-dashboard/dispute-list";
import { ListingNotice } from "@/components/vendor-dashboard/notice";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { Progress } from "@/components/ui/progress";
import { nativeSelectClass } from "@/components/ui/select";
import { hasAnyHours, parseOpeningHours } from "@/lib/services/opening-hours";
import { cn } from "@/lib/utils";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getPublicSettings } from "@/lib/db/settings-public";
import { crowdLabel } from "@/lib/directory/crowd";
import { getCurrentVendor, getVendorForEditing, listMyVendors } from "@/lib/services/vendors";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-secondary text-foreground",
  pending_review: "bg-accent/15 text-accent",
  published: "bg-primary/15 text-positive",
  rejected: "bg-destructive/15 text-destructive",
  suspended: "bg-destructive/15 text-destructive",
};

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  draft: { title: "Draft", body: "Finish your listing and submit it for review." },
  pending_review: { title: "In review", body: "Our team is reviewing your listing. We'll email you when it's live." },
  published: { title: "Live", body: "Your venue is in the directory." },
  rejected: { title: "Not approved", body: "Update your listing and resubmit it." },
  suspended: { title: "Suspended", body: "Your listing is hidden. Contact us for details." },
};

export default async function VendorDashboard({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const session = await requireVerifiedUser("/vendor");
  const [mine, current, settings] = await Promise.all([listMyVendors(session), getCurrentVendor(session), getPublicSettings()]);
  const params = await searchParams;

  if (!current) {
    return (
      <div className="space-y-6">
        <header className="relative isolate -mx-4 space-y-3 overflow-hidden px-4 pb-2 pt-4">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(100%_80%_at_0%_0%,rgba(11,122,59,0.3),transparent_60%)]" />
          <h1 className="text-display font-semibold">For venues</h1>
          <p className="text-callout text-muted-foreground">
            Get discovered tonight. Post live crowd updates in two taps, show your prices and get verified.
          </p>
        </header>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {[
            { icon: Radio, title: "Look alive", body: "One tap when you open puts you on the live map." },
            { icon: CircleDollarSign, title: "Honest prices", body: "Show entry and drinks so people come ready." },
            { icon: ShieldCheck, title: "Get verified", body: "A badge that tells guests you're the real venue." },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="surface flex items-start gap-3 rounded-2xl p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-positive"><Icon className="h-5 w-5" aria-hidden /></span>
              <span className="text-sm"><span className="block font-semibold">{title}</span><span className="text-muted-foreground">{body}</span></span>
            </li>
          ))}
        </ul>
        <ListingNotice markdown={settings.monetisation_notice_md} />
        <Button asChild size="lg" className="w-full"><Link href="/vendor/onboarding"><Store aria-hidden /> List your venue</Link></Button>
        <p className="text-sm text-muted-foreground">
          Already listed by us? <Link href="/search" className="text-foreground underline underline-offset-4">Find your venue</Link> and tap &quot;Claim it&quot;.
        </p>
      </div>
    );
  }

  const vendor = await getVendorForEditing(session, current.id);
  const completeness = (vendor as unknown as { vendor_completeness: number | null }).vendor_completeness ?? 0;
  const status = STATUS_COPY[vendor.status] ?? STATUS_COPY.draft;
  const { data: recent } = await session.supabase
    .from("posts")
    .select("id, crowd_level, status, hold_reason, created_at")
    .eq("vendor_id", vendor.id)
    .eq("kind", "official")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);
  const { count: priceCount } = await session.supabase.from("vendor_prices").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id);
  const isLiveListing = vendor.status === "published";
  const editBase = ["draft", "rejected"].includes(vendor.status) ? "/vendor/onboarding" : "/vendor/profile";
  const checklist = [
    { label: "Name & category", done: Boolean(vendor.name && vendor.category_id), href: `${editBase}?step=basics` },
    { label: "Contact (WhatsApp or phone)", done: Boolean(vendor.whatsapp || vendor.phone), href: `${editBase}?step=contact` },
    { label: "Cover photo", done: Boolean(vendor.cover_image_url), href: `${editBase}?step=photos` },
    { label: "Opening hours", done: hasAnyHours(parseOpeningHours(vendor.opening_hours)), href: `${editBase}?step=details` },
    { label: "Prices", done: (priceCount ?? 0) > 0, href: `${editBase}?step=prices` },
    { label: "Verification", done: Boolean(vendor.verified), href: "/vendor/verification" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const { data: community } = await session.supabase
    .from("posts")
    .select("id, kind, crowd_level, body, created_at, author:profiles!posts_author_id_fkey(username)")
    .eq("vendor_id", vendor.id)
    .in("kind", ["checkin", "pulse"])
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      {params.submitted ? <FormAlert state={{ message: "Submitted for review. We've sent you a confirmation email." }} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Your venue</p>
          <h1 className="flex items-center gap-2 text-display font-semibold">
            <span className="min-w-0 break-words">{vendor.name}</span>
            {vendor.verified ? <BadgeCheck className="h-6 w-6 shrink-0 text-positive" aria-label="Verified" /> : null}
          </h1>
        </div>
        {mine.length > 1 ? (
          <form action={switchVendorAction} className="flex w-full gap-2 sm:w-auto">
            <select name="vendorId" defaultValue={current.id} className={cn(nativeSelectClass, "h-10")} aria-label="Switch venue">
              {mine.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <Button type="submit" size="sm" variant="secondary">Switch</Button>
          </form>
        ) : null}
      </div>

      <section className="surface space-y-4 rounded-3xl p-5" aria-labelledby="listing-heading">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("rounded-full px-3 py-1 text-caption font-semibold", STATUS_TONE[vendor.status] ?? STATUS_TONE.draft)} data-testid="vendor-status">{status.title}</span>
          <span className="text-footnote font-medium tabular-nums text-muted-foreground">{completeness}% complete</span>
        </div>
        <div className="space-y-1.5">
          <h2 id="listing-heading" className="text-title font-semibold">
            {isLiveListing ? "Your listing" : "Finish your listing"}
          </h2>
          <p className="text-sm text-muted-foreground">{status.body}</p>
        </div>
        <div className="space-y-1.5">
          <Progress value={doneCount} max={checklist.length} label="Listing checklist" valueText={`${doneCount} of ${checklist.length} steps done`} />
          <p className="text-footnote text-muted-foreground" aria-hidden>{doneCount} of {checklist.length} done</p>
        </div>
        <ul className="divide-y overflow-hidden rounded-2xl border">
          {checklist.map((c) => (
            <li key={c.label}>
              <Link href={c.href} className="flex min-h-12 items-center gap-3 px-3.5 py-2 text-sm transition-colors hover:bg-secondary/60 active:bg-secondary">
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", c.done ? "bg-positive text-background" : "border-2 border-muted-foreground/40")} aria-hidden>
                  {c.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span className={cn("flex-1", c.done ? "text-muted-foreground" : "font-medium")}>
                  {c.label}
                  <span className="sr-only">{c.done ? ", done" : ", not done"}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        {["draft", "rejected"].includes(vendor.status) ? (
          <Button asChild size="lg" className="w-full"><Link href="/vendor/onboarding?step=review">Continue listing</Link></Button>
        ) : null}
        {isLiveListing ? (
          <Button asChild variant="secondary" className="w-full"><Link href={`/v/${vendor.slug}`}><ExternalLink aria-hidden /> View your public page</Link></Button>
        ) : null}
      </section>

      {isLiveListing ? (
        <Button asChild size="lg" className="h-14 w-full rounded-2xl text-base">
          <Link href="/vendor/update"><Megaphone aria-hidden /> Post an official update</Link>
        </Button>
      ) : (
        <p className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          <Megaphone className="h-5 w-5 shrink-0" aria-hidden />
          Official updates unlock once your listing is live.
        </p>
      )}

      <ListGroup title="Manage">
        <ListRow href="/vendor/profile" icon={Pencil} label="Edit profile" detail="Name, contact, photos, hours" />
        <ListRow href="/vendor/prices" icon={CircleDollarSign} label="Prices" detail={(priceCount ?? 0) ? `${priceCount} listed` : "Not started"} />
        <ListRow href="/vendor/verification" icon={ShieldCheck} label={vendor.verified ? "Verified" : "Get verified"} detail={vendor.verified ? "Badge shown on your page" : "Show guests you're the real venue"} />
        <ListRow href="/vendor/qr" icon={QrCode} label="QR poster" detail="Guests scan to pulse your venue" />
        <ListRow href="/vendor/events" icon={CalendarDays} label="Events" />
      </ListGroup>

      <DisputeList posts={(community ?? []) as unknown as Parameters<typeof DisputeList>[0]["posts"]} />

      <section className="space-y-3">
        <h2 className="text-title font-semibold">Recent official updates</h2>
        {recent?.length ? (
          <ul className="surface divide-y overflow-hidden rounded-2xl">
            {recent.map((p) => (
              <li key={p.id} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{crowdLabel(p.crowd_level)}</span>
                <span className="text-footnote text-muted-foreground">
                  {p.status === "published" ? "Live" : p.hold_reason !== "none" ? "Photo in review" : p.status} ·{" "}
                  {new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(p.created_at))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Megaphone} title="No updates yet" compact action={isLiveListing ? <Button asChild size="sm"><Link href="/vendor/update">Post your first update</Link></Button> : undefined}>
            One tap when you open tonight makes your page look alive.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
