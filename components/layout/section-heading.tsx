import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Section title row: h2 + optional "See all" link with a 44px target. */
export function SectionHeading({
  title,
  icon,
  href,
  linkLabel = "See all",
  id,
  aside,
}: {
  title: string;
  icon?: ReactNode;
  href?: string;
  linkLabel?: string;
  id?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2 text-title font-semibold">
        {icon}
        {title}
      </h2>
      {href ? (
        <Link href={href} className="pressable -mr-2 inline-flex h-11 shrink-0 items-center gap-0.5 rounded-xl px-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          {linkLabel}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        aside
      )}
    </div>
  );
}
