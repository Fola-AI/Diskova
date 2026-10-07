"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export interface ActivityItem {
  id: number;
  kind: string;
  at: string;
  city_id: string | null;
  city_name: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  profile_id: string | null;
  username: string | null;
  meta: Record<string, unknown> | null;
}

const KINDS = ["user", "post", "vendor", "event", "report", "sanction"] as const;
const MAX = 200;

function describe(e: ActivityItem): string {
  const m = e.meta ?? {};
  const name = (m.name ?? m.title ?? m.username ?? "") as string;
  return [name, e.vendor_name && e.vendor_name !== name ? `@ ${e.vendor_name}` : "", typeof m.reason === "string" ? `(${m.reason})` : ""].filter(Boolean).join(" ");
}

/** Live activity stream (§11.1): Realtime broadcast of activity_events (staff + aal2 via RLS), filterable, pausable. */
export function ActivityStream({ initial, cities }: { initial: ActivityItem[]; cities: Array<{ id: string; name: string }> }) {
  const [items, setItems] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [buffer, setBuffer] = useState<ActivityItem[]>([]);
  const [live, setLive] = useState(false);
  const [kind, setKind] = useState("");
  const [city, setCity] = useState("");
  const [who, setWho] = useState("");
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const cityName = useMemo(() => new Map(cities.map((c) => [c.id, c.name])), [cities]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getBrowserSupabase } = await import("@/lib/db/client");
      if (cancelled) return;
      const supabase = getBrowserSupabase();
      await supabase.realtime.setAuth(); // private channel: Realtime Authorization uses the user's JWT
      if (cancelled) return;
      // Broadcast from Database (migration 0044): private topic, staff + aal2 only (realtime.messages RLS).
      const channel = supabase
        .channel("admin:activity", { config: { private: true } })
        .on("broadcast", { event: "activity" }, ({ payload }: { payload: Record<string, unknown> }) => {
          const r = payload;
          const item: ActivityItem = {
            id: Number(r.id),
            kind: String(r.kind),
            at: String(r.at),
            city_id: (r.city_id as string | null) ?? null,
            city_name: r.city_id ? cityName.get(r.city_id as string) ?? null : null,
            vendor_id: (r.vendor_id as string | null) ?? null,
            vendor_name: null,
            profile_id: (r.profile_id as string | null) ?? null,
            username: null,
            meta: (r.meta as Record<string, unknown> | null) ?? null,
          };
          if (pausedRef.current) setBuffer((b) => [item, ...b].slice(0, MAX));
          else setItems((cur) => [item, ...cur].slice(0, MAX));
        })
        .subscribe((status) => setLive(status === "SUBSCRIBED"));
      cleanup = () => void supabase.removeChannel(channel);
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [cityName]);

  const resume = () => {
    setItems((cur) => [...buffer, ...cur].slice(0, MAX));
    setBuffer([]);
    setPaused(false);
  };

  const needle = who.trim().toLowerCase();
  const shown = items.filter(
    (e) =>
      (!kind || e.kind.startsWith(`${kind}.`)) &&
      (!city || e.city_id === city) &&
      (!needle || [e.username, e.vendor_name, describe(e)].some((s) => s?.toLowerCase().includes(needle))),
  );
  const control = "h-8 rounded-md border bg-background px-2 text-xs";

  return (
    <section className="space-y-3 rounded-xl border p-4" data-testid="activity-stream" data-live={live ? "realtime" : "connecting"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          Live activity <span className="text-xs font-normal text-muted-foreground">{live ? "· live" : "· connecting…"}</span>
        </h2>
        <Button type="button" size="sm" variant="outline" onClick={paused ? resume : () => setPaused(true)} data-testid="activity-pause">
          {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
          {paused ? `Resume${buffer.length ? ` (${buffer.length} new)` : ""}` : "Pause"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind" className={control}>
          <option value="">All kinds</option>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" className={control}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Vendor or user" aria-label="Vendor or user" className={`${control} w-40`} />
      </div>
      <ul className="max-h-96 divide-y overflow-y-auto text-sm">
        {shown.map((e) => (
          <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 py-1.5" data-testid="activity-item">
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{e.kind}</span>
            <span className="min-w-0 flex-1 truncate">{describe(e) || "—"}{e.username ? <span className="text-muted-foreground"> · @{e.username}</span> : null}</span>
            <span className="text-xs text-muted-foreground">{e.city_name ?? ""} {formatDistanceToNowStrict(new Date(e.at), { addSuffix: true })}</span>
          </li>
        ))}
        {!shown.length ? <li className="py-2 text-muted-foreground">Nothing yet.</li> : null}
      </ul>
    </section>
  );
}
