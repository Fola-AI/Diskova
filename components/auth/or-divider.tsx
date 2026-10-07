export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="relative my-5 text-center text-xs uppercase tracking-wide text-muted-foreground">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
      <span className="relative bg-card px-2">{label}</span>
    </div>
  );
}
