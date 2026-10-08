import { AlertTriangle, Info, Lightbulb } from "lucide-react";

import { markdownToHtml } from "@/lib/content/markdown";
import { cn } from "@/lib/utils";

export function Callout({ variant, text }: { variant: "info" | "tip" | "warning"; text: string }) {
  const Icon = variant === "warning" ? AlertTriangle : variant === "tip" ? Lightbulb : Info;
  return (
    <aside
      className={cn(
        "not-prose my-5 flex gap-3 rounded-xl border p-4 text-sm",
        variant === "warning" ? "border-destructive/50 bg-destructive/10" : variant === "tip" ? "border-accent/50 bg-accent/10" : "border-primary/40 bg-primary/10",
      )}
      data-testid="callout"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-2 [&_a]:underline" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />
    </aside>
  );
}
