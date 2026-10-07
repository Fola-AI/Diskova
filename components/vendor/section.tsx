import type { ReactNode } from "react";

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
