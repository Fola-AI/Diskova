import { BadgeCheck, CalendarDays, CircleDollarSign, Megaphone, Pencil, QrCode, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";

import { switchVendorAction } from "@/app/(vendor)/vendor/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { DisputeList } from "@/components/vendor-dashboard/dispute-list";
import { ListingNotice } from "@/components/vendor-dashboard/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getPublicSettings } from "@/lib/db/settings-public";
import { crowdLabel } from "@/lib/directory/crowd";
import { getCurrentVendor, getVendorForEditing, listMyVendors } from "@/lib/services/vendors";

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
      <div className="space-y-5">
        <h1 className="text-3xl font-semibold">For venues</h1>
        <p className="text-muted-foreground">
          Get discovered tonight. Post live crowd updates in two taps, show your prices and get verified.
        </p>
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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Your venue</p>
          <h1 className="flex items-center gap-2 text-3xl font-semibold">
            {vendor.name}
            {vendor.verified ? <BadgeCheck className="h-6 w-6 text-positive" aria-label="Verified" /> : null}
          </h1>
        </div>
        {mine.length > 1 ? (
          <form action={switchVendorAction} className="flex gap-2">
            <select name="vendorId" defaultValue={current.id} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Switch venue">
              {mine.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <Button type="submit" size="sm" variant="secondary">Switch</Button>
          </form>
        ) : null}
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full border px-3 py-1 text-xs font-semibold" data-testid="vendor-status">{status.title}</span>
            <span className="text-sm">{completeness}% complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${completeness}%` }} /></div>
          <p className="text-sm text-muted-foreground">{status.body}</p>
          {["draft", "rejected"].includes(vendor.status) ? (
            <Button asChild className="w-full"><Link href="/vendor/onboarding?step=review">Continue listing</Link></Button>
          ) : null}
          {vendor.status === "published" ? (
            <Button asChild variant="link" className="px-0"><Link href={`/v/${vendor.slug}`}>View your public page</Link></Button>
          ) : null}
        </CardContent>
      </Card>

      {vendor.status === "published" ? (
        <Button asChild size="lg" className="h-14 w-full text-base">
          <Link href="/vendor/update"><Megaphone aria-hidden /> Post an official update</Link>
        </Button>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/vendor/profile", label: "Edit profile", icon: Pencil },
          { href: "/vendor/prices", label: "Prices", icon: CircleDollarSign },
          { href: "/vendor/verification", label: vendor.verified ? "Verified" : "Get verified", icon: ShieldCheck },
          { href: "/vendor/qr", label: "QR poster", icon: QrCode },
          { href: "/vendor/events", label: "Events", icon: CalendarDays },
        ].map(({ href, label, icon: Icon }) => (
          <Button key={href} asChild variant="secondary" className="h-14 justify-start">
            <Link href={href}><Icon aria-hidden /> {label}</Link>
          </Button>
        ))}
      </div>

      <DisputeList posts={(community ?? []) as unknown as Parameters<typeof DisputeList>[0]["posts"]} />

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Recent official updates</h2>
        {recent?.length ? (
          <ul className="divide-y rounded-xl border">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{crowdLabel(p.crowd_level)}</span>
                <span className="text-xs text-muted-foreground">
                  {p.status === "published" ? "Live" : p.hold_reason !== "none" ? "Photo in review" : p.status} ·{" "}
                  {new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(p.created_at))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No updates yet. One tap when you open tonight makes your page look alive.</p>
        )}
      </section>
    </div>
  );
}
