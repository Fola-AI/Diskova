import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND_NAME } from "@/lib/config";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative isolate">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(11,122,59,0.28),transparent_70%)]" />
      <div className="container flex max-w-md flex-col gap-5 px-4 py-8 sm:py-14">
        <Link href="/" className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(146_75%_34%)] to-primary font-display text-2xl font-bold text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.2),0_8px_24px_-6px_rgba(11,122,59,0.6)]" aria-label={`${BRAND_NAME} home`}>
          {BRAND_NAME.charAt(0)}
        </Link>
        <div className="space-y-1.5 text-center">
          <h1 className="text-display font-semibold">{title}</h1>
          {description ? <p className="text-[15px] text-muted-foreground">{description}</p> : null}
        </div>
        <div className="surface enter-up rounded-3xl p-5 sm:p-6">{children}</div>
        {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
