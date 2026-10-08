import { Car, ExternalLink, MessageCircle, Navigation, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { boltUrl, directionsUrl, safeExternalUrl, telUrl, uberUrl, whatsappChatUrl } from "@/lib/directory/links";
import { cn } from "@/lib/utils";

function Action({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      aria-label={label}
      className="surface pressable flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2.5 text-caption font-semibold hover:border-muted-foreground/40"
    >
      <span className="text-positive [&_svg]:h-5 [&_svg]:w-5" aria-hidden>{icon}</span>
      <span className="w-full truncate text-center">{label}</span>
    </a>
  );
}

/**
 * Directions · Bolt · Uber · WhatsApp · Call · Website/Book — all leave the site.
 * Directions is the primary action (full width); the rest sit in an equal-width grid — no clipped,
 * sideways-scrolling row.
 */
export function ActionRow({
  name,
  lat,
  lng,
  whatsapp,
  phone,
  websiteUrl,
  bookingUrl,
}: {
  name: string;
  lat: number | null;
  lng: number | null;
  whatsapp: string | null;
  phone: string | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
}) {
  const point = lat !== null && lng !== null ? { lat, lng } : null;
  const wa = whatsappChatUrl(whatsapp, `Hi, I found ${name} online and have a question.`);
  const tel = telUrl(phone);
  const book = safeExternalUrl(bookingUrl);
  const site = safeExternalUrl(websiteUrl);
  const items: ReactNode[] = [];
  if (point) items.push(<Action key="bolt" href={boltUrl(point)} icon={<Car />} label="Bolt" />);
  if (point) items.push(<Action key="uber" href={uberUrl(point, name)} icon={<Car />} label="Uber" />);
  if (wa) items.push(<Action key="wa" href={wa} icon={<MessageCircle />} label="WhatsApp" />);
  if (tel) items.push(<Action key="tel" href={tel} icon={<Phone />} label="Call" />);
  if (book) items.push(<Action key="book" href={book} icon={<ExternalLink />} label="Book" />);
  else if (site) items.push(<Action key="site" href={site} icon={<ExternalLink />} label="Website" />);
  if (!items.length && !point) return null;
  // ≤ 4 secondary actions sit in one row; 5 wrap to 3 + 2 so every label stays whole at 375px.
  const cols = items.length <= 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : items.length === 4 ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-5";
  return (
    <nav aria-label="Get there and contact" className="space-y-2">
      {point ? (
        <a
          href={directionsUrl(point)}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="pressable flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14),0_1px_2px_0_hsl(0_0%_0%/0.35)] hover:bg-primary/90"
        >
          <Navigation className="h-5 w-5" aria-hidden /> Directions
        </a>
      ) : null}
      {items.length ? <div className={cn("grid gap-2", cols)}>{items}</div> : null}
    </nav>
  );
}
