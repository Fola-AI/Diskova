import type { ReactNode } from "react";

export function ProsePage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="container max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {updated ? <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p> : null}
      <div className="mt-6 space-y-4 text-[15px] leading-7 text-muted-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </article>
  );
}
