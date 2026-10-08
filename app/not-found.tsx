import { CalendarDays, Compass, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="container max-w-xl px-4 py-12">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={Compass}
        title="Page not found"
        action={
          <>
            <Button asChild><Link href="/">Back home</Link></Button>
            <Button asChild variant="secondary"><Link href="/search"><Search aria-hidden /> Search</Link></Button>
            <Button asChild variant="secondary"><Link href="/events"><CalendarDays aria-hidden /> Events</Link></Button>
          </>
        }
      >
        That page doesn&apos;t exist or has moved. Try one of these instead.
      </EmptyState>
    </div>
  );
}
