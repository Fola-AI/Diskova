import {
  Beer,
  Building2,
  Castle,
  Clapperboard,
  Coffee,
  FerrisWheel,
  Hotel,
  Landmark,
  MapPin,
  MicVocal,
  Music,
  Palette,
  Palmtree,
  PartyPopper,
  Sandwich,
  ShoppingBasket,
  Sofa,
  Trees,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  music: Music,
  sofa: Sofa,
  beer: Beer,
  "building-2": Building2,
  "utensils-crossed": UtensilsCrossed,
  coffee: Coffee,
  sandwich: Sandwich,
  waves: Waves,
  palmtree: Palmtree,
  "ferris-wheel": FerrisWheel,
  clapperboard: Clapperboard,
  palette: Palette,
  landmark: Landmark,
  "shopping-basket": ShoppingBasket,
  trees: Trees,
  castle: Castle,
  "mic-vocal": MicVocal,
  "party-popper": PartyPopper,
  hotel: Hotel,
};

export function CategoryIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const Icon = (icon && ICONS[icon]) || MapPin;
  return <Icon className={className} aria-hidden />;
}

/** Deterministic dark gradient per category, used until a venue has photos. */
export function categoryGradient(slug: string | null | undefined): string {
  const palette = [
    ["#0B7A3B", "#062616"],
    ["#7A3B0B", "#2A1405"],
    ["#3B0B7A", "#160629"],
    ["#0B5E7A", "#05222B"],
    ["#7A0B4B", "#2B0519"],
    ["#5E7A0B", "#212B05"],
  ];
  let hash = 0;
  for (const ch of slug ?? "") hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = palette[hash % palette.length];
  return `radial-gradient(120% 90% at 20% 10%, ${a} 0%, ${b} 70%, #0B0F0D 100%)`;
}
