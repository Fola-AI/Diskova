import type { ReactNode } from "react";

export function ProsePage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="container max-w-2xl px-4 py-8">
      <h1 className="text-display font-semibold sm:text-display-lg">{title}</h1>
      {updated ? <p className="mt-3 inline-flex rounded-full bg-secondary px-3 py-1 text-caption font-medium text-muted-foreground">Last updated {updated}</p> : null}
      <div className="prose-reading mt-6 space-y-4 text-[16px] leading-[1.7] text-foreground/80 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:text-title [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </article>
  );
}
