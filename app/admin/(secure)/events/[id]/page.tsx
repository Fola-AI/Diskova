import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventEditForm } from "@/components/admin/event-edit-form";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/guards";
import { getEventForEdit } from "@/lib/services/admin/events";

export default async function AdminEventEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("admin", `/admin/events/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await getEventForEdit(id);
  if (!e) notFound();
  const local = (iso: string | null) => (iso ? formatInTimeZone(iso, e.timezone, "yyyy-MM-dd'T'HH:mm") : "");
  return (
    <div className="space-y-4">
      <Link href="/admin/events" className="hit inline-flex h-10 items-center text-footnote font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">← Events</Link>
      <h1 className="flex flex-wrap items-center gap-2 text-title font-semibold sm:text-display">Edit event <Badge variant="muted">{e.status}</Badge></h1>
      <div className="surface rounded-2xl p-4 sm:p-5">
        <EventEditForm v={{ ...e, starts_local: local(e.starts_at), ends_local: local(e.ends_at) }} />
      </div>
    </div>
  );
}
