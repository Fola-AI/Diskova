export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      <span className="h-px flex-1 bg-border" aria-hidden />
      {label}
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}
