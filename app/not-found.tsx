import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container max-w-xl space-y-4 py-16">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist or has moved.</p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
