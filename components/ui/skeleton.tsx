import { cn } from "@/lib/utils";

/** Placeholder block that matches the final layout so nothing shifts when content arrives. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton", className)} {...props} />;
}

/** Screen-reader-only status for a loading region. */
export function LoadingStatus({ label = "Loading" }: { label?: string }) {
  return (
    <p role="status" className="sr-only">
      {label}…
    </p>
  );
}
