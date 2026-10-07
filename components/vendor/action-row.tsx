import { Car, ExternalLink, MessageCircle, Navigation, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { boltUrl, directionsUrl, safeExternalUrl, telUrl, uberUrl, whatsappChatUrl } from "@/lib/directory/links";

function Action({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl border bg-card px-3 py-2.5 text-xs font-medium transition-colors hover:border-primary/60"
    >
      <span className="text-positive [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      {label}
    </a>
  );
}

/** Directions · Bolt · Uber · WhatsApp · Call · Website/Book — all leave the site. */
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
  return (
    <nav aria-label="Get there and contact" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {point ? <Action href={directionsUrl(point)} icon={<Navigation />} label="Directions" /> : null}
      {point ? <Action href={boltUrl(point)} icon={<Car />} label="Bolt" /> : null}
      {point ? <Action href={uberUrl(point, name)} icon={<Car />} label="Uber" /> : null}
      {wa ? <Action href={wa} icon={<MessageCircle />} label="WhatsApp" /> : null}
      {tel ? <Action href={tel} icon={<Phone />} label="Call" /> : null}
      {book ? <Action href={book} icon={<ExternalLink />} label="Book" /> : site ? <Action href={site} icon={<ExternalLink />} label="Website" /> : null}
    </nav>
  );
}
