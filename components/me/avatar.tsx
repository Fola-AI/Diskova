import Image from "next/image";

import { cn } from "@/lib/utils";

export function Avatar({
  url,
  name,
  size = 40,
  className,
}: {
  url: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-semibold", className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {url ? <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" /> : <span aria-hidden>{initial}</span>}
    </span>
  );
}
