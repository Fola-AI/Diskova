import type { ReactNode } from "react";

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20 space-y-3">
      <h2 id={id} className="text-title font-semibold">{title}</h2>
      {children}
    </section>
  );
}
